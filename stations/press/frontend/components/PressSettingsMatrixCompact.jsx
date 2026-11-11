import { useState } from 'react'

function PressSettingsMatrixCompact({ pressSettings, onPressSettingsChange, onKeypadOpen }) {
  const [hoveredPress, setHoveredPress] = useState(null)
  const [hoveredParam, setHoveredParam] = useState(null)

  const handleInputClick = (pressNum, category, param, value, setIndex = null) => {
    if (category === 'lmh') {
      onKeypadOpen({ type: 'lmh', press: pressNum, set: setIndex, param })
    } else {
      onKeypadOpen({ type: category, press: pressNum, param })
    }
  }

  // L/M/H Settings - Grouped inline matrix for Zone A
  const renderLMHMatrix = () => {
    const sets = [0, 1, 2, 3]
    const params = ['l', 'm', 'h']

    return (
      <div className="som-matrix-compact-zone-a">
        <div className="som-matrix-compact-header-row">
          <div className="som-matrix-compact-header-cell"></div>
          {[1, 2, 3, 4].map((pressNum) => (
            <div
              key={pressNum}
              className={`som-matrix-compact-header-cell ${hoveredPress === pressNum ? 'som-matrix-compact-header-cell--hovered' : ''}`}
              onMouseEnter={() => setHoveredPress(pressNum)}
              onMouseLeave={() => setHoveredPress(null)}
            >
              P{pressNum}
            </div>
          ))}
        </div>
        {sets.map((setIndex) => (
          <div key={setIndex} className="som-matrix-compact-set-group">
            <div className="som-matrix-compact-set-label">SET {setIndex + 1}</div>
            <div className="som-matrix-compact-set-divider"></div>
            {params.map((param) => {
              const paramKey = `${setIndex}-${param}`
              return (
                <div
                  key={paramKey}
                  className={`som-matrix-compact-row ${hoveredParam === paramKey ? 'som-matrix-compact-row--hovered' : ''}`}
                  onMouseEnter={() => setHoveredParam(paramKey)}
                  onMouseLeave={() => setHoveredParam(null)}
                >
                  <div className="som-matrix-compact-label-cell">{param.toUpperCase()}</div>
                  {[1, 2, 3, 4].map((pressNum) => {
                    const value = pressSettings[pressNum]?.lmhSettings[setIndex]?.[param] || 0
                    return (
                      <div
                        key={pressNum}
                        className={`som-matrix-compact-cell ${hoveredPress === pressNum ? 'som-matrix-compact-cell--column-hovered' : ''}`}
                      >
                        <input
                          type="text"
                          readOnly
                          className="som-matrix-compact-input"
                          value={`${value.toFixed(1)} A`}
                          onClick={() => handleInputClick(pressNum, 'lmh', param, value, setIndex)}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  // Compact panel for Zone B
  const renderCompactPanel = (title, params, category) => {
    return (
      <div className="som-matrix-compact-panel">
        <div className="som-matrix-compact-panel-title">{title}</div>
        <div className="som-matrix-compact-panel-grid">
          <div className="som-matrix-compact-panel-header-row">
            <div className="som-matrix-compact-panel-header-cell">PARAM</div>
            {[1, 2, 3, 4].map((pressNum) => (
              <div
                key={pressNum}
                className={`som-matrix-compact-panel-header-cell ${hoveredPress === pressNum ? 'som-matrix-compact-panel-header-cell--hovered' : ''}`}
                onMouseEnter={() => setHoveredPress(pressNum)}
                onMouseLeave={() => setHoveredPress(null)}
              >
                P{pressNum}
              </div>
            ))}
          </div>
          {params.map((param) => {
            const paramKey = param.key
            return (
              <div
                key={paramKey}
                className={`som-matrix-compact-panel-row ${hoveredParam === paramKey ? 'som-matrix-compact-panel-row--hovered' : ''}`}
                onMouseEnter={() => setHoveredParam(paramKey)}
                onMouseLeave={() => setHoveredParam(null)}
              >
                <div className="som-matrix-compact-panel-label-cell">{param.label}</div>
                {[1, 2, 3, 4].map((pressNum) => {
                  let value = 0
                  if (category === 'llol') {
                    value = pressSettings[pressNum]?.llOlSettings?.[paramKey] || 0
                  } else if (category === 'hysteresis') {
                    value = pressSettings[pressNum]?.hysteresis?.[paramKey] || 0
                  } else if (category === 'pvShift') {
                    value = pressSettings[pressNum]?.pvShift?.[paramKey] || 0
                  } else if (category === 'range') {
                    value = pressSettings[pressNum]?.rangeSetting?.[paramKey] || 0
                  }
                  const decimals = param.unit === 'Sec' || paramKey === 'analog' ? 0 : 1
                  const unit = param.unit || ''

                  if (category === 'hysteresis' && paramKey === 'enabled') {
                    const enabled = pressSettings[pressNum]?.hysteresis?.enabled || false
                    return (
                      <div key={pressNum} className="som-matrix-compact-panel-cell">
                        <button
                          className={`som-matrix-compact-toggle ${enabled ? 'som-matrix-compact-toggle--on' : 'som-matrix-compact-toggle--off'}`}
                          onClick={() => onPressSettingsChange(pressNum, 'hysteresis', 'enabled', !enabled)}
                        >
                          {enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={pressNum}
                      className={`som-matrix-compact-panel-cell ${hoveredPress === pressNum ? 'som-matrix-compact-panel-cell--column-hovered' : ''}`}
                    >
                      <input
                        type="text"
                        readOnly
                        className="som-matrix-compact-panel-input"
                        value={unit ? `${value.toFixed(decimals)} ${unit}` : value.toFixed(decimals)}
                        onClick={() => handleInputClick(pressNum, category, paramKey, value)}
                      />
                      <div className="som-matrix-compact-panel-active-value">{value.toFixed(decimals)}</div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="som-press-settings-matrix-compact">
      {/* Zone A: L/M/H Matrix */}
      <div className="som-matrix-compact-zone-a-wrapper">
        {renderLMHMatrix()}
      </div>

      {/* Zone B: 4 Compact Panels */}
      <div className="som-matrix-compact-zone-b">
        {renderCompactPanel('LL & OL', [
          { key: 'll', label: 'LL', unit: 'A' },
          { key: 'llRetract', label: 'LL RET', unit: 'Sec' },
          { key: 'ol', label: 'OL', unit: 'A' },
          { key: 'olRetract', label: 'OL RET', unit: 'Sec' },
        ], 'llol')}

        {renderCompactPanel('HYSTERESIS', [
          { key: 'delay', label: 'DELAY', unit: 'Sec' },
          { key: 'retract', label: 'RETRACT', unit: 'Sec' },
          { key: 'idling', label: 'IDLING', unit: 'Sec' },
          { key: 'enabled', label: 'ENABLED', unit: '' },
        ], 'hysteresis')}

        {renderCompactPanel('PV SHIFT', [
          { key: 'fourmA', label: '4mA', unit: 'A' },
          { key: 'twentymA', label: '20mA', unit: 'A' },
          { key: 'shiftAmp', label: 'SHIFT', unit: 'A' },
        ], 'pvShift')}

        {renderCompactPanel('RANGE', [
          { key: 'analog', label: 'ANALOG', unit: '' },
          { key: 'seneca', label: 'SENECA', unit: 'A' },
        ], 'range')}
      </div>
    </div>
  )
}

export default PressSettingsMatrixCompact
