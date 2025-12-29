import type { Repository, RepositoryData, SitePlugin } from '../models/Repository';

/**
 * Converts GitHub URLs to raw.githubusercontent.com format
 */
function convertRawGitUrl(url: string): string {
    // Convert github.com URLs to raw.githubusercontent.com
    const githubRegex = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/(.*)$/;
    const match = url.match(githubRegex);
    if (match) {
        const [, owner, repo, path] = match;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${path}`;
    }
    // If already raw.githubusercontent.com, return as is
    if (url.includes('raw.githubusercontent.com')) {
        return url;
    }
    // Otherwise return as is (might be a direct URL)
    return url;
}

/**
 * Fetches and parses a repository from a URL
 */
export async function parseRepository(repositoryUrl: string): Promise<Repository | null> {
    try {
        const response = await fetch(convertRawGitUrl(repositoryUrl));
        if (!response.ok) {
            console.error(`Failed to fetch repository: ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        return data as Repository;
    } catch (error) {
        console.error('Error parsing repository:', error);
        return null;
    }
}

/**
 * Fetches and parses plugins from a plugin list URL
 */
export async function parsePlugins(pluginListUrl: string): Promise<SitePlugin[]> {
    try {
        const response = await fetch(convertRawGitUrl(pluginListUrl));
        if (!response.ok) {
            console.error(`Failed to fetch plugin list: ${response.statusText}`);
            return [];
        }
        const data = await response.json();
        // Handle both array and single object
        if (Array.isArray(data)) {
            return data as SitePlugin[];
        }
        return [data as SitePlugin];
    } catch (error) {
        console.error('Error parsing plugins:', error);
        return [];
    }
}

/**
 * Gets all plugins from a repository
 */
export async function getRepoPlugins(repositoryUrl: string): Promise<Array<{ repositoryUrl: string; plugin: SitePlugin }> | null> {
    const repo = await parseRepository(repositoryUrl);
    if (!repo) {
        return null;
    }

    const allPlugins: Array<{ repositoryUrl: string; plugin: SitePlugin }> = [];
    
    // Fetch plugins from all plugin lists in parallel
    const pluginPromises = repo.pluginLists.map(async (pluginListUrl) => {
        const plugins = await parsePlugins(pluginListUrl);
        return plugins.map(plugin => ({
            repositoryUrl,
            plugin
        }));
    });

    const results = await Promise.all(pluginPromises);
    results.forEach(pluginGroup => {
        allPlugins.push(...pluginGroup);
    });

    // Remove duplicates based on plugin URL
    const uniquePlugins = allPlugins.filter((item, index, self) =>
        index === self.findIndex(t => t.plugin.url === item.plugin.url)
    );

    return uniquePlugins;
}

/**
 * Downloads a plugin file from a URL
 * Returns the file content as a string (for text) or ArrayBuffer (for binary)
 */
export async function downloadPlugin(pluginUrl: string): Promise<string | ArrayBuffer | null> {
    try {
        const response = await fetch(convertRawGitUrl(pluginUrl));
        if (!response.ok) {
            console.error(`Failed to download plugin: ${response.statusText}`);
            return null;
        }
        
        // Check content type to determine if it's binary
        const contentType = response.headers.get('content-type') || '';
        const isBinary = contentType.includes('application/octet-stream') || 
                        contentType.includes('application/zip') ||
                        contentType.includes('application/x-dex');
        
        if (isBinary) {
            // Return as ArrayBuffer for binary files
            return await response.arrayBuffer();
        } else {
            // Return as string for text files
            return await response.text();
        }
    } catch (error) {
        console.error('Error downloading plugin:', error);
        return null;
    }
}

