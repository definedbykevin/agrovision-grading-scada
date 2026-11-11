import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import "./OilClarificationPage.css";
import pompaAtasSvg from "./assets/pompa_atas.svg";
import pompaKananSvg from "./assets/pompa_kanan.svg";
import motorSvg from "./assets/motor.svg";
import valveAtasSvg from "./assets/valve_atas.svg";
import valveKiriSvg from "./assets/valve_kiri.svg";
import valveKananSvg from "./assets/valve_kanan.svg";
import pipeVertSvg from "./assets/pipe_vert.svg";
import pipeHoriSvg from "./assets/pipe_hori.svg";
import oilClarificationRoomImg from "./assets/oil_clarification_room.webp";
import oilRecoveryImg from "./assets/oil_recovery.webp";
import waterGif from "./assets/water.gif";
import { LiquidFlowSVG } from "./components/OilClarificationComponents.jsx";

import OilClarificationOverviewTab from './tabs/OilClarificationOverview/OilClarificationOverviewTab.jsx';
import OilRecoveryTab from './tabs/OilRecovery/OilRecoveryTab.jsx';

// -------------------------------------------------------
// Auth helper & TagEditorModal
// -------------------------------------------------------
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
                position: "fixed",
                top: 0, left: 0, right: 0, bottom: 0
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
                                display: "block"
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

                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
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

// -------------------------------------------------------
// Equipment image overlay inside SVG
// -------------------------------------------------------
export const EquipmentImageSVG = ({ src, x, y, width = 100, height = 100, preserveAspect = true, isRunning }) => {
    const filter = isRunning == null ? undefined : isRunning ? "url(#tint-green)" : "url(#tint-red)";
    return (
        <image
            href={src}
            x={x}
            y={y}
            width={width}
            height={height}
            preserveAspectRatio={preserveAspect ? "xMidYMid meet" : "none"}
            style={{ pointerEvents: "none", filter }}
        />
    );
};

export const DefsOverlay = () => (
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
);

// -------------------------------------------------------
// Big text labels (SCADA style)
// -------------------------------------------------------
export const OCLabelSVG = ({ x, y, label, fontSize = "18px", hasOutline = false }) => {
    const lines = String(label).split("\n");
    return (
        <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="som-oc-label-svg-text"
            style={{
                pointerEvents: "none",
                fontSize,
                paintOrder: "stroke fill",
                stroke: hasOutline ? "#FFFFFF" : "none",
                strokeWidth: hasOutline ? "3px" : "0",
                strokeLinejoin: "round",
            }}
        >
            {lines.map((line, i) => (
                <tspan key={i} x={x} dy={i === 0 ? 0 : "1.1em"}>{line}</tspan>
            ))}
        </text>
    );
};

// -------------------------------------------------------
// Vibration Screen label
// -------------------------------------------------------
export const VibScreenLabel = ({ x, y, number, fontSize = "12px" }) => (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
        className="som-oc-label-svg-text" style={{ fontSize, fontWeight: "900" }}>
        <tspan x={x} dy="0.1em">VIBRATION</tspan>
        <tspan x={x} dy="1.2em">SCREEN {number}</tspan>
    </text>
);

// -------------------------------------------------------
// Mini Process Card (foreignObject)
// NOTE: x/y is CENTER of card. foreignObject anchors at x-65, y-80
// -------------------------------------------------------
export const OCCardSVG = ({ x, y, id, label, values = [], status = null, isRunning = true, onClick, scale = 1, isEditable }) => (
    <g id={id} className={`svg-equipment ${isRunning ? "motor-on" : "motor-off"}`} onClick={() => onClick && onClick(id)} transform={`translate(${x}, ${y}) scale(${scale}) translate(${-x}, ${-y})`} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
        <foreignObject x={x - 65} y={y - 80} width="130" height="260" style={{ overflow: "visible" }}>
            <div className={`som-oc-mini-card ${isEditable ? 'som-editable' : ''}`}>
                <div className="som-oc-mini-header">
                    <span className="som-oc-mini-label">{label}</span>
                    <svg className="som-oc-gear-icon" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </div>
                <div className="som-oc-mini-body">
                    {values.map((v, i) => (
                        <div key={i} className="som-oc-param-row">
                            <span className="som-oc-param-label">{v.label}</span>
                            <span className={`som-oc-mini-value ${v.type === "temp" ? "temp" : ""}`} data-unit={v.unit}>
                                {v.value}
                            </span>
                        </div>
                    ))}
                    {status && (
                        <div className={`som-oc-mini-status ${isRunning ? "status-running" : "status-stop"}`}>
                            {status}
                        </div>
                    )}
                </div>
            </div>
        </foreignObject>
    </g>
);

