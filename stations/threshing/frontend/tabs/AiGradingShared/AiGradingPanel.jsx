import { useCallback, useEffect, useMemo, useState } from "react";
import "./AiGradingPanel.css";

const PERIODS = ["DAY", "WEEK", "MONTH"];

const emptyHealth = {
  runtime_running: false,
  model_ready: false,
  database_ready: false,
  cameras: {},
};

const normalizeBaseUrl = (value) => value.trim().replace(/\/$/, "");

const defaultServiceUrl = (port) => {
  if (typeof window === "undefined") return `http://127.0.0.1:${port}`;
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
};

const CameraOffIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="10" y="19" width="31" height="26" rx="5" />
    <path d="m41 27 13-7v24l-13-7" />
    <path d="M9 9 55 55" />
  </svg>
);

function SetupModal({ title, apiBase, config, selectedLineNo, onClose, onSaved }) {
  const selectedLine = config?.lines?.find((line) => Number(line.line_no) === Number(selectedLineNo));
  const [serviceUrl, setServiceUrl] = useState(apiBase);
  const [enabled, setEnabled] = useState(Boolean(selectedLine?.enabled));
  const [cameraCode, setCameraCode] = useState(selectedLine?.camera?.camera_code || "");
  const [cameraName, setCameraName] = useState(selectedLine?.camera?.camera_name || "");
  const [rtspUrl, setRtspUrl] = useState(selectedLine?.camera?.rtsp_url || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    const nextBase = normalizeBaseUrl(serviceUrl);
    if (!nextBase) {
      setMessage("Service URL wajib diisi.");
      return;
    }

    if (!config || !selectedLine) {
      onSaved({ apiBase: nextBase, config: null });
      return;
    }

    if (enabled && !rtspUrl.trim()) {
      setMessage("RTSP URL wajib diisi ketika kamera diaktifkan.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const nextConfig = {
        ...config,
        lines: config.lines.map((line) =>
          Number(line.line_no) === Number(selectedLineNo)
            ? {
                ...line,
                enabled,
                camera: {
                  ...line.camera,
                  camera_code: cameraCode.trim(),
                  camera_name: cameraName.trim(),
                  rtsp_url: rtspUrl.trim(),
                },
              }
            : line,
        ),
      };
      const response = await fetch(`${nextBase}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Konfigurasi gagal disimpan.");
      onSaved({ apiBase: nextBase, config: result.data });
    } catch (error) {
      setMessage(error.message || "Layanan klasifikasi tidak dapat dihubungi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="thr-grading-modal-overlay" onMouseDown={onClose}>
      <div className="thr-grading-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <strong>{title} CONFIGURATION</strong>
            <span>Service, camera, and RTSP source</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="thr-grading-form">
          <label className="wide">
            <span>Service API URL</span>
            <input value={serviceUrl} onChange={(event) => setServiceUrl(event.target.value)} placeholder="http://127.0.0.1:4106/api/threshing-mpd" />
          </label>
          <label>
            <span>Camera code</span>
            <input value={cameraCode} onChange={(event) => setCameraCode(event.target.value)} disabled={!config} />
          </label>
          <label>
            <span>Camera name</span>
            <input value={cameraName} onChange={(event) => setCameraName(event.target.value)} disabled={!config} />
          </label>
          <label className="wide">
            <span>RTSP URL</span>
            <input
              type="password"
              autoComplete="off"
              value={rtspUrl}
              onChange={(event) => setRtspUrl(event.target.value)}
              placeholder={selectedLine?.camera?.rtsp_configured ? "Configured — leave unchanged" : "rtsp://user:password@camera-ip:554/stream"}
              disabled={!config}
            />
          </label>
          <label className="thr-grading-enable wide">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!config} />
            <span>Enable this camera after saving</span>
          </label>
          {!config && <p className="thr-grading-form-note wide">Save the Service API URL first. Camera fields become available after the service responds.</p>}
          {message && <p className="thr-grading-form-error wide">{message}</p>}
        </div>
        <footer>
          <button type="button" onClick={onClose}>CANCEL</button>
          <button type="button" className="primary" onClick={save} disabled={saving}>{saving ? "SAVING..." : "SAVE CONFIGURATION"}</button>
        </footer>
      </div>
    </div>
  );
}

export default function AiGradingPanel({
  service,
  servicePort,
  apiPath,
  storageKey,
  streamTitle,
  analysisTitle,
  categories,
  primaryCategory,
  configMode,
  throughputUnit = "FFB/m",
  previewImage = null,
  simulationData = null,
}) {
  const initialBase = `${defaultServiceUrl(servicePort)}${apiPath}`;
  const [apiBase, setApiBase] = useState(() => localStorage.getItem(storageKey) || initialBase);
  const [period, setPeriod] = useState("DAY");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [health, setHealth] = useState(() => (simulationData ? {
    runtime_running: true,
    model_ready: true,
    database_ready: true,
    cameras: { "1": { connected: true, fps: 30 } },
  } : emptyHealth));
  const [counts, setCounts] = useState(() => (simulationData?.counts ? simulationData.counts : Object.fromEntries(categories.map((item) => [item.key, 0]))));
  const [metrics, setMetrics] = useState(() => (simulationData?.metrics || { average_confidence: 0, detections_per_minute: 0 }));
  const [current, setCurrent] = useState(() => (simulationData?.current || null));
  const [config, setConfig] = useState(null);
  const [selectedLineNo, setSelectedLineNo] = useState(1);
  const [serviceOnline, setServiceOnline] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const cameraStatus = health.cameras?.[String(selectedLineNo)] || health.cameras?.[selectedLineNo] || {};
  const cameraReady = Boolean(cameraStatus.connected);
  const selectedLine = config?.lines?.find((line) => Number(line.line_no) === Number(selectedLineNo));
  const total = useMemo(() => categories.reduce((sum, item) => sum + Number(counts[item.key] || 0), 0), [categories, counts]);
  const majorityKey = current?.decision_status === "READY" ? String(current.majority_category || "").toLowerCase() : "";
  const majority = categories.find((item) => item.key === majorityKey);
  const categoryStats = useMemo(() => [
    { key: "all", label: "ALL", color: "#0f172a", count: total },
    ...categories.map((item) => ({ ...item, count: Number(counts[item.key] || 0) })),
  ], [categories, counts, total]);
  const primaryCount = Number(counts[primaryCategory] || 0);
  const qualityScore = total ? Math.round((primaryCount / total) * 100) : 0;
  const ringGradient = useMemo(() => {
    if (!total) return "#e2e8f0 0% 100%";
    let cursor = 0;
    return categories.map((item) => {
      const start = cursor;
      cursor += (Number(counts[item.key] || 0) / total) * 100;
      return `${item.color} ${start}% ${cursor}%`;
    }).join(", ");
  }, [categories, counts, total]);

  const loadData = useCallback(async (signal) => {
    const query = `line_no=${selectedLineNo}`;
    try {
      const [healthResponse, statsResponse, currentResponse, configResponse] = await Promise.all([
        fetch(`${apiBase}/health`, { signal }),
        fetch(`${apiBase}/stats?${query}&period=${period}`, { signal }),
        fetch(`${apiBase}/current?${query}`, { signal }),
        fetch(`${apiBase}/config`, { signal }),
      ]);
      if (![healthResponse, statsResponse, currentResponse, configResponse].every((response) => response.ok)) {
        throw new Error("Service response is not ready");
      }
      const [nextHealth, statsResult, currentResult, configResult] = await Promise.all([
        healthResponse.json(), statsResponse.json(), currentResult.json(), configResult.json(),
      ]);
      setHealth(nextHealth);
      setCounts({ ...Object.fromEntries(categories.map((item) => [item.key, 0])), ...(statsResult.counts || {}) });
      setMetrics({ average_confidence: 0, detections_per_minute: 0, ...(statsResult.metrics || {}) });
      setCurrent(currentResult.data || null);
      setConfig(configResult.data || null);
      setServiceOnline(true);
    } catch (error) {
      if (error.name === "AbortError") return;
      setServiceOnline(false);
      if (simulationData) {
        setHealth({
          runtime_running: true,
          model_ready: true,
          database_ready: true,
          cameras: { [String(selectedLineNo)]: { connected: true, fps: 30 } },
        });
        setCounts(simulationData.counts || {});
        setMetrics(simulationData.metrics || { average_confidence: 96.5, detections_per_minute: 120 });
        setCurrent(simulationData.current || null);
      } else {
        setHealth(emptyHealth);
        setCounts(Object.fromEntries(categories.map((item) => [item.key, 0])));
        setMetrics({ average_confidence: 0, detections_per_minute: 0 });
        setCurrent(null);
      }
    }
  }, [apiBase, categories, period, selectedLineNo, simulationData]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    const timer = window.setInterval(() => loadData(controller.signal), 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [loadData]);

  useEffect(() => {
    if (config?.lines?.length && !config.lines.some((line) => Number(line.line_no) === Number(selectedLineNo))) {
      setSelectedLineNo(Number(config.lines[0].line_no));
    }
  }, [config, selectedLineNo]);

  const handleSaved = ({ apiBase: nextBase, config: nextConfig }) => {
    const normalized = normalizeBaseUrl(nextBase);
    localStorage.setItem(storageKey, normalized);
    setApiBase(normalized);
    if (nextConfig) setConfig(nextConfig);
    setShowSetup(false);
  };

  return (
    <div className="thr-grading-shell">
      <section className="thr-grading-card thr-grading-stream-card">
        <header className="thr-grading-card-header">
          <h2>{streamTitle}</h2>
          <div className="thr-grading-header-tools">
            <span className="thr-grading-camera-meta">
              LINE {selectedLineNo} | {selectedLine?.camera?.camera_code || `${service}-CAM-01`} | {cameraReady ? "ACTIVE" : previewImage ? "ACTIVE (SIM)" : "OFFLINE"}
            </span>
            {configMode && <button type="button" className="thr-grading-setup-button" onClick={() => setShowSetup(true)}>CONFIGURE</button>}
          </div>
        </header>
        <div className="thr-grading-stream-body">
          {cameraReady ? (
            <img
              key={`${apiBase}-${selectedLineNo}`}
              src={`${apiBase}/stream?line_no=${selectedLineNo}`}
              className="thr-grading-stream"
              alt={`${service} live camera stream`}
            />
          ) : previewImage ? (
            <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
              <img
                src={previewImage}
                className="thr-grading-stream"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt={`${service} simulated conveyor feed`}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  boxShadow: "inset 0 0 50px rgba(16, 185, 129, 0.25)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "22%",
                    top: "32%",
                    width: "140px",
                    height: "90px",
                    border: "2px solid #10b981",
                    borderRadius: "4px",
                    boxShadow: "0 0 14px rgba(16, 185, 129, 0.6)",
                    padding: "2px 4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.62rem",
                      color: "#10b981",
                      background: "rgba(15, 23, 42, 0.85)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      fontWeight: 800,
                    }}
                  >
                    {primaryCategory === "normal_cook" ? "NORMAL_COOK 98.4%" : "EMPTY_BUNCH 97.9%"}
                  </span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: "58%",
                    top: "46%",
                    width: "120px",
                    height: "85px",
                    border: "2px solid #10b981",
                    borderRadius: "4px",
                    boxShadow: "0 0 14px rgba(16, 185, 129, 0.6)",
                    padding: "2px 4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.62rem",
                      color: "#10b981",
                      background: "rgba(15, 23, 42, 0.85)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      fontWeight: 800,
                    }}
                  >
                    {primaryCategory === "normal_cook" ? "NORMAL_COOK 96.1%" : "EMPTY_BUNCH 98.5%"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="thr-grading-empty-stream">
              <CameraOffIcon />
              <strong>{serviceOnline ? "CCTV NOT CONNECTED" : "CLASSIFICATION SERVICE OFFLINE"}</strong>
              <span>
                {serviceOnline
                  ? selectedLine?.camera?.rtsp_configured
                    ? cameraStatus.error || "Waiting for a valid RTSP frame."
                    : "RTSP source has not been configured."
                  : `Start the ${service} service and verify its API address.`}
              </span>
              {configMode && <button type="button" onClick={() => setShowSetup(true)}>OPEN CONFIGURATION</button>}
            </div>
          )}
          <div className="thr-grading-stream-overlay">
            <span className={`thr-grading-live-badge ${cameraReady || previewImage ? "live" : "offline"}`}>
              <i />
              {cameraReady ? "LIVE CAM" : previewImage ? "PREVIEW SIMULATION" : "CAMERA OFFLINE"}
            </span>
            <span className="thr-grading-stream-state">
              {cameraReady
                ? "REALTIME CLASSIFICATION INPUT"
                : previewImage
                ? "PORTFOLIO PREVIEW: AI INFERENCE ACTIVE"
                : cameraStatus.error || "WAITING FOR CCTV CONFIGURATION"}
            </span>
          </div>
        </div>
      </section>

      <section className="thr-grading-card thr-grading-analysis-card">
        <header className="thr-grading-card-header yellow">
          <h2>{analysisTitle}</h2>
          <div className="thr-grading-analysis-controls">
            <select value={selectedLineNo} onChange={(event) => setSelectedLineNo(Number(event.target.value))}>
              {config?.lines?.length
                ? config.lines.map((line) => <option key={line.line_no} value={line.line_no}>LINE {line.line_no}</option>)
                : <option value={selectedLineNo}>LINE {selectedLineNo}</option>}
            </select>
            <div className="thr-grading-periods">
              {PERIODS.map((item) => (
                <button type="button" key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>
              ))}
            </div>
          </div>
        </header>
        <div className="thr-grading-analysis-body">
          <div className="thr-grading-metrics-grid">
            <div className="thr-grading-metric quality">
              <span>QUALITY SCORE</span>
              <strong>{qualityScore}%</strong>
            </div>
            <div className="thr-grading-metric throughput">
              <span>THROUGHPUT</span>
              <strong>{Number(metrics.detections_per_minute || 0).toFixed(0)} <small>{throughputUnit}</small></strong>
            </div>
            <div className="thr-grading-metric confidence">
              <span>AI CONFIDENCE</span>
              <strong>{Number(metrics.average_confidence || 0).toFixed(1)}%</strong>
            </div>
          </div>

          <div className="thr-grading-chart-section">
            <div className="thr-grading-ring" style={{ background: `conic-gradient(${ringGradient})` }}>
              <div>
                <strong>{qualityScore}%</strong>
                <span>{categories.find((item) => item.key === primaryCategory)?.label || "QUALITY"}</span>
              </div>
            </div>
            <div className="thr-grading-status-list">
              <div>
                <i className={cameraReady || Boolean(simulationData) ? "ready" : "waiting"} />
                <span>Camera:</span>
                <strong>{cameraReady ? "ONLINE" : simulationData ? "ONLINE (SIM)" : "OFFLINE"}</strong>
              </div>
              <div>
                <i className={health.model_ready || Boolean(simulationData) ? "ready" : "waiting"} />
                <span>Model:</span>
                <strong>{health.model_ready || simulationData ? "READY" : "WAITING"}</strong>
              </div>
              <div>
                <i className={health.database_ready || Boolean(simulationData) ? "ready" : "waiting"} />
                <span>Database:</span>
                <strong>{health.database_ready || simulationData ? "SYNCED" : "OFFLINE"}</strong>
              </div>
            </div>
          </div>

          <div className="thr-grading-classification">
            <h3>CLASSIFICATION RESULT</h3>
            {categoryStats.map((item) => {
              const percentage = item.key === "all" ? (total ? 100 : 0) : (total ? (item.count / total) * 100 : 0);
              return (
                <button
                  type="button"
                  className={`thr-grading-category-row ${selectedCategory === item.key ? "selected" : ""} ${majorityKey === item.key ? "majority" : ""}`}
                  key={item.key}
                  onClick={() => setSelectedCategory(item.key)}
                >
                  <div className="thr-grading-category-top">
                    <span className="thr-grading-category-name"><i style={{ background: item.color }} />{item.label}</span>
                    <span className="thr-grading-category-value"><strong>{item.count.toLocaleString("id-ID")}</strong><small style={{ color: item.color, background: `${item.color}12` }}>{percentage.toFixed(0)}%</small></span>
                  </div>
                  <div className="thr-grading-progress"><span style={{ width: `${percentage}%`, background: item.color }} /></div>
                </button>
              );
            })}
          </div>

          <div className="thr-grading-decision">
            <div>
              <span>LINE {selectedLineNo} MAJORITY</span>
              <strong>{majority?.label || "WAITING FOR VALID DATA"}</strong>
              <small>{majority ? `${Number(current.majority_percentage || 0).toFixed(1)}% in current decision window` : "Minimum detection requirement has not been met."}</small>
            </div>
            <div>
              <span>PROCESS RECOMMENDATION</span>
              <strong>{current?.recommended_action_name || "—"}</strong>
              <small>{current?.recommended_action_code || `Decision status: ${String(current?.decision_status || "INSUFFICIENT_DATA").replaceAll("_", " ")}`}</small>
            </div>
          </div>
        </div>
      </section>

      {showSetup && (
        <SetupModal
          title={service}
          apiBase={apiBase}
          config={config}
          selectedLineNo={selectedLineNo}
          onClose={() => setShowSetup(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
