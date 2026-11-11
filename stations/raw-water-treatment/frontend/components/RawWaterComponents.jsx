import React from 'react';

/**
 * Helper to format numeric values to max 2 decimal places
 */
const formatDisplayValue = (val) => {
  if (val === null || val === undefined || val === '--') return '--';
  // Don't try to render objects
  if (typeof val === 'object') return '--';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  // Rounds to max 2 decimal places, avoids trailing zeros if not needed
  return +(Math.round(num + "e+2") + "e-2");
};

/**
 * SHARED MACHINE PARAMETER CARD
 */
export function BoilerMachineCard({ title, params, style, hasLamp, lampStatus, isMaintenance, configMode, onTagEdit }) {
  return (
    <div 
      className={`som-boiler-mini-card ${isMaintenance ? 'maintenance-card' : ''} ${configMode ? 'config-active som-editable' : ''}`} 
      style={{ ...style, cursor: configMode ? 'pointer' : 'default' }}
      onClick={configMode ? (e) => onTagEdit(e, title) : undefined}
    >
      <div className="som-boiler-mini-header">
        <span className="som-boiler-mini-tag">{title}</span>
        <div className="som-boiler-status-indicator active"></div>
        {configMode && <div className="tag-config-badge">{String(params[0]?.tag || 'NO_TAG')}</div>}
      </div>
      <div className="som-boiler-mini-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {hasLamp && (
          <div
            className="som-boiler-lamp-led"
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: lampStatus === 'ON' ? '#39FF14' : '#ef4444',
              boxShadow: lampStatus === 'ON' ? '0 0 12px #39FF14' : '0 0 12px #ef4444',
              marginBottom: '10px'
            }}
          />
        )}
        {params.map((p, idx) => (
          <div key={idx} className="som-boiler-mini-param" style={{ width: '100%' }}>
            <span className="som-boiler-mini-label">{p.label}</span>
            <span className="som-boiler-mini-value" style={{ whiteSpace: 'pre-line' }}>{formatDisplayValue(p.value)}</span>
            {p.unit && <span className="som-boiler-mini-unit">{p.unit}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * SHARED LABEL CARD
 */
export function BoilerLabelCard({ title, isSmall, onClick, configMode, onTagEdit }) {
  const handleClick = (e) => {
    if (configMode) {
      onTagEdit(e, title);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={`som-boiler-mini-card ${isSmall ? 'small-label' : ''} ${onClick || configMode ? 'interactive-label' : ''} ${configMode ? 'config-active' : ''}`}
      style={{
        width: 'max-content',
        whiteSpace: 'nowrap'
      }}
      onClick={handleClick}
    >
      <div className="som-boiler-mini-header" style={{ borderBottom: 'none', justifyContent: 'center', position: 'relative' }}>
        <span className="som-boiler-mini-tag" style={{ textAlign: 'center' }}>{title}</span>
        {configMode && <div className="tag-config-badge mini">TAG</div>}
      </div>
    </div>
  )
}

/**
 * SHARED STATUS LAMPS
 */
export function BoilerStatusLamps({ currentStatus = 'NORMAL' }) {
  const lamps = [
    { label: 'LOW', color: '#f59e0b' },
    { label: 'NORMAL', color: '#39FF14' },
    { label: 'HIGH', color: '#f97316' },
    { label: 'HIGH-HIGH', color: '#ef4444' }
  ];

  return (
    <div className="som-boiler-status-lamps">
      {lamps.map((lamp, idx) => {
        const isActive = lamp.label === currentStatus;
        return (
          <div key={idx} className="status-lamp-item">
            <span className="lamp-label">{lamp.label}</span>
            <div
              className={`lamp-indicator ${isActive ? 'active' : ''}`}
              style={{
                backgroundColor: isActive ? lamp.color : '#334155',
                boxShadow: isActive ? `0 0 15px ${lamp.color}` : 'none',
                opacity: isActive ? 1 : 0.4
              }}
            ></div>
          </div>
        );
      })}
    </div>
  )
}
