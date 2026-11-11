import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import threshingStationImageUrl from '../../assets/threshing-station.webp'
import motorSvg from '../../assets/item/motor.svg'
import backMotorSvg from '../../assets/item/back_motor.svg'

/**
 * Custom hook for hover effects and sound (Standardized)
 */
function useAmpHover() {
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
 * Trend Popup component (Standardized)
 */
function StatusGraphPopup({ position, equipmentName, tagName, hzTag, hzValue, type = 'Current', value = 0, unit = 'A', onMouseEnter, onMouseLeave }) {
  const popupRef = useRef(null)
  const [style, setStyle] = useState({ opacity: 0, pointerEvents: 'none' })
  const [historyPoints, setHistoryPoints] = useState([])
  const [hzHistoryPoints, setHzHistoryPoints] = useState([])
  const [hoverData, setHoverData] = useState(null)

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
    if (now.getHours() < 7) {
      opStart.setDate(now.getDate() - 1);
    }
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

    const aPts = buckets.map((b, i) => {
      const x = plotLeft + ((plotRight - plotLeft) * i) / 23;
      const t = Math.max(0, b.ampVal) / calcMax;
      const y = plotBottom - t * (plotBottom - plotTop);
      return { x, y };
    });

    const hPts = buckets.map((b, i) => {
      const x = plotLeft + ((plotRight - plotLeft) * i) / 23;
      const t = Math.max(0, b.hzVal) / calcMax;
      const y = plotBottom - t * (plotBottom - plotTop);
      return { x, y };
    });

    const fData = buckets.map((b, i) => {
      return {
        x: plotLeft + ((plotRight - plotLeft) * i) / 23,
        hour: b.hr,
        date: b.dt,
        amp: b.ampVal,
        hz: b.hzVal,
        hasData: b.hasData
      };
    });

    return { ampPoints: aPts, hzPoints: hPts, fullData: fData, dynamicMax: calcMax };
  }, [historyPoints, hzHistoryPoints])

  const ampPath = useMemo(() => {
    if (!fullData || fullData.length === 0) return '';
    let path = `M ${fullData[0].x},${plotBottom - (Math.max(0, fullData[0].amp) / dynamicMax) * (plotBottom - plotTop)}`;
    for (let i = 1; i < fullData.length; i++) {
      path += ` L ${fullData[i].x},${plotBottom - (Math.max(0, fullData[i].amp) / dynamicMax) * (plotBottom - plotTop)}`;
    }
    return path;
  }, [fullData, dynamicMax]);

  const hzPath = useMemo(() => {
    if (!fullData || fullData.length === 0) return '';
    let path = `M ${fullData[0].x},${plotBottom - (Math.max(0, fullData[0].hz) / dynamicMax) * (plotBottom - plotTop)}`;
    for (let i = 1; i < fullData.length; i++) {
      path += ` L ${fullData[i].x},${plotBottom - (Math.max(0, fullData[i].hz) / dynamicMax) * (plotBottom - plotTop)}`;
    }
    return path;
  }, [fullData, dynamicMax]);

  const areaPath = useMemo(() => {
    if (!fullData || fullData.length === 0) return '';
    return `${ampPath} L ${plotRight},${plotBottom} L ${plotLeft},${plotBottom} Z`;
  }, [ampPath]);

  const handleGraphMouseMove = (e) => {
    if (!fullData || fullData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const xPos = ratio * width;

    let closest = fullData[0];
    let minDiff = Math.abs(xPos - fullData[0].x);
    for (let i = 1; i < fullData.length; i++) {
      const diff = Math.abs(xPos - fullData[i].x);
      if (diff < minDiff) {
        minDiff = diff;
        closest = fullData[i];
      }
    }

    if (xPos >= plotLeft - 10 && xPos <= plotRight + 10) {
      setHoverData(closest);
    } else {
      setHoverData(null);
    }
  };

  const handleGraphMouseLeave = () => {
    setHoverData(null);
  };

  return createPortal(
    <div ref={popupRef} className="som-amp-popup" style={{ ...style, pointerEvents: 'auto' }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="som-amp-popup-header">
        <div className="som-amp-popup-title">{type} Trend (24H Shift)</div>
        <div className="som-amp-popup-subtitle">
          <span>{equipmentName}</span>
          <span style={{ color: '#d4ac0d' }}><b>Amp [A]:</b> {value ? value.toFixed(1) : '0.0'}</span>
          <span style={{ color: '#475569' }}><b>Hz:</b> {hzValue ? hzValue.toFixed(1) : '0.0'}</span>
        </div>
      </div>
      <div className="som-amp-popup-body" style={{ pointerEvents: 'auto' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="som-amp-graph-svg" onMouseMove={handleGraphMouseMove} onMouseLeave={handleGraphMouseLeave}>
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffdb3b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffdb3b" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(248, 250, 252, 0.5)" rx="4" />

          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = plotBottom - ratio * (plotBottom - plotTop);
            const val = (ratio * dynamicMax).toPrecision(3).replace(/\.0+$/, '');
            return (
              <g key={`y-${ratio}`}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="#e2e8f0" strokeDasharray={ratio === 0 ? "0" : "4 4"} />
                <text x={plotLeft - 8} y={y + 3} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="Inter, sans-serif">{parseInt(val)}</text>
              </g>
            )
          })}

          {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hrIndex) => {
            const x = plotLeft + ((plotRight - plotLeft) * hrIndex) / 23;
            const hrCalc = (7 + hrIndex) % 24;
            const label = String(hrCalc).padStart(2, '0') + ":00";

            return (
              <g key={`x-${hrIndex}`}>
                <line x1={x} y1={plotTop} x2={x} y2={plotBottom} stroke="rgba(0,0,0,0.04)" />
                <line x1={x} y1={plotBottom} x2={x} y2={plotBottom + 5} stroke="rgba(0,0,0,0.2)" />
                <text x={x} y={plotBottom + 16} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">{label}</text>
              </g>
            )
          })}

          <path d={areaPath} style={{ fill: 'url(#trendGradient)' }} className="som-amp-graph-area" />

          <g>
            {fullData.map((d, i) => {
              if (i === 0) return null;
              const prev = fullData[i - 1];
              const isMissingData = !d.hasData && !prev.hasData;

              const yAmp1 = plotBottom - (Math.max(0, prev.amp) / dynamicMax) * (plotBottom - plotTop);
              const yAmp2 = plotBottom - (Math.max(0, d.amp) / dynamicMax) * (plotBottom - plotTop);

              const yHz1 = plotBottom - (Math.max(0, prev.hz) / dynamicMax) * (plotBottom - plotTop);
              const yHz2 = plotBottom - (Math.max(0, d.hz) / dynamicMax) * (plotBottom - plotTop);

              return (
                <g key={`seg-${i}`}>
                  <line
                    x1={prev.x} y1={yAmp1} x2={d.x} y2={yAmp2}
                    stroke="#d4ac0d"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={isMissingData ? "4 4" : "0"}
                    opacity={isMissingData ? 0.3 : 1}
                    style={{ filter: isMissingData ? 'none' : 'drop-shadow(0px 1px 2px rgba(212,172,13,0.3))' }}
                  />

                  <line
                    x1={prev.x} y1={yHz1} x2={d.x} y2={yHz2}
                    stroke="#475569"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={isMissingData ? "2 6" : "4 2"}
                    opacity={isMissingData ? 0.3 : 1}
                    style={{ filter: isMissingData ? 'none' : 'drop-shadow(0px 1px 2px rgba(71,85,105,0.3))' }}
                  />
                </g>
              );
            })}
          </g>

          <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="transparent" pointerEvents="all" />

          {hoverData && (
            <g>
              <line x1={hoverData.x} y1={plotTop} x2={hoverData.x} y2={plotBottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={hoverData.x} cy={plotBottom - (Math.max(0, hoverData.amp) / dynamicMax) * (plotBottom - plotTop)} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" style={{ filter: 'drop-shadow(0px 1px 2px rgba(59,130,246,0.5))' }} />
              <circle cx={hoverData.x} cy={plotBottom - (Math.max(0, hoverData.hz) / dynamicMax) * (plotBottom - plotTop)} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" style={{ filter: 'drop-shadow(0px 1px 2px rgba(239,68,68,0.5))' }} />

              <g transform={`translate(${hoverData.x > (plotLeft + plotRight) / 2 ? hoverData.x - 90 : hoverData.x + 10}, ${plotTop + 10})`}>
                <rect width="80" height="45" rx="4" fill="rgba(255, 255, 255, 0.95)" stroke="#cbd5e1" strokeWidth="1" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }} />
                <text x="40" y="14" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">
                  {String(hoverData.hour).padStart(2, '0')}:00
                </text>
                <text x="8" y="28" fill="#3b82f6" fontSize="9" fontWeight="bold" fontFamily="Inter, sans-serif">
                  Amp: {hoverData.amp.toFixed(1)}
                </text>
                <text x="8" y="40" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="Inter, sans-serif">
                  Hz: {hoverData.hz.toFixed(1)}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>,
    document.body
  )
}

