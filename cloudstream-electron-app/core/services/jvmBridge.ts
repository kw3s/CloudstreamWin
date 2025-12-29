/**
 * JVM Bridge Service
 * 
 * This service provides a bridge to run Cloudstream Kotlin/DEX plugins in a JVM.
 * Since Cloudstream plugins are compiled to DEX (Android bytecode), we need a JVM
 * to execute them. This service manages communication with a JVM process.
 * 
 * Architecture:
 * 1. Downloads .cs3 plugin files (which are DEX files)
 * 2. Stores them locally
 * 3. Communicates with a JVM bridge process (to be implemented)
 * 4. Executes plugin methods (search, load) via IPC
 */

import { downloadPlugin } from './repositoryService';
import type { SitePlugin } from '../models/Repository';
import type { SearchResponse } from '../models/SearchResponse';
import type { LoadResponse } from '../models/LoadResponse';

// Note: File operations will be handled via Electron IPC from main process
// This service runs in the renderer process and communicates with main process

export interface PluginBridgeResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export interface PluginSearchRequest {
    pluginId: string;
    query: string;
}

export interface PluginLoadRequest {
    pluginId: string;
    url: string;
}

/**
 * JVM Bridge Service
 * Manages communication with JVM process for executing Cloudstream plugins
 */
class JVMBridgeService {
    private static instance: JVMBridgeService;
    private isInitialized: boolean = false;
    private pluginInstances: Map<string, any> = new Map();

    private constructor() {
        // Service initialization
    }

    public static getInstance(): JVMBridgeService {
        if (!JVMBridgeService.instance) {
            JVMBridgeService.instance = new JVMBridgeService();
        }
        return JVMBridgeService.instance;
    }

    /**
     * Download and store plugin file
     * Uses Electron IPC to communicate with main process for file operations
     */
    async downloadPlugin(plugin: SitePlugin, repositoryUrl: string): Promise<string> {
        // Check if plugin already exists on disk
        const pluginPath = await this.getPluginPath(plugin, repositoryUrl);
        if (pluginPath && await this.pluginFileExists(plugin.internalName, repositoryUrl)) {
            console.log(`Plugin ${plugin.name} already downloaded at ${pluginPath}`);
            return pluginPath;
        }

        // Download plugin data
        console.log(`Downloading plugin ${plugin.name} from ${plugin.url}`);
        const pluginData = await downloadPlugin(plugin.url);
        
        if (!pluginData) {
            throw new Error(`Failed to download plugin from ${plugin.url}`);
        }

        // Send to main process via IPC to save file
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            const data = pluginData instanceof ArrayBuffer 
                ? pluginData 
                : new TextEncoder().encode(pluginData).buffer;
            
            const result = await (window as any).electronAPI.savePluginFile(
                plugin.internalName,
                repositoryUrl,
                data
            );

            if (result.success) {
                console.log(`Plugin ${plugin.name} downloaded and saved to ${result.path}`);
                return result.path;
            } else {
                throw new Error(result.error || 'Failed to save plugin file');
            }
        } else {
            // Fallback to localStorage if IPC not available
            const pluginKey = `plugin_${plugin.internalName}_${repositoryUrl}`;
            
            if (pluginData instanceof ArrayBuffer) {
                const bytes = new Uint8Array(pluginData);
                const binary = String.fromCharCode(...bytes);
                const base64 = btoa(binary);
                localStorage.setItem(pluginKey, base64);
                localStorage.setItem(`${pluginKey}_type`, 'binary');
            } else {
                localStorage.setItem(pluginKey, pluginData);
                localStorage.setItem(`${pluginKey}_type`, 'text');
            }

            console.log(`Plugin ${plugin.name} downloaded and stored in localStorage`);
            return pluginKey;
        }
    }

    /**
     * Get plugin file path via IPC
     */
    private async getPluginPath(plugin: SitePlugin, repositoryUrl: string): Promise<string | null> {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            return await (window as any).electronAPI.getPluginPath(plugin.internalName, repositoryUrl);
        }
        return null;
    }

    /**
     * Check if plugin file exists via IPC
     */
    private async pluginFileExists(pluginId: string, repositoryUrl: string): Promise<boolean> {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            return await (window as any).electronAPI.pluginFileExists(pluginId, repositoryUrl);
        }
        return false;
    }

    /**
     * Initialize JVM bridge process
     * Checks if bridge is available and running
     */
    async initializeBridge(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        // Check if bridge is running
        try {
            const response = await fetch('http://127.0.0.1:8765/health', {
                method: 'GET',
                signal: AbortSignal.timeout(2000) // 2 second timeout
            });

            if (response.ok) {
                const health = await response.json();
                console.log('JVM bridge is running:', health);
                this.isInitialized = true;
                return;
            }
        } catch (error) {
            // Bridge not available - this is OK, plugins just won't work
            console.warn('JVM bridge is not available. Cloudstream plugins will not work.');
            console.warn('To enable plugins, build the bridge: cd jvm-bridge && gradlew.bat build');
        }

        this.isInitialized = true;
    }

    /**
     * Load plugin in JVM
     */
    async loadPlugin(plugin: SitePlugin, repositoryUrl: string): Promise<boolean> {
        try {
            await this.initializeBridge();
            
            if (!this.isInitialized) {
                throw new Error('JVM bridge is not available. Please build the bridge first.');
            }
            
            // Download plugin if not already downloaded
            const filePath = await this.downloadPlugin(plugin, repositoryUrl);

            // Send load request to JVM bridge
            const response = await fetch(`http://127.0.0.1:8765/plugin/load`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pluginPath: filePath,
                    pluginId: plugin.internalName,
                    repositoryUrl: repositoryUrl
                }),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`JVM bridge error: ${error}`);
            }

            const result = await response.json() as PluginBridgeResponse;
            return result.success;
        } catch (error) {
            console.error(`Failed to load plugin ${plugin.name}:`, error);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('JVM bridge request timed out. Make sure the bridge is running.');
            }
            return false;
        }
    }

    /**
     * Execute search on plugin
     */
    async search(pluginId: string, query: string): Promise<SearchResponse[]> {
        try {
            const response = await fetch(`http://127.0.0.1:8765/plugin/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pluginId: pluginId,
                    query: query
                })
            });

            if (!response.ok) {
                console.error(`Search failed: ${response.statusText}`);
                return [];
            }

            const results = await response.json() as SearchResponse[];
            return results;
        } catch (error) {
            console.error(`Search failed for plugin ${pluginId}:`, error);
            return [];
        }
    }

    /**
     * Execute load on plugin
     */
    async load(pluginId: string, url: string): Promise<LoadResponse | null> {
        try {
            const response = await fetch(`http://127.0.0.1:8765/plugin/load-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pluginId: pluginId,
                    url: url
                })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                console.error(`Load failed: ${response.statusText}`);
                return null;
            }

            const result = await response.json() as LoadResponse;
            return result;
        } catch (error) {
            console.error(`Load failed for plugin ${pluginId}:`, error);
            return null;
        }
    }

    /**
     * Unload plugin
     */
    async unloadPlugin(pluginId: string): Promise<void> {
        try {
            // TODO: Unload plugin from JVM
            this.pluginInstances.delete(pluginId);
        } catch (error) {
            console.error(`Failed to unload plugin ${pluginId}:`, error);
        }
    }

    /**
     * Get plugin storage key
     */
    getPluginKey(plugin: SitePlugin, repositoryUrl: string): string {
        return `plugin_${plugin.internalName}_${repositoryUrl}`;
    }
}

export const jvmBridge = JVMBridgeService.getInstance();

