import { useState } from 'react'
import { createPortal } from 'react-dom'
import usePlcStore from '@core/store'
import './ThreshingStationSettingsModal.css'
import '../ThreshingStationPage.css'
import digesterImg from '../assets/digister-setting.webp'

const ValBox = ({ value, unit, decimals = 1, onClick, style }) => (
  <div className={`som-ts-val-box ${onClick ? 'som-ts-val-box--editable' : ''}`} onClick={onClick} style={style}>
    {typeof value === 'number' ? value.toFixed(decimals) : value}
    {unit && <span className="som-ts-val-unit">{unit}</span>}
  </div>
);

const LiveValBox = ({ getMappedValue, eqId, signalKey, fallback, isNumber = true, unit, decimals = 1, onClick, style, stagedEdits }) => {
  const keys = Array.isArray(signalKey) ? signalKey : [signalKey];
  let stagedVal;
  if (stagedEdits) {
    for (const sk of keys) {
      if (stagedEdits[`${eqId}__${sk}`] !== undefined) {
        stagedVal = stagedEdits[`${eqId}__${sk}`];
        break;
      }
    }
  }

  let displayValue = fallback;
  if (stagedVal !== undefined) {
    displayValue = isNumber ? Number(stagedVal) : stagedVal;
  } else {
    let mappedVal = null;
    if (getMappedValue) {
      for (const sk of keys) {
        const v = getMappedValue(eqId, sk);
        if (v !== null && v !== undefined && v !== "no tag" && v !== "No Tag") {
          mappedVal = v;
          if (v !== "--") break; // Prefer real numerical value over "--"
        }
      }
    }
    if (mappedVal === "no tag" || mappedVal === "No Tag") {
      displayValue = fallback !== undefined ? fallback : "no tag";
    } else if (mappedVal === "--") {
      displayValue = "--";
    } else if (mappedVal !== null && mappedVal !== undefined) {
      displayValue = isNumber ? Number(mappedVal) : (mappedVal === 1 || mappedVal === '1' || mappedVal === true || mappedVal === 'true');
    }
  }

  const finalStyle = stagedVal !== undefined ? { ...style, background: '#fef08a', color: '#854d0e', outline: '1px dashed #eab308' } : style;

  return (
    <ValBox 
      value={displayValue} 
      unit={unit} 
      decimals={decimals} 
      onClick={onClick} 
      style={finalStyle} 
    />
  );
};

// ==========================================
// Data Defaults dari Dokumen Excel
// ==========================================
const defaultDigesterData = [
  { id: 1, lowSP: 18.0, highSP: 42.0, pv: 42.0, load: 100.0 },
  { id: 2, lowSP: 19.0, highSP: 43.0, pv: 43.0, load: 100.0 },
  { id: 3, lowSP: 20.0, highSP: 40.0, pv: 0.0, load: 0.0 },
  { id: 4, lowSP: 18.0, highSP: 45.0, pv: 40.0, load: 81.0 },
];

const defaultRunningSettings = [
  { runningCount: 1, afMin: 35.0, afMax: 40.0, sfbMin: 30.0, sfbMax: 36.67 },
  { runningCount: 2, afMin: 40.0, afMax: 43.33, sfbMin: 36.67, sfbMax: 41.11 },
  { runningCount: 3, afMin: 43.33, afMax: 45.56, sfbMin: 41.11, sfbMax: 44.07 },
  { runningCount: 4, afMin: 45.56, afMax: 50.0, sfbMin: 44.07, sfbMax: 50.0 },
];

const defaultSfbCurve = [
  { range: 'Min', afHz: 50.0, sfbHz: 50.0, thresherLoad: 100 },
  { range: '0 - 10%', afHz: 50.0, sfbHz: 50.0, thresherLoad: 100 },
  { range: '11 - 20%', afHz: 50.0, sfbHz: 50.0, thresherLoad: 100 },
  { range: '21 - 30%', afHz: 50.0, sfbHz: 50.0, thresherLoad: 100 },
  { range: '31 - 40%', afHz: 50.0, sfbHz: 50.0, thresherLoad: 100 },
  { range: '41 - 50%', afHz: 50.0, sfbHz: 50.0, thresherLoad: 100 },
  { range: '51 - 60%', afHz: 50.0, sfbHz: 50.0, thresherLoad: 100 },
  { range: '61 - 70%', afHz: 50.0, sfbHz: 50.0, thresherLoad: 100 },
  { range: '71 - 80%', afHz: 50.0, sfbHz: 50.0, thresherLoad: 93 },
  { range: '81 - 90%', afHz: 45.0, sfbHz: 45.0, thresherLoad: 87 },
  { range: '91 - 100%', afHz: 40.0, sfbHz: 30.0, thresherLoad: 80 },
  { range: 'Max', afHz: 40.0, sfbHz: 30.0, thresherLoad: 80 },
];

