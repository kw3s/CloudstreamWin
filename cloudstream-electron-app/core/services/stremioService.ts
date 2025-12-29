/**
 * Stremio Add-on Service
 * Handles Stremio-style add-ons (HTTP APIs) similar to Nuvio
 * 
 * Stremio add-ons are HTTP services that provide:
 * - manifest.json: Add-on metadata and capabilities
 * - catalog/{type}/{id}.json: Browseable content lists
 * - meta/{type}/{id}.json: Detailed metadata
 * - stream/{type}/{id}.json: Video streams
 * - subtitles/{type}/{id}.json: Subtitle files
 */

import type { SearchResponse } from '../models/SearchResponse';
import type { LoadResponse } from '../models/LoadResponse';
import type { Episode } from '../models/Episode';
import type { SubtitleFile } from '../models/SubtitleFile';

/**
 * Stremio Manifest structure
 */
export interface StremioManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    logo?: string;
    background?: string;
    contactEmail?: string;
    catalogs?: Array<{
        type: string;
        id: string;
        name: string;
        extraSupported?: string[];
        extraRequired?: string[];
    }>;
    resources?: Array<{
        name: string;
        types: string[];
        idPrefixes?: string[];
    }>;
    types?: string[];
    idPrefixes?: string[];
    behaviorHints?: {
        configurable?: boolean;
        configurationRequired?: boolean;
        configurationURL?: string;
    };
    // Internal fields
    url?: string; // Base URL of the add-on
    originalUrl?: string; // Original manifest URL
}

/**
 * Stremio Meta (content metadata)
 */
export interface StremioMeta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    logo?: string;
    description?: string;
    releaseInfo?: string;
    imdbRating?: string;
    year?: number;
    genres?: string[];
    runtime?: string;
    cast?: string[];
    director?: string | string[];
    writer?: string | string[];
    certification?: string;
    country?: string;
    imdb_id?: string;
    slug?: string;
    released?: string;
    trailerStreams?: Array<{
        title: string;
        ytId: string;
    }>;
    videos?: Array<{
        id: string;
        title: string;
        released: string;
        season?: number;
        episode?: number;
        thumbnail?: string;
    }>;
}

/**
 * Stremio Stream
 */
export interface StremioStream {
    name?: string;
    title?: string;
    url: string;
    description?: string;
    infoHash?: string;
    fileIdx?: number;
    behaviorHints?: {
        bingeGroup?: string;
        notWebReady?: boolean;
        [key: string]: any;
    };
    size?: number;
    subtitles?: Array<{
        id: string;
        url: string;
        lang: string;
    }>;
}

/**
 * Stremio Subtitle
 */
export interface StremioSubtitle {
    id: string;
    url: string;
    lang: string;
    fps?: number;
}

const STORAGE_KEY = 'stremio-addons';
const ADDON_ORDER_KEY = 'stremio-addon-order';

class StremioService {
    private static instance: StremioService;
    private installedAddons: Map<string, StremioManifest> = new Map();
    private addonOrder: string[] = [];
    private readonly MAX_CONCURRENT_REQUESTS = 3;
    private readonly DEFAULT_PAGE_SIZE = 50;

    private constructor() {
        this.loadInstalledAddons();
    }

    public static getInstance(): StremioService {
        if (!StremioService.instance) {
            StremioService.instance = new StremioService();
        }
        return StremioService.instance;
    }

    /**
     * Get base URL from manifest URL
     */
    private getAddonBaseURL(url: string): { baseUrl: string; queryParams?: string } {
        const [baseUrl, queryString] = url.split('?');
        let cleanBaseUrl = baseUrl.replace(/manifest\.json$/, '').replace(/\/$/, '');
        
        if (!cleanBaseUrl.startsWith('http')) {
            cleanBaseUrl = `https://${cleanBaseUrl}`;
        }

        return { baseUrl: cleanBaseUrl, queryParams: queryString };
    }

    /**
     * Format ID from URL
     */
    private formatId(url: string): string {
        return url.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }

