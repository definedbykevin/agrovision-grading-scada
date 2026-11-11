import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import usePlcStore from '@core/store'
import './ThreshingStationPage.css'
import ThreshingStationSettingsPage from './settings/ThreshingStationSettingsPage.jsx'
import OverviewTab from './tabs/Overview/OverviewTab.jsx'
import AiGradingMpdTab from './tabs/AiGradingMpd/AiGradingMpdTab.jsx'
import AiGradingEbcTab from './tabs/AiGradingEbc/AiGradingEbcTab.jsx'

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

function ThreshingStationPage({ user, onSelectSubmenu, configMode: propConfigMode = false }) {
  const initSocket = usePlcStore(state => state.initSocket)
  const tags = usePlcStore(state => state.tags)

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);

  const getTag = (tagName) => {
    return tags[tagName] || { value: null, status: 'STOP', timestamp: null };
  }

  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [viewMode, setViewMode] = useState('process')
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const svgRef = useRef(null)

  // --- PLC CONFIG STATE ---
  const [configMode, setConfigMode] = useState(propConfigMode);
  const [tagEdit, setTagEdit] = useState(null);
  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    setConfigMode(propConfigMode);
  }, [propConfigMode]);

  const tagIdToName = useMemo(() => {
    const map = {};
    availableTags.forEach((t) => { map[t.id] = t.tag_name; });
    return map;
  }, [availableTags]);

  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch("/api/threshing/plc-config/tags", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setAvailableTags(data.data);
      }
    } catch (err) { }
  }, []);

  useEffect(() => {
    fetchAvailableTags();
  }, [fetchAvailableTags]);

  useEffect(() => {
    if (tagEdit) {
      fetchAvailableTags();
    }
  }, [tagEdit, fetchAvailableTags]);

  const loadMappings = async () => {
    try {
      const res = await fetch("/api/threshing/plc-config/station-mappings", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const restored = {};
          data.data.forEach((m) => { restored[`${m.equipment}__${m.signal_key}`] = String(m.tag_id); });
          setTagMap(restored);
        }
      }
    } catch (err) { }
  };

  useEffect(() => {
    loadMappings();
  }, []);

  const getLiveValue = useCallback((equipmentKey, signalKey = "MONITOR") => {
    const tagId = tagMap[`${equipmentKey}__${signalKey}`];
    if (!tagId) return null;
    const tagName = tagIdToName[tagId];
    if (!tagName) return null;
    const tagData = tags[tagName];
    if (tagData && tagData.value !== undefined) return tagData.value;
    return null;
  }, [tagMap, tagIdToName, tags]);

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
        const parts = key.split("__");
        if (parts.length !== 2) continue;
        mappings.push({
          station: "THRESHING",
          equipment: parts[0],
          signal_key: parts[1],
          tag_id: tagId ? parseInt(tagId) : null
        });
      }
      if (mappings.length > 0) {
        await fetch("/api/threshing/plc-config/station-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ mappings }),
        });
      }
      await loadMappings();
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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        const isDev = user?.userRole?.toLowerCase() === 'developer' || user?.role?.toLowerCase() === 'developer';
        if (!isDev) return;
        e.preventDefault();
        setConfigMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user]);

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) })
  }

  const getDyn = (eqKey, sigKey, hardcoded) => {
    const val = getLiveValue(eqKey, sigKey);
    return val !== null ? val : getTag(hardcoded).value;
  };
  const getDynRun = (eqKey, hardcoded) => {
    const val = getDyn(eqKey, 'RUN', hardcoded);
    return val === 1 || val === true || val === '1' || val === 'true' || val === 'ON';
  };
  const getDynTag = (eqKey, sigKey, hardcoded) => {
    const tagId = tagMap[`${eqKey}__${sigKey}`];
    return tagId ? tagIdToName[tagId] : hardcoded;
  };

  const handleEquipmentClick = (id, subs = [], signals = null) => {
    if (configMode) {
      let customSignals = signals;
      if (!customSignals) {
        if (["tippler", "sfb-autofeeder", "sfb-conveyor", "bottom-cross-conv", "fruit-elevator1", "fruit-elevator2", "efb-horizontal-conv", "usb-elevator"].includes(id)) {
           customSignals = [
             { key: "HZ", label: "Speed (Hz)" },
             { key: "AMP", label: "Current (A)" },
             { key: "RUN", label: "Run Status" }
           ];
        } else if (id === "ts_stats_1") {
           customSignals = [
             { key: "SCORE", label: "Threshing Station Score (%)" },
             { key: "THROUGHPUT", label: "Threshing Station Throughput (mt/hr)" },
           ];
        } else if (id === "ts_stats_2") {
           customSignals = [
             { key: "EFB_COUNT", label: "EFB Count (%)" },
             { key: "USB_COUNT", label: "USB Count (%)" },
             { key: "PSB_COUNT", label: "PSB Count (%)" },
             { key: "USB_REJECTED", label: "Total USB Rejected" },
             { key: "PSB_REJECTED", label: "Total PSB Rejected" }
           ];
        } else if (id === "ts_stats_3") {
           customSignals = [
             { key: "STERIL_EFF", label: "MPD Sterilization Efficiency (%)" },
             { key: "THRESH_EFF", label: "Threshing Efficiency (%)" }
           ];
        } else if (["thresher1", "thresher2", "thresher3"].includes(id)) {
           customSignals = [
             { key: "HZ", label: "Speed (Hz)" },
             { key: "AMP", label: "Current (A)" },
             { key: "PCT", label: "Load (%)" },
             { key: "RUN", label: "Run Status" }
           ];
        } else if (["under-thresher-conv1", "under-thresher-conv2", "under-thresher-conv3", "bunch-crusher", "efb-inclined-conv"].includes(id)) {
           customSignals = [
             { key: "AMP", label: "Current (A)" },
             { key: "RUN", label: "Run Status" }
           ];
        } else {
           customSignals = [
             { key: "MONITOR", label: "Monitoring Point" }
           ];
        }
      }
      handleTagEditRequest(id, subs, customSignals);
      return;
    }
    console.log(`Equipment clicked: ${id}`);
  };

  const motorData = {
    tippler: {
      freq: getDyn('tippler', 'HZ', 'TSR_TIP_HZ'),
      amp: getDyn('tippler', 'AMP', 'TSR_TIP_AMP'),
      ampTag: getDynTag('tippler', 'AMP', 'TSR_TIP_AMP'),
      run: getDynRun('tippler', 'TSR_TIP_RUN')
    },
    sfbAutofeeder: {
      freq: getDyn('sfb-autofeeder', 'HZ', 'TSR_AF_HZ'),
      amp: getDyn('sfb-autofeeder', 'AMP', 'TSR_AF_AMP'),
      ampTag: getDynTag('sfb-autofeeder', 'AMP', 'TSR_AF_AMP'),
      run: getDynRun('sfb-autofeeder', 'TSR_AF_RUN')
    },
    sfbConveyor: {
      freq: getDyn('sfb-conveyor', 'HZ', 'TSR_SFBC_HZ'),
      amp: getDyn('sfb-conveyor', 'AMP', 'TSR_SFBC_AMP'),
      ampTag: getDynTag('sfb-conveyor', 'AMP', 'TSR_SFBC_AMP'),
      run: getDynRun('sfb-conveyor', 'TSR_SFBC_RUN')
    },
    thresher1: {
      freq: getDyn('thresher1', 'HZ', 'TSR_TH1_HZ'),
      amp: getDyn('thresher1', 'AMP', 'TSR_TH1_AMP'),
      pct: getDyn('thresher1', 'PCT', 'TSR_TH1_PCT'),
      ampTag: getDynTag('thresher1', 'AMP', 'TSR_TH1_AMP'),
      run: getDynRun('thresher1', 'TSR_TH1_RUN')
    },
    thresher2: {
      freq: getDyn('thresher2', 'HZ', 'TSR_TH2_HZ'),
      amp: getDyn('thresher2', 'AMP', 'TSR_TH2_AMP'),
      pct: getDyn('thresher2', 'PCT', 'TSR_TH2_PCT'),
      ampTag: getDynTag('thresher2', 'AMP', 'TSR_TH2_AMP'),
      run: getDynRun('thresher2', 'TSR_TH2_RUN')
    },
    thresher3: {
      freq: getDyn('thresher3', 'HZ', 'TSR_TH3_HZ'),
      amp: getDyn('thresher3', 'AMP', 'TSR_TH3_AMP'),
      pct: getDyn('thresher3', 'PCT', 'TSR_TH3_PCT'),
      ampTag: getDynTag('thresher3', 'AMP', 'TSR_TH3_AMP'),
      run: getDynRun('thresher3', 'TSR_TH3_RUN')
    },
    underThresherConv1: {
      amp: getDyn('under-thresher-conv1', 'AMP', 'TSR_BC1_AMP'),
      ampTag: getDynTag('under-thresher-conv1', 'AMP', 'TSR_BC1_AMP'),
      run: getDynRun('under-thresher-conv1', 'TSR_BC1_RUN')
    },
    underThresherConv2: {
      amp: getDyn('under-thresher-conv2', 'AMP', 'TSR_BC2_AMP'),
      ampTag: getDynTag('under-thresher-conv2', 'AMP', 'TSR_BC2_AMP'),
      run: getDynRun('under-thresher-conv2', 'TSR_BC2_RUN')
    },
    underThresherConv3: {
      amp: getDyn('under-thresher-conv3', 'AMP', 'TSR_BC3_AMP'),
      ampTag: getDynTag('under-thresher-conv3', 'AMP', 'TSR_BC3_AMP'),
      run: getDynRun('under-thresher-conv3', 'TSR_BC3_RUN')
    },
    bottomCrossConv: {
      freq: getDyn('bottom-cross-conv', 'HZ', 'TSR_CC_HZ'),
      amp: getDyn('bottom-cross-conv', 'AMP', 'TSR_CC_AMP'),
      ampTag: getDynTag('bottom-cross-conv', 'AMP', 'TSR_CC_AMP'),
      run: getDynRun('bottom-cross-conv', 'TSR_CC_RUN')
    },
    fruitElevator1: {
      amp: getDyn('fruit-elevator1', 'AMP', 'TSR_EL1_AMP'),
      pct: getDyn('fruit-elevator1', 'PCT', 'TSR_EL1_PCT'),
      ampTag: getDynTag('fruit-elevator1', 'AMP', 'TSR_EL1_AMP'),
      run: getDynRun('fruit-elevator1', 'TSR_EL1_RUN')
    },
    fruitElevator2: {
      amp: getDyn('fruit-elevator2', 'AMP', 'TSR_EL2_AMP'),
      pct: getDyn('fruit-elevator2', 'PCT', 'TSR_EL2_PCT'),
      ampTag: getDynTag('fruit-elevator2', 'AMP', 'TSR_EL2_AMP'),
      run: getDynRun('fruit-elevator2', 'TSR_EL2_RUN')
    },
    bunchCrusher: {
      amp: getDyn('bunch-crusher', 'AMP', 'TSR_BCR_AMP'),
      ampTag: getDynTag('bunch-crusher', 'AMP', 'TSR_BCR_AMP'),
      run: getDynRun('bunch-crusher', 'TSR_BCR_RUN')
    },
    efbHorizontalConv: {
      amp: getDyn('efb-horizontal-conv', 'AMP', 'TSR_SFBDC_AMP'),
      ampTag: getDynTag('efb-horizontal-conv', 'AMP', 'TSR_SFBDC_AMP'),
      run: getDynRun('efb-horizontal-conv', 'TSR_SFBDC_RUN')
    },
    usbElevator: {
      amp: getDyn('usb-elevator', 'AMP', 'TSR_USBC_AMP'),
      ampTag: getDynTag('usb-elevator', 'AMP', 'TSR_USBC_AMP'),
      run: getDynRun('usb-elevator', 'TSR_USBC_RUN')
    },
    efbInclinedConv: {
      amp: getDyn('efb-inclined-conv', 'AMP', 'TSR_EFBIC_AMP'),
      ampTag: getDynTag('efb-inclined-conv', 'AMP', 'TSR_EFBIC_AMP'),
      run: getDynRun('efb-inclined-conv', 'TSR_EFBIC_RUN')
    },
  };

  const stationStats = {
    score: getDyn('ts_stats_1', 'SCORE', 'TSR_SCORE'),
    throughput: getDyn('ts_stats_1', 'THROUGHPUT', 'TSR_THROUGHPUT'),
    efbCount: getDyn('ts_stats_2', 'EFB_COUNT', 'TSR_EFB_COUNT'),
    usbCount: getDyn('ts_stats_2', 'USB_COUNT', 'TSR_USB_COUNT'),
    psbCount: getDyn('ts_stats_2', 'PSB_COUNT', 'TSR_PSB_COUNT'),
    totalUsbRejected: getDyn('ts_stats_2', 'USB_REJECTED', 'TSR_USB_REJ'),
    totalPsbRejected: getDyn('ts_stats_2', 'PSB_REJECTED', 'TSR_PSB_REJ'),
    sterilEfficiency: getDyn('ts_stats_3', 'STERIL_EFF', 'TSR_STER_EFF'),
    threshEfficiency: getDyn('ts_stats_3', 'THRESH_EFF', 'TSR_TH_EFF'),
  };

  const getMappedValueForSettings = useCallback((equipment, signalKey) => {
    const key = `${equipment}__${signalKey}`;
    const tagId = tagMap[key];
    if (!tagId) {
      return "no tag";
    }

    const tagName = tagIdToName[tagId];
    if (!tagName) return "--";

    const tagData = tags[tagName];
    if (tagData && tagData.value !== undefined) return tagData.value;
    return "--";
  }, [tagMap, tagIdToName, tags]);

  return (
    <>
      {showSettings ? (
        <ThreshingStationSettingsPage
          onClose={() => setShowSettings(false)}
          onSelectSubmenu={onSelectSubmenu}
          configMode={configMode}
          handleEquipmentClick={handleEquipmentClick}
          tagMap={tagMap}
          getMappedValue={getMappedValueForSettings}
        />
      ) : (
        <section className={`som-thresher-station som-mode-${viewMode} ${configMode ? 'som-config-active' : ''}`}>
      <header className="som-thresher-station-header">
        <div className="som-header-left">
          <h1 className="som-thresher-station-title">THRESHING STATION</h1>

          <div className="som-station-tabs">
            <button className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`som-station-tab ${activeTab === 'ai-grading-mpd' ? 'active' : ''}`} onClick={() => setActiveTab('ai-grading-mpd')}>AI GRADING - MPD</button>
            <button className={`som-station-tab ${activeTab === 'ai-grading-ebc' ? 'active' : ''}`} onClick={() => setActiveTab('ai-grading-ebc')}>AI GRADING - EBC</button>
          </div>
        </div>

        <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
          <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
          <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
          </button>
          {onSelectSubmenu && (
            <button className="som-view-btn" onClick={() => setShowSettings(true)} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
          )}
        </div>
      </header>

      <div className="som-thresher-main">
        <div className="som-thresher-layout">
          {activeTab === 'overview' ? (
            <OverviewTab
              viewMode={viewMode}
              configMode={configMode}
              tagMap={tagMap}
              handleEquipmentClick={handleEquipmentClick}
              lv={lv}
              motorData={motorData}
              stationStats={stationStats}
              svgRef={svgRef}
              handleMouseMove={handleMouseMove}
            />
          ) : activeTab === 'ai-grading-mpd' ? (
            <AiGradingMpdTab
              configMode={configMode}
              availableTags={availableTags}
              tagMap={tagMap}
            />
          ) : (
            <AiGradingEbcTab
              configMode={configMode}
              availableTags={availableTags}
              tagMap={tagMap}
            />
          )}
        </div>
      </div>
      </section>
      )}

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
    </>
  )
}

export default ThreshingStationPage;
