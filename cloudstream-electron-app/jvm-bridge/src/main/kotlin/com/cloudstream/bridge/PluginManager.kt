package com.cloudstream.bridge

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.googlecode.dex2jar.tools.Dex2jarCmd
import com.lagradost.cloudstream3.APIHolder
import com.lagradost.cloudstream3.MainAPI
import com.lagradost.cloudstream3.TvSeriesLoadResponse
import com.lagradost.cloudstream3.TvType
import com.lagradost.cloudstream3.plugins.BasePlugin
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import java.io.File
import java.net.URLClassLoader
import java.nio.file.Files
import java.util.concurrent.ConcurrentHashMap
import java.util.zip.ZipFile

val logger = LoggerFactory.getLogger("PluginManager")

/**
 * Plugin manifest structure (from Cloudstream BasePlugin.Manifest)
 */
data class PluginManifest(
    val name: String?,
    val version: Int?,
    val pluginClassName: String,
    val requiresResources: Boolean = false
)

/**
 * Manages loaded Cloudstream plugins by converting the embedded DEX to a JAR,
 * loading it with a dedicated classloader, running the plugin's load() hook,
 * and capturing any MainAPI providers it registers.
 */
class PluginManager {
    private val loadedPlugins = ConcurrentHashMap<String, PluginInstance>()
    private val pluginApis = ConcurrentHashMap<String, List<MainAPI>>()
    
    /**
     * Load a plugin from a .cs3 file
     * 
     * .cs3 files are ZIP archives containing:
     * - DEX files (compiled Kotlin/Java code)
     * - manifest.json (plugin metadata)
     * - Resources (if requiresResources is true)
     */
    fun loadPlugin(pluginFile: File, pluginId: String, repositoryUrl: String): Boolean {
        return try {
            if (!pluginFile.exists()) {
                logger.error("Plugin file does not exist: ${pluginFile.absolutePath}")
                return false
            }

            logger.info("Loading plugin from: ${pluginFile.absolutePath}")
            
            // Extract manifest.json from the .cs3 file (which is a ZIP)
            val manifest = extractManifest(pluginFile) ?: run {
                logger.error("Failed to extract manifest from plugin")
                return false
            }

            logger.info("Plugin manifest: name=${manifest.name}, class=${manifest.pluginClassName}")

            // Remove previously loaded instance for same id
            unloadPlugin(pluginId)

            val dexFile = extractDex(pluginFile) ?: return false
            val jarFile = dexToJar(dexFile) ?: return false

            val classLoader = URLClassLoader(
                arrayOf(jarFile.toURI().toURL()),
                this::class.java.classLoader
            )

            val pluginClass = classLoader.loadClass(manifest.pluginClassName)
            val pluginInstance = pluginClass.getDeclaredConstructor().newInstance() as BasePlugin
            pluginInstance.filename = pluginFile.absolutePath

            // Run plugin load hook (non-suspend)
            runCatching { pluginInstance.load() }.onFailure { t ->
                logger.error("Plugin load() threw for $pluginId", t)
                throw t
            }

            // Capture MainAPI providers that registered during load()
            val apis = synchronized(APIHolder.allProviders) {
                APIHolder.allProviders.filter { it.sourcePlugin == pluginInstance.filename }
            }
            pluginApis[pluginId] = apis

            loadedPlugins[pluginId] = PluginInstance(
                id = pluginId,
                file = pluginFile,
                manifest = manifest,
                repositoryUrl = repositoryUrl,
                classLoader = classLoader,
                pluginInstance = pluginInstance,
                apis = apis
            )
            logger.info("Plugin loaded successfully: $pluginId with ${apis.size} API(s)")
            true
        } catch (e: Exception) {
            logger.error("Failed to load plugin: $pluginId", e)
            false
        }
    }

    /**
     * Extract manifest.json from .cs3 file (ZIP archive)
     */
    private fun extractManifest(pluginFile: File): PluginManifest? {
        return try {
            ZipFile(pluginFile).use { zip ->
                val manifestEntry = zip.getEntry("manifest.json") ?: run {
                    logger.error("manifest.json not found in plugin file")
                    return null
                }

                zip.getInputStream(manifestEntry).use { input ->
                    val json = input.bufferedReader().readText()
                    val gson = Gson()
                    val jsonObject = gson.fromJson(json, JsonObject::class.java)

                    PluginManifest(
                        name = jsonObject.get("name")?.asString,
                        version = jsonObject.get("version")?.asInt,
                        pluginClassName = jsonObject.get("pluginClassName")?.asString
                            ?: throw IllegalArgumentException("pluginClassName is required"),
                        requiresResources = jsonObject.get("requiresResources")?.asBoolean ?: false
                    )
                }
            }
        } catch (e: Exception) {
            logger.error("Failed to extract manifest", e)
            null
        }
    }