    /**
     * Retry request with exponential backoff
     */
    private async retryRequest<T>(
        request: () => Promise<T>,
        maxRetries: number = 3
    ): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await request();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError || new Error('Request failed after retries');
    }

    /**
     * Fetch manifest from URL
     */
    async getManifest(url: string): Promise<StremioManifest> {
        try {
            const manifestUrl = url.endsWith('manifest.json')
                ? url
                : `${url.replace(/\/$/, '')}/manifest.json`;

            const response = await this.retryRequest(async () => {
                const res = await fetch(manifestUrl);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            });

            const manifest = response as StremioManifest;
            manifest.originalUrl = url;
            manifest.url = url.replace(/manifest\.json$/, '');

            if (!manifest.id) {
                manifest.id = this.formatId(url);
            }

            return manifest;
        } catch (error) {
            console.error(`Failed to fetch manifest from ${url}:`, error);
            throw new Error(`Failed to fetch addon manifest from ${url}`);
        }
    }

    /**
     * Install an add-on
     */
    async installAddon(url: string): Promise<void> {
        const manifest = await this.getManifest(url);
        if (manifest && manifest.id) {
            this.installedAddons.set(manifest.id, manifest);
            
            if (!this.addonOrder.includes(manifest.id)) {
                this.addonOrder.push(manifest.id);
            }

            this.saveInstalledAddons();
            this.saveAddonOrder();
        } else {
            throw new Error('Invalid addon manifest');
        }
    }

    /**
     * Remove an add-on
     */
    async removeAddon(id: string): Promise<void> {
        if (this.installedAddons.has(id)) {
            this.installedAddons.delete(id);
            this.addonOrder = this.addonOrder.filter(addonId => addonId !== id);
            this.saveInstalledAddons();
            this.saveAddonOrder();
        }
    }

    /**
     * Get all installed add-ons
     */
    getInstalledAddons(): StremioManifest[] {
        return this.addonOrder
            .filter(id => this.installedAddons.has(id))
            .map(id => this.installedAddons.get(id)!);
    }

    /**
     * Check if add-on is installed
     */
    isAddonInstalled(id: string): boolean {
        return this.installedAddons.has(id);
    }

    /**
     * Get catalog from add-on
     */
    async getCatalog(
        manifest: StremioManifest,
        type: string,
        id: string,
        page: number = 1
    ): Promise<StremioMeta[]> {
        if (!manifest.url) {
            throw new Error('Addon URL is missing');
        }

        const { baseUrl, queryParams } = this.getAddonBaseURL(manifest.url);
        const encodedId = encodeURIComponent(id);
        const pageSkip = (page - 1) * this.DEFAULT_PAGE_SIZE;

        // Try different URL formats for compatibility
        const urls = [
            // Simple URL (page 1 only)
            pageSkip === 0 ? `${baseUrl}/catalog/${type}/${encodedId}.json${queryParams ? `?${queryParams}` : ''}` : null,
            // Path-style skip
            `${baseUrl}/catalog/${type}/${encodedId}/skip=${pageSkip}.json${queryParams ? `?${queryParams}` : ''}`,
            // Query-style skip
            `${baseUrl}/catalog/${type}/${encodedId}.json?skip=${pageSkip}&limit=${this.DEFAULT_PAGE_SIZE}${queryParams ? `&${queryParams}` : ''}`
        ].filter(Boolean) as string[];

        for (const url of urls) {
            try {
                const response = await this.retryRequest(async () => {
                    const res = await fetch(url);
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                });

                if (response?.metas && Array.isArray(response.metas)) {
                    return response.metas;
                }
            } catch (error) {
                console.warn(`Failed to fetch catalog from ${url}:`, error);
                continue;
            }
        }

        return [];
    }

    /**
     * Get meta details
     */
    async getMetaDetails(type: string, id: string, preferredAddonId?: string): Promise<StremioMeta | null> {
        const addons = this.getInstalledAddons();
        const addonsToTry = preferredAddonId
            ? [addons.find(a => a.id === preferredAddonId), ...addons.filter(a => a.id !== preferredAddonId)]
            : addons;

        for (const addon of addonsToTry.filter(Boolean) as StremioManifest[]) {
            if (!addon.resources) continue;

            const hasMetaSupport = addon.resources.some(
                r => r.name === 'meta' && (r.types?.includes(type) || !r.types || r.types.length === 0)
            );

            if (!hasMetaSupport) continue;

            try {
                const { baseUrl, queryParams } = this.getAddonBaseURL(addon.url || '');
                const encodedId = encodeURIComponent(id);
                const url = queryParams
                    ? `${baseUrl}/meta/${type}/${encodedId}.json?${queryParams}`
                    : `${baseUrl}/meta/${type}/${encodedId}.json`;

                const response = await this.retryRequest(async () => {
                    const res = await fetch(url);
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                });

                if (response?.meta) {
                    return response.meta;
                }
            } catch (error) {
                console.warn(`Failed to fetch meta from ${addon.name}:`, error);
                continue;
            }
        }

        return null;
    }

    /**
     * Get streams for content
     */
    async getStreams(type: string, id: string): Promise<StremioStream[]> {
        const addons = this.getInstalledAddons();
        const allStreams: StremioStream[] = [];

        for (const addon of addons) {
            if (!addon.resources || !addon.url) continue;

            const hasStreamSupport = addon.resources.some(
                r => r.name === 'stream' && (r.types?.includes(type) || !r.types || r.types.length === 0)
            );

            if (!hasStreamSupport) continue;

            try {
                const { baseUrl, queryParams } = this.getAddonBaseURL(addon.url);
                const encodedId = encodeURIComponent(id);
                const url = queryParams
                    ? `${baseUrl}/stream/${type}/${encodedId}.json?${queryParams}`
                    : `${baseUrl}/stream/${type}/${encodedId}.json`;

                const response = await this.retryRequest(async () => {
                    const res = await fetch(url);
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                });

                if (response?.streams && Array.isArray(response.streams)) {
                    allStreams.push(...response.streams);
                }
            } catch (error) {
                console.warn(`Failed to fetch streams from ${addon.name}:`, error);
                continue;
            }
        }

        return allStreams;
    }

    /**
     * Get subtitles for content
     */
    async getSubtitles(type: string, id: string): Promise<StremioSubtitle[]> {
        const addons = this.getInstalledAddons();
        const allSubtitles: StremioSubtitle[] = [];

        for (const addon of addons) {
            if (!addon.resources || !addon.url) continue;

            const hasSubtitleSupport = addon.resources.some(
                r => r.name === 'subtitles' && (r.types?.includes(type) || !r.types || r.types.length === 0)
            );

            if (!hasSubtitleSupport) continue;

            try {
                const { baseUrl, queryParams } = this.getAddonBaseURL(addon.url);
                const encodedId = encodeURIComponent(id);
                const url = queryParams
                    ? `${baseUrl}/subtitles/${type}/${encodedId}.json?${queryParams}`
                    : `${baseUrl}/subtitles/${type}/${encodedId}.json`;

                const response = await this.retryRequest(async () => {
                    const res = await fetch(url);
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                });

                if (response?.subtitles && Array.isArray(response.subtitles)) {
                    allSubtitles.push(...response.subtitles);
                }
            } catch (error) {
                console.warn(`Failed to fetch subtitles from ${addon.name}:`, error);
                continue;
            }
        }

        return allSubtitles;
    }

    /**
     * Search across all add-ons (via catalogs)
     */
    async search(query: string): Promise<SearchResponse[]> {
        const addons = this.getInstalledAddons();
        const results: SearchResponse[] = [];

        // Search through catalogs (limited - Stremio doesn't have a direct search API)
        // We'll need to fetch catalogs and filter client-side
        // This is a simplified implementation
        for (const addon of addons) {
            if (!addon.catalogs || addon.catalogs.length === 0) continue;

            try {
                // Get first catalog as example
                const catalog = addon.catalogs[0];
                const catalogItems = await this.getCatalog(addon, catalog.type, catalog.id, 1);
                
                // Filter by query (client-side search)
                const matching = catalogItems
                    .filter(item => 
                        item.name.toLowerCase().includes(query.toLowerCase()) ||
                        item.description?.toLowerCase().includes(query.toLowerCase())
                    )
                    .slice(0, 10) // Limit results per addon
                    .map(item => this.convertMetaToSearchResponse(item, addon.id));

                results.push(...matching);
            } catch (error) {
                console.warn(`Failed to search in ${addon.name}:`, error);
                continue;
            }
        }

        return results;
    }

    /**
     * Convert Stremio Meta to Cloudstream SearchResponse
     */
    private convertMetaToSearchResponse(meta: StremioMeta, addonId: string): SearchResponse {
        return {
            name: meta.name,
            url: meta.id,
            apiName: addonId,
            type: meta.type === 'movie' ? 'Movie' : meta.type === 'series' ? 'TvSeries' : 'TvSeries',
            posterUrl: meta.poster,
            year: meta.year,
            plot: meta.description,
            score: meta.imdbRating ? parseFloat(meta.imdbRating) : undefined
        };
    }

    /**
     * Convert Stremio Meta to Cloudstream LoadResponse
     */
    async convertMetaToLoadResponse(meta: StremioMeta, addonId: string): Promise<LoadResponse | null> {
        // Get episodes if it's a series
        const episodes: Episode[] = [];
        
        if (meta.type === 'series' && meta.videos) {
            for (const video of meta.videos) {
                episodes.push({
                    name: video.title || `Episode ${video.episode || ''}`,
                    url: video.id,
                    season: video.season || 1,
                    episode: video.episode || 1,
                    description: undefined
                });
            }
        }

        return {
            name: meta.name,
            url: meta.id,
            apiName: addonId,
            type: meta.type === 'movie' ? 'Movie' : 'TvSeries',
            posterUrl: meta.poster,
            backgroundUrl: meta.background,
            year: meta.year,
            plot: meta.description,
            score: meta.imdbRating ? parseFloat(meta.imdbRating) : undefined,
            episodes: episodes.length > 0 ? episodes : undefined,
            actors: meta.cast?.map(name => ({ name, imageUrl: undefined })),
            genres: meta.genres
        };
    }

    /**
     * Convert Stremio Stream to Cloudstream format
     */
    convertStreamToLoadResponse(stream: StremioStream, addonId: string): LoadResponse {
        return {
            name: stream.name || stream.title || 'Stream',
            url: stream.url,
            apiName: addonId,
            type: 'Movie', // Default, should be determined from context
            episodes: undefined
        };
    }

    /**
     * Convert Stremio Subtitle to Cloudstream SubtitleFile
     */
    convertSubtitleToSubtitleFile(subtitle: StremioSubtitle): SubtitleFile {
        return {
            url: subtitle.url,
            language: subtitle.lang,
            format: 'vtt' // Default, could be determined from URL
        };
    }

    /**
     * Load installed add-ons from storage
     */
    private loadInstalledAddons(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.installedAddons = new Map(Object.entries(data));
            }

            const orderStored = localStorage.getItem(ADDON_ORDER_KEY);
            if (orderStored) {
                this.addonOrder = JSON.parse(orderStored);
            }
        } catch (error) {
            console.error('Failed to load installed addons:', error);
        }
    }

    /**
     * Save installed add-ons to storage
     */
    private saveInstalledAddons(): void {
        try {
            const data = Object.fromEntries(this.installedAddons);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save installed addons:', error);
        }
    }

    /**
     * Save add-on order to storage
     */
    private saveAddonOrder(): void {
        try {
            localStorage.setItem(ADDON_ORDER_KEY, JSON.stringify(this.addonOrder));
        } catch (error) {
            console.error('Failed to save addon order:', error);
        }
    }
}

export const stremioService = StremioService.getInstance();

