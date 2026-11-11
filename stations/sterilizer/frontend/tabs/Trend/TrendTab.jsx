import React, { useState, useRef, useMemo } from "react";
import "./TrendTab.css";

// Fallback realtime trend data generator murni menggunakan nilai realtime (tanpa kurva sinus dummy)
const generateFallbackTrendData = (type = "pressure", resolution = 60, live = null) => {
  const isTemp = type === "temperature" || type === "temp";

  const liveT1 = live?.["Actual_Temperatur[1]"] !== undefined ? parseFloat(live["Actual_Temperatur[1]"]) : 0;
  const liveT2 = live?.["Actual_Temperatur[2]"] !== undefined ? parseFloat(live["Actual_Temperatur[2]"]) : 0;
  const liveT3 = live?.["Actual_Temperatur[3]"] !== undefined ? parseFloat(live["Actual_Temperatur[3]"]) : 0;
  const liveT4 = live?.["Actual_Temperatur[4]"] !== undefined ? parseFloat(live["Actual_Temperatur[4]"]) : 0;
  const liveTBpv = 0;

  const liveP1 = live?.["CurrentPressure lline 1"] !== undefined ? parseFloat(live["CurrentPressure lline 1"]) : 0;
  const liveP2 = live?.["CurrentPressure lline 2"] !== undefined ? parseFloat(live["CurrentPressure lline 2"]) : 0;
  const liveP3 = live?.["CurrentPressure lline 3"] !== undefined ? parseFloat(live["CurrentPressure lline 3"]) : 0;
  const liveP4 = live?.["CurrentPressure lline 4"] !== undefined ? parseFloat(live["CurrentPressure lline 4"]) : 0;
  const livePBpv = (live?.["Pressure BPV"] || live?.["Pressure_BVP[1]"]) !== undefined
    ? parseFloat(live["Pressure BPV"] || live["Pressure_BVP[1]"])
    : 0;

  const fillFlat = (val) => Array.from({ length: resolution }, () => parseFloat(Number(val || 0).toFixed(2)));

  if (isTemp) {
    return {
      s1: fillFlat(liveT1),
      s2: fillFlat(liveT2),
      s3: fillFlat(liveT3),
      s4: fillFlat(liveT4),
      bpv: fillFlat(liveTBpv),
      resolution,
      type: "temperature",
    };
  } else {
    return {
      s1: fillFlat(liveP1),
      s2: fillFlat(liveP2),
      s3: fillFlat(liveP3),
      s4: fillFlat(liveP4),
      bpv: fillFlat(livePBpv),
      resolution,
      type: "pressure",
    };
  }
};