/**
 * Reusable Motor SVG Component (Card + Icon)
 */
const MotorCardSVG = ({ x, y, id, label, frequency = 0, ampere = 0, pct = 0, ampTag, hzTag, onClick, showHz = true, showPct = false, configMode = false, tagMap = {} }) => {
  const hasMapping = tagMap && Object.keys(tagMap).some(key => key.startsWith(`${id}__`));

  const isNoTagAmp = String(ampere).toLowerCase() === 'no tag' || ampere === null || ampere === undefined;
  const isNoTagHz = String(frequency).toLowerCase() === 'no tag' || frequency === null || frequency === undefined;

  const isRunning = hasMapping && (
    (!isNoTagAmp && parseFloat(ampere) > 1) ||
    (!isNoTagHz && parseFloat(frequency) > 1)
  );
  const computedHzTag = hzTag || (ampTag ? ampTag.replace('_AMP', '_HZ') : null);
  const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover()

  const getDeveloperStyle = (eqId) => {
    if (!configMode) return {};
    const hasTag = tagMap && Object.keys(tagMap).some((key) => key.startsWith(`${eqId}__`));
    return {
      outline: hasTag ? "2px solid #3b82f6" : "2px dashed #ef4444",
      boxShadow: hasTag ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasTag ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
    };
  };

  return (
    <g id={id} className={`svg-equipment motor-group ${isRunning ? 'motor-on' : 'motor-off'}`} onClick={() => onClick(id)} style={{ cursor: configMode ? 'pointer' : 'default' }}>
      <foreignObject x={x - 150} y={y - 60} width="300" height="150" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div ref={cardRef} className="som-motor-mini-card" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={getDeveloperStyle(id, 'STATUS')}>
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div
                className={`som-status-indicator ${isRunning ? 'running' : 'stop'}`}
                style={!hasMapping ? { background: '#94a3b8', boxShadow: 'none', animation: 'none' } : {}}
              ></div>
            </div>
            <div className="som-motor-mini-body">
              {!hasMapping ? (
                <div className="som-motor-param-row" style={{ justifyContent: 'center', padding: '6px 0' }}>
                  <span className="som-motor-mini-value" style={{ fontStyle: 'italic' }}>no tag</span>
                </div>
              ) : (
                <>
                  {showHz && (
                    <div className="som-motor-param-row">
                      <span className="som-motor-param-label">Speed</span>
                      <span className="som-motor-mini-value" data-unit="Hz">
                        {frequency === null || frequency === undefined ? "--" : Number(frequency).toFixed(1)}
                      </span>
                    </div>
                  )}
                  <div className="som-motor-param-row">
                    <span className="som-motor-param-label">Load</span>
                    <span className="som-motor-mini-value" data-unit="A">
                      {ampere === null || ampere === undefined ? "--" : Number(ampere).toFixed(1)}
                    </span>
                  </div>
                  {showPct && (
                    <div className="som-motor-param-row">
                      <span className="som-motor-param-label">Load</span>
                      <span className="som-motor-mini-value" data-unit="%">
                        {pct === null || pct === undefined ? "--" : Number(pct).toFixed(1)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </foreignObject>
      {hasMapping && isHovered && popupPos && (
        <StatusGraphPopup
          position={popupPos}
          equipmentName={label}
          tagName={ampTag}
          hzTag={computedHzTag}
          type="Current"
          value={ampere}
          hzValue={frequency}
          unit="A"
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}
    </g>
  )
}

const MotorIconSVG = ({ x, y, ampere, frequency, variant = 'front', size = 80, scaleX = 1, rotate = 0 }) => {
  const isRunning = parseFloat(ampere) > 1 || parseFloat(frequency) > 1;
  const src = variant === 'back' ? backMotorSvg : motorSvg

  return (
    <image
      href={src}
      x={x - (size / 2)}
      y={y - (size / 2)}
      width={size}
      height={size}
      style={{
        transform: `scaleX(${scaleX}) rotate(${rotate}deg)`,
        transformOrigin: `${x}px ${y}px`,
        pointerEvents: 'none',
        filter: isRunning ? 'url(#tint-green)' : 'url(#tint-red)'
      }}
    />
  )
}

const StationLabelSVG = ({ x, y, label }) => (
  <text x={x} y={y} className="som-line-badge-svg" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none', fill: '#0f172a', fontWeight: '900', fontSize: '24px', textTransform: 'uppercase', opacity: 0.15 }}>
    {label}
  </text>
)

/**
 * Local Maintenance Card Component
 */
const MaintenanceCardSVG = ({ x, y, label, params = [], id, onClick, configMode = false, tagMap = {} }) => {
  const getDeveloperStyle = (eqId) => {
    if (!configMode) return {};
    const hasTag = tagMap && Object.keys(tagMap).some((key) => key.startsWith(`${eqId}__`));
    return {
      outline: hasTag ? "2px solid #3b82f6" : "2px dashed #ef4444",
      boxShadow: hasTag ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasTag ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
    };
  };

  return (
    <g
      id={id}
      className="svg-equipment motor-group maintenance-card-group"
      transform={`translate(${x - 150}, ${y - 65})`}
      onClick={() => onClick(id)}
      style={{ cursor: configMode ? 'pointer' : 'default' }}
    >
      <foreignObject width="300" height="130" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div className="som-motor-mini-card maintenance-card" style={getDeveloperStyle(id, 'STATUS')}>
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div className="som-motor-mini-status active" style={{ background: '#0f172a', color: '#ffdb3b' }}>MNT</div>
            </div>
            <div className="som-motor-mini-body">
              {params.map((p, idx) => (
                <div key={idx} className="som-motor-param-row">
                  <span className="som-motor-param-label">{p.label}</span>
                  <span className="som-motor-mini-value" data-unit={p.unit}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  )
}

const StatsBoxSVG = ({ x, y, id, title, stats = [], color = '#ffdb3b', onClick, configMode = false, tagMap = {} }) => {
  const width = 480;
  const rowHeight = 32;
  const height = 45 + (stats.length * rowHeight) + 15;

  let hasTag = false;
  if (configMode && id) {
    hasTag = tagMap && Object.keys(tagMap).some(key => key.startsWith(`${id}__`));
  }

  const getDeveloperStyle = () => {
    if (!configMode) return {};
    return {
      outline: hasTag ? "2px solid #3b82f6" : "2px dashed #ef4444",
      boxShadow: hasTag ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasTag ? "transparent" : "rgba(239, 68, 68, 0.15)",
    };
  };

  return (
    <g transform={`translate(${x}, ${y})`} id={id} onClick={() => onClick && onClick(id)} style={{ cursor: (configMode && onClick) ? 'pointer' : 'default' }}>
      <foreignObject width={width} height={height} style={{ overflow: 'visible' }}>
        <div className="som-motor-mini-card" style={{ width: width, ...getDeveloperStyle() }}>
          <div className="som-motor-mini-header" style={{ background: color }}>
            <span className="som-stats-mini-label" style={{ color: '#0f172a', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{title}</span>
            <div
              className="som-status-indicator stop"
              style={!hasTag && configMode ? { background: '#94a3b8', boxShadow: 'none' } : {}}
            ></div>
          </div>
          <div className="som-motor-mini-body" style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.map((stat, idx) => {
              let displayValue;
              if (configMode && !hasTag) {
                displayValue = <span style={{ fontStyle: 'italic', fontSize: '13px', color: '#64748b', textTransform: 'lowercase', paddingRight: '12px' }}>no tag</span>;
              } else if (stat.value === null || stat.value === undefined || stat.value === "" || stat.value === "--") {
                displayValue = (
                  <span style={{ paddingRight: '12px' }}>
                    <span style={{ fontWeight: '900', color: '#0f172a', marginRight: '6px' }}>--</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{stat.unit}</span>
                  </span>
                );
              } else {
                displayValue = (
                  <span style={{ paddingRight: '12px' }}>
                    <span style={{ fontWeight: '900', color: '#0f172a', marginRight: '6px' }}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString(undefined, { minimumFractionDigits: stat.decimals ?? 0, maximumFractionDigits: stat.decimals ?? 0 }) : stat.value}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{stat.unit}</span>
                  </span>
                );
              }

              return (
                <div key={idx} className="som-motor-param-row" style={{ padding: '0 8px', paddingBottom: idx < stats.length - 1 ? '6px' : '0', borderBottom: idx < stats.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <span className="som-stats-param-label" style={{ fontSize: '12px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
                  <span className="som-stats-param-value" style={{ fontSize: '16px', fontFamily: "'JetBrains Mono', monospace", fontWeight: '900', color: '#0f172a' }}>
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}

export default function OverviewTab({
  viewMode,
  configMode,
  tagMap,
  handleEquipmentClick,
  lv,
  motorData,
  stationStats,
  svgRef,
  handleMouseMove
}) {
  return (
    <div className="som-thresher-flow-card">
      <div className="som-threshing-flow-body">
        <svg
          ref={svgRef}
          viewBox="-383 -75 2670 1200"
          className="station-svg-canvas"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
        >
          <defs>
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <pattern id="diagGrid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255, 219, 59, 0.2)" strokeWidth="1" />
              <circle cx="0" cy="0" r="1.5" fill="rgba(255, 219, 59, 0.4)" />
            </pattern>
            <filter id="tint-red">
              <feColorMatrix type="matrix"
                values="0.244 0.822 0.083 0 0
                        0     0     0     0 0
                        0     0     0     0 0
                        0 0 0 1 0"/>
            </filter>
            <filter id="tint-green">
              <feColorMatrix type="matrix"
                values="0.0638 0.2146 0.0216 0 0
                        0.2551 0.8582 0.0867 0 0
                        0.0425 0.1430 0.0144 0 0
                        0 0 0 1 0"/>
            </filter>
          </defs>

          <image href={threshingStationImageUrl} width="2670" x="-383" y="-50" className="som-station-bg-image" />

          {viewMode === 'maintenance' && (
            <>
              <rect width="2670" height="1200" x="-383" y="-75" fill="url(#diagGrid)" className="som-diag-grid" />
              <foreignObject x="-383" y="-75" width="2670" height="1200" style={{ pointerEvents: 'none' }}>
                <div className="som-diag-scanline"></div>
              </foreignObject>
            </>
          )}

          <StatsBoxSVG x={400} y={-55} id="ts_stats_1" title="STATION SCORE" color="#39FF14" stats={[
            { label: "Threshing Station Score", value: stationStats.score, unit: "%" },
            { label: "Threshing Station Throughput", value: stationStats.throughput, unit: "mt/hr", decimals: 2 }
          ]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

          <StatsBoxSVG x={785} y={-55} id="ts_stats_2" title="QUALITY COUNTS" color="#FFB300" stats={[
            { label: "EFB Count", value: stationStats.efbCount, unit: "%", decimals: 1 },
            { label: "USB Count", value: stationStats.usbCount, unit: "%", decimals: 1 },
            { label: "PSB Count", value: stationStats.psbCount, unit: "%", decimals: 1 },
            { label: "Total USB Rejected", value: stationStats.totalUsbRejected, unit: "" },
            { label: "Total PSB Rejected", value: stationStats.totalPsbRejected, unit: "" }
          ]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

          <StatsBoxSVG x={1050} y={-55} id="ts_stats_3" title="EFFICIENCY" color="#00E5FF" stats={[
            { label: "MPD Sterilization Efficiency", value: stationStats.sterilEfficiency, unit: "%" },
            { label: "Threshing Efficiency", value: stationStats.threshEfficiency, unit: "%" }
          ]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />



          {viewMode === 'maintenance' && (
            <foreignObject x="350" y="20" width="1200" height="120" style={{ overflow: 'visible' }}>
              <div className="som-diagnostic-banner">TECHNICAL DIAGNOSTIC ACTIVE</div>
            </foreignObject>
          )}

          <MotorIconSVG x={235} y={100} ampere={motorData.tippler.amp} frequency={motorData.tippler.freq} scaleX={-1} size={90} />
          <MotorIconSVG x={80} y={400} ampere={motorData.sfbAutofeeder.amp} frequency={motorData.sfbAutofeeder.freq} size={45} scaleX={-1} />
          <MotorIconSVG x={-115} y={510} ampere={motorData.sfbConveyor.amp} frequency={motorData.sfbConveyor.freq} size={80} variant="back" />

          <MotorIconSVG x={868} y={835} ampere={motorData.underThresherConv1.amp} size={55} rotate={-90} />
          <MotorIconSVG x={1340} y={835} ampere={motorData.underThresherConv2.amp} size={55} rotate={-90} />

          <MotorIconSVG x={435} y={318} ampere={motorData.bottomCrossConv.amp} frequency={motorData.bottomCrossConv.freq} size={125} />
          <MotorIconSVG x={1470} y={402} ampere={motorData.fruitElevator1.amp} size={80} variant="back" />
          <MotorIconSVG x={1520} y={402} ampere={motorData.fruitElevator2.amp} size={80} variant="back" />

          <MotorIconSVG x={445} y={890} ampere={motorData.efbHorizontalConv.amp} size={125} />
          <MotorIconSVG x={1293} y={310} ampere={motorData.bunchCrusher.amp} size={70} scaleX={-1} />
          <MotorIconSVG x={970} y={970} ampere={motorData.usbElevator.amp} size={100} variant="back" />
          <MotorIconSVG x={1235} y={985} ampere={motorData.efbInclinedConv.amp} size={80} variant="back" />

          {viewMode === 'process' ? (
            <g>
              <MotorCardSVG x={280} y={35} id="tippler" label="Tippler" frequency={motorData.tippler.freq} ampere={motorData.tippler.amp} ampTag={motorData.tippler.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MotorCardSVG x={-240} y={400} id="sfb-autofeeder" label="Autofeeder" frequency={motorData.sfbAutofeeder.freq} ampere={motorData.sfbAutofeeder.amp} ampTag={motorData.sfbAutofeeder.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MotorCardSVG x={-110} y={640} id="sfb-conveyor" label="SFB Conveyor" frequency={motorData.sfbConveyor.freq} ampere={motorData.sfbConveyor.amp} ampTag={motorData.sfbConveyor.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MotorCardSVG x={700} y={630} id="thresher1" label="Thresher no.1" ampere={motorData.thresher1.amp} pct={motorData.thresher1.pct} showPct={true} showHz={false} ampTag={motorData.thresher1.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MotorCardSVG x={1190} y={630} id="thresher2" label="Thresher no.2" ampere={motorData.thresher2.amp} pct={motorData.thresher2.pct} showPct={true} showHz={false} ampTag={motorData.thresher2.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MotorCardSVG x={1358} y={220} id="bunch-crusher" label="Hard Bunch Crusher" ampere={motorData.bunchCrusher.amp} showHz={false} ampTag={motorData.bunchCrusher.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MotorCardSVG x={420} y={440} id="bottom-cross-conv" label="Bottom Cross Conv" ampere={motorData.bottomCrossConv.amp} showHz={false} ampTag={motorData.bottomCrossConv.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MotorCardSVG x={700} y={470} id="under-thresher-conv1" label="Thresher Bottom 1" ampere={motorData.underThresherConv1.amp} showHz={false} ampTag={motorData.underThresherConv1.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MotorCardSVG x={1190} y={470} id="under-thresher-conv2" label="Thresher Bottom 2" ampere={motorData.underThresherConv2.amp} showHz={false} ampTag={motorData.underThresherConv2.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MotorCardSVG x={1480} y={540} id="fruit-elevator1" label="Fruit Elevator 1" ampere={motorData.fruitElevator1.amp} pct={motorData.fruitElevator1.pct} showPct={true} showHz={false} ampTag={motorData.fruitElevator1.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MotorCardSVG x={1480} y={640} id="fruit-elevator2" label="Fruit Elevator 2" ampere={motorData.fruitElevator2.amp} pct={motorData.fruitElevator2.pct} showPct={true} showHz={false} ampTag={motorData.fruitElevator2.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MotorCardSVG x={420} y={1015} id="efb-horizontal-conv" label="EFB Horizontal Conv" ampere={motorData.efbHorizontalConv.amp} showHz={false} ampTag={motorData.efbHorizontalConv.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MotorCardSVG x={845} y={1005} id="usb-elevator" label="USB Elevator" ampere={motorData.usbElevator.amp} showHz={false} ampTag={motorData.usbElevator.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MotorCardSVG x={1380} y={1015} id="efb-inclined-conv" label="EFB Inclined Conv" ampere={motorData.efbInclinedConv.amp} showHz={false} ampTag={motorData.efbInclinedConv.ampTag} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
            </g>
          ) : (
            <g>
              <MaintenanceCardSVG x={150} y={335} id="tippler" label="M-TIPPLER" params={[{ label: 'AMP', value: '12.4', unit: 'A' }, { label: 'HZ', value: '45.0', unit: 'Hz' }, { label: 'VIB', value: '0.6', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MaintenanceCardSVG x={150} y={485} id="sfb-autofeeder" label="M-AFEEDER" params={[{ label: 'AMP', value: '8.2', unit: 'A' }, { label: 'HZ', value: '42.5', unit: 'Hz' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MaintenanceCardSVG x={150} y={665} id="sfb-conveyor" label="M-SFBCONV" params={[{ label: 'AMP', value: '14.1', unit: 'A' }, { label: 'VIB', value: '0.4', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MaintenanceCardSVG x={750} y={635} id="thresher1" label="M-TH_no1" params={[{ label: 'AMP', value: '142.1', unit: 'A' }, { label: 'VIB', value: '2.1', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MaintenanceCardSVG x={1350} y={635} id="thresher2" label="M-TH_no2" params={[{ label: 'AMP', value: '140.2', unit: 'A' }, { label: 'VIB', value: '2.2', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MaintenanceCardSVG x={1350} y={300} id="bunch-crusher" label="M-B_CRUSH" params={[{ label: 'AMP', value: '42.1', unit: 'A' }, { label: 'VIB', value: '2.4', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MaintenanceCardSVG x={1600} y={300} id="bottom-cross-conv" label="M-XCONV" params={[{ label: 'AMP', value: '22.4', unit: 'A' }, { label: 'HZ', value: '45.0', unit: 'Hz' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MaintenanceCardSVG x={1750} y={550} id="under-thresher-conv1" label="M-BC_no1" params={[{ label: 'AMP', value: '18.5', unit: 'A' }, { label: 'VIB', value: '0.8', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MaintenanceCardSVG x={1750} y={690} id="under-thresher-conv2" label="M-BC_no2" params={[{ label: 'AMP', value: '18.2', unit: 'A' }, { label: 'VIB', value: '0.9', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MaintenanceCardSVG x={2200} y={230} id="fruit-elevator1" label="M-ELEV1" params={[{ label: 'AMP', value: '32.5', unit: 'A' }, { label: 'HZ', value: '48.5', unit: 'Hz' }, { label: 'VIB', value: '1.4', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MaintenanceCardSVG x={2200} y={380} id="fruit-elevator2" label="M-ELEV2" params={[{ label: 'AMP', value: '30.1', unit: 'A' }, { label: 'HZ', value: '48.0', unit: 'Hz' }, { label: 'VIB', value: '1.2', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />

              <MaintenanceCardSVG x={800} y={960} id="efb-horizontal-conv" label="M-EFB_HOR" params={[{ label: 'AMP', value: '15.2', unit: 'A' }, { label: 'HZ', value: '46.5', unit: 'Hz' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MaintenanceCardSVG x={1100} y={960} id="usb-elevator" label="M-USB_ELV" params={[{ label: 'AMP', value: '14.8', unit: 'A' }, { label: 'HZ', value: '47.0', unit: 'Hz' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
              <MaintenanceCardSVG x={2200} y={830} id="efb-inclined-conv" label="M-EFB_INC" params={[{ label: 'AMP', value: '20.1', unit: 'A' }, { label: 'VIB', value: '1.1', unit: 'mm/s' }]} onClick={handleEquipmentClick} configMode={configMode} tagMap={tagMap} />
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
