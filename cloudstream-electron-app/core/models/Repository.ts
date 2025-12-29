/**
 * Repository data structure for storing repository information
 */
export interface RepositoryData {
    iconUrl?: string;
    name: string;
    url: string;
}

/**
 * Parsed repository structure from GitHub
 */
export interface Repository {
    iconUrl?: string;
    name: string;
    description?: string;
    manifestVersion: number;
    pluginLists: string[]; // URLs to plugin list JSON files
}

/**
 * Plugin information from repository
 */
export interface SitePlugin {
    // URL to the plugin file (.js or .ts for Electron)
    url: string;
    // Status: 0 = Down, 1 = Ok, 2 = Slow, 3 = Beta only
    status: number;
    // Version number, any change triggers auto update
    version: number;
    // API version for backwards compatibility
    apiVersion: number;
    // Display name
    name: string;
    // Internal name for referencing
    internalName: string;
    // Plugin authors
    authors: string[];
    // Plugin description
    description?: string;
    // Repository URL where plugin is hosted
    repositoryUrl?: string;
    // Supported TV types
    tvTypes?: string[];
    // Language code (e.g., "en", "zh-TW")
    language?: string;
    // Icon URL
    iconUrl?: string;
    // File size in bytes
    fileSize?: number;
}

