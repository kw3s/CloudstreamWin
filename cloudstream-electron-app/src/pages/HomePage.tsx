import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
    // Test video URLs - publicly available sample videos
    const testVideos = [
        {
            name: 'Big Buck Bunny (Sample Video)',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            description: 'A classic test video for media players',
        },
        {
            name: 'Elephants Dream (Sample Video)',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            description: 'Another test video sample',
        },
        {
            name: 'For Bigger Blazes (Sample Video)',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            description: 'Short test video',
        },
    ];

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '0.5rem' }}>Welcome to CloudStream Desktop</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
                Search for content or test the video player with sample videos below
            </p>

            <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Test Video Player</h2>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                    Click on any video below to test the player controls:
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {testVideos.map((video, index) => (
                        <Link
                            key={index}
                            to={`/player?url=${encodeURIComponent(video.url)}&name=${encodeURIComponent(video.name)}`}
                            style={{
                                textDecoration: 'none',
                                color: 'inherit',
                            }}
                        >
                            <div style={{
                                border: '1px solid #e0e0e0',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'pointer',
                                backgroundColor: 'white',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            >
                                <div style={{
                                    width: '100%',
                                    height: '200px',
                                    backgroundColor: '#f0f0f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '3rem',
                                }}>
                                    ▶
                                </div>
                                <div style={{ padding: '1rem' }}>
                                    <div style={{
                                        fontWeight: '600',
                                        marginBottom: '0.5rem',
                                        fontSize: '1.1rem',
                                    }}>
                                        {video.name}
                                    </div>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        color: '#666',
                                    }}>
                                        {video.description}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div style={{
                padding: '1.5rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginTop: '2rem',
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Keyboard Shortcuts</h3>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#666' }}>
                    <li><strong>Space</strong> - Play/Pause</li>
                    <li><strong>← →</strong> - Seek backward/forward (10 seconds)</li>
                    <li><strong>↑ ↓</strong> - Increase/decrease volume</li>
                    <li><strong>F</strong> - Toggle fullscreen</li>
                    <li><strong>M</strong> - Toggle mute</li>
                    <li><strong>Escape</strong> - Exit fullscreen</li>
                </ul>
            </div>
        </div>
    );
};
