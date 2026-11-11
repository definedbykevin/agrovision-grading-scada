import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './EngineRoomPage.css'
import { useWTFlowBuilder, WTFlowOverlay, WTFlowPanel } from './components/WTFlowBuilder.jsx'
import { LiquidFlowSVG, SteamFlowSVG, WaterFlowSVG } from './components/Flows.jsx'

// Assets
import engineRoomImageUrl from './assets/engine-room.webp'
import motorSvg from './assets/item/motor.svg'
import valve_positionerSvg from './assets/item/valve_positioner.svg'

/**
 * Custom hook for hover effects and sound
 */
function useAmpHover() {
    const [isHovered, setIsHovered] = useState(false)
    const cardRef = useRef(null)
    const [popupPos, setPopupPos] = useState(null)
    const hoverTimeoutRef = useRef(null)

    const handleMouseEnter = () => {
        setIsHovered(true)
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect()
            setPopupPos({
                top: rect.top,
                right: rect.right,
                left: rect.left,
                bottom: rect.bottom,
            })
        }
    }

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false)
            setPopupPos(null)
        }, 150)
    }

    const handlePopupMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        setIsHovered(true)
    }

    const handlePopupMouseLeave = () => {
        setIsHovered(false)
        setPopupPos(null)
    }

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        }
    }, [])

    return {
        cardRef,
        isHovered,
        popupPos,
        handleMouseEnter,
        handleMouseLeave,
        handlePopupMouseEnter,
        handlePopupMouseLeave,
    }
}

/**
 * Trend Popup component (Portaled)
 */
function StatusGraphPopup({ position, equipmentName, type = 'Load', value = 0, unit = 'A', onMouseEnter, onMouseLeave }) {
    const popupRef = useRef(null)
    const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' })

    useEffect(() => {
        if (!position || !popupRef.current) return

        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const popupWidth = 450
        const popupHeight = 400
        const padding = 20

        let left = position.right + 15
        let top = position.top - 10

        if (left + popupWidth > viewportWidth - padding) {
            left = position.left - popupWidth - 15
        }
        if (top + popupHeight > viewportHeight - padding) {
            top = viewportHeight - popupHeight - padding
        }
        if (top < padding) top = padding
        if (left < padding) left = padding

        setStyle({
            top: `${top}px`,
            left: `${left}px`,
            opacity: 1,
            pointerEvents: 'auto'
        })
    }, [position])

    const width = 400
    const height = 200
    const plotLeft = 40
    const plotRight = 360
    const plotTop = 20
    const plotBottom = 160

    const points = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => {
            const x = plotLeft + ((plotRight - plotLeft) * i) / 19
            const yVal = Math.max(0, value)
            const maxRange = type === 'Temperature' ? 150 : (type === 'Frequency' ? 60 : 2000)
            const t = yVal / maxRange
            const y = plotBottom - t * (plotBottom - plotTop)
            return { x, y }
        })
    }, [value, type])

    const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ')

    return createPortal(
        <div
            ref={popupRef}
            className="som-amp-popup"
            style={style}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="som-amp-popup-header">
                <div className="som-amp-popup-title">{type} Trend</div>
                <div className="som-amp-popup-subtitle">
                    <span>{equipmentName}</span>
                    <span>Current: {value} {unit}</span>
                </div>
            </div>
            <div className="som-amp-popup-body">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="som-amp-graph-svg">
                    <defs>
                        <linearGradient id="trendGradientER" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(255, 255, 255, 0.02)" />
                    <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="rgba(255,255,255,0.2)" />
                    <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="rgba(255,255,255,0.2)" />
                    <polygon className="som-amp-graph-area" points={`${plotLeft},${plotBottom} ${polyPoints} ${plotRight},${plotBottom}`} style={{ fill: 'url(#trendGradientER)' }} />
                    <polyline className="som-amp-graph-line-main" points={polyPoints} fill="none" stroke="#f59e0b" strokeWidth="2" />
                    {points.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="#f59e0b" />
                    ))}
                </svg>
            </div>
        </div>,
        document.body
    )
}

