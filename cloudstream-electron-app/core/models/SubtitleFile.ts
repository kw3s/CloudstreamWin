// Subtitle file model - mirrors Android SubtitleFile
export interface SubtitleFile {
    lang: string; // Language code (e.g., "en", "es", "fr")
    url: string; // Subtitle file URL
    headers?: Record<string, string>; // Optional headers for the request
    name?: string; // Display name (e.g., "English", "Spanish")
}

