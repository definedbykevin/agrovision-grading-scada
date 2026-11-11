import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './RawWaterPage.css'
import SettingsView from './SettingsView.jsx'
import rawWaterImage from './assets/raw_water_treatment.webp'
import { BoilerMachineCard } from './components/RawWaterComponents'
import {
    useCoordinatePicker,
    InteractivePath,
    CrosshairOverlay,
    PickerBanner,
    CoordinatePanel,
} from './assets/CoordinatePicker.jsx'
import pumpRunSvg from './assets/pump-run.svg'
import usePlcStore from '@core/store'

const MaintenanceCardSVG = ({ x, y, id, label, params = [], onClick, onTagEdit, width = 160, isEditable }) => {
    const handleClick = (e) => {
        if (isEditable && onTagEdit) {
            onTagEdit(e, id);
        } else if (onClick) {
            onClick(id);
        }
    };

    return (
        <g id={id} className="svg-equipment motor-group" onClick={(e) => {
            e.stopPropagation();
            handleClick(e);
        }} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
            <foreignObject x={x} y={y} width={width} height="120" style={{ overflow: 'visible' }}>
                <div className={`som-maintenance-mini-card ${isEditable ? 'som-editable' : ''}`}>
                    <div className="som-station-header">
                        <div className="som-station-title">{label}</div>
                    </div>
                    <div className="som-maintenance-mini-body">
                        {params.map((p, idx) => (
                            <div key={idx} className="som-maintenance-mini-row">
                                <span className="som-maintenance-mini-row-label">{p.label}</span>
                                <span className="som-maintenance-mini-row-value">{p.value} <small>{p.unit}</small></span>
                            </div>
                        ))}
                    </div>
                </div>
            </foreignObject>
        </g>
    );
}

