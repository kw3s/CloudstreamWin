// Search orchestration service - mirrors Android SearchViewModel behavior
import { apiHolder } from '../api/ApiHolder';
import type { SearchResponse } from '../models/SearchResponse';
import { stremioService } from './stremioService';

export interface SearchResultState {
  status: 'idle' | 'loading' | 'success' | 'error';
  query: string;
  mergedResults: SearchResponse[];
  perProviderResults: Record<string, SearchResponse[]>;
  error?: string;
}

export interface SearchOptions {
  activeProviders?: string[];
  quick?: boolean;
}

/**
 * Runs search across all active providers in parallel and aggregates results
 * Similar to SearchViewModel.search() in Android app
 */
export async function runSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResultState> {
  const trimmed = query.trim();
  if (trimmed.length <= 1) {
    return {
      status: 'idle',
      query: trimmed,
      mergedResults: [],
      perProviderResults: {},
    };
  }

  const { activeProviders = [], quick = false } = options;

  try {
    const providers = apiHolder.getAllApis().filter((p) => {
      if (activeProviders.length === 0) return true;
      return activeProviders.includes(p.name);
    });

    const perProviderResults: Record<string, SearchResponse[]> = {};

    // Run searches in parallel (like Android's amap)
    await Promise.all(
      providers.map(async (provider) => {
        try {
          const searchFn = quick ? provider.quickSearch : provider.search;
          if (!searchFn) return;

          const results = await searchFn.call(provider, trimmed);
          if (results && Array.isArray(results)) {
            perProviderResults[provider.name] = results;
          }
        } catch (err) {
          console.error(`Search failed for provider ${provider.name}:`, err);
          // Continue with other providers even if one fails
        }
      })
    );

    // Also search Stremio add-ons
    try {
      const stremioResults = await stremioService.search(trimmed);
      if (stremioResults.length > 0) {
        perProviderResults['stremio'] = stremioResults;
      }
    } catch (err) {
      console.error('Stremio search failed:', err);
      // Continue even if Stremio search fails
    }

    // Merge results in round-robin fashion (like bundleSearch in Android)
    const allLists = Object.values(perProviderResults);
    const mergedResults: SearchResponse[] = [];
    let index = 0;
    while (true) {
      let added = 0;
      for (const list of allLists) {
        if (list.length > index) {
          mergedResults.push(list[index]);
          added++;
        }
      }
      if (added === 0) break;
      index++;
    }

    return {
      status: 'success',
      query: trimmed,
      mergedResults,
      perProviderResults,
    };
  } catch (err) {
    return {
      status: 'error',
      query: trimmed,
      mergedResults: [],
      perProviderResults: {},
      error: err instanceof Error ? err.message : 'Unknown search error',
    };
  }
}