const defaultThresherSettings = [
  { id: 1, empty: 10.0, full: 20.0, pv: 18.0 },
  { id: 2, empty: 10.0, full: 20.0, pv: 19.0 },
  { id: 3, empty: 10.0, full: 16.0, pv: 16.0 },
];

const defaultThresherFeeding = [
  { id: 1, empty: 12.2, full: 16.7, pv: 17.4, control: 'Feed damper -5% if Util > 100%, relay 5s' },
  { id: 2, empty: 12.6, full: 15.5, pv: 14.2, control: 'Feed damper hold if Util = 100%, relay 5s' },
  { id: 3, empty: 13.1, full: 14.1, pv: 13.6, control: 'Feed damper +5% if Util < 100%, relay 5s' },
];

const defaultOverriding = {
  overallLoadPV: 6.8,
  overallLoadUtil: 92,
  thresherFullLoadPV: 7.4,
  thresherFullLoadUtil: 100,
  controlText: 'Ignore signal from digester to increase Autofeeder & SFB Hz if Overall Thresher Load > 100%'
};

const defaultThroughput = {
  currentThroughput: 41.35,
  throughputScore: 92
};

// ==========================================
// Main Component
// ==========================================
function ThreshingStationSettingsPage({
  onSelectSubmenu,
  onClose,
  configMode = false,
  handleEquipmentClick,
  tagMap = {},
  getMappedValue
}) {
  const [digesterData, setDigesterData] = useState(defaultDigesterData);
  const [runningSettings, setRunningSettings] = useState(defaultRunningSettings);
  const [sfbCurve, setSfbCurve] = useState(defaultSfbCurve);
  const [thresherSettings, setThresherSettings] = useState(defaultThresherSettings);
  const [thresherFeeding, setThresherFeeding] = useState(defaultThresherFeeding);
  const [overriding, setOverriding] = useState(defaultOverriding);
  const [throughput, setThroughput] = useState(defaultThroughput);

  const [stagedEdits, setStagedEdits] = useState({});
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const getCalcVal = (equipmentKey, signalKey, localFallback) => {
    const key = `${equipmentKey}__${signalKey}`;
    if (stagedEdits[key] !== undefined) return stagedEdits[key];

    if (getMappedValue) {
      const val = getMappedValue(equipmentKey, signalKey);
      if (val === "no tag" || val === "No Tag" || val === "--") {
        return 0;
      }
      if (val !== null && val !== undefined) {
        return Number(val) || 0;
      }
    }
    return localFallback;
  };

  // Perhitungan total Digester
  const calcDigesterLoad = (dig) => {
    const low = getCalcVal(`settings_digester_${dig.id}_lowSP`, "SETPOINT", dig.lowSP);
    const high = getCalcVal(`settings_digester_${dig.id}_highSP`, "SETPOINT", dig.highSP);
    if (high - low > 0) {
      const load = ((dig.pv - low) / (high - low)) * 100;
      return Math.max(0, Math.min(100, load));
    }
    return 0;
  };

  const totalLoad = digesterData.reduce((sum, d) => sum + calcDigesterLoad(d), 0) / digesterData.length;
  const digesterTotalEmpty = digesterData.reduce((sum, d) => sum + getCalcVal(`settings_digester_${d.id}_lowSP`, "SETPOINT", d.lowSP), 0);
  const digesterTotalFull = digesterData.reduce((sum, d) => sum + getCalcVal(`settings_digester_${d.id}_highSP`, "SETPOINT", d.highSP), 0);

  // Perhitungan total Thresher Motor
  const thresherTotalEmpty = thresherSettings.reduce((sum, t) => sum + getCalcVal(`settings_th_${t.id}_empty`, "SETPOINT", t.empty), 0);
  const thresherTotalFull = thresherSettings.reduce((sum, t) => sum + getCalcVal(`settings_th_${t.id}_full`, "SETPOINT", t.full), 0);
  const thresherTotalPV = thresherSettings.reduce((sum, t) => sum + getCalcVal(`settings_th_${t.id}_pv`, "MONITOR", t.pv), 0);
  
  const thresherTotalUtil = thresherTotalFull - thresherTotalEmpty > 0
    ? ((thresherTotalPV - thresherTotalEmpty) / (thresherTotalFull - thresherTotalEmpty)) * 100
    : 0;

  // Perhitungan Over-riding dan Throughput
  const avgThresherPV = thresherSettings.length ? (thresherTotalPV / thresherSettings.length) : 0;
  const avgThresherFull = thresherSettings.length ? (thresherTotalFull / thresherSettings.length) : 0;
  const computedCurrentThroughput = Math.max(0, (thresherTotalUtil / 100) * 45); // Asumsi max 45 mt/hr
  const computedThroughputScore = Math.max(0, Math.min(100, thresherTotalUtil));

  const getDeveloperStyle = (id, signalKey) => {
    if (!configMode) return {};
    const keys = Array.isArray(signalKey) ? signalKey : [signalKey];
    const hasTag = tagMap && keys.some(sk => !!tagMap[`${id}__${sk}`]);
    return {
      outline: hasTag ? "1.5px solid #3b82f6" : "2px solid #ef4444",
      boxShadow: hasTag ? "0 0 6px rgba(59, 130, 246, 0.5)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasTag ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
      position: "relative",
    };
  };

  const handleBackToOverview = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (onSelectSubmenu) {
      onSelectSubmenu('Threshing Station', 'Overview');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const sendPlc = (val, equipmentKey, signalKey) => {
      if (val === null || val === undefined) return;
      const key = `${equipmentKey}__${signalKey}`;
      const tagId = tagMap[key];
      if (tagId) {
        usePlcStore.getState().sendCommand(tagId, val, key, "threshing");
      }
    };

    for (const [key, val] of Object.entries(stagedEdits)) {
       const [eqId, sigKey] = key.split('__');
       if (eqId && sigKey) {
           sendPlc(val, eqId, sigKey);
       }
    }

    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
    setStagedEdits({});
    handleBackToOverview();
  };

  const handleKeypadConfirm = (val) => {
    if (!activeKeypad) return;
    const kp = activeKeypad;

    // Resolve eqId to store in stagedEdits
    let resolvedEqId = null;
    if (kp.section === 'digester') resolvedEqId = `settings_digester_${digesterData[kp.idx].id}_${kp.param}`;
    else if (kp.section === 'digesterTotalLoad') resolvedEqId = `settings_digester_total_load`;
    else if (kp.section === 'runningSettings') resolvedEqId = `settings_run_${kp.param}_${runningSettings[kp.idx].runningCount}`;
    else if (kp.section === 'sfbCurve') resolvedEqId = `settings_curve_${kp.param}_${kp.idx}`;
    else if (kp.section === 'thresherSettings') resolvedEqId = `settings_th_${thresherSettings[kp.idx].id}_${kp.param}`;
    else if (kp.section === 'thresherFeeding') resolvedEqId = `settings_feed_th_${thresherFeeding[kp.idx].id}_${kp.param}`;

    if (resolvedEqId) {
      setStagedEdits(prev => ({ ...prev, [`${resolvedEqId}__SETPOINT`]: val }));
    }

    if (kp.section === 'digester') {
      setDigesterData(prev => prev.map((d, i) => i === kp.idx ? { ...d, [kp.param]: val } : d));
    } else if (kp.section === 'runningSettings') {
      setRunningSettings(prev => prev.map((item, i) => i === kp.idx ? { ...item, [kp.param]: val } : item));
    } else if (kp.section === 'sfbCurve') {
      setSfbCurve(prev => prev.map((item, i) => i === kp.idx ? { ...item, [kp.param]: val } : item));
    } else if (kp.section === 'thresherSettings') {
      setThresherSettings(prev => prev.map((item, i) => i === kp.idx ? { ...item, [kp.param]: val } : item));
    } else if (kp.section === 'thresherFeeding') {
      setThresherFeeding(prev => prev.map((item, i) => i === kp.idx ? { ...item, [kp.param]: val } : item));
    } else if (kp.section === 'overriding') {
      setOverriding(prev => ({ ...prev, [kp.param]: val }));
    } else if (kp.section === 'throughput') {
      setThroughput(prev => ({ ...prev, [kp.param]: val }));
    }
    setActiveKeypad(null);
  };

  return (
    <section className="som-thresher-station" style={{ height: '100%', overflow: 'hidden' }}>
      <header className="som-thresher-station-header">
        <div className="som-header-left">
          <h1 className="som-thresher-station-title">THRESHING STATION</h1>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
          <button className="som-view-btn" onClick={handleBackToOverview}>PROCESS VIEW</button>
          <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
          </button>
          <button className="som-view-btn active" onClick={() => { }} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
        </div>
      </header>

      <div className="som-thresher-main" style={{ flex: 1, minHeight: 0, padding: '10px', overflow: 'hidden' }}>
        <div className="som-thresher-layout" style={{ height: '100%', display: 'flex', gap: '10px' }}>
          <div className="som-ts-page" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <div className="som-ts-content" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', padding: 0 }}>

              {/* LEFT PANEL */}
              <div className="som-ts-left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>

                {/* 1. Digester Settings (Takes remaining flex space) */}
                <div className="som-ts-digester-card som-ts-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="som-ts-card-header" style={{ padding: '3px 8px' }}>
                    <h3 className="som-ts-card-title">Digester Empty & Full settings</h3>
                    <div className="som-ts-total-load-row" style={{ padding: '2px 8px' }}>
                      <span className="som-ts-total-load-label">Total Load</span>
                      <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                        eqId="settings_digester_total_load"
                        signalKey={["SETPOINT", "MONITOR"]}
                        fallback={totalLoad}
                        unit="%"
                        onClick={
                          configMode
                            ? () => handleEquipmentClick("settings_digester_total_load", [], [{ key: "SETPOINT", label: "Digester Total Load SP" }, { key: "MONITOR", label: "Digester Total Load PV" }])
                            : () => setActiveKeypad({ section: 'digesterTotalLoad', idx: 0, param: 'totalLoad', label: 'Digester Total Load' })
                        }
                        style={{ ...getDeveloperStyle("settings_digester_total_load", ["SETPOINT", "MONITOR"]), minWidth: '50px' }}
                      />
                    </div>
                  </div>
                  <div className="som-ts-card-body" style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
                    <div className="som-ts-digester-grid" style={{ flex: 1, alignItems: 'center' }}>
                      {digesterData.map((dig, di) => (
                        <div key={di} className="som-ts-digester-unit" style={{ padding: '6px 4px', gap: '4px', height: '100%', justifyContent: 'space-evenly' }}>
                          <div className="som-ts-digester-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>DIGESTER {dig.id}</div>
                          <div className="som-ts-digester-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
                            <img src={digesterImg} alt={`Digester D-${dig.id}`} style={{ height: '300px', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                          <div className="som-ts-digester-params" style={{ gap: '3px' }}>
                            <div className="som-ts-digester-param" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="som-ts-param-label" style={{ fontSize: '9px' }}>Empty</span>
                              <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                eqId={`settings_digester_${dig.id}_lowSP`}
                                signalKey="SETPOINT"
                                fallback={dig.lowSP}
                                unit="A"
                                onClick={
                                  configMode
                                    ? () => handleEquipmentClick(`settings_digester_${dig.id}_lowSP`, [], [{ key: "SETPOINT", label: `D-${dig.id} Empty SP` }])
                                    : () => setActiveKeypad({ section: 'digester', idx: di, param: 'lowSP', label: `D-${dig.id} Empty` })
                                }
                                style={{ ...getDeveloperStyle(`settings_digester_${dig.id}_lowSP`, "SETPOINT"), minWidth: '50px', padding: '2px 4px', fontSize: '11px' }}
                              />
                            </div>
                            <div className="som-ts-digester-param" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="som-ts-param-label" style={{ fontSize: '9px' }}>Full</span>
                              <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                eqId={`settings_digester_${dig.id}_highSP`}
                                signalKey="SETPOINT"
                                fallback={dig.highSP}
                                unit="A"
                                onClick={
                                  configMode
                                    ? () => handleEquipmentClick(`settings_digester_${dig.id}_highSP`, [], [{ key: "SETPOINT", label: `D-${dig.id} Full SP` }])
                                    : () => setActiveKeypad({ section: 'digester', idx: di, param: 'highSP', label: `D-${dig.id} Full` })
                                }
                                style={{ ...getDeveloperStyle(`settings_digester_${dig.id}_highSP`, "SETPOINT"), minWidth: '50px', padding: '2px 4px', fontSize: '11px' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Digester Total Row */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', padding: '4px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', marginTop: '6px', flexShrink: 0 }}>
                      <span>Total Empty: <span style={{ color: '#0f172a' }}>{digesterTotalEmpty.toFixed(1)} A</span></span>
                      <span>Total Full: <span style={{ color: '#0f172a' }}>{digesterTotalFull.toFixed(1)} A</span></span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW IN LEFT PANEL: Autofeeder & Thresher side-by-side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '8px', flexShrink: 0 }}>

                  {/* 2. Autofeeder & SFB Conveyor Settings */}
                  <div className="som-ts-card" style={{ minWidth: 0 }}>
                    <div className="som-ts-card-header" style={{ padding: '3px 8px' }}>
                      <h3 className="som-ts-card-title" style={{ fontSize: '10px' }}>Autofeeder & SFB running count</h3>
                    </div>
                    <div className="som-ts-card-body" style={{ padding: '4px 6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '10px', color: '#1e293b' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '3px 2px' }}>Running</th>
                            <th style={{ padding: '3px 2px' }}>AF Min</th>
                            <th style={{ padding: '3px 2px' }}>AF Max</th>
                            <th style={{ padding: '3px 2px' }}>SFB Min</th>
                            <th style={{ padding: '3px 2px' }}>SFB Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runningSettings.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '2px 0', fontWeight: 'bold' }}>{row.runningCount} Dig</td>
                              <td style={{ padding: '2px 0' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_run_afMin_${row.runningCount}`}
                                  signalKey="SETPOINT"
                                  fallback={row.afMin}
                                  decimals={2}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_run_afMin_${row.runningCount}`, [], [{ key: "SETPOINT", label: `${row.runningCount} Dig - AF Min` }])
                                      : () => setActiveKeypad({ section: 'runningSettings', idx: ri, param: 'afMin', label: `${row.runningCount} Dig - AF Min` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_run_afMin_${row.runningCount}`, "SETPOINT"), padding: '0px 2px', fontSize: '10px', minWidth: '38px' }}
                                />
                              </td>
                              <td style={{ padding: '2px 0' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_run_afMax_${row.runningCount}`}
                                  signalKey="SETPOINT"
                                  fallback={row.afMax}
                                  decimals={2}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_run_afMax_${row.runningCount}`, [], [{ key: "SETPOINT", label: `${row.runningCount} Dig - AF Max` }])
                                      : () => setActiveKeypad({ section: 'runningSettings', idx: ri, param: 'afMax', label: `${row.runningCount} Dig - AF Max` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_run_afMax_${row.runningCount}`, "SETPOINT"), padding: '0px 2px', fontSize: '10px', minWidth: '38px' }}
                                />
                              </td>
                              <td style={{ padding: '2px 0' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_run_sfbMin_${row.runningCount}`}
                                  signalKey="SETPOINT"
                                  fallback={row.sfbMin}
                                  decimals={2}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_run_sfbMin_${row.runningCount}`, [], [{ key: "SETPOINT", label: `${row.runningCount} Dig - SFB Min` }])
                                      : () => setActiveKeypad({ section: 'runningSettings', idx: ri, param: 'sfbMin', label: `${row.runningCount} Dig - SFB Min` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_run_sfbMin_${row.runningCount}`, "SETPOINT"), padding: '0px 2px', fontSize: '10px', minWidth: '38px' }}
                                />
                              </td>
                              <td style={{ padding: '2px 0' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_run_sfbMax_${row.runningCount}`}
                                  signalKey="SETPOINT"
                                  fallback={row.sfbMax}
                                  decimals={2}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_run_sfbMax_${row.runningCount}`, [], [{ key: "SETPOINT", label: `${row.runningCount} Dig - SFB Max` }])
                                      : () => setActiveKeypad({ section: 'runningSettings', idx: ri, param: 'sfbMax', label: `${row.runningCount} Dig - SFB Max` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_run_sfbMax_${row.runningCount}`, "SETPOINT"), padding: '0px 2px', fontSize: '10px', minWidth: '38px' }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. Thresher Empty & Full Settings */}
                  <div className="som-ts-card" style={{ minWidth: 0 }}>
                    <div className="som-ts-card-header" style={{ padding: '3px 8px' }}>
                      <h3 className="som-ts-card-title" style={{ fontSize: '10px' }}>Thresher Empty & Full Motor</h3>
                    </div>
                    <div className="som-ts-card-body" style={{ padding: '4px 6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '10px', color: '#1e293b' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '3px 2px' }}>Thresher</th>
                            <th style={{ padding: '3px 2px' }}>Empty</th>
                            <th style={{ padding: '3px 2px' }}>Full</th>
                            <th style={{ padding: '3px 2px' }}>PV</th>
                            <th style={{ padding: '3px 2px' }}>Util</th>
                          </tr>
                        </thead>
                        <tbody>
                          {thresherSettings.map((row, ri) => {
                            const liveEmpty = getCalcVal(`settings_th_${row.id}_empty`, "SETPOINT", row.empty);
                            const liveFull = getCalcVal(`settings_th_${row.id}_full`, "SETPOINT", row.full);
                            const livePV = getCalcVal(`settings_th_${row.id}_pv`, "MONITOR", row.pv);
                            const singleUtil = liveFull - liveEmpty > 0
                              ? ((livePV - liveEmpty) / (liveFull - liveEmpty)) * 100
                              : 0;
                            return (
                              <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '2px 0', fontWeight: 'bold' }}>T-{row.id}</td>
                                <td style={{ padding: '2px 0' }}>
                                  <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                    eqId={`settings_th_${row.id}_empty`}
                                    signalKey="SETPOINT"
                                    fallback={row.empty}
                                    onClick={
                                      configMode 
                                        ? () => handleEquipmentClick(`settings_th_${row.id}_empty`, [], [{ key: "SETPOINT", label: `T-${row.id} Empty` }])
                                        : () => setActiveKeypad({ section: 'thresherSettings', idx: ri, param: 'empty', label: `T-${row.id} Empty` })
                                    }
                                    style={{ ...getDeveloperStyle(`settings_th_${row.id}_empty`, "SETPOINT"), padding: '0px 2px', fontSize: '10px', minWidth: '38px' }}
                                  />
                                </td>
                                <td style={{ padding: '2px 0' }}>
                                  <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                    eqId={`settings_th_${row.id}_full`}
                                    signalKey="SETPOINT"
                                    fallback={row.full}
                                    onClick={
                                      configMode 
                                        ? () => handleEquipmentClick(`settings_th_${row.id}_full`, [], [{ key: "SETPOINT", label: `T-${row.id} Full` }])
                                        : () => setActiveKeypad({ section: 'thresherSettings', idx: ri, param: 'full', label: `T-${row.id} Full` })
                                    }
                                    style={{ ...getDeveloperStyle(`settings_th_${row.id}_full`, "SETPOINT"), padding: '0px 2px', fontSize: '10px', minWidth: '38px' }}
                                  />
                                </td>
                                <td style={{ padding: '2px 0' }}>
                                  <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                    eqId={`settings_th_${row.id}_pv`}
                                    signalKey="MONITOR"
                                    fallback={row.pv}
                                    style={{ ...getDeveloperStyle(`settings_th_${row.id}_pv`, "MONITOR") }}
                                    onClick={
                                      configMode 
                                        ? () => handleEquipmentClick(`settings_th_${row.id}_pv`, [], [{ key: "MONITOR", label: `T-${row.id} Load PV` }])
                                        : undefined
                                    }
                                  />
                                </td>
                                <td style={{ padding: '2px 0', fontWeight: 'bold' }}>{singleUtil.toFixed(0)}%</td>
                              </tr>
                            );
                          })}
                          <tr style={{ borderTop: '1px solid #e2e8f0', fontWeight: 'bold', background: '#f8fafc' }}>
                            <td style={{ padding: '2px 0' }}>Total</td>
                            <td style={{ padding: '2px 0' }}>{thresherTotalEmpty.toFixed(1)}</td>
                            <td style={{ padding: '2px 0' }}>{thresherTotalFull.toFixed(1)}</td>
                            <td style={{ padding: '2px 0' }}>{thresherTotalPV.toFixed(1)}</td>
                            <td style={{ padding: '2px 0' }}>{thresherTotalUtil.toFixed(0)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>

              {/* RIGHT PANEL */}
              <div className="som-ts-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>

                {/* 1. Tippler & SFB Conveyor Automation Logics */}
                <div className="som-ts-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <div className="som-ts-card-header" style={{ padding: '3px 8px' }}>
                    <h3 className="som-ts-card-title">Tippler & SFB Conveyor Automation Logics</h3>
                  </div>
                  <div className="som-ts-card-body" style={{ padding: '4px 8px', overflowY: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'block' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px', color: '#1e293b' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '4px 2px' }}>Digester Load Util (%)</th>
                            <th style={{ padding: '4px 2px' }}>Autofeeder (Hz)</th>
                            <th style={{ padding: '4px 2px' }}>SFB Conveyor (Hz)</th>
                            <th style={{ padding: '4px 2px' }}>Thresher Load</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sfbCurve.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '3px 2px', fontWeight: 'bold' }}>{row.range}</td>
                              <td style={{ padding: '3px 2px' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_curve_afHz_${ri}`}
                                  signalKey="SETPOINT"
                                  fallback={row.afHz}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_curve_afHz_${ri}`, [], [{ key: "SETPOINT", label: `Load ${row.range} - AF Hz` }])
                                      : () => setActiveKeypad({ section: 'sfbCurve', idx: ri, param: 'afHz', label: `Load ${row.range} - AF Hz` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_curve_afHz_${ri}`, "SETPOINT"), padding: '0px 4px', fontSize: '11px', minWidth: '40px' }}
                                />
                              </td>
                              <td style={{ padding: '3px 2px' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_curve_sfbHz_${ri}`}
                                  signalKey="SETPOINT"
                                  fallback={row.sfbHz}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_curve_sfbHz_${ri}`, [], [{ key: "SETPOINT", label: `Load ${row.range} - SFB Hz` }])
                                      : () => setActiveKeypad({ section: 'sfbCurve', idx: ri, param: 'sfbHz', label: `Load ${row.range} - SFB Hz` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_curve_sfbHz_${ri}`, "SETPOINT"), padding: '0px 4px', fontSize: '11px', minWidth: '40px' }}
                                />
                              </td>
                              <td style={{ padding: '3px 2px' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_curve_thresherLoad_${ri}`}
                                  signalKey="SETPOINT"
                                  fallback={row.thresherLoad}
                                  decimals={0}
                                  unit="%"
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_curve_thresherLoad_${ri}`, [], [{ key: "SETPOINT", label: `Load ${row.range} - Th Load` }])
                                      : () => setActiveKeypad({ section: 'sfbCurve', idx: ri, param: 'thresherLoad', label: `Load ${row.range} - Th Load` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_curve_thresherLoad_${ri}`, "SETPOINT"), padding: '0px 4px', fontSize: '11px', minWidth: '40px', fontWeight: 'bold' }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 2. Thresher Feeding based on Thresher Load */}
                <div className="som-ts-card" style={{ flexShrink: 0 }}>
                  <div className="som-ts-card-header" style={{ padding: '3px 8px' }}>
                    <h3 className="som-ts-card-title">Thresher Feeding based on Thresher Load</h3>
                  </div>
                  <div className="som-ts-card-body" style={{ padding: '4px 8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '10px', color: '#1e293b' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '3px' }}>Thresher</th>
                          <th style={{ padding: '3px' }}>Empty (A)</th>
                          <th style={{ padding: '3px' }}>Full (A)</th>
                          <th style={{ padding: '3px' }}>PV (A)</th>
                          <th style={{ padding: '3px' }}>Util (%)</th>
                          <th style={{ padding: '3px' }}>Control Logic</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thresherFeeding.map((row, ri) => {
                          const liveEmpty = getCalcVal(`settings_feed_th_${row.id}_empty`, "SETPOINT", row.empty);
                          const liveFull = getCalcVal(`settings_feed_th_${row.id}_full`, "SETPOINT", row.full);
                          const livePV = getCalcVal(`settings_feed_th_${row.id}_pv`, "MONITOR", row.pv);
                          const singleUtil = liveFull - liveEmpty > 0
                            ? ((livePV - liveEmpty) / (liveFull - liveEmpty)) * 100
                            : 0;
                          return (
                            <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '3px', fontWeight: 'bold' }}>{row.id}</td>
                              <td style={{ padding: '3px' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_feed_th_${row.id}_empty`}
                                  signalKey="SETPOINT"
                                  fallback={row.empty}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_feed_th_${row.id}_empty`, [], [{ key: "SETPOINT", label: `Feeding T${row.id} Empty` }])
                                      : () => setActiveKeypad({ section: 'thresherFeeding', idx: ri, param: 'empty', label: `Feeding T${row.id} Empty` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_feed_th_${row.id}_empty`, "SETPOINT"), padding: '1px 3px', fontSize: '10px', minWidth: '40px' }}
                                />
                              </td>
                              <td style={{ padding: '3px' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_feed_th_${row.id}_full`}
                                  signalKey="SETPOINT"
                                  fallback={row.full}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_feed_th_${row.id}_full`, [], [{ key: "SETPOINT", label: `Feeding T${row.id} Full` }])
                                      : () => setActiveKeypad({ section: 'thresherFeeding', idx: ri, param: 'full', label: `Feeding T${row.id} Full` })
                                  }
                                  style={{ ...getDeveloperStyle(`settings_feed_th_${row.id}_full`, "SETPOINT"), padding: '1px 3px', fontSize: '10px', minWidth: '40px' }}
                                />
                              </td>
                              <td style={{ padding: '3px' }}>
                                <LiveValBox getMappedValue={getMappedValue} stagedEdits={stagedEdits}
                                  eqId={`settings_feed_th_${row.id}_pv`}
                                  signalKey="MONITOR"
                                  fallback={row.pv}
                                  style={{ ...getDeveloperStyle(`settings_feed_th_${row.id}_pv`, "MONITOR") }}
                                  onClick={
                                    configMode 
                                      ? () => handleEquipmentClick(`settings_feed_th_${row.id}_pv`, [], [{ key: "MONITOR", label: `Feeding T${row.id} PV` }])
                                      : undefined
                                  }
                                />
                              </td>
                              <td style={{ padding: '3px', fontWeight: 'bold' }}>{singleUtil.toFixed(0)}%</td>
                              <td style={{ padding: '3px', color: '#64748b', fontStyle: 'italic', fontSize: '9px' }}>{row.control}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Over-riding based on Thresher Load & Throughput Info */}
                <div className="som-ts-card" style={{ flexShrink: 0 }}>
                  <div className="som-ts-card-header" style={{ padding: '3px 8px' }}>
                    <h3 className="som-ts-card-title">Over-riding & Throughput Status</h3>
                  </div>
                  <div className="som-ts-card-body" style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    <div style={{ padding: '4px 8px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '11px' }}>Over-riding logic:</div>
                      <div style={{ color: '#475569', fontSize: '10px', fontStyle: 'italic', lineHeight: '1.2' }}>{overriding.controlText}</div>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span>Overall Load: <strong>{avgThresherPV.toFixed(1)} A</strong> ({Math.round(thresherTotalUtil)}%)</span>
                        <span>Full Load SP: <strong>{avgThresherFull.toFixed(1)} A</strong> (100%)</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '4px', color: '#0369a1', fontWeight: 'bold', fontSize: '11px' }}>
                      <span>Current Threshers Throughput:</span>
                      <span>{computedCurrentThroughput.toFixed(2)} mt/hr</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', color: '#b45309', fontWeight: 'bold', fontSize: '11px' }}>
                      <span>Threshing Station Throughput Score:</span>
                      <span>{Math.round(computedThroughputScore)}%</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer */}
            <footer className="som-ts-footer" style={{ padding: '5px 10px', marginTop: '5px' }}>
              <button className="som-ts-save-btn" onClick={handleSave} disabled={isSaving} style={{ padding: '6px 20px', fontSize: '11px' }}>
                {isSaving ? 'SAVING...' : 'APPLY CHANGES'}
              </button>
            </footer>

            {/* Numeric Keypad */}
            {activeKeypad && (
              <NumericKeypad
                value={(() => {
                  const kp = activeKeypad;
                  
                  // Helper to resolve eqId based on keypad context
                  let resolvedEqId = null;
                  if (kp.section === 'digester') resolvedEqId = `settings_digester_${digesterData[kp.idx].id}_${kp.param}`;
                  else if (kp.section === 'digesterTotalLoad') resolvedEqId = `settings_digester_total_load`;
                  else if (kp.section === 'runningSettings') resolvedEqId = `settings_run_${kp.param}_${runningSettings[kp.idx].runningCount}`;
                  else if (kp.section === 'sfbCurve') resolvedEqId = `settings_curve_${kp.param}_${kp.idx}`;
                  else if (kp.section === 'thresherSettings') resolvedEqId = `settings_th_${thresherSettings[kp.idx].id}_${kp.param}`;
                  else if (kp.section === 'thresherFeeding') resolvedEqId = `settings_feed_th_${thresherFeeding[kp.idx].id}_${kp.param}`;
                  
                  if (resolvedEqId) {
                     let sVal = stagedEdits[`${resolvedEqId}__SETPOINT`];
                     if (sVal === undefined) sVal = stagedEdits[`${resolvedEqId}__MONITOR`];
                     if (sVal !== undefined) return sVal;

                     let mVal = getMappedValue ? getMappedValue(resolvedEqId, 'SETPOINT') : null;
                     if (!mVal || mVal === "no tag" || mVal === "No Tag" || mVal === "--") {
                       mVal = getMappedValue ? getMappedValue(resolvedEqId, 'MONITOR') : null;
                     }
                     if (mVal !== null && mVal !== undefined && mVal !== "no tag" && mVal !== "No Tag" && mVal !== "--") return Number(mVal);
                  }

                  if (kp.section === 'digester') return digesterData[kp.idx][kp.param];
                  if (kp.section === 'runningSettings') return runningSettings[kp.idx][kp.param];
                  if (kp.section === 'sfbCurve') return sfbCurve[kp.idx][kp.param];
                  if (kp.section === 'thresherSettings') return thresherSettings[kp.idx][kp.param];
                  if (kp.section === 'thresherFeeding') return thresherFeeding[kp.idx][kp.param];
                  if (kp.section === 'overriding') return overriding[kp.param];
                  if (kp.section === 'throughput') return throughput[kp.param];
                  return 0;
                })()}
                label={activeKeypad.label}
                onClose={() => setActiveKeypad(null)}
                onConfirm={handleKeypadConfirm}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// Numeric Keypad Component
// ==========================================
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
    return '0';
  });

  const handleNumber = (n) => {
    setDisplayValue(prev => (prev === '0' ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => { if (!displayValue.includes('.')) setDisplayValue(displayValue + '.'); };
  const handleBack = () => setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  const handleEnter = () => onConfirm(parseFloat(displayValue) || 0);

  const btnStyle = { padding: '14px', fontSize: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
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

export default ThreshingStationSettingsPage
