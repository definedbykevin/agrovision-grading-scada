import { useState, useEffect, useRef, useCallback } from 'react'
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

/* ─────────────────────────── MOCK DATA GENERATOR ─────────────────────────── */
let alarmIdCounter = 1000

const ALARM_TEMPLATES = {
    'System Error': [
        { desc: 'PLC communication timeout — Unit 3 controller unresponsive', severity: 'Critical', station: 'Control Room' },
        { desc: 'HMI watchdog timer expired — SCADA process restart required', severity: 'Critical', station: 'Control Room' },
        { desc: 'Database sync failure — historian data gap detected (15 min)', severity: 'Warning', station: 'Server Room' },
        { desc: 'Redundant CPU switchover executed — primary module fault', severity: 'Critical', station: 'MCC Panel A' },
        { desc: 'OPC-UA server connection lost — tag update suspended', severity: 'Warning', station: 'SCADA Node 2' },
        { desc: 'Memory utilization exceeded 92% — process optimization needed', severity: 'Warning', station: 'Control Server' },
        { desc: 'Firmware checksum mismatch — Field Device FD-204', severity: 'Info', station: 'Press Station' },
    ],
    'Internet Error': [
        { desc: 'WAN uplink packet loss 34% — primary ISP degraded', severity: 'Critical', station: 'Network Hub' },
        { desc: 'VPN tunnel disconnected — remote monitoring offline', severity: 'Critical', station: 'Gateway' },
        { desc: 'DNS resolution failure — cloud dashboard unreachable', severity: 'Warning', station: 'Network Hub' },
        { desc: 'Firewall connection table overflow — traffic shaping active', severity: 'Warning', station: 'Firewall' },
        { desc: 'RTU uplink latency >800ms — telemetry delay threshold exceeded', severity: 'Warning', station: 'RTU Station' },
        { desc: 'Switch port flapping — VLAN 10 instability detected', severity: 'Info', station: 'Switch Rack B' },
    ],
    'Instrument Error': [
        { desc: 'PT-201 pressure transmitter signal out of range (0.2 mA)', severity: 'Critical', station: 'Press Station' },
        { desc: 'FT-105 flow sensor stuck-at-zero — check impulse lines', severity: 'Critical', station: 'Loading Ramp' },
        { desc: 'TT-318 thermocouple broken wire — temperature reading invalid', severity: 'Critical', station: 'Sterilizer' },
        { desc: 'LT-420 level transmitter drift detected — offset +12%', severity: 'Warning', station: 'Oil Tank' },
        { desc: 'WT-102 load cell calibration due — reading deviation ±1.5%', severity: 'Warning', station: 'Weighbridge' },
        { desc: 'pH-sensor electrode aging — moisture absorption suspected', severity: 'Warning', station: 'DAF / OSR' },
        { desc: 'Vibration sensor VT-07 battery low — replace within 48h', severity: 'Info', station: 'Engine Room' },
    ],
    'Power Error': [
        { desc: 'Main incomer voltage dip to 356V — UPS engaged', severity: 'Critical', station: 'MCC Room' },
        { desc: 'Generator auto-start failed — manual intervention required', severity: 'Critical', station: 'Engine Room' },
        { desc: 'Phase C current imbalance 18% — transformer loading check needed', severity: 'Warning', station: 'Substation' },
        { desc: 'UPS battery backup reduced to 8 min — charging fault', severity: 'Critical', station: 'Control Room' },
        { desc: 'Power factor 0.72 — capacitor bank switching required', severity: 'Warning', station: 'Substation' },
        { desc: 'Emergency lighting circuit breaker tripped — Zone 3', severity: 'Warning', station: 'Kernel Plant' },
        { desc: 'Solar panel output 40% below forecast — inverter check', severity: 'Info', station: 'Rooftop PV' },
    ],
    'Breakdown': [
        { desc: 'Screw press #3 seized — emergency stop activated', severity: 'Critical', station: 'Press Station' },
        { desc: 'Thresher drum bearing temperature >95°C — forced shutdown', severity: 'Critical', station: 'Threshing Station' },
        { desc: 'Conveyor belt CV-12 torn — production line halted', severity: 'Critical', station: 'Loading Ramp' },
        { desc: 'Boiler feed pump cavitation — standby pump engaged', severity: 'Warning', station: 'Boiler House' },
        { desc: 'Decanter scroll worn — vibration >12 mm/s RMS', severity: 'Warning', station: 'Oil Clarification' },
        { desc: 'Air compressor unloader valve leaking — pressure drop', severity: 'Warning', station: 'Engine Room' },
        { desc: 'Vacuum pump seal degradation — efficiency reduced 22%', severity: 'Info', station: 'Digester Station' },
    ],
    'Process Disturbance': [
        { desc: 'CPO FFA level 5.8% — exceeds 5% process specification', severity: 'Critical', station: 'Oil Clarification' },
        { desc: 'Sterilizer pressure cycle deviation — cook time extended 40 min', severity: 'Critical', station: 'Sterilizer' },
        { desc: 'Oil extraction rate dropped to 19.2% — below 20% target', severity: 'Warning', station: 'Press Station' },
        { desc: 'Effluent BOD exceeds discharge limit — ETP hold activated', severity: 'Critical', station: 'ETP' },
        { desc: 'Kernel moisture 8.2% — above 7% quality threshold', severity: 'Warning', station: 'Kernel Plant' },
        { desc: 'Digester temperature 88°C — below 90°C setpoint ±2°C', severity: 'Warning', station: 'Digester Station' },
        { desc: 'Clarifier underflow density variation ±6%', severity: 'Info', station: 'Oil Clarification' },
    ],
}

