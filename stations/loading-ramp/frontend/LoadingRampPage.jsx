import { useState, useEffect } from 'react'
import './LoadingRampPage.css'

const RAMP_BAYS = Array.from({ length: 15 }, (_, i) => {
    const isNew = i >= 12;
    return {
        id: i + 1,
        status: isNew ? 'EMPTY' : (Math.random() > 0.4 ? 'OCCUPIED' : 'EMPTY'),
        truck: isNew ? null : (Math.random() > 0.4 ? `BK ${Math.floor(1000 + Math.random() * 8000)} XX` : null),
        tonnage: isNew ? null : Math.floor(5 + Math.random() * 20),
        doorStatus: isNew ? 'CLOSED' : (Math.random() > 0.7 ? 'OPEN' : 'CLOSED')
    };
})

function LoadingRampPage() {
    const [bays, setBays] = useState(RAMP_BAYS)
    const [totalReception, setTotalReception] = useState(842.15)

    // Simulate minor data changes
    useEffect(() => {
        const interval = setInterval(() => {
            setTotalReception(prev => prev + 0.01)
        }, 5000)
        return () => clearInterval(interval)
    }, [])

    const getStatusColor = (status) => {
        switch (status) {
            case 'OCCUPIED': return '#ffdb3b';
            case 'EMPTY': return '#e2e8f0';
            case 'PROCESSING': return '#d4ac0d';
            default: return '#e2e8f0';
        }
    }

    return (
        <div className="som-loading-ramp-page">
            <header className="som-ramp-header">
                <div className="som-header-left">
                    <h1 className="som-ramp-title">LOADING RAMP STATION</h1>
                    <div className="som-ramp-count">ACTIVE BAYS: {bays.filter(b => b.status === 'OCCUPIED').length} / {bays.length}</div>
                </div>
                <div className="som-ramp-summary">
                    <div className="ramp-stat-box highlight">
                        <span className="label">FFB RECEIVED TODAY</span>
                        <span className="value">{totalReception.toFixed(2)} <small>TONS</small></span>
                    </div>
                </div>
            </header>

            <main className="som-ramp-grid-container">
                <div className="som-bays-layout">
                    {bays.map(bay => (
                        <div key={bay.id} className={`som-bay-card ${bay.status.toLowerCase()}`}>
                            <div className="bay-number">BAY {bay.id.toString().padStart(2, '0')}</div>
                            <div className="bay-visual">
                                {bay.status === 'OCCUPIED' ? (
                                    <div className="truck-icon">
                                        <svg viewBox="0 0 24 24" width="48" height="48" fill="#0f172a">
                                            <path d="M20 8h-3V4H3a2 2 0 0 0-2 2v11h2a3 3 0 0 0 6 0h4a3 3 0 0 0 6 0h2v-5l-3-4zM6 18.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path>
                                        </svg>
                                        <span className="plate-num">{bay.truck}</span>
                                    </div>
                                ) : (
                                    <div className="empty-slot">READY</div>
                                )}
                            </div>
                            <div className="bay-details">
                                <div className="detail-line">
                                    <span>DOOR:</span>
                                    <span className={`door-val ${bay.doorStatus.toLowerCase()}`}>{bay.doorStatus}</span>
                                </div>
                                <div className="detail-line">
                                    <span>EST. LOAD:</span>
                                    <span>{bay.status === 'OCCUPIED' ? `${bay.tonnage}T` : '-'}</span>
                                </div>
                            </div>
                            <div className="bay-status-bar" style={{ background: getStatusColor(bay.status) }}></div>
                        </div>
                    ))}
                </div>

                <aside className="som-ramp-sidebar">
                    <div className="som-ramp-card cctv-card">
                        <div className="card-label">RAMP FEED 01</div>
                        <div className="som-ramp-card-body">
                            <div className="ramp-cctv-view">
                                <div className="cctv-timestamp">{new Date().toLocaleTimeString()}</div>
                                <div className="cctv-noise-overlay"></div>
                            </div>
                        </div>
                    </div>

                    <div className="som-ramp-card summary-card">
                        <div className="card-label">RAMP OPERATION DATA</div>
                        <div className="som-ramp-card-body">
                            <div className="ramp-data-list">
                                <div className="data-item">
                                    <span className="label">Waiting Interval</span>
                                    <span className="value">12 Min Avg</span>
                                </div>
                                <div className="data-item">
                                    <span className="label">Hourly Thruput</span>
                                    <span className="value">42.5 Tons/H</span>
                                </div>
                                <div className="data-item">
                                    <span className="label">Max Capacity</span>
                                    <span className="value">1,500 Tons</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="som-ramp-card hydraulic-status">
                        <div className="card-label">HYDRAULIC STATION</div>
                        <div className="som-ramp-card-body">
                            <div className="hyd-status-row">
                                <span className="label">Main Pressure</span>
                                <span className="value val-green">120 Bar</span>
                            </div>
                            <div className="hyd-status-row">
                                <span className="label">Pump Status</span>
                                <span className="value val-green">ACTIVE</span>
                            </div>
                            <div className="hyd-status-row">
                                <span className="label">Oil Temp</span>
                                <span className="value val-orange">54°C</span>
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: '65%' }}></div>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    )
}

export default LoadingRampPage
