import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import usePlcStore from "@core/store";
import "./KernelCalibrationView.css";

const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/* ==========================================================================
   TAG EDITOR MODAL
   ========================================================================== */
const TagEditorModal = ({ data, onClose, onSave, tagMap, availableTags = [], saving }) => {
  const [localTags, setLocalTags] = useState({});

  useEffect(() => {
    if (data) {
      const initial = {};
      if (data.signals && data.signals.length > 0) {
        data.signals.forEach((sig) => {
          const key = `${data.targetId}__${sig.key}`;
          initial[key] = tagMap[key] || "";
        });
      }
      setLocalTags(initial);
    }
  }, [data, tagMap]);

  if (!data) return null;

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: "12px" }}>
      <label
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
      onClick={onClose}
      style={{
        zIndex: 10000,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "420px",
          maxHeight: "80vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.05em" }}>⚙️ PLC Tag Configuration</h2>
            <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Hardware Mapping: {data.targetId}</span>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.signals.map((sig) => (
              <div key={sig.key}>
                {renderTagSelect(
                  localTags[`${data.targetId}__${sig.key}`] || "",
                  (val) => setLocalTags({ ...localTags, [`${data.targetId}__${sig.key}`]: val }),
                  availableTags,
                  sig.label
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>CANCEL</button>
          <button disabled={saving} onClick={() => onSave(localTags)} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: saving ? "#475569" : "#3b82f6", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "SAVING..." : "CONFIRM MAPPING"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */
const ValBox = ({ value, unit, decimals = 1, isEdited, onClick, style }) => {
  const formatValue = (v) => {
    if (v === null || v === undefined) return "-- --";
    if (typeof v === "number") return v.toFixed(decimals);
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v).toFixed(decimals);
    return v;
  };
  return (
    <div className={`kernel-calib-valbox ${onClick ? "editable" : ""} ${isEdited ? "edited" : ""}`} onClick={onClick} style={style}>
      <span className="val">{formatValue(value)}</span>
      {unit && <span className="unit">{unit}</span>}
    </div>
  );
};

export default function KernelCalibrationView({ configMode = false }) {
  const STATION_SLUG = "kernel-plant";
  
  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [tagEdit, setTagEdit] = useState(null);
  const [savingTags, setSavingTags] = useState(false);
  const [stagedEdits, setStagedEdits] = useState({});
  const [activeKeypad, setActiveKeypad] = useState(null);

  // Live PLC Data Hook
  const tags = usePlcStore((state) => state.tags);
  const initSocket = usePlcStore((state) => state.initSocket);

  // Calibration State matching image values exactly
  const [calibData, setCalibData] = useState({
    rippleMill1Amp: { txLow: 0, txHigh: 40.0, analogLow: 0, analogHigh: 27648, pv: 0.1, unit: "A", decimals: 1 },
    rippleMill2Amp: { txLow: 0, txHigh: 40.0, analogLow: 0, analogHigh: 27648, pv: 12.2, unit: "A", decimals: 1 },
    rippleMill3Amp: { txLow: 0, txHigh: 40.0, analogLow: 0, analogHigh: 27648, pv: 0.1, unit: "A", decimals: 1 },
    rippleMill4Amp: { txLow: 0, txHigh: 40.0, analogLow: 0, analogHigh: 27648, pv: 0.0, unit: "A", decimals: 1 },
  });

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);

  // Fetch Available Tags
  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/${STATION_SLUG}/plc-config/tags`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setAvailableTags(data.data || []);
    } catch (err) {
      console.error("Failed to fetch PLC tags", err);
    }
  }, [STATION_SLUG]);

  useEffect(() => {
    fetchAvailableTags();
  }, [fetchAvailableTags]);

  // Fetch Station Mappings
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const res = await fetch(`/api/${STATION_SLUG}/plc-config/station-mappings`, { headers: authHeaders() });
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
  }, [STATION_SLUG]);

  // Live Data Syncing Loop
  useEffect(() => {
    let active = true;

    const idToName = {};
    availableTags.forEach((t) => { idToName[String(t.id)] = t.tag_name; });

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
        }
        return null;
      };

      setCalibData((prev) => {
        let changed = false;
        let next = null;

        Object.keys(prev).forEach((deviceKey) => {
          ["txLow", "txHigh", "analogLow", "analogHigh", "pv"].forEach((fieldKey) => {
            const liveVal = getLive(deviceKey, fieldKey.toUpperCase());
            if (liveVal !== null && liveVal !== prev[deviceKey][fieldKey]) {
              if (!changed) {
                changed = true;
                next = JSON.parse(JSON.stringify(prev));
              }
              next[deviceKey][fieldKey] = liveVal;
            }
          });
        });

        return changed ? next : prev;
      });

      requestAnimationFrame(syncTask);
    };

    syncTask();
    return () => { active = false; };
  }, [tagMap, availableTags]);

  const getDeveloperStyle = (targetId, signalKey) => {
    if (!configMode) return {};
    const hasMapping = !!tagMap[`${targetId}__${signalKey}`];
    return {
      border: `2px dashed ${hasMapping ? "#3b82f6" : "#f87171"}`, // Blue mapped, Red unmapped
      cursor: "pointer",
    };
  };

  const handleBoxClick = (targetId, signalKey, signalLabel) => {
    if (!configMode) return;
    setTagEdit({
      targetId,
      signals: [{ key: signalKey, label: signalLabel }],
    });
  };

  const handleSaveMapping = async (newTags) => {
    setSavingTags(true);
    try {
      for (const [key, tagId] of Object.entries(newTags)) {
        const [equipment, signalKey] = key.split("__");
        const res = await fetch(`/api/${STATION_SLUG}/plc-config/station-mappings`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            station: STATION_SLUG,
            equipment: equipment,
            signal_key: signalKey,
            tag_id: tagId || null,
          }),
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
      }
      setTagMap((prev) => ({ ...prev, ...newTags }));
      setTagEdit(null);
    } catch (err) {
      console.error("Failed to save mapping:", err);
      alert("Failed to save mapping: " + err.message);
    } finally {
      setSavingTags(false);
    }
  };

  const getStagedVal = (deviceKey, fieldKey) => {
    return stagedEdits[`${deviceKey}__${fieldKey}`] !== undefined 
      ? stagedEdits[`${deviceKey}__${fieldKey}`] 
      : calibData[deviceKey][fieldKey];
  };

  const handleEdit = (deviceKey, fieldKey, val) => {
    setStagedEdits(prev => ({ ...prev, [`${deviceKey}__${fieldKey}`]: val }));
  };

  const handleKeypadClick = (dataKey, fieldKey, label, unit) => {
    if (configMode) return;
    setActiveKeypad({
      dataKey,
      fieldKey,
      currentValue: getStagedVal(dataKey, fieldKey),
      label,
      unit
    });
  };

  const handleNumericInput = (val) => {
    if (activeKeypad) {
      handleEdit(activeKeypad.dataKey, activeKeypad.fieldKey, val);
      setActiveKeypad(null);
    }
  };

  const handleSaveCalibration = () => {
    if (Object.keys(stagedEdits).length === 0) return;
    
    Object.entries(stagedEdits).forEach(([editKey, val]) => {
      const [deviceKey, fieldKey] = editKey.split("__");
      const signalKey = fieldKey.toUpperCase();
      const mapKey = `${deviceKey}__${signalKey}`;
      const tagId = tagMap[mapKey];
      
      if (tagId) {
        usePlcStore.getState().sendCommand(tagId, Number(val), mapKey, STATION_SLUG);
      }
    });

    alert("Calibration values sent to PLC successfully.");
    setStagedEdits({});
  };

  const renderRow = (label, dataKey) => {
    const data = calibData[dataKey];
    return (
      <tr key={dataKey} className="kernel-calib-row">
        <td className="kernel-calib-label">{label}</td>
        <td>
          <ValBox
            value={getStagedVal(dataKey, "txLow")}
            unit={data.unit}
            decimals={data.decimals}
            style={getDeveloperStyle(dataKey, "TXLOW")}
            onClick={configMode ? () => handleBoxClick(dataKey, "TXLOW", `${label} - TX Low`) : () => handleKeypadClick(dataKey, "txLow", `${label} - TX Low`, data.unit)}
            isEdited={stagedEdits[`${dataKey}__txLow`] !== undefined}
          />
        </td>
        <td>
          <ValBox
            value={getStagedVal(dataKey, "txHigh")}
            unit={data.unit}
            decimals={data.decimals}
            style={getDeveloperStyle(dataKey, "TXHIGH")}
            onClick={configMode ? () => handleBoxClick(dataKey, "TXHIGH", `${label} - TX High`) : () => handleKeypadClick(dataKey, "txHigh", `${label} - TX High`, data.unit)}
            isEdited={stagedEdits[`${dataKey}__txHigh`] !== undefined}
          />
        </td>
        <td>
          <ValBox
            value={getStagedVal(dataKey, "analogLow")}
            decimals={0}
            style={getDeveloperStyle(dataKey, "ANALOGLOW")}
            onClick={configMode ? () => handleBoxClick(dataKey, "ANALOGLOW", `${label} - Analog Low`) : () => handleKeypadClick(dataKey, "analogLow", `${label} - Analog Low`)}
            isEdited={stagedEdits[`${dataKey}__analogLow`] !== undefined}
          />
        </td>
        <td>
          <ValBox
            value={getStagedVal(dataKey, "analogHigh")}
            decimals={0}
            style={getDeveloperStyle(dataKey, "ANALOGHIGH")}
            onClick={configMode ? () => handleBoxClick(dataKey, "ANALOGHIGH", `${label} - Analog High`) : () => handleKeypadClick(dataKey, "analogHigh", `${label} - Analog High`)}
            isEdited={stagedEdits[`${dataKey}__analogHigh`] !== undefined}
          />
        </td>
        <td>
          <ValBox
            value={data.pv}
            unit={data.unit}
            decimals={data.decimals}
            style={getDeveloperStyle(dataKey, "PV")}
            onClick={configMode ? () => handleBoxClick(dataKey, "PV", `${label} - Process Value (PV)`) : undefined}
          />
        </td>
      </tr>
    );
  };

  return (
    <section className="som-sterilizer-station" style={{ height: "calc(100vh - 64px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <header className="som-sterilizer-station-header">
        <div className="som-header-left">
          <h2 className="som-sterilizer-station-title">Kernel Plant Calibration</h2>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button className="som-view-btn active" style={{ marginLeft: "8px", fontWeight: "bold" }} onClick={handleSaveCalibration}>
            SAVE CALIBRATION
          </button>
        </div>
      </header>

      <div className="som-ster-page" style={{ padding: "24px", flex: 1, overflowY: "auto", background: "#f1f5f9" }}>
        <div className="kernel-calib-container">
          <div className="kernel-calib-card">
            <table className="kernel-calib-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: "22%" }}></th>
                  <th colSpan={2}>
                    <div className="calib-header-badge">Transmitter Scale</div>
                  </th>
                  <th colSpan={2}>
                    <div className="calib-header-badge">Analog Scale</div>
                  </th>
                  <th rowSpan={2} className="pv-header">PV</th>
                </tr>
                <tr>
                  <th className="calib-sub-header">Low</th>
                  <th className="calib-sub-header">High</th>
                  <th className="calib-sub-header">Low</th>
                  <th className="calib-sub-header">High</th>
                </tr>
              </thead>
              <tbody>
                {renderRow("Ripple Mill No.1 Amp", "rippleMill1Amp")}
                {renderRow("Ripple Mill No.2 Amp", "rippleMill2Amp")}
                {renderRow("Ripple Mill No.3 Amp", "rippleMill3Amp")}
                {renderRow("Ripple Mill No.4 Amp", "rippleMill4Amp")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {tagEdit && (
        <TagEditorModal
          data={tagEdit}
          tagMap={tagMap}
          availableTags={availableTags}
          onClose={() => setTagEdit(null)}
          onSave={handleSaveMapping}
          saving={savingTags}
        />
      )}
      {activeKeypad && (
        <NumericKeypad
          value={activeKeypad.currentValue}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ''}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleNumericInput}
        />
      )}
    </section>
  );
}

function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return '0';
  });

  const handleNumber = (n) => {
    setDisplayValue(prev => (prev === '0' || prev === '0.0' ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => { if (!displayValue.includes('.')) setDisplayValue(displayValue + '.'); };
  const handleBack = () => setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  const handleEnter = () => onConfirm(parseFloat(displayValue) || 0);

  const btnStyle = { padding: '14px', fontSize: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '16px', width: '320px', overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
      }}>
        <div className="som-numeric-keypad-header" style={{
          padding: '16px 20px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span className="som-numeric-keypad-label" style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display" style={{
          padding: '24px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '8px'
        }}>
          <span className="som-numeric-keypad-value" style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit" style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>{unit}</span>}
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
            <button key={n} onClick={() => handleNumber(n)} style={btnStyle}>{n}</button>
          ))}
          <button onClick={handleDecimal} style={btnStyle}>.</button>
          <button onClick={() => handleNumber(0)} style={btnStyle}>0</button>
          <button onClick={handleBack} style={{ ...btnStyle, background: '#f1f5f9' }}>⌫</button>
          <button onClick={() => setDisplayValue('0')} style={{ gridColumn: 'span 1', padding: '12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
          <button onClick={handleEnter} style={{ gridColumn: 'span 2', padding: '12px', background: '#F59E0B', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>ENTER</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