// Auth helper
const authHeaders = () => {
    const token = localStorage.getItem("kip_token");
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const TagEditorModal = ({
    data,
    onClose,
    onSave,
    tagMap,
    availableTags = [],
    saving,
}) => {
    const [localTags, setLocalTags] = useState({});

    useEffect(() => {
        if (data) {
            const initial = {};

            if (data.signals && data.signals.length > 0) {
                data.signals.forEach((sig) => {
                    const key = `${data.targetId}__${sig.key || sig}`;
                    initial[key] = tagMap[key] || "";
                });
            } else {
                const targets = data.subs && data.subs.length > 0 ? data.subs : [data.targetId];
                targets.forEach((t) => {
                    initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
                    initial[`${t}__START`] = tagMap[`${t}__START`] || "";
                    initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
                });
                if (!data.subs || data.subs.length === 0) {
                    initial[`${data.targetId}__MONITOR`] =
                        tagMap[`${data.targetId}__MONITOR`] || "";
                }
            }
            setLocalTags(initial);
        }
    }, [data, tagMap]);

    if (!data) return null;

    const isGroup = data.subs && data.subs.length > 0;
    const hasSignals = data.signals && data.signals.length > 0;
    const allTags = availableTags; // show all tags

    const renderTagSelect = (value, onChange, tagList, label) => (
        <div className="tag-field" style={{ marginBottom: 0 }}>
            <label
                className="som-control-item-label"
                style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "6px",
                    display: "block",
                }}
            >
                {label}
            </label>
            <select
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "#0f172a",
                    color: "#e2e8f0",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                }}
            >
                <option value="">— No Tag —</option>
                {tagList.map((t) => (
                    <option key={t.id} value={t.id}>
                        {t.tag_name}
                    </option>
                ))}
            </select>
        </div>
    );

    return createPortal(
        <div
            className="som-equipment-modal-overlay"
            onClick={onClose}
            style={{
                zIndex: 10000,
                background: "rgba(2, 6, 23, 0.85)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: "10vh",
            }}
        >
            <div
                className="som-equipment-modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                    width: "400px",
                    borderRadius: "16px",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        padding: "20px 24px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: 800,
                                color: "#f1f5f9",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            ⚙️ PLC Tag Configuration
                        </h2>
                        <span
                            style={{
                                fontSize: "11px",
                                color: "#64748b",
                                marginTop: "4px",
                            }}
                        >
                            Hardware Mapping: {data.targetId}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            fontSize: "16px",
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "60vh", overflowY: "auto" }}>
                    {hasSignals ? (
                        data.signals.map((sig) => {
                            const sigKey = sig.key || sig;
                            const sigLabel = sig.label || sigKey;
                            const k = `${data.targetId}__${sigKey}`;
                            return (
                                <div key={k}>
                                    {renderTagSelect(
                                        localTags[k],
                                        (val) => setLocalTags((prev) => ({ ...prev, [k]: val })),
                                        allTags,
                                        sigLabel
                                    )}
                                </div>
                            );
                        })
                    ) : isGroup ? (
                        data.subs.map((sub) => (
                            <div
                                key={sub}
                                style={{
                                    background: "rgba(255,255,255,0.02)",
                                    padding: "16px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                }}
                            >
                                <h4
                                    style={{
                                        margin: "0 0 16px 0",
                                        fontSize: "11px",
                                        color: "#f1f5f9",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Sub-Equipment: {sub}
                                </h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {renderTagSelect(
                                        localTags[`${sub}__STATUS`],
                                        (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STATUS`]: val })),
                                        allTags,
                                        "Status/Feedback (READ)"
                                    )}
                                    {renderTagSelect(
                                        localTags[`${sub}__START`],
                                        (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__START`]: val })),
                                        allTags,
                                        "Start Command (WRITE)"
                                    )}
                                    {renderTagSelect(
                                        localTags[`${sub}__STOP`],
                                        (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STOP`]: val })),
                                        allTags,
                                        "Stop Command (WRITE)"
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {renderTagSelect(
                                localTags[`${data.targetId}__MONITOR`],
                                (val) => setLocalTags((prev) => ({ ...prev, [`${data.targetId}__MONITOR`]: val })),
                                allTags,
                                "MONITORING POINT (READ)"
                            )}
                        </div>
                    )}
                </div>

                <div
                    style={{
                        padding: "16px 24px",
                        background: "rgba(0,0,0,0.2)",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            background: "transparent",
                            color: "#e2e8f0",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(localTags, data)}
                        style={{
                            padding: "8px 16px",
                            background: "#3b82f6",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            opacity: saving ? 0.7 : 1,
                        }}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Apply Mapping"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

/**
 * Standard Boiler Mini Card
 */
const GenericMiniCard = ({ x, y, title, params, status = "active", width = 110, height = 80, utilization = null, configMode = false, onTagEdit = null, cardId = null }) => (
    <foreignObject x={x} y={y} width={width} height={height + (utilization ? 15 : 0)} style={{ overflow: 'visible' }}>
        <div
            className={`som-boiler-mini-card ${configMode ? 'som-editable' : ''}`}
            onClick={(e) => {
                if (configMode && onTagEdit && cardId) {
                    onTagEdit(e, cardId, []);
                }
            }}
            style={{ cursor: configMode ? 'pointer' : 'default' }}
        >
            <div className={`som-boiler-mini-header ${status === 'standby' ? 'standby' : ''}`}>
                <span className="som-boiler-mini-tag">{title}</span>
                <div className={`som-boiler-status-indicator ${status === 'active' ? 'active' : ''}`}></div>
            </div>
            <div className="som-boiler-mini-body">
                {params.map((p, i) => (
                    <div key={i} className="som-boiler-mini-param">
                        <span className="som-boiler-mini-label">{p.label}</span>
                        <span className="som-v2-value" style={{ textShadow: 'none' }}>{p.value}</span>
                        {p.unit && <span className="som-boiler-mini-unit">{p.unit}</span>}
                    </div>
                ))}
                {utilization !== null && (
                    <div className="som-boiler-mini-util-badge">
                        UTIL: {utilization}%
                    </div>
                )}
            </div>
        </div>
    </foreignObject>
)

/**
 * Universal Engine Room SCADA Card — Sterilizer-Matched Theme
 * All styles are inline to prevent CSS class conflicts with parent theme.
 */
const EngineCard = ({ x, y, width = 145, height = 70, title, status = "active", children, onClick, isEditable }) => {
    const headerH = 26;
    return (
        <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
            <div
                xmlns="http://www.w3.org/1999/xhtml"
                onClick={onClick}
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    cursor: onClick ? 'pointer' : 'default',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    outline: isEditable ? '2px dashed #f59e0b' : 'none',
                }}
            >
                {/* Header bar */}
                <div style={{
                    height: `${headerH}px`,
                    background: '#ffdb3b',
                    padding: '0 8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '2px solid rgba(15,23,42,0.06)',
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }}>{title}</span>
                    <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: status === 'active' ? '#f59e0b' : '#94a3b8',
                        boxShadow: status === 'active' ? '0 0 6px rgba(245,158,11,0.4)' : 'none',
                    }} />
                </div>
                {/* Body */}
                <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {children}
                </div>
            </div>
        </foreignObject>
    );
};

/* Param row helper — used inside Genset/Turbin/PowerSummary cards */
const ParamRow = ({ label, value, unit, labelSize = '10px', valueSize = '12px' }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0' }}>
        <span style={{ fontSize: labelSize, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</span>
        <span style={{ fontSize: valueSize, fontWeight: 900, color: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {value}{unit && <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', marginLeft: '2px' }}>{unit}</span>}
        </span>
    </div>
);

/* Centre value helper — used inside StationBox / FlowCard / Sidebar summary cards */
const CentreValue = ({ value, unit, valueSize = '16px' }) => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '3px', padding: '2px 0' }}>
        <span style={{ fontSize: valueSize, fontWeight: 950, color: '#0f172a' }}>{value}</span>
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b' }}>{unit}</span>
    </div>
);

/* ── 1. TOP STATION BOX (14 across the top row) ── */
const HmiStationBox = ({ x, y, label, value = "0" }) => (
    <EngineCard x={x} y={y} width={128} height={58} title={label}>
        <CentreValue value={value} unit="Kw" valueSize="15px" />
    </EngineCard>
);

/* ── 2. GENSET CARD (3 params: POWER, FREQ, UTIL) ── */
const HmiGensetCard = ({ x, y, title, power = "0", freq = "0.0", util = "0.0", configMode, onTagEdit, cardId }) => (
    <EngineCard
        x={x} y={y} width={155} height={102} title={title}
        isEditable={configMode} onClick={(e) => configMode && onTagEdit && onTagEdit(e, cardId, [])}
    >
        <ParamRow label="POWER" value={power} unit="Kw" />
        <ParamRow label="FREQ" value={freq} unit="Hz" />
        <ParamRow label="UTIL" value={util} unit="%" />
    </EngineCard>
);

/* ── 3. TURBIN CARD (4 params: POWER, FREQ, RPM, UTIL) ── */
const HmiTurbinCard = ({ x, y, title, power = "0", freq = "0.0", rpm = "0.0", util = "0.0", configMode, onTagEdit, cardId }) => (
    <EngineCard
        x={x} y={y} width={165} height={122} title={title}
        isEditable={configMode} onClick={(e) => configMode && onTagEdit && onTagEdit(e, cardId, [])}
    >
        <ParamRow label="POWER" value={power} unit="Kw" />
        <ParamRow label="FREQ" value={freq} unit="Hz" />
        <ParamRow label="RPM" value={rpm} />
        <ParamRow label="UTIL" value={util} unit="%" />
    </EngineCard>
);

/* ── 4. FLOW CARD (single value with m³/h) ── */
const HmiFlowCard = ({ x, y, title, value = "0", configMode, onTagEdit, cardId }) => (
    <EngineCard
        x={x} y={y} width={128} height={58} title={title}
        isEditable={configMode} onClick={(e) => configMode && onTagEdit && onTagEdit(e, cardId, [])}
    >
        <CentreValue value={value} unit="m³/h" valueSize="15px" />
    </EngineCard>
);

/* ── 5. LEFT SIDEBAR (5 stacked summary cards) ── */
const HmiLeftSummarySidebar = ({
    x, y,
    totalActive = "0",
    totalApparent = "0",
    energyToday = "0",
    runningStation = "0",
    adminKw = "0",
    mainProcKw = "0",
    utilKw = "0",
    byProdKw = "0"
}) => {
    const smallW = 145;
    const bigW = 185;
    const smallH = 58;     // single-value cards
    const bigH = 138;      // POWER SUMMARY (4 param rows)
    const gap = 8;         // vertical gap between cards

    const y1 = 0;
    const y2 = smallH + gap;
    const y3 = y2 + smallH + gap;
    const y4 = y3 + smallH + gap;
    const y5 = y4 + smallH + gap;

    return (
        <g>
            <EngineCard x={x} y={y + y1} width={smallW} height={smallH} title="TOTAL ACTIVE POWER">
                <CentreValue value={totalActive} unit="Kw" valueSize="17px" />
            </EngineCard>

            <EngineCard x={x} y={y + y2} width={smallW} height={smallH} title="TOTAL APPARENT">
                <CentreValue value={totalApparent} unit="Kw" valueSize="17px" />
            </EngineCard>

            <EngineCard x={x} y={y + y3} width={smallW} height={smallH} title="ENERGY TODAY">
                <CentreValue value={energyToday} unit="KwH" valueSize="17px" />
            </EngineCard>

            <EngineCard x={x} y={y + y4} width={smallW} height={smallH} title="RUNNING STATION">
                <CentreValue value={runningStation} unit="" valueSize="17px" />
            </EngineCard>

            <EngineCard x={x} y={y + y5} width={bigW} height={bigH} title="POWER SUMMARY">
                <ParamRow label="ADMINISTRATION & RECEIVING" value={adminKw} unit="Kw" labelSize="8.5px" valueSize="11px" />
                <ParamRow label="MAIN PROCESSING PLANT" value={mainProcKw} unit="Kw" labelSize="8.5px" valueSize="11px" />
                <ParamRow label="UTILITIES & SUPPORT" value={utilKw} unit="Kw" labelSize="8.5px" valueSize="11px" />
                <ParamRow label="BY PRODUCT & STORAGE" value={byProdKw} unit="Kw" labelSize="8.5px" valueSize="11px" />
            </EngineCard>
        </g>
    );
};

const LocalSteamFlowSVG = ({ d, active, color = "#38bdf8", thickness = 8 }) => {
    if (!active) return null;
    return (
        <g style={{ pointerEvents: "none" }}>
            <path
                d={d}
                style={{
                    stroke: color,
                    strokeWidth: thickness + 6,
                    filter: "blur(4px)",
                    animation: "er-flow-pulse-opacity 2s ease-in-out infinite",
                    fill: "none",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                }}
            />
            <path
                d={d}
                style={{
                    stroke: color,
                    strokeWidth: thickness,
                    animation: "er-flow-pulse-opacity 2s ease-in-out infinite",
                    fill: "none",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                }}
            />
        </g>
    );
};

const LiquidSteamFlowSVG = ({ d, active, mode = "flowing", color = "#38bdf8", thickness = 8 }) => {
    if (!active) return null;
    return (
        <g className={`liquid-flow--${mode}`} style={{ pointerEvents: "none" }}>
            <path
                d={d}
                fill="none"
                stroke={color}
                className="liquid-flow-glow"
                style={{ strokeWidth: thickness + 6 }}
            />
            <path
                d={d}
                fill="none"
                stroke={color}
                className="liquid-flow-aura"
                style={{ strokeWidth: thickness }}
            />
        </g>
    );
};

function EngineRoomPage({ user, onSelectSubmenu }) {
    const [viewMode, setViewMode] = useState('process')
    const svgRef = useRef(null)
    const wtFlow = useWTFlowBuilder()

    const handleMouseMove = (e) => {
        if (!svgRef.current) return
        const svg = svgRef.current
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    }

    const [isFullscreen, setIsFullscreen] = useState(false)

    // --- MAKEUP VALVE STATE ---
    const [makeupValveOpen, setMakeupValveOpen] = useState(true);
    const toggleMakeupValve = () => setMakeupValveOpen(v => !v);

    // --- BLOWDOWN VALVE STATE ---
    const [blowdownValveOpen, setBlowdownValveOpen] = useState(false);
    const toggleBlowdownValve = () => setBlowdownValveOpen(v => !v);

    // --- PLC CONFIG STATE ---
    const [configMode, setConfigMode] = useState(false);
    const [tagEdit, setTagEdit] = useState(null);
    const [tagMap, setTagMap] = useState({});
    const [availableTags, setAvailableTags] = useState([]);
    const [savingTags, setSavingTags] = useState(false);
    const [liveValues, setLiveValues] = useState({});

    const tagIdToName = useMemo(() => {
        const map = {};
        availableTags.forEach((t) => { map[t.id] = t.tag_name; });
        return map;
    }, [availableTags]);

    const fetchLiveValues = useCallback(async () => {
        try {
            const res = await fetch("/api/engine-room/plc-config/tags-live", { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.success) setLiveValues(data.data);
            }
        } catch { }
    }, []);

    useEffect(() => {
        fetchLiveValues();
        const interval = setInterval(fetchLiveValues, 2000);
        return () => clearInterval(interval);
    }, [fetchLiveValues]);

    const getLiveValue = useCallback((equipmentKey, signalKey = "MONITOR") => {
        const tagId = tagMap[`${equipmentKey}__${signalKey}`];
        if (!tagId) return null;
        const tagName = tagIdToName[tagId];
        if (!tagName) return null;
        if (liveValues[tagName] !== undefined) return liveValues[tagName];
        return null;
    }, [tagMap, tagIdToName, liveValues]);

    const lv = (cardId, signalKey = "MONITOR", fallback, decimals = 1) => {
        const tagId = tagMap[`${cardId}__${signalKey}`];
        if (!tagId) return fallback;
        const v = getLiveValue(cardId, signalKey);
        if (v === null || v === undefined) return "--";
        const num = parseFloat(v);
        if (isNaN(num)) return v;
        return num.toFixed(decimals);
    };

    useEffect(() => {
        const isDev = user?.userRole?.toLowerCase() === 'developer' || user?.role?.toLowerCase() === 'developer';
        if (!isDev) return;
        const onKeyDown = (e) => {
            if (e.ctrlKey && e.key === 'x') {
                e.preventDefault();
                setConfigMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [user]);

    useEffect(() => {
        const fetchAvailableTags = async () => {
            try {
                const res = await fetch("/api/engine-room/plc-config/tags", { headers: authHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) setAvailableTags(data.data);
                }
            } catch (err) { }
        };
        fetchAvailableTags();
    }, []);

    useEffect(() => {
        const loadMappings = async () => {
            try {
                const res = await fetch("/api/engine-room/plc-config/station-mappings/ENGINE_ROOM", { headers: authHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data.length > 0) {
                        const restored = {};
                        data.data.forEach((m) => { restored[`${m.equipment}__${m.signal_key}`] = String(m.tag_id); });
                        setTagMap(restored);
                    }
                }
            } catch (err) { }
        };
        loadMappings();
    }, []);

    const handleTagEditRequest = (e, id, subs = []) => {
        e.stopPropagation();
        setTagEdit({ targetId: id, subs: subs, pos: { top: 0, left: 0 } });
    };

    const handleTagSave = async (updatedTags, editData) => {
        setSavingTags(true);
        try {
            const mappings = [];
            for (const [key, tagId] of Object.entries(updatedTags)) {
                if (!tagId) continue;
                const parts = key.split("__");
                if (parts.length !== 2) continue;
                mappings.push({ station: "ENGINE_ROOM", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
            }
            if (mappings.length > 0) {
                await fetch("/api/engine-room/plc-config/station-mappings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeaders() },
                    body: JSON.stringify({ mappings }),
                });
            }
            setTagMap((prev) => ({ ...prev, ...updatedTags }));
            setTagEdit(null);
        } catch (err) {
            alert("Failed to save tag configuration.");
        } finally {
            setSavingTags(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement || !!document.webkitIsFullScreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const steamData = [
        { label: 'STERILIZER', hr: '18.50', day: '118.50' },
        { label: 'EFB & PRESS', hr: '3.10', day: '13.10' },
        { label: 'KERNEL PLT', hr: '3.20', day: '13.20' },
        { label: 'OIL ROOM', hr: '2.30', day: '12.30' },
        { label: 'BOILER', hr: '8.00', day: '18.00' },
        { label: 'SURPLUS', hr: '0.00', day: '10.00' },
        { label: 'SAFETY', hr: '0.00', day: '10.00' },
    ]

    return (
        <section className="som-engine-room">
            <header className="som-engine-room-station-header">
                <div className="som-header-left">
                    <h2 className="som-engine-room-station-title">ENGINE ROOM</h2>
                    <div className="som-station-tabs">
                        <button className="som-station-tab active">Overview</button>
                    </div>
                </div>

                {user && (user.role === 'Developer' || user.userRole === 'Developer') && (
                    <div className={`som-dev-config-toggle ${configMode ? 'active' : ''}`} onClick={() => setConfigMode(!configMode)} style={{ position: 'absolute', top: '100px', right: '20px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(2, 6, 23, 0.8)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="toggle-text" style={{ color: '#f1f5f9', fontSize: '10px', fontWeight: 'bold' }}>{configMode ? 'Config Mode ON' : 'Config Mode'}</div>
                        <div className="som-boiler-status-indicator active" style={{ backgroundColor: configMode ? '#0f172a' : '#ffdb3b', width: '8px', height: '8px', borderRadius: '50%' }}></div>
                    </div>
                )}

                <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
                    <button
                        className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`}
                        onClick={() => setViewMode('process')}
                    >
                        PROCESS VIEW
                    </button>
                    <button
                        className="som-view-btn"
                        disabled
                        style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        MAINTENANCE VIEW
                        <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}>
                            <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
                        </svg>
                    </button>
                    {onSelectSubmenu && (
                        <button className="som-view-btn" onClick={() => onSelectSubmenu('Engine Room', 'Settings')} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
                    )}
                    <button
                        className={`som-view-btn ${wtFlow.isActive ? 'active' : ''}`}
                        onClick={wtFlow.toggle}
                        style={{ marginLeft: '8px', background: wtFlow.isActive ? '#eab308' : undefined, color: wtFlow.isActive ? '#000' : undefined }}
                    >
                        {wtFlow.isActive ? 'EXIT FLOW BUILDER' : 'FLOW BUILDER'}
                    </button>
                </div>
            </header>

            <div className="som-engine-room-main">
                <div className="som-engine-room-layout">
                    <div className="som-engine-room-flow-body">
                        <svg
                            ref={svgRef}
                            viewBox={isFullscreen ? "0 0 1920 1080" : "0 0 1980 980"}
                            className="station-svg-canvas"
                            preserveAspectRatio="xMidYMid meet"
                            onMouseMove={handleMouseMove}
                        >
                            <defs>
                                <filter id="tint-red">
                                    <feColorMatrix type="matrix"
                                        values="0.244 0.822 0.083 0 0
                                                0     0     0     0 0
                                                0     0     0     0 0
                                                0 0 0 1 0"/>
                                </filter>
                                <filter id="tint-green">
                                    <feColorMatrix type="matrix"
                                        values="0.0638 0.2146 0.0216 0 0
                                                0.2551 0.8582 0.0867 0 0
                                                0.0425 0.1430 0.0144 0 0
                                                0 0 0 1 0"/>
                                </filter>
                            </defs>
                            <image href={engineRoomImageUrl} x="6" y="-29" width="1910" height="1070" />
                            {/* ==========================================
                               1. TOP STATION POWER BAR (12 STATIONS)
                               Row: y=15, 12 cards evenly spaced
                               ========================================== */}
                            <HmiStationBox x={25} y={40} label="Office" value={lv('st_office_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={185} y={40} label="Grading" value={lv('st_grading_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={340} y={40} label="Weighbridge" value={lv('st_weighbridge_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={500} y={40} label="Sterilizer" value={lv('st_sterilizer_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={655} y={40} label="Thresher" value={lv('st_thresher_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={810} y={40} label="EFB Plant" value={lv('st_efb_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={970} y={40} label="Press" value={lv('st_press_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={1135} y={40} label="Kernel" value={lv('st_kernel_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={1285} y={40} label="Clarification" value={lv('st_clarification_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={1445} y={40} label="Boiler" value={lv('st_boiler_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={1600} y={40} label="RWT" value={lv('st_rwt_kw', 'MONITOR', '0')} />
                            <HmiStationBox x={1760} y={40} label="ETP" value={lv('st_etp_kw', 'MONITOR', '0')} />

                            {/* ==========================================
                               2. LEFT POWER SUMMARY CARDS (INDEPENDENT X, Y)
                               ========================================== */}
                            <EngineCard x={305} y={155} width={130} height={58} title="TOTAL ACTIVE POWER">
                                <CentreValue value={lv('total_active_power', 'MONITOR', '0')} unit="Kw" valueSize="17px" />
                            </EngineCard>

                            <EngineCard x={170} y={155} width={130} height={58} title="TOTAL APPARENT">
                                <CentreValue value={lv('total_apparent_power', 'MONITOR', '0')} unit="Kw" valueSize="17px" />
                            </EngineCard>

                            <EngineCard x={35} y={155} width={130} height={58} title="ENERGY TODAY">
                                <CentreValue value={lv('energy_today', 'MONITOR', '0')} unit="KwH" valueSize="17px" />
                            </EngineCard>

                            <EngineCard x={-100} y={155} width={130} height={58} title="RUNNING STATION">
                                <CentreValue value={lv('running_station_count', 'MONITOR', '0')} unit="" valueSize="17px" />
                            </EngineCard>

                            <EngineCard x={280} y={840} width={200} height={138} title="POWER SUMMARY">
                                <ParamRow label="ADMINISTRATION & RECEIVING" value={lv('admin_receiving_kw', 'MONITOR', '0')} unit="Kw" labelSize="8.5px" valueSize="11px" />
                                <ParamRow label="MAIN PROCESSING PLANT" value={lv('main_processing_kw', 'MONITOR', '0')} unit="Kw" labelSize="8.5px" valueSize="11px" />
                                <ParamRow label="UTILITIES & SUPPORT" value={lv('utilities_support_kw', 'MONITOR', '0')} unit="Kw" labelSize="8.5px" valueSize="11px" />
                                <ParamRow label="BY PRODUCT & STORAGE" value={lv('byproduct_storage_kw', 'MONITOR', '0')} unit="Kw" labelSize="8.5px" valueSize="11px" />
                            </EngineCard>

                            {/* ==========================================
                               3. GENSETS 1, 2, 3
                               x=195 (15+165+15, clear of widened sidebar)
                               Each 140w × 88h, gap=10
                               ========================================== */}
                            <HmiGensetCard
                                x={280} y={280}
                                title="GENSET 1"
                                power={lv('genset1_power', 'MONITOR', '0')}
                                freq={lv('genset1_freq', 'MONITOR', '0.0')}
                                util={lv('genset1_util', 'MONITOR', '0.0')}
                                configMode={configMode}
                                onTagEdit={handleTagEditRequest}
                                cardId="GENSET 1"
                            />
                            <HmiGensetCard
                                x={280} y={490}
                                title="GENSET 2"
                                power={lv('genset2_power', 'MONITOR', '0')}
                                freq={lv('genset2_freq', 'MONITOR', '0.0')}
                                util={lv('genset2_util', 'MONITOR', '0.0')}
                                configMode={configMode}
                                onTagEdit={handleTagEditRequest}
                                cardId="GENSET 2"
                            />
                            <HmiGensetCard
                                x={280} y={710}
                                title="GENSET 3"
                                power={lv('genset3_power', 'MONITOR', '0')}
                                freq={lv('genset3_freq', 'MONITOR', '0.0')}
                                util={lv('genset3_util', 'MONITOR', '0.0')}
                                configMode={configMode}
                                onTagEdit={handleTagEditRequest}
                                cardId="GENSET 3"
                            />

                            {/* ==========================================
                               4. TURBINES 1 & 2 + FLOATING STATIONS (ORP & Storage)
                               ========================================== */}
                            <HmiTurbinCard
                                x={1040} y={170}
                                title="TURBIN 1"
                                power={lv('turbin1_power', 'MONITOR', '0')}
                                freq={lv('turbin1_freq', 'MONITOR', '0.0')}
                                rpm={lv('turbin1_rpm', 'MONITOR', '0.0')}
                                util={lv('turbin1_util', 'MONITOR', '0.0')}
                                configMode={configMode}
                                onTagEdit={handleTagEditRequest}
                                cardId="TURBIN 1"
                            />

                            {/* ORP (Floating Box above Turbin 2/Pipes area) */}
                            <HmiStationBox x={880} y={155} label="ORP" value={lv('st_orp_kw', 'MONITOR', '0')} />

                            <HmiTurbinCard
                                x={1675} y={170}
                                title="TURBIN 2"
                                power={lv('turbin2_power', 'MONITOR', '0')}
                                freq={lv('turbin2_freq', 'MONITOR', '0.0')}
                                rpm={lv('turbin2_rpm', 'MONITOR', '0.0')}
                                util={lv('turbin2_util', 'MONITOR', '0.0')}
                                configMode={configMode}
                                onTagEdit={handleTagEditRequest}
                                cardId="TURBIN 2"
                            />

                            {/* Storage (Floating Box to the right of ORP) */}
                            <HmiStationBox x={1510} y={170} label="Storage" value={lv('st_storage_kw', 'MONITOR', '0')} />

                            {/* ==========================================
                               5. RIGHT SIDE FLOW CARDS (m3/h)
                               x=1850, each 120w × 52h, gap=8
                               ========================================== */}
                            <HmiFlowCard x={1910} y={340} title="Feed Tank" value={lv('feed_tank_flow', 'MONITOR', '0')} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="feed_tank_flow" />
                            <HmiFlowCard x={1910} y={410} title="Kernel" value={lv('kernel_flow', 'MONITOR', '0')} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="kernel_flow" />
                            <HmiFlowCard x={1910} y={480} title="Storage Tank" value={lv('storage_tank_flow', 'MONITOR', '0')} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="storage_tank_flow" />
                            <HmiFlowCard x={1910} y={550} title="Clarification" value={lv('clarification_flow', 'MONITOR', '0')} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="clarification_flow" />
                            <HmiFlowCard x={1910} y={620} title="Sterilizer" value={lv('sterilizer_flow', 'MONITOR', '0')} configMode={configMode} onTagEdit={handleTagEditRequest} cardId="sterilizer_flow" />

                            {/* Make-Up Control Valve */}
                            {(() => {
                                const valveX = 817;
                                const valveY = 648;
                                const valveSize = 95;
                                const valveRot = 270;

                                return (
                                    <image
                                        href={valve_positionerSvg}
                                        x={valveX}
                                        y={valveY}
                                        width={valveSize}
                                        height={valveSize}
                                        transform={`rotate(${valveRot} ${valveX + valveSize / 2} ${valveY + valveSize / 2})`}
                                        style={{
                                            filter: makeupValveOpen
                                                ? 'url(#tint-green) drop-shadow(0 0 8px #22c55e)'
                                                : 'url(#tint-red) drop-shadow(0 0 8px #ef4444)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={toggleMakeupValve}
                                    />
                                );
                            })()}

                            {/* Blowdown Valve */}
                            {(() => {
                                const bdValveX = 1721;
                                const bdValveY = 595;
                                const bdValveSize = 60;
                                const bdValveRot = 360;

                                return (
                                    <image
                                        href={valve_positionerSvg}
                                        x={bdValveX}
                                        y={bdValveY}
                                        width={bdValveSize}
                                        height={bdValveSize}
                                        transform={`rotate(${bdValveRot} ${bdValveX + bdValveSize / 2} ${bdValveY + bdValveSize / 2})`}
                                        style={{
                                            filter: blowdownValveOpen
                                                ? 'url(#tint-green) drop-shadow(0 0 8px #22c55e)'
                                                : 'url(#tint-red) drop-shadow(0 0 8px #ef4444)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={toggleBlowdownValve}
                                    />
                                );
                            })()}

                            {/* Bottom Right Stats — Unified EngineCard style */}
                            <EngineCard x={1570} y={920} width={200} height={58} title="TODAY ELECTRICITY FROM TURBINE">
                                <CentreValue value="12,000" unit="kWh" valueSize="15px" />
                            </EngineCard>
                            <EngineCard x={1780} y={920} width={200} height={58} title="TODAY STEAM CONSUMED">
                                <CentreValue value="6,000" unit="rated 2.0 kWh/ton steam" valueSize="13px" />
                            </EngineCard>

                            {/* Permanent Flows */}
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1915,159 L 1054,156 Q 1029,156 1029,181 L 1031,303 Q 1031,315 1021,322 L 1010,328"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1663,164 L 1665,307 Q 1665,318 1655,323 L 1645,328"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1227,597 L 1228,522 Q 1228,502 1208,502 L 640,502"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>

                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1274,593 L 1274,504 Q 1274,484 1254,484 L 638,483"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1319,596 L 1319,482 Q 1319,462 1299,462 L 635,463"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1366,596 L 1365,466 Q 1365,446 1345,446 L 633,445"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1411,593 L 1411,446 Q 1411,426 1391,426 L 633,426"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 960,379 L 961,394 Q 961,408 976,408 L 1489,407 Q 1509,407 1509,427 L 1509,567"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1594,382 L 1595,412 Q 1596,432 1576,432 L 1512,433"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1570,597 L 1572,505 Q 1572,485 1592,485 L 1815,487"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1616,597 L 1618,527 Q 1618,507 1638,507 L 1816,507"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1674,575 L 1673,550 Q 1673,530 1693,530 L 1813,530"
                                    active={true}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 1729,608 L 1731,581 Q 1732,561 1752,561 L 1808,561"
                                    active={blowdownValveOpen}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>

                            {/* ==== MAKEUP VALVE CONTROLLED FLOWS ==== */}
                            {/* LocalSteamFlowSVG = solid pulsing (valve CLOSED/RED) */}
                            {/* LiquidSteamFlowSVG = dashed flowing (valve OPEN/GREEN) */}
                            <g className="wt-permanent-flows">
                                <LocalSteamFlowSVG
                                    d="M 1893,165 L 1893,882 Q 1893,907 1868,907 L 663,908 L 594,909 Q 574,909 574,889 L 575,742 Q 575,722 595,722 L 644,723"
                                    active={!makeupValveOpen}
                                    color="#38bdf8"
                                    thickness={8}
                                />
                                <LiquidSteamFlowSVG
                                    d="M 1893,165 L 1893,882 Q 1893,907 1868,907 L 663,908 L 594,909 Q 574,909 574,889 L 575,742 Q 575,722 595,722 L 644,723"
                                    active={makeupValveOpen}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LocalSteamFlowSVG
                                    d="M 666,722 L 750,722"
                                    active={!makeupValveOpen}
                                    color="#38bdf8"
                                    thickness={8}
                                />
                                <LiquidSteamFlowSVG
                                    d="M 666,722 L 750,722"
                                    active={makeupValveOpen}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LocalSteamFlowSVG
                                    d="M 786,722 L 844,722"
                                    active={!makeupValveOpen}
                                    color="#38bdf8"
                                    thickness={8}
                                />
                                <LiquidSteamFlowSVG
                                    d="M 786,722 L 844,722"
                                    active={makeupValveOpen}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LocalSteamFlowSVG
                                    d="M 736,715 L 734,590 Q 734,570 754,570 L 842,569"
                                    active={!makeupValveOpen}
                                    color="#38bdf8"
                                    thickness={8}
                                />
                                <LiquidSteamFlowSVG
                                    d="M 736,715 L 734,590 Q 734,570 754,570 L 842,569"
                                    active={makeupValveOpen}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 890,722 L 909,721"
                                    active={makeupValveOpen}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>
                            <g className="wt-permanent-flows">
                                <LiquidSteamFlowSVG
                                    d="M 948,725 L 991,721 Q 1011,719 1011,699 L 1014,589 Q 1014,569 1034,569 L 1181,570 Q 1192,570 1193,581 L 1194,592"
                                    active={makeupValveOpen}
                                    mode="flowing"
                                    color="#38bdf8"
                                    thickness={8}
                                />
                            </g>


                            {/* Make-Up Valve Command Card */}
                            <foreignObject x={775} y={755} width={170} height={140} style={{ overflow: 'visible' }}>
                                <div style={{
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    fontFamily: 'sans-serif',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ textAlign: 'center', fontWeight: '900', color: '#0f172a', fontSize: '11px', letterSpacing: '0.05em' }}>
                                        MAKE-UP VALVE
                                    </div>
                                    <div style={{ height: '2px', background: '#fde047', width: '100%', marginTop: '-2px' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>COMMAND</span>
                                        <button
                                            onClick={toggleMakeupValve}
                                            style={{
                                                background: makeupValveOpen ? '#f0fdf4' : '#fef2f2',
                                                border: makeupValveOpen ? '1.5px solid #22c55e' : '1.5px solid #ef4444',
                                                color: makeupValveOpen ? '#22c55e' : '#ef4444',
                                                fontWeight: '800',
                                                fontSize: '10px',
                                                padding: '4px 12px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {makeupValveOpen ? 'OPEN' : 'CLOSE'}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>POSITION</span>
                                        <div style={{
                                            width: '100%',
                                            textAlign: 'center',
                                            background: makeupValveOpen ? '#eab308' : '#f1f5f9',
                                            color: '#0f172a',
                                            fontWeight: '900',
                                            fontSize: '11px',
                                            padding: '4px 0',
                                            borderRadius: '4px'
                                        }}>
                                            {makeupValveOpen ? '100.0%' : '0.0%'}
                                        </div>
                                    </div>
                                </div>
                            </foreignObject>

                            {/* Blowdown Valve Command Card */}
                            <foreignObject x={1666} y={665} width={170} height={140} style={{ overflow: 'visible' }}>
                                <div style={{
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    fontFamily: 'sans-serif',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ textAlign: 'center', fontWeight: '900', color: '#0f172a', fontSize: '11px', letterSpacing: '0.05em' }}>
                                        BLOWDOWN VALVE
                                    </div>
                                    <div style={{ height: '2px', background: '#fde047', width: '100%', marginTop: '-2px' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>COMMAND</span>
                                        <button
                                            onClick={toggleBlowdownValve}
                                            style={{
                                                background: blowdownValveOpen ? '#f0fdf4' : '#fef2f2',
                                                border: blowdownValveOpen ? '1.5px solid #22c55e' : '1.5px solid #ef4444',
                                                color: blowdownValveOpen ? '#22c55e' : '#ef4444',
                                                fontWeight: '800',
                                                fontSize: '10px',
                                                padding: '4px 12px',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {blowdownValveOpen ? 'OPEN' : 'CLOSE'}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>POSITION</span>
                                        <div style={{
                                            width: '100%',
                                            textAlign: 'center',
                                            background: blowdownValveOpen ? '#eab308' : '#f1f5f9',
                                            color: '#0f172a',
                                            fontWeight: '900',
                                            fontSize: '11px',
                                            padding: '4px 0',
                                            borderRadius: '4px'
                                        }}>
                                            {blowdownValveOpen ? '100.0%' : '0.0%'}
                                        </div>
                                    </div>
                                </div>
                            </foreignObject>

                            {/* WT Flow Builder Overlay */}
                            <WTFlowOverlay
                                flows={wtFlow.flows}
                                activeFlowIdx={wtFlow.activeFlowIdx}
                                isActive={wtFlow.isActive}
                                isPlacing={wtFlow.isPlacing}
                                onPointDrag={wtFlow.updatePoint}
                                onInsertPoint={wtFlow.insertPoint}
                                onDeletePoint={wtFlow.deletePoint}
                                onSelectFlow={wtFlow.setActiveFlowIdx}
                                onCanvasClick={(x, y) => wtFlow.addPointToActiveFlow(x, y)}
                            />
                        </svg>

                        {/* WT Flow Builder Panel */}
                        {wtFlow.isActive && (
                            <WTFlowPanel
                                flows={wtFlow.flows}
                                activeFlowIdx={wtFlow.activeFlowIdx}
                                isPlacing={wtFlow.isPlacing}
                                onSelectFlow={wtFlow.setActiveFlowIdx}
                                onAddNewFlow={wtFlow.addNewFlow}
                                onDeleteFlow={wtFlow.deleteFlow}
                                onUpdateFlowSettings={wtFlow.updateFlowSettings}
                                onFinishPlacing={wtFlow.finishPlacing}
                                onClose={wtFlow.toggle}
                            />
                        )}
                    </div>
                </div>
            </div>
            {tagEdit && (
                <TagEditorModal
                    data={tagEdit}
                    onClose={() => setTagEdit(null)}
                    onSave={handleTagSave}
                    tagMap={tagMap}
                    availableTags={availableTags}
                    saving={savingTags}
                />
            )}
        </section>
    )
}

export default EngineRoomPage;