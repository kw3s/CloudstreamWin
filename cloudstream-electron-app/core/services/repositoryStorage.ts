import type { RepositoryData } from '../models/Repository';

const REPOSITORIES_STORAGE_KEY = 'cloudstream_repositories';

/**
 * Gets all stored repositories
 */
export function getStoredRepositories(): RepositoryData[] {
    try {
        const stored = localStorage.getItem(REPOSITORIES_STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as RepositoryData[];
    } catch {
        return [];
    }
}

/**
 * Adds a repository
 */
export function addRepository(repository: RepositoryData): void {
    const repos = getStoredRepositories();
    // Check for duplicates by URL
    if (repos.some(r => r.url === repository.url)) {
        console.warn(`Repository with URL ${repository.url} already exists`);
        return;
    }
    repos.push(repository);
    localStorage.setItem(REPOSITORIES_STORAGE_KEY, JSON.stringify(repos));
}

/**
 * Removes a repository
 */
export function removeRepository(url: string): void {
    const repos = getStoredRepositories();
    const filtered = repos.filter(r => r.url !== url);
    localStorage.setItem(REPOSITORIES_STORAGE_KEY, JSON.stringify(filtered));
}

