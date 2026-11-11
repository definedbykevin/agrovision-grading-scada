import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './GraphicsStation.css';

/**
 * ADVANCED SCADA GRAPHICS — Real-time & Historical Trend Viewer
 * Features:
 * - Dynamic Zoom In/Out (15m to 24h)
 * - Real-time Database Sync with "Last Known Value" initialization
 * - Industrial Multi-Axis Visualization
 */

const CHART_W = 1200;
const CHART_H = 450;
const PAD_T = 20;
const PAD_B = 40;
const PLOT_H = CHART_H - PAD_T - PAD_B;
const POINTS = 200;

const AXES = [
  { key: 'ampere', label: 'AMPERE', unit: 'A', color: '#f59e0b', min: 0, max: 100, ticks: [0, 25, 50, 75, 100] },
  { key: 'pressure', label: 'PRESSURE', unit: 'Bar', color: '#f43f5e', min: 0, max: 20, ticks: [0, 5, 10, 15, 20] },
  { key: 'temp', label: 'TEMP', unit: '°C', color: '#fbbf24', min: 0, max: 300, ticks: [0, 75, 150, 225, 300] },
  { key: 'flow', label: 'FLOW', unit: 'T/H', color: '#10b981', min: 0, max: 60, ticks: [0, 15, 30, 45, 60] },
];

const ZOOM_OPTIONS = [15, 30, 60, 240, 480, 1440];

function toY(val, min, max) {
  const safeVal = Math.min(Math.max(val, min), max);
  return PAD_T + PLOT_H * (1 - (safeVal - min) / (max - min));
}

