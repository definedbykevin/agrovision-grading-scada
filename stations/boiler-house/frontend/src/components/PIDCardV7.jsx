import React from 'react';

/**
 * REUSABLE V7 PID CARD (Industrial Digital Matrix)
 */
const PIDCardV7 = ({ title, data, mode, onToggle, onValueChange }) => {
  return (
    <div className="som-pid-card-v7">
      <div className="pid-card-title-v7">{title}</div>
      <div className="pid-v7-data-matrix">
        <div className="pid-v7-row">
          <div className="val-group">
            <span className="v7-label">PROCESS VALUE</span>
            <span className="v7-value">{data.pv.toFixed(1)}</span>
          </div>
          <span className="v7-tag">PV</span>
        </div>
        <div className={`pid-v7-row ${mode === 'MANUAL' ? 'locked' : ''}`}>
          <div className="val-group">
            <span className="v7-label">SET POINT</span>
            <span className="v7-value cyan">
               <input 
                 type="number" 
                 step="0.1" 
                 defaultValue={data.sp} 
                 readOnly={mode === 'MANUAL'} 
                 onChange={(e) => onValueChange('sp', e.target.value)} 
               />
            </span>
          </div>
          <span className="v7-tag">SP</span>
        </div>
        <div className={`pid-v7-row ${mode === 'AUTO' ? 'locked' : ''}`}>
          <div className="val-group">
            <span className="v7-label">OUTPUT LEVEL</span>
            <span className="v7-value orange">{data.mv}%</span>
          </div>
          <span className="v7-tag">MV</span>
        </div>
      </div>
      <div className="v7-manual-hud">
        <div className="v7-slider-header">
           <span className="v7-label">MANUAL SCALE</span>
           <span className="v7-value green" style={{ fontSize: '0.75rem' }}>{data.mv}%</span>
        </div>
        <input 
          type="range" 
          className={`h-range-v6 ${mode === 'AUTO' ? 'disabled' : ''}`} 
          disabled={mode === 'AUTO'} 
          value={data.mv} 
          onChange={(e) => onValueChange('mv', e.target.value)} 
        />
      </div>
      <button className={`v7-mode-toggle ${mode.toLowerCase()}`} onClick={onToggle}>
        MODE: {mode}
      </button>
    </div>
  );
};

export default PIDCardV7;