// Label overlay untuk equipment areas
const AreaLabel = ({ x, y, text, color = '#94a3b8', fontSize = '13px', fontWeight = 'bold' }) => (
    <text
        x={x}
        y={y}
        fill={color}
        fontSize={fontSize}
        fontWeight={fontWeight}
        textAnchor="middle"
        stroke="#000"
        strokeWidth="3px"
        paintOrder="stroke"
        style={{ fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}
    >
        {text}
    </text>
)

// Status badge untuk Sand Filter
const SandFilterBadge = ({ x, y, label, status }) => {
    const color = status === 'Running' ? '#10b981' : status === 'Backwash' ? '#f59e0b' : '#64748b'
    const bg = status === 'Running' ? 'rgba(16,185,129,0.15)' : status === 'Backwash' ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)'
    return (
        <foreignObject x={x} y={y} width="130" height="40" style={{ overflow: 'visible' }}>
            <div style={{
                background: bg,
                border: `1px solid ${color}`,
                borderRadius: '4px',
                padding: '4px 8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}>{label}</span>
                <span style={{ color, fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold' }}>{status}</span>
            </div>
        </foreignObject>
    )
}

const FlowDots = ({ path, length, reversed = false, speed = 30 }) => {
    const spacing = 50; // px
    const dur = length / speed;
    const numDots = Math.max(1, Math.floor(length / spacing) + 1);
    const interval = spacing / speed;

    return (
        <g>
            {/* The actual pipe preview — blue solid pipe */}
            <path d={path} className="som-path-preview-bg" />
            <path d={path} className="som-path-preview-outline" />

            {/* The flowing dots */}
            {Array.from({ length: numDots }).map((_, i) => (
                <ellipse
                    key={i}
                    rx="4.5"
                    ry="1.8"
                    fill="#ffffff"
                    opacity="1"
                    filter="url(#dotGlow)"
                >
                    <animateMotion
                        path={path}
                        dur={`${dur.toFixed(2)}s`}
                        begin={`${(i * interval - dur).toFixed(2)}s`}
                        rotate="auto"
                        repeatCount="indefinite"
                        keyPoints={reversed ? "1;0" : "0;1"}
                        keyTimes="0;1"
                        calcMode="linear"
                    />
                </ellipse>
            ))}
        </g>
    );
}

// --- PLC TAG EDITOR MODAL & UTILS ---
const authHeaders = () => {
    const token = localStorage.getItem('kip_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
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

            // Custom signals (SummaryTable, StatusTable)
            if (data.signals && Array.isArray(data.signals) && data.signals.length > 0) {
                data.signals.forEach((sig) => {
                    const key = `${data.targetId}__${sig.key || sig}`;
                    initial[key] = tagMap[key] || "";
                });
            } else {
                const targets = data.subs && Array.isArray(data.subs) && data.subs.length > 0 ? data.subs : [data.targetId];
                targets.forEach((t) => {
                    initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
                    initial[`${t}__START`] = tagMap[`${t}__START`] || "";
                    initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
                });
                if (!data.subs || !Array.isArray(data.subs) || data.subs.length === 0) {
                    initial[`${data.targetId}__MONITOR`] =
                        tagMap[`${data.targetId}__MONITOR`] || "";
                }
            }
            setLocalTags(initial);
        }
    }, [data, tagMap]);

    if (!data) return null;

    const isGroup = data.subs && Array.isArray(data.subs) && data.subs.length > 0;
    const hasSignals = data.signals && Array.isArray(data.signals) && data.signals.length > 0;
    const allTags = availableTags;

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
                paddingTop: "5vh",
            }}
        >
            <div
                className="som-equipment-control-popup som-tag-edit-popup"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: isGroup ? "800px" : "420px",
                    maxHeight: "90vh",
                    background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
                    borderRadius: "16px",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
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
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#94a3b8",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div
                    style={{
                        padding: "20px 24px",
                        overflowY: "auto",
                        flex: 1,
                    }}
                >
                    {hasSignals ? (
                        <div
                            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                        >
                            {data.signals.map((sig) => (
                                <div key={sig.key || sig}>
                                    {renderTagSelect(
                                        localTags[`${data.targetId}__${sig.key || sig}`] || "",
                                        (val) =>
                                            setLocalTags({
                                                ...localTags,
                                                [`${data.targetId}__${sig.key || sig}`]: val,
                                            }),
                                        allTags,
                                        sig.label || `${sig} Tag`,
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : isGroup ? (
                        <div
                            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                        >
                            {data.subs.map((sub, sIdx) => (
                                <div
                                    key={sIdx}
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        padding: "16px",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(59, 130, 246, 0.15)",
                                    }}
                                >
                                    <h3
                                        style={{
                                            margin: "0 0 12px 0",
                                            fontSize: "12px",
                                            color: "#60a5fa",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        {sub}
                                    </h3>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr 1fr",
                                            gap: "12px",
                                        }}
                                    >
                                        {renderTagSelect(
                                            localTags[`${sub}__STATUS`] || "",
                                            (val) =>
                                                setLocalTags({ ...localTags, [`${sub}__STATUS`]: val }),
                                            allTags,
                                            "STATUS (READ)",
                                        )}
                                        {renderTagSelect(
                                            localTags[`${sub}__START`] || "",
                                            (val) =>
                                                setLocalTags({ ...localTags, [`${sub}__START`]: val }),
                                            allTags,
                                            "START (WRITE)",
                                        )}
                                        {renderTagSelect(
                                            localTags[`${sub}__STOP`] || "",
                                            (val) =>
                                                setLocalTags({ ...localTags, [`${sub}__STOP`]: val }),
                                            allTags,
                                            "STOP (WRITE)",
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ maxWidth: "320px", margin: "0 auto" }}>
                            {renderTagSelect(
                                localTags[`${data.targetId}__MONITOR`] || "",
                                (val) =>
                                    setLocalTags({
                                        ...localTags,
                                        [`${data.targetId}__MONITOR`]: val,
                                    }),
                                allTags,
                                "MONITORING POINT (READ)",
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "16px 24px",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        gap: "12px",
                        justifyContent: "flex-end",
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "transparent",
                            color: "#94a3b8",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        CANCEL
                    </button>
                    <button
                        disabled={saving}
                        onClick={() => onSave(localTags, data)}
                        style={{
                            padding: "10px 24px",
                            borderRadius: "8px",
                            border: "none",
                            background: saving ? "#475569" : "#3b82f6",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            opacity: saving ? 0.6 : 1,
                        }}
                    >
                        {saving ? "SAVING..." : "CONFIRM MAPPING"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

function RawWaterPage() {
    const initSocket = usePlcStore(state => state.initSocket)
    const tags = usePlcStore(state => state.tags)

    const [activeTab, setActiveTab] = useState('overview');
    const [viewMode, setViewMode] = useState('process')
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)
    const svgRef = useRef(null)
    const [coords, setCoords] = useState({ x: 0, y: 0 })

    // --- PLC CONFIG STATE ---
    const [configMode, setConfigMode] = useState(false);
    const [tagEdit, setTagEdit] = useState(null);
    const [tagMap, setTagMap] = useState({});
    const [availableTags, setAvailableTags] = useState([]);
    const [savingTags, setSavingTags] = useState(false);
    const [liveValues, setLiveValues] = useState({});

    const {
        isPickerMode,
        isPathMode,
        paths,
        activePathIndex,
        setActivePathIndex,
        addNewPath,
        updatePoint,
        addPointToPath,
        deletePoint,
        radius,
        setRadius,
    } = useCoordinatePicker()

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString())
        }, 1000)

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)

        return () => {
            clearInterval(timer)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [])

    const handleCanvasClick = (e) => { }

    const handleMouseMove = (e) => {
        const svg = svgRef.current
        if (!svg) return
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
        if (isPickerMode) {
            setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) })
        }
    }

    // Auth helper
    const authHeaders = () => {
        const token = localStorage.getItem("kip_token");
        return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                setConfigMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const tagIdToName = useMemo(() => {
        const map = {};
        availableTags.forEach((t) => { map[t.id] = t.tag_name; });
        return map;
    }, [availableTags]);

    useEffect(() => {
        const fetchAvailableTags = async () => {
            try {
                const res = await fetch("/api/raw-water-treatment/plc-config/tags", { headers: authHeaders() });
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
                const res = await fetch("/api/raw-water-treatment/plc-config/station-mappings/RAW_WATER_TREATMENT", { headers: authHeaders() });
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

    const fetchLiveValues = useCallback(async () => {
        try {
            const res = await fetch("/api/raw-water-treatment/plc-config/tags-live", { headers: authHeaders() });
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
        const tagData = tags[tagName];
        if (tagData && tagData.value !== undefined) return tagData.value;
        if (liveValues[tagName] !== undefined) return liveValues[tagName];
        return null;
    }, [tagMap, tagIdToName, tags, liveValues]);

    const lv = (cardId, signalKey = "MONITOR", fallback, decimals = 1) => {
        const tagId = tagMap[`${cardId}__${signalKey}`];
        if (!tagId) return fallback;
        const v = getLiveValue(cardId, signalKey);
        if (v === null || v === undefined) return "--";
        const num = parseFloat(v);
        if (isNaN(num)) return v;
        return num.toFixed(decimals);
    };

    const handleTagEditRequest = (e, id, subs = [], signals = null) => {
        if (e) e.stopPropagation();
        setTagEdit({ targetId: id, subs: subs || [], signals: signals || null, pos: { top: 0, left: 0 } });
    };

    const handleTagSave = async (updatedTags, editData) => {
        setSavingTags(true);
        try {
            const mappings = [];
            for (const [key, tagId] of Object.entries(updatedTags)) {
                if (!tagId) continue;
                const parts = key.split("__");
                if (parts.length !== 2) continue;
                mappings.push({ station: "RAW_WATER_TREATMENT", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
            }
            if (mappings.length > 0) {
                await fetch("/api/raw-water-treatment/plc-config/station-mappings", {
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
        initSocket()
    }, [initSocket])

    const handleEquipmentClick = (id, subs = []) => {
        if (configMode) {
            handleTagEditRequest(id, subs, null);
            return;
        }
        console.log(`Equipment clicked: ${id}`);
    };

    return (
        <RawWaterErrorBoundary>
            <div className={`som-wtp-page som-mode-${viewMode}`}>
                <div className="som-station-header">
                    <div className="som-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h2 className="som-station-title" style={{ margin: 0, padding: 0 }}>Water Treatment (WTP)</h2>
                        <div className="som-header-divider" style={{ width: '2px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 8px' }}></div>
                        <div className="som-station-tabs" style={{ margin: 0, padding: 0 }}>
                            <button className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>OVERVIEW</button>
                        </div>
                    </div>

                    <div className={`som-dev-config-toggle ${configMode ? 'active' : ''}`} onClick={() => setConfigMode(!configMode)} style={{ position: 'absolute', top: '100px', right: '20px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(2, 6, 23, 0.8)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="toggle-text" style={{ color: '#f1f5f9', fontSize: '10px', fontWeight: 'bold' }}>{configMode ? 'Config Mode ON' : 'Config Mode'}</div>
                        <div className="som-boiler-status-indicator active" style={{ backgroundColor: configMode ? '#0f172a' : '#ffdb3b', width: '8px', height: '8px', borderRadius: '50%' }}></div>
                    </div>

                    <div className="som-view-toggle-container" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
                        <button className={`som-view-btn ${viewMode === 'maintenance' ? 'active' : ''}`} onClick={() => setViewMode('maintenance')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            MAINTENANCE VIEW
                            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
                        </button>
                        <button className={`som-view-btn ${viewMode === 'setting' ? 'active' : ''}`} onClick={() => setViewMode('setting')} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
                    </div>
                </div>

                <main className="som-wtp-content">
                    {viewMode === 'setting' ? (
                        <div style={{ flex: 1, height: '100%', overflowY: 'auto', background: '#f8fafc' }}>
                            <SettingsView stationSlug="raw-water-treatment" stationTitle="Water Treatment Station (WTP)" />
                        </div>
                    ) : (
                        <>
                            <div className="som-boiler-flow-card" style={{ flex: 1, height: '100%', width: '100%', position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>
                                <div className="som-boiler-flow-body" style={{ width: '100%', height: '100%', position: 'relative' }}>
                                    <svg
                                        ref={svgRef}
                                        viewBox="0 0 2000 1100"
                                        className="station-svg-canvas"
                                        preserveAspectRatio="xMidYMid slice"
                                        onClick={handleCanvasClick}
                                        onMouseMove={handleMouseMove}
                                        style={{ cursor: isPickerMode ? 'crosshair' : 'default' }}
                                    >
                                        <defs>
                                            <filter id="pipeGlow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feGaussianBlur stdDeviation="2" result="blur" />
                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                            </filter>
                                            <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                                                <feGaussianBlur stdDeviation="2.5" result="glow" />
                                                <feMerge>
                                                    <feMergeNode in="glow" />
                                                    <feMergeNode in="glow" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        <image href={rawWaterImage} width="2000" height="1000" />

                                        {/* ── Water Flow: Animated Circle Dots ── */}
                                        {/* Pump 1 → Sand Filter (kiri bawah ke atas) */}
                                        <FlowDots length={101} path="M 295,776 L 294,750 Q 294,725 319,724 L 344,723" />
                                        {/* Sand Filter loop (kanan bawah) */}
                                        <FlowDots length={200} path="M 362,691 Q 362,675 378,675 L 448,675 Q 464,675 464,691 L 464,770" />
                                        {/* Vertical main pipe (kanan atas ke bawah = masuk ke bawah) */}
                                        <FlowDots length={582} path="M 1519,782 L 1520,277 Q 1520,252 1545,254 L 1572,256" />
                                        {/* Horizontal short pipe */}
                                        <FlowDots length={38} path="M 1453,851 L 1491,849" />
                                        {/* Vertical pipe tengah */}
                                        <FlowDots length={141} path="M 1258,527 L 1259,668" />
                                        {/* Horizontal ke vertical (upper section) */}
                                        <FlowDots length={206} path="M 1167,319 L 1231,320 Q 1256,321 1257,346 L 1259,438" />
                                        {/* Aliran khusus ke clarifier (lebih cepat) */}
                                        <FlowDots length={510} speed={80} path="M 732,724 L 929,725 Q 954,725 954,700 L 954,407" />
                                        {/* Pump 2 → kiri tengah */}
                                        <FlowDots length={98} path="M 649,788 L 650,749 Q 651,729 671,727 L 690,725" />
                                        {/* Right side long path */}
                                        <FlowDots length={557} path="M 1843,412 L 1853,414 Q 1863,416 1863,426 L 1865,810 Q 1865,835 1890,835 L 1983,835" />




                                        {/* ─── MAINTENANCE BANNER ─── */}
                                        {viewMode === 'maintenance' && (
                                            <foreignObject x="700" y="20" width="600" height="60" style={{ overflow: 'visible' }}>
                                                <div className="som-diagnostic-banner">TECHNICAL DIAGNOSTIC ACTIVE</div>
                                            </foreignObject>
                                        )}

                                        {/* ══════════════════════════════════════════
                                    LEFT PANEL — DASHBOARD SUMMARY
                                ══════════════════════════════════════════ */}
                                        <foreignObject x="30" y="200" width="300" height="500" style={{ overflow: 'visible' }}>
                                            <div className="som-boiler-mini-card" style={{ minWidth: '310px', borderTop: '3px solid #3b82f6', transform: 'scale(0.7)', transformOrigin: 'top left' }}>
                                                <div className="som-station-header">
                                                    <span className="som-boiler-mini-tag">DASHBOARD SUMMARY</span>
                                                </div>
                                                <div className="som-boiler-mini-body">

                                                    {/* LEVEL */}
                                                    <div className="som-summary-section">
                                                        <div className="som-section-label">LEVEL MONITORING</div>
                                                        <div className="som-level-grid">
                                                            <div className="som-level-item">
                                                                <span className="som-level-label">River Water Level</span>
                                                                <span className="som-level-value">150<small>cm</small></span>
                                                            </div>
                                                            <div className="som-level-item">
                                                                <span className="som-level-label">Water Catchment Pond #1</span>
                                                                <span className="som-level-value">1,890<small>cm</small></span>
                                                            </div>
                                                            <div className="som-level-item">
                                                                <span className="som-level-label">Water Catchment Pond #2</span>
                                                                <span className="som-level-value">4,950<small>cm</small></span>
                                                            </div>
                                                            <div className="som-level-item">
                                                                <span className="som-level-label">Water Catchment Pond #3</span>
                                                                <span className="som-level-value">4,500<small>cm</small></span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* CHEMICAL DOSING */}
                                                    <div className="som-summary-section">
                                                        <div className="som-section-label">CHEMICAL DOSING</div>
                                                        <div className="som-dosing-list">
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Soda Ash dosing</span>
                                                                <span className="som-dosing-value">0.15<small className="som-dosing-unit">ppm</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Alum dosing</span>
                                                                <span className="som-dosing-value">0.50<small className="som-dosing-unit">ppm</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">PAC dosing</span>
                                                                <span className="som-dosing-value">0.25<small className="som-dosing-unit">ppm</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Polymer dosing</span>
                                                                <span className="som-dosing-value">0.01<small className="som-dosing-unit">ppm</small></span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* SAND FILTER STATUS */}
                                                    <div className="som-summary-section" style={{ marginBottom: 0 }}>
                                                        <div className="som-section-label">SAND FILTER STATUS</div>
                                                        <div className="som-dosing-list">
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Sand Filter #1</span>
                                                                <span className="som-dosing-value" style={{ color: '#10b981', fontSize: '12px' }}>Running</span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Sand Filter #2</span>
                                                                <span className="som-dosing-value" style={{ color: '#10b981', fontSize: '12px' }}>Running</span>
                                                            </div>
                                                            <div className="som-dosing-item" style={{ borderBottom: 'none' }}>
                                                                <span className="som-dosing-label">Sand Filter #3</span>
                                                                <span className="som-dosing-value" style={{ color: '#f59e0b', fontSize: '12px' }}>Backwash</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </foreignObject>

                                        {/* ══════════════════════════════════════════
                                    FLOW-RATE PANEL
                                ══════════════════════════════════════════ */}
                                        <foreignObject x="270" y="200" width="300" height="420" style={{ overflow: 'visible' }}>
                                            <div className="som-boiler-mini-card" style={{ minWidth: '310px', borderTop: '3px solid #3b82f6', transform: 'scale(0.7)', transformOrigin: 'top left' }}>
                                                <div className="som-station-header">
                                                    <span className="som-boiler-mini-tag">FLOW-RATE MONITORING</span>
                                                </div>
                                                <div className="som-boiler-mini-body">
                                                    <div className="som-summary-section">
                                                        <div className="som-section-label">PUMP FLOW RATES</div>
                                                        <div className="som-dosing-list">
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">River water pump</span>
                                                                <span className="som-dosing-value">120<small className="som-dosing-unit">m3/hr</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Raw Water Pump #1</span>
                                                                <span className="som-dosing-value">68.00<small className="som-dosing-unit">m3/hr</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label" style={{ color: '#64748b' }}>Raw Water Pump #2</span>
                                                                <span className="som-dosing-value" style={{ color: '#475569' }}>—.00<small className="som-dosing-unit">m3/hr</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Sand filter pump #1</span>
                                                                <span className="som-dosing-value">45.59<small className="som-dosing-unit">m3/hr</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label" style={{ color: '#64748b' }}>Sand filter pump #1</span>
                                                                <span className="som-dosing-value" style={{ color: '#475569' }}>—.00<small className="som-dosing-unit">m3/hr</small></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="som-summary-section" style={{ marginBottom: 0 }}>
                                                        <div className="som-section-label">CHEMICAL FLOWS</div>
                                                        <div className="som-dosing-list">
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Soda Ash dosing</span>
                                                                <span className="som-dosing-value">50.00<small className="som-dosing-unit">L/hr</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">Alum dosing</span>
                                                                <span className="som-dosing-value">50.00<small className="som-dosing-unit">L/hr</small></span>
                                                            </div>
                                                            <div className="som-dosing-item">
                                                                <span className="som-dosing-label">PAC</span>
                                                                <span className="som-dosing-value">50.00<small className="som-dosing-unit">L/hr</small></span>
                                                            </div>
                                                            <div className="som-dosing-item" style={{ borderBottom: 'none' }}>
                                                                <span className="som-dosing-label">Polymer</span>
                                                                <span className="som-dosing-value">50.00<small className="som-dosing-unit">L/hr</small></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </foreignObject>

                                        {/* ══════════════════════════════════════════
                                    AREA LABELS — SUNGAI, WADRUK, CLARIFIER, etc.
                                ══════════════════════════════════════════ */}

                                        {/* SUNGAI label */}
                                        <AreaLabel x="185" y="760" text="SUNGAI" color="#39FF14" fontSize="14px" />
                                        <AreaLabel x="185" y="778" text="Pumps intake" color="#94a3b8" fontSize="11px" fontWeight="normal" />

                                        {/* WADUK label & sizes */}
                                        <AreaLabel x="100" y="810" text="WADUK" color="#39FF14" fontSize="13px" />
                                        <text x="80" y="830" fill="#39FF14" fontSize="12px" fontFamily="monospace">Waduk 1 : 0.34Ha x 4m = 13,600m³</text>
                                        <text x="80" y="850" fill="#39FF14" fontSize="12px" fontFamily="monospace">Waduk 2 : 0.38Ha x 4m = 15,200m³</text>
                                        <text x="80" y="870" fill="#39FF14" fontSize="12px" fontFamily="monospace">Waduk 3 : 1.00Ha x 4m = 40,000m³</text>

                                        {/* Depth labels near river intake */}
                                        <text x="298" y="700" fill="#94a3b8" fontSize="11px" fontFamily="monospace">4m</text>
                                        <text x="448" y="720" fill="#94a3b8" fontSize="11px" fontFamily="monospace">4m</text>

                                        {/* CLARIFIER label */}
                                        <AreaLabel x="950" y="330" text="CLARIFIER" color="#39FF14" fontSize="20px" />

                                        {/* SAND FILTER label */}
                                        <AreaLabel x="1260" y="490" text="SAND FILTER" color="#39FF14" fontSize="20px" />

                                        {/* TREATED WATER TANK label */}
                                        <AreaLabel x="1300" y="790" text="TREATED WATER TANK" color="#39FF14" fontSize="20px" />

                                        {/* OVERHEAD TANK label */}
                                        <AreaLabel x="1700" y="510" text="OVERHEAD TANK" color="#39FF14" fontSize="20px" />

                                        {/* ══════════════════════════════════════════
                                    TREATED WATER SUPPLY (TOP RED CARD)
                                ══════════════════════════════════════════ */}
                                        <foreignObject x="1270" y="190" width="290" height="110" style={{ overflow: 'visible' }}>
                                            <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="TREATED WATER SUPPLY" params={[{ label: 'FLOW', value: '45.69', unit: 'm3/hr' }]} />
                                        </foreignObject>

                                        {/* ══════════════════════════════════════════
                                    TDS CARD
                                ══════════════════════════════════════════ */}
                                        <foreignObject x="1270" y="280" width="160" height="100" style={{ overflow: 'visible' }}>
                                            <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="TDS" params={[{ label: 'VALUE', value: '254', unit: 'PPM' }]} />
                                        </foreignObject>

                                        {/* ══════════════════════════════════════════
                                    TURBIDITY CARD
                                ══════════════════════════════════════════ */}
                                        <foreignObject x="1270" y="370" width="160" height="100" style={{ overflow: 'visible' }}>
                                            <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="TURBIDITY" params={[{ label: 'VALUE', value: '6.89', unit: 'NTU' }]} />
                                        </foreignObject>

                                        {/* ══════════════════════════════════════════
                                    WATER LEVEL (OVERHEAD TANK)
                                ══════════════════════════════════════════ */}
                                        <foreignObject x="1650" y="290" width="190" height="100" style={{ overflow: 'visible' }}>
                                            <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="WATER LEVEL" params={[{ label: 'LEVEL', value: '92', unit: '%' }]} />
                                        </foreignObject>

                                        {/* ══════════════════════════════════════════
                                    SAND FILTER PUMP
                                ══════════════════════════════════════════ */}
                                        {viewMode === 'process' ? (
                                            <g>
                                                {/* RIVER PUMP */}
                                                <foreignObject x="200" y="620" width="160" height="100" style={{ overflow: 'visible' }}>
                                                    <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="RIVER PUMP" params={[{ label: 'LOAD', value: '18.01', unit: 'A' }]} />
                                                </foreignObject>
                                                {/* RAW WATER PUMP */}
                                                <foreignObject x="460" y="600" width="165" height="100" style={{ overflow: 'visible' }}>
                                                    <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="RAW WATER PUMP" params={[{ label: 'LOAD', value: '16.01', unit: 'A' }]} />
                                                </foreignObject>
                                                {/* SAND FILTER PUMP */}
                                                <foreignObject x="1100" y="790" width="175" height="100" style={{ overflow: 'visible' }}>
                                                    <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="SAND FLT PUMP" params={[{ label: 'LOAD', value: '13.01', unit: 'A' }]} />
                                                </foreignObject>
                                            </g>
                                        ) : (
                                            <g>
                                                <MaintenanceCardSVG isEditable={configMode} onTagEdit={handleTagEditRequest} x={230} y={590} id="m-rivpump" label="M-RIVER_PUMP" params={[{ label: 'AMP', value: '18.0', unit: 'A' }, { label: 'VIB', value: '1.1', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                                                <MaintenanceCardSVG isEditable={configMode} onTagEdit={handleTagEditRequest} x={460} y={660} id="m-rawpump" label="M-RAW_PUMP" params={[{ label: 'AMP', value: '16.0', unit: 'A' }, { label: 'VIB', value: '0.9', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                                                <MaintenanceCardSVG isEditable={configMode} onTagEdit={handleTagEditRequest} x={1100} y={830} id="m-sandpump" label="M-SAND_PUMP" params={[{ label: 'AMP', value: '13.0', unit: 'A' }, { label: 'VIB', value: '0.8', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                                            </g>
                                        )}

                                        {/* ══════════════════════════════════════════
                                    RIGHT SIDE — PROCESS / BOILER / DOMESTIC
                                ══════════════════════════════════════════ */}

                                        {/* DOMESTIC */}
                                        <foreignObject x="1650" y="650" width="195" height="100" style={{ overflow: 'visible' }}>
                                            <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="DOMESTIC" params={[{ label: 'FLOW', value: '13.60', unit: 'm3/hr' }]} />
                                        </foreignObject>

                                        {/* PROCESS */}
                                        <foreignObject x="1650" y="725" width="195" height="100" style={{ overflow: 'visible' }}>
                                            <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="PROCESS" params={[{ label: 'FLOW', value: '3.80', unit: 'm3/hr' }]} />
                                        </foreignObject>

                                        {/* BOILER */}
                                        <foreignObject x="1650" y="800" width="195" height="100" style={{ overflow: 'visible' }}>
                                            <BoilerMachineCard configMode={configMode} onTagEdit={handleTagEditRequest} title="BOILER" params={[{ label: 'FLOW', value: '22.40', unit: 'm3/hr' }]} />
                                        </foreignObject>

                                        {/* PUMP RUN SVG OVERLAYS — subtle overlay on background pump graphics */}
                                        {/* River Pump */}
                                        <image
                                            href={pumpRunSvg}
                                            x={344}
                                            y={690}
                                            width="42"
                                            height="50"
                                            style={{ pointerEvents: 'none', opacity: 0.35, mixBlendMode: 'multiply' }}
                                        />
                                        {/* Raw Water Pump */}
                                        <image
                                            href={pumpRunSvg}
                                            x={696}
                                            y={705}
                                            width="34"
                                            height="40"
                                            style={{ pointerEvents: 'none', opacity: 0.35, mixBlendMode: 'multiply' }}
                                        />
                                        {/* Sand Filter Pump */}
                                        <image
                                            href={pumpRunSvg}
                                            x={1495}
                                            y={796}
                                            width="50"
                                            height="60"
                                            style={{ pointerEvents: 'none', opacity: 0.35, mixBlendMode: 'multiply' }}
                                        />



                                        {/* ══════════════════════════════════════════
                                    AUTOMATED SLUDGE BLOWDOWN label
                                ══════════════════════════════════════════ */}
                                        <foreignObject x="820" y="730" width="150" height="50" style={{ overflow: 'visible' }}>
                                            <div style={{
                                                border: '1px solid #f59e0b',
                                                background: 'rgba(245,158,11,0.1)',
                                                borderRadius: '4px',
                                                padding: '4px 6px',
                                                textAlign: 'center'
                                            }}>
                                                <span style={{ color: '#fbbf24', fontSize: '9px', fontFamily: 'monospace', lineHeight: '1.4', display: 'block' }}>
                                                    Automated<br />sludge blowdown
                                                </span>
                                            </div>
                                        </foreignObject>

                                        {/* Interactive Paths */}
                                        {paths.map((path, pIdx) => (
                                            <InteractivePath
                                                key={pIdx}
                                                points={path}
                                                radius={radius}
                                                isPickerMode={isPickerMode}
                                                isActive={isPickerMode && pIdx === activePathIndex}
                                                onSelect={() => isPickerMode && setActivePathIndex(pIdx)}
                                                onPointDrag={(ptIdx, x, y) => updatePoint(pIdx, ptIdx, x, y)}
                                                onAddPoint={(insertIdx, x, y) => addPointToPath(pIdx, insertIdx, x, y)}
                                                onPointDelete={(ptIdx) => deletePoint(pIdx, ptIdx)}
                                            />
                                        ))}

                                        {isPickerMode && <CrosshairOverlay coords={coords} />}
                                    </svg>
                                </div>
                            </div>

                            {isPickerMode && <PickerBanner pinCount={0} isPathMode={isPathMode} />}
                            {isPickerMode && (
                                <CoordinatePanel
                                    paths={paths}
                                    activePathIndex={activePathIndex}
                                    onSelectPath={setActivePathIndex}
                                    onAddNewPath={addNewPath}
                                    onUpdatePoint={updatePoint}
                                    onAddPoint={addPointToPath}
                                    onDeletePoint={deletePoint}
                                    radius={radius}
                                    setRadius={setRadius}
                                />
                            )}
                        </>
                    )}
                </main>

                {/* Tag Editor Modal */}
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
            </div>
        </RawWaterErrorBoundary>
    )
}


class RawWaterErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', background: 'darkred', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'auto' }}>
                    <h1>Wait, React Crashed here!</h1>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{this.state.error && this.state.error.toString()}</pre>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{this.state.error && this.state.error.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default RawWaterPage
