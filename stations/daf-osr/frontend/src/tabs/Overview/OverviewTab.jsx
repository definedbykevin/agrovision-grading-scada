import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import usePlcStore from '@core/store';
import './OverviewTab.css';
import dafStationBg from '../../assets/DAF-station.webp';
import motorImg from '../../assets/item/motor.webp';
import valvePneumaticActuatorImg from '../../assets/item/valve_pneumatic_actuator.webp';
import valveProportionalImg from '../../assets/item/valve_proportional.webp';
// import dafPumpImg from '../../assets/item/pump.webp';
import { DafStatusPanelSVG, DafTagMonitorCardSVG, EquipmentIconSVG } from '../../components/SharedComponents.jsx';

const authHeaders = () => {
    const token = localStorage.getItem("kip_token");
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

/**
 * TagEditorModal — Modal popup untuk mapping tag PLC ke equipment / card
 */
const TagEditorModal = ({
    data,
    onClose,
    onSave,
    tagMap = {},
    availableTags = [],
    saving = false,
}) => {
    const [localTags, setLocalTags] = useState({});

    useEffect(() => {
        if (data) {
            const initial = {};
            if (data.signals && data.signals.length > 0) {
                data.signals.forEach((sig) => {
                    const key = `${data.targetId}__${sig.key}`;
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
                    initial[`${data.targetId}__MONITOR`] = tagMap[`${data.targetId}__MONITOR`] || "";
                }
            }
            setLocalTags(initial);
        }
    }, [data, tagMap]);

    if (!data) return null;

    const hasSignals = data.signals && data.signals.length > 0;

    const renderTagSelect = (value, onChange, tagList, label) => (
        <div className="tag-field" style={{ marginBottom: 0 }}>
            <label
                style={{
                    fontSize: "10.5px",
                    fontWeight: 800,
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
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#0f172a",
                    color: "#e2e8f0",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                }}
            >
                <option value="" style={{ background: "#0f172a", color: "#94a3b8" }}>— No Tag —</option>
                {tagList.map((tag) => (
                    <option key={tag.id} value={tag.id} style={{ background: "#0f172a", color: "#e2e8f0" }}>
                        {tag.tag_name} {tag.data_type ? `(${tag.data_type})` : ""}
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
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 10000,
                background: "rgba(2, 6, 23, 0.85)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: "8vh",
            }}
        >
            <div
                className="som-equipment-control-popup som-tag-edit-popup"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "450px",
                    maxHeight: "85vh",
                    background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
                    borderRadius: "16px",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        padding: "18px 24px",
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
                                color: "#f8fafc",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            ⚙️ PLC Tag Configuration
                        </h2>
                        <span
                            style={{
                                fontSize: "11px",
                                color: "#94a3b8",
                                marginTop: "3px",
                                display: "block",
                            }}
                        >
                            Hardware Mapping: <strong style={{ color: "#38bdf8" }}>{data.targetId}</strong>
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "#94a3b8",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 700,
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        padding: "20px 24px",
                        overflowY: "auto",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}
                >
                    {hasSignals ? (
                        data.signals.map((sig) => (
                            <div key={sig.key}>
                                {renderTagSelect(
                                    localTags[`${data.targetId}__${sig.key}`] || "",
                                    (val) =>
                                        setLocalTags({
                                            ...localTags,
                                            [`${data.targetId}__${sig.key}`]: val,
                                        }),
                                    availableTags,
                                    sig.label
                                )}
                            </div>
                        ))
                    ) : (
                        <div>
                            {renderTagSelect(
                                localTags[`${data.targetId}__MONITOR`] || "",
                                (val) =>
                                    setLocalTags({
                                        ...localTags,
                                        [`${data.targetId}__MONITOR`]: val,
                                    }),
                                availableTags,
                                "MONITORING POINT (READ)"
                            )}
                        </div>
                    )}
                </div>

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
                            padding: "9px 18px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.12)",
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
                        onClick={() => onSave(localTags)}
                        style={{
                            padding: "9px 22px",
                            borderRadius: "8px",
                            border: "none",
                            background: saving ? "#475569" : "#3b82f6",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            opacity: saving ? 0.6 : 1,
                            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
                        }}
                    >
                        {saving ? "SAVING..." : "CONFIRM MAPPING"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

function OverviewTab({ user, configMode: propConfigMode = false, onNavigateSettings }) {
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
    const [tagMap, setTagMap] = useState({});
    const [availableTags, setAvailableTags] = useState([]);
    const [tagEdit, setTagEdit] = useState(null);
    const [savingTags, setSavingTags] = useState(false);
    const [realtimeData, setRealtimeData] = useState({});
    const tags = usePlcStore((state) => state.tags);

    // 1. Load existing mappings from backend
    const loadMappings = useCallback(async () => {
        try {
            const res = await fetch('/api/daf-osr/plc-config/station-mappings/daf-osr', {
                headers: authHeaders(),
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    const map = {};
                    json.data.forEach((m) => {
                        map[`${m.equipment}__${m.signal_key}`] = m.tag_id;
                    });
                    setTagMap(map);
                }
            }
        } catch (err) {
            console.error('[OverviewTab] Failed to load station mappings:', err);
        }
    }, []);

    // 2. Fetch available tags from backend
    const fetchAvailableTags = useCallback(async () => {
        try {
            const res = await fetch('/api/daf-osr/plc-config/tags', {
                headers: authHeaders(),
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setAvailableTags(json.data);
                }
            }
        } catch (err) {
            console.error('[OverviewTab] Failed to fetch available tags:', err);
        }
    }, []);

    useEffect(() => {
        loadMappings();
        fetchAvailableTags();
    }, [loadMappings, fetchAvailableTags]);

    // Auto re-fetch available tags whenever tagEdit modal opens
    useEffect(() => {
        if (tagEdit) {
            fetchAvailableTags();
        }
    }, [tagEdit, fetchAvailableTags]);

    // 3. HTTP poll fallback for realtime data
    useEffect(() => {
        let active = true;
        const fetchLive = async () => {
            try {
                const res = await fetch('/api/daf-osr/plc-config/tags-live', {
                    headers: authHeaders(),
                });
                if (res.ok) {
                    const json = await res.json();
                    if (active && json.success) {
                        setRealtimeData(json.data || {});
                    }
                }
            } catch (err) {
                /* ignore */
            }
        };

        fetchLive();
        const interval = setInterval(fetchLive, 500);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (!effectiveConfigMode) {
            setTagEdit(null);
        }
    }, [effectiveConfigMode]);

    // =========================================================================
    // LOGIC 1: Pengecekan Mapping Tag (Outline Border Biru / Merah di ConfigMode)
    // =========================================================================
    const checkMapping = useCallback((id, signals = null) => {
        if (!tagMap) return false;
        if (signals && signals.length > 0) {
            return signals.some((sig) => {
                const key = typeof sig === 'string' ? sig : sig.key;
                return Boolean(tagMap[`${id}__${key}`]);
            });
        }
        return Object.keys(tagMap).some((key) => key.startsWith(`${id}__`) && tagMap[key]);
    }, [tagMap]);

    const getDeveloperOutlineStyle = useCallback((id, signals = null, customStyle = {}) => {
        if (!effectiveConfigMode) return customStyle;
        const hasMapping = checkMapping(id, signals);
        return {
            ...customStyle,
            outline: hasMapping ? "2.5px solid #3b82f6" : "2.5px solid #ef4444",
            outlineOffset: "2px",
            boxShadow: hasMapping ? "0 0 6px rgba(59, 130, 246, 0.6)" : "0 0 6px rgba(239, 68, 68, 0.6)",
            cursor: "pointer",
        };
    }, [effectiveConfigMode, checkMapping]);

    // =========================================================================
    // LOGIC 2: Tampilan Nilai (No Tag / -- / Nilai Live dari PLC)
    // =========================================================================
    const getMappedValue = useCallback((equipment, signalKey) => {
        const key = `${equipment}__${signalKey}`;
        const tagId = tagMap ? tagMap[key] : null;

        // 1. Kalau belum mapping nilai yang tampil adalah No Tag
        if (!tagId) {
            return "no tag";
        }

        const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
        if (!tagObj) return "--";

        // Cek WebSocket store duluan, baru fallback ke realtimeData
        const liveValue = tags[tagObj.tag_name]?.value !== undefined
            ? tags[tagObj.tag_name].value
            : realtimeData[tagObj.tag_name];

        // 2. Kalau udah mapping tapi nilai belum masuk dari plc kasih "--"
        if (liveValue === undefined || liveValue === null || liveValue === "") {
            return "--";
        }

        // 3. Kalau nilai udah masuk tampilkan nilai itu
        const num = parseFloat(liveValue);
        if (!isNaN(num)) {
            return +(Math.round(num + "e+2") + "e-2");
        }
        return liveValue;
    }, [tagMap, availableTags, realtimeData, tags]);

    // =========================================================================
    // Click & Save Handlers untuk Mode PLC Integration
    // =========================================================================
    const handleEquipmentClick = (id, subs = [], signals = null) => {
        if (!effectiveConfigMode) return;
        fetchAvailableTags();
        setTagEdit({ targetId: id, subs, signals });
    };

    const handleTagSave = async (updatedTags) => {
        setSavingTags(true);
        try {
            const mappings = Object.entries(updatedTags)
                .map(([key, tagId]) => {
                    const [equipment, signal_key] = key.split('__');
                    return {
                        station: 'daf-osr',
                        equipment,
                        signal_key,
                        tag_id: tagId ? Number(tagId) : null,
                    };
                })
                .filter((mapping) => mapping.equipment && mapping.signal_key);

            if (mappings.length > 0) {
                const res = await fetch('/api/daf-osr/plc-config/station-mappings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders(),
                    },
                    body: JSON.stringify({ mappings }),
                });
                const result = await res.json();
                if (!res.ok || !result.success) {
                    throw new Error(result.error || result.message || 'Failed to save station mappings');
                }
            }

            setTagMap((prev) => ({ ...prev, ...updatedTags }));
            setTagEdit(null);
        } catch (err) {
            console.error('Failed to save tag mappings', err);
            alert('Failed to save PLC tag configuration.');
        } finally {
            setSavingTags(false);
        }
    };

    return (
        <div className="som-daf-station-layout">
            <div className="som-daf-station-flow-card">
                <div className="som-daf-station-flow-body">
                    <svg
                        viewBox="0 0 2400 1000"
                        className="station-svg-canvas"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {/* LAYER 1: BACKGROUND PROCESS DIAGRAM */}
                        <image
                            href={dafStationBg}
                            width="2400"
                            height="1000"
                            x="0"
                            y="0"
                            preserveAspectRatio="xMidYMid meet"
                        />

                        {/* LAYER 2: SCADA OVERLAY CARDS */}

                        {/* 1. AE TANK */}
                        <DafStatusPanelSVG
                            x={380}
                            y={400}
                            title="AE TANK"
                            width={140}
                            scale={1.15}
                            rows={[
                                { label: "", value: getMappedValue("ae_tank", "PRESSURE"), unit: "Bar" },
                            ]}
                            onClick={() => handleEquipmentClick("ae_tank", [], [
                                { key: "PRESSURE", label: "AE TANK PRESSURE (Bar)" },
                            ])}
                            style={getDeveloperOutlineStyle("ae_tank", ["PRESSURE"])}
                        />

                        {/* 2. WATER LEVEL */}
                        <DafStatusPanelSVG
                            x={820}
                            y={440}
                            title="WATER LEVEL"
                            width={150}
                            scale={1.10}
                            rows={[
                                { label: "PV", value: getMappedValue("water_level", "PV"), unit: "%" },
                                { label: "SV", value: getMappedValue("water_level", "SV"), unit: "%" },
                            ]}
                            onClick={() => handleEquipmentClick("water_level", [], [
                                { key: "PV", label: "WATER LEVEL PV (%)" },
                                { key: "SV", label: "WATER LEVEL SV (%)" },
                            ])}
                            style={getDeveloperOutlineStyle("water_level", ["PV", "SV"])}
                        />

                        {/* 3. CARD CHILLER */}
                        <DafStatusPanelSVG
                            x={1070}
                            y={440}
                            title="CHILLER"
                            width={160}
                            scale={1.2}
                            rows={[
                                { label: "INLET", value: getMappedValue("chiller", "INLET_TEMP"), unit: "°C" },
                                { label: "MID", value: getMappedValue("chiller", "MID_TEMP"), unit: "°C" },
                                { label: "OUTLET", value: getMappedValue("chiller", "OUTLET_TEMP"), unit: "°C" },
                            ]}
                            onClick={() => handleEquipmentClick("chiller", [], [
                                { key: "INLET_TEMP", label: "INLET TEMP (°C)" },
                                { key: "MID_TEMP", label: "MID TEMP (°C)" },
                                { key: "OUTLET_TEMP", label: "OUTLET TEMP (°C)" },
                            ])}
                            style={getDeveloperOutlineStyle("chiller", ["INLET_TEMP", "MID_TEMP", "OUTLET_TEMP"])}
                        />

                        {/* 4. AE INLET FLOW */}
                        <DafStatusPanelSVG
                            x={1330}
                            y={440}
                            title="AE INLET FLOW"
                            width={155}
                            scale={1.15}
                            rows={[
                                { label: "PV", value: getMappedValue("ae_inlet_flow", "PV"), unit: "m³/h" },
                                { label: "SV", value: getMappedValue("ae_inlet_flow", "SV"), unit: "m³/h" },
                            ]}
                            onClick={() => handleEquipmentClick("ae_inlet_flow", [], [
                                { key: "PV", label: "AE INLET FLOW PV (m³/h)" },
                                { key: "SV", label: "AE INLET FLOW SV (m³/h)" },
                            ])}
                            style={getDeveloperOutlineStyle("ae_inlet_flow", ["PV", "SV"])}
                        />

                        {/* 5. SKIMMER */}
                        <DafStatusPanelSVG
                            x={1580}
                            y={70}
                            title="SKIMMER"
                            width={145}
                            scale={1.15}
                            rows={[
                                { label: "SPEED", value: getMappedValue("skimmer", "SPEED"), unit: "Hz" },
                                { label: "CURRENT", value: getMappedValue("skimmer", "CURRENT"), unit: "A" },
                            ]}
                            onClick={() => handleEquipmentClick("skimmer", [], [
                                { key: "SPEED", label: "SKIMMER SPEED (Hz)" },
                                { key: "CURRENT", label: "SKIMMER CURRENT (A)" },
                            ])}
                            style={getDeveloperOutlineStyle("skimmer", ["SPEED", "CURRENT"])}
                        />

                        {/* 6. MT INLET FLOW */}
                        <DafStatusPanelSVG
                            x={1840}
                            y={320}
                            title="MT INLET FLOW"
                            width={155}
                            scale={1.15}
                            rows={[
                                { label: "PV", value: getMappedValue("mt_inlet_flow", "PV"), unit: "m³/h" },
                                { label: "SV", value: getMappedValue("mt_inlet_flow", "SV"), unit: "m³/h" },
                            ]}
                            onClick={() => handleEquipmentClick("mt_inlet_flow", [], [
                                { key: "PV", label: "MT INLET FLOW PV (m³/h)" },
                                { key: "SV", label: "MT INLET FLOW SV (m³/h)" },
                            ])}
                            style={getDeveloperOutlineStyle("mt_inlet_flow", ["PV", "SV"])}
                        />

                        {/* 7. MANUAL (SURPLUS VALVE - PV & SV) */}
                        <DafStatusPanelSVG
                            id={"surplusValve"}
                            x={740}
                            y={290}
                            title="MANUAL"
                            width={140}
                            scale={1.1}
                            rows={[
                                { label: "PV", value: getMappedValue("surplus_valve", "PV"), unit: "%" },
                                { label: "SV", value: getMappedValue("surplus_valve", "SV"), unit: "%" },
                            ]}
                            onClick={() => handleEquipmentClick("surplus_valve", [], [
                                { key: "PV", label: "SURPLUS VALVE PV (%)" },
                                { key: "SV", label: "SURPLUS VALVE SV (%)" },
                            ])}
                            style={getDeveloperOutlineStyle("surplus_valve", ["PV", "SV"])}
                        />

                        {/* 8. MANUAL (BLOWDOWN VALVE - PV & SV) */}
                        <DafStatusPanelSVG
                            id={"blowdownValve"}
                            x={1770}
                            y={905}
                            title="MANUAL"
                            width={140}
                            scale={1.1}
                            rows={[
                                { label: "PV", value: getMappedValue("blowdown_valve", "PV"), unit: "%" },
                                { label: "SV", value: getMappedValue("blowdown_valve", "SV"), unit: "%" },
                            ]}
                            onClick={() => handleEquipmentClick("blowdown_valve", [], [
                                { key: "PV", label: "BLOWDOWN VALVE PV (%)" },
                                { key: "SV", label: "BLOWDOWN VALVE SV (%)" },
                            ])}
                            style={getDeveloperOutlineStyle("blowdown_valve", ["PV", "SV"])}
                        />

                        {/* 9. MANUAL (COMPRESSOR - BAR) */}
                        <DafStatusPanelSVG
                            id={"compressor"}
                            x={380}
                            y={620}
                            title="MANUAL"
                            width={135}
                            scale={1.1}
                            rows={[
                                { label: "", value: getMappedValue("compressor_pressure", "PRESSURE"), unit: "Bar" },
                            ]}
                            onClick={() => handleEquipmentClick("compressor_pressure", [], [
                                { key: "PRESSURE", label: "COMPRESSOR PRESSURE (Bar)" },
                            ])}
                            style={getDeveloperOutlineStyle("compressor_pressure", ["PRESSURE"])}
                        />

                        {/* 10. MANUAL (PROPORTIONAL VALVE 3 - %) */}
                        <DafStatusPanelSVG
                            id={"proportional3"}
                            x={1088}
                            y={225}
                            title="MANUAL"
                            width={135}
                            scale={1.1}
                            rows={[
                                { label: "", value: getMappedValue("prop_valve_4", "POSITION"), unit: "%" },
                            ]}
                            onClick={() => handleEquipmentClick("prop_valve_4", [], [
                                { key: "POSITION", label: "VALVE 4 POSITION (%)" },
                            ])}
                            style={getDeveloperOutlineStyle("prop_valve_4", ["POSITION"])}
                        />

                        {/* 11. MANUAL (PROPORTIONAL VALVE 1 - %) */}
                        <DafStatusPanelSVG
                            id={"proportional1"}
                            x={802}
                            y={895}
                            title="MANUAL"
                            width={135}
                            scale={1.1}
                            rows={[
                                { label: "", value: getMappedValue("prop_valve_2", "POSITION"), unit: "%" },
                            ]}
                            onClick={() => handleEquipmentClick("prop_valve_2", [], [
                                { key: "POSITION", label: "VALVE 2 POSITION (%)" },
                            ])}
                            style={getDeveloperOutlineStyle("prop_valve_2", ["POSITION"])}
                        />

                        {/* 12. MANUAL (PROPORTIONAL VALVE 2 - %) */}
                        <DafStatusPanelSVG
                            id={"proportional2"}
                            x={1884}
                            y={520}
                            title="MANUAL"
                            width={135}
                            scale={1.1}
                            rows={[
                                { label: "", value: getMappedValue("prop_valve_3", "POSITION"), unit: "%" },
                            ]}
                            onClick={() => handleEquipmentClick("prop_valve_3", [], [
                                { key: "POSITION", label: "VALVE 3 POSITION (%)" },
                            ])}
                            style={getDeveloperOutlineStyle("prop_valve_3", ["POSITION"])}
                        />

                        {/* LAYER 3: EQUIPMENT ICONS (MOTOR & VALVES) — MURNI VISUAL ILUSTRASI */}

                        {/* 1. MOTOR 1 */}
                        <EquipmentIconSVG
                            id={"motor1"}
                            x={1577}
                            y={175}
                            icon={motorImg}
                            size={120}
                            rotation={90}
                            scale={1}
                        />

                        {/* 3. Proportional Valve 2 */}
                        <EquipmentIconSVG
                            x={800}
                            y={798}
                            icon={valveProportionalImg}
                            size={80}
                            rotation={-90}
                            scale={1.3}
                            mirror={false}
                        />

                        {/* 4. Proportional Valve 3 */}
                        <EquipmentIconSVG
                            x={1780}
                            y={561}
                            icon={valveProportionalImg}
                            size={80}
                            rotation={-90}
                            scale={1}
                            mirror={false}
                        />

                        {/* 5. Proportional Valve 4 */}
                        <EquipmentIconSVG
                            x={970}
                            y={220}
                            icon={valveProportionalImg}
                            size={80}
                            rotation={0}
                            scale={1.1}
                            mirror={false}
                        />

                        {/* 6. DAF Pump 1 */}
                        {/* <EquipmentIconSVG
                            x={1990}
                            y={728}
                            icon={dafPumpImg}
                            size={210}
                            rotation={0}
                            scale={0.8}
                        /> */}

                        {/* 7. DAF Pump 2 */}
                        {/* <EquipmentIconSVG
                            x={2376}
                            y={800}
                            icon={dafPumpImg}
                            size={190}
                            rotation={0}
                            scale={0.8}
                        /> */}
                    </svg>
                </div>
            </div>

            {/* Tag Editor Modal (Muncul saat kartu / equipment diklik dalam mode PLC Integration) */}
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

export default OverviewTab;
