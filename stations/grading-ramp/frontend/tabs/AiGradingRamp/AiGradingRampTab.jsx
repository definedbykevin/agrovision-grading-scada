import React, { useMemo, useState } from "react";
import "./AiGradingRampTab.css";

const CATEGORY_META = [
  { id: "ripe", label: "RIPE", color: "#10b981", badgeBg: "rgba(16, 185, 129, 0.15)" },
  { id: "underripe", label: "UNDERRIPE", color: "#eab308", badgeBg: "rgba(234, 179, 8, 0.15)" },
  { id: "unripe_reject", label: "UNRIPE (REJECT)", color: "#ef4444", badgeBg: "rgba(239, 68, 68, 0.15)" },
  { id: "rotten_reject", label: "ROTTEN (REJECT)", color: "#78350f", badgeBg: "rgba(120, 53, 15, 0.15)" },
  { id: "empty_bunch", label: "EMPTY BUNCH", color: "#64748b", badgeBg: "rgba(100, 116, 139, 0.15)" },
];

const CameraOffIcon = () => (
  <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
    <rect x="10" y="19" width="31" height="26" rx="5" />
    <path d="m41 27 13-7v24l-13-7" />
    <path d="M9 9 55 55" />
  </svg>
);

const PalmFruitIcon = ({ color = "#10b981" }) => (
  <svg viewBox="0 0 48 48" width="32" height="32" fill="none" aria-hidden="true">
    <ellipse cx="24" cy="24" rx="16" ry="20" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2.5" />
    <path d="M24 6 C20 18, 20 30, 24 42" stroke={color} strokeWidth="2" strokeDasharray="2 3" />
    <path d="M12 20 C18 24, 30 24, 36 20" stroke={color} strokeWidth="1.8" />
    <path d="M14 28 C20 32, 28 32, 34 28" stroke={color} strokeWidth="1.8" />
  </svg>
);

const SAMPLE_CAPTURES = [
  { id: "RMP-101", category: "ripe", confidence: 97.4, time: "11:24:08", hopper: 1, weight: "24.5 kg", defectScore: "0.2%" },
  { id: "RMP-102", category: "ripe", confidence: 96.2, time: "11:24:02", hopper: 1, weight: "26.1 kg", defectScore: "0.4%" },
  { id: "RMP-103", category: "underripe", confidence: 91.5, time: "11:23:55", hopper: 1, weight: "19.8 kg", defectScore: "1.1%" },
  { id: "RMP-104", category: "ripe", confidence: 98.1, time: "11:23:48", hopper: 1, weight: "25.0 kg", defectScore: "0.1%" },
  { id: "RMP-105", category: "unripe_reject", confidence: 94.0, time: "11:23:39", hopper: 1, weight: "17.2 kg", defectScore: "9.5%" },
  { id: "RMP-106", category: "ripe", confidence: 95.8, time: "11:23:31", hopper: 1, weight: "23.4 kg", defectScore: "0.3%" },
  { id: "RMP-107", category: "ripe", confidence: 96.9, time: "11:23:22", hopper: 1, weight: "27.8 kg", defectScore: "0.2%" },
  { id: "RMP-108", category: "rotten_reject", confidence: 93.6, time: "11:23:14", hopper: 1, weight: "21.0 kg", defectScore: "8.8%" },
  { id: "RMP-109", category: "ripe", confidence: 97.2, time: "11:23:05", hopper: 1, weight: "25.6 kg", defectScore: "0.3%" },
  { id: "RMP-110", category: "underripe", confidence: 89.8, time: "11:22:58", hopper: 1, weight: "20.4 kg", defectScore: "1.4%" },
  { id: "RMP-111", category: "empty_bunch", confidence: 96.4, time: "11:22:47", hopper: 1, weight: "11.2 kg", defectScore: "12.0%" },
  { id: "RMP-112", category: "ripe", confidence: 98.3, time: "11:22:36", hopper: 1, weight: "28.1 kg", defectScore: "0.1%" },
  { id: "RMP-113", category: "ripe", confidence: 95.1, time: "11:22:25", hopper: 1, weight: "24.9 kg", defectScore: "0.5%" },
  { id: "RMP-114", category: "underripe", confidence: 92.4, time: "11:22:15", hopper: 1, weight: "22.3 kg", defectScore: "0.9%" },
  { id: "RMP-115", category: "ripe", confidence: 97.0, time: "11:22:04", hopper: 1, weight: "26.7 kg", defectScore: "0.2%" },
  { id: "RMP-116", category: "unripe_reject", confidence: 93.2, time: "11:21:50", hopper: 1, weight: "18.5 kg", defectScore: "8.9%" },
];