function generateAlarms(category) {
    const templates = ALARM_TEMPLATES[category] || []
    const now = Date.now()
    return templates.map((t, i) => ({
        id: `${category.replace(/\s/g, '_')}_${alarmIdCounter++}`,
        category,
        description: t.desc,
        severity: t.severity,
        status: i === 0 ? 'Active' : i === 1 ? 'Active' : i === 2 ? 'Acknowledged' : 'Resolved',
        station: t.station,
        timestamp: new Date(now - (i * 7 + Math.random() * 10) * 60000).toISOString(),
        acknowledgedAt: i === 2 ? new Date(now - 5 * 60000).toISOString() : null,
        resolvedAt: i >= 3 ? new Date(now - (i - 2) * 30 * 60000).toISOString() : null,
        acknowledgedBy: i === 2 ? 'operator01' : i >= 3 ? 'supervisor01' : null,
        occurrenceCount: Math.floor(Math.random() * 5) + 1,
        code: `ALM-${String(1000 + i).padStart(4, '0')}`,
    }))
}

/* ─────────────────────────── COMPONENTS ─────────────────────────── */

function PulsingDot({ active }) {
    return (
        <span className={`alm-pulse-dot ${active ? 'alm-pulse-dot--active' : ''}`} />
    )
}

function SeverityBadge({ severity }) {
    const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.Info
    return (
        <span
            className={`alm-severity-badge ${severity === 'Critical' ? 'alm-severity--critical' : severity === 'Warning' ? 'alm-severity--warning' : 'alm-severity--info'}`}
        >
            {cfg.pulse && <PulsingDot active />}
            {cfg.label}
        </span>
    )
}

function StatusBadge({ status }) {
    return (
        <span className={`alm-status-badge alm-status--${status.toLowerCase().replace("'", '')}`}>
            {STATUS_CONFIG[status]?.label || status}
        </span>
    )
}