function GraphicsStation() {
  const [zoomIdx, setZoomIdx] = useState(5);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [chartData, setChartData] = useState({ ampere: [], pressure: [], temp: [], flow: [], timestamps: [] });
  const [hoverData, setHoverData] = useState(null);
  const chartRef = useRef(null);

  const timeSpanMinutes = ZOOM_OPTIONS[zoomIdx];

  const { startTime, endTime } = useMemo(() => {
    const end = new Date(now);
    if (selectedDay !== new Date().getDate()) {
      end.setDate(selectedDay);
      end.setHours(23, 59, 59, 999);
    }
    if (timeSpanMinutes === 1440) {
      const s = new Date(end); s.setHours(0, 0, 0, 0);
      const e = new Date(end); e.setHours(23, 59, 59, 999);
      return { startTime: s.getTime(), endTime: e.getTime() };
    }
    const start = new Date(end.getTime() - timeSpanMinutes * 60000);
    return { startTime: start.getTime(), endTime: end.getTime() };
  }, [selectedDay, timeSpanMinutes, now]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tags = ['Current_Ampere', 'steam_Pressure', 'steam_temp', 'Temperatur', 'steam_flow', 'water_level'];
      const queryParams = new URLSearchParams({
        startDate: new Date(startTime).toISOString(),
        endDate: new Date(endTime).toISOString(),
        tags: tags.join(',')
      });

      const res = await fetch(`/api/logsheet/chart/Boiler%20House?${queryParams}`);
      const result = await res.json();

      const prevQuery = new URLSearchParams({
        endDate: new Date(startTime).toISOString(),
        limit: 50,
        tags: tags.join(',')
      });
      const prevRes = await fetch(`/api/logsheet/chart/Boiler%20House?${prevQuery}`);
      const prevResult = await prevRes.json();

      const tagToKey = {
        'CURRENT_AMPERE': 'ampere',
        'STEAM_PRESSURE': 'pressure', 'STEAM PRESSURE': 'pressure',
        'STEAM_TEMP': 'temp', 'STEAM TEMP': 'temp', 'TEMPERATUR': 'temp',
        'STEAM_FLOW': 'flow', 'STEAM FLOW': 'flow'
      };

      let currentVals = { ampere: 0, pressure: 0, temp: 0, flow: 0 };
      if (prevResult.success && prevResult.data.length > 0) {
        prevResult.data.forEach(l => {
          const key = tagToKey[l.tag_name.toUpperCase()];
          if (key) currentVals[key] = parseFloat(l.new_value) || 0;
        });
      }

      if (result.success) {
        const logs = result.data;
        const series = {
          ampere: new Array(POINTS).fill(null),
          pressure: new Array(POINTS).fill(null),
          temp: new Array(POINTS).fill(null),
          flow: new Array(POINTS).fill(null),
          timestamps: []
        };

        const interval = (endTime - startTime) / POINTS;

        for (let i = 0; i < POINTS; i++) {
          const bucketTime = startTime + (i * interval);
          series.timestamps.push(bucketTime);
          const bucketLogs = logs.filter(l => {
            const t = new Date(l.timestamp).getTime();
            return t >= (bucketTime - interval) && t < bucketTime;
          });
          bucketLogs.forEach(l => {
            const key = tagToKey[l.tag_name.toUpperCase()];
            if (key) currentVals[key] = parseFloat(l.new_value) || 0;
          });
          series.ampere[i] = currentVals.ampere;
          series.pressure[i] = currentVals.pressure;
          series.temp[i] = currentVals.temp;
          series.flow[i] = currentVals.flow;
        }
        setChartData(series);
      }
    } catch (err) {
      console.error('Trend fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [startTime, endTime]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      if (selectedDay === new Date().getDate()) {
        setNow(new Date());
        fetchData();
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [fetchData, selectedDay]);

  const paths = useMemo(() => {
    const build = (data, ax) => data
      .map((v, i) => v !== null ? `${(i * CHART_W / (POINTS - 1)).toFixed(1)},${toY(v, ax.min, ax.max).toFixed(1)}` : '')
      .filter(p => p !== '')
      .join(' ');

    return {
      ampere: build(chartData.ampere, AXES[0]),
      pressure: build(chartData.pressure, AXES[1]),
      temp: build(chartData.temp, AXES[2]),
      flow: build(chartData.flow, AXES[3]),
    };
  }, [chartData]);

  const handleMouseMove = (e) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round((x / rect.width) * (POINTS - 1));
    if (idx >= 0 && idx < POINTS) {
      setHoverData({
        idx, time: chartData.timestamps[idx],
        ampere: chartData.ampere[idx], pressure: chartData.pressure[idx],
        temp: chartData.temp[idx], flow: chartData.flow[idx],
        x
      });
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="scada-trend-viewer">
      <header className="trend-toolbar">
        <div className="trend-info">
          <span className="trend-title">BOILER TREND ANALYSIS</span>
          <span className={`status-pill ${loading ? 'syncing' : 'synced'}`}>{loading ? 'SYNCING...' : 'LIVE DATA'}</span>
        </div>
        <div className="trend-controls">
          <div className="zoom-group">
            <button className="zoom-btn" onClick={() => setZoomIdx(Math.max(0, zoomIdx - 1))}>+</button>
            <span className="zoom-label">{timeSpanMinutes < 60 ? `${timeSpanMinutes}M` : `${timeSpanMinutes / 60}H`} SPAN</span>
            <button className="zoom-btn" onClick={() => setZoomIdx(Math.min(ZOOM_OPTIONS.length - 1, zoomIdx + 1))}>-</button>
          </div>
        </div>
      </header>

      <div className="trend-main-container">
        <div className="trend-canvas-wrapper" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverData(null)} ref={chartRef}>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="trend-svg">
            <polyline points={paths.ampere} className="trend-line" stroke={AXES[0].color} />
            <polyline points={paths.pressure} className="trend-line" stroke={AXES[1].color} />
            <polyline points={paths.temp} className="trend-line" stroke={AXES[2].color} />
            <polyline points={paths.flow} className="trend-line" stroke={AXES[3].color} />
            {hoverData && <line x1={hoverData.idx * CHART_W / (POINTS - 1)} y1={PAD_T} x2={hoverData.idx * CHART_W / (POINTS - 1)} y2={CHART_H - PAD_B} className="hover-line" />}
          </svg>

          <div className="trend-x-axis">
            <span>{formatTime(startTime)}</span>
            <span>{formatTime(startTime + (endTime - startTime) / 2)}</span>
            <span>{formatTime(endTime)}</span>
          </div>

          {hoverData && (
            <div className="trend-tooltip" style={{ left: hoverData.x > CHART_W - 200 ? hoverData.x - 160 : hoverData.x + 20 }}>
              <div className="tooltip-time">{formatTime(hoverData.time)}</div>
              {AXES.map(ax => (
                <div key={ax.key} className="tooltip-row" style={{ color: ax.color }}>
                  <span className="tooltip-label">{ax.label}:</span>
                  <span className="tooltip-value">{(hoverData[ax.key] || 0).toFixed(1)} {ax.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="trend-y-axes">
          {AXES.map(ax => (
            <div key={ax.key} className="y-axis-col" style={{ color: ax.color }}>
              <div className="y-axis-label">{ax.label} ({ax.unit})</div>
              <div className="y-axis-ticks">{[...ax.ticks].reverse().map(t => <span key={t}>{t}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GraphicsStation;
