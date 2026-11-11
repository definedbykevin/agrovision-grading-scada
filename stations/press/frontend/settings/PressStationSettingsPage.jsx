import { useState } from 'react'
import { createPortal } from 'react-dom'
import usePlcStore from '@core/store'
import './PressStationSettingsModal.css'
import pressImg from '../assets/press.svg'
import dilutionImg from '../assets/dilution.webp'

const ValBox = ({ value, unit, decimals = 1, onClick, isEdited, style }) => (
  <div
    className={`som-val-box ${onClick ? 'som-val-box--editable' : ''}`}
    onClick={onClick}
    style={{
      whiteSpace: 'nowrap',
      ...(isEdited ? { background: '#fef08a', color: '#854d0e', borderColor: '#eab308' } : {}),
      ...style
    }}
  >
    {typeof value === 'number' ? value.toFixed(decimals) : value}
    {unit && <span className="som-val-unit" style={{ marginLeft: '2px' }}>{unit}</span>}
  </div>
);

const ScadaRow = ({ label, val, unit, id, type, decimals = 1, configMode, handleBoxClick, getDisplayVal }) => {
  const allowedKeys = ['LOW_SP', 'HIGH_SP', 'FLOW_PER_PRESS', 'CV_MIN', 'CV_MAX', 'PID_P', 'PID_I', 'PID_D', 'MIN_HZ', 'MAX_HZ'];
  const canEdit = configMode || allowedKeys.includes(type);
  
  return (
    <div className="som-overview-param-row" style={{ marginBottom: '4px', padding: '2px 0', borderBottom: '1px dashed #e2e8f0', width: '100%' }}>
      <span className="som-overview-param-label" style={{ fontSize: '11px', flex: 1, whiteSpace: 'nowrap', marginRight: '8px' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <ValBox 
          value={val} 
          unit={unit} 
          decimals={decimals} 
          onClick={canEdit ? (e) => { 
             e.stopPropagation(); 
             handleBoxClick(e, id, type, getDisplayVal(id, type), { label }); 
          } : null} 
        />
      </div>
    </div>
  );
};

function PressStationSettingsPage({ onClose, configMode, tagMap, getLiveValue, handleEquipmentClick }) {
  const sendCommand = usePlcStore(state => state.sendCommand);
  const [activeSlide, setActiveSlide] = useState('overview');
  const [activePress, setActivePress] = useState(1);
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for modified values
  const [localSettings, setLocalSettings] = useState({});

  const getVal = (id, signal) => {
    const v = getLiveValue ? getLiveValue(id, signal) : 0;
    if (v === 'no tag' || v === '--') return v;
    const num = Number(v);
    return isNaN(num) ? '--' : num;
  };

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

  const handleSelectActiveSet = (e, pressId) => {
    e.stopPropagation();
    const selectedInt = parseInt(e.target.value, 10);
    const pressNum = pressId.replace(/\D/g, "");
    const keyPrimary = `press${pressNum}__ACTIVE_SET`;
    const keyAlt = `prs${pressNum}__ACTIVE_SET`;

    setLocalSettings(prev => ({
      ...prev,
      [keyPrimary]: selectedInt,
      [keyAlt]: selectedInt
    }));

    const tagId = tagMap ? (tagMap[keyPrimary] || tagMap[keyAlt]) : null;
    if (tagId) {
      sendCommand(tagId, selectedInt, keyPrimary, "press");
    }
  };

  const handleBoxClick = (e, id, type, currentValue, keypadProps, groupSignals = null) => {
    e.stopPropagation();
    if (configMode) {
      let signals = [];
      if (groupSignals) {
         signals = groupSignals;
      } else if (id.includes('press') && activeSlide === 'overview') {
         signals = [
           { key: "LOW_SP", label: "Low SP" },
           { key: "HIGH_SP", label: "High SP" },
           { key: "AMP", label: "PV (Amp)" },
           { key: "LOAD", label: "Load (%)" },
           { key: "ACTIVE_SET", label: "Active Set (0=Set 1, 1=Set 2, 2=Set 3, 3=Set 4)" }
         ];
      } else if (id.includes('press')) {
         signals = [
           { key: "LOW_SP", label: "Low SP" }, { key: "HIGH_SP", label: "High SP" },
           { key: "LL", label: "LL" }, { key: "LL_RETRACT", label: "LL Retract" },
           { key: "OL", label: "OL" }, { key: "OL_RETRACT", label: "OL Retract" },
           { key: "DELAY", label: "Delay" }, { key: "RETRACT", label: "Retract" }, { key: "IDLING", label: "Idling" },
           { key: "ANALOG_MAX", label: "Analog Max" }, { key: "SENECA_MAX", label: "Seneca Max" },
           { key: "PV_20MA", label: "PV 20mA" }, { key: "SHIFT_AMP", label: "Shift Amp" }
         ];
         for (let i = 1; i <= 4; i++) {
            signals.push({ key: `SET${i}_L`, label: `Set ${i} L` });
            signals.push({ key: `SET${i}_M`, label: `Set ${i} M` });
            signals.push({ key: `SET${i}_H`, label: `Set ${i} H` });
         }
      } else if (id.includes('digester')) {
         signals = [
           { key: "FULL", label: "Digester Full" },
           { key: "SV", label: "SV" }, { key: "P", label: "P" }, { key: "UPPER_LIMIT", label: "Upper Limit" },
           { key: "I", label: "I" }, { key: "D", label: "D" }
         ];
         for(let i=0; i<10; i++) {
            signals.push({ key: `PV_${i}`, label: `PV Table ${i}` });
            signals.push({ key: `PCT_${i}`, label: `PCT Table ${i}` });
         }
      } else if (id === 'dilution') {
         signals = [
           { key: "FLOW_PER_PRESS", label: "Flow Per Press" },
           { key: "FLOW_RATE_1", label: "Press No.1 Flow Rate" },
           { key: "FLOW_RATE_2", label: "Press No.2 Flow Rate" },
           { key: "FLOW_RATE_3", label: "Press No.3 Flow Rate" },
           { key: "FLOW_RATE_4", label: "Press No.4 Flow Rate" },
           { key: "CV_MIN", label: "CV Min" }, { key: "CV_MAX", label: "CV Max" },
           { key: "PID_P", label: "P" }, { key: "PID_I", label: "I" }, { key: "PID_D", label: "D" }
         ];
      } else if (id === 'depericarper' || id === 'destoner') {
         signals = [
           { key: "MIN_HZ", label: "Min Hz" }, { key: "MAX_HZ", label: "Max Hz" },
           { key: "HZ_0_10", label: "0-10%" }, { key: "HZ_10_20", label: "10-20%" },
           { key: "HZ_21_30", label: "21-30%" }, { key: "HZ_31_40", label: "31-40%" },
           { key: "HZ_41_50", label: "41-50%" }, { key: "HZ_51_60", label: "51-60%" },
           { key: "HZ_61_70", label: "61-70%" }, { key: "HZ_71_80", label: "71-80%" },
           { key: "HZ_81_90", label: "81-90%" }, { key: "HZ_91_100", label: "91-100%" }
         ];
      }
      if (handleEquipmentClick) handleEquipmentClick(id, [], signals);
    } else {
      setActiveKeypad({ id, type, currentValue, ...keypadProps });
    }
  };

  const handleNumericInput = (val) => {
    const key = `${activeKeypad.id}__${activeKeypad.type}`;
    setLocalSettings(prev => ({ ...prev, [key]: val }));
    setActiveKeypad(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const [key, val] of Object.entries(localSettings)) {
        const tagId = tagMap[key];
        if (tagId) await sendCommand(tagId, val, key, "press");
      }
      setLocalSettings({});
    } catch (err) {
      console.error("Save error", err);
    }
    setIsSaving(false);
  };

  const getDisplayVal = (id, type) => {
    const key = `${id}__${type}`;
    if (localSettings[key] !== undefined) return localSettings[key];
    const pressNum = id.replace(/\D/g, "");
    if (pressNum) {
      const keyAlt1 = `press${pressNum}__${type}`;
      const keyAlt2 = `prs${pressNum}__${type}`;
      if (localSettings[keyAlt1] !== undefined) return localSettings[keyAlt1];
      if (localSettings[keyAlt2] !== undefined) return localSettings[keyAlt2];

      const v1 = getVal(`press${pressNum}`, type);
      if (v1 !== 'no tag' && v1 !== '--') return v1;
      const v2 = getVal(`prs${pressNum}`, type);
      if (v2 !== 'no tag' && v2 !== '--') return v2;
    }
    return getVal(id, type);
  };

  const isChanged = Object.keys(localSettings).length > 0;

  const renderScadaRow = (label, val, unit, id, type, decimals = 1) => (
    <ScadaRow
      key={`${id}__${type}`}
      label={label}
      val={val}
      unit={unit}
      id={id}
      type={type}
      decimals={decimals}
      configMode={configMode}
      handleBoxClick={handleBoxClick}
      getDisplayVal={getDisplayVal}
    />
  );

  const getUserRole = () => {
    try {
      const rawUser = localStorage.getItem("kip_user") || localStorage.getItem("user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        return (parsed?.userRole || parsed?.role || "").toLowerCase();
      }
    } catch (e) {}
    return "";
  };
  const userRole = getUserRole();
  const isDev = userRole === "developer" || userRole === "dev";

  const renderOverviewSlide = () => (
    <div className="som-overview-layout" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
      {/* Top Section: Presses */}
      <div className="som-ps-card" style={{ marginBottom: '12px', flexShrink: 0 }}>
        <div className="som-ps-card-header" style={{ justifyContent: 'center' }}>
          <h3 className="som-ps-card-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Press Station</span>
            <span
              onClick={(e) => {
                if (configMode && handleEquipmentClick) {
                  e.stopPropagation();
                  handleEquipmentClick('press_station', [], [{ key: "LOAD", label: "Press Station Load (%)" }]);
                }
              }}
              style={{
                cursor: configMode ? 'pointer' : 'default',
                padding: '2px 8px',
                borderRadius: '4px',
                background: configMode ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: configMode ? '1.5px dashed #3b82f6' : 'none',
                color: configMode ? '#1e40af' : 'inherit',
                fontWeight: 'bold',
              }}
            >
              {(() => {
                const val = getVal('press_station', 'LOAD');
                if (val === 'no tag') return 'no tag';
                if (val === '--') return '-- %';
                return typeof val === 'number' ? `${val.toFixed(1)} %` : `${val} %`;
              })()}
            </span>
          </h3>
        </div>
        <div className="som-ps-card-body" style={{ padding: '8px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[1, 2, 3, 4].map(n => {
              const id = `press${n}`;
              const rawActiveSet = getDisplayVal(id, 'ACTIVE_SET');
              let currentSetVal = "0";
              if (rawActiveSet !== undefined && rawActiveSet !== null && rawActiveSet !== '--' && rawActiveSet !== 'no tag') {
                const strVal = String(rawActiveSet).trim();
                if (['0', '1', '2', '3'].includes(strVal)) {
                  currentSetVal = strVal;
                }
              }

              return (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', border: configMode ? '2px dashed #3b82f6' : '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', background: configMode ? 'rgba(59, 130, 246, 0.05)' : 'white' }} onClick={(e) => { if(configMode) handleEquipmentClick(id, [], [{key:"LOW_SP", label:"Low SP"}, {key:"HIGH_SP", label:"High SP"}, {key:"AMP", label:"PV (Amp)"}, {key:"LOAD", label:"Load (%)"}, {key:"ACTIVE_SET", label:"Active Set (0=Set 1, 1=Set 2, 2=Set 3, 3=Set 4)"}]) }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>Press No.{n}</div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: configMode ? 'pointer' : 'default' }}
                      onClick={(e) => {
                        if (configMode && handleEquipmentClick) {
                          e.stopPropagation();
                          handleEquipmentClick(id, [], [{ key: "ACTIVE_SET", label: "Active Set (0=Set 1, 1=Set 2, 2=Set 3, 3=Set 4)" }]);
                        }
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>SET:</span>
                      <select
                        value={currentSetVal}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectActiveSet(e, id);
                        }}
                        onClick={(e) => {
                          if (configMode && handleEquipmentClick) {
                            e.stopPropagation();
                            e.preventDefault();
                            handleEquipmentClick(id, [], [{ key: "ACTIVE_SET", label: "Active Set (0=Set 1, 1=Set 2, 2=Set 3, 3=Set 4)" }]);
                          } else {
                            e.stopPropagation();
                          }
                        }}
                        style={{
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#1e40af',
                          background: '#eff6ff',
                          border: '1.5px solid #3b82f6',
                          borderRadius: '6px',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="0">SET 1</option>
                        <option value="1">SET 2</option>
                        <option value="2">SET 3</option>
                        <option value="3">SET 4</option>
                      </select>
                    </div>
                  </div>
                  <img src={pressImg} alt="Press" style={{ height: '65px', marginBottom: '8px', objectFit: 'contain' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {renderScadaRow("Low SP", getDisplayVal(id, 'LOW_SP'), "A", id, "LOW_SP")}
                      {renderScadaRow("High SP", getDisplayVal(id, 'HIGH_SP'), "A", id, "HIGH_SP")}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {renderScadaRow("PV", getVal(id, 'AMP'), "A", id, "AMP")}
                      {renderScadaRow("Load", getVal(id, 'LOAD'), "%", id, "LOAD")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Dilution, Depericarper, Destoner */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '12px', flexShrink: 0 }}>
        {/* Dilution */}
        <div className="som-ps-card" style={{ position: 'relative' }} onClick={(e) => { if(configMode) handleEquipmentClick('dilution', [], [{key:"FLOW_PER_PRESS", label:"Flow Per Press"}, {key:"FLOW_RATE_1", label:"Press No.1 Flow Rate"}, {key:"FLOW_RATE_2", label:"Press No.2 Flow Rate"}, {key:"FLOW_RATE_3", label:"Press No.3 Flow Rate"}, {key:"FLOW_RATE_4", label:"Press No.4 Flow Rate"}, {key:"CV_MIN", label:"CV Min"}, {key:"CV_MAX", label:"CV Max"}, {key:"PID_P", label:"P"}, {key:"PID_I", label:"I"}, {key:"PID_D", label:"D"}]) }}>
          <div className="som-ps-card-header"><h3 className="som-ps-card-title">Dilution</h3></div>
          <div className="som-ps-card-body" style={{ padding: '8px 12px' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {renderScadaRow("Flow Per Press", getDisplayVal('dilution', 'FLOW_PER_PRESS'), "M3/HR", "dilution", "FLOW_PER_PRESS", 3)}
              <div style={{ height: '4px' }}></div>
              {renderScadaRow("Press No.1 Flow Rate", getVal('dilution', 'FLOW_RATE_1'), "M3/HR", "dilution", "FLOW_RATE_1", 3)}
              {renderScadaRow("Press No.2 Flow Rate", getVal('dilution', 'FLOW_RATE_2'), "M3/HR", "dilution", "FLOW_RATE_2", 3)}
              {renderScadaRow("Press No.3 Flow Rate", getVal('dilution', 'FLOW_RATE_3'), "M3/HR", "dilution", "FLOW_RATE_3", 3)}
              {renderScadaRow("Press No.4 Flow Rate", getVal('dilution', 'FLOW_RATE_4'), "M3/HR", "dilution", "FLOW_RATE_4", 3)}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: '#333' }}>
                <span style={{ fontWeight: 'bold' }}>Control Valve SP</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {renderScadaRow("Min", getDisplayVal('dilution', 'CV_MIN'), "%", "dilution", "CV_MIN")}
                  {renderScadaRow("Max", getDisplayVal('dilution', 'CV_MAX'), "%", "dilution", "CV_MAX")}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '2px' }}>
                {renderScadaRow("P", getDisplayVal('dilution', 'PID_P'), undefined, "dilution", "PID_P")}
                {renderScadaRow("I", getDisplayVal('dilution', 'PID_I'), undefined, "dilution", "PID_I")}
                {renderScadaRow("D", getDisplayVal('dilution', 'PID_D'), undefined, "dilution", "PID_D")}
              </div>
            </div>
          </div>
        </div>

        {/* Depericarper */}
        <div className="som-ps-card" style={{ position: 'relative' }} onClick={(e) => { if(configMode) handleEquipmentClick('depericarper', [], [{key:"MIN_HZ", label:"Min Hz"}, {key:"MAX_HZ", label:"Max Hz"}]) }}>
          <div className="som-ps-card-header"><h3 className="som-ps-card-title">Depericarper</h3></div>
          <div className="som-ps-card-body" style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
              {renderScadaRow("Min", getDisplayVal('depericarper', 'MIN_HZ'), "Hz", "depericarper", "MIN_HZ")}
              {renderScadaRow("Max", getDisplayVal('depericarper', 'MAX_HZ'), "Hz", "depericarper", "MAX_HZ")}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', width: '100%', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {renderScadaRow("0 - 10 %", getDisplayVal('depericarper', 'HZ_0_10'), "Hz", "depericarper", "HZ_0_10")}
              {renderScadaRow("10 - 20 %", getDisplayVal('depericarper', 'HZ_10_20'), "Hz", "depericarper", "HZ_10_20")}
              {renderScadaRow("21 - 30 %", getDisplayVal('depericarper', 'HZ_21_30'), "Hz", "depericarper", "HZ_21_30")}
              {renderScadaRow("31 - 40 %", getDisplayVal('depericarper', 'HZ_31_40'), "Hz", "depericarper", "HZ_31_40")}
              {renderScadaRow("41 - 50 %", getDisplayVal('depericarper', 'HZ_41_50'), "Hz", "depericarper", "HZ_41_50")}
              {renderScadaRow("51 - 60 %", getDisplayVal('depericarper', 'HZ_51_60'), "Hz", "depericarper", "HZ_51_60")}
              {renderScadaRow("61 - 70 %", getDisplayVal('depericarper', 'HZ_61_70'), "Hz", "depericarper", "HZ_61_70")}
              {renderScadaRow("71 - 80 %", getDisplayVal('depericarper', 'HZ_71_80'), "Hz", "depericarper", "HZ_71_80")}
              {renderScadaRow("81 - 90 %", getDisplayVal('depericarper', 'HZ_81_90'), "Hz", "depericarper", "HZ_81_90")}
              {renderScadaRow("91 - 100 %", getDisplayVal('depericarper', 'HZ_91_100'), "Hz", "depericarper", "HZ_91_100")}
            </div>
          </div>
        </div>

        {/* Destoner */}
        <div className="som-ps-card" style={{ position: 'relative' }} onClick={(e) => { if(configMode) handleEquipmentClick('destoner', [], [{key:"MIN_HZ", label:"Min Hz"}, {key:"MAX_HZ", label:"Max Hz"}]) }}>
          <div className="som-ps-card-header"><h3 className="som-ps-card-title">Destoner</h3></div>
          <div className="som-ps-card-body" style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
              {renderScadaRow("Min", getDisplayVal('destoner', 'MIN_HZ'), "Hz", "destoner", "MIN_HZ")}
              {renderScadaRow("Max", getDisplayVal('destoner', 'MAX_HZ'), "Hz", "destoner", "MAX_HZ")}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', width: '100%', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {renderScadaRow("0 - 10 %", getDisplayVal('destoner', 'HZ_0_10'), "Hz", "destoner", "HZ_0_10")}
              {renderScadaRow("10 - 20 %", getDisplayVal('destoner', 'HZ_10_20'), "Hz", "destoner", "HZ_10_20")}
              {renderScadaRow("21 - 30 %", getDisplayVal('destoner', 'HZ_21_30'), "Hz", "destoner", "HZ_21_30")}
              {renderScadaRow("31 - 40 %", getDisplayVal('destoner', 'HZ_31_40'), "Hz", "destoner", "HZ_31_40")}
              {renderScadaRow("41 - 50 %", getDisplayVal('destoner', 'HZ_41_50'), "Hz", "destoner", "HZ_41_50")}
              {renderScadaRow("51 - 60 %", getDisplayVal('destoner', 'HZ_51_60'), "Hz", "destoner", "HZ_51_60")}
              {renderScadaRow("61 - 70 %", getDisplayVal('destoner', 'HZ_71_80'), "Hz", "destoner", "HZ_61_70")}
              {renderScadaRow("71 - 80 %", getDisplayVal('destoner', 'HZ_71_80'), "Hz", "destoner", "HZ_71_80")}
              {renderScadaRow("81 - 90 %", getDisplayVal('destoner', 'HZ_81_90'), "Hz", "destoner", "HZ_81_90")}
              {renderScadaRow("91 - 100 %", getDisplayVal('destoner', 'HZ_91_100'), "Hz", "destoner", "HZ_91_100")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  //  PRESS SETTINGS SLIDE
  const renderPressSlide = () => {
    const id = `press${activePress}`;
    
    const getSetSignals = (set) => [
      { key: `SET${set}_L_ACT`, label: `Set ${set} L Active` },
      { key: `SET${set}_L_NEW`, label: `Set ${set} L New Setting` },
      { key: `SET${set}_M_ACT`, label: `Set ${set} M Active` },
      { key: `SET${set}_M_NEW`, label: `Set ${set} M New Setting` },
      { key: `SET${set}_H_ACT`, label: `Set ${set} H Active` },
      { key: `SET${set}_H_NEW`, label: `Set ${set} H New Setting` }
    ];
    const llolSignals = [
       { key: "LL_ACT", label: "LL Active" }, { key: "LL_NEW", label: "LL New Setting" },
       { key: "LL_RETRACT_ACT", label: "LL Retract Active" }, { key: "LL_RETRACT_NEW", label: "LL Retract New Setting" },
       { key: "OL_ACT", label: "OL Active" }, { key: "OL_NEW", label: "OL New Setting" },
       { key: "OL_RETRACT_ACT", label: "OL Retract Active" }, { key: "OL_RETRACT_NEW", label: "OL Retract New Setting" }
    ];
    const hystSignals = [
       { key: "DELAY_ACT", label: "Delay Active" }, { key: "DELAY_NEW", label: "Delay New Setting" },
       { key: "RETRACT_ACT", label: "Retract Active" }, { key: "RETRACT_NEW", label: "Retract New Setting" },
       { key: "IDLING_ACT", label: "Idling Active" }, { key: "IDLING_NEW", label: "Idling New Setting" }
    ];
    const pvShiftSignals = [
       { key: "PV_4MA_ACT", label: "4mA Active" }, { key: "PV_4MA_NEW", label: "4mA New Setting" },
       { key: "PV_20MA_ACT", label: "20mA Active" }, { key: "PV_20MA_NEW", label: "20mA New Setting" },
       { key: "SHIFT_AMP_ACT", label: "Shift Amp Active" }, { key: "SHIFT_AMP_NEW", label: "Shift Amp New Setting" }
    ];
    const rangeSignals = [
       { key: "ANALOG_MIN", label: "Analog Min" }, { key: "ANALOG_MAX", label: "Analog Max" },
       { key: "SENECA_MIN", label: "Seneca Min" }, { key: "SENECA_MAX", label: "Seneca Max" }
    ];

    return (
      <div className="som-press-settings-grid">
        <div className="som-ps-card">
          <div className="som-ps-card-header"><h3 className="som-ps-card-title">L, M, H Setting</h3></div>
          <div className="som-ps-card-body">
            <div className="som-lmh-grid">
              {[1, 2, 3, 4].map((set) => {
                const setSignals = getSetSignals(set);
                const hasSetMapping = setSignals.some(s => tagMap && tagMap[`${id}__${s.key}`]);
                const setStyle = configMode ? {
                  outline: hasSetMapping ? "2px solid #3b82f6" : "2px solid #ef4444",
                  boxShadow: hasSetMapping ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
                  backgroundColor: hasSetMapping ? "transparent" : "rgba(239, 68, 68, 0.15)",
                  cursor: "pointer"
                } : {};

                return (
                <div key={set} className="som-lmh-set" style={setStyle} onClick={(e) => { if(configMode) handleBoxClick(e, id, '', null, null, setSignals) }}>
                  <div className="som-lmh-set-title">Set {set}</div>
                  <div className="som-lmh-columns">
                    <span></span>
                    <span className="som-lmh-col-header">Active</span>
                    <span className="som-lmh-col-header">New Setting</span>
                    {['L', 'M', 'H'].map(p => {
                      const actType = `SET${set}_${p}_ACT`;
                      const newType = `SET${set}_${p}_NEW`;
                      const actVal = getDisplayVal(id, actType);
                      const newVal = getDisplayVal(id, newType);
                      return (
                        <>
                          <span key={`lbl-${set}-${p}`} className="som-lmh-row-label">{p}</span>
                          <ValBox key={`act-${set}-${p}`} value={actVal} unit="A" onClick={configMode ? (e) => handleBoxClick(e, id, actType, actVal, { label: `Press ${activePress} Set ${set} ${p} Active` }, setSignals) : undefined} />
                          <ValBox key={`new-${set}-${p}`} isEdited={localSettings[`${id}__${newType}`] !== undefined} value={newVal} unit="A" onClick={(e) => handleBoxClick(e, id, newType, newVal, { label: `Press ${activePress} Set ${set} ${p} New Setting` }, setSignals)} />
                        </>
                      )
                    })}
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>

        <div className="som-press-bottom-grid">
          <div className="som-ps-card" style={getDevStyle(id)} onClick={(e) => { if(configMode) handleBoxClick(e, id, '', null, null, llolSignals) }}>
            <div className="som-ps-card-header"><h3 className="som-ps-card-title">LL & OL Setting</h3></div>
            <div className="som-ps-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 6px', alignItems: 'center' }}>
                <span></span>
                <span className="som-lmh-col-header">Active</span>
                <span className="som-lmh-col-header">New Setting</span>
                {[
                  { key: 'LL', label: 'LL', unit: 'A', dec: 1 },
                  { key: 'LL_RETRACT', label: 'LL Retract', unit: 'Sec', dec: 0 },
                  { key: 'OL', label: 'OL', unit: 'A', dec: 1 },
                  { key: 'OL_RETRACT', label: 'OL Retract', unit: 'Sec', dec: 0 },
                ].map(item => {
                  const actType = `${item.key}_ACT`;
                  const newType = `${item.key}_NEW`;
                  const actVal = getDisplayVal(id, actType);
                  const newVal = getDisplayVal(id, newType);
                  return (
                  <>
                    <span key={`lbl-${item.key}`} className="som-data-row-label">{item.label}</span>
                    <ValBox key={`act-${item.key}`} value={actVal} unit={item.unit} decimals={item.dec} onClick={configMode ? (e) => handleBoxClick(e, id, actType, actVal, { label: `Press ${activePress} ${item.label} Active` }, llolSignals) : undefined} />
                    <ValBox key={`new-${item.key}`} isEdited={localSettings[`${id}__${newType}`] !== undefined} value={newVal} unit={item.unit} decimals={item.dec} onClick={(e) => handleBoxClick(e, id, newType, newVal, { label: `Press ${activePress} ${item.label} New Setting` }, llolSignals)} />
                  </>
                )})}
              </div>
            </div>
          </div>

          <div className="som-ps-card" style={getDevStyle(id)} onClick={(e) => { if(configMode) handleBoxClick(e, id, '', null, null, hystSignals) }}>
            <div className="som-ps-card-header"><h3 className="som-ps-card-title">Hysteresis Value</h3></div>
            <div className="som-ps-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 6px', alignItems: 'center' }}>
                <span></span>
                <span className="som-lmh-col-header">Active</span>
                <span className="som-lmh-col-header">New Setting</span>
                {[
                  { key: 'DELAY', label: 'Delay' },
                  { key: 'RETRACT', label: 'Retract' },
                  { key: 'IDLING', label: 'Idling' },
                ].map(item => {
                  const actType = `${item.key}_ACT`;
                  const newType = `${item.key}_NEW`;
                  const actVal = getDisplayVal(id, actType);
                  const newVal = getDisplayVal(id, newType);
                  return (
                  <>
                    <span key={`lbl-${item.key}`} className="som-data-row-label">{item.label}</span>
                    <ValBox key={`act-${item.key}`} value={actVal} unit="Sec" decimals={0} onClick={configMode ? (e) => handleBoxClick(e, id, actType, actVal, { label: `Press ${activePress} ${item.label} Active` }, hystSignals) : undefined} />
                    <ValBox key={`new-${item.key}`} isEdited={localSettings[`${id}__${newType}`] !== undefined} value={newVal} unit="Sec" decimals={0} onClick={(e) => handleBoxClick(e, id, newType, newVal, { label: `Press ${activePress} ${item.label} New Setting` }, hystSignals)} />
                  </>
                )})}
              </div>
            </div>
          </div>

          <div className="som-ps-card" style={getDevStyle(id)} onClick={(e) => { if(configMode) handleBoxClick(e, id, '', null, null, pvShiftSignals) }}>
            <div className="som-ps-card-header"><h3 className="som-ps-card-title">Current (A) PV Shift</h3></div>
            <div className="som-ps-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 6px', alignItems: 'center' }}>
                <span></span>
                <span className="som-lmh-col-header">Active</span>
                <span className="som-lmh-col-header">New Setting</span>
                {[
                  { key: 'PV_4MA', label: '4mA' },
                  { key: 'PV_20MA', label: '20mA' },
                  { key: 'SHIFT_AMP', label: 'Shift Amp' },
                ].map(item => {
                  const actType = `${item.key}_ACT`;
                  const newType = `${item.key}_NEW`;
                  const actVal = getDisplayVal(id, actType);
                  const newVal = getDisplayVal(id, newType);
                  return (
                  <>
                    <span key={`lbl-${item.key}`} className="som-data-row-label">{item.label}</span>
                    <ValBox key={`act-${item.key}`} value={actVal} unit="A" onClick={configMode ? (e) => handleBoxClick(e, id, actType, actVal, { label: `Press ${activePress} ${item.label} Active` }, pvShiftSignals) : undefined} />
                    <ValBox key={`new-${item.key}`} isEdited={localSettings[`${id}__${newType}`] !== undefined} value={newVal} unit="A" onClick={(e) => handleBoxClick(e, id, newType, newVal, { label: `Press ${activePress} ${item.label} New Setting` }, pvShiftSignals)} />
                  </>
                )})}
              </div>
            </div>
          </div>

          <div className="som-ps-card" style={getDevStyle(id)} onClick={(e) => { if(configMode) handleBoxClick(e, id, '', null, null, rangeSignals) }}>
            <div className="som-ps-card-header"><h3 className="som-ps-card-title">Range Setting</h3></div>
            <div className="som-ps-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 6px', alignItems: 'center' }}>
                <span></span>
                <span className="som-lmh-col-header">MIN</span>
                <span className="som-lmh-col-header">MAX</span>
                {['ANALOG', 'SENECA'].map(key => {
                   const label = key === 'ANALOG' ? 'Analog' : 'Seneca';
                   const minType = `${key}_MIN`;
                   const maxType = `${key}_MAX`;
                   const unit = key === 'SENECA' ? 'A' : '';
                   const minVal = getDisplayVal(id, minType);
                   const maxVal = getDisplayVal(id, maxType);
                   return (
                     <>
                        <span key={`lbl-${key}`} className="som-data-row-label">{label}</span>
                        <ValBox key={`min-${key}`} value={minVal} unit={unit} decimals={0} onClick={configMode ? (e) => handleBoxClick(e, id, minType, minVal, { label: `Press ${activePress} ${label} Min` }, rangeSignals) : undefined} />
                        <ValBox key={`max-${key}`} isEdited={localSettings[`${id}__${maxType}`] !== undefined} value={maxVal} unit={unit} decimals={0} onClick={(e) => handleBoxClick(e, id, maxType, maxVal, { label: `Press ${activePress} ${label} Max` }, rangeSignals)} />
                     </>
                   )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderDigesterSlide = () => (
    <div className="som-digester-grid">
      {[1, 2, 3, 4].map((n) => {
        const id = `digester${n}`;
        return (
        <div key={n} className="som-digester-card" style={getDevStyle(id)} onClick={(e) => { if(configMode) handleBoxClick(e, id, '') }}>
          <div className="som-digester-card-header">
            <h3 className="som-digester-card-title">Digester No.{n}</h3>
          </div>
          <div className="som-digester-card-body">
            <div className="som-digester-section-title">Discharge CV</div>

            <div className="som-digester-full-row">
              <span className="som-digester-full-label">Digester Full</span>
              <ValBox value={getDisplayVal(id, 'FULL')} unit="A" onClick={(e) => handleBoxClick(e, id, 'FULL', getDisplayVal(id, 'FULL'), { label: `Digester ${n} Full` })} />
            </div>

            <div className="som-pv-table">
              {Array.from({length: 10}).map((_, ri) => {
                const pvLabel = ri === 0 ? 'PV <' : ri === 9 ? 'PV >' : '< PV <';
                return (
                <div key={ri} className="som-pv-row">
                  <span className="som-pv-label">{pvLabel}</span>
                  <ValBox value={getDisplayVal(id, `PV_${ri}`)} unit="A" onClick={(e) => handleBoxClick(e, id, `PV_${ri}`, getDisplayVal(id, `PV_${ri}`), { label: `Dig${n} ${pvLabel} PV` })} />
                  <ValBox value={getDisplayVal(id, `PCT_${ri}`)} unit="%" decimals={0} onClick={(e) => handleBoxClick(e, id, `PCT_${ri}`, getDisplayVal(id, `PCT_${ri}`), { label: `Dig${n} ${pvLabel} %` })} />
                </div>
              )})}
            </div>

            <div className="som-tempcv-section">
              <div className="som-digester-section-title">Temperature CV</div>
              <div className="som-tempcv-grid">
                {['SV', 'P', 'UPPER_LIMIT', 'I', 'D'].map(param => (
                    <>
                    <span className="som-tempcv-label">{param}</span>
                    <ValBox value={getDisplayVal(id, param)} onClick={(e) => handleBoxClick(e, id, param, getDisplayVal(id, param), { label: `Dig${n} ${param}` })} />
                    </>
                ))}
              </div>
            </div>
          </div>
        </div>
      )})}
    </div>
  );

  return (
    <div className="som-press-page">
      <div className="som-press-tabs">
        <button className={`som-press-tab ${activeSlide === 'overview' ? 'som-press-tab--active' : ''}`} onClick={() => setActiveSlide('overview')}>Press Overview</button>
        <button className={`som-press-tab ${activeSlide === 'press' ? 'som-press-tab--active' : ''}`} onClick={() => setActiveSlide('press')}>Press Settings</button>
        <button className={`som-press-tab ${activeSlide === 'digester' ? 'som-press-tab--active' : ''}`} onClick={() => setActiveSlide('digester')}>Digester Settings</button>
      </div>

      {activeSlide === 'press' && (
        <div className="som-press-selector">
          {[1, 2, 3, 4].map(n => (
            <button key={n} className={`som-press-num-btn ${activePress === n ? 'som-press-num-btn--active' : ''}`} onClick={() => setActivePress(n)}>
              Press No.{n}
            </button>
          ))}
        </div>
      )}

      <div className="som-press-slide">
        {activeSlide === 'overview' ? renderOverviewSlide() : activeSlide === 'press' ? renderPressSlide() : renderDigesterSlide()}
      </div>

      <footer className="som-press-footer">
        <button className={`som-press-save-btn ${isChanged ? 'active-save' : ''}`} onClick={handleSave} disabled={!isChanged || isSaving} style={{ opacity: isChanged ? 1 : 0.5 }}>
          {isSaving ? 'SAVING...' : 'APPLY CHANGES'}
        </button>
      </footer>

      {activeKeypad && (
        <NumericKeypad
          value={activeKeypad.currentValue}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ''}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleNumericInput}
        />
      )}
    </div>
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

export default PressStationSettingsPage
