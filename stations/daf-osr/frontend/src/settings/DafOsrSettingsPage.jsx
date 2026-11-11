import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import usePlcStore from '@core/store';
import { TagEditorModal, authHeaders } from '../components/SharedComponents.jsx';
import './DafOsrSettingsPage.css';

/**
 * NumericKeypad — Modal Numpad SCADA untuk input nilai setting ke PLC
 */
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (value === null || value === undefined || value === '' || value === 'No Tag' || value === '--') return '0';
    const num = Number(value);
    if (isNaN(num)) return '0';
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(4)).toString();
  });

  const handleNumber = (n) => {
    setDisplayValue((prev) => (prev === '0' ? n.toString() : prev + n.toString()));
  };

  const handleDecimal = () => {
    setDisplayValue((prev) => (!prev.includes('.') ? prev + '.' : prev));
  };

  const handleBack = () => {
    setDisplayValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleEnter = useCallback(() => {
    const parsed = parseFloat(displayValue);
    onConfirm(isNaN(parsed) ? 0 : parsed);
  }, [displayValue, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumber(parseInt(e.key, 10));
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBack();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleEnter();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayValue, handleEnter, onClose]);

  const btnStyle = {
    padding: '12px',
    fontSize: '17px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#0f172a',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '800',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    transition: 'all 0.1s ease',
  };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={(e) => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#0f172a',
              fontWeight: '900',
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
        <div
          style={{
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => handleNumber(n)}
              style={btnStyle}
            >
              {n}
            </button>
          ))}
          <button type="button" onClick={handleDecimal} style={btnStyle}>.</button>
          <button type="button" onClick={() => handleNumber(0)} style={btnStyle}>0</button>
          <button
            type="button"
            onClick={handleBack}
            style={{ ...btnStyle, background: '#f1f5f9', color: '#475569' }}
            title="Backspace"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => setDisplayValue('0')}
            style={{
              gridColumn: 'span 1',
              padding: '11px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              borderRadius: '10px',
              fontWeight: '800',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={handleEnter}
            style={{
              gridColumn: 'span 2',
              padding: '11px',
              background: '#ffdb3b',
              border: '1px solid #eab308',
              color: '#0f172a',
              borderRadius: '10px',
              fontWeight: '900',
              cursor: 'pointer',
              fontSize: '14px',
              letterSpacing: '0.04em',
            }}
          >
            ENTER ↵
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * SettingValBox
 * Komponen kotak nilai individual yang mendukung mapping PLC Tag & input Numpad write ke PLC.
 * - Mode Normal: Klik kotak membuka Numpad untuk input nilai baru ke PLC.
 * - Mode Config (Developer via Ctrl+X):
 *   - Outline solid biru jika sudah di-mapping.
 *   - Outline dashed merah dan teks "No Tag" jika belum di-mapping.
 *   - Klik kotak membuka TagEditorModal untuk binding ke tag PLC.
 */
function SettingValBox({
  eqId,
  signalKey,
  label,
  unit = '',
  isHighlight = false,
  decimals,
  isPercent = false,
  tagMap = {},
  getMappedValue,
  stagedEdits = {},
  configMode = false,
  isDev = false,
  onOpenTagModal,
  onOpenKeypad,
}) {
  const fieldKey = `${eqId}__${signalKey}`;
  const hasTag = Boolean(tagMap && tagMap[fieldKey]);
  const liveVal = getMappedValue ? getMappedValue(eqId, signalKey) : null;
  const isEdited = stagedEdits[fieldKey] !== undefined;

  let displayContent = '';
  if (isEdited) {
    displayContent = stagedEdits[fieldKey];
  } else if (!hasTag) {
    displayContent = 'No Tag';
  } else {
    displayContent = (liveVal !== null && liveVal !== undefined) ? liveVal : '--';
  }

  // Format angka desimal jika bertipe angka
  if (typeof displayContent === 'number' && decimals !== undefined) {
    displayContent = displayContent.toFixed(decimals);
  }

  // Tambahkan tanda % jika parameter bertipe persentase
  if (isPercent && displayContent !== '' && displayContent !== 'No Tag' && displayContent !== '--') {
    if (!String(displayContent).endsWith('%')) {
      displayContent = `${displayContent}%`;
    }
  }

  const isNoTag = displayContent === 'No Tag';
  const canConfig = isDev && configMode;

  const devStyle = canConfig
    ? {
        outline: hasTag ? '2.5px solid #3b82f6' : '2.5px solid #ef4444',
        outlineOffset: '2px',
        boxShadow: hasTag
          ? '0 0 6px rgba(59, 130, 246, 0.6)'
          : '0 0 6px rgba(239, 68, 68, 0.6)',
        cursor: 'pointer',
      }
    : {
        cursor: 'pointer',
      };

  const stagedStyle = isEdited
    ? {
        background: '#fef08a',
        color: '#854d0e',
        fontWeight: '900',
        borderRadius: '4px',
        padding: '1px 5px',
        boxShadow: '0 0 0 1.5px #eab308',
      }
    : {};

  const noTagCustom = isNoTag
    ? {
        fontStyle: 'italic',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        fontSize: '8.5px',
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: '16px',
        color: canConfig ? '#ef4444' : '#94a3b8',
      }
    : {};

  const handleClick = () => {
    if (canConfig) {
      if (onOpenTagModal) {
        onOpenTagModal(eqId, [{ key: signalKey, label: label || signalKey }]);
      }
    } else {
      if (onOpenKeypad) {
        let currentNum = 0;
        if (isEdited) {
          currentNum = stagedEdits[fieldKey];
        } else if (liveVal !== null && liveVal !== undefined && !isNaN(Number(liveVal))) {
          currentNum = Number(liveVal);
        }
        onOpenKeypad({
          eqId,
          signalKey,
          label: label || signalKey,
          unit: isPercent ? '%' : unit,
          value: currentNum,
        });
      }
    }
  };

  const spanClass = isHighlight ? 'som-daf-highlight-val' : 'som-daf-plain-val';

  return (
    <span
      className={`${spanClass} ${isEdited ? 'is-staged' : ''}`}
      style={{ ...devStyle, ...noTagCustom, ...stagedStyle }}
      onClick={handleClick}
      title={
        canConfig
          ? `Click to map PLC Tag: ${eqId}__${signalKey} (${hasTag ? 'Mapped' : 'No Tag'})`
          : `Click to edit setpoint (${label || signalKey})`
      }
    >
      {displayContent}
    </span>
  );
}

function DafOsrSettingsPage({
  user,
  configMode: propConfigMode = false,
  onBack,
  onSave,
  onCancel,
  onRestoreDefault,
  onExport,
  onImport,
  tagMap: propTagMap,
  availableTags: propAvailableTags,
}) {
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

  const [internalTagMap, setInternalTagMap] = useState({});
  const [internalAvailableTags, setInternalAvailableTags] = useState([]);
  const [realtimeData, setRealtimeData] = useState({});
  const [tagEdit, setTagEdit] = useState(null);
  const [savingTags, setSavingTags] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stagedEdits, setStagedEdits] = useState({});
  const [activeKeypad, setActiveKeypad] = useState(null);

  const tags = usePlcStore((state) => state.tags);
  const initSocket = usePlcStore((state) => state.initSocket);

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);

  const tagMap = propTagMap || internalTagMap;
  const availableTags = propAvailableTags || internalAvailableTags;

  // 1. Muat existing mappings dari backend
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
          setInternalTagMap(map);
        }
      }
    } catch (err) {
      console.error('[DafOsrSettingsPage] Failed to load station mappings:', err);
    }
  }, []);

  // 2. Muat available tags dari backend
  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch('/api/daf-osr/plc-config/tags', {
        headers: authHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setInternalAvailableTags(json.data);
        }
      }
    } catch (err) {
      console.error('[DafOsrSettingsPage] Failed to fetch available tags:', err);
    }
  }, []);

  useEffect(() => {
    loadMappings();
    fetchAvailableTags();
  }, [loadMappings, fetchAvailableTags]);

  useEffect(() => {
    if (tagEdit) {
      fetchAvailableTags();
    }
  }, [tagEdit, fetchAvailableTags]);

  // 3. Polling live tags fallback
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
    const interval = setInterval(fetchLive, 1000);
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

  // Ambil nilai live mapping
  const getMappedValue = useCallback((equipment, signalKey) => {
    const key = `${equipment}__${signalKey}`;
    const tagId = tagMap ? tagMap[key] : null;

    if (!tagId) {
      return null;
    }

    const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
    if (!tagObj) return "--";

    const liveValue = tags[tagObj.tag_name]?.value !== undefined
      ? tags[tagObj.tag_name].value
      : realtimeData[tagObj.tag_name];

    if (liveValue === undefined || liveValue === null || liveValue === "") {
      return "--";
    }

    const num = parseFloat(liveValue);
    if (!isNaN(num)) {
      return +(Math.round(num + "e+2") + "e-2");
    }
    return liveValue;
  }, [tagMap, availableTags, realtimeData, tags]);

  const handleOpenTagModal = (eqId, signals) => {
    if (!effectiveConfigMode) return;
    fetchAvailableTags();
    setTagEdit({ targetId: eqId, signals });
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
      setInternalTagMap((prev) => ({ ...prev, ...updatedTags }));
      setTagEdit(null);
    } catch (err) {
      console.error('[DafOsrSettingsPage] Failed to save station mappings:', err);
      alert('Failed to save mapping: ' + (err.message || 'Network error'));
    } finally {
      setSavingTags(false);
    }
  };

  const handleKeypadConfirm = (val) => {
    if (activeKeypad) {
      const fieldKey = `${activeKeypad.eqId}__${activeKeypad.signalKey}`;
      setStagedEdits((prev) => ({
        ...prev,
        [fieldKey]: val,
      }));
      setActiveKeypad(null);
    }
  };

  const handleOpenKeypad = (info) => {
    setActiveKeypad(info);
  };

  const handleSave = async () => {
    const stagedKeys = Object.keys(stagedEdits);
    if (stagedKeys.length === 0) {
      alert("Tidak ada perubahan setting yang perlu disimpan.");
      return;
    }

    setIsSaving(true);
    try {
      let writtenCount = 0;
      let unmappedCount = 0;

      stagedKeys.forEach((fieldKey) => {
        const val = stagedEdits[fieldKey];
        const tagId = tagMap[fieldKey];
        if (tagId) {
          const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
          const tagName = tagObj ? tagObj.tag_name : fieldKey;
          usePlcStore.getState().sendCommand(tagId, Number(val), tagName, 'daf-osr');
          writtenCount++;
        } else {
          unmappedCount++;
        }
      });

      if (unmappedCount > 0) {
        alert(`Setting berhasil dikirim ke PLC: ${writtenCount} item.\nCatatan: ${unmappedCount} item dilewati karena belum di-mapping ke PLC tag.`);
      } else {
        alert(`Setting berhasil disimpan dan dikirim ke PLC (${writtenCount} item).`);
      }

      setStagedEdits({});
      if (onSave) onSave();
    } catch (err) {
      console.error('[DafOsrSettingsPage] Failed to send setting to PLC:', err);
      alert('Gagal mengirim nilai setting ke PLC: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (Object.keys(stagedEdits).length > 0) {
      if (window.confirm("Batalkan semua perubahan setting yang belum disimpan?")) {
        setStagedEdits({});
      }
    } else {
      if (onCancel) {
        onCancel();
      } else if (onBack) {
        onBack();
      } else {
        console.log('Cancel Setting clicked');
      }
    }
  };

  const handleRestoreDefault = () => {
    if (onRestoreDefault) {
      onRestoreDefault();
    } else {
      console.log('Restore Default clicked');
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      console.log('Export Setting clicked');
    }
  };

  const handleImport = (e) => {
    if (onImport) {
      onImport(e);
    } else {
      console.log('Import Setting clicked', e.target.files?.[0]);
    }
  };

  const renderValBox = (eqId, signalKey, label, isHighlight = false, decimals = undefined, isPercent = false, customUnit = '') => {
    let resolvedUnit = customUnit;
    if (!resolvedUnit) {
      if (isPercent) resolvedUnit = '%';
      else if (label?.includes('m3/hr') || label?.includes('Flowrate') || signalKey?.includes('FLOW')) resolvedUnit = 'm3/hr';
      else if (label?.includes('Bar') || label?.includes('Pressure') || signalKey?.includes('PRESSURE')) resolvedUnit = 'Bar';
      else if (label?.includes('Sec') || signalKey === 'DURATION' || signalKey === 'ON_OFF_DELAY') resolvedUnit = 'Sec';
      else if (label?.includes('Min') || signalKey === 'FREQUENCY') resolvedUnit = 'Min';
      else if (label?.includes('(Hz)') || signalKey === 'HZ') resolvedUnit = 'Hz';
      else if (label?.includes('(Amp)') || signalKey === 'AMP') resolvedUnit = 'A';
      else if (label?.includes('(V)') || signalKey === 'VOLT') resolvedUnit = 'V';
      else if (label?.includes('(C)') || label?.includes('Temp') || signalKey?.includes('TEMP')) resolvedUnit = '°C';
      else if (signalKey?.includes('RPM')) resolvedUnit = 'RPM';
    }

    return (
      <SettingValBox
        eqId={eqId}
        signalKey={signalKey}
        label={label}
        unit={resolvedUnit}
        isHighlight={isHighlight}
        decimals={decimals}
        isPercent={isPercent}
        tagMap={tagMap}
        getMappedValue={getMappedValue}
        stagedEdits={stagedEdits}
        configMode={effectiveConfigMode}
        isDev={isDev}
        onOpenTagModal={handleOpenTagModal}
        onOpenKeypad={handleOpenKeypad}
      />
    );
  };

  return (
    <div className="som-daf-settings-page">
      {/* ====================================================================
          AREA KANVAS 2 KOLOM PENGATURAN (DAFOSR Main Tank & AE Tank)
          ==================================================================== */}
      <div className="som-daf-settings-canvas">
        <div className="som-daf-settings-grid-2col">
          
          {/* ==================== KOLOM 1: DAFOSR Main Tank ==================== */}
          <div className="som-daf-card">
            <div className="som-daf-card-header">
              <h3 className="som-daf-card-title">DAFOSR Main Tank</h3>
            </div>

            {/* 1.1 Inlet Flow Control */}
            <div className="som-daf-section-header">
              <span>Inlet Flow Control</span>
            </div>
            <table className="som-daf-table">
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="som-daf-label-cell">Inlet Flowrate</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_main_tank_inlet_flow", "FLOWRATE_SP", "Inlet Flowrate (Main Tank)", true, 2)}
                      <span className="som-daf-unit">m3/hr</span>
                    </span>
                  </td>
                  <th>Valve Position</th>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Lower limit</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_main_tank_inlet_flow", "LOWER_LIMIT", "Inlet Flow Lower Limit (Main Tank)", false, 2)}
                    </span>
                  </td>
                  <td className="som-daf-pos-cell">
                    {renderValBox("settings_main_tank_inlet_flow", "LOWER_VALVE_POS", "Inlet Flow Lower Valve Position (Main Tank)", true, undefined, true)}
                  </td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Upper limit</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_main_tank_inlet_flow", "UPPER_LIMIT", "Inlet Flow Upper Limit (Main Tank)", false, 2)}
                    </span>
                  </td>
                  <td className="som-daf-pos-cell">
                    {renderValBox("settings_main_tank_inlet_flow", "UPPER_VALVE_POS", "Inlet Flow Upper Valve Position (Main Tank)", true, undefined, true)}
                  </td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">P</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_main_tank_inlet_flow", "PID_P", "Inlet Flow PID P (Main Tank)", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">I</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_main_tank_inlet_flow", "PID_I", "Inlet Flow PID I (Main Tank)", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">D</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_main_tank_inlet_flow", "PID_D", "Inlet Flow PID D (Main Tank)", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
              </tbody>
            </table>

            {/* 1.2 Skimmer Control */}
            <div className="som-daf-section-header">
              <span>Skimmer Control</span>
            </div>
            <table className="som-daf-table">
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="som-daf-label-cell">RPM</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_skimmer", "RPM_SP", "Skimmer RPM Setpoint", true, 2)}
                      <span className="som-daf-unit">r/min</span>
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Hz</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_skimmer", "HZ", "Skimmer Frequency (Hz)", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Amp</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_skimmer", "AMP", "Skimmer Current (Amp)", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">V</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_skimmer", "VOLT", "Skimmer Voltage (V)", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
              </tbody>
            </table>

            {/* 1.3 Blowdown Control */}
            <div className="som-daf-section-header">
              <span>Blowdown Control</span>
            </div>
            <table className="som-daf-table">
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="som-daf-label-cell">Frequency</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_blowdown", "FREQUENCY", "Blowdown Frequency", true, 2)}
                      <span className="som-daf-unit">min</span>
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Duration</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_blowdown", "DURATION", "Blowdown Duration", true, 2)}
                      <span className="som-daf-unit">s</span>
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
              </tbody>
            </table>

            {/* 1.4 Compressor Setting */}
            <div className="som-daf-section-header">
              <span>Compressor Setting</span>
            </div>
            <table className="som-daf-table">
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="som-daf-label-cell">Stop</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_compressor", "PRESSURE_STOP", "Compressor Stop Pressure", true, 2)}
                      <span className="som-daf-unit">bar</span>
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Run</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_compressor", "PRESSURE_RUN", "Compressor Run Pressure", true, 2)}
                      <span className="som-daf-unit">bar</span>
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ==================== KOLOM 2: AE Tank ==================== */}
          <div className="som-daf-card">
            <div className="som-daf-card-header">
              <h3 className="som-daf-card-title">AE Tank</h3>
            </div>

            {/* 2.1 Pressure Control */}
            <div className="som-daf-section-header">
              <span>Pressure Control</span>
            </div>
            <table className="som-daf-table">
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="som-daf-label-cell">Normal Pressure</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_pressure", "NORMAL_SP", "AE Normal Pressure Setpoint", true, 2)}
                      <span className="som-daf-unit">bar</span>
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Lower Limit</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_pressure", "LOWER_LIMIT", "AE Pressure Lower Limit", false, 2)}
                      <span className="som-daf-unit">bar</span>
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Upper Limit</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_pressure", "UPPER_LIMIT", "AE Pressure Upper Limit", false, 2)}
                      <span className="som-daf-unit">bar</span>
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
              </tbody>
            </table>

            {/* 2.2 Inlet Flow Control */}
            <div className="som-daf-section-header">
              <span>Inlet Flow Control</span>
            </div>
            <table className="som-daf-table">
              <colgroup>
                <col style={{ width: '42%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="som-daf-label-cell">Control Ratio</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_inlet_flow", "CONTROL_RATIO", "AE Inlet Flow Control Ratio", true, undefined, true)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Inlet Flowrate</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_inlet_flow", "FLOWRATE_SP", "AE Inlet Flowrate", false, 2)}
                      <span className="som-daf-unit">m3/hr</span>
                    </span>
                  </td>
                  <th>Valve Position</th>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Lower Limit</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_inlet_flow", "LOWER_LIMIT", "AE Inlet Flow Lower Limit", false, 2)}
                      <span className="som-daf-unit">m3/hr</span>
                    </span>
                  </td>
                  <td className="som-daf-pos-cell">
                    {renderValBox("settings_ae_inlet_flow", "LOWER_VALVE_POS", "AE Inlet Lower Valve Position", true, undefined, true)}
                  </td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">Upper Limit</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_inlet_flow", "UPPER_LIMIT", "AE Inlet Flow Upper Limit", false, 2)}
                      <span className="som-daf-unit">m3/hr</span>
                    </span>
                  </td>
                  <td className="som-daf-pos-cell">
                    {renderValBox("settings_ae_inlet_flow", "UPPER_VALVE_POS", "AE Inlet Upper Valve Position", true, undefined, true)}
                  </td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">P</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_inlet_flow", "PID_P", "AE Inlet Flow PID P", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">I</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_inlet_flow", "PID_I", "AE Inlet Flow PID I", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
                <tr>
                  <td className="som-daf-label-cell">D</td>
                  <td className="som-daf-val-cell">
                    <span className="som-daf-val-wrapper">
                      {renderValBox("settings_ae_inlet_flow", "PID_D", "AE Inlet Flow PID D", false, 1)}
                    </span>
                  </td>
                  <td className="som-daf-empty-pos"></td>
                </tr>
              </tbody>
            </table>

            {/* 2.3 & 2.4: 1 BINGKAI KIRI KANAN (Water level Control di Kiri & Surplus Valve Setting di Kanan) */}
            <div className="som-daf-subgrid-2col">
              {/* Subcard Kiri: Water level Control */}
              <div className="som-daf-subcard">
                <div className="som-daf-section-header">
                  <span>Water level Control</span>
                </div>
                <table className="som-daf-table">
                  <colgroup>
                    <col style={{ width: '42%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="som-daf-label-cell">Normal Level</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_ae_water_level", "NORMAL_SP", "AE Normal Water Level Setpoint", true, undefined, true)}
                        </span>
                      </td>
                      <th>Valve Position</th>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">Lower Limit</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_ae_water_level", "LOWER_LIMIT", "AE Water Level Lower Limit", false, undefined, true)}
                        </span>
                      </td>
                      <td className="som-daf-pos-cell">
                        {renderValBox("settings_ae_water_level", "LOWER_VALVE_POS", "AE Water Level Lower Valve Position", true, undefined, true)}
                      </td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">Upper Limit</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_ae_water_level", "UPPER_LIMIT", "AE Water Level Upper Limit", false, undefined, true)}
                        </span>
                      </td>
                      <td className="som-daf-pos-cell">
                        {renderValBox("settings_ae_water_level", "UPPER_VALVE_POS", "AE Water Level Upper Valve Position", true, undefined, true)}
                      </td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">P</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_ae_water_level", "PID_P", "AE Water Level PID P", false, 1)}
                        </span>
                      </td>
                      <td className="som-daf-empty-pos"></td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">I</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_ae_water_level", "PID_I", "AE Water Level PID I", false, 1)}
                        </span>
                      </td>
                      <td className="som-daf-empty-pos"></td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">D</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_ae_water_level", "PID_D", "AE Water Level PID D", false, 1)}
                        </span>
                      </td>
                      <td className="som-daf-empty-pos"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Subcard Kanan: Surplus Valve Setting */}
              <div className="som-daf-subcard">
                <div className="som-daf-section-header">
                  <span>Surplus Valve Setting</span>
                </div>
                <table className="som-daf-table">
                  <colgroup>
                    <col style={{ width: '48%' }} />
                    <col style={{ width: '52%' }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="som-daf-label-cell">Valve Open</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_surplus_valve", "OPEN_PRESS_SP", "Surplus Valve Open Pressure Setpoint", true, 2)}
                          <span className="som-daf-unit">bar</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">Valve Close</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_surplus_valve", "CLOSE_PRESS_SP", "Surplus Valve Close Pressure Setpoint", false, 2)}
                          <span className="som-daf-unit">bar</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">Frequency</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_surplus_valve", "FREQUENCY", "Surplus Valve Frequency", true, 2)}
                          <span className="som-daf-unit">min</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">Duration</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_surplus_valve", "DURATION", "Surplus Valve Duration", true, 2)}
                          <span className="som-daf-unit">s</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 2.5 Cooler Backwash Setting */}
                <div className="som-daf-section-header" style={{ borderTop: '1px solid #e2e8f0' }}>
                  <span>Cooler Backwash Setting</span>
                </div>
                <table className="som-daf-table">
                  <colgroup>
                    <col style={{ width: '48%' }} />
                    <col style={{ width: '52%' }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="som-daf-label-cell">Frequency</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_cooler_backwash", "FREQUENCY", "Cooler Backwash Frequency", true, 2)}
                          <span className="som-daf-unit">Min</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">Duration</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_cooler_backwash", "DURATION", "Cooler Backwash Duration", true, 2)}
                          <span className="som-daf-unit">Sec</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="som-daf-label-cell">ON/OFF Delay</td>
                      <td className="som-daf-val-cell">
                        <span className="som-daf-val-wrapper">
                          {renderValBox("settings_cooler_backwash", "ON_OFF_DELAY", "Cooler Backwash ON/OFF Delay", true, 2)}
                          <span className="som-daf-unit">Sec</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ====================================================================
          FOOTER AKSI TOOLBAR (Diadopsi langsung dari Sterilizer Station)
          ==================================================================== */}
      <footer className="som-settings-footer-actions">
        {/* Grup Kiri: Save, Cancel, Restore */}
        <div className="som-footer-left-group">
          <button 
            className="som-footer-btn som-btn-save-settings" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
              <path d="M433.9 129.9l-83.9-83.9A47.9 47.9 0 0 0 316.1 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V195.9c0-12.7-5.1-25-14.1-34zM224 416c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm96-304.8V192H128V111.2h192z" />
            </svg>
            {isSaving ? "Saving..." : "Save Setting"}
            {Object.keys(stagedEdits).length > 0 && (
              <span className="som-btn-save-badge">{Object.keys(stagedEdits).length}</span>
            )}
          </button>

          <button 
            className="som-footer-btn som-btn-cancel-settings" 
            onClick={handleCancel}
          >
            <svg width="14" height="14" viewBox="0 0 352 512" fill="currentColor">
              <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z" />
            </svg>
            Cancel
          </button>

          <button 
            className="som-footer-btn som-btn-restore-settings" 
            onClick={handleRestoreDefault}
          >
            <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor">
              <path d="M485.5 285.5c-4.7-4.7-12.3-4.7-17 0L450 304c-35.3-35.3-84-56-138-56-106 0-192 86-192 192s86 192 192 192c82.3 0 152.9-52 179.9-125 2.7-7.4-1.1-15.5-8.5-18.2s-15.5 1.1-18.2 8.5C439 462.6 378.8 504 312 504c-88.4 0-160-71.6-160-160s71.6-160 160-160c45.1 0 85.8 18.7 115.3 48.7l-24.8 24.8c-4.7 4.7-4.7 12.3 0 17 4.7 4.7 12.3 4.7 17 0l46-46c4.7-4.7 4.7-12.3 0-17z" />
            </svg>
            Restore Default
          </button>
        </div>

        {/* Grup Kanan: Export & Import Excel */}
        <div className="som-footer-right-group">
          <button 
            className="som-footer-btn som-btn-export-settings" 
            onClick={handleExport}
          >
            <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
              <path d="M384 128h-80V48c0-8.8-7.2-16-16-16h-128c-8.8 0-16 7.2-16 16v80H64c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64zm-144 240v64c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-64h-64c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64v-64c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v64h64c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16h-64z" />
            </svg>
            Export Setting
          </button>

          <label 
            className="som-footer-btn som-btn-import-settings" 
            style={{ cursor: "pointer" }}
          >
            <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
              <path d="M384 384H64v-80c0-8.8-7.2-16-16-16H16c-8.8 0-16 7.2-16 16v96c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64v-96c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v80zm-136-192V64c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v128h-64c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h224c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-64z" />
            </svg>
            Import Setting
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              style={{ display: "none" }} 
              onChange={handleImport} 
            />
          </label>
        </div>
      </footer>

      {/* Modal Tag Editor untuk Pengaturan PLC Tag Mapping */}
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

      {/* On-Screen Numeric Keypad Modal untuk input setpoint normal */}
      {activeKeypad && (
        <NumericKeypad
          value={activeKeypad.value}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ''}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleKeypadConfirm}
        />
      )}
    </div>
  );
}

export default DafOsrSettingsPage;
