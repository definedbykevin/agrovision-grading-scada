import React, { useEffect, useState } from "react";
import "./AiCameraConfigModal.css";

const getAiApiBase = () => {
  return "/api/sterilizer/ai";
};

export default function AiCameraConfigModal({ isOpen, onClose }) {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCam, setSelectedCam] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const apiBase = getAiApiBase();
      const res = await fetch(`${apiBase}/cameras`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setCameras(result.data);
        if (result.data.length > 0) {
          setSelectedCam(result.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load cameras:", err);
      setMessage("Error: Unable to connect to sterilizer-ai service (port 4105)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCameras();
    }
  }, [isOpen]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedCam) return;

    setSaving(true);
    setMessage("");

    try {
      const apiBase = getAiApiBase();
      const res = await fetch(`${apiBase}/cameras/${selectedCam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rtsp_url: selectedCam.rtsp_url,
          location: selectedCam.location,
          is_active: selectedCam.is_active,
          roi_redline: selectedCam.roi_redline,
          roi_greenline: selectedCam.roi_greenline,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage("✅ Camera configuration saved successfully to database!");
        setTimeout(() => setMessage(""), 3500);
      } else {
        setMessage(`❌ Save failed: ${result.error || result.message}`);
      }
    } catch (err) {
      setMessage(`❌ Network error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="som-ai-cam-modal-overlay" onClick={onClose}>
      <div className="som-ai-cam-modal" onClick={(e) => e.stopPropagation()}>
        <div className="som-ai-cam-modal-header">
          <div className="header-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3>AI CAMERAS CONFIGURATION (DEV MODE)</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>

        {message && <div className="modal-banner-message">{message}</div>}

        <div className="som-ai-cam-modal-body">
          {loading ? (
            <div className="modal-loading">Loading camera configurations from database...</div>
          ) : selectedCam ? (
            <form onSubmit={handleSave} className="cam-config-form">
              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label>Camera Code</label>
                  <input type="text" value={selectedCam.camera_code} disabled className="readonly-input" />
                </div>
                <div className="form-group flex-1">
                  <label>Location</label>
                  <input
                    type="text"
                    value={selectedCam.location || ""}
                    onChange={(e) => setSelectedCam({ ...selectedCam, location: e.target.value })}
                  />
                </div>
                <div className="form-group status-group">
                  <label>Status</label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedCam.is_active)}
                      onChange={(e) => setSelectedCam({ ...selectedCam, is_active: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>RTSP Video URL</label>
                <input
                  type="text"
                  value={selectedCam.rtsp_url}
                  onChange={(e) => setSelectedCam({ ...selectedCam, rtsp_url: e.target.value })}
                  placeholder="rtsp://admin:pass@ip:554/..."
                  required
                />
              </div>

              {/* ROI Configurations */}
              <div className="roi-section-box">
                <h4>ROI COORDINATES (LIVE OVERLAYS)</h4>
                <div className="roi-grid">
                  {/* Red Line */}
                  <div className="roi-card red-card">
                    <h5>🔴 RED TRIGGER LINE (DETEKSI FRAKSI)</h5>
                    <div className="coord-inputs">
                      <label>X1: <input type="number" value={selectedCam.roi_redline?.x1 ?? 0} onChange={(e) => setSelectedCam({ ...selectedCam, roi_redline: { ...selectedCam.roi_redline, x1: Number(e.target.value) } })} /></label>
                      <label>Y1: <input type="number" value={selectedCam.roi_redline?.y1 ?? 351} onChange={(e) => setSelectedCam({ ...selectedCam, roi_redline: { ...selectedCam.roi_redline, y1: Number(e.target.value) } })} /></label>
                      <label>X2: <input type="number" value={selectedCam.roi_redline?.x2 ?? 960} onChange={(e) => setSelectedCam({ ...selectedCam, roi_redline: { ...selectedCam.roi_redline, x2: Number(e.target.value) } })} /></label>
                      <label>Y2: <input type="number" value={selectedCam.roi_redline?.y2 ?? 351} onChange={(e) => setSelectedCam({ ...selectedCam, roi_redline: { ...selectedCam.roi_redline, y2: Number(e.target.value) } })} /></label>
                    </div>
                  </div>

                  {/* Green ROI */}
                  <div className="roi-card green-card">
                    <h5>🟢 GREEN TRACKING ROI (PELACAKAN OBJEK)</h5>
                    <div className="coord-inputs">
                      <label>X1: <input type="number" value={selectedCam.roi_greenline?.x1 ?? 0} onChange={(e) => setSelectedCam({ ...selectedCam, roi_greenline: { ...selectedCam.roi_greenline, x1: Number(e.target.value) } })} /></label>
                      <label>Y1: <input type="number" value={selectedCam.roi_greenline?.y1 ?? 351} onChange={(e) => setSelectedCam({ ...selectedCam, roi_greenline: { ...selectedCam.roi_greenline, y1: Number(e.target.value) } })} /></label>
                      <label>X2: <input type="number" value={selectedCam.roi_greenline?.x2 ?? 960} onChange={(e) => setSelectedCam({ ...selectedCam, roi_greenline: { ...selectedCam.roi_greenline, x2: Number(e.target.value) } })} /></label>
                      <label>Y2: <input type="number" value={selectedCam.roi_greenline?.y2 ?? 530} onChange={(e) => setSelectedCam({ ...selectedCam, roi_greenline: { ...selectedCam.roi_greenline, y2: Number(e.target.value) } })} /></label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="som-ai-cam-modal-footer">
                <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? "Saving Changes..." : "Save to PostgreSQL"}
                </button>
              </div>
            </form>
          ) : (
            <div>No camera configurations found in PostgreSQL.</div>
          )}
        </div>
      </div>
    </div>
  );
}
