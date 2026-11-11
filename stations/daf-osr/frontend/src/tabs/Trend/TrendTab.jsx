import React, { useState, useEffect, useCallback, useMemo } from "react";
import usePlcStore from "@core/store";
import "./TrendTab.css";

const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// 10 Dedicated Trend Points di DAF / OSR Station
export const DAF_TREND_POINTS = [
  {
    key: "air_compressor",
    name: "Air Compressor",
    category: "Pressure",
    unit: "Bar",
    color: "#3b82f6",
    maxScale: 15,
    ticks: [15, 12, 9, 6, 3, 0],
    equipment: "compressor_pressure",
    signalKey: "PRESSURE",
    decimals: 2,
  },
  {
    key: "ae_tank",
    name: "AE Tank",
    category: "Pressure",
    unit: "Bar",
    color: "#0284c7",
    maxScale: 15,
    ticks: [15, 12, 9, 6, 3, 0],
    equipment: "ae_tank",
    signalKey: "PRESSURE",
    decimals: 2,
  },
  {
    key: "water_level_pv",
    name: "Water Level PV",
    category: "Level",
    unit: "%",
    color: "#06b6d4",
    maxScale: 100,
    ticks: [100, 80, 60, 40, 20, 0],
    equipment: "water_level",
    signalKey: "PV",
    decimals: 1,
  },
  {
    key: "chiller_in",
    name: "Chiller In (C)",
    category: "Temperature",
    unit: "°C",
    color: "#3b82f6",
    maxScale: 100,
    ticks: [100, 80, 60, 40, 20, 0],
    equipment: "chiller",
    signalKey: "INLET_TEMP",
    decimals: 1,
  },
  {
    key: "chiller_mid",
    name: "Chiller Mid (C)",
    category: "Temperature",
    unit: "°C",
    color: "#f59e0b",
    maxScale: 100,
    ticks: [100, 80, 60, 40, 20, 0],
    equipment: "chiller",
    signalKey: "MID_TEMP",
    decimals: 1,
  },
  {
    key: "chiller_out",
    name: "Chiller Out (C)",
    category: "Temperature",
    unit: "°C",
    color: "#ef4444",
    maxScale: 100,
    ticks: [100, 80, 60, 40, 20, 0],
    equipment: "chiller",
    signalKey: "OUTLET_TEMP",
    decimals: 1,
  },
  {
    key: "ae_inlet_flow_pv",
    name: "AE Inlet Flow PV",
    category: "Flow",
    unit: "m³/h",
    color: "#10b981",
    maxScale: 40,
    ticks: [40, 30, 20, 10, 0],
    equipment: "ae_inlet_flow",
    signalKey: "PV",
    decimals: 2,
  },
  {
    key: "skimmer_hz",
    name: "Skimmer (Hz)",
    category: "Speed",
    unit: "Hz",
    color: "#8b5cf6",
    maxScale: 50,
    ticks: [50, 40, 30, 20, 10, 0],
    equipment: "skimmer",
    signalKey: "SPEED",
    decimals: 1,
  },
  {
    key: "skimmer_amp",
    name: "Skimmer (A)",
    category: "Current",
    unit: "A",
    color: "#ec4899",
    maxScale: 20,
    ticks: [20, 15, 10, 5, 0],
    equipment: "skimmer",
    signalKey: "CURRENT",
    decimals: 1,
  },
  {
    key: "mt_inlet_flow_pv",
    name: "MT Inlet Flow PV",
    category: "Flow",
    unit: "m³/h",
    color: "#059669",
    maxScale: 40,
    ticks: [40, 30, 20, 10, 0],
    equipment: "mt_inlet_flow",
    signalKey: "PV",
    decimals: 2,
  },
];

