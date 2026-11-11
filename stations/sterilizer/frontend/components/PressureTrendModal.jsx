import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import "./PressureTrendModal.css";

const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function PressureTrendModal({
  isOpen,
  onClose,
  title = "ST1 Pressure",
  lineKey = "s1", // "s1", "s2", "s3", "s4", "bpv"
  currentValue = "0.0",
  unit = "Bar",
  type = "pressure", // "pressure" | "temperature"
  anchorPos = null, // { top, left, right, bottom, width, height }
  cachedTrendData = null,
  onMouseEnter,
  onMouseLeave,
}) {
  const isTemperature = type === "temperature" || unit === "°C" || String(title).toLowerCase().includes("temp");
  const MAX_SCALE = isTemperature ? 250 : 4.0;
  const effectiveUnit = isTemperature ? "°C" : (unit || "Bar");

  const [period, setPeriod] = useState("5H");
  const [trendData, setTrendData] = useState(() => {
    if (cachedTrendData && Array.isArray(cachedTrendData) && cachedTrendData.length > 0) {
      return cachedTrendData;
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  // Sync cached trend data jika berubah
  useEffect(() => {
    if (cachedTrendData && Array.isArray(cachedTrendData) && cachedTrendData.length > 0) {
      setTrendData(cachedTrendData);
    }
  }, [cachedTrendData]);

  // Fetch real historical data for this line
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        if (!trendData || trendData.length === 0) {
          setLoading(true);
        }
        const res = await fetch(`/api/sterilizer/monitor/historical?period=${period}&type=${isTemperature ? "temperature" : "pressure"}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && json.data) {
            const rawArr = json.data[lineKey] || json.data.s1 || [];
            if (rawArr.length > 0) {
              setTrendData(rawArr);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load pressure trend data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s live polling
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, lineKey, period, isTemperature]);

  // Layout coordinate parameters for SVG chart
  const PADDING_LEFT = 38;
  const PADDING_RIGHT = 18;
  const PADDING_TOP = 12;
  const PADDING_BOTTOM = 34;
  const SVG_WIDTH = 520;
  const SVG_HEIGHT = 195;

  const PLOT_WIDTH = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const PLOT_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const MAX_PRESSURE = 4.0;

  // Compute anchored floating position on screen
  const popoverPositionStyle = useMemo(() => {
    if (!anchorPos) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const POPOVER_WIDTH = 560;
    const POPOVER_HEIGHT = 280;
    const margin = 14;

    let left = anchorPos.right + margin;
    let top = anchorPos.top - 15;

    // If card overflows on right, place it on the left of anchor
    if (left + POPOVER_WIDTH > window.innerWidth - 12) {
      left = Math.max(12, anchorPos.left - POPOVER_WIDTH - margin);
    }

    // Keep within vertical bounds
    if (top + POPOVER_HEIGHT > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - POPOVER_HEIGHT - 12);
    }
    if (top < 12) top = 12;

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
    };
  }, [anchorPos]);

  // Generate X-Axis timestamps based on period
  const xLabels = useMemo(() => {
    const labels = [];
    const now = Date.now();
    let durationMs = 5 * 3600 * 1000;
    let stepCount = 10;

    if (period === "2H") {
      durationMs = 2 * 3600 * 1000;
      stepCount = 8;
    } else if (period === "5H") {
      durationMs = 5 * 3600 * 1000;
      stepCount = 10;
    } else if (period === "8H") {
      durationMs = 8 * 3600 * 1000;
      stepCount = 8;
    } else if (period === "D") {
      durationMs = 24 * 3600 * 1000;
      stepCount = 12;
    }

    const startTime = now - durationMs;
    const stepMs = durationMs / stepCount;

    for (let i = 0; i <= stepCount; i++) {
      const d = new Date(startTime + i * stepMs);
      labels.push({
        time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":"),
        x: PADDING_LEFT + (i / stepCount) * PLOT_WIDTH,
      });
    }
    return labels;
  }, [period, PLOT_WIDTH, PADDING_LEFT]);

  // Data yang akan di-render: prioritaskan trendData, lalu cachedTrendData, fallback nilai saat ini
  // OPSI 1: Preservasi seluruh riwayat grafik lama, suntikkan nilai realtime card ke titik ujung kanan grafik
  const effectiveData = useMemo(() => {
    let base = null;
    if (trendData && trendData.length > 0) {
      base = trendData;
    } else if (cachedTrendData && Array.isArray(cachedTrendData) && cachedTrendData.length > 0) {
      base = cachedTrendData;
    }

    const numVal = parseFloat(currentValue);
    const hasLiveVal = !isNaN(numVal) && isFinite(numVal);
    const safeLiveVal = hasLiveVal ? numVal : 0;

    if (base && base.length > 0) {
      // Salin array historis lengkap agar data grafik yang lama 100% terjaga dan tidak hilang
      const arr = [...base];
      // OPSI 1: Kunci titik paling kanan (ujung grafik) dengan nilai realtime card saat ini
      if (hasLiveVal) {
        arr[arr.length - 1] = safeLiveVal;
      }
      return arr;
    }

    return new Array(60).fill(safeLiveVal);
  }, [trendData, cachedTrendData, currentValue]);

  // Transform data points to SVG coordinates
  const { points, polylinePoints, areaPathD, orangeDots } = useMemo(() => {
    if (!effectiveData || effectiveData.length === 0) {
      return { points: [], polylinePoints: "", areaPathD: "", orangeDots: [] };
    }

    const n = effectiveData.length;
    const pts = effectiveData.map((val, idx) => {
      const clamped = Math.max(0, Math.min(MAX_SCALE, Number(val) || 0));
      const x = PADDING_LEFT + (idx / Math.max(1, n - 1)) * PLOT_WIDTH;
      // Berikan offset 2px agar kurva di nilai 0.0 tetap terlihat jelas di atas garis sumbu bawah
      const y = PADDING_TOP + PLOT_HEIGHT - 2 - (clamped / MAX_SCALE) * (PLOT_HEIGHT - 4);
      return { x, y, val: clamped, rawVal: val, idx };
    });

    const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    // Area Path
    const first = pts[0];
    const last = pts[pts.length - 1];
    const bottomY = (PADDING_TOP + PLOT_HEIGHT).toFixed(1);
    const areaD = `M ${first.x.toFixed(1)},${bottomY} L ${polyline} L ${last.x.toFixed(1)},${bottomY} Z`;

    // Detect Peaks / Key Transition points for Orange Dots
    const dots = [];
    if (pts.length > 0) {
      dots.push(pts[0]);

      for (let i = 2; i < pts.length - 2; i++) {
        const prev = pts[i - 1].val;
        const curr = pts[i].val;
        const next = pts[i + 1].val;

        const isPeak = curr >= 0.5 && curr >= prev && curr >= next && (curr > prev || curr > next);
        const isStepChange = Math.abs(curr - prev) > 0.8 && curr > 0.3;

        if (isPeak || isStepChange) {
          const lastDot = dots[dots.length - 1];
          if (!lastDot || Math.abs(pts[i].x - lastDot.x) > 28) {
            dots.push(pts[i]);
          }
        }
      }

      if (dots.length <= 2) {
        const step = Math.max(1, Math.floor(pts.length / 8));
        for (let i = step; i < pts.length - 1; i += step) {
          if (!dots.some((d) => Math.abs(d.x - pts[i].x) < 20)) {
            dots.push(pts[i]);
          }
        }
      }

      if (dots[dots.length - 1] !== pts[pts.length - 1]) {
        dots.push(pts[pts.length - 1]);
      }
    }

    return {
      points: pts,
      polylinePoints: polyline,
      areaPathD: areaD,
      orangeDots: dots,
    };
  }, [effectiveData, PLOT_WIDTH, PLOT_HEIGHT, PADDING_LEFT, PADDING_TOP, MAX_SCALE]);

  const handleMouseMove = useCallback(
    (e) => {
      if (!svgRef.current || points.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const svgX = (clientX / rect.width) * SVG_WIDTH;

      const clampedX = Math.max(PADDING_LEFT, Math.min(PADDING_LEFT + PLOT_WIDTH, svgX));
      const ratio = (clampedX - PADDING_LEFT) / PLOT_WIDTH;
      const idx = Math.round(ratio * (points.length - 1));
      setHoverIndex(idx);
    },
    [points, PLOT_WIDTH, PADDING_LEFT, SVG_WIDTH]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const isLine1 = lineKey === "s1" || String(title).toUpperCase().includes("ST1") || String(title).toUpperCase().includes("LINE 1") || String(title).toUpperCase().includes("PRESSURE 1");
  const lineColor = isLine1 ? "#ef4444" : "#2563eb";
  const gradientId = isLine1 ? "somPressureGradientLine1" : "somPressureGradient";

  const getPointTime = useCallback(
    (idx, total) => {
      if (!total || total <= 1) return "";
      const now = Date.now();
      let durationMs = 5 * 3600 * 1000;
      if (period === "2H") durationMs = 2 * 3600 * 1000;
      else if (period === "5H") durationMs = 5 * 3600 * 1000;
      else if (period === "8H") durationMs = 8 * 3600 * 1000;
      else if (period === "D") durationMs = 24 * 3600 * 1000;

      const startTime = now - durationMs;
      const pointTime = new Date(startTime + (idx / (total - 1)) * durationMs);
      return pointTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
    },
    [period]
  );

  const activeHoverPoint = useMemo(() => {
    if (points.length === 0) return null;
    if (hoverIndex !== null && points[hoverIndex]) {
      return {
        ...points[hoverIndex],
        time: getPointTime(hoverIndex, points.length),
      };
    }
    // Khusus Line 1: otomatis aktifkan titik data terkini (ujung kanan) saat baru disenggol
    if (isLine1) {
      const lastIdx = points.length - 1;
      return {
        ...points[lastIdx],
        time: getPointTime(lastIdx, points.length),
      };
    }
    return null;
  }, [points, hoverIndex, isLine1, getPointTime]);

  if (!isOpen) return null;

  const yTicks = isTemperature
    ? [250, 200, 150, 100, 50, 0]
    : [4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0];

  return createPortal(
    <div className="som-pressure-trend-overlay">
      <div
        className="som-pressure-trend-card"
        style={popoverPositionStyle}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => { onMouseEnter && onMouseEnter(e); }}
        onMouseLeave={(e) => { onMouseLeave && onMouseLeave(e); }}
      >
        {/* TOP HEADER KUNING / AMBER */}
        <div className="som-pressure-trend-header">
          <div className="som-pressure-trend-title-area">
            <span className="som-pressure-trend-title">
              {isTemperature ? "TEMPERATURE TREND" : "PRESSURE TREND"}
            </span>
            <span className="som-pressure-trend-subtitle">{title}</span>
          </div>

          <div className="som-pressure-trend-right">
            <div className="som-pressure-trend-current">
              <div className="som-live-dot" />
              <span>
                Current: {currentValue ? String(currentValue).trim() : "0.0"} {effectiveUnit}
              </span>
            </div>

            <button className="som-pressure-trend-close-btn" onClick={onClose} title="Tutup">
              ✕
            </button>
          </div>
        </div>

        {/* BODY DENGAN GRAFIK PUTIH */}
        <div className="som-pressure-trend-body">
          <div className="som-pressure-trend-chart-wrapper">
            <svg
              ref={svgRef}
              className="som-pressure-trend-svg"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              preserveAspectRatio="none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="somPressureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
                  <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="somPressureGradientLine1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#f87171" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines & Y Ticks */}
              {yTicks.map((val) => {
                const y = PADDING_TOP + PLOT_HEIGHT - (val / MAX_SCALE) * PLOT_HEIGHT;
                const isZero = val === 0.0;
                return (
                  <g key={val}>
                    {/* Y Axis Label */}
                    <text
                      x={PADDING_LEFT - 6}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fontWeight="700"
                      fill="#475569"
                    >
                      {isTemperature ? val.toFixed(0) : val.toFixed(1)}
                    </text>

                    {/* Horizontal Grid Line */}
                    <line
                      x1={PADDING_LEFT}
                      y1={y}
                      x2={PADDING_LEFT + PLOT_WIDTH}
                      y2={y}
                      stroke={isZero ? "#64748b" : "#cbd5e1"}
                      strokeWidth={isZero ? "2.5" : "1"}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}

              {/* Vertical Y-Axis Line */}
              <line
                x1={PADDING_LEFT}
                y1={PADDING_TOP}
                x2={PADDING_LEFT}
                y2={PADDING_TOP + PLOT_HEIGHT}
                stroke="#64748b"
                strokeWidth="2"
              />

              {/* Vertical Grid Lines & X-Axis Timestamps */}
              {xLabels.map((lbl, idx) => (
                <g key={idx}>
                  <line
                    x1={lbl.x}
                    y1={PADDING_TOP}
                    x2={lbl.x}
                    y2={PADDING_TOP + PLOT_HEIGHT}
                    stroke={isLine1 ? "#e2e8f0" : "#cbd5e1"}
                    strokeWidth={isLine1 ? "1" : "2.5"}
                    strokeDasharray={isLine1 ? "4 4" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Rotated Time Label */}
                  <text
                    x={lbl.x}
                    y={PADDING_TOP + PLOT_HEIGHT + 12}
                    transform={`rotate(45, ${lbl.x}, ${PADDING_TOP + PLOT_HEIGHT + 12})`}
                    textAnchor="start"
                    fontSize="9.5"
                    fontWeight="600"
                    fill="#475569"
                  >
                    {lbl.time}
                  </text>
                </g>
              ))}

              {/* Trend Gradient Area Fill */}
              {areaPathD && (
                <path d={areaPathD} fill={`url(#${gradientId})`} />
              )}

              {/* Trend Line */}
              {polylinePoints && (
                <polyline
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={isLine1 ? "1.8" : "2.5"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  points={polylinePoints}
                />
              )}

              {/* Orange Marker Dots on Key Peaks (Hanya untuk non-Line 1) */}
              {!isLine1 && orangeDots.map((dot, idx) => (
                <circle
                  key={idx}
                  cx={dot.x}
                  cy={dot.y}
                  r="4"
                  fill="#f97316"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
              ))}

              {/* Indicator Crosshair & Dot ala Trend Tab */}
              {activeHoverPoint && (
                <g>
                  <line
                    x1={activeHoverPoint.x}
                    y1={PADDING_TOP}
                    x2={activeHoverPoint.x}
                    y2={PADDING_TOP + PLOT_HEIGHT}
                    stroke={isLine1 ? "#94a3b8" : "#2563eb"}
                    strokeWidth={isLine1 ? "1" : "2.5"}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={isLine1 ? "4 2" : "4 3"}
                  />
                  <circle
                    cx={activeHoverPoint.x}
                    cy={activeHoverPoint.y}
                    r={isLine1 ? "4.5" : "5"}
                    fill={lineColor}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Popup */}
            {activeHoverPoint && (
              <div
                className="som-trend-tooltip-card"
                style={{
                  left: `${(activeHoverPoint.x / SVG_WIDTH) * 100}%`,
                  top: `${(activeHoverPoint.y / SVG_HEIGHT) * 100}%`,
                  transform:
                    (activeHoverPoint.x / SVG_WIDTH) > 0.65
                      ? "translate(-105%, -115%)"
                      : "translate(5%, -115%)",
                }}
              >
                {isLine1 ? (
                  <div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "2px", fontWeight: "600" }}>
                      {activeHoverPoint.time || "Live"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          backgroundColor: "#ef4444",
                          display: "inline-block",
                        }}
                      />
                      <span>S1 {isTemperature ? "Temperature" : "Pressure"}:</span>
                      <span className="som-trend-tooltip-val" style={{ color: "#fca5a5" }}>
                        {Number(activeHoverPoint.val).toFixed(isTemperature ? 1 : 2)} {effectiveUnit}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "2px", fontWeight: "600" }}>
                      {activeHoverPoint.time || "Live"}
                    </div>
                    <div>
                      {isTemperature ? "Suhu: " : "Tekanan: "}
                      <span className="som-trend-tooltip-val">
                        {Number(activeHoverPoint.val).toFixed(isTemperature ? 1 : 2)} {effectiveUnit}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER CONTROLS / PERIOD TABS */}
          <div className="som-pressure-trend-footer">
            <div className="som-pressure-trend-info">
              Historical Realtime Data ({period})
            </div>

            <div className="som-pressure-trend-period-tabs">
              {["2H", "5H", "8H", "D"].map((p) => (
                <button
                  key={p}
                  className={`som-period-tab-btn ${period === p ? "active" : ""}`}
                  onClick={() => setPeriod(p)}
                >
                  {p === "2H" ? "2 Jam" : p === "5H" ? "5 Jam" : p === "8H" ? "8 Jam" : "24 Jam"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
