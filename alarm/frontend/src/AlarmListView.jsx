import { useState, useEffect, useRef, useCallback } from 'react'
import { FiBell, FiCheck, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi'
import './AlarmPage.css'

/* ─────────────────────────── CONSTANTS ─────────────────────────── */
const ALARM_CATEGORIES = {
    'System Error': {
        color: '#ef4444',
        borderColor: '#ef4444',
        description: 'Critical system failures and software exceptions',
        svgIcon: (
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6" y2="6" /><line x1="6" y1="18" x2="6" y2="18" />
            </svg>
        ),
    },
    'Internet Error': {
        color: '#f97316',
        borderColor: '#f97316',
        description: 'Network connectivity and communication failures',
        svgIcon: (
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
        ),
    },
    'Instrument Error': {
        color: '#eab308',
        borderColor: '#eab308',
        description: 'Sensor malfunctions and calibration deviations',
        svgIcon: (
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
        ),
    },
    'Power Error': {
        color: '#a855f7',
        borderColor: '#a855f7',
        description: 'Electrical supply and power grid disturbances',
        svgIcon: (
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="6" width="18" height="12" rx="2" ry="2" /><line x1="23" y1="13" x2="23" y2="11" /><line x1="5" y1="10" x2="5" y2="14" /><line x1="9" y1="10" x2="9" y2="14" />
            </svg>
        ),
    },
    'Breakdown': {
        color: '#64748b',
        borderColor: '#64748b',
        description: 'Equipment failures and mechanical breakdowns',
        svgIcon: (
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        ),
    },
    'Process Disturbance': {
        color: '#06b6d4',
        borderColor: '#06b6d4',
        description: 'Process parameter deviations and flow anomalies',
        svgIcon: (
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
        ),
    },
}

const SEVERITY_CONFIG = {
    Critical: { color: '#ef4444', bg: '#ef444420', label: 'CRITICAL', pulse: true },
    Warning: { color: '#f59e0b', bg: '#f59e0b20', label: 'WARNING', pulse: false },
    Info: { color: '#3b82f6', bg: '#3b82f620', label: 'INFO', pulse: false },
}

const STATUS_CONFIG = {
    Active: { color: '#ef4444', label: 'ACTIVE' },
    Acknowledged: { color: '#f59e0b', label: 'ACK\'D' },
    Resolved: { color: '#22c55e', label: 'RESOLVED' },
}

/* ─────────────────────────── COMPONENTS ─────────────────────────── */

function PulsingDot({ active }) {
    return (
        <span className={`alm-pulse-dot ${active ? 'alm-pulse-dot--active' : ''}`} />
    )
}

function LiveTicker({ alarms }) {
    const tickerRef = useRef(null)
    const activeAlarms = alarms.filter(a => a.severity === 'Critical' && a.status === 'Active')

    useEffect(() => {
        const el = tickerRef.current
        if (!el || activeAlarms.length === 0) return
        let pos = el.scrollWidth
        let raf
        const animate = () => {
            pos -= 0.6
            if (pos < -el.scrollWidth / 2) pos = 0
            el.style.transform = `translateX(${pos}px)`
            raf = requestAnimationFrame(animate)
        }
        raf = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(raf)
    }, [activeAlarms.length])

    if (activeAlarms.length === 0) return null

    return (
        <div className="alm-ticker-bar" role="marquee" aria-label="Live alarm ticker">
            <span className="alm-ticker-label">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                LIVE ALARMS
            </span>
            <div className="alm-ticker-track">
                <div className="alm-ticker-content" ref={tickerRef}>
                    {[...activeAlarms, ...activeAlarms].map((a, i) => (
                        <span key={`${a.id}-${i}`} className="alm-ticker-item">
                            <span className="alm-ticker-code">{a.code}</span>
                            {a.station} — {a.description}
                            <span className="alm-ticker-separator">◆</span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */
function AlarmListView({ category, user }) {
    const [allAlarms, setAllAlarms] = useState({})
    const [filters, setFilters] = useState({ search: '', status: 'All', severity: 'All', timeRange: '24h' })
    const [loading, setLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(null)
    const [notification, setNotification] = useState(null)
    const [activeTab, setActiveTab] = useState(null)
    const notifTimerRef = useRef(null)

    // Initialize with activeTab = category when prop changes
    useEffect(() => {
        setActiveTab(category || null)
    }, [category])

    const showNotif = useCallback((msg, type = 'success') => {
        clearTimeout(notifTimerRef.current)
        setNotification({ msg, type })
        notifTimerRef.current = setTimeout(() => setNotification(null), 3500)
    }, [])

    const loadAlarms = useCallback(() => {
        setLoading(true)
        fetch('/api/alarm', { credentials: 'include' })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    const data = {}
                    Object.keys(ALARM_CATEGORIES).forEach(cat => {
                        data[cat] = res.data[cat] || []
                    })
                    setAllAlarms(data)
                } else {
                    showNotif('Failed to load alarms: ' + res.error, 'error')
                }
            })
            .catch(err => {
                showNotif('Network error loading alarms: ' + err.message, 'error')
            })
            .finally(() => {
                setLastRefresh(new Date())
                setLoading(false)
            })
    }, [showNotif])

    useEffect(() => {
        loadAlarms()
        // Poll every 15 seconds
        const interval = setInterval(loadAlarms, 15000)
        return () => clearInterval(interval)
    }, [loadAlarms])

    const handleAcknowledge = useCallback((id) => {
        fetch('/api/alarm/ack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
            credentials: 'include'
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                showNotif('✅ Alarm acknowledged successfully', 'success')
                loadAlarms()
            } else {
                showNotif('Failed to acknowledge: ' + res.error, 'error')
            }
        })
        .catch(err => {
            showNotif('Network error acknowledging alarm', 'error')
        })
    }, [loadAlarms, showNotif])

    const handleResolve = useCallback((id) => {
        fetch('/api/alarm/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
            credentials: 'include'
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                showNotif('🟢 Alarm resolved and cleared', 'success')
                loadAlarms()
            } else {
                showNotif('Failed to resolve: ' + res.error, 'error')
            }
        })
        .catch(err => {
            showNotif('Network error resolving alarm', 'error')
        })
    }, [loadAlarms, showNotif])

    const handleAckAll = () => {
        fetch('/api/alarm/ack-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: activeTab }),
            credentials: 'include'
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                showNotif('✅ All visible active alarms acknowledged', 'success')
                loadAlarms()
            } else {
                showNotif('Failed to acknowledge all: ' + res.error, 'error')
            }
        })
        .catch(err => {
            showNotif('Network error acknowledging all', 'error')
        })
    }

    // Flatten all alarms for global view or filter by activeTab
    const currentAlarms = activeTab
        ? (allAlarms[activeTab] || [])
        : Object.values(allAlarms).flat()

    const allFlat = Object.values(allAlarms).flat()

    const filtered = currentAlarms.filter(a => {
        if (filters.status !== 'All' && a.status !== filters.status) return false
        if (filters.severity !== 'All' && a.severity !== filters.severity) return false
        const now = Date.now()
        const ts = new Date(a.timestamp).getTime()
        if (filters.timeRange === '1h' && now - ts > 3600000) return false
        if (filters.timeRange === '8h' && now - ts > 28800000) return false
        if (filters.timeRange === '24h' && now - ts > 86400000) return false
        if (filters.search) {
            const q = filters.search.toLowerCase()
            if (!a.description.toLowerCase().includes(q) &&
                !a.station.toLowerCase().includes(q) &&
                !a.code.toLowerCase().includes(q) &&
                !a.category.toLowerCase().includes(q)) return false
        }
        return true
    })

    const sortedFiltered = [...filtered].sort((a, b) => {
        const sevOrder = { Critical: 0, Warning: 1, Info: 2 }
        const statOrder = { Active: 0, Acknowledged: 1, Resolved: 2 }
        if (statOrder[a.status] !== statOrder[b.status]) return statOrder[a.status] - statOrder[b.status]
        if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity]
        return new Date(b.timestamp) - new Date(a.timestamp)
    })

    return (
        <div className="alm-page">
            {/* Notification Toast */}
            {notification && (
                <div className={`alm-toast alm-toast--${notification.type}`}>
                    {notification.msg}
                </div>
            )}

            {/* Header */}
            <div className="alm-page-header">
                <div className="alm-header-left">
                    <div className="alm-header-icon">
                        <FiBell />
                    </div>
                    <div>
                        <h2 className="alm-page-title">Alarm Management Center</h2>
                        <p className="alm-page-sub">
                            Real-time fault monitoring across all plant stations
                            {lastRefresh && <span className="alm-last-refresh"> · Updated {lastRefresh.toLocaleTimeString('en-GB')}</span>}
                        </p>
                    </div>
                </div>
                <div className="alm-header-actions">
                    <button id="alm-ack-all" className="alm-btn-header alm-btn-header--ack" onClick={handleAckAll}>
                        <FiCheck /> Acknowledge All Active
                    </button>
                    <button id="alm-refresh" className="alm-btn-header alm-btn-header--refresh" onClick={loadAlarms} disabled={loading}>
                        <FiRefreshCw className={loading ? 'alm-spin' : ''} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Live Ticker */}
            <LiveTicker alarms={allFlat} />

            {/* Stat Grid */}
            <div className="alm-stat-grid">
                {Object.keys(ALARM_CATEGORIES).slice(0, 3).map(cat => {
                    const cfg = ALARM_CATEGORIES[cat]
                    const catAlarms = allAlarms[cat] || []
                    const active = catAlarms.filter(a => a.status === 'Active').length
                    return (
                        <div key={cat} className="alm-stat-card" style={{ '--cat-color': cfg.color }}>
                            {active > 0 && <div className="alm-alert-glow" style={{ '--cat-color': cfg.color }} />}
                            <div className="alm-stat-card-top">
                                <div className="alm-stat-icon-box" style={{ '--cat-color': cfg.color }}>{cfg.svgIcon}</div>
                                {active > 0 && <span className="alm-pulse-dot alm-pulse-dot--active"></span>}
                            </div>
                            <div>
                                <div className="alm-stat-number">{active}</div>
                                <div className="alm-stat-info">
                                    <span className="alm-stat-label">{cat.toUpperCase()}</span>
                                    <span className="alm-stat-sub">Active fault nodes detected</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Filters & Tabs Row */}
            <div className="alm-controls-row">
                <div className="alm-tabs-container">
                    <button
                        className={`alm-tab ${activeTab === null ? 'alm-tab--active' : ''}`}
                        onClick={() => setActiveTab(null)}
                    >
                        ALL CATEGORIES <span className="alm-tab-count">{allFlat.filter(a => a.status === 'Active').length}</span>
                    </button>
                    {Object.keys(ALARM_CATEGORIES).map(cat => {
                        const activeCount = (allAlarms[cat] || []).filter(a => a.status === 'Active').length
                        return (
                            <button
                                key={cat}
                                className={`alm-tab ${activeTab === cat ? 'alm-tab--active' : ''}`}
                                onClick={() => setActiveTab(cat)}
                            >
                                {cat.toUpperCase()}
                                {activeCount > 0 && <span className="alm-tab-count">{activeCount}</span>}
                            </button>
                        )
                    })}
                </div>

                <div className="alm-filter-search">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        type="text"
                        className="alm-search-input"
                        placeholder="Search anomalies..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="alm-chip-group">
                    {['All', 'Active', 'Acknowledged'].map(s => (
                        <button
                            key={s}
                            className={`alm-chip ${filters.status === s ? 'alm-chip--active' : ''}`}
                            onClick={() => setFilters({ ...filters, status: s })}
                        >
                            {s.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Section */}
            <div className="alm-summary-strip">
                <div className="alm-sum-item">
                    <span className="alm-sum-val" style={{ color: 'var(--alm-text-pri)' }}>{allFlat.length}</span>
                    <span className="alm-sum-lbl">Total Records</span>
                </div>
                <div className="alm-sum-item">
                    <span className="alm-sum-val" style={{ color: '#ff4d4f' }}>{allFlat.filter(a => a.status === 'Active').length}</span>
                    <span className="alm-sum-lbl">Active Now</span>
                </div>
                <div className="alm-sum-item">
                    <span className="alm-sum-val" style={{ color: '#ffa940' }}>{allFlat.filter(a => a.status === 'Acknowledged').length}</span>
                    <span className="alm-sum-lbl">In Progress</span>
                </div>
                <div className="alm-sum-item">
                    <span className="alm-sum-val" style={{ color: 'var(--alm-accent)' }}>{allFlat.filter(a => a.severity === 'Critical' && a.status === 'Active').length}</span>
                    <span className="alm-sum-lbl">Critical Faults</span>
                </div>
            </div>

            {/* Alarm List Container */}
            <div className="alm-table-container">
                <div className="alm-table-head">
                    <span>Alarm Code</span>
                    <span>Timestamp</span>
                    <span>Severity</span>
                    <span>Station Unit</span>
                    <span>Description & Fault Details</span>
                    <span>Current Status</span>
                    <span style={{ textAlign: 'right' }}>Actions</span>
                </div>

                {loading && Object.keys(allAlarms).length === 0 ? (
                    <div className="alm-loading">
                        <div className="alm-spinner"></div>
                        <p>Scanning System Faults...</p>
                    </div>
                ) : sortedFiltered.length === 0 ? (
                    <div className="alm-empty" style={{ background: 'var(--alm-card-bg)', borderRadius: '20px', border: '1px solid var(--alm-border)' }}>
                        <p>No active anomalies detected in current segment.</p>
                    </div>
                ) : (
                    sortedFiltered.map(alarm => {
                        const cfg = ALARM_CATEGORIES[alarm.category]
                        return (
                            <div
                                key={alarm.id}
                                className="alm-row-card"
                                style={{ '--cat-color': cfg?.color }}
                            >
                                <div className="alm-cell-code">{alarm.code}</div>
                                <div className="alm-cell-time">
                                    {new Date(alarm.timestamp).toLocaleTimeString('en-GB')}
                                    <small>{new Date(alarm.timestamp).toLocaleDateString('en-GB')}</small>
                                </div>
                                <div>
                                    <span className={`alm-severity-pill alm-sev-${alarm.severity.toLowerCase()}`}>
                                        {alarm.severity}
                                    </span>
                                </div>
                                <div className="alm-station-box" style={{ color: cfg?.color }}>
                                    {cfg?.svgIcon}
                                    <span>{alarm.station.toUpperCase()}</span>
                                </div>
                                <div className="alm-cell-desc">{alarm.description}</div>
                                <div>
                                    <span className={`alm-status-tag alm-status-${alarm.status.toLowerCase().replace(/['\s]/g, '')}`}>
                                        {alarm.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="alm-row-actions">
                                    {alarm.status === 'Active' && (
                                        <button className="alm-action-btn" onClick={(e) => { e.stopPropagation(); handleAcknowledge(alarm.id); }} title="Acknowledge">
                                            <FiCheck />
                                        </button>
                                    )}
                                    {alarm.status === 'Acknowledged' && (
                                        <button className="alm-action-btn" onClick={(e) => { e.stopPropagation(); handleResolve(alarm.id); }} title="Resolve">
                                            <FiCheck style={{ color: '#22c55e' }} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {!loading && sortedFiltered.length > 0 && (
                <div className="alm-table-footer" style={{ background: 'transparent', padding: '0 8px' }}>
                    Monitoring <strong>{allFlat.length}</strong> system nodes.
                    Current view: <strong>{sortedFiltered.length}</strong> active alerts.
                </div>
            )}
        </div>
    )
}

export default AlarmListView