// -------------------------------------------------------
// Mini Maintenance Card (foreignObject)
// -------------------------------------------------------
export const MaintenanceCardSVG = ({ x, y, id, label, params = [], onClick, width = 130, isEditable }) => (
    <g id={id} className="svg-equipment motor-group" onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
        <foreignObject x={x - width / 2} y={y - 40} width={width} height="180" style={{ overflow: "visible" }}>
            <div className={`som-maintenance-mini-card ${isEditable ? 'som-editable' : ''}`}>
                <div className="som-maintenance-mini-header">
                    <div className="som-maintenance-mini-title">{label}</div>
                </div>
                <div className="som-maintenance-mini-body">
                    {params.map((p, idx) => (
                        <div key={idx} className="som-maintenance-mini-row">
                            <span className="som-maintenance-mini-row-label">{p.label}</span>
                            <span className="som-maintenance-mini-row-value">
                                {p.value} <small>{p.unit}</small>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </foreignObject>
    </g>
);

// -------------------------------------------------------
// Main Page Component
// -------------------------------------------------------
function OilClarificationPage({ user }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [viewMode, setViewMode] = useState("process");
    const [coords, setCoords] = useState({ x: 0, y: 0 });

    const svgRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!svgRef.current) return;
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) });
    };

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
                const res = await fetch("/api/oil-clarification/plc-config/tags", { headers: authHeaders() });
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
                const res = await fetch("/api/oil-clarification/plc-config/station-mappings/OIL-CLARIFICATION", { headers: authHeaders() });
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
            const res = await fetch("/api/oil-clarification/plc-config/tags-live", { headers: authHeaders() });
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

    const handleTagEditRequest = (id, subs = [], signals = null) => {
        setTagEdit({ targetId: id, subs, signals, pos: { top: 0, left: 0 } });
    };

    const handleTagSave = async (updatedTags, editData) => {
        setSavingTags(true);
        try {
            const mappings = [];
            for (const [key, tagId] of Object.entries(updatedTags)) {
                if (!tagId) continue;
                const parts = key.split("__");
                if (parts.length !== 2) continue;
                mappings.push({ station: "OIL-CLARIFICATION", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
            }
            if (mappings.length > 0) {
                await fetch("/api/oil-clarification/plc-config/station-mappings", {
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

    const handleEquipmentClick = (id, subs = []) => {
        if (configMode) {
            handleTagEditRequest(id, subs, null);
            return;
        }
        console.log(`Equipment clicked: ${id}`);
    };

    return (
        <div className={`som-clarification-page som-mode-${viewMode}`}>
            <header className="som-oc-header">
                <div className="som-header-left">
                    <h2 className="som-oc-title">OIL CLARIFICATION ROOM</h2>
                    <div className="som-oc-sub-nav">
                        <button
                            className={`som-oc-nav-btn ${activeTab === "overview" ? "active" : ""}`}
                            onClick={() => setActiveTab("overview")}
                        >
                            Oil Clarification
                        </button>
                        <button
                            className={`som-oc-nav-btn ${activeTab === "recovery" ? "active" : ""}`}
                            onClick={() => setActiveTab("recovery")}
                        >
                            Oil Recovery
                        </button>
                        <button
                            className={`som-oc-nav-btn ${activeTab === "purification" ? "active" : ""}`}
                            onClick={() => setActiveTab("purification")}
                        >
                            Oil Purification
                        </button>
                        <button
                            className={`som-oc-nav-btn ${activeTab === "storage" ? "active" : ""}`}
                            onClick={() => setActiveTab("storage")}
                        >
                            Storage & Dispatch
                        </button>
                    </div>
                </div>

                <div className="som-view-toggle-container" style={{ marginLeft: "auto", marginRight: "1rem" }}>
                    <button
                        className={`som-view-btn ${viewMode === "process" ? "active" : ""}`}
                        onClick={() => setViewMode("process")}
                    >
                        PROCESS VIEW
                    </button>
                    <button
                        className={`som-view-btn ${viewMode === "maintenance" ? "active" : ""}`}
                        disabled
                        style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        MAINTENANCE VIEW
                        <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
                    </button>
                </div>
            </header>

            <main className="som-oc-main">
                {/* 
                  LAYOUT LOGIC:
                  - .som-oc-scada-container fills all remaining space
                  - Inside is a single .som-oc-stage div that acts as the 1920x1080 canvas
                  - The stage is scaled down via CSS transform: scale() to fit the container
                  - Both image and SVG live inside the stage at fixed 1920x1080 size
                  - This ensures perfect alignment at any window size without JS tracking
                */}
                <div className="som-oc-scada-container">
                    <div className="som-oc-stage-wrapper">
                        <div className="som-oc-stage">
                            {/* Background image fills the stage */}
                            <img
                                src={activeTab === "overview" ? oilClarificationRoomImg : oilRecoveryImg}
                                alt="Oil Clarification Process"
                                className="som-oc-scada-img"
                            />

                            {/* SVG overlay — same size as stage, coordinates match 1:1 */}
                            <svg
                                ref={svgRef}
                                viewBox="0 0 1920 1080"
                                className="station-svg-canvas"
                                preserveAspectRatio="none"
                                onMouseMove={handleMouseMove}
                            >
                                <DefsOverlay />
                                {/* Maintenance diagnostic banner */}
                                {viewMode === "maintenance" && (
                                    <foreignObject x="660" y="20" width="600" height="60" style={{ overflow: "visible" }}>
                                        <div className="som-diagnostic-banner">TECHNICAL DIAGNOSTIC ACTIVE</div>
                                    </foreignObject>
                                )}

                                {activeTab === "overview" && <OilClarificationOverviewTab viewMode={viewMode} configMode={configMode} handleEquipmentClick={handleEquipmentClick} lv={lv} />}
                                {activeTab === "recovery" && <OilRecoveryTab viewMode={viewMode} configMode={configMode} handleEquipmentClick={handleEquipmentClick} lv={lv} />}
                            </svg>
                        </div>
                    </div>
                </div>
            </main>
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
    );
}

export default OilClarificationPage;
