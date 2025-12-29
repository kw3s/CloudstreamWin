import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { apiHolder } from '../../core/api/ApiHolder';
import type { LoadResponse, TvSeriesLoadResponse } from '../../core/models/LoadResponse';

export const DetailsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const url = searchParams.get('url');
    const apiName = searchParams.get('apiName');
    const [data, setData] = useState<LoadResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!url) {
                setError('No URL provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                // Find the specific provider if apiName is provided
                const provider = apiName
                    ? apiHolder.getApi(apiName)
                    : apiHolder.getAllApis()[0];

                if (!provider) {
                    setError('Provider not found');
                    setLoading(false);
                    return;
                }

                const res = await provider.load(url);
                setData(res);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [url, apiName]);

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>Loading...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#fee',
                    color: '#c00',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                }}>
                    {error || 'Error loading data'}
                </div>
                <button
                    onClick={() => navigate('/search')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                    }}
                >
                    Back to Search
                </button>
            </div>
        );
    }

    const episodes = Array.isArray((data as TvSeriesLoadResponse).episodes)
        ? (data as TvSeriesLoadResponse).episodes
        : [];

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <button
                onClick={() => navigate(-1)}
                style={{
                    marginBottom: '1.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                ← Back
            </button>

            <div style={{
                display: 'flex',
                gap: '2rem',
                marginBottom: '2rem',
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                <div style={{ flexShrink: 0 }}>
                    {data.posterUrl ? (
                        <img
                            src={data.posterUrl}
                            alt={data.name}
                            style={{
                                width: '250px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                            onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/250x375?text=No+Image';
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '250px',
                            height: '375px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999',
                        }}>
                            No Image
                        </div>
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '2.5rem' }}>
                        {data.name}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', color: '#666' }}>
                        {data.type && <span>{data.type}</span>}
                        {data.year && <span>• {data.year}</span>}
                        {data.rating && <span>• ⭐ {data.rating.toFixed(1)}</span>}
                    </div>
                    {data.plot && (
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#333', marginBottom: '1rem' }}>
                            {data.plot}
                        </p>
                    )}
                    {data.tags && data.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            {data.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    style={{
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: '#e9ecef',
                                        borderRadius: '12px',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        Provider: {data.apiName}
                    </div>
                </div>
            </div>

            {episodes.length > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                    <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Episodes</h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem',
                    }}>
                        {episodes.map((ep, index) => (
                            <Link
                                to={`/player?url=${encodeURIComponent(ep.data)}&name=${encodeURIComponent(ep.name || 'Episode')}&episodeIndex=${index}&episodes=${encodeURIComponent(JSON.stringify(episodes.map(e => ({ data: e.data, name: e.name, season: e.season, episode: e.episode }))))}`}
                                key={index}
                                style={{
                                    padding: '1rem',
                                    background: '#f8f9fa',
                                    textDecoration: 'none',
                                    color: 'black',
                                    borderRadius: '8px',
                                    border: '1px solid #e0e0e0',
                                    transition: 'all 0.2s',
                                    display: 'block',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#e9ecef';
                                    e.currentTarget.style.borderColor = '#007bff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                    e.currentTarget.style.borderColor = '#e0e0e0';
                                }}
                            >
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                    {ep.season && ep.episode
                                        ? `S${ep.season} E${ep.episode}`
                                        : `Episode ${index + 1}`}
                                    {ep.name && ` - ${ep.name}`}
                                </div>
                                {ep.description && (
                                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                                        {ep.description}
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