export default function TrendTab({ user, configMode = false }) {
  const [selectedPointKey, setSelectedPointKey] = useState("air_compressor");
  const [trendPeriod, setTrendPeriod] = useState("5H");
  const [trendOffset, setTrendOffset] = useState(0);
  const [hoverData, setHoverData] = useState(null);

  const { tags } = usePlcStore();
  const [realtimeData, setRealtimeData] = useState({});
  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);

  const activePoint = useMemo(() => {
    return DAF_TREND_POINTS.find((p) => p.key === selectedPointKey) || DAF_TREND_POINTS[0];
  }, [selectedPointKey]);

  // Load PLC tags & station mappings
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const [mapRes, tagsRes] = await Promise.all([
          fetch("/api/daf-osr/plc-config/station-mappings", { headers: authHeaders() }),
          fetch("/api/daf-osr/plc-config/tags", { headers: authHeaders() }),
        ]);
        if (mapRes.ok && tagsRes.ok && isMounted) {
          const mapJson = await mapRes.json();
          const tagsJson = await tagsRes.json();
          setTagMap(mapJson.data || {});
          setAvailableTags(tagsJson.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch PLC config for TrendTab", err);
      }
    };
    fetchConfig();
    return () => { isMounted = false; };
  }, []);

  // Poll realtime data fallback
  useEffect(() => {
    let isMounted = true;
    const pollRealtime = async () => {
      try {
        const res = await fetch("/api/daf-osr/monitor/realtime", { headers: authHeaders() });
        if (res.ok && isMounted) {
          const json = await res.json();
          setRealtimeData(json.data || {});
        }
      } catch (err) {
        // silent fail
      }
    };
    pollRealtime();
    const interval = setInterval(pollRealtime, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Helper untuk membaca nilai mapped live
  const getMappedValue = useCallback((eq, signalKey, decimals = 2, fallback = "--") => {
    const key = `${eq}__${signalKey}`;
    const tagId = tagMap[key];
    if (!tagId) return fallback;

    const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
    if (!tagObj) return fallback;

    const val = tags[tagObj.tag_name]?.value !== undefined
      ? tags[tagObj.tag_name].value
      : realtimeData[tagObj.tag_name];

    if (val === undefined || val === null || val === "") return fallback;
    const num = parseFloat(val);
    return !isNaN(num) ? num.toFixed(decimals) : String(val);
  }, [tagMap, availableTags, tags, realtimeData]);

  // Kalkulasi Rentang Waktu Historis
  const getTrendTimeRange = useCallback(() => {
    const now = Date.now();
    let stepMs = 5 * 60 * 60 * 1000;
    if (trendPeriod === "2H") stepMs = 2 * 60 * 60 * 1000;
    else if (trendPeriod === "8H") stepMs = 8 * 60 * 60 * 1000;
    else if (trendPeriod === "D") stepMs = 24 * 60 * 60 * 1000;

    const end = now - (trendOffset * (stepMs / 4));
    const start = end - stepMs;
    return { start, end };
  }, [trendPeriod, trendOffset]);

  // Label sumbu X
  const getXAxisLabels = useCallback(() => {
    const { start, end } = getTrendTimeRange();
    const count = 6;
    const step = (end - start) / (count - 1);
    const labels = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start + i * step);
      labels.push(
        d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")
      );
    }
    return labels;
  }, [getTrendTimeRange]);

  // Data Trend Historis Dedicated untuk Parameter Aktif
  const [trendData, setTrendData] = useState({
    resolution: 300,
    series: [],
  });

  useEffect(() => {
    let isMounted = true;
    let timer = null;

    const fetchHistorical = async () => {
      try {
        const { start, end } = getTrendTimeRange();
        const url = `/api/daf-osr/monitor/historical?start=${start}&end=${end}&period=${trendPeriod}&paramKey=${selectedPointKey}`;
        const res = await fetch(url, { headers: authHeaders() });
        if (res.ok && isMounted) {
          const json = await res.json();
          const seriesArr = json.data?.series || json.data?.[selectedPointKey] || [];
          setTrendData({
            resolution: json.data?.resolution || 300,
            series: seriesArr,
          });
        }
      } catch (err) {
        console.error("Failed to fetch historical trend data", err);
      }
    };

    fetchHistorical();
    if (trendOffset === 0) {
      timer = setInterval(fetchHistorical, 10000);
    }

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [trendPeriod, trendOffset, selectedPointKey, getTrendTimeRange]);

  const resolution = trendData.resolution || 300;
  const seriesValues = trendData.series || [];

  // Hitung Quick Stats: Min, Max, Average
  const stats = useMemo(() => {
    if (!seriesValues || seriesValues.length === 0) {
      return { min: "0.00", max: "0.00", avg: "0.00" };
    }
    const valid = seriesValues.filter((v) => typeof v === "number" && !isNaN(v));
    if (valid.length === 0) return { min: "0.00", max: "0.00", avg: "0.00" };

    const minVal = Math.min(...valid);
    const maxVal = Math.max(...valid);
    const avgVal = valid.reduce((a, b) => a + b, 0) / valid.length;

    return {
      min: minVal.toFixed(activePoint.decimals),
      max: maxVal.toFixed(activePoint.decimals),
      avg: avgVal.toFixed(activePoint.decimals),
    };
  }, [seriesValues, activePoint]);

  // Mouse hover event
  const handleTrendMouseMove = (e) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(e.clientX - svgRect.left, svgRect.width));
    const normalizedX = mouseX / svgRect.width;
    const dataIndex = Math.floor(normalizedX * (resolution - 1));

    const { start, end } = getTrendTimeRange();
    const timestampMs = start + (dataIndex / (resolution - 1)) * (end - start);
    const dateObj = new Date(timestampMs);

    const timeStr = dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).replace(/\./g, ":");

    const val = seriesValues[dataIndex];
    if (val === null || val === undefined || isNaN(val)) {
      setHoverData(null);
      return;
    }

    setHoverData({
      index: dataIndex,
      left: mouseX,
      timestamp: timeStr,
      value: val,
    });
  };

  const handleTrendMouseLeave = () => setHoverData(null);

  // SVG Points
  const pointsStr = useMemo(() => {
    if (!seriesValues || seriesValues.length === 0) return "";
    const hasData = seriesValues.some(
      (v) => v !== null && v !== undefined && !isNaN(v)
    );
    if (!hasData) return "";

    return seriesValues
      .map((val, i) => {
        if (val === null || val === undefined || isNaN(val)) return null;
        const xPos = (i / (resolution - 1 || 1)) * 1000;
        const yPos = Math.max(0, Math.min(300, 300 - (val / activePoint.maxScale) * 300));
        return `${xPos},${yPos}`;
      })
      .filter(Boolean)
      .join(" ");
  }, [seriesValues, resolution, activePoint]);

  return (
    <div className="som-daf-trend-layout">
      {/* ====================================================================
          1. SIDEBAR KIRI: DAFTAR 10 PARAMETER DENGAN LIVE VALUES
          ==================================================================== */}
      <aside className="som-trend-sidebar">
        <div className="som-trend-sidebar-header">
          <span className="som-trend-sidebar-title">PARAMETER TRENDS</span>
        </div>

        <div className="som-trend-sidebar-list">
          {DAF_TREND_POINTS.map((item) => {
            const isSelected = item.key === selectedPointKey;
            const liveVal = getMappedValue(item.equipment, item.signalKey, item.decimals);

            return (
              <button
                key={item.key}
                type="button"
                className={`som-trend-sidebar-item ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedPointKey(item.key)}
              >
                <div className="som-trend-item-info">
                  <span className="som-trend-item-name">{item.name}</span>
                  <span className="som-trend-item-sub">{item.category} • {item.unit}</span>
                </div>
                <div className="som-trend-item-value-box">
                  <span className="som-trend-item-val">{liveVal}</span>
                  <span className="som-trend-item-unit">{item.unit}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ====================================================================
          2. AREA KANAN: GRAFIK DEDICATED PARAMETER TERPILIH
          ==================================================================== */}
      <main className="som-trend-main-area">
        <div className="som-trend-graph-main">
          {/* Header Row: Judul Parameter Aktif, Date Stamp & Periode Filter */}
          <div className="som-trend-header-row">
            <div className="som-trend-active-meta">
              <span className="som-trend-color-pill" style={{ background: activePoint.color }} />
              <span className="som-trend-active-title">
                {activePoint.name}
              </span>
              <span className="som-trend-date-stamp">
                {(() => {
                  const { start, end } = getTrendTimeRange();
                  const dEnd = new Date(end);
                  const dateStr = dEnd.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const tEnd = dEnd.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");

                  if (trendOffset === 0) {
                    return `• ${dateStr} ${tEnd} (LIVE)`;
                  }
                  const dStart = new Date(start);
                  const tStart = dStart.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
                  return `• ${dateStr} [${tStart} - ${tEnd}] (HISTORIS)`;
                })()}
              </span>
            </div>

            {/* Filter Periode Cepat 2H, 5H, 8H, D */}
            <div className="som-trend-period-pill-group">
              {["2H", "5H", "8H", "D"].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`som-period-btn-inline ${trendPeriod === p ? "active" : ""}`}
                  onClick={() => {
                    setTrendOffset(0);
                    setTrendPeriod(p);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Sumbu Y & Plot Area */}
          <div className="som-trend-body-row">
            {/* Sumbu Y */}
            <div className="som-trend-y-axis">
              <div className="som-trend-y-label">
                {activePoint.unit} {activePoint.name}
              </div>
              <div className="som-trend-y-ticks">
                {activePoint.ticks.map((t) => (
                  <span
                    key={t}
                    className="som-y-tick"
                    style={{
                      top: `${((activePoint.maxScale - t) / activePoint.maxScale) * 100}%`,
                      ...(t >= activePoint.maxScale ? { transform: "translateY(2px)" } : {}),
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Canvas SVG Grafik */}
            <div
              className="som-trend-plot-wrapper"
              onMouseLeave={handleTrendMouseLeave}
            >
              <svg
                className="som-trend-svg"
                viewBox="0 0 1000 300"
                preserveAspectRatio="none"
                onMouseMove={handleTrendMouseMove}
              >
                {/* Grid Horizontal */}
                {activePoint.ticks.map((val) => {
                  const yPos = 300 - (val / activePoint.maxScale) * 300;
                  return (
                    <line
                      key={val}
                      x1="0"
                      y1={yPos}
                      x2="1000"
                      y2={yPos}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Grid Vertikal */}
                {getXAxisLabels().map((_, i, arr) => (
                  <line
                    key={i}
                    x1={(i / (arr.length - 1 || 1)) * 1000}
                    y1="0"
                    x2={(i / (arr.length - 1 || 1)) * 1000}
                    y2="300"
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Garis Kurva Utama */}
                {pointsStr && (
                  <polyline
                    fill="none"
                    stroke={activePoint.color}
                    strokeWidth="2.2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={pointsStr}
                  />
                )}

                {/* Hover Crosshair & Circle Dot */}
                {hoverData && (
                  <g>
                    <line
                      x1={(hoverData.index / (resolution - 1 || 1)) * 1000}
                      y1="0"
                      x2={(hoverData.index / (resolution - 1 || 1)) * 1000}
                      y2="300"
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                    <circle
                      cx={(hoverData.index / (resolution - 1 || 1)) * 1000}
                      cy={Math.max(0, Math.min(300, 300 - (hoverData.value / activePoint.maxScale) * 300))}
                      r="5"
                      fill={activePoint.color}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                  </g>
                )}
              </svg>

              {/* Tooltip Card Mengambang */}
              {hoverData && (
                <div
                  className="som-trend-tooltip-card"
                  style={{
                    left: `${hoverData.left}px`,
                    transform:
                      hoverData.index > resolution * 0.7
                        ? "translateX(-105%)"
                        : "translateX(5%)",
                  }}
                >
                  <div className="tooltip-header">
                    {hoverData.timestamp}
                  </div>
                  <div className="tooltip-body">
                    <div className="tooltip-row">
                      <span className="label">{activePoint.name}:</span>
                      <span className="value">
                        {hoverData.value !== undefined ? Number(hoverData.value).toFixed(activePoint.decimals) : "0.00"} {activePoint.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sumbu X Bawah */}
          <div className="som-trend-x-axis-row">
            <div className="som-trend-y-axis-spacer"></div>
            <div className="som-trend-x-axis">
              {getXAxisLabels().map((label, idx) => (
                <span key={idx}>{label}</span>
              ))}
            </div>
          </div>

          {/* Timeline Controller Historis */}
          <div className="som-trend-timeline-controller">
            <button
              type="button"
              className="som-timeline-nav-btn"
              disabled={trendOffset >= 24}
              onClick={() => setTrendOffset((prev) => Math.min(24, prev + 1))}
              title="Mundur ke waktu sebelumnya"
            >
              ◀ Previous
            </button>

            <div className="som-timeline-slider-container">
              <span className="som-slider-time-label">
                {(() => {
                  const { start } = getTrendTimeRange();
                  const d = new Date(start);
                  return `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")}`;
                })()}
              </span>
              <input
                type="range"
                className="som-timeline-range-slider"
                min="0"
                max="24"
                value={24 - trendOffset}
                onChange={(e) => setTrendOffset(24 - Number(e.target.value))}
              />
              <span className="som-slider-time-label">
                {(() => {
                  const { end } = getTrendTimeRange();
                  const d = new Date(end);
                  return `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")}`;
                })()}
              </span>
            </div>

            <button
              type="button"
              className="som-timeline-nav-btn"
              disabled={trendOffset === 0}
              onClick={() => setTrendOffset((prev) => Math.max(0, prev - 1))}
              title="Maju ke waktu setelahnya"
            >
              Next ▶
            </button>

            <button
              type="button"
              className={`som-timeline-live-btn ${trendOffset === 0 ? "live-active" : ""}`}
              onClick={() => setTrendOffset(0)}
            >
              <span className="live-dot"></span> Latest
            </button>
          </div>
        </div>

        {/* ====================================================================
            3. FOOTER QUICK STATS: CURRENT, MIN, MAX, AVERAGE
            ==================================================================== */}
        <div className="som-trend-stats-footer">
          <div className="som-trend-stat-box">
            <span className="som-stat-label">CURRENT LIVE VALUE</span>
            <div className="som-stat-val-row">
              <span className="som-stat-val" style={{ color: activePoint.color }}>
                {getMappedValue(activePoint.equipment, activePoint.signalKey, activePoint.decimals)}
              </span>
              <span className="som-stat-unit">{activePoint.unit}</span>
            </div>
          </div>

          <div className="som-trend-stat-box">
            <span className="som-stat-label">MINIMUM ({trendPeriod})</span>
            <div className="som-stat-val-row">
              <span className="som-stat-val">{stats.min}</span>
              <span className="som-stat-unit">{activePoint.unit}</span>
            </div>
          </div>

          <div className="som-trend-stat-box">
            <span className="som-stat-label">MAXIMUM ({trendPeriod})</span>
            <div className="som-stat-val-row">
              <span className="som-stat-val">{stats.max}</span>
              <span className="som-stat-unit">{activePoint.unit}</span>
            </div>
          </div>

          <div className="som-trend-stat-box">
            <span className="som-stat-label">AVERAGE ({trendPeriod})</span>
            <div className="som-stat-val-row">
              <span className="som-stat-val">{stats.avg}</span>
              <span className="som-stat-unit">{activePoint.unit}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
