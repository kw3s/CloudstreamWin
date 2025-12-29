import React, { useState, useEffect } from 'react';
import { apiHolder } from '../../core/api/ApiHolder';
import { TestProvider } from '../../core/providers/TestProvider';
import type { SearchResponse } from '../../core/models/SearchResponse';
import { Link } from 'react-router-dom';
import { runSearch } from '../../core/services/searchService';

// Register test provider for now
if (apiHolder.getAllApis().length === 0) {
    apiHolder.addPlugin(new TestProvider());
}

export const SearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [state, setState] = useState<{
        status: 'idle' | 'loading' | 'success' | 'error';
        mergedResults: SearchResponse[];
        perProviderResults: Record<string, SearchResponse[]>;
        error?: string;
    }>({
        status: 'idle',
        mergedResults: [],
        perProviderResults: {},
    });

    const handleSearch = async () => {
        if (query.trim().length <= 1) {
            setState({ status: 'idle', mergedResults: [], perProviderResults: {} });
            return;
        }

        setState((prev) => ({ ...prev, status: 'loading' }));
        const result = await runSearch(query, {});
        setState({
            status: result.status,
            mergedResults: result.mergedResults,
            perProviderResults: result.perProviderResults,
            error: result.error,
        });
    };

    // Auto-search on query change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length > 1) {
                handleSearch();
            } else {
                setState({ status: 'idle', mergedResults: [], perProviderResults: {} });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const providers = apiHolder.getAllApis();
    const hasResults = state.mergedResults.length > 0;
    const hasProviderResults = Object.keys(state.perProviderResults).length > 0;

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Search</h1>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search for movies, TV shows, anime..."
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleSearch}
                    disabled={state.status === 'loading'}
                    style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        backgroundColor: state.status === 'loading' ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: state.status === 'loading' ? 'not-allowed' : 'pointer',
                    }}
                >
                    {state.status === 'loading' ? 'Searching...' : 'Search'}
                </button>
            </div>

            {state.status === 'loading' && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    Searching across {providers.length} provider{providers.length !== 1 ? 's' : ''}...
                </div>
            )}

            {state.status === 'error' && (
                <div style={{ padding: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '8px', marginBottom: '1rem' }}>
                    Error: {state.error || 'Unknown error occurred'}
                </div>
            )}

            {state.status === 'success' && !hasResults && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                    No results found for "{query}"
                </div>
            )}

            {hasResults && (
                <>
                    <div style={{ marginBottom: '1rem', color: '#666' }}>
                        Found {state.mergedResults.length} result{state.mergedResults.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {state.mergedResults.map((item, index) => (
                            <Link
                                to={`/details?url=${encodeURIComponent(item.url)}&apiName=${encodeURIComponent(item.apiName)}`}
                                key={`${item.apiName}-${index}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <div style={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer',
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
                                    <div style={{ position: 'relative', paddingTop: '150%', backgroundColor: '#f0f0f0' }}>
                                        {item.posterUrl ? (
                                            <img
                                                src={item.posterUrl}
                                                alt={item.name}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                }}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#999',
                                                fontSize: '0.9rem',
                                            }}>
                                                No Image
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '0.75rem' }}>
                                        <div style={{
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            marginBottom: '0.25rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {item.type && <span>{item.type}</span>}
                                            {item.quality && <span style={{ color: '#999' }}>• {item.quality}</span>}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                                            {item.apiName}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {hasProviderResults && state.status === 'success' && (
                <div style={{ marginTop: '3rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>Results by Provider</h2>
                    {Object.entries(state.perProviderResults).map(([providerName, results]) => (
                        <div key={providerName} style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '0.5rem', color: '#666' }}>
                                {providerName} ({results.length} result{results.length !== 1 ? 's' : ''})
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: '1rem',
                            }}>
                                {results.map((item, index) => (
                                    <Link
                                        to={`/details?url=${encodeURIComponent(item.url)}&apiName=${encodeURIComponent(item.apiName)}`}
                                        key={`${providerName}-${index}`}
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                    >
                                        <div style={{
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                        }}>
                                            {item.posterUrl && (
                                                <img
                                                    src={item.posterUrl}
                                                    alt={item.name}
                                                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                                                />
                                            )}
                                            <div style={{ padding: '0.5rem' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name}</div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
