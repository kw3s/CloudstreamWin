import { useState, useEffect } from 'react';
import { getRepoPlugins } from '../../core/services/repositoryService';
import { loadPlugin, unloadPlugin, getStoredPlugins, type PluginMetadata, type PluginLoadError } from '../../core/services/pluginLoader';
import { getStoredRepositories, addRepository, removeRepository } from '../../core/services/repositoryStorage';
import type { RepositoryData, SitePlugin } from '../../core/models/Repository';
import { apiHolder } from '../../core/api/ApiHolder';
import { stremioService, type StremioManifest } from '../../core/services/stremioService';
import './PluginsPage.css';

export default function ExtensionsPage() {
    const [repositories, setRepositories] = useState<RepositoryData[]>([]);
    const [plugins, setPlugins] = useState<Array<{ repositoryUrl: string; plugin: SitePlugin }>>([]);
    const [loading, setLoading] = useState(false);
    const [newRepoUrl, setNewRepoUrl] = useState('');
    const [newRepoName, setNewRepoName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [installedPlugins, setInstalledPlugins] = useState<PluginMetadata[]>([]);
    const [loadingPlugins, setLoadingPlugins] = useState<Set<string>>(new Set());
    
    // Stremio add-on state
    const [stremioAddons, setStremioAddons] = useState<StremioManifest[]>([]);
    const [newStremioUrl, setNewStremioUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'cloudstream' | 'stremio'>('cloudstream');

    // Load repositories and plugins on mount
    useEffect(() => {
        loadRepositories();
        loadInstalledPlugins();
        loadStremioAddons();
    }, []);

    const loadRepositories = () => {
        const repos = getStoredRepositories();
        setRepositories(repos);
        loadPluginsFromRepos(repos);
    };

    const loadInstalledPlugins = () => {
        const installed = getStoredPlugins();
        setInstalledPlugins(installed);
    };

    const loadPluginsFromRepos = async (repos: RepositoryData[]) => {
        setLoading(true);
        setError(null);
        try {
            const allPlugins: Array<{ repositoryUrl: string; plugin: SitePlugin }> = [];
            
            // Load plugins from all repositories in parallel
            const pluginPromises = repos.map(async (repo) => {
                try {
                    const repoPlugins = await getRepoPlugins(repo.url);
                    if (repoPlugins) {
                        return repoPlugins;
                    }
                    return [];
                } catch (err) {
                    console.error(`Error loading plugins from ${repo.name}:`, err);
                    return [];
                }
            });

            const results = await Promise.all(pluginPromises);
            results.forEach(pluginGroup => {
                allPlugins.push(...pluginGroup);
            });

            setPlugins(allPlugins);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load plugins');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRepository = async () => {
        if (!newRepoUrl.trim()) {
            setError('Please enter a repository URL');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            // Validate URL
            const url = new URL(newRepoUrl.trim());
            
            // Try to fetch the repository to validate it
            let repoName = newRepoName.trim();
            let repoIconUrl: string | undefined = undefined;
            
            try {
                const repoData = await getRepoPlugins(newRepoUrl.trim());
                if (repoData && repoData.length > 0) {
                    // Repository is valid, use the parsed name if available
                    // For now, we'll use the provided name or default
                    if (!repoName) {
                        // Try to extract name from URL or use default
                        const urlParts = newRepoUrl.trim().split('/');
                        repoName = urlParts[urlParts.length - 2] || 'Unnamed Repository';
                    }
                }
            } catch (fetchErr) {
                // If we can't fetch, still allow adding (might be offline or invalid)
                console.warn('Could not validate repository:', fetchErr);
            }
            
            const repo: RepositoryData = {
                name: repoName || 'Unnamed Repository',
                url: newRepoUrl.trim(),
                iconUrl: repoIconUrl
            };

            addRepository(repo);
            const updatedRepos = [...repositories, repo];
            setRepositories(updatedRepos);
            setNewRepoUrl('');
            setNewRepoName('');
            
            // Load plugins from the new repository
            await loadPluginsFromRepos(updatedRepos);
        } catch (err) {
            setError('Invalid URL format. Please enter a valid repository URL (e.g., https://raw.githubusercontent.com/owner/repo/branch/repo.json)');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveRepository = (url: string) => {
        removeRepository(url);
        const updated = repositories.filter(r => r.url !== url);
        setRepositories(updated);
        setPlugins(plugins.filter(p => p.repositoryUrl !== url));
    };

    const handleInstallPlugin = async (plugin: SitePlugin, repositoryUrl: string) => {
        const key = `${plugin.internalName}_${repositoryUrl}`;
        setLoadingPlugins(prev => new Set(prev).add(key));
        setError(null);
        
        try {
            const result = await loadPlugin(plugin, repositoryUrl);
            if (result.success) {
                loadInstalledPlugins();
                // Reload available APIs
                const allApis = apiHolder.getAllApis();
                console.log(`Total plugins loaded: ${allApis.length}`);
            } else {
                // Show detailed error message
                const errorMsg = result.error 
                    ? `${result.error.message}${result.error.details ? ` (${JSON.stringify(result.error.details)})` : ''}`
                    : `Failed to install plugin: ${plugin.name}`;
                setError(errorMsg);
                console.error('Plugin installation failed:', result.error);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to install plugin';
            setError(errorMsg);
            console.error('Unexpected error installing plugin:', err);
        } finally {
            setLoadingPlugins(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    const handleUninstallPlugin = (internalName: string) => {
        unloadPlugin(internalName);
        loadInstalledPlugins();
    };

    const isPluginInstalled = (internalName: string): boolean => {
        return installedPlugins.some(p => p.internalName === internalName && p.enabled);
    };

    const isPluginLoading = (plugin: SitePlugin, repositoryUrl: string): boolean => {
        const key = `${plugin.internalName}_${repositoryUrl}`;
        return loadingPlugins.has(key);
    };

    const getPluginStatus = (plugin: SitePlugin): string => {
        switch (plugin.status) {
            case 0: return 'Down';
            case 1: return 'OK';
            case 2: return 'Slow';
            case 3: return 'Beta';
            default: return 'Unknown';
        }
    };

    // Stremio add-on functions
    const loadStremioAddons = () => {
        const addons = stremioService.getInstalledAddons();
        setStremioAddons(addons);
    };

    const handleAddStremioAddon = async () => {
        if (!newStremioUrl.trim()) {
            setError('Please enter a Stremio add-on URL');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await stremioService.installAddon(newStremioUrl.trim());
            setNewStremioUrl('');
            loadStremioAddons();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add Stremio add-on');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveStremioAddon = async (id: string) => {
        try {
            await stremioService.removeAddon(id);
            loadStremioAddons();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove Stremio add-on');
        }
    };

    return (
        <div className="plugins-page">
            <h1>Extensions</h1>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="tabs-container">
                <button
                    className={`tab-button ${activeTab === 'cloudstream' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cloudstream')}
                >
                    Cloudstream Repositories
                </button>
                <button
                    className={`tab-button ${activeTab === 'stremio' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stremio')}
                >
                    Stremio Add-ons
                </button>
            </div>

            {activeTab === 'cloudstream' && (
                <>
            {/* Add Repository Section */}
            <section className="add-repository-section">
                <h2>Add Repository</h2>
                <div className="add-repo-form">
                    <input
                        type="text"
                        placeholder="Repository URL (e.g., https://raw.githubusercontent.com/self-similarity/MegaRepo/builds/repo.json)"
                        value={newRepoUrl}
                        onChange={(e) => setNewRepoUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddRepository();
                            }
                        }}
                        className="repo-url-input"
                        autoComplete="off"
                        disabled={loading}
                    />
                    <input
                        type="text"
                        placeholder="Repository Name (optional)"
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddRepository();
                            }
                        }}
                        className="repo-name-input"
                        autoComplete="off"
                        disabled={loading}
                    />
                    <button onClick={handleAddRepository} className="add-repo-button">
                        Add Repository
                    </button>
                </div>
            </section>

            {/* Repositories List */}
            <section className="repositories-section">
                <h2>Repositories ({repositories.length})</h2>
                {repositories.length === 0 ? (
                    <p className="empty-state">No repositories added. Add a repository to browse plugins.</p>
                ) : (
                    <div className="repositories-list">
                        {repositories.map((repo) => (
                            <div key={repo.url} className="repository-item">
                                <div className="repo-info">
                                    <h3>{repo.name}</h3>
                                    <p className="repo-url">{repo.url}</p>
                                </div>
                                <button
                                    onClick={() => handleRemoveRepository(repo.url)}
                                    className="remove-repo-button"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Plugins List */}
            <section className="plugins-section">
                <h2>Available Extensions ({plugins.length})</h2>
                {loading ? (
                    <p>Loading extensions...</p>
                ) : plugins.length === 0 ? (
                    <p className="empty-state">No extensions found. Add a repository to see extensions.</p>
                ) : (
                    <div className="plugins-list">
                        {plugins.map(({ plugin, repositoryUrl }) => {
                            const installed = isPluginInstalled(plugin.internalName);
                            const isLoading = isPluginLoading(plugin, repositoryUrl);
                            
                            return (
                                <div key={`${plugin.internalName}_${repositoryUrl}`} className="plugin-item">
                                    <div className="plugin-info">
                                        <h3>{plugin.name}</h3>
                                        <p className="plugin-description">{plugin.description || 'No description'}</p>
                                        <div className="plugin-meta">
                                            <span className={`plugin-status status-${plugin.status}`}>
                                                Status: {getPluginStatus(plugin)}
                                            </span>
                                            <span className="plugin-version">v{plugin.version}</span>
                                            {plugin.language && (
                                                <span className="plugin-language">{plugin.language}</span>
                                            )}
                                            {plugin.authors.length > 0 && (
                                                <span className="plugin-authors">
                                                    by {plugin.authors.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="plugin-actions">
                                        {installed ? (
                                            <button
                                                onClick={() => handleUninstallPlugin(plugin.internalName)}
                                                className="uninstall-button"
                                            >
                                                Uninstall
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleInstallPlugin(plugin, repositoryUrl)}
                                                disabled={isLoading || plugin.status === 0}
                                                className="install-button"
                                            >
                                                {isLoading ? 'Installing...' : 'Install'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Installed Plugins */}
            <section className="installed-plugins-section">
                <h2>Installed Extensions ({installedPlugins.filter(p => p.enabled).length})</h2>
                {installedPlugins.filter(p => p.enabled).length === 0 ? (
                    <p className="empty-state">No extensions installed.</p>
                ) : (
                    <div className="installed-plugins-list">
                        {installedPlugins.filter(p => p.enabled).map((plugin) => (
                            <div key={plugin.internalName} className="installed-plugin-item">
                                <div className="plugin-info">
                                    <h3>{plugin.internalName}</h3>
                                    <p className="plugin-version">v{plugin.version}</p>
                                </div>
                                <button
                                    onClick={() => handleUninstallPlugin(plugin.internalName)}
                                    className="uninstall-button"
                                >
                                    Uninstall
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
                </>
            )}

            {activeTab === 'stremio' && (
                <>
            {/* Add Stremio Add-on Section */}
            <section className="add-repository-section">
                <h2>Add Stremio Add-on</h2>
                <div className="add-repo-form">
                    <input
                        type="text"
                        placeholder="Stremio Add-on URL (e.g., https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/bmZ4LGRucCxhbXAsYXRwLGhibTo6OjE3NjcwMzAwNTc1OTQ%3D/manifest.json)"
                        value={newStremioUrl}
                        onChange={(e) => setNewStremioUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddStremioAddon();
                            }
                        }}
                        className="repo-url-input"
                        autoComplete="off"
                        disabled={loading}
                        style={{ flex: '1 1 100%' }}
                    />
                    <button onClick={handleAddStremioAddon} className="add-repo-button" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Add-on'}
                    </button>
                </div>
                <p style={{ marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                    Stremio add-ons are HTTP APIs that provide content. They don't require code execution.
                </p>
            </section>

            {/* Installed Stremio Add-ons */}
            <section className="repositories-section">
                <h2>Installed Stremio Add-ons ({stremioAddons.length})</h2>
                {stremioAddons.length === 0 ? (
                    <p className="empty-state">No Stremio add-ons installed. Add one using the form above.</p>
                ) : (
                    <div className="repositories-list">
                        {stremioAddons.map((addon) => (
                            <div key={addon.id} className="repository-item">
                                <div className="repo-info">
                                    <h3>{addon.name}</h3>
                                    <p className="repo-url">{addon.originalUrl || addon.url || addon.id}</p>
                                    {addon.description && (
                                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                            {addon.description}
                                        </p>
                                    )}
                                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {addon.types && addon.types.length > 0 && (
                                            <span style={{ 
                                                background: 'rgba(102, 126, 234, 0.2)', 
                                                padding: '0.25rem 0.5rem', 
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}>
                                                Types: {addon.types.join(', ')}
                                            </span>
                                        )}
                                        {addon.catalogs && addon.catalogs.length > 0 && (
                                            <span style={{ 
                                                background: 'rgba(102, 126, 234, 0.2)', 
                                                padding: '0.25rem 0.5rem', 
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}>
                                                {addon.catalogs.length} Catalog{addon.catalogs.length !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {addon.resources && addon.resources.length > 0 && (
                                            <span style={{ 
                                                background: 'rgba(102, 126, 234, 0.2)', 
                                                padding: '0.25rem 0.5rem', 
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}>
                                                {addon.resources.length} Resource{addon.resources.length !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveStremioAddon(addon.id)}
                                    className="remove-repo-button"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
                </>
            )}
        </div>
    );
}