function StatCard({ category, alarms }) {
    const cfg = ALARM_CATEGORIES[category]
    const active = alarms.filter(a => a.status === 'Active').length
    const critical = alarms.filter(a => a.severity === 'Critical' && a.status === 'Active').length

    return (
        <div
            className={`alm-stat-card ${active > 0 ? 'alm-stat-card--alert' : ''}`}
            style={{ '--cat-color': cfg.color, '--cat-border': cfg.borderColor }}
        >
            <div className="alm-stat-card-top">
                <div className="alm-stat-icon" style={{ color: cfg.color }}>
                    {cfg.svgIcon}
                </div>
                {active > 0 && <PulsingDot active />}
            </div>
            <div className="alm-stat-number" style={{ color: cfg.color }}>{active}</div>
            <div className="alm-stat-label">{category}</div>
            {critical > 0 && (
                <div className="alm-stat-critical-tag">
                    {critical} CRITICAL
                </div>
            )}
        </div>
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

function FilterBar({ filters, onChange }) {
    return (
        <div className="alm-filter-bar">
            <div className="alm-filter-search">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    id="alm-search"
                    type="text"
                    placeholder="Search alarms, stations, codes..."
                    value={filters.search}
                    onChange={e => onChange({ ...filters, search: e.target.value })}
                    className="alm-search-input"
                />
                {filters.search && (
                    <button className="alm-search-clear" onClick={() => onChange({ ...filters, search: '' })} title="Clear search">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                )}
            </div>

            <div className="alm-filter-chips">
                {['All', 'Active', 'Acknowledged', 'Resolved'].map(s => (
                    <button
                        key={s}
                        id={`alm-filter-status-${s.toLowerCase()}`}
                        className={`alm-chip ${filters.status === s ? 'alm-chip--active' : ''}`}
                        onClick={() => onChange({ ...filters, status: s })}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="alm-filter-chips">
                {['All', 'Critical', 'Warning', 'Info'].map(sv => (
                    <button
                        key={sv}
                        id={`alm-filter-sev-${sv.toLowerCase()}`}
                        className={`alm-chip alm-chip--sev ${filters.severity === sv ? 'alm-chip--active' : ''} ${sv !== 'All' ? `alm-chip--sev-${sv.toLowerCase()}` : ''}`}
                        onClick={() => onChange({ ...filters, severity: sv })}
                    >
                        {sv}
                    </button>
                ))}
            </div>

            <select
                id="alm-filter-time"
                className="alm-select"
                value={filters.timeRange}
                onChange={e => onChange({ ...filters, timeRange: e.target.value })}
            >
                <option value="24h">Last 24 Hours</option>
                <option value="8h">Last 8 Hours</option>
                <option value="1h">Last 1 Hour</option>
                <option value="all">All Time</option>
            </select>
        </div>
    )
}

function AlarmRow({ alarm, onAcknowledge, onResolve, onDetails }) {
    const [expanded, setExpanded] = useState(false)
    const cfg = ALARM_CATEGORIES[alarm.category]

    const formatTime = (iso) => {
        if (!iso) return '—'
        const d = new Date(iso)
        const now = new Date()
        const diffMs = now - d
        const diffMin = Math.floor(diffMs / 60000)
        if (diffMin < 1) return 'Just now'
        if (diffMin < 60) return `${diffMin}m ago`
        const diffH = Math.floor(diffMin / 60)
        if (diffH < 24) return `${diffH}h ${diffMin % 60}m ago`
        return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    return (
        <>
            <tr
                className={`alm-row alm-row--${alarm.status.toLowerCase().replace(/['\s]/g, '')} alm-row--sev-${alarm.severity.toLowerCase()}`}
                onClick={() => setExpanded(e => !e)}
                style={{ '--cat-color': cfg?.color, cursor: 'pointer' }}
            >
                <td className="alm-td alm-td-code">
                    <div className="alm-code-block">
                        <span className="alm-code">{alarm.code}</span>
                        {alarm.occurrenceCount > 1 && (
                            <span className="alm-occurrence-badge" title="Occurrences">×{alarm.occurrenceCount}</span>
                        )}
                    </div>
                </td>
                <td className="alm-td alm-td-time">
                    <div className="alm-time-block">
                        <span className="alm-time-rel">{formatTime(alarm.timestamp)}</span>
                        <span className="alm-time-abs">{new Date(alarm.timestamp).toLocaleTimeString('en-GB')}</span>
                    </div>
                </td>
                <td className="alm-td alm-td-sev">
                    <SeverityBadge severity={alarm.severity} />
                </td>
                <td className="alm-td alm-td-station">
                    <span className="alm-station-tag" style={{ borderColor: cfg?.color + '60', color: cfg?.color }}>
                        {cfg?.svgIcon}
                        {alarm.station}
                    </span>
                </td>
                <td className="alm-td alm-td-desc">{alarm.description}</td>
                <td className="alm-td alm-td-status">
                    <StatusBadge status={alarm.status} />
                </td>
                <td className="alm-td alm-td-actions" onClick={e => e.stopPropagation()}>
                    <div className="alm-action-btns">
                        {alarm.status === 'Active' && (
                            <button
                                id={`alm-ack-${alarm.id}`}
                                className="alm-btn alm-btn-ack"
                                title="Acknowledge Alarm"
                                onClick={() => onAcknowledge(alarm.id)}
                            >
                                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                ACK
                            </button>
                        )}
                        {alarm.status === 'Acknowledged' && (
                            <button
                                id={`alm-resolve-${alarm.id}`}
                                className="alm-btn alm-btn-resolve"
                                title="Mark as Resolved"
                                onClick={() => onResolve(alarm.id)}
                            >
                                <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14.5 15 10" />
                                </svg>
                                RESOLVE
                            </button>
                        )}
                        <button
                            className="alm-btn alm-btn-expand"
                            title={expanded ? 'Collapse' : 'Expand details'}
                        >
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr className="alm-row-detail">
                    <td colSpan={7}>
                        <div className="alm-detail-panel" style={{ borderColor: cfg?.color + '40' }}>
                            <div className="alm-detail-grid">
                                <div className="alm-detail-item">
                                    <span className="alm-detail-label">Alarm Code</span>
                                    <span className="alm-detail-value alm-mono">{alarm.code}</span>
                                </div>
                                <div className="alm-detail-item">
                                    <span className="alm-detail-label">Category</span>
                                    <span className="alm-detail-value">{alarm.category}</span>
                                </div>
                                <div className="alm-detail-item">
                                    <span className="alm-detail-label">Station / Unit</span>
                                    <span className="alm-detail-value">{alarm.station}</span>
                                </div>
                                <div className="alm-detail-item">
                                    <span className="alm-detail-label">First Triggered</span>
                                    <span className="alm-detail-value alm-mono">{new Date(alarm.timestamp).toLocaleString('en-GB')}</span>
                                </div>
                                <div className="alm-detail-item">
                                    <span className="alm-detail-label">Occurrences</span>
                                    <span className="alm-detail-value">{alarm.occurrenceCount}×</span>
                                </div>
                                <div className="alm-detail-item">
                                    <span className="alm-detail-label">Acknowledged By</span>
                                    <span className="alm-detail-value">{alarm.acknowledgedBy || '—'}</span>
                                </div>
                                {alarm.acknowledgedAt && (
                                    <div className="alm-detail-item">
                                        <span className="alm-detail-label">Acknowledged At</span>
                                        <span className="alm-detail-value alm-mono">{new Date(alarm.acknowledgedAt).toLocaleString('en-GB')}</span>
                                    </div>
                                )}
                                {alarm.resolvedAt && (
                                    <div className="alm-detail-item">
                                        <span className="alm-detail-label">Resolved At</span>
                                        <span className="alm-detail-value alm-mono">{new Date(alarm.resolvedAt).toLocaleString('en-GB')}</span>
                                    </div>
                                )}
                            </div>
                            <div className="alm-detail-desc-full">
                                <span className="alm-detail-label">Full Description</span>
                                <p className="alm-detail-desc-text">{alarm.description}</p>
                            </div>
                            {alarm.status === 'Active' && (
                                <div className="alm-detail-recommended">
                                    <span className="alm-detail-label">⚡ Recommended Action</span>
                                    <p className="alm-detail-action-text">
                                        Verify field conditions at <strong>{alarm.station}</strong>, consult maintenance manual
                                        for alarm code <strong>{alarm.code}</strong>, and notify shift supervisor if condition persists beyond 15 minutes.
                                    </p>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

function SummaryBar({ alarms }) {
    const total = alarms.length
    const active = alarms.filter(a => a.status === 'Active').length
    const acked = alarms.filter(a => a.status === 'Acknowledged').length
    const resolved = alarms.filter(a => a.status === 'Resolved').length
    const critical = alarms.filter(a => a.severity === 'Critical' && a.status === 'Active').length

    return (
        <div className="alm-summary-bar">
            <div className="alm-summary-item">
                <span className="alm-summary-num alm-summary-num--total">{total}</span>
                <span className="alm-summary-lbl">Total</span>
            </div>
            <div className="alm-summary-divider" />
            <div className="alm-summary-item">
                <span className="alm-summary-num alm-summary-num--active">{active}</span>
                <span className="alm-summary-lbl">Active</span>
            </div>
            <div className="alm-summary-divider" />
            <div className="alm-summary-item">
                <span className="alm-summary-num alm-summary-num--ack">{acked}</span>
                <span className="alm-summary-lbl">Acknowledged</span>
            </div>
            <div className="alm-summary-divider" />
            <div className="alm-summary-item">
                <span className="alm-summary-num alm-summary-num--resolved">{resolved}</span>
                <span className="alm-summary-lbl">Resolved</span>
            </div>
            <div className="alm-summary-divider" />
            <div className="alm-summary-item">
                <span className="alm-summary-num alm-summary-num--critical">{critical}</span>
                <span className="alm-summary-lbl">Critical Active</span>
            </div>
        </div>
    )
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */
function AlarmPage({ category, user }) {
    const [allAlarms, setAllAlarms] = useState({})
    const [filters, setFilters] = useState({ search: '', status: 'All', severity: 'All', timeRange: '24h' })
    const [loading, setLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(null)
    const [notification, setNotification] = useState(null)
    const [activeTab, setActiveTab] = useState(null)
    const notifTimerRef = useRef(null)

    // Initialize with activeTab = category when prop changes
    useEffect(() => {
        setActiveTab(category)
    }, [category])

    const showNotif = useCallback((msg, type = 'success') => {
        clearTimeout(notifTimerRef.current)
        setNotification({ msg, type })
        notifTimerRef.current = setTimeout(() => setNotification(null), 3500)
    }, [])

    const loadAlarms = useCallback(() => {
        setLoading(true)
        setTimeout(() => {
            const data = {}
            Object.keys(ALARM_CATEGORIES).forEach(cat => {
                data[cat] = generateAlarms(cat)
            })
            setAllAlarms(data)
            setLastRefresh(new Date())
            setLoading(false)
        }, 600)
    }, [])

    useEffect(() => {
        loadAlarms()
    }, [loadAlarms])

    // Simulate new alarm arriving every ~30s
    useEffect(() => {
        const interval = setInterval(() => {
            setAllAlarms(prev => {
                const cats = Object.keys(ALARM_CATEGORIES)
                const randomCat = cats[Math.floor(Math.random() * cats.length)]
                const templates = ALARM_TEMPLATES[randomCat]
                const t = templates[Math.floor(Math.random() * templates.length)]
                const newAlarm = {
                    id: `NEW_${alarmIdCounter++}`,
                    category: randomCat,
                    description: t.desc,
                    severity: Math.random() > 0.6 ? 'Critical' : 'Warning',
                    status: 'Active',
                    station: t.station,
                    timestamp: new Date().toISOString(),
                    acknowledgedAt: null,
                    resolvedAt: null,
                    acknowledgedBy: null,
                    occurrenceCount: 1,
                    code: `ALM-${String(alarmIdCounter).padStart(4, '0')}`,
                }
                showNotif(`🔔 New ${newAlarm.severity} alarm: ${newAlarm.code} at ${newAlarm.station}`, newAlarm.severity === 'Critical' ? 'critical' : 'warning')
                return {
                    ...prev,
                    [randomCat]: [newAlarm, ...(prev[randomCat] || [])],
                }
            })
        }, 30000)
        return () => clearInterval(interval)
    }, [showNotif])

    const handleAcknowledge = useCallback((id) => {
        setAllAlarms(prev => {
            const updated = {}
            Object.keys(prev).forEach(cat => {
                updated[cat] = prev[cat].map(a =>
                    a.id === id
                        ? { ...a, status: 'Acknowledged', acknowledgedAt: new Date().toISOString(), acknowledgedBy: user?.username || 'operator' }
                        : a
                )
            })
            return updated
        })
        showNotif('✅ Alarm acknowledged successfully', 'success')
    }, [user, showNotif])

    const handleResolve = useCallback((id) => {
        setAllAlarms(prev => {
            const updated = {}
            Object.keys(prev).forEach(cat => {
                updated[cat] = prev[cat].map(a =>
                    a.id === id
                        ? { ...a, status: 'Resolved', resolvedAt: new Date().toISOString() }
                        : a
                )
            })
            return updated
        })
        showNotif('🟢 Alarm resolved and cleared', 'success')
    }, [showNotif])

    const handleAckAll = () => {
        setAllAlarms(prev => {
            const updated = {}
            Object.keys(prev).forEach(cat => {
                updated[cat] = prev[cat].map(a =>
                    a.status === 'Active' && (activeTab === null || a.category === activeTab)
                        ? { ...a, status: 'Acknowledged', acknowledgedAt: new Date().toISOString(), acknowledgedBy: user?.username || 'operator' }
                        : a
                )
            })
            return updated
        })
        showNotif('✅ All visible active alarms acknowledged', 'success')
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
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
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
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Acknowledge All Active
                    </button>
                    <button id="alm-refresh" className="alm-btn-header alm-btn-header--refresh" onClick={loadAlarms} disabled={loading}>
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                            className={loading ? 'alm-spin' : ''}>
                            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
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

                {loading ? (
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
                                onClick={() => { }}
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
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><polyline points="20 6 9 17 4 12" /></svg>
                                        </button>
                                    )}
                                    {alarm.status === 'Acknowledged' && (
                                        <button className="alm-action-btn" onClick={(e) => { e.stopPropagation(); handleResolve(alarm.id); }} title="Resolve">
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>
                                        </button>
                                    )}
                                    <button className="alm-action-btn" title="View Logs">
                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M12 5v14M5 12h14" /></svg>
                                    </button>
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

export default AlarmPage
