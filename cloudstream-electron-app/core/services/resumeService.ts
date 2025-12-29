// Service for saving and restoring video playback positions
// Mirrors the Android app's resume watching functionality

interface ResumeData {
    position: number; // Position in seconds
    duration: number; // Total duration in seconds
    lastUpdated: number; // Unix timestamp
    episodeUrl: string; // Unique identifier for the episode
    episodeName?: string;
}

const STORAGE_KEY = 'cloudstream_resume_data';

/**
 * Save playback position for an episode
 */
export function saveResumePosition(
    episodeUrl: string,
    position: number,
    duration: number,
    episodeName?: string
): void {
    try {
        const resumeData: ResumeData = {
            position,
            duration,
            lastUpdated: Date.now(),
            episodeUrl,
            episodeName,
        };

        const allData = getAllResumeData();
        allData[episodeUrl] = resumeData;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
        console.error('Failed to save resume position:', error);
    }
}

/**
 * Get saved resume position for an episode
 */
export function getResumePosition(episodeUrl: string): ResumeData | null {
    try {
        const allData = getAllResumeData();
        return allData[episodeUrl] || null;
    } catch (error) {
        console.error('Failed to get resume position:', error);
        return null;
    }
}

/**
 * Get all saved resume positions
 */
export function getAllResumeData(): Record<string, ResumeData> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Failed to get all resume data:', error);
        return {};
    }
}

/**
 * Clear resume position for an episode
 */
export function clearResumePosition(episodeUrl: string): void {
    try {
        const allData = getAllResumeData();
        delete allData[episodeUrl];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
        console.error('Failed to clear resume position:', error);
    }
}

/**
 * Clear all resume positions
 */
export function clearAllResumeData(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear all resume data:', error);
    }
}

/**
 * Check if there's a resume position worth restoring
 * (e.g., if watched more than 10 seconds and less than 90% of video)
 */
export function shouldResume(resumeData: ResumeData | null): boolean {
    if (!resumeData) return false;
    
    // Don't resume if watched less than 10 seconds
    if (resumeData.position < 10) return false;
    
    // Don't resume if watched more than 90% (probably finished)
    if (resumeData.duration > 0 && resumeData.position / resumeData.duration > 0.9) {
        return false;
    }
    
    return true;
}

