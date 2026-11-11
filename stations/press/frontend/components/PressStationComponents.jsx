import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

/**
 * Custom hook for hover effects and sound (Standardized)
 */
export function useAmpHover() {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef(null)
  const [popupPos, setPopupPos] = useState(null)
  const hoverTimeoutRef = useRef(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setPopupPos({
        top: rect.top,
        right: rect.right,
        left: rect.left,
        bottom: rect.bottom,
      })
    }
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
      setPopupPos(null)
    }, 150)
  }

  const handlePopupMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsHovered(true)
  }

  const handlePopupMouseLeave = () => {
    setIsHovered(false)
    setPopupPos(null)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  return {
    cardRef,
    isHovered,
    popupPos,
    handleMouseEnter,
    handleMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  }
}

/**
 * Trend Popup component (Standardized with Dual Line support)
 */
export function StatusGraphPopup({ position, equipmentName, tagName, hzTag, hzValue, hideSpeed, type = 'Current', value = 0, unit = 'A', onMouseEnter, onMouseLeave }) {
  const popupRef = useRef(null)
  const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' })
  const [historyPoints, setHistoryPoints] = useState([])
  const [hzHistoryPoints, setHzHistoryPoints] = useState([])

  // Fetch history - Ampere
  useEffect(() => {
    if (!tagName) return
    const limitValue = 24
    const BASE_URL = import.meta.env.VITE_SOCKET_URL || '';
    const fetchUrl = BASE_URL ? `${BASE_URL}/api/plc/historical/tag/${tagName}?limit=${limitValue}&filter=daily` : `/api/plc/historical/tag/${tagName}?limit=${limitValue}&filter=daily`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) setHistoryPoints(json.data);
      })
      .catch(e => console.error("Error fetching amp historical points", e))
  }, [tagName])

  // Fetch history - Hz
  useEffect(() => {
    if (!hzTag) return
    const limitValue = 24
    const BASE_URL = import.meta.env.VITE_SOCKET_URL || '';
    const fetchUrl = BASE_URL ? `${BASE_URL}/api/plc/historical/tag/${hzTag}?limit=${limitValue}&filter=daily` : `/api/plc/historical/tag/${hzTag}?limit=${limitValue}&filter=daily`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) setHzHistoryPoints(json.data);
      })
      .catch(e => console.error("Error fetching hz historical points", e))
  }, [hzTag])

  // Only layout popup once based on position
  useEffect(() => {
    if (!position || !popupRef.current) return
    const viewportWidth = window.innerWidth
    const padding = 20
    const popupWidth = 450

    let left = position.right + 15
    let top = position.top - 10

    if (left + popupWidth > viewportWidth - padding) left = position.left - popupWidth - 15

    const popupHeight = 350
    const viewportHeight = window.innerHeight
    if (top + popupHeight > viewportHeight - padding) top = viewportHeight - popupHeight - padding
    if (top < padding) top = padding
    if (left < padding) left = padding

    setStyle({ top: `${top}px`, left: `${left}px`, opacity: 1, pointerEvents: 'auto' })
  }, [position])

  const width = 400
  const height = 200
  const plotLeft = 40
  const plotRight = 360
  const plotTop = 20
  const plotBottom = 160

  const { ampPoints, hzPoints, fullData, dynamicMax } = useMemo(() => {
    const now = new Date();
    const opStart = new Date(now);
    if (now.getHours() < 7) opStart.setDate(now.getDate() - 1);
    opStart.setHours(7, 0, 0, 0);

    const buckets = Array.from({ length: 24 }).map((_, i) => {
      const d = new Date(opStart);
      d.setHours(opStart.getHours() + i);
      return { hr: d.getHours(), dt: d.getDate(), ampVal: 0, hzVal: 0, hasData: false };
    });

    historyPoints.forEach(h => {
      const hDate = new Date(h.timestamp.replace(' ', 'T'));
      if (isNaN(hDate.getTime())) return;
      const bIdx = buckets.findIndex(b => b.hr === hDate.getHours() && b.dt === hDate.getDate());
      if (bIdx !== -1) {
        buckets[bIdx].ampVal = parseFloat(h.value);
        buckets[bIdx].hasData = true;
      }
    });

    hzHistoryPoints.forEach(h => {
      const hDate = new Date(h.timestamp.replace(' ', 'T'));
      if (isNaN(hDate.getTime())) return;
      const bIdx = buckets.findIndex(b => b.hr === hDate.getHours() && b.dt === hDate.getDate());
      if (bIdx !== -1) {
        buckets[bIdx].hzVal = parseFloat(h.value);
        buckets[bIdx].hasData = true;
      }
    });

    let maxVal = 0;
    buckets.forEach(b => {
      if (b.ampVal > maxVal) maxVal = b.ampVal;
      if (b.hzVal > maxVal) maxVal = b.hzVal;
    });

    if (maxVal < 10) maxVal = 50;
    const targetMax = maxVal * 1.15;
    let snapStep = 10;
    if (targetMax > 100) snapStep = 20;
    if (targetMax > 200) snapStep = 50;
    if (targetMax > 500) snapStep = 100;
    let calcMax = Math.ceil(targetMax / snapStep) * snapStep;

    const fData = buckets.map((b, i) => {
      return {
        x: plotLeft + ((plotRight - plotLeft) * i) / 23,
        hour: b.hr,
        amp: b.ampVal,
        hz: b.hzVal
      };
    });

    return { fullData: fData, dynamicMax: calcMax };
  }, [historyPoints, hzHistoryPoints])

  const ampPolyRows = fullData.map(d => `${d.x},${plotBottom - (d.amp / dynamicMax) * (plotBottom - plotTop)}`).join(' ')
  const hzPolyRows = fullData.map(d => `${d.x},${plotBottom - (d.hz / dynamicMax) * (plotBottom - plotTop)}`).join(' ')

  return createPortal(
    <div ref={popupRef} className="som-amp-popup" style={{ ...style, pointerEvents: 'auto' }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="som-amp-popup-header">
        <div className="som-amp-popup-title">Performance Trend (24H Shift)</div>
        <div className="som-amp-popup-subtitle">
          <span>{equipmentName}</span>
          <span>Load: {value.toFixed(1)}A</span>
          {!hideSpeed && <span>Speed: {hzValue.toFixed(1)}Hz</span>}
        </div>
      </div>
      <div className="som-amp-popup-body">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="som-amp-graph-svg">
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(0,0,0,0.02)" />

          {/* Y Axis Grid */}
          {[0, 0.5, 1].map(ratio => {
            const y = plotBottom - ratio * (plotBottom - plotTop);
            const val = (ratio * dynamicMax).toFixed(0);
            return (
              <g key={`y-${ratio}`}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="rgba(0,0,0,0.1)" strokeDasharray="4 4" />
                <text x={plotLeft - 8} y={y + 3} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="end">{val}</text>
              </g>
            )
          })}

          <polyline points={ampPolyRows} fill="none" stroke="#3b82f6" strokeWidth="2" />
          <polyline points={hzPolyRows} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
        </svg>
      </div>
    </div>,
    document.body
  )
}

