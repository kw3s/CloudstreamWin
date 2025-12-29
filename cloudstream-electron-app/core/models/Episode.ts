export interface Episode {
    data: string;
    name?: string;
    season?: number;
    episode?: number;
    posterUrl?: string;
    rating?: number; // Simplified from Score
    description?: string;
    date?: number; // Unix timestamp
    runTime?: number; // Seconds
}
