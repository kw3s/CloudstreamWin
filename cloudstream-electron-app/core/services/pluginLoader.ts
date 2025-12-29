import type { MainAPI } from '../api/MainAPI';
import { apiHolder } from '../api/ApiHolder';
import type { SitePlugin } from '../models/Repository';
import { downloadPlugin } from './repositoryService';
import { jvmBridge } from './jvmBridge';

/**
 * Plugin metadata stored locally
 */
export interface PluginMetadata {
    internalName: string;
    url: string;
    version: number;
    repositoryUrl: string;
    enabled: boolean;
}

const PLUGINS_STORAGE_KEY = 'cloudstream_plugins';
const PLUGIN_CODE_STORAGE_PREFIX = 'plugin_code_';

/**
 * Gets all stored plugin metadata
 */
export function getStoredPlugins(): PluginMetadata[] {
    try {
        const stored = localStorage.getItem(PLUGINS_STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as PluginMetadata[];
    } catch {
        return [];
    }
}

/**
 * Saves plugin metadata
 */
export function savePluginMetadata(plugin: PluginMetadata): void {
    const plugins = getStoredPlugins();
    const index = plugins.findIndex(p => p.internalName === plugin.internalName && p.repositoryUrl === plugin.repositoryUrl);
    if (index >= 0) {
        plugins[index] = plugin;
    } else {
        plugins.push(plugin);
    }
    localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(plugins));
}

/**
 * Removes plugin metadata
 */
export function removePluginMetadata(internalName: string, repositoryUrl: string): void {
    const plugins = getStoredPlugins();
    const filtered = plugins.filter(p => !(p.internalName === internalName && p.repositoryUrl === repositoryUrl));
    localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(filtered));
    // Also remove stored code
    localStorage.removeItem(`${PLUGIN_CODE_STORAGE_PREFIX}${internalName}_${repositoryUrl}`);
}

/**
 * Stores plugin code
 */
function storePluginCode(internalName: string, repositoryUrl: string, code: string): void {
    localStorage.setItem(`${PLUGIN_CODE_STORAGE_PREFIX}${internalName}_${repositoryUrl}`, code);
}

/**
 * Gets stored plugin code
 */
function getStoredPluginCode(internalName: string, repositoryUrl: string): string | null {
    return localStorage.getItem(`${PLUGIN_CODE_STORAGE_PREFIX}${internalName}_${repositoryUrl}`);
}

/**
 * Loads and executes a TypeScript/JavaScript plugin
 * Note: In a production environment, you'd want to use a proper module bundler or transpiler
 * For now, we'll use eval (with proper sandboxing considerations)
 */
export interface PluginLoadError {
    message: string;
    stage: 'download' | 'parse' | 'execute' | 'validate' | 'register';
    details?: any;
}

