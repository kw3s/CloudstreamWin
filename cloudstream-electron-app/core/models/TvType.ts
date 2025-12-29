export const TvType = {
    Movie: 'Movie',
    AnimeMovie: 'AnimeMovie',
    TvSeries: 'TvSeries',
    Cartoon: 'Cartoon',
    Anime: 'Anime',
    OVA: 'OVA',
    Torrent: 'Torrent',
    Documentary: 'Documentary',
    AsianDrama: 'AsianDrama',
    Live: 'Live',
    NSFW: 'NSFW',
    Others: 'Others',
    Music: 'Music',
    AudioBook: 'AudioBook',
    CustomMedia: 'CustomMedia',
    Audio: 'Audio',
    Podcast: 'Podcast',
} as const;

export type TvType = typeof TvType[keyof typeof TvType];

export function isMovieType(type: TvType): boolean {
    const movieTypes = [
        TvType.AnimeMovie,
        TvType.Live,
        TvType.Movie,
        TvType.Torrent,
    ] as const;
    return movieTypes.includes(type as any);
}

export function isEpisodeBased(type: TvType): boolean {
    const episodeTypes = [
        TvType.Anime,
        TvType.AsianDrama,
        TvType.Cartoon,
        TvType.TvSeries,
    ] as const;
    return episodeTypes.includes(type as any);
}
