import React, { useState, useEffect, Fragment, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import "../settings/SterilizerStationSettingsModal.css";
import "../SterilizerStationPage.css";
import usePlcStore from "@core/store";

const ValBox = ({ value, unit, decimals = 2, onClick, style, isEdited }) => {
  const formatValue = (v) => {
    if (v === null || v === undefined) return "-- --";
    if (typeof v === 'number') {
      return Number.isInteger(v) && decimals === 0 ? v.toString() : v.toFixed(decimals);
    }
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) {
      const n = Number(v);
      return Number.isInteger(n) && decimals === 0 ? n.toString() : n.toFixed(decimals);
    }
    return v;
  };
  return (
    <div className={`som-val-box ${onClick ? 'som-val-box--editable' : ''} ${isEdited ? 'som-edited-field' : ''}`} onClick={onClick} style={style}>
      {formatValue(value)}
      {unit && <span className="som-val-unit">{unit}</span>}
    </div>
  );
};

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
          const key = `${data.targetId}__${sig.key}`;
          initial[key] = tagMap[key] || "";
        });
      } else {
        const targets = data.subs.length > 0 ? data.subs : [data.targetId];
        targets.forEach((t) => {
          initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
          initial[`${t}__START`] = tagMap[`${t}__START`] || "";
          initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
        });

        if (data.subs.length === 0) {
          initial[`${data.targetId}__MONITOR`] =
            tagMap[`${data.targetId}__MONITOR`] || "";
        }
      }

      setLocalTags(initial);
    }
  }, [data, tagMap]);

  if (!data) return null;

  const isGroup = data.subs.length > 0;
  const hasSignals = data.signals && data.signals.length > 0;

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: 0 }}>
      <label
        className="som-control-item-label"
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "8px",
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
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#0f172a",
          color: "#f8fafc",
          fontSize: "15px",
          fontWeight: 600,
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="" style={{ background: "#0f172a", color: "#e2e8f0" }}>— No Tag —</option>
        {tagList.map((tag) => (
          <option key={tag.id} value={tag.id} style={{ background: "#0f172a", color: "#e2e8f0" }}>
            {tag.tag_name}
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
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0
      }}
    >
      <div
        className="som-equipment-control-popup som-tag-edit-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isGroup ? "min(960px, 92vw)" : "min(600px, 90vw)",
          maxHeight: "88vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "20px",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          boxShadow: "0 25px 60px -12px rgba(0,0,0,0.7), 0 0 30px rgba(59,130,246,0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#f8fafc",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ⚙️ PLC Tag Configuration
            </h2>
            <span style={{ fontSize: "13px", color: "#94a3b8", marginTop: "6px", display: "block", fontWeight: 500 }}>
              Hardware Mapping: <strong style={{ color: "#60a5fa" }}>{data.targetId}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#cbd5e1", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "28px 32px", overflowY: "auto", flex: 1 }}>
          {hasSignals ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {data.signals.map((sig) => (
                <div key={sig.key}>
                  {renderTagSelect(localTags[`${data.targetId}__${sig.key}`] || "", (val) => setLocalTags({ ...localTags, [`${data.targetId}__${sig.key}`]: val }), availableTags, sig.label)}
                </div>
              ))}
            </div>
          ) : isGroup ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {data.subs.map((sub, index) => (
                <div key={index} style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#60a5fa", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{sub}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    {renderTagSelect(localTags[`${sub}__STATUS`] || "", (val) => setLocalTags({ ...localTags, [`${sub}__STATUS`]: val }), availableTags, "STATUS (READ)")}
                    {renderTagSelect(localTags[`${sub}__START`] || "", (val) => setLocalTags({ ...localTags, [`${sub}__START`]: val }), availableTags, "START (WRITE)")}
                    {renderTagSelect(localTags[`${sub}__STOP`] || "", (val) => setLocalTags({ ...localTags, [`${sub}__STOP`]: val }), availableTags, "STOP (WRITE)")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ width: "100%", margin: "0 auto" }}>
              {renderTagSelect(localTags[`${data.targetId}__MONITOR`] || "", (val) => setLocalTags({ ...localTags, [`${data.targetId}__MONITOR`]: val }), availableTags, "MONITORING POINT (READ)")}
            </div>
          )}
        </div>

        <div style={{ padding: "20px 32px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "16px", justifyContent: "flex-end", background: "rgba(15, 23, 42, 0.6)" }}>
          <button onClick={onClose} style={{ padding: "12px 24px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>CANCEL</button>
          <button disabled={saving} onClick={() => onSave(localTags)} style={{ padding: "12px 32px", borderRadius: "8px", border: "none", background: saving ? "#475569" : "#2563eb", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
            {saving ? "SAVING..." : "CONFIRM MAPPING"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function SterilizerCalibrationView({ configMode = false }) {
  const STATION_SLUG = "sterilizer";

  const getDeveloperStyle = (id, signalKey) => {
    if (!configMode) return {};
    const hasMapping = !!tagMap[`${id}__${signalKey}`];
    return {
      border: `2px dashed ${hasMapping ? "#3b82f6" : "#ef4444"}`,
      cursor: "pointer",
      position: "relative",
    };
  };

  const getAnalogTargetId = (st, meas) => `settings_analog_calib_st${st}_${meas}`;
  const getAnalogFieldKey = (field) => {
    if (field === "maxSensor") return "max";
    if (field === "calibrationValue") return "calib";
    if (field === "rawValue") return "raw";
    if (field === "outValue") return "out";
    return field;
  };
  const getAnalogSignalKey = (field) => {
    if (field === "maxSensor" || field === "calibrationValue") return "SETPOINT";
    if (field === "rawValue" || field === "outValue") return "MONITOR";
    return field;
  };

  const getBpvTargetId = (bKey, fieldKey) => {
    const fKey = fieldKey === 'calibration' ? 'calib' : fieldKey === 'outActual' ? 'out' : fieldKey === 'rawValue' ? 'raw' : fieldKey;
    return `settings_bpv_analog_${bKey}_${fKey}`;
  };
  const getBpvSignalKey = (fieldKey) => (fieldKey === "max" || fieldKey === "calibration") ? "SETPOINT" : "MONITOR";

  const defaultAnalogCalib = () => ({ maxSensor: 0, calibrationValue: 0, rawValue: 0, outValue: 0 });
  const [analogCalib, setAnalogCalib] = useState({
    1: { pressure: defaultAnalogCalib(), temp: defaultAnalogCalib() },
    2: { pressure: defaultAnalogCalib(), temp: defaultAnalogCalib() },
    3: { pressure: defaultAnalogCalib(), temp: defaultAnalogCalib() },
    4: { pressure: defaultAnalogCalib(), temp: defaultAnalogCalib() }
  });
  const [bpvAnalogCalib, setBpvAnalogCalib] = useState({
    pressureBpv: { max: 0, calibration: 0, rawValue: 0, outActual: 0 },
    pressureBoiler: { max: 0, calibration: 0, rawValue: 0, outActual: 0 }
  });
  const [stagedEdits, setStagedEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [tagEdit, setTagEdit] = useState(null);
  const [savingTags, setSavingTags] = useState(false);
  const [latestTags, setLatestTags] = useState({});
  const cooldownKeys = useRef({});

  const tags = usePlcStore((state) => state.tags);
  const initSocket = usePlcStore((state) => state.initSocket);

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);

  useEffect(() => {
    let active = true;

    const idToName = {};
    availableTags.forEach(t => {
      idToName[String(t.id)] = t.tag_name;
    });

    const syncTask = () => {
      if (!active || Object.keys(tagMap).length === 0) return;
      const currentTags = usePlcStore.getState().tags;

      const getLive = (equipmentKey, signalKey) => {
        const key = `${equipmentKey}__${signalKey}`;
        const tagId = tagMap[key];
        if (tagId) {
          const tagName = idToName[String(tagId)];
          if (tagName && currentTags[tagName] !== undefined) {
            return currentTags[tagName].value;
          }
          if (latestTags[tagId] !== undefined) return latestTags[tagId].value;
        }
        return null;
      };

      setAnalogCalib(prev => {
        let changed = false;
        let next = null;
        for (let st = 1; st <= 4; st++) {
          ["pressure", "temp"].forEach(meas => {
            ["maxSensor", "calibrationValue", "rawValue", "outValue"].forEach(field => {
              const editKey = `analogCalib_st${st}_${meas}_${field}`;
              const liveVal = getLive(`${getAnalogTargetId(st, meas)}_${getAnalogFieldKey(field)}`, getAnalogSignalKey(field));
              const currentVal = changed ? next[st][meas][field] : prev[st][meas][field];
              if (liveVal !== null && stagedEdits[editKey] === undefined && (!cooldownKeys.current[editKey] || Date.now() > cooldownKeys.current[editKey]) && currentVal !== liveVal) {
                if (!changed) {
                  changed = true;
                  next = JSON.parse(JSON.stringify(prev));
                }
                next[st][meas][field] = liveVal;
              }
            });
          });
        }
        return changed ? next : prev;
      });

      setBpvAnalogCalib(prev => {
        let changed = false;
        let next = null;
        ["pressureBpv", "pressureBoiler"].forEach(bKey => {
          ["max", "calibration", "rawValue", "outActual"].forEach(field => {
            const editKey = `bpvAnalogCalib_${bKey}_${field}`;
            const liveVal = getLive(getBpvTargetId(bKey, field), getBpvSignalKey(field));
            const currentVal = changed ? next[bKey][field] : prev[bKey][field];
            if (liveVal !== null && stagedEdits[editKey] === undefined && (!cooldownKeys.current[editKey] || Date.now() > cooldownKeys.current[editKey]) && currentVal !== liveVal) {
              if (!changed) {
                changed = true;
                next = JSON.parse(JSON.stringify(prev));
              }
              next[bKey][field] = liveVal;
            }
          });
        });
        return changed ? next : prev;
      });

      requestAnimationFrame(syncTask);
    };

    syncTask();
    
    return () => {
      active = false;
    };
  }, [tagMap, latestTags, stagedEdits, availableTags]);

  useEffect(() => {
    if (!configMode) {
      setTagEdit(null);
    }
  }, [configMode]);

  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch("/api/sterilizer/plc-config/tags", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setAvailableTags(data.data || []);
    } catch (err) {
      console.error("Failed to fetch PLC tags", err);
    }
  }, []);

  useEffect(() => {
    fetchAvailableTags();
  }, [fetchAvailableTags]);

  useEffect(() => {
    if (tagEdit) fetchAvailableTags();
  }, [tagEdit, fetchAvailableTags]);

  useEffect(() => {
    const loadMappings = async () => {
      try {
        const res = await fetch("/api/sterilizer/plc-config/station-mappings/sterilizer", { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const map = {};
          data.data.forEach((m) => {
            map[`${m.equipment}__${m.signal_key}`] = String(m.tag_id);
          });
          setTagMap(map);
        }
      } catch (err) {
        console.error("Failed to fetch PLC mappings", err);
      }
    };
    loadMappings();
  }, []);

  const handleEquipmentClick = useCallback((station, targetId, subTargets = [], signals = []) => {
    setTagEdit({ station, targetId, subs: subTargets, signals });
  }, []);

  const saveTagMapping = async (updates) => {
    setSavingTags(true);
    try {
      const mappings = Object.entries(updates)
        .map(([key, tagId]) => {
          const [equipment, signal_key] = key.split("__");
          return {
            station: "sterilizer",
            equipment,
            signal_key,
            tag_id: tagId ? Number(tagId) : null,
          };
        })
        .filter((m) => m.equipment && m.signal_key);

      if (mappings.length > 0) {
        const res = await fetch("/api/sterilizer/plc-config/station-mappings", {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ mappings }),
        });
        
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Failed to save station mappings");
        }
      }
      
      setTagMap((prev) => ({ ...prev, ...updates }));
      setTagEdit(null);
      await fetchAvailableTags();
      await fetchLatestTags();
    } catch (err) {
      console.error("Failed to save mapping", err);
      alert("Failed to save PLC mappings");
    } finally {
      setSavingTags(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/sterilizer/settings/recipes-and-params`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.analogCalib) {
          setAnalogCalib(prev => {
            const next = { ...prev };
            for (let st = 1; st <= 4; st++) {
              if (json.data.analogCalib[st]) {
                next[st] = {
                  pressure: { ...next[st].pressure, ...json.data.analogCalib[st].pressure },
                  temp: { ...next[st].temp, ...json.data.analogCalib[st].temp }
                };
              }
            }
            return next;
          });
        }
        
        if (json.data.bpvAnalogCalib) {
          setBpvAnalogCalib(prev => {
            const next = { ...prev };
            ["pressureBpv", "pressureBoiler"].forEach(k => {
              if (json.data.bpvAnalogCalib[k]) {
                next[k] = { ...next[k], ...json.data.bpvAnalogCalib[k] };
              }
            });
            return next;
          });
        }
        
        setStagedEdits({});
      }
    } catch (err) {
      console.error("Failed to load calibration:", err);
    }
  };

  const fetchLatestTags = async () => {
    try {
      const res = await fetch("/api/sterilizer/plc-config/tags-live", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data) {
        setLatestTags(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch latest tags:", err);
    }
  };

  useEffect(() => {
    // DB fetch removed, relying solely on PLC tags
    fetchLatestTags();
  }, []);

  const getStagedVal = (key, orig) =>
    stagedEdits[key] !== undefined ? stagedEdits[key] : orig;

  const handleKeypadConfirm = (newVal) => {
    const kp = activeKeypad;
    if (kp.section === "analogCalib") {
      const { sterilizer: st, meas, field } = kp;
      setStagedEdits(prev => ({ ...prev, [`analogCalib_st${st}_${meas}_${field}`]: newVal }));
    }
    if (kp.section === "bpvAnalogCalib") {
      const { key: bKey, field } = kp;
      setStagedEdits(prev => ({ ...prev, [`bpvAnalogCalib_${bKey}_${field}`]: newVal }));
    }
    setActiveKeypad(null);
  };

  const handleSave = async () => {
    if (Object.keys(stagedEdits).length === 0) return;
    setIsSaving(true);
    try {
      const sendPlc = (val, equipmentKey, signalKey) => {
        if (val === null || val === undefined) return;
        const key = `${equipmentKey}__${signalKey}`;
        const tagId = tagMap[key];
        if (tagId) usePlcStore.getState().sendCommand(tagId, val, key, "sterilizer");
      };

      const now = Date.now();
      const cooldownMs = 4000;

      setAnalogCalib(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        for (let st = 1; st <= 4; st++) {
          ["pressure", "temp"].forEach(meas => {
            ["maxSensor", "calibrationValue"].forEach(field => {
              const sKey = `analogCalib_st${st}_${meas}_${field}`;
              if (stagedEdits[sKey] !== undefined) {
                const numVal = Number(stagedEdits[sKey]);
                sendPlc(numVal, `${getAnalogTargetId(st, meas)}_${getAnalogFieldKey(field)}`, getAnalogSignalKey(field));
                cooldownKeys.current[sKey] = now + cooldownMs;
                if (!isNaN(numVal)) next[st][meas][field] = numVal;
              }
            });
          });
        }
        return next;
      });

      setBpvAnalogCalib(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        ["pressureBpv", "pressureBoiler"].forEach(bKey => {
          ["max", "calibration"].forEach(field => {
            const sKey = `bpvAnalogCalib_${bKey}_${field}`;
            if (stagedEdits[sKey] !== undefined) {
              const numVal = Number(stagedEdits[sKey]);
              sendPlc(numVal, getBpvTargetId(bKey, field), getBpvSignalKey(field));
              cooldownKeys.current[sKey] = now + cooldownMs;
              if (!isNaN(numVal)) next[bKey][field] = numVal;
            }
          });
        });
        return next;
      });

      alert("Calibration settings saved to PLC successfully!");
      setStagedEdits({});
    } catch (err) {
      console.error(err);
      alert("Error saving calibration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="som-sterilizer-station" style={{ height: "calc(100vh - 64px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <header className="som-sterilizer-station-header">
        <div className="som-header-left">
          <h2 className="som-sterilizer-station-title">Sterilizer Station Calibration</h2>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button className="som-view-btn active" onClick={handleSave} disabled={isSaving} style={{ marginLeft: "8px", fontWeight: "bold" }}>
            {isSaving ? "SAVING..." : "SAVE CALIBRATION"}
          </button>
        </div>
      </header>

      <div className="som-ster-page" style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
        <div style={{ background: "#ffffff", borderRadius: "10px", padding: "24px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "row", gap: "24px", alignItems: "flex-start", width: "100%", boxSizing: "border-box" }}>
          {/* Analog Input Calibration */}
          <div className="som-logic-section" style={{ flex: 1 }}>
            <h4 className="som-logic-section-title">ANALOG INPUT CALIBRATION</h4>
            <table className="som-bpv-settings-table">
              <thead>
                <tr>
                  <th colSpan={2}></th>
                  <th>Max Sensor</th>
                  <th>Calibration Value</th>
                  <th>Raw Value</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((st) => (
                  <Fragment key={st}>
                    <tr>
                      <td className="som-logic-label font-bold" style={{ color: "#475569", verticalAlign: "middle" }} rowSpan={2}>STERILIZER {st}</td>
                      <td className="som-logic-label" style={{ color: "#64748b" }}>Pressure</td>
                      {["maxSensor", "calibrationValue", "rawValue", "outValue"].map((field) => (
                        <td key={field} style={{ padding: "2px 4px" }}>
                          <ValBox
                            value={field === "rawValue" || field === "outValue" ? analogCalib[st]?.pressure?.[field] : getStagedVal(`analogCalib_st${st}_pressure_${field}`, analogCalib[st]?.pressure?.[field])}
                            isEdited={(field === "maxSensor" || field === "calibrationValue") && stagedEdits[`analogCalib_st${st}_pressure_${field}`] !== undefined}
                            decimals={field === "rawValue" ? 0 : 2}
                            onClick={configMode
                              ? () => handleEquipmentClick && handleEquipmentClick(STATION_SLUG, `${getAnalogTargetId(st, 'pressure')}_${getAnalogFieldKey(field)}`, [], [{ key: getAnalogSignalKey(field), label: `ST${st} Pressure ${field}` }])
                              : (field === "maxSensor" || field === "calibrationValue")
                                ? () => setActiveKeypad({ section: "analogCalib", sterilizer: st, meas: "pressure", field, label: `ST${st} Pressure ${field}` })
                                : null
                            }
                            style={configMode ? getDeveloperStyle(`${getAnalogTargetId(st, 'pressure')}_${getAnalogFieldKey(field)}`, getAnalogSignalKey(field)) : undefined}
                          />
                        </td>
                      ))}
                      <td style={{ fontSize: "9px", color: "#64748b", fontWeight: "700" }}>Bar</td>
                    </tr>
                    <tr>
                      <td className="som-logic-label" style={{ color: "#64748b" }}>Temp</td>
                      {["maxSensor", "calibrationValue", "rawValue", "outValue"].map((field) => (
                        <td key={field} style={{ padding: "2px 4px" }}>
                          <ValBox
                            value={field === "rawValue" || field === "outValue" ? analogCalib[st]?.temp?.[field] : getStagedVal(`analogCalib_st${st}_temp_${field}`, analogCalib[st]?.temp?.[field])}
                            isEdited={(field === "maxSensor" || field === "calibrationValue") && stagedEdits[`analogCalib_st${st}_temp_${field}`] !== undefined}
                            decimals={field === "rawValue" ? 0 : 2}
                            onClick={configMode
                              ? () => handleEquipmentClick && handleEquipmentClick(STATION_SLUG, `${getAnalogTargetId(st, 'temp')}_${getAnalogFieldKey(field)}`, [], [{ key: getAnalogSignalKey(field), label: `ST${st} Temp ${field}` }])
                              : (field === "maxSensor" || field === "calibrationValue")
                                ? () => setActiveKeypad({ section: "analogCalib", sterilizer: st, meas: "temp", field, label: `ST${st} Temp ${field}` })
                                : null
                            }
                            style={configMode ? getDeveloperStyle(`${getAnalogTargetId(st, 'temp')}_${getAnalogFieldKey(field)}`, getAnalogSignalKey(field)) : undefined}
                          />
                        </td>
                      ))}
                      <td style={{ fontSize: "9px", color: "#64748b", fontWeight: "700" }}>°C</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* BPV Analog Calibration */}
          <div className="som-logic-section" style={{ flex: 1 }}>
            <h4 className="som-logic-section-title">BPV ANALOG CALIBRATION</h4>
            <table className="som-bpv-settings-table">
              <thead>
                <tr>
                  <th></th>
                  <th>MAX</th>
                  <th>Calibration</th>
                  <th>Raw Value</th>
                  <th colSpan={2}>Out ACTUAL</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { bKey: "pressureBpv", label: "Pressure BPV", unit: "Bar" },
                  { bKey: "pressureBoiler", label: "Pressure Boiler", unit: "Bar" },
                ].map(({ bKey, label, unit }) => (
                  <tr key={bKey}>
                    <td className="som-logic-label" style={{ color: "#475569" }}>{label}</td>
                    <td style={{ padding: "2px 4px" }}>
                      <ValBox
                        value={getStagedVal(`bpvAnalogCalib_${bKey}_max`, bpvAnalogCalib[bKey]?.max)}
                        isEdited={stagedEdits[`bpvAnalogCalib_${bKey}_max`] !== undefined}
                        decimals={2}
                        onClick={configMode
                          ? () => handleEquipmentClick && handleEquipmentClick(STATION_SLUG, getBpvTargetId(bKey, 'max'), [], [{ key: getBpvSignalKey('max'), label: `${label} MAX` }])
                          : () => setActiveKeypad({ section: "bpvAnalogCalib", key: bKey, field: "max", label: `${label} MAX` })
                        }
                        style={configMode ? getDeveloperStyle(getBpvTargetId(bKey, 'max'), getBpvSignalKey('max')) : undefined}
                      />
                    </td>
                    <td style={{ padding: "2px 4px" }}>
                      <ValBox
                        value={getStagedVal(`bpvAnalogCalib_${bKey}_calibration`, bpvAnalogCalib[bKey]?.calibration)}
                        isEdited={stagedEdits[`bpvAnalogCalib_${bKey}_calibration`] !== undefined}
                        decimals={2}
                        onClick={configMode
                          ? () => handleEquipmentClick && handleEquipmentClick(STATION_SLUG, getBpvTargetId(bKey, 'calibration'), [], [{ key: getBpvSignalKey('calibration'), label: `${label} Calibration` }])
                          : () => setActiveKeypad({ section: "bpvAnalogCalib", key: bKey, field: "calibration", label: `${label} Calibration` })
                        }
                        style={configMode ? getDeveloperStyle(getBpvTargetId(bKey, 'calibration'), getBpvSignalKey('calibration')) : undefined}
                      />
                    </td>
                    <td style={{ padding: "2px 4px" }}>
                      <ValBox
                        value={bpvAnalogCalib[bKey]?.rawValue}
                        decimals={0}
                        onClick={configMode ? () => handleEquipmentClick && handleEquipmentClick(STATION_SLUG, getBpvTargetId(bKey, 'rawValue'), [], [{ key: getBpvSignalKey('rawValue'), label: `${label} Raw Value` }]) : null}
                        style={configMode ? getDeveloperStyle(getBpvTargetId(bKey, 'rawValue'), getBpvSignalKey('rawValue')) : undefined}
                      />
                    </td>
                    <td style={{ padding: "2px 4px" }}>
                      <ValBox
                        value={bpvAnalogCalib[bKey]?.outActual}
                        decimals={2}
                        onClick={configMode ? () => handleEquipmentClick && handleEquipmentClick(STATION_SLUG, getBpvTargetId(bKey, 'outActual'), [], [{ key: getBpvSignalKey('outActual'), label: `${label} Out Actual` }]) : null}
                        style={configMode ? getDeveloperStyle(getBpvTargetId(bKey, 'outActual'), getBpvSignalKey('outActual')) : undefined}
                      />
                    </td>
                    <td style={{ fontSize: "9px", color: "#64748b", fontWeight: "700" }}>{unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {activeKeypad && (
        <NumericKeypad
          value={(() => {
            if (activeKeypad.section === "analogCalib") {
              const { sterilizer: st, meas, field } = activeKeypad;
              return getStagedVal(`analogCalib_st${st}_${meas}_${field}`, analogCalib[st]?.[meas]?.[field] ?? 0);
            }
            if (activeKeypad.section === "bpvAnalogCalib") {
              const { key: bKey, field } = activeKeypad;
              return getStagedVal(`bpvAnalogCalib_${bKey}_${field}`, bpvAnalogCalib[bKey]?.[field] ?? 0);
            }
            return 0;
          })()}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ""}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleKeypadConfirm}
        />
      )}

      {tagEdit && (
        <TagEditorModal
          data={tagEdit}
          onClose={() => setTagEdit(null)}
          onSave={saveTagMapping}
          tagMap={tagMap}
          availableTags={availableTags}
          saving={savingTags}
        />
      )}
    </section>
  );
}

// ==========================================
// Numeric Keypad Component
// ==========================================
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toString();
    }
    if (typeof value === "string") return value;
    return "0";
  });

  const handleNumber = (n) => {
    setDisplayValue((prev) => (prev === "0" ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => { if (!displayValue.includes(".")) setDisplayValue(displayValue + "."); };
  const handleBack = () => setDisplayValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  const handleEnter = useCallback(() => onConfirm(parseFloat(displayValue) || 0), [displayValue, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleNumber(parseInt(e.key));
      } else if (e.key === ".") {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBack();
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleEnter();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [displayValue, onConfirm, onClose]);

  const btnStyle = { padding: "14px", fontSize: "18px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: "10px", cursor: "pointer", fontWeight: "600" };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={(e) => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
        </div>
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
            <button type="button" key={n} onClick={() => handleNumber(n)} style={btnStyle}>{n}</button>
          ))}
          <button type="button" onClick={handleDecimal} style={btnStyle}>.</button>
          <button type="button" onClick={() => handleNumber(0)} style={btnStyle}>0</button>
          <button type="button" onClick={handleBack} style={{ ...btnStyle, background: "#f1f5f9" }}>⌫</button>
          <button type="button" onClick={() => setDisplayValue("0")} style={{ gridColumn: "span 1", padding: "12px", background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>CLEAR</button>
          <button type="button" onClick={handleEnter} style={{ gridColumn: "span 2", padding: "12px", background: "#F59E0B", border: "none", color: "white", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", fontSize: "15px" }}>ENTER</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