    /**
     * Convert classes.dex -> jar so we can load it on the JVM
     */
    private fun dexToJar(dexFile: File): File? {
        return try {
            val jarFile = Files.createTempFile("cs-plugin-", ".jar").toFile()
            Dex2jarCmd.main(arrayOf("--force", "--output", jarFile.absolutePath, dexFile.absolutePath))
            jarFile
        } catch (e: Exception) {
            logger.error("Failed to convert dex to jar", e)
            null
        }
    }

    /**
     * Extract classes.dex from the plugin archive
     */
    private fun extractDex(pluginFile: File): File? {
        return try {
            ZipFile(pluginFile).use { zip ->
                val dexEntry = zip.getEntry("classes.dex") ?: run {
                    logger.error("classes.dex not found in plugin file")
                    return null
                }
                val tempDex = Files.createTempFile("cs-plugin-", ".dex").toFile()
                zip.getInputStream(dexEntry).use { input ->
                    tempDex.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
                tempDex
            }
        } catch (e: Exception) {
            logger.error("Failed to extract classes.dex", e)
            null
        }
    }

    /**
     * Search using a loaded plugin
     */
    fun search(pluginId: String, query: String): List<com.cloudstream.bridge.SearchResponse> {
        val apis = pluginApis[pluginId] ?: run {
            logger.warn("Plugin not found: $pluginId")
            return emptyList()
        }

        val provider = apis.firstOrNull() ?: return emptyList()

        return runBlocking {
            try {
                val results = runCatching { provider.quickSearch(query) }
                    .getOrNull()
                    ?: runCatching { provider.search(query) }.getOrNull()
                    ?: emptyList()

                results?.map { mapSearchResponse(it) } ?: emptyList()
            } catch (e: Exception) {
                logger.error("Search failed for plugin $pluginId", e)
                emptyList()
            }
        }
    }

    /**
     * Load content using a loaded plugin
     */
    fun loadContent(pluginId: String, url: String): com.cloudstream.bridge.LoadResponse? {
        val apis = pluginApis[pluginId] ?: run {
            logger.warn("Plugin not found: $pluginId")
            return null
        }

        val provider = apis.firstOrNull() ?: return null

        return runBlocking {
            try {
                val result = provider.load(url) ?: return@runBlocking null
                mapLoadResponse(result)
            } catch (e: Exception) {
                logger.error("Load failed for plugin $pluginId", e)
                null
            }
        }
    }

    /**
     * Unload a plugin
     */
    fun unloadPlugin(pluginId: String) {
        val plugin = loadedPlugins.remove(pluginId) ?: return

        runCatching { plugin.pluginInstance.beforeUnload() }.onFailure {
            logger.warn("beforeUnload() failed for $pluginId", it)
        }

        // Remove providers from APIHolder
        plugin.apis.forEach { api ->
            synchronized(APIHolder.allProviders) {
                APIHolder.allProviders.remove(api)
            }
            APIHolder.removePluginMapping(api)
        }
        pluginApis.remove(pluginId)

        runCatching { plugin.classLoader.close() }
            .onFailure { logger.warn("Failed to close classloader for $pluginId", it) }

        logger.info("Plugin unloaded: $pluginId")
    }

    /**
     * Get list of loaded plugin IDs
     */
    fun getLoadedPlugins(): List<String> {
        return loadedPlugins.keys.toList()
    }

    /**
     * Get plugin instance
     */
    fun getPlugin(pluginId: String): PluginInstance? {
        return loadedPlugins[pluginId]
    }
}

/**
 * Represents a loaded plugin instance
 */
data class PluginInstance(
    val id: String,
    val file: File,
    val manifest: PluginManifest,
    val repositoryUrl: String,
    val classLoader: URLClassLoader,
    val pluginInstance: BasePlugin,
    val apis: List<MainAPI>
)

private fun mapSearchResponse(src: com.lagradost.cloudstream3.SearchResponse): com.cloudstream.bridge.SearchResponse {
    return com.cloudstream.bridge.SearchResponse(
        name = src.name,
        url = src.url,
        apiName = src.apiName,
        type = src.type?.name ?: TvType.Others.name,
        posterUrl = src.posterUrl,
        year = null,
        plot = null,
        score = src.score?.toDouble()
    )
}

private fun mapLoadResponse(src: com.lagradost.cloudstream3.LoadResponse): com.cloudstream.bridge.LoadResponse {
    val episodes = if (src is TvSeriesLoadResponse) {
        src.episodes.map {
            EpisodeResponse(
                name = it.name ?: "",
                url = it.data,
                season = it.season ?: 0,
                episode = it.episode ?: 0,
                description = it.description
            )
        }
    } else {
        null
    }

    val actors = src.actors?.map { actor ->
        ActorResponse(
            name = actor.actor.name,
            imageUrl = actor.actor.image
        )
    }

    return com.cloudstream.bridge.LoadResponse(
        name = src.name,
        url = src.url,
        apiName = src.apiName,
        type = src.type.name,
        posterUrl = src.posterUrl,
        backgroundUrl = src.backgroundPosterUrl,
        year = src.year,
        plot = src.plot,
        score = src.score?.toDouble(),
        episodes = episodes,
        actors = actors,
        genres = src.tags
    )
}