export async function loadPlugin(plugin: SitePlugin, repositoryUrl: string): Promise<{ success: boolean; error?: PluginLoadError }> {
    try {
        // Check if plugin is already loaded
        const existing = apiHolder.getApi(plugin.internalName);
        if (existing) {
            console.log(`Plugin ${plugin.internalName} is already loaded`);
            return { success: true };
        }

        // Check if we have stored code
        let code: string | null = getStoredPluginCode(plugin.internalName, repositoryUrl);
        let isBinaryFile = false;
        
        if (!code) {
            // Download the plugin
            console.log(`Downloading plugin: ${plugin.name} from ${plugin.url}`);
            const downloaded = await downloadPlugin(plugin.url);
            if (!downloaded) {
                const error: PluginLoadError = {
                    message: `Failed to download plugin from ${plugin.url}`,
                    stage: 'download'
                };
                console.error(`Failed to download plugin: ${plugin.name}`, error);
                return { success: false, error };
            }
            
            // Handle binary vs text
            if (downloaded instanceof ArrayBuffer) {
                // Binary file - convert to string for detection, but mark as binary
                const bytes = new Uint8Array(downloaded);
                code = String.fromCharCode(...bytes);
                isBinaryFile = true;
            } else {
                code = downloaded;
            }
            
            // Store the code
            storePluginCode(plugin.internalName, repositoryUrl, code);
        } else {
            // Check if stored code is binary (from previous download)
            isBinaryFile = code.startsWith('PK') || code.startsWith('dex\n');
        }

        // Check if this is a binary file (Kotlin/DEX/APK) vs JavaScript
        // Cloudstream Android plugins are compiled Kotlin, not JavaScript
        const isBinary = (text: string): boolean => {
            if (isBinaryFile) return true;
            // Check for ZIP/APK signature (PK = ZIP header)
            if (text.startsWith('PK')) return true;
            // Check for DEX magic number
            if (text.startsWith('dex\n')) return true;
            // Check for binary content (non-printable characters in first 100 chars)
            const first100 = text.substring(0, Math.min(100, text.length));
            const binaryChars = first100.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g);
            if (binaryChars && binaryChars.length > first100.length * 0.1) return true;
            return false;
        };

        if (isBinary(code)) {
            // This is a DEX file - use JVM bridge to load it
            console.log(`Plugin ${plugin.name} is a DEX file, using JVM bridge to load it`);
            try {
                const loaded = await jvmBridge.loadPlugin(plugin, repositoryUrl);
                if (loaded) {
                    // Create a proxy MainAPI that communicates with JVM bridge
                    const proxyApi: MainAPI = {
                        name: plugin.internalName,
                        mainUrl: plugin.url,
                        search: async (query: string) => {
                            return await jvmBridge.search(plugin.internalName, query);
                        },
                        load: async (url: string) => {
                            return await jvmBridge.load(plugin.internalName, url);
                        },
                        quickSearch: async (query: string) => {
                            return await jvmBridge.search(plugin.internalName, query);
                        }
                    };

                    // Register the proxy
                    apiHolder.addPlugin(proxyApi);

                    // Save metadata
                    savePluginMetadata({
                        internalName: plugin.internalName,
                        url: plugin.url,
                        version: plugin.version,
                        repositoryUrl,
                        enabled: true
                    });

                    console.log(`Successfully loaded DEX plugin via JVM bridge: ${plugin.name}`);
                    return { success: true };
                } else {
                    const error: PluginLoadError = {
                        message: `Failed to load DEX plugin via JVM bridge. JVM bridge may not be fully implemented yet.`,
                        stage: 'parse',
                        details: {
                            pluginType: 'Android/Kotlin (DEX)',
                            suggestion: 'JVM bridge is required to run Cloudstream plugins. This feature is being implemented.',
                            pluginUrl: plugin.url
                        }
                    };
                    return { success: false, error };
                }
            } catch (error: any) {
                const loadError: PluginLoadError = {
                    message: `Error loading DEX plugin via JVM bridge: ${error?.message || 'Unknown error'}`,
                    stage: 'parse',
                    details: {
                        pluginType: 'Android/Kotlin (DEX)',
                        error: error?.toString()
                    }
                };
                console.error(`Failed to load DEX plugin ${plugin.name}:`, loadError);
                return { success: false, error: loadError };
            }
        }

        // Execute the plugin code
        // In a real implementation, you'd want to:
        // 1. Transpile TypeScript if needed
        // 2. Use a proper module system
        // 3. Sandbox the execution
        // For now, we'll create a safe execution context
        const pluginExports: { default?: MainAPI; [key: string]: any } = {};
        
        // Create a function that mimics module.exports
        const module = { exports: pluginExports };
        const exports = pluginExports;
        
        // Execute the plugin code in a function scope
        // This is a simplified version - in production, use a proper module loader
        try {
            // Wrap the code in a function to create a scope
            const pluginFunction = new Function('module', 'exports', 'require', code);
            pluginFunction(module, exports, () => {
                throw new Error('require() is not supported in plugins');
            });
        } catch (error: any) {
            const loadError: PluginLoadError = {
                message: `Error executing plugin code: ${error?.message || 'Unknown error'}`,
                stage: 'execute',
                details: {
                    error: error?.toString(),
                    stack: error?.stack,
                    codePreview: code.substring(0, 200)
                }
            };
            console.error(`Error executing plugin ${plugin.name}:`, loadError);
            return { success: false, error: loadError };
        }

        // Get the plugin instance
        const pluginInstance = module.exports.default || module.exports;
        
        if (!pluginInstance || typeof pluginInstance !== 'object') {
            const error: PluginLoadError = {
                message: `Plugin ${plugin.name} did not export a valid MainAPI instance. Expected an object with search() and load() methods.`,
                stage: 'validate',
                details: {
                    exported: typeof pluginInstance,
                    exportsKeys: Object.keys(module.exports)
                }
            };
            console.error(`Plugin ${plugin.name} validation failed:`, error);
            return { success: false, error };
        }

        // Verify it implements MainAPI interface
        if (typeof pluginInstance.search !== 'function' || typeof pluginInstance.load !== 'function') {
            const error: PluginLoadError = {
                message: `Plugin ${plugin.name} does not implement MainAPI interface. Missing search() or load() methods.`,
                stage: 'validate',
                details: {
                    hasSearch: typeof pluginInstance.search === 'function',
                    hasLoad: typeof pluginInstance.load === 'function',
                    availableMethods: Object.keys(pluginInstance).filter(k => typeof pluginInstance[k] === 'function')
                }
            };
            console.error(`Plugin ${plugin.name} interface validation failed:`, error);
            return { success: false, error };
        }

        // Register the plugin
        try {
            apiHolder.addPlugin(pluginInstance as MainAPI);
        } catch (error: any) {
            const loadError: PluginLoadError = {
                message: `Error registering plugin: ${error?.message || 'Unknown error'}`,
                stage: 'register',
                details: { error: error?.toString() }
            };
            console.error(`Error registering plugin ${plugin.name}:`, loadError);
            return { success: false, error: loadError };
        }

        // Save metadata
        savePluginMetadata({
            internalName: plugin.internalName,
            url: plugin.url,
            version: plugin.version,
            repositoryUrl,
            enabled: true
        });

        console.log(`Successfully loaded plugin: ${plugin.name}`);
        return { success: true };
    } catch (error: any) {
        const loadError: PluginLoadError = {
            message: `Unexpected error loading plugin: ${error?.message || 'Unknown error'}`,
            stage: 'parse',
            details: { error: error?.toString(), stack: error?.stack }
        };
        console.error(`Error loading plugin ${plugin.name}:`, loadError);
        return { success: false, error: loadError };
    }
}

/**
 * Unloads a plugin
 */
export function unloadPlugin(internalName: string): void {
    const plugins = getStoredPlugins();
    const plugin = plugins.find(p => p.internalName === internalName);
    if (plugin) {
        // Remove from API holder
        const api = apiHolder.getApi(internalName);
        if (api) {
            apiHolder.removePlugin(api);
        }
        
        // Update metadata
        plugin.enabled = false;
        savePluginMetadata(plugin);
    }
}

/**
 * Reloads a plugin
 */
export async function reloadPlugin(plugin: SitePlugin, repositoryUrl: string): Promise<{ success: boolean; error?: PluginLoadError }> {
    unloadPlugin(plugin.internalName);
    // Clear stored code to force re-download
    localStorage.removeItem(`${PLUGIN_CODE_STORAGE_PREFIX}${plugin.internalName}_${repositoryUrl}`);
    return await loadPlugin(plugin, repositoryUrl);
}

