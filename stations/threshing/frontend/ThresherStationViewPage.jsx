import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import threshingStationImageUrl from './assets/threshing-station.webp'
import motorSvg from './assets/item/motor.svg'
import backMotorSvg from './assets/item/back_motor.svg'
import usePlcStore from '@core/store'
import './ThresherStationViewPage.css'

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
    // If before 07:00 AM, shift starts at 07:00 yesterday
    if (now.getHours() < 7) {
      opStart.setDate(now.getDate() - 1);
    }
    opStart.setHours(7, 0, 0, 0);

    // Create 24 buckets representing each hour of the operational day
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

    // Determine Dynamic Max
    let maxVal = 0;
    buckets.forEach(b => {
      if (b.ampVal > maxVal) maxVal = b.ampVal;
      if (b.hzVal > maxVal) maxVal = b.hzVal;
    });

    // If no data or small data, default to 50
    if (maxVal < 10) maxVal = 50;

    // Add ~15% margin and snap to nice numbers
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

  // Generate SVG path for Ampere (Blue)
  const ampPath = useMemo(() => {
    if (!fullData || fullData.length === 0) return '';
    let path = `M ${fullData[0].x},${plotBottom - (Math.max(0, fullData[0].amp) / dynamicMax) * (plotBottom - plotTop)}`;
    for (let i = 1; i < fullData.length; i++) {
      path += ` L ${fullData[i].x},${plotBottom - (Math.max(0, fullData[i].amp) / dynamicMax) * (plotBottom - plotTop)}`;
    }
    return path;
  }, [fullData, dynamicMax]);

  // Generate SVG path for Hz (Red)
  const hzPath = useMemo(() => {
    if (!fullData || fullData.length === 0) return '';
    let path = `M ${fullData[0].x},${plotBottom - (Math.max(0, fullData[0].hz) / dynamicMax) * (plotBottom - plotTop)}`;
    for (let i = 1; i < fullData.length; i++) {
      path += ` L ${fullData[i].x},${plotBottom - (Math.max(0, fullData[i].hz) / dynamicMax) * (plotBottom - plotTop)}`;
    }
    return path;
  }, [fullData, dynamicMax]);

  // Area fill under Ampere
  const areaPath = useMemo(() => {
    if (!fullData || fullData.length === 0) return '';
    return `${ampPath} L ${plotRight},${plotBottom} L ${plotLeft},${plotBottom} Z`;
  }, [ampPath]);

  const handleGraphMouseMove = (e) => {
    if (!fullData || fullData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const xPos = ratio * width; // Scale screen pixels back to SVG coordinates (0 - 400)

    // Find closest point by X coordinate
    let closest = fullData[0];
    let minDiff = Math.abs(xPos - fullData[0].x);
    for (let i = 1; i < fullData.length; i++) {
      const diff = Math.abs(xPos - fullData[i].x);
      if (diff < minDiff) {
        minDiff = diff;
        closest = fullData[i];
      }
    }

    // Only show if reasonably close to the graph area
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

          {/* Y-Axis Grid & Labels */}
          {/* Dynamic Intervals: 4 evenly spaced horizontal lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = plotBottom - ratio * (plotBottom - plotTop);
            const val = (ratio * dynamicMax).toPrecision(3).replace(/\.0+$/, ''); // clean number
            return (
              <g key={`y-${ratio}`}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="#e2e8f0" strokeDasharray={ratio === 0 ? "0" : "4 4"} />
                <text x={plotLeft - 8} y={y + 3} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="Inter, sans-serif">{parseInt(val)}</text>
              </g>
            )
          })}

          {/* X-Axis Grid & Labels - Every 3 hours */}
          {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hrIndex) => {
            const x = plotLeft + ((plotRight - plotLeft) * hrIndex) / 23;
            // 0 -> 07, 3 -> 10, 6 -> 13, 9 -> 16, 12 -> 19, 15 -> 22, 18 -> 01, 21 -> 04, 23 -> 06
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


          {/* Ampere Blue Baseline & Area */}
          <path d={areaPath} style={{ fill: 'url(#trendGradient)' }} className="som-amp-graph-area" />

          {/* Custom segment renderer for empty data styling */}
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
                  {/* Gold Line Segment (Amp) */}
                  <line
                    x1={prev.x} y1={yAmp1} x2={d.x} y2={yAmp2}
                    stroke="#d4ac0d"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={isMissingData ? "4 4" : "0"}
                    opacity={isMissingData ? 0.3 : 1}
                    style={{ filter: isMissingData ? 'none' : 'drop-shadow(0px 1px 2px rgba(212,172,13,0.3))' }}
                  />

                  {/* Slate Line Segment (Hz) */}
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

          {/* Tooltip Hover Overlay (Invisible hit area for mouse tracking) */}
          <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="transparent" pointerEvents="all" />

          {/* Tooltip Overlay Visuals */}
          {hoverData && (
            <g>
              {/* Vertical Guide Line */}
              <line x1={hoverData.x} y1={plotTop} x2={hoverData.x} y2={plotBottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />

              {/* Data Points */}
              {/* Amp Point (Blue) */}
              <circle cx={hoverData.x} cy={plotBottom - (Math.max(0, hoverData.amp) / dynamicMax) * (plotBottom - plotTop)} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" style={{ filter: 'drop-shadow(0px 1px 2px rgba(59,130,246,0.5))' }} />
              {/* Hz Point (Red) */}
              <circle cx={hoverData.x} cy={plotBottom - (Math.max(0, hoverData.hz) / dynamicMax) * (plotBottom - plotTop)} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" style={{ filter: 'drop-shadow(0px 1px 2px rgba(239,68,68,0.5))' }} />

              {/* Tooltip Box */}
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
const MotorCardSVG = ({ x, y, id, label, frequency = 0, ampere = 0, pct = 0, ampTag, hzTag, onClick, size = 110, showHz = true, showPct = false }) => {
  const isRunning = ampere > 0
  const computedHzTag = hzTag || (ampTag ? ampTag.replace('_AMP', '_HZ') : null);
  const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover()

  return (
    <g id={id} className={`svg-equipment motor-group ${isRunning ? 'motor-on' : 'motor-off'}`} onClick={() => onClick(id)}>
      <foreignObject x={x - 150} y={y - 60} width="300" height="150" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div ref={cardRef} className="som-motor-mini-card" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div className={`som-status-indicator ${isRunning ? 'running' : 'stop'}`}></div>
            </div>
            <div className="som-motor-mini-body">
              {showHz && (
                <div className="som-motor-param-row">
                  <span className="som-motor-param-label">Speed</span>
                  <span className="som-motor-mini-value" data-unit="Hz">{Number(frequency || 0).toFixed(1)}</span>
                </div>
              )}
              <div className="som-motor-param-row">
                <span className="som-motor-param-label">Load</span>
                <span className="som-motor-mini-value" data-unit="A">{Number(ampere || 0).toFixed(1)}</span>
              </div>
              {showPct && (
                <div className="som-motor-param-row">
                  <span className="som-motor-param-label">Load</span>
                  <span className="som-motor-mini-value" data-unit="%">{Number(pct || 0).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </foreignObject>
      {isHovered && popupPos && (
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

const MotorIconSVG = ({ x, y, ampere, variant = 'front', size = 80, scaleX = 1, rotate = 0 }) => {
  const isRunning = ampere > 0
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
        filter: isRunning
          ? 'drop-shadow(0 0 10px rgba(255, 219, 59, 0.8)) brightness(1.2)'
          : 'grayscale(0.8) opacity(0.5)'
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
const MaintenanceCardSVG = ({ x, y, label, params = [], id, onClick }) => {
  return (
    <g
      className="maintenance-card-group"
      transform={`translate(${x - 150}, ${y - 65})`}
      onClick={() => onClick(id)}
      style={{ cursor: 'pointer' }}
    >
      <foreignObject width="300" height="130" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div className="som-motor-mini-card maintenance-card">
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

const StatsBoxSVG = ({ x, y, stats = [], color = '#ffdb3b' }) => {
  const width = 600
  const rowHeight = 35
  const height = 55 + (stats.length * rowHeight)

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width={width} height={height} rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect width={width} height="4" rx="2" fill={color} />
      {stats.map((stat, idx) => (
        <g key={idx} transform={`translate(25, ${45 + (idx * rowHeight)})`}>
          <text fill="#64748b" fontSize="16" fontWeight="800" textTransform="uppercase" letterSpacing="0.05em">
            {stat.label}
          </text>
          <text x={width - 50} textAnchor="end" fill="#0f172a" fontSize="22" fontWeight="900" fontFamily="'JetBrains Mono', monospace">
            {typeof stat.value === 'number' ? stat.value.toLocaleString(undefined, { minimumFractionDigits: stat.decimals ?? 0, maximumFractionDigits: stat.decimals ?? 0 }) : stat.value}
            <tspan fill="#64748b" fontSize="14" fontWeight="700" fontFamily="sans-serif"> {stat.unit}</tspan>
          </text>
          {idx < stats.length - 1 && (
            <line y1="12" x2={width - 50} y2="12" stroke="#f1f5f9" strokeWidth="1" />
          )}
        </g>
      ))}
      <line x1="0" y1="10" x2="0" y2={height - 10} stroke={color} strokeWidth="6" strokeLinecap="round" />
    </g>
  )
}

// --- PLC TAG EDITOR MODAL & UTILS ---
const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TagEditorModal = ({
  data,
  onClose,
  onSave,
  tagMap,
  availableTags = [],
  saving,
}) => {
  const [localTags, setLocalTags] = useState({});

  useEffect(() => {
    if (data) {
      const initial = {};

      // Custom signals (SummaryTable, StatusTable)
      if (data.signals && data.signals.length > 0) {
        data.signals.forEach((sig) => {
          const key = `${data.targetId}__${sig.key || sig}`;
          initial[key] = tagMap[key] || "";
        });
      } else {
        const targets = data.subs && data.subs.length > 0 ? data.subs : [data.targetId];
        targets.forEach((t) => {
          initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
          initial[`${t}__START`] = tagMap[`${t}__START`] || "";
          initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
        });
        if (!data.subs || data.subs.length === 0) {
          initial[`${data.targetId}__MONITOR`] =
            tagMap[`${data.targetId}__MONITOR`] || "";
        }
      }
      setLocalTags(initial);
    }
  }, [data, tagMap]);

  if (!data) return null;

  const isGroup = data.subs && data.subs.length > 0;
  const hasSignals = data.signals && data.signals.length > 0;
  const monitoringTags = availableTags.filter((t) => t.access !== "WRITE"); // include READ and READ_WRITE
  const controlTags = availableTags.filter((t) => t.access === "WRITE");

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: 0 }}>
      <label
        className="som-control-item-label"
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
          display: "block",
        }}
      >
        {label}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#0f172a",
          color: "#e2e8f0",
          fontSize: "12px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="">— No Tag —</option>
        {tagList.map((t) => (
          <option key={t.id} value={t.id}>
            {t.tag_name}
          </option>
        ))}
      </select>
    </div>
  );

  return createPortal(
    <div
      className="som-equipment-modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 10000,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "5vh",
      }}
    >
      <div
        className="som-equipment-control-popup som-tag-edit-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isGroup ? "800px" : "420px",
          maxHeight: "90vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 800,
                color: "#f1f5f9",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ⚙️ PLC Tag Configuration
            </h2>
            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                marginTop: "4px",
              }}
            >
              Hardware Mapping: {data.targetId}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {hasSignals ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {data.signals.map((sig) => (
                <div key={sig.key || sig}>
                  {renderTagSelect(
                    localTags[`${data.targetId}__${sig.key || sig}`] || "",
                    (val) =>
                      setLocalTags({
                        ...localTags,
                        [`${data.targetId}__${sig.key || sig}`]: val,
                      }),
                    monitoringTags,
                    sig.label || `${sig} Tag`,
                  )}
                </div>
              ))}
            </div>
          ) : isGroup ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {data.subs.map((sub, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(59, 130, 246, 0.15)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "12px",
                      color: "#60a5fa",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {sub}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    {renderTagSelect(
                      localTags[`${sub}__STATUS`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__STATUS`]: val }),
                      monitoringTags,
                      "STATUS (READ)",
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__START`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__START`]: val }),
                      controlTags,
                      "START (WRITE)",
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__STOP`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__STOP`]: val }),
                      controlTags,
                      "STOP (WRITE)",
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ maxWidth: "320px", margin: "0 auto" }}>
              {renderTagSelect(
                localTags[`${data.targetId}__MONITOR`] || "",
                (val) =>
                  setLocalTags({
                    ...localTags,
                    [`${data.targetId}__MONITOR`]: val,
                  }),
                monitoringTags,
                "MONITORING POINT (READ)",
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            disabled={saving}
            onClick={() => onSave(localTags, data)}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: saving ? "#475569" : "#3b82f6",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "SAVING..." : "CONFIRM MAPPING"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

function ThresherStationViewPage({ user, onSelectSubmenu }) {
  const initSocket = usePlcStore(state => state.initSocket)
  const tags = usePlcStore(state => state.tags)

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);
  const getTag = (tagName) => {
    const tag = tags[tagName] || { value: 0, status: 'STOP', timestamp: null }

    // --- SIMULATION DATA FOR DEMONSTRATION ---
    if (tag.value === 0) {
      const mockValues = {
        'TSR_TIP_AMP': 14.5, 'TSR_TIP_HZ': 45.2, 'TSR_TIP_RUN': 1,
        'TSR_AF_AMP': 8.2, 'TSR_AF_HZ': 40.5, 'TSR_AF_RUN': 1,
        'TSR_SFBC_AMP': 12.4, 'TSR_SFBC_HZ': 48.0, 'TSR_SFBC_RUN': 1,
        'TSR_TH1_AMP': 122.5, 'TSR_TH1_HZ': 49.5, 'TSR_TH1_PCT': 85.0, 'TSR_TH1_RUN': 1,
        'TSR_TH3_AMP': 118.2, 'TSR_TH3_HZ': 48.8, 'TSR_TH3_PCT': 82.5, 'TSR_TH3_RUN': 1,
        'TSR_BCR_AMP': 42.1, 'TSR_BCR_RUN': 1,
        'TSR_CC_AMP': 18.5, 'TSR_CC_RUN': 1,
        'TSR_BC1_AMP': 14.2, 'TSR_BC1_RUN': 1,
        'TSR_BC3_AMP': 15.1, 'TSR_BC3_RUN': 1,
        'TSR_EL1_AMP': 28.4, 'TSR_EL1_PCT': 62.0, 'TSR_EL1_RUN': 1,
        'TSR_SFBDC_AMP': 11.2, 'TSR_SFBDC_RUN': 1,
        'TSR_USBC_AMP': 14.8, 'TSR_USBC_RUN': 1,
        'TSR_EFBIC_AMP': 19.5, 'TSR_EFBIC_RUN': 1,
        'TSR_SCORE': 94.5, 'TSR_THROUGHPUT': 45.2,
        'TSR_USB_COUNT': 0.8, 'TSR_PSB_COUNT': 1.2,
        'TSR_USB_REJ': 142, 'TSR_PSB_REJ': 85,
        'TSR_STER_EFF': 98.2, 'TSR_TH_EFF': 96.5
      }
      if (mockValues[tagName] !== undefined) return { ...tag, value: mockValues[tagName] }
    }
    return tag
  }

  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [viewMode, setViewMode] = useState('process')
  const [activeTab, setActiveTab] = useState('overview')
  const svgRef = useRef(null)

  // --- PLC CONFIG STATE ---
  const [configMode, setConfigMode] = useState(false);
  const [tagEdit, setTagEdit] = useState(null);
  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [liveValues, setLiveValues] = useState({});

  const tagIdToName = useMemo(() => {
    const map = {};
    availableTags.forEach((t) => { map[t.id] = t.tag_name; });
    return map;
  }, [availableTags]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        const isDev = user?.userRole?.toLowerCase() === 'developer' || user?.role?.toLowerCase() === 'developer';
        if (!isDev) return;
        e.preventDefault();
        setConfigMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user]);

  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const res = await fetch("/api/threshing/plc-config/tags", { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.success) setAvailableTags(data.data);
        }
      } catch (err) {}
    };
    fetchAvailableTags();
  }, []);

  useEffect(() => {
    const loadMappings = async () => {
      try {
        const res = await fetch("/api/threshing/plc-config/station-mappings/THRESHING", { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            const restored = {};
            data.data.forEach((m) => { restored[`${m.equipment}__${m.signal_key}`] = String(m.tag_id); });
            setTagMap(restored);
          }
        }
      } catch (err) {}
    };
    loadMappings();
  }, []);

  const fetchLiveValues = useCallback(async () => {
    try {
      const res = await fetch("/api/threshing/plc-config/tags-live", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLiveValues(data.data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLiveValues();
    const interval = setInterval(fetchLiveValues, 2000);
    return () => clearInterval(interval);
  }, [fetchLiveValues]);

  const getLiveValue = useCallback((equipmentKey, signalKey = "MONITOR") => {
    const tagId = tagMap[`${equipmentKey}__${signalKey}`];
    if (!tagId) return null;
    const tagName = tagIdToName[tagId];
    if (!tagName) return null;
    const tagData = tags[tagName];
    if (tagData && tagData.value !== undefined) return tagData.value;
    if (liveValues[tagName] !== undefined) return liveValues[tagName];
    return null;
  }, [tagMap, tagIdToName, tags, liveValues]);

  const lv = (cardId, signalKey = "MONITOR", fallback, decimals = 1) => {
    const tagId = tagMap[`${cardId}__${signalKey}`];
    if (!tagId) return fallback;
    const v = getLiveValue(cardId, signalKey);
    if (v === null || v === undefined) return "--";
    const num = parseFloat(v);
    if (isNaN(num)) return v;
    return num.toFixed(decimals);
  };

  const handleTagEditRequest = (id, subs = [], signals = null) => {
    setTagEdit({ targetId: id, subs, signals, pos: { top: 0, left: 0 } });
  };

  const handleTagSave = async (updatedTags, editData) => {
    setSavingTags(true);
    try {
      const mappings = [];
      for (const [key, tagId] of Object.entries(updatedTags)) {
        if (!tagId) continue;
        const parts = key.split("__");
        if (parts.length !== 2) continue;
        mappings.push({ station: "THRESHING", equipment: parts[0], signal_key: parts[1], tag_id: parseInt(tagId) });
      }
      if (mappings.length > 0) {
        await fetch("/api/threshing/plc-config/station-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ mappings }),
        });
      }
      setTagMap((prev) => ({ ...prev, ...updatedTags }));
      setTagEdit(null);
    } catch (err) {
      alert("Failed to save tag configuration.");
    } finally {
      setSavingTags(false);
    }
  };

  useEffect(() => {
    initSocket()
  }, [initSocket])

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) })
  }

  const handleEquipmentClick = (id, subs = []) => {
    if (configMode) {
      handleTagEditRequest(id, subs, null);
      return;
    }
    console.log(`Motor clicked: ${id}`);
  };

  // --- PLC TAG MAPPING ---
  const motorData = {
    tippler: {
      freq: getTag('TSR_TIP_HZ').value,
      amp: getTag('TSR_TIP_AMP').value,
      ampTag: 'TSR_TIP_AMP',
      run: getTag('TSR_TIP_RUN').value === 1 || getTag('TSR_TIP_RUN').value === true
    },
    sfbAutofeeder: {
      freq: getTag('TSR_AF_HZ').value,
      amp: getTag('TSR_AF_AMP').value,
      ampTag: 'TSR_AF_AMP',
      run: getTag('TSR_AF_RUN').value === 1 || getTag('TSR_AF_RUN').value === true
    },
    sfbConveyor: {
      freq: getTag('TSR_SFBC_HZ').value,
      amp: getTag('TSR_SFBC_AMP').value,
      ampTag: 'TSR_SFBC_AMP',
      run: getTag('TSR_SFBC_RUN').value === 1 || getTag('TSR_SFBC_RUN').value === true
    },
    thresher1: {
      freq: getTag('TSR_TH1_HZ').value,
      amp: getTag('TSR_TH1_AMP').value,
      pct: getTag('TSR_TH1_PCT').value,
      ampTag: 'TSR_TH1_AMP',
      run: getTag('TSR_TH1_RUN').value === 1 || getTag('TSR_TH1_RUN').value === true
    },
    thresher2: {
      freq: getTag('TSR_TH2_HZ').value,
      amp: getTag('TSR_TH2_AMP').value,
      pct: getTag('TSR_TH2_PCT').value,
      ampTag: 'TSR_TH2_AMP',
      run: getTag('TSR_TH2_RUN').value === 1 || getTag('TSR_TH2_RUN').value === true
    },
    thresher3: {
      freq: getTag('TSR_TH3_HZ').value,
      amp: getTag('TSR_TH3_AMP').value,
      pct: getTag('TSR_TH3_PCT').value,
      ampTag: 'TSR_TH3_AMP',
      run: getTag('TSR_TH3_RUN').value === 1 || getTag('TSR_TH3_RUN').value === true
    },
    underThresherConv1: {
      amp: getTag('TSR_BC1_AMP').value,
      ampTag: 'TSR_BC1_AMP',
      run: getTag('TSR_BC1_RUN').value === 1 || getTag('TSR_BC1_RUN').value === true
    },
    underThresherConv2: {
      amp: getTag('TSR_BC2_AMP').value,
      ampTag: 'TSR_BC2_AMP',
      run: getTag('TSR_BC2_RUN').value === 1 || getTag('TSR_BC2_RUN').value === true
    },
    underThresherConv3: {
      amp: getTag('TSR_BC3_AMP').value,
      ampTag: 'TSR_BC3_AMP',
      run: getTag('TSR_BC3_RUN').value === 1 || getTag('TSR_BC3_RUN').value === true
    },
    bottomCrossConv: {
      freq: getTag('TSR_CC_HZ').value,
      amp: getTag('TSR_CC_AMP').value,
      ampTag: 'TSR_CC_AMP',
      run: getTag('TSR_CC_RUN').value === 1 || getTag('TSR_CC_RUN').value === true
    },
    fruitElevator1: {
      amp: getTag('TSR_EL1_AMP').value,
      pct: getTag('TSR_EL1_PCT').value,
      ampTag: 'TSR_EL1_AMP',
      run: getTag('TSR_EL1_RUN').value === 1 || getTag('TSR_EL1_RUN').value === true
    },
    fruitElevator2: {
      amp: getTag('TSR_EL2_AMP').value,
      pct: getTag('TSR_EL2_PCT').value,
      ampTag: 'TSR_EL2_AMP',
      run: getTag('TSR_EL2_RUN').value === 1 || getTag('TSR_EL2_RUN').value === true
    },
    bunchCrusher: {
      amp: getTag('TSR_BCR_AMP').value,
      ampTag: 'TSR_BCR_AMP',
      run: getTag('TSR_BCR_RUN').value === 1 || getTag('TSR_BCR_RUN').value === true
    },
    efbHorizontalConv: {
      amp: getTag('TSR_SFBDC_AMP').value,
      ampTag: 'TSR_SFBDC_AMP',
      run: getTag('TSR_SFBDC_RUN').value === 1 || getTag('TSR_SFBDC_RUN').value === true
    },
    usbElevator: {
      amp: getTag('TSR_USBC_AMP').value,
      ampTag: 'TSR_USBC_AMP',
      run: getTag('TSR_USBC_RUN').value === 1 || getTag('TSR_USBC_RUN').value === true
    },
    efbInclinedConv: {
      amp: getTag('TSR_EFBIC_AMP').value,
      ampTag: 'TSR_EFBIC_AMP',
      run: getTag('TSR_EFBIC_RUN').value === 1 || getTag('TSR_EFBIC_RUN').value === true
    },
  }

  const stationStats = {
    score: getTag('TSR_SCORE').value || 0,
    throughput: getTag('TSR_THROUGHPUT').value || 0,
    usbCount: getTag('TSR_USB_COUNT').value || 0,
    psbCount: getTag('TSR_PSB_COUNT').value || 0,
    totalUsbRejected: getTag('TSR_USB_REJ').value || 0,
    totalPsbRejected: getTag('TSR_PSB_REJ').value || 0,
    sterilEfficiency: getTag('TSR_STER_EFF').value || 0,
    threshEfficiency: getTag('TSR_TH_EFF').value || 0,
  }

  return (
    <section className={`som-thresher-station som-mode-${viewMode}`}>
      <header className="som-thresher-station-header">
        <div className="som-header-left">
          <h1 className="som-thresher-station-title">THRESHING STATION</h1>

          <div className="som-station-tabs">
            <button className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          </div>
        </div>

        <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
          <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
          <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" /></svg>
          </button>
          {onSelectSubmenu && (
            <button className="som-view-btn" onClick={() => onSelectSubmenu('Threshing Station', 'Settings')} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
          )}
        </div>
      </header>

      <div className="som-thresher-main">
        <div className="som-thresher-layout">
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

                  {/* Diagnostic Grid Pattern */}
                  <pattern id="diagGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255, 219, 59, 0.2)" strokeWidth="1" />
                    <circle cx="0" cy="0" r="1.5" fill="rgba(255, 219, 59, 0.4)" />
                  </pattern>
                </defs>

                <image href={threshingStationImageUrl} width="2670" x="-383" y="-50" className="som-station-bg-image" />

                {/* --- DIAGNOSTIC OVERLAYS --- */}
                {viewMode === 'maintenance' && (
                  <>
                    <rect width="2670" height="1200" x="-383" y="-75" fill="url(#diagGrid)" className="som-diag-grid" />
                    <foreignObject x="-383" y="-75" width="2670" height="1200" style={{ pointerEvents: 'none' }}>
                      <div className="som-diag-scanline"></div>
                    </foreignObject>
                  </>
                )}

                {/* --- STATION KPI BOXES --- */}
                <StatsBoxSVG x={350} y={-55} color="#39FF14" stats={[
                  { label: "Threshing Station Score", value: stationStats.score, unit: "%" },
                  { label: "Threshing Station Throughput", value: stationStats.throughput, unit: "mt/hr", decimals: 2 }
                ]} />
                <StatsBoxSVG x={1000} y={-55} color="#FFB300" stats={[
                  { label: "EFB Count", value: "0.6", unit: "%" },
                  { label: "USB Count", value: stationStats.usbCount, unit: "%", decimals: 1 },
                  { label: "PSB Count", value: stationStats.psbCount, unit: "%", decimals: 1 },
                  { label: "Total USB Rejected", value: stationStats.totalUsbRejected, unit: "" },
                  { label: "Total PSB Rejected", value: stationStats.totalPsbRejected, unit: "" }
                ]} />
                <StatsBoxSVG x={1650} y={-55} color="#00E5FF" stats={[
                  { label: "MPD Sterilization Efficiency", value: stationStats.sterilEfficiency, unit: "%" },
                  { label: "Threshing Efficiency", value: stationStats.threshEfficiency, unit: "%" }
                ]} />

                {/* --- MAIN STEAM PIPE PRESSURE --- */}
                <foreignObject x="-300" y="-55" width="300" height="100" style={{ overflow: 'visible' }}>
                  <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                    <div 
                      onClick={() => handleEquipmentClick('main_steam')}
                      className={`som-motor-mini-card ${configMode ? 'som-editable' : ''}`}
                      style={{ cursor: configMode ? 'pointer' : 'default' }}
                    >
                      <div className="som-motor-mini-header">
                        <span className="som-motor-mini-label">MAIN STEAM PIPE</span>
                        <div className="som-status-indicator running"></div>
                      </div>
                      <div
                        className="som-motor-mini-body"
                        style={{
                          flexDirection: "row",
                          justifyContent: "center",
                          alignItems: "baseline",
                          gap: "5px",
                        }}
                      >
                        <span
                          className="som-motor-mini-value"
                          style={{ fontSize: "20px" }}
                        >
                          {lv('main_steam', 'MONITOR', '2.6', 2)}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#94a3b8",
                          }}
                        >
                          Bar
                        </span>
                      </div>
                    </div>
                  </div>
                </foreignObject>

                {/* --- HUD DIAGNOSTIC BANNER --- */}
                {viewMode === 'maintenance' && (
                  <foreignObject x="350" y="20" width="1200" height="120" style={{ overflow: 'visible' }}>
                    <div className="som-diagnostic-banner">
                      TECHNICAL DIAGNOSTIC ACTIVE
                    </div>
                  </foreignObject>
                )}

                {/* --- MOTOR ICONS --- */}
                <MotorIconSVG x={145} y={120} ampere={motorData.tippler.amp} scaleX={-1} size={90} />
                <MotorIconSVG x={-25} y={417} ampere={motorData.sfbAutofeeder.amp} size={45} scaleX={-1} />
                <MotorIconSVG x={-285} y={560} ampere={motorData.sfbConveyor.amp} size={80} variant="back" />

                <MotorIconSVG x={619} y={370} ampere={motorData.underThresherConv1.amp} size={55} rotate={90} />
                <MotorIconSVG x={956} y={370} ampere={motorData.underThresherConv2.amp} size={55} rotate={90} />
                <MotorIconSVG x={1441} y={370} ampere={motorData.underThresherConv3.amp} size={55} rotate={90} />

                <MotorIconSVG x={360} y={330} ampere={motorData.bottomCrossConv.amp} size={110} />
                <MotorIconSVG x={1550} y={425} ampere={motorData.fruitElevator1.amp} size={80} variant="back" />
                <MotorIconSVG x={1600} y={425} ampere={motorData.fruitElevator2.amp} size={80} variant="back" />

                <MotorIconSVG x={340} y={920} ampere={motorData.efbHorizontalConv.amp} size={110} />
                <MotorIconSVG x={1385} y={330} ampere={motorData.bunchCrusher.amp} size={70} scaleX={-1} />
                <MotorIconSVG x={1080} y={1020} ampere={motorData.usbElevator.amp} size={100} variant="back" />
                <MotorIconSVG x={1335} y={1010} ampere={motorData.efbInclinedConv.amp} size={80} variant="back" />

                {/* --- EQUIPMENT RENDERING --- */}
                {viewMode === 'process' ? (
                  <g>
                    <MotorCardSVG x={220} y={35} id="tippler" label="Tippler" frequency={motorData.tippler.freq} ampere={motorData.tippler.amp} ampTag={motorData.tippler.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={115} y={380} id="sfb-autofeeder" label="Autofeeder" frequency={motorData.sfbAutofeeder.freq} ampere={motorData.sfbAutofeeder.amp} ampTag={motorData.sfbAutofeeder.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={-220} y={690} id="sfb-conveyor" label="SFB Conveyor" frequency={motorData.sfbConveyor.freq} ampere={motorData.sfbConveyor.amp} ampTag={motorData.sfbConveyor.ampTag} onClick={handleEquipmentClick} />

                    <MotorCardSVG x={465} y={630} id="thresher1" label="Thresher no.1" ampere={motorData.thresher1.amp} pct={motorData.thresher1.pct} showPct={true} showHz={false} ampTag={motorData.thresher1.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={800} y={630} id="thresher2" label="Thresher no.2" ampere={motorData.thresher2.amp} pct={motorData.thresher2.pct} showPct={true} showHz={false} ampTag={motorData.thresher2.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={1290} y={630} id="thresher3" label="Thresher no.3" ampere={motorData.thresher3.amp} pct={motorData.thresher3.pct} showPct={true} showHz={false} ampTag={motorData.thresher3.ampTag} onClick={handleEquipmentClick} />

                    <MotorCardSVG x={1325} y={250} id="bunch-crusher" label="Hard Bunch Crusher" ampere={motorData.bunchCrusher.amp} showHz={false} ampTag={motorData.bunchCrusher.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={1610} y={250} id="bottom-cross-conv" label="Bottom Cross Conv" ampere={motorData.bottomCrossConv.amp} showHz={false} ampTag={motorData.bottomCrossConv.ampTag} onClick={handleEquipmentClick} />

                    <MotorCardSVG x={465} y={470} id="under-thresher-conv1" label="Thresher Bottom 1" ampere={motorData.underThresherConv1.amp} showHz={false} ampTag={motorData.underThresherConv1.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={800} y={470} id="under-thresher-conv2" label="Thresher Bottom 2" ampere={motorData.underThresherConv2.amp} showHz={false} ampTag={motorData.underThresherConv2.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={1285} y={470} id="under-thresher-conv3" label="Thresher Bottom 3" ampere={motorData.underThresherConv3.amp} showHz={false} ampTag={motorData.underThresherConv3.ampTag} onClick={handleEquipmentClick} />

                    <MotorCardSVG x={1950} y={320} id="fruit-elevator1" label="Fruit Elevator 1" ampere={motorData.fruitElevator1.amp} pct={motorData.fruitElevator1.pct} showPct={true} showHz={false} ampTag={motorData.fruitElevator1.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={1950} y={430} id="fruit-elevator2" label="Fruit Elevator 2" ampere={motorData.fruitElevator2.amp} pct={motorData.fruitElevator2.pct} showPct={true} showHz={false} ampTag={motorData.fruitElevator2.ampTag} onClick={handleEquipmentClick} />

                    <MotorCardSVG x={360} y={1035} id="efb-horizontal-conv" label="EFB Horizontal Conv" ampere={motorData.efbHorizontalConv.amp} showHz={false} ampTag={motorData.efbHorizontalConv.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={935} y={1035} id="usb-elevator" label="USB Elevator" ampere={motorData.usbElevator.amp} showHz={false} ampTag={motorData.usbElevator.ampTag} onClick={handleEquipmentClick} />
                    <MotorCardSVG x={1500} y={1060} id="efb-inclined-conv" label="EFB Inclined Conv" ampere={motorData.efbInclinedConv.amp} showHz={false} ampTag={motorData.efbInclinedConv.ampTag} onClick={handleEquipmentClick} />
                  </g>
                ) : (
                  <g>
                    <MaintenanceCardSVG x={150} y={335} id="tippler" label="M-TIPPLER" params={[{ label: 'AMP', value: '12.4', unit: 'A' }, { label: 'HZ', value: '45.0', unit: 'Hz' }, { label: 'VIB', value: '0.6', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={150} y={485} id="sfb-autofeeder" label="M-AFEEDER" params={[{ label: 'AMP', value: '8.2', unit: 'A' }, { label: 'HZ', value: '42.5', unit: 'Hz' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={150} y={665} id="sfb-conveyor" label="M-SFBCONV" params={[{ label: 'AMP', value: '14.1', unit: 'A' }, { label: 'VIB', value: '0.4', unit: 'mm/s' }]} onClick={handleEquipmentClick} />

                    <MaintenanceCardSVG x={750} y={635} id="thresher1" label="M-TH_no1" params={[{ label: 'AMP', value: '142.1', unit: 'A' }, { label: 'VIB', value: '2.1', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={950} y={635} id="thresher2" label="M-TH_no2" params={[{ label: 'AMP', value: '138.5', unit: 'A' }, { label: 'VIB', value: '1.9', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={1350} y={635} id="thresher3" label="M-TH_no3" params={[{ label: 'AMP', value: '140.2', unit: 'A' }, { label: 'VIB', value: '2.2', unit: 'mm/s' }]} onClick={handleEquipmentClick} />

                    <MaintenanceCardSVG x={1350} y={300} id="bunch-crusher" label="M-B_CRUSH" params={[{ label: 'AMP', value: '42.1', unit: 'A' }, { label: 'VIB', value: '2.4', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={1600} y={300} id="bottom-cross-conv" label="M-XCONV" params={[{ label: 'AMP', value: '22.4', unit: 'A' }, { label: 'HZ', value: '45.0', unit: 'Hz' }]} onClick={handleEquipmentClick} />

                    <MaintenanceCardSVG x={1750} y={550} id="under-thresher-conv1" label="M-BC_no1" params={[{ label: 'AMP', value: '18.5', unit: 'A' }, { label: 'VIB', value: '0.8', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={1750} y={620} id="under-thresher-conv2" label="M-BC_no2" params={[{ label: 'AMP', value: '17.9', unit: 'A' }, { label: 'VIB', value: '0.7', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={1750} y={690} id="under-thresher-conv3" label="M-BC_no3" params={[{ label: 'AMP', value: '18.2', unit: 'A' }, { label: 'VIB', value: '0.9', unit: 'mm/s' }]} onClick={handleEquipmentClick} />

                    <MaintenanceCardSVG x={2200} y={230} id="fruit-elevator1" label="M-ELEV1" params={[{ label: 'AMP', value: '32.5', unit: 'A' }, { label: 'HZ', value: '48.5', unit: 'Hz' }, { label: 'VIB', value: '1.4', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={2200} y={380} id="fruit-elevator2" label="M-ELEV2" params={[{ label: 'AMP', value: '30.1', unit: 'A' }, { label: 'HZ', value: '48.0', unit: 'Hz' }, { label: 'VIB', value: '1.2', unit: 'mm/s' }]} onClick={handleEquipmentClick} />

                    <MaintenanceCardSVG x={800} y={960} id="efb-horizontal-conv" label="M-EFB_HOR" params={[{ label: 'AMP', value: '15.2', unit: 'A' }, { label: 'HZ', value: '46.5', unit: 'Hz' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={1100} y={960} id="usb-elevator" label="M-USB_ELV" params={[{ label: 'AMP', value: '14.8', unit: 'A' }, { label: 'HZ', value: '47.0', unit: 'Hz' }]} onClick={handleEquipmentClick} />
                    <MaintenanceCardSVG x={2200} y={830} id="efb-inclined-conv" label="M-EFB_INC" params={[{ label: 'AMP', value: '20.1', unit: 'A' }, { label: 'VIB', value: '1.1', unit: 'mm/s' }]} onClick={handleEquipmentClick} />
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

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
    </section>
  )
}

export default ThresherStationViewPage;

