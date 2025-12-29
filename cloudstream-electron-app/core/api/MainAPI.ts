import type { SearchResponse } from '../models/SearchResponse';
import type { LoadResponse } from '../models/LoadResponse';
import type { TvType } from '../models/TvType';

export interface MainAPI {
    name: string;
    mainUrl: string;
    supportedTypes: Set<TvType>;
    lang: string;
    hasMainPage: boolean;
    hasQuickSearch: boolean;
    hasChromecastSupport: boolean;
    hasDownloadSupport: boolean;

    search(query: string): Promise<SearchResponse[]>;
    quickSearch(query: string): Promise<SearchResponse[]>;
    load(url: string): Promise<LoadResponse>;
    // getMainPage(page: number, request: MainPageRequest): Promise<HomePageResponse>;
}
