import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './BoilerHouseSettingsPage.css';
import '../BoilerHousePage.css';

const defaultSettings = {
  pressure: { lower: 0, warning: 50, danger: 80, unit: 'BAR' },
  temperature: { lower: 0, warning: 50, danger: 80, unit: 'C' },
  ampereIdf: { lower: 0, warning: 50, danger: 80, unit: 'A' },
  waterFlow: { lower: 0, warning: 80, danger: 90, unit: '%' },
  draft: { lower: 0, warning: 20, danger: 40, unit: '%' }
};

const labels = {
  pressure: 'PRESSURE',
  temperature: 'TEMPERATURE',
  ampereIdf: 'AMPERE IDF',
  waterFlow: 'WATER FLOW',
  draft: 'DRAFT'
};

function BoilerHouseSettingsPage({ onSelectSubmenu }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from API
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/BOILER_HOUSE');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const newSettings = { ...defaultSettings };
          data.data.forEach(s => {
            if (newSettings[s.parameter_key]) {
              newSettings[s.parameter_key] = {
                lower: s.lower_val,
                warning: s.warning_val,
                danger: s.danger_val,
                unit: s.unit
              };
            }
          });
          setSettings(newSettings);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/BOILER_HOUSE', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (res.ok) alert('Settings saved successfully!');
      else alert('Failed to save settings.');
    } catch (err) {
      console.error('Save error:', err);
      alert('Error connecting to server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeypadConfirm = (val) => {
    if (!activeKeypad) return;
    const { param, level } = activeKeypad;
    setSettings(prev => ({
      ...prev,
      [param]: {
        ...prev[param],
        [level]: val
      }
    }));
    setActiveKeypad(null);
  };

  const ValBox = ({ value, unit, onClick }) => (
    <div className="som-val-box" onClick={onClick}>
      <span>{value}</span>
      <span className="som-val-unit">{unit}</span>
    </div>
  );

  return (
    <div className="som-boiler-house">
      <header className="som-boiler-station-header">
        <div className="som-header-left">
          <h2 className="som-boiler-station-title">Boiler House Station</h2>
          <div className="som-station-tabs">
            <button className="som-station-tab" onClick={() => onSelectSubmenu && onSelectSubmenu('Boiler House', 'Overview')}>Overview</button>
          </div>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
          <button className="som-view-btn" onClick={() => onSelectSubmenu && onSelectSubmenu('Boiler House', 'Process View')}>PROCESS VIEW</button>
          <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>
          </button>
          <button className="som-view-btn active" onClick={() => {}} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
        </div>
      </header>
      <main className="som-boiler-main">
        <div className="som-boiler-layout">
          <div className="som-bh-page">
            <div className="som-bh-slide">
              <div className="som-bh-card">
                <div className="som-bh-card-header">
                  <h3 className="som-bh-card-title">Boiler Warning & Trip Parameter</h3>
                </div>
                <div className="som-bh-card-body">
                  <div className="som-bh-grid">
                    {/* Header Row */}
                    <div className="som-bh-col-header"></div>
                    <div className="som-bh-col-header">PRESSURE</div>
                    <div className="som-bh-col-header">TEMPERATURE</div>
                    <div className="som-bh-col-header">AMPERE IDF</div>
                    <div className="som-bh-col-header">WATER FLOW</div>
                    <div className="som-bh-col-header">DRAFT</div>

                    {/* Lower Row */}
                    <div className="som-bh-row-header">LOWER</div>
                    {Object.keys(labels).map(key => (
                      <ValBox
                        key={`lower-${key}`}
                        value={settings[key].lower}
                        unit={settings[key].unit}
                        onClick={() => setActiveKeypad({ param: key, level: 'lower', label: `${labels[key]} - LOWER` })}
                      />
                    ))}

                    {/* Warning Row */}
                    <div className="som-bh-row-header">WARNING</div>
                    {Object.keys(labels).map(key => (
                      <ValBox
                        key={`warning-${key}`}
                        value={settings[key].warning}
                        unit={settings[key].unit}
                        onClick={() => setActiveKeypad({ param: key, level: 'warning', label: `${labels[key]} - WARNING` })}
                      />
                    ))}

                    {/* Danger Row */}
                    <div className="som-bh-row-header">DANGER</div>
                    {Object.keys(labels).map(key => (
                      <ValBox
                        key={`danger-${key}`}
                        value={settings[key].danger}
                        unit={settings[key].unit}
                        onClick={() => setActiveKeypad({ param: key, level: 'danger', label: `${labels[key]} - DANGER` })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <footer className="som-bh-footer">
              <button className="som-bh-save-btn" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'SAVING...' : 'APPLY CHANGES'}
              </button>
            </footer>

            {activeKeypad && (
              <NumericKeypad
                value={settings[activeKeypad.param][activeKeypad.level]}
                unit={settings[activeKeypad.param].unit}
                label={activeKeypad.label}
                onClose={() => setActiveKeypad(null)}
                onConfirm={handleKeypadConfirm}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ==========================================
// Shared Numeric Keypad Component
// ==========================================
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return '0';
  });

  const handleNumber = (n) => setDisplayValue(prev => (prev === '0' ? n.toString() : prev + n.toString()));
  const handleDecimal = () => { if (!displayValue.includes('.')) setDisplayValue(displayValue + '.'); };
  const handleBack = () => setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  const handleEnter = () => onConfirm(parseFloat(displayValue) || 0);

  const btnStyle = { padding: '14px', fontSize: '18px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }} onClick={onClose}>✕</button>
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
          <button onClick={handleBack} style={{ ...btnStyle, background: '#1e293b' }}>⌫</button>
          <button onClick={() => setDisplayValue('0')} style={{ gridColumn: 'span 1', padding: '12px', background: '#7f1d1d', border: '1px solid #dc2626', color: '#fca5a5', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
          <button onClick={handleEnter} style={{ gridColumn: 'span 2', padding: '12px', background: '#f59e0b', border: 'none', color: '#0f172a', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>ENTER</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BoilerHouseSettingsPage;
