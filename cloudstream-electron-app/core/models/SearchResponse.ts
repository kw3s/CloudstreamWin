import { TvType } from './TvType';

export const SearchQuality = {
    Cam: 'Cam',
    CamRip: 'CamRip',
    HdCam: 'HdCam',
    Telesync: 'Telesync',
    WorkPrint: 'WorkPrint',
    Telecine: 'Telecine',
    HQ: 'HQ',
    HD: 'HD',
    HDR: 'HDR',
    BlueRay: 'BlueRay',
    DVD: 'DVD',
    SD: 'SD',
    FourK: 'FourK',
    UHD: 'UHD',
    SDR: 'SDR',
    WebRip: 'WebRip',
} as const;

export type SearchQuality = typeof SearchQuality[keyof typeof SearchQuality];

export interface SearchResponse {
    name: string;
    url: string;
    apiName: string;
    type?: TvType;
    posterUrl?: string;
    posterHeaders?: Record<string, string>;
    id?: number;
    quality?: SearchQuality;
    // score?: Score; // TODO: Implement Score if needed, or use number
}

export interface AnimeSearchResponse extends SearchResponse {
    year?: number;
    dubStatus?: string[]; // Simplified from EnumSet<DubStatus>
    episodes?: Record<string, number>; // map<DubStatus, Int>
}

export interface MovieSearchResponse extends SearchResponse {
    year?: number;
}

export interface TvSeriesSearchResponse extends SearchResponse {
    year?: number;
    episodes?: number;
}
