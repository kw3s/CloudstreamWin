import type { TvType } from './TvType';
import type { SearchResponse } from './SearchResponse';
import type { Episode } from './Episode';

export interface TrailerData {
    extractorUrl: string;
    referer?: string;
    raw: boolean;
    headers?: Record<string, string>;
}

export interface ActorData {
    actor: {
        name: string;
        image?: string;
    };
    role?: string;
    roleString?: string;
}

export interface LoadResponse {
    name: string;
    url: string;
    apiName: string;
    type: TvType;
    posterUrl?: string;
    year?: number;
    plot?: string;
    rating?: number; // Simplified from Score
    tags?: string[];
    duration?: number; // Minutes
    trailers: TrailerData[];
    recommendations?: SearchResponse[];
    actors?: ActorData[];
    comingSoon: boolean;
    syncData: Record<string, string>;
    posterHeaders?: Record<string, string>;
    backgroundPosterUrl?: string;
    contentRating?: string;
}

export interface AnimeLoadResponse extends LoadResponse {
    engName?: string;
    japName?: string;
    episodes: Record<string, Episode[]>; // map<DubStatus, List<Episode>>
    showStatus?: string; // Enum ShowStatus
}

export interface TvSeriesLoadResponse extends LoadResponse {
    episodes: Episode[];
    showStatus?: string;
}

export interface MovieLoadResponse extends LoadResponse {
    dataUrl: string;
}

export interface TorrentLoadResponse extends LoadResponse {
    magnet?: string;
    torrent?: string;
}
