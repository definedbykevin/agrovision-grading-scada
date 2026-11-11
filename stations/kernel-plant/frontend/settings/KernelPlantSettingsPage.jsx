import { useState } from 'react'
import { createPortal } from 'react-dom'
import usePlcStore from '@core/store'
import './KernelPlantSettingsModal.css'

// Internal Component for the Silo Diagram
const SiloDiagram = ({ status }) => {
  const isActive = status === 'run';
  return (
    <svg viewBox="0 0 120 180" className="som-kp-silo-svg">
      <path d="M 10 10 L 110 10 L 90 40 L 30 40 Z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
      <rect x="20" y="40" width="80" height="90" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2" />
      <line x1="20" y1="55" x2="100" y2="55" stroke="#e5e7eb" strokeWidth="1" />
      <line x1="20" y1="115" x2="100" y2="115" stroke="#e5e7eb" strokeWidth="1" />
      <path d="M 20 130 L 100 130 L 80 150 L 40 150 Z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" />
      <rect x="100" y="105" width="15" height="12" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
      <circle cx="115" cy="111" r="5" fill={isActive ? "#f59e0b" : "#9ca3af"} stroke="#78350f" strokeWidth="1" />
      {isActive && (
        <circle cx="60" cy="85" r="15" fill="rgba(245, 158, 11, 0.1)">
          <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx="60" cy="85" r="8" fill={isActive ? "#f59e0b" : "#cbd5e1"} stroke="#94a3b8" strokeWidth="1" />
    </svg>
  );
};

function KernelPlantSettingsPage({ onClose, configMode, tagMap, getLiveValue, handleEquipmentClick }) {
  const sendCommand = usePlcStore(state => state.sendCommand);

  // Local state for modified values
  const [localSPs, setLocalSPs] = useState({});
  const [localLtds, setLocalLtds] = useState({});
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch real-time values from PLC
  const getVal = (id, signal) => {
    const v = getLiveValue ? getLiveValue(id, signal) : 0;
    return (v == null || isNaN(v)) ? 0 : Number(v);
  };

  const getRunStatus = (id) => getVal(id, 'RUN') > 0 ? 'run' : 'idle';

  const totalLoad = getVal('rm_overall', 'LOAD');
  const mills = [
    { id: 'rm1', name: 'Ripple Mill No.1', pv: getVal('rm1', 'PV'), load: getVal('rm1', 'LOAD'), status: getRunStatus('rm1'), lowSP: getVal('rm1_sp', 'LOW'), highSP: getVal('rm1_sp', 'HIGH') },
    { id: 'rm2', name: 'Ripple Mill No.2', pv: getVal('rm2', 'PV'), load: getVal('rm2', 'LOAD'), status: getRunStatus('rm2'), lowSP: getVal('rm2_sp', 'LOW'), highSP: getVal('rm2_sp', 'HIGH') },
    { id: 'rm3', name: 'Ripple Mill No.3', pv: getVal('rm3', 'PV'), load: getVal('rm3', 'LOAD'), status: getRunStatus('rm3'), lowSP: getVal('rm3_sp', 'LOW'), highSP: getVal('rm3_sp', 'HIGH') },
    { id: 'rm4', name: 'Ripple Mill No.4', pv: getVal('rm4', 'PV'), load: getVal('rm4', 'LOAD'), status: getRunStatus('rm4'), lowSP: getVal('rm4_sp', 'LOW'), highSP: getVal('rm4_sp', 'HIGH') },
    { id: 'rm5', name: 'Ripple Mill No.5', pv: getVal('rm5', 'PV'), load: getVal('rm5', 'LOAD'), status: getRunStatus('rm5'), lowSP: getVal('rm5_sp', 'LOW'), highSP: getVal('rm5_sp', 'HIGH') },
    { id: 'rm6', name: 'Ripple Mill No.6', pv: getVal('rm6', 'PV'), load: getVal('rm6', 'LOAD'), status: getRunStatus('rm6'), lowSP: getVal('rm6_sp', 'LOW'), highSP: getVal('rm6_sp', 'HIGH') },
    { id: 'rm7', name: 'Ripple Mill No.7', pv: getVal('rm7', 'PV'), load: getVal('rm7', 'LOAD'), status: getRunStatus('rm7'), lowSP: getVal('rm7_sp', 'LOW'), highSP: getVal('rm7_sp', 'HIGH') },
    { id: 'rm8', name: 'Ripple Mill No.8', pv: getVal('rm8', 'PV'), load: getVal('rm8', 'LOAD'), status: getRunStatus('rm8'), lowSP: getVal('rm8_sp', 'LOW'), highSP: getVal('rm8_sp', 'HIGH') },
  ];

  const getLtdsData = (id) => {
    return {
      minFreq: getVal(`${id}_sp`, 'MIN_FREQ'),
      maxFreq: getVal(`${id}_sp`, 'MAX_FREQ'),
      frequencyTable: [
        { range: '0 - 10%', freq: getVal(`${id}_sp`, 'FREQ_0_10') },
        { range: '10 - 20%', freq: getVal(`${id}_sp`, 'FREQ_10_20') },
        { range: '21 - 30%', freq: getVal(`${id}_sp`, 'FREQ_21_30') },
        { range: '31 - 40%', freq: getVal(`${id}_sp`, 'FREQ_31_40') },
        { range: '41 - 50%', freq: getVal(`${id}_sp`, 'FREQ_41_50') },
        { range: '51 - 60%', freq: getVal(`${id}_sp`, 'FREQ_51_60') },
        { range: '61 - 70%', freq: getVal(`${id}_sp`, 'FREQ_61_70') },
        { range: '71 - 80%', freq: getVal(`${id}_sp`, 'FREQ_71_80') },
        { range: '81 - 90%', freq: getVal(`${id}_sp`, 'FREQ_81_90') },
        { range: '91 - 100%', freq: getVal(`${id}_sp`, 'FREQ_91_100') },
      ]
    };
  };

  const ltds1 = getLtdsData('ltds1');
  const ltds2 = getLtdsData('ltds2');

  const checkMapping = (id) => {
    return tagMap && Object.keys(tagMap).some(key => key.startsWith(`${id}__`) && tagMap[key]);
  };

  const getDevStyle = (id) => {
    if (!configMode) return {};
    const hasMapping = checkMapping(id);
    return {
      outline: hasMapping ? "2px solid #3b82f6" : "2px solid #ef4444",
      boxShadow: hasMapping ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasMapping ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
    };
  };

  const handleBoxClick = (e, id, type, index, currentValue) => {
    e.stopPropagation();
    if (configMode) {
      let targetId = id.endsWith('_sp') ? id : `${id}_sp`;
      let signals = [];
      if (targetId.includes('rm')) {
         signals = [ { key: "LOW", label: "Low SP" }, { key: "HIGH", label: "High SP" } ];
      } else if (targetId.includes('ltds')) {
         signals = [
           { key: "MIN_FREQ", label: "Min Freq" }, { key: "MAX_FREQ", label: "Max Freq" },
           { key: "FREQ_0_10", label: "Freq 0-10%" }, { key: "FREQ_10_20", label: "Freq 10-20%" },
           { key: "FREQ_21_30", label: "Freq 21-30%" }, { key: "FREQ_31_40", label: "Freq 31-40%" },
           { key: "FREQ_41_50", label: "Freq 41-50%" }, { key: "FREQ_51_60", label: "Freq 51-60%" },
           { key: "FREQ_61_70", label: "Freq 61-70%" }, { key: "FREQ_71_80", label: "Freq 71-80%" },
           { key: "FREQ_81_90", label: "Freq 81-90%" }, { key: "FREQ_91_100", label: "Freq 91-100%" },
         ];
      }
      if (handleEquipmentClick) handleEquipmentClick(targetId, [], signals);
    } else {
      setActiveKeypad({ device: id, type, index, currentValue });
    }
  };

  const handleNumericInput = (val) => {
    const { device, type, index } = activeKeypad;
    
    if (device.includes('rm')) {
      setLocalSPs(prev => ({
        ...prev,
        [`${device}_${type}`]: val
      }));
    } else if (device.includes('ltds')) {
      const key = type === 'freq' ? `freq_${index}` : type;
      setLocalLtds(prev => ({
        ...prev,
        [`${device}_${key}`]: val
      }));
    }
    setActiveKeypad(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Send RM SPs
      for (const [key, val] of Object.entries(localSPs)) {
        const [rm, , type] = key.split('_'); // rm1, sp, low
        const tagKey = `${rm}_sp__${type.toUpperCase()}`;
        const tagId = tagMap[tagKey];
        if (tagId) await sendCommand(tagId, val, tagKey, "kernel-plant");
      }

      // Send LTDS settings
      for (const [key, val] of Object.entries(localLtds)) {
        const parts = key.split('_');
        const ltdsId = parts[0]; // ltds1
        let signal = "";
        if (parts[1] === 'min') signal = "MIN_FREQ";
        else if (parts[1] === 'max') signal = "MAX_FREQ";
        else if (parts[1] === 'freq') {
           const mapFreq = ['FREQ_0_10', 'FREQ_10_20', 'FREQ_21_30', 'FREQ_31_40', 'FREQ_41_50', 'FREQ_51_60', 'FREQ_61_70', 'FREQ_71_80', 'FREQ_81_90', 'FREQ_91_100'];
           signal = mapFreq[parseInt(parts[2])];
        }
        
        const tagKey = `${ltdsId}_sp__${signal}`;
        const tagId = tagMap[tagKey];
        if (tagId) await sendCommand(tagId, val, tagKey, "kernel-plant");
      }
      
      setLocalSPs({});
      setLocalLtds({});
    } catch (err) {
      console.error("Save error", err);
    }
    setIsSaving(false);
  };

  const getDisplayVal = (device, type, index, realVal) => {
    if (device.includes('rm')) {
      const localVal = localSPs[`${device}_${type}`];
      return localVal !== undefined ? localVal : realVal;
    } else {
      const key = type === 'freq' ? `freq_${index}` : type;
      const localVal = localLtds[`${device}_${key}`];
      return localVal !== undefined ? localVal : realVal;
    }
  };

    const isEdited = (device, type, index) => {
    if (device.includes('rm')) {
      return localSPs[`${device}_${type}`] !== undefined;
    } else {
      const key = type === 'freq' ? `freq_${index}` : type;
      return localLtds[`${device}_${key}`] !== undefined;
    }
  };

  const isChanged = Object.keys(localSPs).length > 0 || Object.keys(localLtds).length > 0;

  const renderLtdsCard = (id, title, data) => {
    return (
      <div className="som-settings-card" style={getDevStyle(`${id}_sp`)} onClick={(e) => { if(configMode) handleBoxClick(e, `${id}_sp`)}}>
        <div className="som-settings-card-header">
          <span className="som-card-header-icon">⚡</span>
          {title}
        </div>
        <div className="som-settings-card-body" style={{ padding: '8px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
          <div className="som-kp-minmax-row">
            <div className="som-kp-minmax-item">
              <span className="som-kp-minmax-label">Min Frequency</span>
              <div className="som-kp-freq-box" style={{ backgroundColor: isEdited(id, "min", 0) ? "#fef08a" : undefined }} onClick={(e) => handleBoxClick(e, id, "min", 0, data.minFreq)}>
                <span className="som-kp-freq-val">{getDisplayVal(id, 'min', 0, data.minFreq).toFixed(1)}</span>
                <span className="som-kp-freq-unit">Hz</span>
              </div>
            </div>
            <div className="som-kp-minmax-item">
              <span className="som-kp-minmax-label">Max Frequency</span>
              <div className="som-kp-freq-box" style={{ backgroundColor: isEdited(id, "max", 0) ? "#fef08a" : undefined }} onClick={(e) => handleBoxClick(e, id, "max", 0, data.maxFreq)}>
                <span className="som-kp-freq-val">{getDisplayVal(id, 'max', 0, data.maxFreq).toFixed(1)}</span>
                <span className="som-kp-freq-unit">Hz</span>
              </div>
            </div>
          </div>
          <div className="som-kp-freq-table-wrap">
            <table className="som-kp-freq-table">
              <thead>
                <tr>
                  <th>Load Range</th>
                  <th>Frequency (Hz)</th>
                </tr>
              </thead>
              <tbody>
                {data.frequencyTable.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.range}</td>
                    <td>
                      <div className="som-kp-freq-box som-kp-freq-box--table" style={{ backgroundColor: isEdited(id, "freq", idx) ? "#fef08a" : undefined }} onClick={(e) => handleBoxClick(e, id, "freq", idx, item.freq)}>
                        <span className="som-kp-freq-val">{getDisplayVal(id, 'freq', idx, item.freq).toFixed(1)}</span>
                        <span className="som-kp-freq-unit">Hz</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="som-kp-settings-page">
      <header className="som-sterilizer-station-header" style={{ position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div className="som-header-left">
          <h2 className="som-sterilizer-station-title">Kernel Plant Station</h2>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="som-view-btn" onClick={onClose}>PROCESS VIEW</button>
          <button
            className="som-view-btn"
            disabled
            style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            MAINTENANCE VIEW
          </button>
          <button className="som-view-btn active" style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
        </div>
      </header>

      <div className="som-kp-settings-content">
        <div className="som-settings-card">
          <div className="som-settings-card-header">
            <span className="som-card-header-icon">📊</span>
            RIPPLE MILL MONITORING
          </div>
          <div className="som-settings-card-body" style={{ padding: '8px', gap: '8px', display: 'flex', flexDirection: 'column' }}>

            <div className="som-kp-monitor-section" style={getDevStyle('rm_overall')} onClick={(e) => { if(configMode && handleEquipmentClick) handleEquipmentClick('rm_overall', [], [{key:"LOAD", label:"Overall Load"}])}}>
              <div className="som-kp-monitor-label">Ripple Mill Overall</div>
              <div className="som-kp-total-row">
                <span className="som-kp-total-text">Total Load</span>
                <div className="som-kp-value-box">
                  <span className="som-kp-value">{totalLoad.toFixed(1)}</span>
                  <span className="som-kp-unit">%</span>
                </div>
              </div>
            </div>

            <div className="som-kp-rm-scroll-container">
              {/* GROUP 1: RM No.1 - No.4 */}
              <div className="som-kp-rm-group">
                <div className="som-kp-sp-section">
                  <span className="som-kp-sp-label">Low SP</span>
                  <div className="som-kp-sp-grid">
                    {mills.slice(0, 4).map((m, i) => (
                      <div key={m.id} className="som-kp-value-box" style={{ ...getDevStyle(`${m.id}_sp`), backgroundColor: isEdited(`${m.id}_sp`, "low", 0) ? "#fef08a" : getDevStyle(`${m.id}_sp`).backgroundColor }} onClick={(e) => handleBoxClick(e, `${m.id}_sp`, "low", 0, m.lowSP)}>
                        <span className="som-kp-value">{getDisplayVal(`${m.id}_sp`, 'low', 0, m.lowSP).toFixed(1)}</span>
                        <span className="som-kp-unit">A</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="som-kp-sp-section">
                  <span className="som-kp-sp-label">High SP</span>
                  <div className="som-kp-sp-grid">
                    {mills.slice(0, 4).map((m, i) => (
                      <div key={m.id} className="som-kp-value-box" style={{ ...getDevStyle(`${m.id}_sp`), backgroundColor: isEdited(`${m.id}_sp`, "high", 0) ? "#fef08a" : getDevStyle(`${m.id}_sp`).backgroundColor }} onClick={(e) => handleBoxClick(e, `${m.id}_sp`, "high", 0, m.highSP)}>
                        <span className="som-kp-value">{getDisplayVal(`${m.id}_sp`, 'high', 0, m.highSP).toFixed(1)}</span>
                        <span className="som-kp-unit">A</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="som-kp-silo-grid">
                  {mills.slice(0, 4).map((mill, idx) => (
                    <div key={mill.id} className="som-kp-silo-unit" style={getDevStyle(mill.id)} onClick={(e) => { if(configMode && handleEquipmentClick) handleEquipmentClick(mill.id, [], [{key:"RUN", label:"Run Status"}, {key:"PV", label:"PV (Amp)"}, {key:"LOAD", label:"Load %"}])}}>
                      <SiloDiagram status={mill.status} />
                      <div className="som-kp-mill-info">
                        <div className="som-kp-mill-name">RM No.{idx + 1}</div>
                        <div className="som-kp-param-row">
                          <span className="som-kp-param-label">PV</span>
                          <div className="som-kp-value-box som-kp-value-box--sm">
                            <span className="som-kp-value">{mill.pv.toFixed(1)}</span>
                            <span className="som-kp-unit">A</span>
                          </div>
                        </div>
                        <div className="som-kp-param-row">
                          <span className="som-kp-param-label">Load</span>
                          <div className="som-kp-value-box som-kp-value-box--sm">
                            <span className="som-kp-value">{mill.load.toFixed(1)}</span>
                            <span className="som-kp-unit">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #cbd5e1', margin: '4px 0' }}></div>

              {/* GROUP 2: RM No.5 - No.8 */}
              <div className="som-kp-rm-group">
                <div className="som-kp-sp-section">
                  <span className="som-kp-sp-label">Low SP</span>
                  <div className="som-kp-sp-grid">
                    {mills.slice(4, 8).map((m, i) => (
                      <div key={m.id} className="som-kp-value-box" style={{ ...getDevStyle(`${m.id}_sp`), backgroundColor: isEdited(`${m.id}_sp`, "low", 0) ? "#fef08a" : getDevStyle(`${m.id}_sp`).backgroundColor }} onClick={(e) => handleBoxClick(e, `${m.id}_sp`, "low", 0, m.lowSP)}>
                        <span className="som-kp-value">{getDisplayVal(`${m.id}_sp`, 'low', 0, m.lowSP).toFixed(1)}</span>
                        <span className="som-kp-unit">A</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="som-kp-sp-section">
                  <span className="som-kp-sp-label">High SP</span>
                  <div className="som-kp-sp-grid">
                    {mills.slice(4, 8).map((m, i) => (
                      <div key={m.id} className="som-kp-value-box" style={{ ...getDevStyle(`${m.id}_sp`), backgroundColor: isEdited(`${m.id}_sp`, "high", 0) ? "#fef08a" : getDevStyle(`${m.id}_sp`).backgroundColor }} onClick={(e) => handleBoxClick(e, `${m.id}_sp`, "high", 0, m.highSP)}>
                        <span className="som-kp-value">{getDisplayVal(`${m.id}_sp`, 'high', 0, m.highSP).toFixed(1)}</span>
                        <span className="som-kp-unit">A</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="som-kp-silo-grid">
                  {mills.slice(4, 8).map((mill, idx) => (
                    <div key={mill.id} className="som-kp-silo-unit" style={getDevStyle(mill.id)} onClick={(e) => { if(configMode && handleEquipmentClick) handleEquipmentClick(mill.id, [], [{key:"RUN", label:"Run Status"}, {key:"PV", label:"PV (Amp)"}, {key:"LOAD", label:"Load %"}])}}>
                      <SiloDiagram status={mill.status} />
                      <div className="som-kp-mill-info">
                        <div className="som-kp-mill-name">RM No.{idx + 5}</div>
                        <div className="som-kp-param-row">
                          <span className="som-kp-param-label">PV</span>
                          <div className="som-kp-value-box som-kp-value-box--sm">
                            <span className="som-kp-value">{mill.pv.toFixed(1)}</span>
                            <span className="som-kp-unit">A</span>
                          </div>
                        </div>
                        <div className="som-kp-param-row">
                          <span className="som-kp-param-label">Load</span>
                          <div className="som-kp-value-box som-kp-value-box--sm">
                            <span className="som-kp-value">{mill.load.toFixed(1)}</span>
                            <span className="som-kp-unit">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="som-kp-ltds-panel">
          {renderLtdsCard('ltds1', 'LTDS No.1', ltds1)}
          {renderLtdsCard('ltds2', 'LTDS No.2', ltds2)}
        </div>
      </div>

      <footer className="som-settings-footer-actions">
        <div className="som-footer-left-group">
          <button className="som-footer-btn som-btn-cancel-settings" onClick={onClose}>
            ← Process View
          </button>
        </div>
        <div className="som-footer-right-group">
          <button
            className={`som-footer-btn som-btn-save-settings ${isChanged ? 'active-save' : ''}`}
            onClick={handleSave}
            disabled={!isChanged || isSaving}
            style={{ opacity: isChanged ? 1 : 0.5, cursor: isChanged ? 'pointer' : 'not-allowed' }}
          >
            <svg width="12" height="12" viewBox="0 0 448 512" fill="currentColor">
              <path d="M433.9 129.9l-83.9-83.9A47.9 47.9 0 0 0 316.1 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V195.9c0-12.7-5.1-25-14.1-34zM224 416c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm96-304.8V192H128V111.2h192z" />
            </svg>
            {isSaving ? 'SAVING...' : 'APPLY CHANGES'}
          </button>
        </div>
      </footer>

      {activeKeypad && (() => {
        let label = '';
        if (activeKeypad.device.includes('rm')) label = `RIPPLE MILL SP`;
        else if (activeKeypad.type === 'min') label = `MIN FREQUENCY`;
        else if (activeKeypad.type === 'max') label = `MAX FREQUENCY`;
        else if (activeKeypad.type === 'freq') label = `FREQUENCY TABLE`;

        return (
          <NumericKeypad
            value={activeKeypad.currentValue}
            label={label}
            unit={activeKeypad.device.includes('rm') ? "A" : "Hz"}
            onClose={() => setActiveKeypad(null)}
            onConfirm={handleNumericInput}
          />
        );
      })()}
    </section>
  );
}

function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => value.toFixed(1));

  const handleNumber = (n) => {
    setDisplayValue(prev => {
      if (prev === '0.0' || prev === '0') return n.toString();
      return prev + n.toString();
    });
  };

  const handleDecimal = () => {
    if (!displayValue.includes('.')) setDisplayValue(displayValue + '.');
  };

  const handleBack = () => {
    setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const handleEnter = () => {
    onConfirm(parseFloat(displayValue) || 0);
  };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#475569', lineHeight: 1 }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          <span className="som-numeric-keypad-unit">{unit}</span>
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
            <button key={n} onClick={() => handleNumber(n)} style={{ padding: '14px', fontSize: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontFamily: 'Inter, sans-serif' }}>{n}</button>
          ))}
          <button onClick={handleDecimal} style={{ padding: '14px', fontSize: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontFamily: 'Inter, sans-serif' }}>.</button>
          <button onClick={() => handleNumber(0)} style={{ padding: '14px', fontSize: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontFamily: 'Inter, sans-serif' }}>0</button>
          <button onClick={handleBack} style={{ padding: '14px', fontSize: '18px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>⌫</button>
          <button onClick={() => setDisplayValue('0')} style={{ gridColumn: 'span 1', padding: '12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}>CLEAR</button>
          <button onClick={handleEnter} style={{ gridColumn: 'span 2', padding: '12px', background: '#f59e0b', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>ENTER</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default KernelPlantSettingsPage
