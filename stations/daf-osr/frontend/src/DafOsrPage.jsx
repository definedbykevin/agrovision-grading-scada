import { useState, useEffect } from 'react'
import './DafOsrPage.css'
import OverviewTab from './tabs/Overview/OverviewTab.jsx'
import TrendTab from './tabs/Trend/TrendTab.jsx'
import DafOsrSettingsPage from './settings/DafOsrSettingsPage.jsx'

const DAF_OSR_TABS = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'trend', label: 'TRENDS' },
];

function DafOsrPage({ user, onSelectSubmenu, configMode: propConfigMode = false }) {
    const [viewMode, setViewMode] = useState('process'); // 'process' | 'maintenance' | 'settings'
    const [activeTab, setActiveTab] = useState('overview');

    // Cek role developer: mapping tag hanya bisa diakses akun developer via Ctrl+X
    const isDev = user?.userRole?.toLowerCase() === 'developer' || user?.role?.toLowerCase() === 'developer';
    const [localConfigMode, setLocalConfigMode] = useState(false);

    useEffect(() => {
        if (!isDev) return;
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                setLocalConfigMode((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDev]);

    const effectiveConfigMode = isDev && (propConfigMode || localConfigMode);

    return (
        <div className="som-daf-page">
            <header className="som-daf-header">
                <div className="som-daf-header-left">
                    <div className="som-daf-title-wrapper">
                        <h1 className="som-daf-title">DAF / OSR STATION</h1>
                    </div>

                    {/* Kapsul Tab Proses (Hanya muncul saat di penanda buku PROCESS VIEW) */}
                    {viewMode === 'process' && (
                        <div className="som-station-tabs">
                            {DAF_OSR_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`som-station-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sisi Kanan: 3 Penanda Buku Utama (PROCESS VIEW, MAINTENANCE VIEW, SETTINGS) */}
                <div className="som-view-toggle-container">
                    <button
                        className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`}
                        onClick={() => setViewMode('process')}
                    >
                        PROCESS VIEW
                    </button>

                    <button
                        className="som-view-btn"
                        disabled
                        title="Maintenance mode is locked"
                        style={{
                            cursor: 'not-allowed',
                            opacity: 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}
                    >
                        MAINTENANCE VIEW
                        <svg
                            width="10"
                            height="12"
                            viewBox="0 0 448 512"
                            fill="currentColor"
                        >
                            <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
                        </svg>
                    </button>

                    <button
                        className={`som-view-btn ${viewMode === 'settings' ? 'active' : ''}`}
                        onClick={() => setViewMode('settings')}
                    >
                        ⚙️ SETTINGS
                    </button>
                </div>
            </header>

            <div className="som-daf-body-container">
                {/* 1. LEMBAR PROCESS VIEW */}
                {viewMode === 'process' && activeTab === 'overview' && (
                    <OverviewTab
                        user={user}
                        configMode={effectiveConfigMode}
                        onNavigateSettings={() => setViewMode('settings')}
                    />
                )}
                {viewMode === 'process' && activeTab === 'trend' && (
                    <TrendTab
                        user={user}
                        configMode={effectiveConfigMode}
                        onNavigateSettings={() => setViewMode('settings')}
                    />
                )}

                {/* 2. LEMBAR SETTINGS */}
                {viewMode === 'settings' && (
                    <DafOsrSettingsPage
                        user={user}
                        configMode={effectiveConfigMode}
                        onBack={() => setViewMode('process')}
                    />
                )}
            </div>
        </div>
    );
}

export default DafOsrPage
