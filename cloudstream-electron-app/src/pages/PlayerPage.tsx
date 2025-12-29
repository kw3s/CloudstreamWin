import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { saveResumePosition, getResumePosition, shouldResume, clearResumePosition } from '../../core/services/resumeService';
import type { SubtitleFile } from '../../core/models/SubtitleFile';

interface PlayerState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    isLoading: boolean;
}

export const PlayerPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const videoUrl = searchParams.get('url');
    const episodeName = searchParams.get('name') || 'Episode';
    const episodeIndexParam = searchParams.get('episodeIndex');
    const episodesParam = searchParams.get('episodes');
    const subtitlesParam = searchParams.get('subtitles');
    
    // Parse episode list and current index
    const episodes = useMemo(() => {
        return episodesParam ? JSON.parse(decodeURIComponent(episodesParam)) : [];
    }, [episodesParam]);

    // Parse subtitles from URL params (for testing, later will come from providers)
    const parsedSubtitles = useMemo(() => {
        if (!subtitlesParam) return [];
        try {
            return JSON.parse(decodeURIComponent(subtitlesParam)) as SubtitleFile[];
        } catch {
            return [];
        }
    }, [subtitlesParam]);
    const currentEpisodeIndex = episodeIndexParam ? parseInt(episodeIndexParam, 10) : -1;
    const hasNextEpisode = currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1;
    const hasPrevEpisode = currentEpisodeIndex > 0;
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [playerState, setPlayerState] = useState<PlayerState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false,
        isFullscreen: false,
        isLoading: true,
    });
    const [showControls, setShowControls] = useState(true);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [resumePosition, setResumePosition] = useState<number | null>(null);
    // Use parsedSubtitles directly instead of storing in state to avoid unnecessary re-renders
    const subtitles = parsedSubtitles;
    const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleFile | null>(null);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const savePositionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const trackRef = useRef<HTMLTrackElement | null>(null);

    // Format time for display
    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Hide controls after 3 seconds of inactivity
    const resetControlsTimeout = useCallback(() => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        setShowControls(true);
        controlsTimeoutRef.current = setTimeout(() => {
            setPlayerState(prev => {
                if (prev.isPlaying) {
                    setShowControls(false);
                }
                return prev;
            });
        }, 3000);
    }, []);

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setPlayerState(prev => ({
                ...prev,
                currentTime: video.currentTime,
            }));

            // Save position periodically (every 5 seconds)
            if (videoUrl && video.duration > 0) {
                const currentTime = video.currentTime;
                const duration = video.duration;
                
                // Only save if watched more than 10 seconds and less than 90%
                if (currentTime > 10 && currentTime / duration < 0.9) {
                    saveResumePosition(videoUrl, currentTime, duration, episodeName);
                }
            }
        };

        const handleLoadedMetadata = () => {
            setPlayerState(prev => ({
                ...prev,
                duration: video.duration,
                isLoading: false,
            }));

            // Check for saved resume position
            if (videoUrl) {
                const saved = getResumePosition(videoUrl);
                if (saved && shouldResume(saved)) {
                    setResumePosition(saved.position);
                    setShowResumePrompt(true);
                }
            }
        };

        const handlePlay = () => {
            setPlayerState(prev => ({ ...prev, isPlaying: true }));
        };

        const handlePause = () => {
            setPlayerState(prev => ({ ...prev, isPlaying: false }));
        };

        const handleWaiting = () => {
            setPlayerState(prev => ({ ...prev, isLoading: true }));
        };

        const handleCanPlay = () => {
            setPlayerState(prev => ({ ...prev, isLoading: false }));
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('canplay', handleCanPlay);

        // Save position every 5 seconds
        savePositionIntervalRef.current = setInterval(() => {
            if (videoUrl && video.duration > 0 && !video.paused) {
                const currentTime = video.currentTime;
                const duration = video.duration;
                
                if (currentTime > 10 && currentTime / duration < 0.9) {
                    saveResumePosition(videoUrl, currentTime, duration, episodeName);
                }
            }
        }, 5000);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('canplay', handleCanPlay);
            
            if (savePositionIntervalRef.current) {
                clearInterval(savePositionIntervalRef.current);
            }
        };
    }, [videoUrl, episodeName]);

    const togglePlayPause = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const seek = useCallback((seconds: number) => {
        const video = videoRef.current;
        if (!video) return;

        const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
        video.currentTime = newTime;
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const changeVolume = useCallback((delta: number) => {
        const video = videoRef.current;
        if (!video) return;

        const newVolume = Math.max(0, Math.min(1, video.volume + delta));
        video.volume = newVolume;
        setPlayerState(prev => ({
            ...prev,
            volume: newVolume,
            isMuted: newVolume === 0,
        }));
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        video.muted = !video.muted;
        setPlayerState(prev => ({
            ...prev,
            isMuted: video.muted,
        }));
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const toggleFullscreen = useCallback(async () => {
        const container = containerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            await container.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const exitFullscreen = useCallback(async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        }
    }, []);

    const navigateToEpisode = useCallback((offset: number) => {
        if (currentEpisodeIndex < 0 || episodes.length === 0) return;
        
        const newIndex = currentEpisodeIndex + offset;
        if (newIndex < 0 || newIndex >= episodes.length) return;

        const newEpisode = episodes[newIndex];
        const newUrl = `/player?url=${encodeURIComponent(newEpisode.data)}&name=${encodeURIComponent(newEpisode.name || 'Episode')}&episodeIndex=${newIndex}&episodes=${encodeURIComponent(JSON.stringify(episodes.map((e: { data: string; name?: string; season?: number; episode?: number }) => ({ data: e.data, name: e.name, season: e.season, episode: e.episode }))))}`;
        navigate(newUrl, { replace: true });
    }, [currentEpisodeIndex, episodes, navigate]);

    const goToNextEpisode = useCallback(() => {
        navigateToEpisode(1);
    }, [navigateToEpisode]);

    const goToPrevEpisode = useCallback(() => {
        navigateToEpisode(-1);
    }, [navigateToEpisode]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    seek(-10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seek(10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    changeVolume(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    changeVolume(-0.1);
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 's':
                case 'S':
                    e.preventDefault();
                    setShowSubtitleMenu(!showSubtitleMenu);
                    break;
                case 'Escape':
                    if (playerState.isFullscreen) {
                        exitFullscreen();
                    }
                    break;
                case 'n':
                case 'N':
                    if (hasNextEpisode) {
                        e.preventDefault();
                        goToNextEpisode();
                    }
                    break;
                case 'p':
                case 'P':
                    if (hasPrevEpisode) {
                        e.preventDefault();
                        goToPrevEpisode();
                    }
                    break;
            }
            resetControlsTimeout();
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [playerState.isFullscreen, togglePlayPause, seek, changeVolume, toggleFullscreen, toggleMute, exitFullscreen, resetControlsTimeout, hasNextEpisode, hasPrevEpisode, goToNextEpisode, goToPrevEpisode, showSubtitleMenu]);

    // Fullscreen change handler
    useEffect(() => {
        const handleFullscreenChange = () => {
            setPlayerState(prev => ({
                ...prev,
                isFullscreen: !!document.fullscreenElement,
            }));
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const seekTo = useCallback((time: number) => {
        const video = videoRef.current;
        if (!video) return;

        video.currentTime = time;
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        const progressBar = e.currentTarget;
        if (!video || !progressBar) return;

        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * video.duration;
        seekTo(newTime);
    };

    const handleResume = useCallback(() => {
        if (resumePosition !== null && videoRef.current) {
            videoRef.current.currentTime = resumePosition;
            setShowResumePrompt(false);
        }
    }, [resumePosition]);

    const handleDismissResume = useCallback(() => {
        setShowResumePrompt(false);
        if (videoUrl) {
            clearResumePosition(videoUrl);
        }
    }, [videoUrl]);

    if (!videoUrl) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>No video URL provided</p>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginTop: '1rem',
                    }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: showControls ? 'default' : 'none',
            }}
            onMouseMove={resetControlsTimeout}
            onMouseLeave={() => {
                if (playerState.isPlaying) {
                    setShowControls(false);
                }
            }}
            onClick={(e) => {
                // Close subtitle menu when clicking outside
                if (showSubtitleMenu && !(e.target as HTMLElement).closest('[data-subtitle-menu]')) {
                    setShowSubtitleMenu(false);
                }
            }}
        >
            <video
                ref={videoRef}
                src={videoUrl}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                }}
                onClick={togglePlayPause}
            >
                {selectedSubtitle && (
                    <track
                        ref={trackRef}
                        kind="subtitles"
                        srcLang={selectedSubtitle.lang}
                        label={selectedSubtitle.name || selectedSubtitle.lang}
                        src={selectedSubtitle.url}
                        default
                    />
                )}
            </video>

            {/* Loading indicator */}
            {playerState.isLoading && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontSize: '1.2rem',
                    }}
                >
                    Loading...
                </div>
            )}

            {/* Resume prompt */}
            {showResumePrompt && resumePosition !== null && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        padding: '2rem',
                        borderRadius: '12px',
                        color: 'white',
                        textAlign: 'center',
                        zIndex: 1000,
                        minWidth: '300px',
                    }}
                >
                    <div style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: '600' }}>
                        Resume Watching?
                    </div>
                    <div style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.8)' }}>
                        Continue from {formatTime(resumePosition)}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            onClick={handleResume}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '600',
                            }}
                        >
                            Resume
                        </button>
                        <button
                            onClick={handleDismissResume}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                            }}
                        >
                            Start Over
                        </button>
                    </div>
                </div>
            )}

            {/* Controls overlay */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    padding: '1rem',
                    opacity: showControls ? 1 : 0,
                    transition: 'opacity 0.3s',
                    pointerEvents: showControls ? 'auto' : 'none',
                }}
            >
                {/* Progress bar */}
                <div
                    title={`Seek to position (Click anywhere on the bar or use ← → keys)`}
                    style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderRadius: '3px',
                        marginBottom: '1rem',
                        cursor: 'pointer',
                        position: 'relative',
                    }}
                    onClick={handleProgressClick}
                >
                    <div
                        style={{
                            width: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%`,
                            height: '100%',
                            backgroundColor: '#007bff',
                            borderRadius: '3px',
                        }}
                    />
                </div>

                {/* Controls row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Previous Episode */}
                    {hasPrevEpisode && (
                        <button
                            onClick={goToPrevEpisode}
                            title="Previous Episode (P)"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                fontSize: '1.2rem',
                                cursor: 'pointer',
                                padding: '0.5rem',
                            }}
                        >
                            ⏮
                        </button>
                    )}

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlayPause}
                        title={playerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0.5rem',
                        }}
                    >
                        {playerState.isPlaying ? '⏸' : '▶'}
                    </button>

                    {/* Next Episode */}
                    {hasNextEpisode && (
                        <button
                            onClick={goToNextEpisode}
                            title="Next Episode (N)"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                fontSize: '1.2rem',
                                cursor: 'pointer',
                                padding: '0.5rem',
                            }}
                        >
                            ⏭
                        </button>
                    )}

                    {/* Time display */}
                    <span style={{ color: 'white', fontSize: '0.9rem', minWidth: '100px' }}>
                        {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                    </span>

                    {/* Volume control */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <button
                            onClick={toggleMute}
                            title={playerState.isMuted || playerState.volume === 0 ? 'Unmute (M)' : 'Mute (M)'}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                fontSize: '1.2rem',
                                cursor: 'pointer',
                                padding: '0.5rem',
                            }}
                        >
                            {playerState.isMuted || playerState.volume === 0 ? '🔇' : '🔊'}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={playerState.isMuted ? 0 : playerState.volume}
                            onChange={(e) => {
                                const newVolume = parseFloat(e.target.value);
                                const video = videoRef.current;
                                if (video) {
                                    video.volume = newVolume;
                                    video.muted = newVolume === 0;
                                    setPlayerState(prev => ({
                                        ...prev,
                                        volume: newVolume,
                                        isMuted: newVolume === 0,
                                    }));
                                }
                            }}
                            title={`Volume: ${Math.round((playerState.isMuted ? 0 : playerState.volume) * 100)}% (↑ ↓ to adjust)`}
                            style={{ width: '100px', cursor: 'pointer' }}
                        />
                    </div>

                    {/* Episode name */}
                    <span style={{ color: 'white', fontSize: '0.9rem', flex: 1, textAlign: 'center' }}>
                        {episodeName}
                    </span>

                    {/* Subtitle selector */}
                    <div style={{ position: 'relative' }} data-subtitle-menu>
                        <button
                            onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                            title="Subtitles (S)"
                            style={{
                                background: showSubtitleMenu ? 'rgba(255,255,255,0.3)' : 'none',
                                border: 'none',
                                color: 'white',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '4px',
                            }}
                        >
                            {selectedSubtitle ? '📝' : '📄'} {selectedSubtitle ? (selectedSubtitle.name || selectedSubtitle.lang) : 'Subtitles'}
                        </button>
                        {showSubtitleMenu && (
                            <div
                                data-subtitle-menu
                                style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: 0,
                                    marginBottom: '0.5rem',
                                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    minWidth: '200px',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    zIndex: 1000,
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        setSelectedSubtitle(null);
                                        setShowSubtitleMenu(false);
                                        if (trackRef.current) {
                                            trackRef.current.src = '';
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: selectedSubtitle === null ? 'rgba(255,255,255,0.2)' : 'transparent',
                                        border: 'none',
                                        color: 'white',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        marginBottom: '0.25rem',
                                    }}
                                >
                                    Off
                                </button>
                                {subtitles.map((sub, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setSelectedSubtitle(sub);
                                            setShowSubtitleMenu(false);
                                            if (trackRef.current) {
                                                trackRef.current.src = sub.url;
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: selectedSubtitle === sub ? 'rgba(255,255,255,0.2)' : 'transparent',
                                            border: 'none',
                                            color: 'white',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        {sub.name || sub.lang}
                                    </button>
                                ))}
                                {subtitles.length === 0 && (
                                    <div style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                                        No subtitles available
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Fullscreen */}
                    <button
                        onClick={toggleFullscreen}
                        title={playerState.isFullscreen ? 'Exit Fullscreen (F or Escape)' : 'Enter Fullscreen (F)'}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: '0.5rem',
                        }}
                    >
                        {playerState.isFullscreen ? '⤓' : '⤢'}
                    </button>

                    {/* Back button */}
                    <button
                        onClick={() => navigate(-1)}
                        title="Go back to previous page"
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                        }}
                    >
                        Back
                    </button>
                </div>

                {/* Keyboard shortcuts hint */}
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Space: Play/Pause | ← →: Seek | ↑ ↓: Volume | F: Fullscreen | M: Mute | S: Subtitles
                    {hasNextEpisode && ' | N: Next Episode'}
                    {hasPrevEpisode && ' | P: Previous Episode'}
                </div>
            </div>
        </div>
    );
};