/**
 * Motor Monitor Card
 */
export const PressMotorCardSVG = ({ x, y, id, label, frequency = 0, ampere = 0, ampTag, hzTag, spTag, setpoint = 0, unit = "A", onClick, size = 140, hideSpeed = false }) => {
  const isRunning = ampere > 0 || frequency > 0;
  const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover();

  return (
    <g id={id} className={`svg-equipment motor-group ${isRunning ? 'motor-on' : 'motor-off'}`} onClick={() => onClick && onClick(id)}>
      <foreignObject x={x - 150} y={y - 75} width="300" height="160" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div ref={cardRef} className="som-motor-mini-card" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div className={`som-status-indicator ${isRunning ? 'running' : 'stop'}`}></div>
            </div>
            <div className="som-motor-mini-body">
              {!hideSpeed && (
                <div className="som-motor-param-row">
                  <span className="som-motor-param-label">Speed</span>
                  <span className="som-motor-mini-value" data-unit="Hz">{Number(frequency || 0).toFixed(1)}</span>
                </div>
              )}
              <div className="som-motor-param-row">
                <span className="som-motor-param-label">Load</span>
                <span className="som-motor-mini-value" data-unit={unit}>{Number(ampere || 0).toFixed(1)}</span>
              </div>

              <div className="som-press-control-area">
                <div className="som-press-sp-row">
                  <span className="som-press-sp-label">Set</span>
                  <span className="som-press-sp-value">{Number(setpoint || 0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
      {isHovered && popupPos && (
        <StatusGraphPopup
          position={popupPos}
          equipmentName={label}
          tagName={ampTag}
          hzTag={hzTag}
          hzValue={frequency}
          hideSpeed={hideSpeed}
          type="Station"
          value={ampere}
          unit="A"
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}
    </g>
  );
};

/**
 * Equipment Icon
 */
export const EquipmentIconSVG = ({ x, y, icon, isRunning, size = 60, rotation = 0, scaleX = 1 }) => {
  return (
    <image
      href={icon}
      x={x - (size / 2)}
      y={y - (size / 2)}
      width={size}
      height={size}
      style={{
        transform: `rotate(${rotation}deg) scaleX(${scaleX})`,
        transformOrigin: `${x}px ${y}px`,
        pointerEvents: 'none',
        filter: isRunning
          ? 'drop-shadow(0 0 12px rgba(31, 233, 33, 1))'
          : 'drop-shadow(1px 1px 0 #ff0000) drop-shadow(-1px -1px 0 #ff0000) drop-shadow(1px -1px 0 #ff0000) drop-shadow(-1px 1px 0 #ff0000) saturate(2.5) hue-rotate(330deg) brightness(0.7) contrast(1.2) drop-shadow(0 0 12px rgba(255, 0, 0, 1))'
      }}
    />
  )
}

/**
 * AGROVISION Liquid Flow Effect
 * Supports 'liquid' (smooth) and 'dotted' (directional indicators) modes.
 */
export const LiquidFlowSVG = ({ d, points, isRunning, mode = 'liquid', flowing = true, color = "#ff0000", thickness = 15 }) => {
  if (!isRunning) return null
  const pathD = d || (points ? `M ${points}` : '');

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* 1. Outer Glow / Tube Reflection (Softest) */}
      <path
        d={pathD}
        className="water-path-base"
        style={{
          stroke: color,
          strokeWidth: thickness ? `${thickness + 12}px` : undefined,
          filter: thickness ? 'blur(6px)' : undefined,
          opacity: 0.4
        }}
        fill="none"
        strokeLinecap="round"
      />

      {/* 2. Inner Rim Shadow (Medium Soft) */}
      <path
        d={pathD}
        className="water-path-base"
        style={{
          stroke: color,
          strokeWidth: thickness ? `${thickness + 2}px` : undefined,
          filter: thickness ? 'blur(3px)' : undefined,
          opacity: 0.6
        }}
        fill="none"
        strokeLinecap="round"
      />

      {/* 3. Middle animated core (Smooth flow) */}
      <path
        d={pathD}
        className="water-path-stream"
        style={{
          stroke: color,
          strokeWidth: thickness ? `${thickness - 2}px` : undefined,
          filter: thickness ? 'blur(1.5px) drop-shadow(0px 0px 5px rgba(0,0,0,0.7))' : undefined,
          opacity: 0.95
        }}
        fill="none"
        strokeLinecap="round"
      />

      {/* 4. Surface sparkle / highlights */}
      <path
        d={pathD}
        className={mode === 'dotted' ? 'water-path-dotted' : 'water-path-highlight'}
        fill="none"
        strokeLinecap="round"
        style={{
          animationPlayState: flowing ? 'running' : 'paused',
          strokeWidth: thickness ? `${Math.max(2.5, thickness / 6)}px` : undefined
        }}
      />
    </g>
  )
}

/**
 * Station Label
 */
export const StationLabelSVG = ({ x, y, label }) => (
  <text x={x} y={y} className="som-line-badge-svg" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none', fill: 'rgba(0,0,0,0.7)', fontWeight: '900', fontSize: '24px', textTransform: 'uppercase' }}>
    {label}
  </text>
)

/**
 * Modern AgroVision Component Card
 */
export const IpomasMonitorCardSVG = ({ x, y, id, title, isManual = false, params = [], singleValue = null, singleUnit = '', onClick, width = 140, scale = 1 }) => {
  let height = 34
  if (isManual) height += 30
  if (params.length > 0) height += (params.length * 22) + 14
  if (singleValue !== null) height += 50

  const bg = '#ffffff'
  const border = '#e2e8f0'
  const headerBg = '#ffdb3b'
  const headerText = '#0f172a'
  const textCol = '#0f172a'
  const labelCol = '#64748b'
  const valCol = '#0f172a'

  return (
    <g id={id} transform={`translate(${x}, ${y}) scale(${scale}) translate(${-width / 2}, ${-height / 2})`} onClick={() => onClick && onClick(id)} style={{ cursor: 'pointer' }}>
      <foreignObject width={width} height={height} style={{ overflow: 'visible' }}>
        <div style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(10px)',
          fontFamily: "'Inter', sans-serif",
          transition: 'all 0.2s ease-in-out'
        }} className="agrovision-monitor-card">
          <div style={{
            background: headerBg,
            padding: '4px 8px',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: '900',
            color: headerText,
            borderBottom: `2px solid ${border}`,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {title}
          </div>

          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {isManual && (
              <div style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '9px',
                fontWeight: '900',
                color: '#64748b',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                MANUAL
              </div>
            )}

            {params.length > 0 && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {params.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i === params.length - 1 ? 'none' : '1px solid #f1f5f9', paddingBottom: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: labelCol, textTransform: 'uppercase' }}>{p.label}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '950', color: valCol }}>{p.value}</span>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: labelCol }}>{p.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {singleValue !== null && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                <span style={{ fontSize: '20px', fontWeight: '950', color: valCol }}>{singleValue}</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: labelCol }}>{singleUnit}</span>
              </div>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