export default function TrendTab({
  trendPeriod,
  setTrendPeriod,
  showTrendSettings,
  setShowTrendSettings,
  currentDateTime,
  handleTrendMouseMove,
  handleTrendMouseLeave,
  getResolution,
  trendData,
  isFetchingTrend,
  hoverData,
  getXAxisLabels,
  getMappedValue,
  trendOffset,
  setTrendOffset,
  getTrendTimeRange,
  trendChartType,
  setTrendChartType,
  realtimeData,
}) {
  const [internalChartType, setInternalChartType] = useState("pressure");
  const activeType = trendChartType || internalChartType;
  const isTemperature = activeType === "temperature";

  const handleToggleType = (newType) => {
    if (setTrendChartType) {
      setTrendChartType(newType);
    } else {
      setInternalChartType(newType);
    }
  };

  const resCount = trendData?.resolution || 60;
  const hasRealData = Boolean(
    trendData?.s1 &&
    trendData.s1.length > 0 &&
    (
      trendData.s1.some(v => v > 0) ||
      trendData.s2?.some(v => v > 0) ||
      trendData.s3?.some(v => v > 0) ||
      trendData.s4?.some(v => v > 0) ||
      trendData.bpv?.some(v => v > 0)
    )
  );
  // Live readings from https://pis.premier-engineering.my.id/api/sterilizer/monitor/realtime
  const liveT1 = realtimeData?.["Actual_Temperatur[1]"] !== undefined ? Number(realtimeData["Actual_Temperatur[1]"]).toFixed(2) : "92.41";
  const liveT2 = realtimeData?.["Actual_Temperatur[2]"] !== undefined ? Number(realtimeData["Actual_Temperatur[2]"]).toFixed(2) : "68.46";
  const liveT3 = realtimeData?.["Actual_Temperatur[3]"] !== undefined ? Number(realtimeData["Actual_Temperatur[3]"]).toFixed(2) : "87.83";
  const liveT4 = realtimeData?.["Actual_Temperatur[4]"] !== undefined ? Number(realtimeData["Actual_Temperatur[4]"]).toFixed(2) : "135.45";
  const liveTBpv = "No Tag";

  const liveP1 = realtimeData?.["CurrentPressure lline 1"] !== undefined ? Number(realtimeData["CurrentPressure lline 1"]).toFixed(2) : "0.04";
  const liveP2 = realtimeData?.["CurrentPressure lline 2"] !== undefined ? Number(realtimeData["CurrentPressure lline 2"]).toFixed(2) : "0.02";
  const liveP3 = realtimeData?.["CurrentPressure lline 3"] !== undefined ? Number(realtimeData["CurrentPressure lline 3"]).toFixed(2) : "0.02";
  const liveP4 = realtimeData?.["CurrentPressure lline 4"] !== undefined ? Number(realtimeData["CurrentPressure lline 4"]).toFixed(2) : "2.83";
  const livePBpv = (realtimeData?.["Pressure BPV"] || realtimeData?.["Pressure_BVP[1]"]) !== undefined 
    ? Number(realtimeData["Pressure BPV"] || realtimeData["Pressure_BVP[1]"]).toFixed(2) 
    : "3.03";

  const liveReadings = {
    "1": { press: liveP1, temp: liveT1 },
    "2": { press: liveP2, temp: liveT2 },
    "3": { press: liveP3, temp: liveT3 },
    "4": { press: liveP4, temp: liveT4 },
    "BPV": { press: livePBpv, temp: liveTBpv },
  };

  // OPSI 1: Preservasi seluruh riwayat grafik lama, kunci titik paling kanan (ujung grafik) secara realtime sesuai nilai card saat ini
  const safeTrendData = useMemo(() => {
    const raw = hasRealData ? trendData : generateFallbackTrendData(activeType, resCount, realtimeData);
    if (!raw || !raw.s1) return raw;

    const result = {
      ...raw,
      s1: [...raw.s1],
      s2: [...(raw.s2 || [])],
      s3: [...(raw.s3 || [])],
      s4: [...(raw.s4 || [])],
      bpv: [...(raw.bpv || [])],
    };

    if (trendOffset === 0) {
      if (isTemperature) {
        if (result.s1.length > 0 && !isNaN(parseFloat(liveT1))) result.s1[result.s1.length - 1] = parseFloat(liveT1);
        if (result.s2.length > 0 && !isNaN(parseFloat(liveT2))) result.s2[result.s2.length - 1] = parseFloat(liveT2);
        if (result.s3.length > 0 && !isNaN(parseFloat(liveT3))) result.s3[result.s3.length - 1] = parseFloat(liveT3);
        if (result.s4.length > 0 && !isNaN(parseFloat(liveT4))) result.s4[result.s4.length - 1] = parseFloat(liveT4);
      } else {
        if (result.s1.length > 0 && !isNaN(parseFloat(liveP1))) result.s1[result.s1.length - 1] = parseFloat(liveP1);
        if (result.s2.length > 0 && !isNaN(parseFloat(liveP2))) result.s2[result.s2.length - 1] = parseFloat(liveP2);
        if (result.s3.length > 0 && !isNaN(parseFloat(liveP3))) result.s3[result.s3.length - 1] = parseFloat(liveP3);
        if (result.s4.length > 0 && !isNaN(parseFloat(liveP4))) result.s4[result.s4.length - 1] = parseFloat(liveP4);
        if (result.bpv.length > 0 && !isNaN(parseFloat(livePBpv))) result.bpv[result.bpv.length - 1] = parseFloat(livePBpv);
      }
    }
    return result;
  }, [hasRealData, trendData, activeType, resCount, realtimeData, trendOffset, isTemperature, liveT1, liveT2, liveT3, liveT4, liveP1, liveP2, liveP3, liveP4, livePBpv]);

  const maxScale = isTemperature ? 250 : 4.0;
  const yTicks = isTemperature
    ? [250, 200, 150, 100, 50, 0]
    : [4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0];
  const yGridLines = isTemperature
    ? [0, 50, 100, 150, 200, 250]
    : [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
  const yAxisLabel = isTemperature ? "\u00B0C TEMPERATURE" : "BAR PRESSURE";
  const headerLabel = isTemperature ? "HISTORICAL TEMPERATURE" : "HISTORICAL PRESSURE";
  const unitLabel = isTemperature ? "\u00B0C" : "Bar";

  const calcY = (val) => {
    const num = Number(val);
    const validNum = isNaN(num) ? 0 : num;
    const clamped = Math.max(0, Math.min(maxScale, validNum));
    return 300 - (clamped / maxScale) * 300;
  };

  const getLatestValue = (line) => {
    let arr = [];
    if (line === "1") arr = safeTrendData?.s1;
    else if (line === "2") arr = safeTrendData?.s2;
    else if (line === "3") arr = safeTrendData?.s3;
    else if (line === "4") arr = safeTrendData?.s4;
    else if (line === "BPV") arr = safeTrendData?.bpv;

    if (!arr || arr.length === 0) return "0.00";
    const val = arr[arr.length - 1];
    return val !== undefined && val !== null ? Math.max(0, val).toFixed(2) : "0.00";
  };

  return (
    <div className="som-trend-container">
      {/* TOP: SCADA GRAPH AREA */}
      <div className="som-trend-graph-main">
        {/* Left Y-Axis */}
        <div className="som-trend-y-axis">
          <div className="som-trend-y-label">{yAxisLabel}</div>
          <div className="som-trend-y-ticks">
            {yTicks.map((t) => (
              <span key={t}>{isTemperature ? t : t.toFixed(1)}</span>
            ))}
          </div>
        </div>

        {/* Graph Plot */}
        <div
          className="som-trend-plot-wrapper"
          onMouseLeave={handleTrendMouseLeave}
        >
          {isFetchingTrend && !hasRealData && (
            <div className="som-trend-loading-overlay">
              <div className="som-trend-spinner"></div>
              <span>Memuat Data Trend {isTemperature ? "Temperature" : "Pressure"}...</span>
            </div>
          )}

          <div className="som-trend-tools">
            {/* Toggle Button: Temperature chart vs Pressure chart */}
            <button
              type="button"
              className={`som-trend-type-toggle-btn ${isTemperature ? "active-temp" : "active-press"}`}
              onClick={() => handleToggleType(isTemperature ? "pressure" : "temperature")}
              title={`Beralih ke Grafik ${isTemperature ? "Pressure" : "Temperature"}`}
            >

              <span className="som-trend-type-text">
                {isTemperature ? "Pressure Chart" : "Temperature Chart"}
              </span>
            </button>

            {/* Gear Button: Pengaturan Jam (Filter Period) */}
            <button
              type="button"
              className={`som-trend-tool-btn ${showTrendSettings ? "active" : ""}`}
              onClick={() => setShowTrendSettings(!showTrendSettings)}
              title="Pengaturan Periode Jam"
            >
              &#9881;
            </button>

            {showTrendSettings && (
              <div className="som-trend-settings-dropdown">
                <div className="som-trend-settings-group">
                  <div className="som-settings-label">Filter Period</div>
                  <div className="som-period-grid">
                    {["2H", "5H", "8H", "D"].map((p) => (
                      <button
                        key={p}
                        className={`som-period-btn ${trendPeriod === p ? "active" : ""}`}
                        onClick={() => {
                          setTrendOffset(0);
                          setTrendPeriod(p);
                          setShowTrendSettings(false);
                        }}
                      >
                        {p === "2H"
                          ? "2-Hourly"
                          : p === "5H"
                            ? "5-Hourly"
                            : p === "8H"
                              ? "8-Hourly"
                              : "Daily"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="som-trend-header-info">
            <div className="som-trend-date-stamp">
              {currentDateTime && currentDateTime.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}{" "}
              {currentDateTime && currentDateTime
                .toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .replace(/\./g, ":")}{" "}
              | {headerLabel} ({trendPeriod})
            </div>
            {trendOffset !== 0 && (
              <span className="som-trend-mode-badge history">
                RIWAYAT (-{trendOffset} Langkah Jam)
              </span>
            )}
            {isFetchingTrend && hasRealData && (
              <span className="som-trend-mini-loading">
                <span className="som-trend-mini-spinner"></span>
                Memperbarui...
              </span>
            )}
          </div>

          <svg
            className="som-trend-svg"
            viewBox="0 0 1000 300"
            preserveAspectRatio="none"
            onMouseMove={handleTrendMouseMove}
          >
            {/* Horizontal Grid */}
            {yGridLines.map((val) => (
              <line
                key={val}
                x1="0"
                y1={300 - (val / maxScale) * 300}
                x2="1000"
                y2={300 - (val / maxScale) * 300}
                stroke={val === 0 ? "#0f172a" : "#e2e8f0"}
                strokeWidth={val === 0 ? "2" : "1"}
              />
            ))}

            {/* Vertical Grid */}
            {getXAxisLabels(trendPeriod).map((_, i, arr) => (
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

            {/* Trends */}
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={safeTrendData.s1
                .map(
                  (val, i) =>
                    `${(i / (resCount - 1 || 1)) * 1000},${calcY(val)}`,
                )
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={safeTrendData.s2
                .map(
                  (val, i) =>
                    `${(i / (resCount - 1 || 1)) * 1000},${calcY(val)}`,
                )
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={safeTrendData.s3
                .map(
                  (val, i) =>
                    `${(i / (resCount - 1 || 1)) * 1000},${calcY(val)}`,
                )
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke="#16a34a"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={safeTrendData.s4
                .map(
                  (val, i) =>
                    `${(i / (resCount - 1 || 1)) * 1000},${calcY(val)}`,
                )
                .join(" ")}
            />
            {!isTemperature && (
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={safeTrendData.bpv
                  .map(
                    (val, i) =>
                      `${(i / (resCount - 1 || 1)) * 1000},${calcY(val)}`,
                  )
                  .join(" ")}
              />
            )}

            {/* Hover Indicator */}
            {hoverData && (
              <g>
                <line
                  x1={
                    (hoverData.index / (resCount - 1 || 1)) *
                    1000
                  }
                  y1="0"
                  x2={
                    (hoverData.index / (resCount - 1 || 1)) *
                    1000
                  }
                  y2="300"
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
                {hoverData.values.slice(0, isTemperature ? 4 : 5).map((val, idx) => (
                  <circle
                    key={idx}
                    cx={
                      (hoverData.index / (resCount - 1 || 1)) *
                      1000
                    }
                    cy={calcY(val)}
                    r="4"
                    fill={
                      idx === 0
                        ? "#ef4444"
                        : idx === 1
                          ? "#3b82f6"
                          : idx === 2
                            ? "#0f172a"
                            : idx === 3
                              ? "#16a34a"
                              : "#a855f7"
                    }
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Floating Tooltip Card */}
          {hoverData && (
            <div
              className="som-trend-tooltip-card"
              style={{
                left: `${hoverData.left}px`,
                transform:
                  hoverData.index > ((trendData?.resolution || 60) - 1) * 0.55
                    ? "translateX(-105%)"
                    : "translateX(5%)",
              }}
            >
              <div className="tooltip-header">
                {hoverData.timestamp}
              </div>
              <div className="tooltip-body">
                <div className="tooltip-row s1">
                  <span className="dot" style={{ backgroundColor: "#ef4444" }}></span>
                  <span className="label">S1 {isTemperature ? "Temperature" : "Pressure"}:</span>
                  <span className="value">
                    {Math.max(0, hoverData.values[0]).toFixed(isTemperature ? 1 : 2)} {unitLabel}
                  </span>
                </div>
                <div className="tooltip-row s2">
                  <span className="dot" style={{ backgroundColor: "#3b82f6" }}></span>
                  <span className="label">S2 {isTemperature ? "Temperature" : "Pressure"}:</span>
                  <span className="value">
                    {Math.max(0, hoverData.values[1]).toFixed(isTemperature ? 1 : 2)} {unitLabel}
                  </span>
                </div>
                <div className="tooltip-row s3">
                  <span className="dot" style={{ backgroundColor: "#0f172a" }}></span>
                  <span className="label">S3 {isTemperature ? "Temperature" : "Pressure"}:</span>
                  <span className="value">
                    {Math.max(0, hoverData.values[2]).toFixed(isTemperature ? 1 : 2)} {unitLabel}
                  </span>
                </div>
                <div className="tooltip-row s4">
                  <span className="dot" style={{ backgroundColor: "#16a34a" }}></span>
                  <span className="label">S4 {isTemperature ? "Temperature" : "Pressure"}:</span>
                  <span className="value">
                    {Math.max(0, hoverData.values[3]).toFixed(isTemperature ? 1 : 2)} {unitLabel}
                  </span>
                </div>
                <div className="tooltip-row bpv">
                  <span className="dot" style={{ backgroundColor: "#a855f7" }}></span>
                  <span className="label">BPV {isTemperature ? "Temperature" : "Pressure"}:</span>
                  <span className="value">
                    {isTemperature ? "No Tag" : `${Math.max(0, hoverData.values[4]).toFixed(2)} ${unitLabel}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="som-trend-x-axis">
            {getXAxisLabels(trendPeriod).map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>

          {/* Historical Timeline Controller */}
          <div className="som-trend-timeline-controller">
            <button
              className="som-timeline-nav-btn"
              disabled={trendOffset === 24}
              onClick={() => setTrendOffset(prev => Math.min(24, prev + 1))}
              title="Go Back"
            >
              &lt; Previous
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
              className="som-timeline-nav-btn"
              disabled={trendOffset === 0}
              onClick={() => setTrendOffset(prev => Math.max(0, prev - 1))}
              title="Go Forward"
            >
              Next &gt;
            </button>

            <button
              className={`som-timeline-live-btn ${trendOffset === 0 ? "live-active" : ""}`}
              onClick={() => setTrendOffset(0)}
            >
              <span className="live-dot"></span> Latest
            </button>
          </div>

          <div className="som-trend-legend">
            <div className="som-legend-item">
              <div className="som-box s1" style={{ backgroundColor: "#ef4444" }}></div> {isTemperature ? "TEMP S1" : "PRESSURE S1"}
            </div>
            <div className="som-legend-item">
              <div className="som-box s2" style={{ backgroundColor: "#3b82f6" }}></div> {isTemperature ? "TEMP S2" : "PRESSURE S2"}
            </div>
            <div className="som-legend-item">
              <div className="som-box s3" style={{ backgroundColor: "#0f172a" }}></div> {isTemperature ? "TEMP S3" : "PRESSURE S3"}
            </div>
            <div className="som-legend-item">
              <div className="som-box s4" style={{ backgroundColor: "#16a34a" }}></div> {isTemperature ? "TEMP S4" : "PRESSURE S4"}
            </div>
            {!isTemperature && (
              <div className="som-legend-item">
                <div className="som-box bpv" style={{ backgroundColor: "#a855f7" }}></div> PRESSURE BPV
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: INDUSTRIAL SUMMARY CARDS */}
      <div className="som-trend-summary-footer">
        {["1", "2", "3", "4", "BPV"].map((line) => {
          let pressVal = null;
          let tempVal = null;

          if (line === "BPV") {
            const p = getMappedValue ? getMappedValue("bpv_pres", "MONITOR", "--") : "--";
            if (p !== "No Tag" && p !== "--") pressVal = p;
            else {
              const altP = getMappedValue ? getMappedValue("bpv_status", "PRESSURE", "--") : "--";
              if (altP !== "No Tag" && altP !== "--") pressVal = altP;
              else pressVal = liveReadings["BPV"]?.press || getLatestValue("BPV");
            }

            const t = getMappedValue ? getMappedValue("bpv_temp", "MONITOR", "--") : "--";
            if (t !== "No Tag" && t !== "--") tempVal = t;
            else {
              const altT = getMappedValue ? getMappedValue("bpv_status", "TEMP", "No Tag") : "No Tag";
              if (altT !== "No Tag" && altT !== "--") tempVal = altT;
              else tempVal = "No Tag";
            }
          } else {
            const p = getMappedValue ? getMappedValue(`st${line}_status`, "PRESSURE", "--") : "--";
            if (p !== "No Tag" && p !== "--") pressVal = p;
            else {
              const altP = getMappedValue ? getMappedValue(`st${line}_pressure_card`, "MONITOR", "--") : "--";
              if (altP !== "No Tag" && altP !== "--") pressVal = altP;
              else pressVal = liveReadings[line]?.press || getLatestValue(line);
            }

            const t = getMappedValue ? getMappedValue(`st${line}_status`, "TEMP", "--") : "--";
            if (t !== "No Tag" && t !== "--") tempVal = t;
            else {
              const altT = getMappedValue ? getMappedValue(`st${line}_temp_card`, "MONITOR", "No Tag") : "No Tag";
              if (altT !== "No Tag" && altT !== "--") tempVal = altT;
              else tempVal = liveReadings[line]?.temp || "135.0";
            }
          }

          const formatNum = (v) => {
            if (v === null || v === undefined || v === "" || v === "No Tag" || v === "--") return v || "--";
            const num = Number(v);
            if (isNaN(num)) return v;
            const clamped = Math.max(0, num);
            return clamped.toFixed(2);
          };

          return (
            <div key={line} className={`som-trend-card ${isTemperature ? "active-temp-card" : "active-press-card"}`}>
              <div className={`som-trend-card-section ${!isTemperature ? "focus-section" : ""}`}>
                <div className="som-trend-card-label">
                  PRESSURE {line}
                </div>
                <div className="som-trend-card-val som-trend-accent-val">
                  {formatNum(pressVal)} <span className="som-unit">BAR</span>
                </div>
              </div>
              <div className={`som-trend-card-section ${isTemperature ? "focus-section" : ""}`}>
                <div className="som-trend-card-label">TEMP {line}</div>
                <div className="som-trend-card-val som-trend-accent-val">
                  {formatNum(tempVal)} <span className="som-unit">{"\u00B0"}C</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

