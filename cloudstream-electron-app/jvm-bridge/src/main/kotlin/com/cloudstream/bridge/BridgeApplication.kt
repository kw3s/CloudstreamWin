package com.cloudstream.bridge

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.http.content.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import java.io.File
import java.util.concurrent.ConcurrentHashMap

val logger = LoggerFactory.getLogger("BridgeApplication")

@Serializable
data class LoadPluginRequest(
    val pluginPath: String,
    val pluginId: String,
    val repositoryUrl: String
)

@Serializable
data class PluginResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class SearchRequest(
    val pluginId: String,
    val query: String
)

@Serializable
data class LoadRequest(
    val pluginId: String,
    val url: String
)

@Serializable
data class SearchResponse(
    val name: String,
    val url: String,
    val apiName: String,
    val type: String,
    val posterUrl: String? = null,
    val year: Int? = null,
    val plot: String? = null,
    val score: Double? = null
)

@Serializable
data class LoadResponse(
    val name: String,
    val url: String,
    val apiName: String,
    val type: String,
    val posterUrl: String? = null,
    val backgroundUrl: String? = null,
    val year: Int? = null,
    val plot: String? = null,
    val score: Double? = null,
    val episodes: List<EpisodeResponse>? = null,
    val actors: List<ActorResponse>? = null,
    val genres: List<String>? = null
)

@Serializable
data class EpisodeResponse(
    val name: String,
    val url: String,
    val season: Int,
    val episode: Int,
    val description: String? = null
)

@Serializable
data class ActorResponse(
    val name: String,
    val imageUrl: String? = null
)

fun main(args: Array<String>) {
    val port = args.getOrNull(0)?.toIntOrNull() ?: 8765
    embeddedServer(Netty, port = port, host = "127.0.0.1", module = Application::module)
        .start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            isLenient = true
        })
    }
    
    install(CORS) {
        allowMethod(io.ktor.http.HttpMethod.Get)
        allowMethod(io.ktor.http.HttpMethod.Post)
        allowMethod(io.ktor.http.HttpMethod.Delete)
        allowHeader(io.ktor.http.HttpHeaders.ContentType)
        allowHeader(io.ktor.http.HttpHeaders.AccessControlAllowOrigin)
        anyHost()
    }

    val pluginManager = PluginManager()

    routing {
        get("/health") {
            call.respond(mapOf("status" to "ok", "plugins" to pluginManager.getLoadedPlugins().size))
        }

        post("/plugin/load") {
            try {
                val request = call.receive<LoadPluginRequest>()
                logger.info("Loading plugin: ${request.pluginId} from ${request.pluginPath}")
                
                val result = pluginManager.loadPlugin(
                    File(request.pluginPath),
                    request.pluginId,
                    request.repositoryUrl
                )
                
                if (result) {
                    call.respond(PluginResponse(success = true, message = "Plugin loaded successfully"))
                } else {
                    call.respond(PluginResponse(success = false, error = "Failed to load plugin"))
                }
            } catch (e: Exception) {
                logger.error("Error loading plugin", e)
                call.respond(PluginResponse(success = false, error = e.message ?: "Unknown error"))
            }
        }

        post("/plugin/search") {
            try {
                val request = call.receive<SearchRequest>()
                logger.info("Searching plugin ${request.pluginId} for: ${request.query}")
                
                val results = pluginManager.search(request.pluginId, request.query)
                call.respond(results)
            } catch (e: Exception) {
                logger.error("Error searching plugin", e)
                call.respond(emptyList<SearchResponse>())
            }
        }

        post("/plugin/load-content") {
            try {
                val request = call.receive<LoadRequest>()
                logger.info("Loading content from plugin ${request.pluginId} for: ${request.url}")
                
                val result = pluginManager.loadContent(request.pluginId, request.url)
                if (result != null) {
                    call.respond(result)
                } else {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Content not found"))
                }
            } catch (e: Exception) {
                logger.error("Error loading content", e)
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Unknown error")))
            }
        }

        delete("/plugin/{pluginId}") {
            try {
                val pluginId = call.parameters["pluginId"] ?: return@delete call.respond(
                    HttpStatusCode.BadRequest,
                    mapOf("error" to "Missing pluginId")
                )
                
                logger.info("Unloading plugin: $pluginId")
                pluginManager.unloadPlugin(pluginId)
                call.respond(PluginResponse(success = true, message = "Plugin unloaded"))
            } catch (e: Exception) {
                logger.error("Error unloading plugin", e)
                call.respond(PluginResponse(success = false, error = e.message ?: "Unknown error"))
            }
        }

        get("/plugins") {
            val plugins = pluginManager.getLoadedPlugins()
            call.respond(plugins)
        }
    }
}

