import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export const Layout: React.FC = () => {
    const location = useLocation();
    
    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f5' }}>
            <nav style={{
                padding: '0 2rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                gap: '2rem',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                <Link
                    to="/"
                    style={{
                        color: isActive('/') ? '#fff' : 'rgba(255,255,255,0.8)',
                        textDecoration: 'none',
                        padding: '1rem 0',
                        borderBottom: isActive('/') ? '2px solid white' : '2px solid transparent',
                        fontWeight: isActive('/') ? '600' : '400',
                        transition: 'all 0.2s',
                    }}
                >
                    Home
                </Link>
                <Link
                    to="/search"
                    style={{
                        color: isActive('/search') ? '#fff' : 'rgba(255,255,255,0.8)',
                        textDecoration: 'none',
                        padding: '1rem 0',
                        borderBottom: isActive('/search') ? '2px solid white' : '2px solid transparent',
                        fontWeight: isActive('/search') ? '600' : '400',
                        transition: 'all 0.2s',
                    }}
                >
                    Search
                </Link>
                <Link
                    to="/plugins"
                    style={{
                        color: isActive('/plugins') ? '#fff' : 'rgba(255,255,255,0.8)',
                        textDecoration: 'none',
                        padding: '1rem 0',
                        borderBottom: isActive('/plugins') ? '2px solid white' : '2px solid transparent',
                        fontWeight: isActive('/plugins') ? '600' : '400',
                        transition: 'all 0.2s',
                    }}
                >
                    Extensions
                </Link>
                <div style={{ flexGrow: 1 }}></div>
                <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>CloudStream Desktop</span>
            </nav>
            <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#242424' }}>
                <Outlet />
            </main>
        </div>
    );
};
