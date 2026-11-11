import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import usePlcStore from "@core/store";
import "./DafOsrCalibrationView.css";

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
      onClick={onClose}
      style={{
        zIndex: 10000,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "8vh",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "440px",
          maxHeight: "85vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#f8fafc", textTransform: "uppercase" }}>
              ⚙️ PLC Tag Configuration
            </h3>
            <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px", display: "block" }}>
              Hardware Target: <strong style={{ color: "#38bdf8" }}>{data.targetId}</strong>
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

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {data.signals && data.signals.map((sig) => {
            const key = `${data.targetId}__${sig.key}`;
            return (
              <div key={sig.key}>
                {renderTagSelect(
                  localTags[key],
                  (val) => setLocalTags((prev) => ({ ...prev, [key]: val })),
                  availableTags,
                  sig.label || sig.key
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
            background: "rgba(15, 23, 42, 0.4)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)",
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
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
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

/* ==========================================================================
   VALUE BOX COMPONENT
   Rules:
   - Belum mapping: tampil "No Tag"
   - Udah mapping tapi belum ada nilai dari PLC: tampil "--"
   - Udah mapping dan ada nilai: tampilkan nilai (beserta satuan)
   ========================================================================== */
const ValBox = ({ value, unit, decimals = 1, isEdited, isNoTag, isPending, isReadOnly, onClick, style }) => {
  const formatValue = (v) => {
    if (v === null || v === undefined) return "--";
    if (v === "No Tag" || v === "--") return v;
    if (typeof v === "number") return v.toFixed(decimals);
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v).toFixed(decimals);
    return v;
  };

  const formatted = formatValue(value);
  const showNoTag = isNoTag || formatted === "No Tag";
  const showPending = isPending || formatted === "--";

  return (
    <div
      className={`daf-calib-valbox ${onClick ? "editable" : ""} ${isEdited ? "edited" : ""} ${showNoTag ? "no-tag" : ""} ${showPending ? "pending" : ""} ${isReadOnly ? "read-only" : ""}`}
      onClick={onClick}
      style={{
        ...style,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span className="val">{formatted}</span>
      {!showNoTag && !showPending && unit && <span className="unit">{unit}</span>}
    </div>
  );
};

/* ==========================================================================
   DEFAULT 14 CALIBRATION ITEMS (MATCHING METADATA DEFINITION)
   ========================================================================== */
const DEFAULT_CALIB_ITEMS = [
  { key: "flowmeter_dafosr_in", label: "Flowmeter - DAFOSR IN", unit: "m³/h", decimals: 1 },
  { key: "flowmeter_compressed_air", label: "Flowmeter - Compressed Air", unit: "Nm³/h", decimals: 1 },
  { key: "flowmeter_ae_tank_inlet", label: "Flowmeter - AE Tank Inlet", unit: "m³/h", decimals: 1 },
  { key: "pressure_ae_tank", label: "Pressure - AE Tank", unit: "Bar", decimals: 2 },
  { key: "pressure_compressor", label: "Pressure - Compressor", unit: "Bar", decimals: 2 },
  { key: "control_valve_dafosr_inlet", label: "Control Valve - DAFOSR Inlet", unit: "%", decimals: 1 },
  { key: "control_valve_ae_tank_inlet", label: "Control Valve - AE Tank Inlet", unit: "%", decimals: 1 },
  { key: "control_valve_ae_tank_outlet", label: "Control Valve - AE Tank Outlet", unit: "%", decimals: 1 },
  { key: "water_level_ae_tank", label: "Water Level - AE Tank", unit: "%", decimals: 1 },
  { key: "temperature_dafosr_in", label: "Temperature - DAFOSR IN", unit: "°C", decimals: 1 },
  { key: "temperature_chiller_in", label: "Temperature - Chiller IN", unit: "°C", decimals: 1 },
  { key: "temperature_chiller_mid", label: "Temperature - Chiller MID", unit: "°C", decimals: 1 },
  { key: "temperature_chiller_out", label: "Temperature - Chiller OUT", unit: "°C", decimals: 1 },
  { key: "skimmer_rpm", label: "Skimmer - RPM", unit: "RPM", decimals: 0 },
];

/* ==========================================================================
   MAIN COMPONENT: DafOsrCalibrationView
   ========================================================================== */
export default function DafOsrCalibrationView({ configMode: propConfigMode = false, user }) {
  const STATION_SLUG = "daf-osr";

  // Shortcut Developer Mode (Ctrl + X) lokal & sinkron dengan dashboard
  const [localConfigMode, setLocalConfigMode] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        setLocalConfigMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const effectiveConfigMode = propConfigMode || localConfigMode;

  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [tagEdit, setTagEdit] = useState(null);
  const [savingTags, setSavingTags] = useState(false);
  const [stagedEdits, setStagedEdits] = useState({});
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSavingCalib, setIsSavingCalib] = useState(false);
  const [realtimeData, setRealtimeData] = useState({});

  useEffect(() => {
    if (!effectiveConfigMode) {
      setTagEdit(null);
    }
  }, [effectiveConfigMode]);

  // Live PLC Data Hook
  const tags = usePlcStore((state) => state.tags);
  const initSocket = usePlcStore((state) => state.initSocket);

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);

  // Fallback Polling untuk Live Tags Cache dari Backend
  useEffect(() => {
    let active = true;
    const fetchLive = async () => {
      try {
        const res = await fetch(`/api/${STATION_SLUG}/plc-config/tags-live`, {
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
    const interval = setInterval(fetchLive, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [STATION_SLUG]);

  // Fetch Available Tags
  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/${STATION_SLUG}/plc-config/tags`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAvailableTags(data.data);
      }
    } catch (err) {
      console.error("[DafOsrCalib] Failed to fetch PLC tags:", err);
    }
  }, [STATION_SLUG]);

  useEffect(() => {
    fetchAvailableTags();
  }, [fetchAvailableTags]);

  // Auto re-fetch available tags whenever tagEdit modal opens
  useEffect(() => {
    if (tagEdit) {
      fetchAvailableTags();
    }
  }, [tagEdit, fetchAvailableTags]);

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
        console.error("[DafOsrCalib] Failed to fetch PLC mappings:", err);
      }
    };
    loadMappings();
  }, [STATION_SLUG]);

  // Map tagId -> tagName untuk lookup cepat
  const idToName = useMemo(() => {
    const map = {};
    availableTags.forEach((t) => {
      map[String(t.id)] = t.tag_name;
    });
    return map;
  }, [availableTags]);

  /**
   * getCellValue: Mengimplementasikan 3 Aturan SCADA AgroVision:
   * 1. Belum mapping -> Tampil "No Tag"
   * 2. Udah mapping tapi belum ada nilai dari PLC -> Tampil "--"
   * 3. Udah mapping dan ada nilai -> Tampilkan nilai (beserta satuan)
   */
  const getCellValue = (deviceKey, fieldKey, signalKey) => {
    const editKey = `${deviceKey}__${fieldKey}`;
    // Jika ada nilai yang sedang diedit/staged oleh operator
    if (stagedEdits[editKey] !== undefined) {
      return {
        value: stagedEdits[editKey],
        isEdited: true,
        hasTag: true,
        isNoTag: false,
        isPending: false,
      };
    }

    const mapKey = `${deviceKey}__${signalKey}`;
    const tagId = tagMap ? tagMap[mapKey] : null;

    // Rule 1: Belum mapping tampil "No Tag"
    if (!tagId) {
      return {
        value: "No Tag",
        isEdited: false,
        hasTag: false,
        isNoTag: true,
        isPending: false,
      };
    }

    // Rule 2 & 3: Udah mapping -> cek nilai dari PLC
    const tagName = idToName[String(tagId)];
    let liveVal = undefined;
    if (tagName) {
      liveVal = tags[tagName]?.value !== undefined ? tags[tagName].value : realtimeData[tagName];
    }

    // Rule 2: Udah mapping tapi belum ada nilai dari PLC tampil "--"
    if (liveVal === undefined || liveVal === null || liveVal === "" || liveVal === "--" || liveVal === "No Tag") {
      return {
        value: "--",
        isEdited: false,
        hasTag: true,
        isNoTag: false,
        isPending: true,
      };
    }

    // Rule 3: Udah mapping dan ada nilai tampilkan nilai
    const num = parseFloat(liveVal);
    const parsedVal = isNaN(num) ? liveVal : num;

    return {
      value: parsedVal,
      isEdited: false,
      hasTag: true,
      isNoTag: false,
      isPending: false,
    };
  };

  // Developer Outline Style (Biru jika sudah di-mapping, Merah jika belum di-mapping)
  // Samakan dengan standar Overview Tab DAF & Sterilizer Station
  const getDeveloperStyle = (deviceKey, signalKey) => {
    if (!effectiveConfigMode) return {};
    const hasTag = Boolean(tagMap && tagMap[`${deviceKey}__${signalKey}`]);
    return {
      outline: hasTag ? "2.5px solid #3b82f6" : "2.5px solid #ef4444",
      outlineOffset: "2px",
      boxShadow: hasTag
        ? "0 0 6px rgba(59, 130, 246, 0.6)"
        : "0 0 6px rgba(239, 68, 68, 0.6)",
      background: hasTag ? "transparent" : "rgba(239, 68, 68, 0.08)",
      cursor: "pointer",
    };
  };

  const handleBoxClick = (deviceKey, signalKey, label) => {
    if (!effectiveConfigMode) return;
    fetchAvailableTags();
    setTagEdit({
      targetId: deviceKey,
      signals: [{ key: signalKey, label }],
    });
  };

  const handleSaveMapping = async (newTags) => {
    setSavingTags(true);
    try {
      for (const [key, tagId] of Object.entries(newTags)) {
        const [equipment, signal_key] = key.split("__");
        const res = await fetch(`/api/${STATION_SLUG}/plc-config/station-mappings`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            station: STATION_SLUG,
            equipment,
            signal_key,
            tag_id: tagId ? Number(tagId) : null,
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
      console.error("[DafOsrCalib] Failed to save mapping:", err);
      alert("Failed to save mapping: " + err.message);
    } finally {
      setSavingTags(false);
    }
  };

  const handleEdit = (deviceKey, fieldKey, val) => {
    setStagedEdits((prev) => ({ ...prev, [`${deviceKey}__${fieldKey}`]: val }));
  };

  const handleKeypadClick = (dataKey, fieldKey, label, unit) => {
    if (effectiveConfigMode) return;
    const cell = getCellValue(dataKey, fieldKey, fieldKey.toUpperCase());
    let initVal = 0;
    if (cell.isEdited) {
      initVal = cell.value;
    } else if (!cell.isNoTag && !cell.isPending && !isNaN(Number(cell.value))) {
      initVal = Number(cell.value);
    }
    setActiveKeypad({
      dataKey,
      fieldKey,
      currentValue: initVal,
      label,
      unit,
    });
  };

  const handleNumericInput = (val) => {
    if (activeKeypad) {
      handleEdit(activeKeypad.dataKey, activeKeypad.fieldKey, val);
      setActiveKeypad(null);
    }
  };

  const handleSaveCalibration = async () => {
    const stagedKeys = Object.keys(stagedEdits);
    if (stagedKeys.length === 0) {
      alert("Tidak ada nilai kalibrasi yang diubah.");
      return;
    }

    setIsSavingCalib(true);
    try {
      let writtenCount = 0;
      let unmappedCount = 0;

      stagedKeys.forEach((editKey) => {
        const val = stagedEdits[editKey];
        const [deviceKey, fieldKey] = editKey.split("__");
        const signalKey = fieldKey.toUpperCase();
        const mapKey = `${deviceKey}__${signalKey}`;
        const tagId = tagMap[mapKey];

        if (tagId) {
          const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
          const tagName = tagObj ? tagObj.tag_name : mapKey;
          usePlcStore.getState().sendCommand(tagId, Number(val), tagName, STATION_SLUG);
          writtenCount++;
        } else {
          unmappedCount++;
        }
      });

      if (unmappedCount > 0 && writtenCount > 0) {
        alert(`Nilai kalibrasi berhasil dikirim ke PLC: ${writtenCount} item.\nCatatan: ${unmappedCount} item dilewati karena belum di-mapping ke PLC tag.`);
      } else if (unmappedCount > 0 && writtenCount === 0) {
        alert(`Gagal mengirim ke PLC: ${unmappedCount} item belum di-mapping ke PLC tag. Silakan lakukan mapping tag terlebih dahulu melalui Developer mode (Ctrl+X).`);
      } else {
        alert(`Nilai kalibrasi berhasil disimpan dan dikirim ke PLC (${writtenCount} item).`);
      }

      setStagedEdits({});
    } catch (err) {
      console.error("[DafOsrCalib] Failed to save calibration:", err);
      alert("Gagal mengirim nilai kalibrasi ke PLC: " + (err.message || "Error"));
    } finally {
      setIsSavingCalib(false);
    }
  };

  const renderRow = (item) => {
    const dataKey = item.key;
    const label = item.label;
    const unit = item.unit;
    const decimals = item.decimals ?? 1;

    const txLowCell = getCellValue(dataKey, "txLow", "TXLOW");
    const txHighCell = getCellValue(dataKey, "txHigh", "TXHIGH");
    const analogLowCell = getCellValue(dataKey, "analogLow", "ANALOGLOW");
    const analogHighCell = getCellValue(dataKey, "analogHigh", "ANALOGHIGH");
    const pvCell = getCellValue(dataKey, "pv", "PV");

    return (
      <tr key={dataKey} className="daf-calib-row">
        <td className="daf-calib-label">{label}</td>
        
        {/* Instrument Scale Min (txLow) */}
        <td>
          <ValBox
            value={txLowCell.value}
            unit={unit}
            decimals={decimals}
            isEdited={txLowCell.isEdited}
            isNoTag={txLowCell.isNoTag}
            isPending={txLowCell.isPending}
            style={getDeveloperStyle(dataKey, "TXLOW")}
            onClick={
              effectiveConfigMode
                ? () => handleBoxClick(dataKey, "TXLOW", `${label} - Instrument Scale Min`)
                : () => handleKeypadClick(dataKey, "txLow", `${label} - Min Scale`, unit)
            }
          />
        </td>

        {/* Instrument Scale Max (txHigh) */}
        <td>
          <ValBox
            value={txHighCell.value}
            unit={unit}
            decimals={decimals}
            isEdited={txHighCell.isEdited}
            isNoTag={txHighCell.isNoTag}
            isPending={txHighCell.isPending}
            style={getDeveloperStyle(dataKey, "TXHIGH")}
            onClick={
              effectiveConfigMode
                ? () => handleBoxClick(dataKey, "TXHIGH", `${label} - Instrument Scale Max`)
                : () => handleKeypadClick(dataKey, "txHigh", `${label} - Max Scale`, unit)
            }
          />
        </td>

        {/* Analogue Scale Min (analogLow) */}
        <td>
          <ValBox
            value={analogLowCell.value}
            decimals={0}
            isEdited={analogLowCell.isEdited}
            isNoTag={analogLowCell.isNoTag}
            isPending={analogLowCell.isPending}
            style={getDeveloperStyle(dataKey, "ANALOGLOW")}
            onClick={
              effectiveConfigMode
                ? () => handleBoxClick(dataKey, "ANALOGLOW", `${label} - Analogue Scale Min`)
                : () => handleKeypadClick(dataKey, "analogLow", `${label} - Analogue Min`)
            }
          />
        </td>

        {/* Analogue Scale Max (analogHigh) */}
        <td>
          <ValBox
            value={analogHighCell.value}
            decimals={0}
            isEdited={analogHighCell.isEdited}
            isNoTag={analogHighCell.isNoTag}
            isPending={analogHighCell.isPending}
            style={getDeveloperStyle(dataKey, "ANALOGHIGH")}
            onClick={
              effectiveConfigMode
                ? () => handleBoxClick(dataKey, "ANALOGHIGH", `${label} - Analogue Scale Max`)
                : () => handleKeypadClick(dataKey, "analogHigh", `${label} - Analogue Max`)
            }
          />
        </td>

        {/* PV (Process Value) - Read-only */}
        <td>
          <ValBox
            value={pvCell.value}
            unit={unit}
            decimals={decimals}
            isEdited={false}
            isNoTag={pvCell.isNoTag}
            isPending={pvCell.isPending}
            isReadOnly={true}
            style={getDeveloperStyle(dataKey, "PV")}
            onClick={effectiveConfigMode ? () => handleBoxClick(dataKey, "PV", `${label} - PV`) : undefined}
          />
        </td>
      </tr>
    );
  };

  const hasChanges = Object.keys(stagedEdits).length > 0;

  return (
    <section
      className="som-sterilizer-station"
      style={{
        height: "100%",
        maxHeight: "100%",
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
        boxSizing: "border-box",
      }}
    >
      {/* Header Bar */}
      <header
        className="som-sterilizer-station-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        <div className="som-header-left">
          <h2
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 900,
              color: "#0f172a",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            DAF / OSR Station Calibration
          </h2>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleSaveCalibration}
            disabled={!hasChanges || isSavingCalib}
            className={`daf-calib-save-btn ${hasChanges && !isSavingCalib ? "active" : "disabled"}`}
          >
            {isSavingCalib ? "SAVING..." : "SAVE CALIBRATION"}
          </button>
        </div>
      </header>

      {/* Main Body: Contained strictly within view, no outer scroll */}
      <div
        style={{
          padding: "16px 24px 20px 24px",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#f8fafc",
          boxSizing: "border-box",
        }}
      >
        <div className="daf-calib-card">
          {/* Scroll container STRICTLY inside the white card box */}
          <div className="daf-calib-table-scroll">
            <table className="daf-calib-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: "32%" }}></th>
                  <th colSpan={2}>
                    <div className="daf-calib-header-badge">Instrument Scale</div>
                  </th>
                  <th colSpan={2}>
                    <div className="daf-calib-header-badge">Analogue Scale</div>
                  </th>
                  <th rowSpan={2} className="daf-pv-header">
                    PV
                  </th>
                </tr>
                <tr>
                  <th className="daf-calib-sub-header">Min</th>
                  <th className="daf-calib-sub-header">Max</th>
                  <th className="daf-calib-sub-header">Min</th>
                  <th className="daf-calib-sub-header">Max</th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_CALIB_ITEMS.map((item) => renderRow(item))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tag Editor Modal for Mode Developer */}
      {tagEdit && (
        <TagEditorModal
          data={tagEdit}
          onClose={() => setTagEdit(null)}
          onSave={handleSaveMapping}
          tagMap={tagMap}
          availableTags={availableTags}
          saving={savingTags}
        />
      )}

      {/* On-Screen Numeric Keypad Modal for Normal Mode */}
      {activeKeypad && (
        <NumericKeypad
          value={activeKeypad.currentValue}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ""}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleNumericInput}
        />
      )}
    </section>
  );
}

/* ==========================================================================
   ON-SCREEN NUMERIC KEYPAD COMPONENT
   ========================================================================== */
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (value === null || value === undefined || value === "" || value === "No Tag" || value === "--") return "0";
    const num = Number(value);
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(4)).toString();
  });

  const handleNumber = (n) => {
    setDisplayValue((prev) => (prev === "0" || prev === "0.0" ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => {
    setDisplayValue((prev) => (!prev.includes(".") ? prev + "." : prev));
  };
  const handleBack = () => setDisplayValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  const handleEnter = useCallback(() => {
    const num = parseFloat(displayValue);
    onConfirm(isNaN(num) ? 0 : num);
  }, [displayValue, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleNumber(parseInt(e.key, 10));
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
  }, [displayValue, handleEnter, onClose]);

  const btnStyle = {
    padding: "14px",
    fontSize: "18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#1e293b",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={(e) => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#64748b",
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
        </div>

        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
            <button type="button" key={n} onClick={() => handleNumber(n)} style={btnStyle}>
              {n}
            </button>
          ))}
          <button type="button" onClick={handleDecimal} style={btnStyle}>
            .
          </button>
          <button type="button" onClick={() => handleNumber(0)} style={btnStyle}>
            0
          </button>
          <button type="button" onClick={handleBack} style={{ ...btnStyle, background: "#f1f5f9" }}>
            ⌫
          </button>
          <button
            type="button"
            onClick={() => setDisplayValue("0")}
            style={{
              gridColumn: "span 1",
              padding: "12px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={handleEnter}
            style={{
              gridColumn: "span 2",
              padding: "12px",
              background: "#F59E0B",
              border: "none",
              color: "white",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            ENTER
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
