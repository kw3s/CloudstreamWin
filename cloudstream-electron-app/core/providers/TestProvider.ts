import type { MainAPI } from '../api/MainAPI';
import { type SearchResponse, SearchQuality } from '../models/SearchResponse';
import type { LoadResponse, TvSeriesLoadResponse } from '../models/LoadResponse';
import { TvType } from '../models/TvType';

export class TestProvider implements MainAPI {
    name = "TestProvider";
    mainUrl = "https://example.com";
    supportedTypes = new Set([TvType.TvSeries, TvType.Movie]);
    lang = "en";
    hasMainPage = true;
    hasQuickSearch = true;
    hasChromecastSupport = false;
    hasDownloadSupport = false;

    async search(query: string): Promise<SearchResponse[]> {
        return [
            {
                name: `Result for ${query}`,
                url: `${this.mainUrl}/search/${query}`,
                apiName: this.name,
                type: TvType.TvSeries,
                quality: SearchQuality.HD,
                posterUrl: "https://via.placeholder.com/150"
            }
        ];
    }

    async quickSearch(query: string): Promise<SearchResponse[]> {
        return this.search(query);
    }

    async load(url: string): Promise<LoadResponse> {
        return {
            name: "Test Series",
            url: url,
            apiName: this.name,
            type: TvType.TvSeries,
            plot: "This is a test series description.",
            posterUrl: "https://via.placeholder.com/300",
            year: 2023,
            comingSoon: false,
            syncData: {},
            trailers: [],
            episodes: [
                {
                    data: "episode1_url",
                    name: "Episode 1",
                    season: 1,
                    episode: 1,
                    description: "First episode"
                },
                {
                    data: "episode2_url",
                    name: "Episode 2",
                    season: 1,
                    episode: 2,
                    description: "Second episode"
                }
            ]
        } as TvSeriesLoadResponse;
    }
}
