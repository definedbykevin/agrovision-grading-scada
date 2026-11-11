import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import kernelStationImageUrl from './assets/kernel-station.png'
import nutCrackingImgUrl from './assets/kernel_nut_cracking.webp'
import kernelStorageImgUrl from './assets/kernel_storage_dispatch.webp'
import usePlcStore from '@core/store'

// SVG Icons
import motorSvg from './assets/item/motor.svg'
import backMotorSvg from './assets/item/back_motor.svg'
import fanSvg from './assets/item/fan.svg'
import ringFanSvg from './assets/item/ring_fan.svg'
import pompaAtasSvg from './assets/item/pompa_atas.svg'

import './KernelStationPage.css'
import KernelPlantSettingsPage from './settings/KernelPlantSettingsPage.jsx'

// Tab Components
import NutCrackingSeparationTab from './tabs/NutCrackingSeparationTab'
import KernelSeparationDryingTab from './tabs/KernelSeparationDryingTab'
import KernelStorageDispatchTab from './tabs/KernelStorageDispatchTab'

// Auth helper
const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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
  const allTags = availableTags; // show all tags

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
        paddingTop: "10vh",
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0
      }}
    >
      <div
        className="som-equipment-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          width: "400px",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
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
                display: "block"
              }}
            >
              Hardware Mapping: {data.targetId}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "60vh", overflowY: "auto" }}>
          {hasSignals ? (
            data.signals.map((sig) => {
              const sigKey = sig.key || sig;
              const sigLabel = sig.label || sigKey;
              const k = `${data.targetId}__${sigKey}`;
              return (
                <div key={k}>
                  {renderTagSelect(
                    localTags[k],
                    (val) => setLocalTags((prev) => ({ ...prev, [k]: val })),
                    allTags,
                    sigLabel
                  )}
                </div>
              );
            })
          ) : isGroup ? (
            data.subs.map((sub) => (
              <div
                key={sub}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "11px",
                    color: "#f1f5f9",
                    textTransform: "uppercase",
                  }}
                >
                  Sub-Equipment: {sub}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {renderTagSelect(
                    localTags[`${sub}__STATUS`],
                    (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STATUS`]: val })),
                    allTags,
                    "Status/Feedback (READ)"
                  )}
                  {renderTagSelect(
                    localTags[`${sub}__START`],
                    (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__START`]: val })),
                    allTags,
                    "Start Command (WRITE)"
                  )}
                  {renderTagSelect(
                    localTags[`${sub}__STOP`],
                    (val) => setLocalTags((prev) => ({ ...prev, [`${sub}__STOP`]: val })),
                    allTags,
                    "Stop Command (WRITE)"
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {renderTagSelect(
                localTags[`${data.targetId}__MONITOR`],
                (val) => setLocalTags((prev) => ({ ...prev, [`${data.targetId}__MONITOR`]: val })),
                allTags,
                "MONITORING POINT (READ)"
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 24px",
            background: "rgba(0,0,0,0.2)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "transparent",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(localTags, data)}
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Apply Mapping"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Standardized Hooks & Components
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
          <span style={{ color: '#ffdb3b' }}><b>Amp [A]:</b> {value && !isNaN(parseFloat(value)) ? parseFloat(value).toFixed(1) : (value || '0.0')}</span>
          <span style={{ color: '#0f172a' }}><b>Hz:</b> {hzValue && !isNaN(parseFloat(hzValue)) ? parseFloat(hzValue).toFixed(1) : (hzValue || '0.0')}</span>
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
          <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="rgba(0,0,0,0.02)" />

          {/* Y-Axis Grid & Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = plotBottom - ratio * (plotBottom - plotTop);
            const val = (ratio * dynamicMax).toPrecision(3).replace(/\.0+$/, '');
            return (
              <g key={`y-${ratio}`}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="rgba(0,0,0,0.06)" strokeDasharray={ratio === 0 ? "0" : "4 4"} />
                <text x={plotLeft - 8} y={y + 3} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="Inter, sans-serif">{parseInt(val)}</text>
              </g>
            )
          })}

          {/* X-Axis Grid & Labels */}
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
                    stroke="#ffdb3b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={isMissingData ? "4 4" : "0"}
                    opacity={isMissingData ? 0.3 : 1}
                  />
                  <line
                    x1={prev.x} y1={yHz1} x2={d.x} y2={yHz2}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray={isMissingData ? "2 6" : "4 2"}
                    opacity={isMissingData ? 0.3 : 1}
                  />
                </g>
              );
            })}
          </g>

          <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} fill="transparent" pointerEvents="all" />

          {hoverData && (
            <g>
              <line x1={hoverData.x} y1={plotTop} x2={hoverData.x} y2={plotBottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={hoverData.x} cy={plotBottom - (Math.max(0, hoverData.amp) / dynamicMax) * (plotBottom - plotTop)} r="4" fill="#ffdb3b" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={hoverData.x} cy={plotBottom - (Math.max(0, hoverData.hz) / dynamicMax) * (plotBottom - plotTop)} r="4" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />

              <g transform={`translate(${hoverData.x > (plotLeft + plotRight) / 2 ? hoverData.x - 90 : hoverData.x + 10}, ${plotTop + 10})`}>
                <rect width="80" height="45" rx="4" fill="rgba(255, 255, 255, 0.95)" stroke="#cbd5e1" strokeWidth="1" style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }} />
                <text x="40" y="14" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="Inter, sans-serif">
                  {String(hoverData.hour).padStart(2, '0')}:00
                </text>
                <text x="8" y="28" fill="#ffdb3b" fontSize="9" fontWeight="bold" fontFamily="Inter, sans-serif">
                  Amp: {hoverData.amp.toFixed(1)}
                </text>
                <text x="8" y="40" fill="#0f172a" fontSize="9" fontWeight="bold" fontFamily="Inter, sans-serif">
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
export const MotorCardSVG = ({ 
  x, y, id, label, frequency = 0, ampere = 0, ampTag, hzTag, onClick, size = 110, isEditable,
  topLabel = "Speed", topUnit = "Hz", topUseHz = true,
  botLabel = "Load", botUnit = "A", botUseHz = false,
  modalParams = [{key: "AMP", label: "Ampere"}, {key: "HZ", label: "Frequency"}]
}) => {
  const isNoTagAmp = String(ampere).toLowerCase() === 'no tag';
  const isNoTagHz = String(frequency).toLowerCase() === 'no tag';
  const isNoTag = isNoTagAmp && isNoTagHz;
  const isRunning = (!isNoTagAmp && parseFloat(ampere) > 0) || (!isNoTagHz && parseFloat(frequency) > 0);
  const computedHzTag = hzTag || (ampTag ? ampTag.replace('_AMP', '_HZ') : null);
  const { cardRef, isHovered, popupPos, handleMouseEnter, handleMouseLeave, handlePopupMouseEnter, handlePopupMouseLeave } = useAmpHover()

  return (
    <g id={id} className={`svg-equipment motor-group ${isNoTag ? '' : isRunning ? 'motor-on' : 'motor-off'}`} onClick={() => onClick && onClick(id, [], modalParams)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
      <foreignObject x={x - 150} y={y - 60} width="300" height="150" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div ref={cardRef} className={`som-motor-mini-card ${isEditable ? 'som-editable' : ''}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div className={`som-status-indicator ${isNoTag ? '' : isRunning ? 'running' : 'stop'}`} style={isNoTag ? { background: '#94a3b8', boxShadow: 'none', animation: 'none' } : {}}></div>
            </div>
            <div className="som-motor-mini-body">
              {isNoTag ? (
                <div style={{ padding: '10px 0', textAlign: 'center' }}>
                  <span className="som-motor-mini-value" style={{ fontSize: "20px", color: "#94a3b8", fontStyle: "italic" }}>
                    no tag
                  </span>
                </div>
              ) : (
                <>
                  <div className="som-motor-param-row">
                    <span className="som-motor-param-label">{topLabel}</span>
                    <span className="som-motor-mini-value" data-unit={topUseHz ? (isNoTagHz ? '' : topUnit) : (isNoTagAmp ? '' : topUnit)} style={topUseHz ? (isNoTagHz ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : {}) : (isNoTagAmp ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : {})}>
                      {topUseHz ? (isNoTagHz ? 'no tag' : frequency) : (isNoTagAmp ? 'no tag' : ampere)}
                    </span>
                  </div>
                  <div className="som-motor-param-row">
                    <span className="som-motor-param-label">{botLabel}</span>
                    <span className="som-motor-mini-value" data-unit={botUseHz ? (isNoTagHz ? '' : botUnit) : (isNoTagAmp ? '' : botUnit)} style={botUseHz ? (isNoTagHz ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : {}) : (isNoTagAmp ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : {})}>
                      {botUseHz ? (isNoTagHz ? 'no tag' : frequency) : (isNoTagAmp ? 'no tag' : ampere)}
                    </span>
                  </div>
                </>
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


export const EquipmentIconSVG = ({ x, y, icon, isRunning, size = 60, rotation = 0, scaleX = 1, className = "" }) => {
  const filter = isRunning == null ? undefined : isRunning ? 'url(#tint-green)' : 'url(#tint-red)'
  return (
    <image
      href={icon}
      x={x - (size / 2)}
      y={y - (size / 2)}
      width={size}
      height={size}
      className={className}
      style={{
        transform: `rotate(${rotation}deg) scaleX(${scaleX})`,
        transformOrigin: `${x}px ${y}px`,
        pointerEvents: 'none',
        filter: filter
      }}
    />
  )
}

export const FanIconSVG = ({ x, y, isRunning, size = 80 }) => {
  const filter = isRunning == null ? undefined : isRunning ? 'url(#tint-green)' : 'url(#tint-red)'
  return (
    <g>
      <image
        href={ringFanSvg}
        x={x - (size / 2)}
        y={y - (size / 2)}
        width={size}
        height={size}
        style={{ filter: filter }}
      />
      <image
        href={fanSvg}
        x={x - (size / 2)}
        y={y - (size / 2)}
        width={size}
        height={size}
        className={isRunning ? 'som-kernel-fan-blades--running' : ''}
        style={{
          transformOrigin: `${x}px ${y}px`,
          filter: filter
        }}
      />
    </g>
  )
}

export const KernelLabelSVG = ({ x, y, label, fontSize = "16px", hasOutline = true }) => {
  const lines = String(label).split('\n')
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      className="som-kernel-label-svg"
      style={{
        fontSize: fontSize,
        stroke: hasOutline ? '#FFFFFF' : 'none',
      }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
      ))}
    </text>
  )
}

export const KSTCardSVG = ({ x, y, id, label, values = [], status = null, isRunning = true, onClick, isEditable }) => {
  return (
    <g id={id} className={`svg-equipment ${isRunning ? 'motor-on' : 'motor-off'}`} onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
      <foreignObject x={x - 85} y={y - 80} width="170" height="200" style={{ overflow: 'visible' }}>
        <div className={`som-kernel-card-mini ${isEditable ? 'som-editable' : ''}`} style={{ minWidth: '170px' }}>
          <div className="som-kernel-card-header">
            <span className="som-kernel-card-title">{label}</span>
            <svg className="som-oc-gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px', color: '#64748b' }}>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div className="som-kernel-card-body">
            {values.map((v, i) => {
              const isNoTag = String(v.value).toLowerCase() === 'no tag';
              return (
                <div key={i} className="som-kernel-card-row">
                  <span className="som-kernel-card-label">{v.label}</span>
                  <span className="som-kernel-card-value" data-unit={isNoTag ? '' : v.unit} style={isNoTag ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : {}}>
                    {v.value}
                  </span>
                </div>
              );
            })}
            {status && (
              <div className={`som-kernel-card-status ${isRunning ? 'status-running' : 'status-stop'}`}>
                {status}
              </div>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}

export const KSTBunkerCardSVG = ({ x, y, id, label, stock, moisture, ds, onClick, isEditable }) => {
  const isNoTagStock = String(stock).toLowerCase() === 'no tag';
  const isNoTagMoisture = String(moisture).toLowerCase() === 'no tag';
  const isNoTagDs = String(ds).toLowerCase() === 'no tag';
  
  return (
    <g id={id} className="svg-equipment bunker-group" onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
      <foreignObject x={x - 85} y={y - 80} width="170" height="180" style={{ overflow: 'visible' }}>
        <div className={`som-kernel-card-mini ${isEditable ? 'som-editable' : ''}`} style={{ minWidth: '170px', borderTop: '3px solid #ffdb3b' }}>
          <div className="som-kernel-card-header" style={{ background: '#0f172a' }}>
            <span className="som-kernel-card-title" style={{ color: '#ffffff' }}>{label}</span>
          </div>
          <div className="som-kernel-card-body">
            <div className="som-kernel-card-row">
              <span className="som-kernel-card-label">Stock</span>
              <span className="som-kernel-card-value" data-unit={isNoTagStock ? '' : "mt"} style={isNoTagStock ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : { color: '#0f172a' }}>{stock}</span>
            </div>
            <div className="som-kernel-card-row">
              <span className="som-kernel-card-label">Moisture</span>
              <span className="som-kernel-card-value" data-unit={isNoTagMoisture ? '' : "%"} style={isNoTagMoisture ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : { color: '#0f172a' }}>{moisture}</span>
            </div>
            <div className="som-kernel-card-row">
              <span className="som-kernel-card-label">D&S</span>
              <span className="som-kernel-card-value" data-unit={isNoTagDs ? '' : "%"} style={isNoTagDs ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : { color: '#0f172a' }}>{ds}</span>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  )
}

export const KSTProductionBoxSVG = ({ x, y, id, data, onClick, isEditable }) => (
  <g id={id} className={`svg-equipment prodbox-group`} onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
    <foreignObject x={x - 1100} y={y - 130} width="800" height="120" style={{ overflow: 'visible' }}>
      <div className={`som-kernel-card-mini ${isEditable ? 'som-editable' : ''}`} style={{ minWidth: '800px', borderLeft: '4px solid #ffdb3b' }}>
        <div className="som-kernel-card-header" style={{ background: '#0f172a' }}>
          <span className="som-kernel-card-title" style={{ color: '#ffffff' }}>Daily Production Summary</span>
        </div>
        <div className="som-kernel-card-body" style={{ display: 'flex', flexDirection: 'row', gap: '30px', padding: '12px 20px' }}>
          {data.map((item, i) => {
            const isNoTag = String(item.value).toLowerCase() === 'no tag';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderRight: i === data.length - 1 ? 'none' : '1px solid #e2e8f0', paddingRight: '30px' }}>
                <span className="som-kernel-card-label" style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>{item.label}</span>
                <span className="som-kernel-card-value" style={{ fontSize: '20px', color: isNoTag ? '#94a3b8' : '#0f172a', fontStyle: isNoTag ? 'italic' : 'normal', whiteSpace: 'nowrap' }}>{item.value}</span>
              </div>
            )
          })}
        </div>
      </div>
    </foreignObject>
  </g>
)

export const KSTSimpleTextBoxSVG = ({ x, y, id, lines = [], onClick, isEditable }) => (
  <g id={id} className={`svg-equipment textbox-group`} onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
    <foreignObject x={x - -270} y={y - 610} width="220" height="300" style={{ overflow: 'visible' }}>
      <div className={`som-kernel-card-mini ${isEditable ? 'som-editable' : ''}`} style={{ minWidth: '220px' }}>
        <div className="som-kernel-card-header">
          <span className="som-kernel-card-title">Production</span>
        </div>
        <div className="som-kernel-card-body" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {lines.map((text, i) => {
            const [label, value] = text.split(' = ');
            const isNoTag = String(value).toLowerCase() === 'no tag';
            return (
              <div key={i} className="som-kernel-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: i === lines.length - 1 ? 'none' : '1px solid #f1f5f9', paddingBottom: i === lines.length - 1 ? '0' : '6px', gap: '4px' }}>
                <span className="som-kernel-card-label" style={{ fontSize: '10px', whiteSpace: 'normal', lineHeight: '1.2' }}>{label}</span>
                <span className="som-kernel-card-value" style={{ fontSize: '14px', whiteSpace: 'normal', color: isNoTag ? '#94a3b8' : '#0f172a', fontStyle: isNoTag ? 'italic' : 'normal' }}>{value}</span>
              </div>
            )
          })}
        </div>
      </div>
    </foreignObject>
  </g>
)

export const KSTTableSVG = ({ x, y, id, title, headers, rows, onClick, isEditable }) => (
  <g id={id} className={`svg-equipment table-group`} onClick={() => onClick && onClick(id)} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
    <foreignObject x={x - 225} y={y - 130} width="450" height="260" style={{ overflow: 'visible' }}>
      <div className={`som-kernel-card-mini ${isEditable ? 'som-editable' : ''}`} style={{ minWidth: '450px' }}>
        <div className="som-kernel-card-header">
          <span className="som-kernel-card-title">{title}</span>
        </div>
        <div className="som-kernel-card-body" style={{ padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#0f172a', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.05)' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b' }}>Unit</th>
                {headers.map((h, i) => <th key={i} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontWeight: '800', color: '#0f172a' }}>{row.label}</td>
                  {row.values.map((v, j) => {
                    const isNoTag = String(v).toLowerCase() === 'no tag';
                    return (
                      <td key={j} style={{ padding: '8px', textAlign: 'center', color: isNoTag ? '#94a3b8' : '#0f172a', fontStyle: isNoTag ? 'italic' : 'normal', fontWeight: '900', fontSize: '13px' }}>{v}</td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </foreignObject>
  </g>
)

export const DefsOverlay = () => (
  <defs>
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
)

export const DiagOverlay = ({ viewX, viewWidth, bannerX }) => (
  <g className="som-diag-group">
    <rect x={viewX} y="-55" width={viewWidth} height="1150" fill="url(#diagGrid)" className="som-diag-grid" />
    <foreignObject x={viewX} y="-55" width={viewWidth} height="1150" style={{ pointerEvents: 'none', overflow: 'visible' }}>
      <div className="som-diag-scanline"></div>
    </foreignObject>
    <foreignObject x={bannerX} y="20" width="600" height="60" style={{ overflow: 'visible' }}>
      <div className="som-diagnostic-banner">
        TECHNICAL DIAGNOSTIC ACTIVE
      </div>
    </foreignObject>
  </g>
)

export const MaintenanceCardSVG = ({ x, y, id, label, params = [], onClick, width = 300, isEditable }) => (
  <g id={id} className="svg-equipment motor-group maintenance-card-group" onClick={() => onClick && onClick(id, [], params.map(p => ({ key: p.label, label: p.label === 'HZ' ? 'Frequency' : (p.label === 'AMP' ? 'Ampere' : p.label) })))} style={{ cursor: isEditable ? 'pointer' : 'default' }}>
    <foreignObject x={x - (width / 2)} y={y - 40} width={width} height="120" style={{ overflow: 'visible' }}>
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className={`som-motor-mini-card maintenance-card ${isEditable ? 'som-editable' : ''}`}>
          <div className="som-motor-mini-header">
            <div className="som-motor-mini-label">{label}</div>
            <div className="som-maintenance-mini-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
          </div>
          <div className="som-motor-mini-body">
            {params.map((p, idx) => {
              const isNoTag = String(p.value).toLowerCase() === 'no tag';
              return (
                <div key={idx} className="som-motor-param-row">
                  <span className="som-motor-param-label">{p.label}</span>
                  <span className="som-motor-mini-value" data-unit={isNoTag ? '' : p.unit} style={isNoTag ? { color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' } : {}}>
                    {p.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </foreignObject>
  </g>
)

function KernelStationPage({ user, onSelectSubmenu, configMode: propConfigMode = false }) {
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('kernel_activeTab') || 'overview')
  const [viewMode, setViewMode] = useState(() => sessionStorage.getItem('kernel_viewMode') || 'process')
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    setCoords({ x: Math.round(svgP.x), y: Math.round(svgP.y) })
  }

  const initSocket = usePlcStore(state => state.initSocket)
  const tags = usePlcStore(state => state.tags)
  const getTag = (tagName) => {
    // Simulation layer for development
    const simulationTags = {
      'KRN_PD_AMP': 22.4, 'KRN_PD_HZ': 50.0, 'KRN_PD_RUN': 1,
      'KRN_FC_AMP': 45.1, 'KRN_FC_HZ': 48.2, 'KRN_FC_RUN': 1,
      'KRN_FC_AL_RUN': 1,
      'KRN_DS_AMP': 42.8, 'KRN_DS_HZ': 47.5, 'KRN_DS_RUN': 1,
      'KRN_DS_AL_RUN': 1,
      'KRN_NC_AMP': 12.4, 'KRN_NC_HZ': 50.0, 'KRN_NC_RUN': 1,
      'KRN_RM1_AMP': 44.1, 'KRN_RM1_HZ': 48.0, 'KRN_RM1_RUN': 1,
      'KRN_RM2_AMP': 43.5, 'KRN_RM2_HZ': 48.0, 'KRN_RM2_RUN': 1,
      'KRN_RM3_AMP': 45.0, 'KRN_RM3_HZ': 48.0, 'KRN_RM3_RUN': 1,
      'KRN_RM4_AMP': 44.2, 'KRN_RM4_HZ': 48.0, 'KRN_RM4_RUN': 1,
      'KRN_RM5_AMP': 43.8, 'KRN_RM5_HZ': 48.0, 'KRN_RM5_RUN': 1,
      'KRN_RM6_AMP': 44.5, 'KRN_RM6_HZ': 48.0, 'KRN_RM6_RUN': 1,
      'KRN_LT1_AMP': 18.2, 'KRN_LT1_HZ': 46.5, 'KRN_LT1_RUN': 1,
      'KRN_LT1_AL_RUN': 1,
      'KRN_LT2_AMP': 17.9, 'KRN_LT2_HZ': 46.2, 'KRN_LT2_RUN': 1,
      'KRN_LT2_AL_RUN': 1,
      'KRN_MXC_AMP': 14.8, 'KRN_MXC_HZ': 50.0, 'KRN_MXC_RUN': 1,
      'KRN_MXE_AMP': 15.2, 'KRN_MXE_HZ': 50.0, 'KRN_MXE_RUN': 1,
    }

    if (tags[tagName]) return tags[tagName];
    if (simulationTags[tagName] !== undefined) {
      return { value: simulationTags[tagName], status: simulationTags[tagName] > 0 ? 'RUN' : 'STOP', timestamp: new Date().toISOString() };
    }
    return { value: 0, status: 'STOP', timestamp: null };
  }

  useEffect(() => {
    initSocket()
  }, [initSocket])

  // --- PLC CONFIG STATE ---
  const [configMode, setConfigMode] = useState(propConfigMode);
  
  useEffect(() => {
    setConfigMode(propConfigMode);
  }, [propConfigMode]);

  const [showSettings, setShowSettings] = useState(() => sessionStorage.getItem('kernel_showSettings') === 'true');
  
  useEffect(() => { sessionStorage.setItem('kernel_activeTab', activeTab); }, [activeTab]);
  useEffect(() => { sessionStorage.setItem('kernel_viewMode', viewMode); }, [viewMode]);
  useEffect(() => { sessionStorage.setItem('kernel_showSettings', showSettings); }, [showSettings]);

  const [tagEdit, setTagEdit] = useState(null);
  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [savingTags, setSavingTags] = useState(false);
  const [liveValues, setLiveValues] = useState({});

  const tagIdToName = useMemo(() => {
    const map = {};
    availableTags.forEach((t) => { map[t.id] = t.tag_name; });
    return map;
  }, [availableTags]);

  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch("/api/kernel-plant/plc-config/tags", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setAvailableTags(data.data);
      }
    } catch (err) { }
  }, []);

  useEffect(() => {
    fetchAvailableTags();
  }, [fetchAvailableTags]);


  const loadMappings = useCallback(async () => {
      try {
        const res = await fetch(`/api/kernel-plant/plc-config/station-mappings?t=${Date.now()}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            const restored = {};
            data.data.forEach((m) => { restored[`${m.equipment}__${m.signal_key}`] = String(m.tag_id); });
            setTagMap(restored);
          }
        }
      } catch (err) { }
  }, []);
  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  const fetchLiveValues = useCallback(async () => {
    try {
      const res = await fetch("/api/kernel-plant/plc-config/tags-live", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLiveValues(data.data);
      }
    } catch { }
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
    
    // Priority 1: WebSocket (Real-time SCADA Speed)
    if (tags && tags[tagName] && tags[tagName].value !== undefined) {
        return tags[tagName].value;
    }
    
    // Priority 2: HTTP Polling Fallback
    if (liveValues[tagName] !== undefined) return liveValues[tagName];
    return null;
  }, [tagMap, tagIdToName, liveValues, tags]);

  const lv = (cardId, signalKey = "MONITOR", fallback, decimals = 1) => {
    const tagId = tagMap[`${cardId}__${signalKey}`];
    if (!tagId) return fallback;
    const v = getLiveValue(cardId, signalKey);
    if (v === null || v === undefined) return "-- --";
    const num = parseFloat(v);
    if (isNaN(num)) return v;
    return num.toFixed(decimals);
  };

  const handleTagEditRequest = (id, subs = [], signals = null) => {
    fetchAvailableTags();
    setTagEdit({ targetId: id, subs, signals, pos: { top: 0, left: 0 } });
  };
  const handleTagSave = async (updatedTags, editData) => {
    setSavingTags(true);
    try {
      const mappings = [];
      for (const [key, tagId] of Object.entries(updatedTags)) {
        const parts = key.split("__");
        if (parts.length !== 2) continue;
        mappings.push({ station: "KERNEL-PLANT", equipment: parts[0], signal_key: parts[1], tag_id: tagId ? parseInt(tagId) : null });
      }
      if (mappings.length > 0) {
        await fetch("/api/kernel-plant/plc-config/station-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ mappings }),
        });
      }
      setTagMap((prev) => ({ ...prev, ...updatedTags }));
      await loadMappings();
      setTagEdit(null);
    } catch (err) {
      alert("Failed to save tag configuration.");
    } finally {
      setSavingTags(false);
    }
  };

  const handleEquipmentClick = (id, subs = [], signals = null) => {
    if (configMode) {
      handleTagEditRequest(id, subs, signals);
      return;
    }
    console.log(`Equipment clicked: ${id}`);
  };

  const getRunStatus = (id) => {
    const runVal = getLiveValue(id, 'RUN');
    if (runVal !== null) return parseFloat(runVal) > 1 ? 'run' : 'stop';
    
    const ampVal = getLiveValue(id, 'AMP');
    if (ampVal !== null) return parseFloat(ampVal) > 1 ? 'run' : 'stop';
    
    const hzVal = getLiveValue(id, 'HZ');
    if (hzVal !== null) return parseFloat(hzVal) > 1 ? 'run' : 'stop';

    return 'stop';
  };

  // --- REAL-TIME STATUS FROM PLC STORE ---
  const kernelStatus = useMemo(() => {
    return {
      fiberCyclone: { run: getRunStatus('fibFan'), airlock: getRunStatus('fibAir') },
      polishingDrum: { run: getRunStatus('drum') },
      destoner: { run: getRunStatus('desFan'), airlock: getRunStatus('desAir') },
      nutConveyor: { run: getRunStatus('nutConv') },
      ltds1: { run: getRunStatus('ltdsFan1'), airlock: getRunStatus('ltdsAir1') },
      ltds2: { run: getRunStatus('ltdsFan2'), airlock: getRunStatus('ltdsAir2') },
      rippleMills: [
        { id: 1, run: getRunStatus('rm1') },
        { id: 2, run: getRunStatus('rm2') },
        { id: 3, run: getRunStatus('rm3') },
        { id: 4, run: getRunStatus('rm4') },
        { id: 5, run: getRunStatus('rm5') },
        { id: 6, run: getRunStatus('rm6') },
      ],
      mixtureConv: { run: getRunStatus('mixConv') },
      mixtureElev: { run: getRunStatus('mixElev') },
      vibScreen: { run: getRunStatus('vibScreen') },
      clayDensity: { run: getRunStatus('clayDensity') },
      wetShellBlower: { run: getRunStatus('wetShellBlower') },
      wetKernelElev: { run: getRunStatus('wetKernelElev') },
      clayPump1: { run: getRunStatus('clayPump1') },
      clayPump2: { run: getRunStatus('clayPump2') },
      wetKernelConv: { run: getRunStatus('wetKernelConv') },
      driedKernelConv: { run: getRunStatus('driedKernelConv') },
      driedKernelAir: { run: getRunStatus('driedKernelAir') },
      driedKernelBlow: { run: getRunStatus('driedKernelBlow') },
    }
  }, [tagMap, getLiveValue])

  return (
    <section className="som-kernel-station">
      {!showSettings && (
        <header className="som-kernel-station-header">
          <div className="som-header-left">
          <h1 className="som-kernel-station-title">KERNEL PLANT STATION</h1>

          <div className="som-station-tabs">
            <button
              className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              NUT CRACKING & SEPARATION
            </button>
            <button
              className={`som-station-tab ${activeTab === 'nut_cracking' ? 'active' : ''}`}
              onClick={() => setActiveTab('nut_cracking')}
            >
              KERNEL SEPARATION & DRYING
            </button>
            <button
              className={`som-station-tab ${activeTab === 'kernel_storage' ? 'active' : ''}`}
              onClick={() => setActiveTab('kernel_storage')}
            >
              KERNEL STORAGE DISPATCH
            </button>
          </div>
        </div>

        <div className="som-view-toggle-container">
          <button className={`som-view-btn ${viewMode === 'process' ? 'active' : ''}`} onClick={() => setViewMode('process')}>PROCESS VIEW</button>
          <button
            className="som-view-btn"
            disabled
            style={{
              cursor: "not-allowed",
              opacity: 0.6,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            MAINTENANCE
            <svg
              width="10"
              height="12"
              viewBox="0 0 448 512"
              fill="currentColor"
              style={{ marginLeft: "4px" }}
            >
              <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
            </svg>
          </button>
          <button className="som-view-btn" onClick={() => setShowSettings(true)} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
        </div>

        {/* <div className="som-coord-display">
          X: {coords.x} | Y: {coords.y}
        </div> */}
        </header>
      )}

      {!showSettings ? (
        <main className={`som-kernel-main-modern ${viewMode === 'maintenance' ? 'som-mode-maintenance' : ''}`}>
          {activeTab === 'overview' && (
          <NutCrackingSeparationTab
            svgRef={svgRef}
            viewMode={viewMode}
            configMode={configMode}
            handleMouseMove={handleMouseMove}
            handleEquipmentClick={handleEquipmentClick}
            kernelStatus={kernelStatus}
            lv={lv}
          />
        )}

        {activeTab === 'nut_cracking' && (
          <KernelSeparationDryingTab
            svgRef={svgRef}
            viewMode={viewMode}
            configMode={configMode}
            handleMouseMove={handleMouseMove}
            handleEquipmentClick={handleEquipmentClick}
            kernelStatus={kernelStatus}
            lv={lv}
          />
        )}

        {activeTab === 'kernel_storage' && (
          <KernelStorageDispatchTab
            svgRef={svgRef}
            viewMode={viewMode}
            configMode={configMode}
            handleMouseMove={handleMouseMove}
            handleEquipmentClick={handleEquipmentClick}
            kernelStatus={kernelStatus}
            lv={lv}
          />
        )}
        </main>
      ) : (
        <KernelPlantSettingsPage
          onClose={() => setShowSettings(false)}
          configMode={configMode}
          handleEquipmentClick={handleTagEditRequest}
          tagMap={tagMap}
          getLiveValue={getLiveValue}
        />
      )}
      
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

export default KernelStationPage