export default function AiGradingRampTab() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedHopper, setSelectedHopper] = useState(1);
  const [activeHopperStates, setActiveHopperStates] = useState({
    "1": { is_active: false, batch_code: "RMP-B24-001" },
    "2": { is_active: false, batch_code: null },
    "3": { is_active: false, batch_code: null },
    "4": { is_active: false, batch_code: null },
  });
  const [categoryCounts, setCategoryCounts] = useState({
    ripe: 1248,
    underripe: 142,
    unripe_reject: 38,
    rotten_reject: 24,
    empty_bunch: 18,
  });
  const [metrics, setMetrics] = useState({
    average_confidence: 96.4,
    detections_per_minute: 54,
  });
  const [selectedCaptureDetail, setSelectedCaptureDetail] = useState(null);
  const [message, setMessage] = useState("");
  const [captureSlide, setCaptureSlide] = useState(1);

  const isCurrentActive = Boolean(activeHopperStates[String(selectedHopper)]?.is_active);

  const handleToggleHopper = (hopperNum) => {
    const isCurrentlyActive = Boolean(activeHopperStates[String(hopperNum)]?.is_active);
    const nextActive = !isCurrentlyActive;

    const nextStates = {
      ...activeHopperStates,
      [String(hopperNum)]: {
        is_active: nextActive,
        batch_code: nextActive ? `RMP-HOP${hopperNum}-${Date.now().toString().slice(-4)}` : null,
      },
    };

    if (nextActive) {
      [1, 2, 3, 4].forEach((num) => {
        if (num !== hopperNum) {
          nextStates[String(num)] = { is_active: false, batch_code: null };
        }
      });
      setMessage(`🚀 [Simulation] AI Grading Hopper ${hopperNum} Aktif (DETECTION ACTIVE)`);
      // Update simulated counts for active scanning
      setCategoryCounts({
        ripe: 1280 + Math.floor(Math.random() * 30),
        underripe: 148 + Math.floor(Math.random() * 10),
        unripe_reject: 40 + Math.floor(Math.random() * 5),
        rotten_reject: 25 + Math.floor(Math.random() * 4),
        empty_bunch: 19 + Math.floor(Math.random() * 3),
      });
    } else {
      setMessage(`✅ [Simulation] Sesi AI Grading Hopper ${hopperNum} Selesai`);
    }

    setActiveHopperStates(nextStates);
    setSelectedHopper(hopperNum);
    window.setTimeout(() => setMessage(""), 3500);
  };

  const totalCount = useMemo(() => {
    return Object.values(categoryCounts).reduce((sum, val) => sum + Number(val || 0), 0);
  }, [categoryCounts]);

  const ripeCount = Number(categoryCounts.ripe || 0);
  const ripenessRate = totalCount > 0 ? ((ripeCount / totalCount) * 100).toFixed(1) : "0.0";
  const rejectCount = Number(categoryCounts.unripe_reject || 0) + Number(categoryCounts.rotten_reject || 0);
  const rejectRate = totalCount > 0 ? ((rejectCount / totalCount) * 100).toFixed(1) : "0.0";

  const categoryStats = useMemo(() => {
    return CATEGORY_META.map((cat) => {
      const count = Number(categoryCounts[cat.id] || 0);
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      return {
        ...cat,
        count,
        percentage,
      };
    });
  }, [categoryCounts, totalCount]);

  const donutGradient = useMemo(() => {
    if (totalCount === 0) return "#e2e8f0 0% 100%";
    let cursor = 0;
    return categoryStats
      .map((cat) => {
        const start = cursor;
        const slice = (cat.count / totalCount) * 100;
        cursor += slice;
        return `${cat.color} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
      })
      .join(", ");
  }, [categoryStats, totalCount]);

  const filteredCaptures = useMemo(() => {
    if (selectedCategory === "all") return SAMPLE_CAPTURES;
    return SAMPLE_CAPTURES.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  const displayedCaptures = useMemo(() => {
    const startIndex = (captureSlide - 1) * 8;
    return filteredCaptures.slice(startIndex, startIndex + 8);
  }, [filteredCaptures, captureSlide]);

  const totalSlides = Math.max(1, Math.ceil(filteredCaptures.length / 8));

  return (
    <div className="som-ai-grading-container">
      {/* ── COLUMN 1: LIVE CCTV FEED & HOPPER SIMULATION TRIGGER ── */}
      <section className="som-ai-grading-card">
        <header className="som-ai-card-header">
          <h3>LIVE RAMP HOPPER STREAM</h3>
          <div className="som-ai-camera-meta">
            <span>HOPPER {selectedHopper}</span>
            <span>25 FPS</span>
            <span>1080p</span>
          </div>
        </header>

        <div className="som-ai-video-container" style={{ position: "relative", minHeight: "260px" }}>
          {/* Simulated Industrial CCTV Platform View */}
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(180deg, #090d16 0%, #111827 60%, #1e293b 100%)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Grid Pattern Background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* AI Bounding Boxes */}
            <div
              style={{
                position: "absolute",
                left: "22%",
                top: "26%",
                width: "110px",
                height: "90px",
                border: "2px solid #10b981",
                borderRadius: "4px",
                boxShadow: "0 0 16px rgba(16, 185, 129, 0.5)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "2px 4px",
              }}
            >
              <span
                style={{
                  fontSize: "0.58rem",
                  color: "#10b981",
                  background: "rgba(15, 23, 42, 0.85)",
                  padding: "1px 4px",
                  borderRadius: "2px",
                  fontWeight: 800,
                  alignSelf: "flex-start",
                }}
              >
                RIPE 97.4%
              </span>
              <span
                style={{
                  fontSize: "0.52rem",
                  color: "#94a3b8",
                  background: "rgba(0,0,0,0.6)",
                  padding: "1px 3px",
                  borderRadius: "2px",
                  alignSelf: "flex-end",
                }}
              >
                24.5kg
              </span>
            </div>

            <div
              style={{
                position: "absolute",
                left: "54%",
                top: "42%",
                width: "115px",
                height: "95px",
                border: "2px solid #10b981",
                borderRadius: "4px",
                boxShadow: "0 0 16px rgba(16, 185, 129, 0.5)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "2px 4px",
              }}
            >
              <span
                style={{
                  fontSize: "0.58rem",
                  color: "#10b981",
                  background: "rgba(15, 23, 42, 0.85)",
                  padding: "1px 4px",
                  borderRadius: "2px",
                  fontWeight: 800,
                  alignSelf: "flex-start",
                }}
              >
                RIPE 96.2%
              </span>
              <span
                style={{
                  fontSize: "0.52rem",
                  color: "#94a3b8",
                  background: "rgba(0,0,0,0.6)",
                  padding: "1px 3px",
                  borderRadius: "2px",
                  alignSelf: "flex-end",
                }}
              >
                26.1kg
              </span>
            </div>

            <div
              style={{
                position: "absolute",
                left: "30%",
                top: "58%",
                width: "95px",
                height: "75px",
                border: "2px solid #eab308",
                borderRadius: "4px",
                boxShadow: "0 0 16px rgba(234, 179, 8, 0.5)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "2px 4px",
              }}
            >
              <span
                style={{
                  fontSize: "0.58rem",
                  color: "#eab308",
                  background: "rgba(15, 23, 42, 0.85)",
                  padding: "1px 4px",
                  borderRadius: "2px",
                  fontWeight: 800,
                  alignSelf: "flex-start",
                }}
              >
                UNDERRIPE 91.5%
              </span>
            </div>

            {/* Platform Crosshair & Overlay */}
            <div style={{ textAlign: "center", color: "#64748b", pointerEvents: "none" }}>
              <PalmFruitIcon color={isCurrentActive ? "#10b981" : "#64748b"} />
              <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", marginTop: "4px", color: "#e2e8f0" }}>
                GRADING RAMP PLATFORM &bull; HOPPER {selectedHopper}
              </div>
              <div style={{ fontSize: "0.6rem", color: "#94a3b8" }}>
                YOLOv11-OBB Multi-Class Detection &bull; OpenVINO Runtime
              </div>
            </div>
          </div>

          {/* Badges Overlay */}
          <div className="som-ai-stream-overlay">
            <span className="som-ai-live-badge">
              <i /> ACTIVE
            </span>
            <span className={`som-ai-live-badge som-ai-detection-badge ${isCurrentActive ? "recording" : "idle"}`}>
              <i /> {isCurrentActive ? `DETECTION: ACTIVE (HOPPER ${selectedHopper})` : "DETECTION: IDLE"}
            </span>
          </div>
        </div>

        {/* INLET / HOPPER SIMULATION TRIGGER (DEMO) */}
        <div className="som-inlet-simulation-panel">
          <div className="som-inlet-simulation-header">
            <span>HOPPER PLATFORM SIMULATION TRIGGER (DEMO)</span>
            {activeHopperStates[String(selectedHopper)]?.batch_code && (
              <small className="active-cycle-tag">
                {activeHopperStates[String(selectedHopper)].batch_code}
              </small>
            )}
          </div>
          <div className="som-inlet-btn-grid">
            {[1, 2, 3, 4].map((hNum) => {
              const isHopperActive = Boolean(activeHopperStates[String(hNum)]?.is_active);
              const isSelectedView = selectedHopper === hNum;
              return (
                <button
                  key={hNum}
                  type="button"
                  className={`som-inlet-toggle-btn ${isHopperActive ? "recording" : ""} ${isSelectedView ? "selected-view" : ""}`}
                  onClick={() => handleToggleHopper(hNum)}
                  title={
                    isHopperActive
                      ? `Klik untuk menghentikan grading Hopper ${hNum}`
                      : `Klik untuk memulai deteksi aktif Hopper ${hNum}`
                  }
                >
                  <span className="btn-indicator-dot" />
                  <span className="btn-line-name">HOPPER {hNum}</span>
                  <span className="btn-status-sub">{isHopperActive ? "ACTIVE" : "STANDBY"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {message && (
          <div style={{ padding: "8px 14px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", color: "#166534", fontSize: "0.72rem", fontWeight: 700 }}>
            {message}
          </div>
        )}
      </section>

      {/* ── COLUMN 2: RECENT BUNCH CAPTURES ── */}
      <section className="som-ai-grading-card">
        <header className="som-ai-card-header">
          <h3>RECENT BUNCH DETECTIONS (RAMP INGESTION)</h3>
          <div className="som-ai-pills-row">
            <button
              type="button"
              className={`som-ai-pill ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory("all");
                setCaptureSlide(1);
              }}
            >
              ALL ({SAMPLE_CAPTURES.length})
            </button>
            {CATEGORY_META.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`som-ai-pill ${selectedCategory === cat.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setCaptureSlide(1);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        <div className="som-ai-captures-body">
          <div className="som-ai-captures-grid">
            {displayedCaptures.map((capture) => {
              const catMeta =
                CATEGORY_META.find((c) => c.id === capture.category) || CATEGORY_META[0];

              return (
                <div key={capture.id} className="som-ai-capture-item">
                  <div className="capture-thumb-box">
                    <div className="capture-placeholder-icon">
                      <PalmFruitIcon color={catMeta.color} />
                    </div>
                    <span
                      className="capture-category-badge"
                      style={{
                        backgroundColor: catMeta.color,
                        boxShadow: `0 2px 6px ${catMeta.color}40`,
                      }}
                    >
                      {catMeta.label}
                    </span>
                  </div>
                  <div className="capture-meta-row">
                    <span className="capture-time">{capture.time}</span>
                    <span className="capture-conf">{capture.confidence}%</span>
                  </div>
                  <button
                    type="button"
                    className="capture-inspect-btn"
                    onClick={() => setSelectedCaptureDetail(capture)}
                  >
                    INSPECT BUNCH
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="som-ai-captures-footer">
          <div className="pagination-info">
            SLIDE {captureSlide} OF {totalSlides} &bull; {filteredCaptures.length} DETECTIONS
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              disabled={captureSlide <= 1}
              onClick={() => setCaptureSlide((p) => Math.max(1, p - 1))}
            >
              &laquo; PREV
            </button>
            <button
              type="button"
              disabled={captureSlide >= totalSlides}
              onClick={() => setCaptureSlide((p) => Math.min(totalSlides, p + 1))}
            >
              NEXT &raquo;
            </button>
          </div>
        </footer>
      </section>

      {/* ── COLUMN 3: QUALITY METRICS, DONUT & CLASSIFICATION ── */}
      <section className="som-ai-grading-card">
        <header className="som-ai-card-header">
          <h3>RAMP QUALITY &amp; REJECT METRICS</h3>
        </header>

        <div className="som-ai-analytics-body">
          {/* Top 3 Metric Cards */}
          <div className="som-ai-metrics-row">
            <div className="som-ai-metric-box">
              <span className="metric-label">TOTAL DETECTED</span>
              <strong className="metric-value">{totalCount.toLocaleString()}</strong>
              <small className="metric-sub">BUNCHES</small>
            </div>
            <div className="som-ai-metric-box highlight-metric">
              <span className="metric-label">RIPENESS RATE</span>
              <strong className="metric-value">{ripenessRate}%</strong>
              <small className="metric-sub">OPTIMAL OER</small>
            </div>
            <div className="som-ai-metric-box">
              <span className="metric-label">AI CONFIDENCE</span>
              <strong className="metric-value">{metrics.average_confidence}%</strong>
              <small className="metric-sub">AVG ACCURACY</small>
            </div>
          </div>

          {/* Donut Chart and Decision */}
          <div className="som-ai-chart-section compact-chart-box">
            <div className="som-ai-chart-wrapper">
              <div className="donut-chart multi-donut" style={{ background: `conic-gradient(${donutGradient})` }}>
                <div className="donut-hole">
                  <strong>{ripenessRate}%</strong>
                  <span style={{ color: "#10b981" }}>RIPE</span>
                </div>
              </div>
            </div>

            <div className="som-ai-status-list compact-status-list">
              <div className="som-ai-status-item">
                <span className="status-key">Majority:</span>
                <strong style={{ color: "#10b981" }}>RIPE ({ripenessRate}%)</strong>
              </div>
              <div className="som-ai-status-item">
                <span className="status-key">Grading Platform:</span>
                <strong>HOPPER {selectedHopper}</strong>
              </div>
              <div className="som-ai-status-item">
                <span className="status-key">Mill Acceptance:</span>
                <strong className="recipe-tag" style={{ background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" }}>
                  GRADE A (ACCEPTED)
                </strong>
              </div>
            </div>
          </div>

          {/* Classification Result Bars */}
          <div className="som-ai-category-list-wrapper">
            <h4 className="list-title">CLASSIFICATION RESULT</h4>
            {categoryStats.map((cat) => {
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  type="button"
                  key={cat.id}
                  className={`som-ai-category-row premium-row ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="som-ai-category-heading">
                    <span className="som-ai-category-name">
                      <i style={{ backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}` }} />
                      {cat.label}
                    </span>
                    <span className="som-ai-category-values">
                      <strong>{cat.count.toLocaleString()}</strong>
                      <small
                        className="percentage-badge"
                        style={{ color: cat.color, backgroundColor: cat.badgeBg }}
                      >
                        {cat.percentage}%
                      </small>
                    </span>
                  </span>
                  <span className="som-ai-progress-track">
                    <i
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                        boxShadow: `0 0 10px ${cat.color}80`,
                      }}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Supplier Quality Recommendation */}
          <div
            style={{
              marginTop: "auto",
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#334155" }}>
                REJECT THRESHOLD SPECIFICATION
              </span>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: Number(rejectRate) < 5.0 ? "#059669" : "#dc2626" }}>
                REJECT: {rejectRate}% (LIMIT: 5.0%)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.62rem", color: "#64748b" }}>
              AI edge inference tracks unripe, abnormal, and empty bunches against mill purchase standards. Batch meets quality specification.
            </p>
          </div>
        </div>
      </section>

      {/* Detail Inspection Modal */}
      {selectedCaptureDetail && (
        <div
          className="som-ai-modal-backdrop"
          onClick={() => setSelectedCaptureDetail(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="som-ai-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "20px",
              width: "420px",
              maxWidth: "90%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#0f172a" }}>
              BUNCH INSPECTION DETAIL &bull; {selectedCaptureDetail.id}
            </h4>
            <div style={{ display: "flex", justifyContent: "center", padding: "16px", background: "#f8fafc", borderRadius: "8px", marginBottom: "16px" }}>
              <PalmFruitIcon color={CATEGORY_META.find((c) => c.id === selectedCaptureDetail.category)?.color || "#10b981"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.78rem" }}>
              <div>
                <span style={{ color: "#64748b" }}>Category:</span>
                <strong style={{ display: "block", color: CATEGORY_META.find((c) => c.id === selectedCaptureDetail.category)?.color }}>
                  {selectedCaptureDetail.category.toUpperCase().replace("_", " ")}
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>AI Confidence:</span>
                <strong style={{ display: "block", color: "#0f172a" }}>{selectedCaptureDetail.confidence}%</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Estimated Weight:</span>
                <strong style={{ display: "block", color: "#0f172a" }}>{selectedCaptureDetail.weight}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Capture Time:</span>
                <strong style={{ display: "block", color: "#0f172a" }}>{selectedCaptureDetail.time}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Defect / Reject Index:</span>
                <strong style={{ display: "block", color: "#0f172a" }}>{selectedCaptureDetail.defectScore}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Ingestion Platform:</span>
                <strong style={{ display: "block", color: "#0f172a" }}>HOPPER {selectedCaptureDetail.hopper}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCaptureDetail(null)}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "8px",
                background: "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

