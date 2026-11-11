import { useState, useEffect, useCallback } from "react";
import "./CamConfigView.css";

const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const CamConfigView = ({ user, stationSlug = "security" }) => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [cameraCode, setCameraCode] = useState("");
  const [cameraName, setCameraName] = useState("");
  const [location, setLocation] = useState("");
  const [stationSlugState, setStationSlugState] = useState(stationSlug || "security");
  const [rtspUrl, setRtspUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  // Available Station Options (Dynamically fetched from Master API /api/config/stations)
  const [availableStations, setAvailableStations] = useState([
    { slug: stationSlug || 'security', title: (stationSlug || 'security').replace(/-/g, ' ').toUpperCase() },
  ]);

  useEffect(() => {
    const fetchStationList = async () => {
      try {
        const res = await fetch("/api/config/stations", { headers: authHeaders() });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const activeStations = json.data
            .filter(s => s.is_active === 1 || s.is_active === true || s.is_active === '1')
            .map(s => ({
              slug: s.slug,
              title: s.title ? s.title.toUpperCase() : s.slug.toUpperCase()
            }));
          const fallbackSlug = stationSlug || 'security';
          if (!activeStations.some(station => station.slug === fallbackSlug)) {
            activeStations.push({ slug: fallbackSlug, title: fallbackSlug.replace(/-/g, ' ').toUpperCase() });
          }
          setAvailableStations(activeStations);
        }
      } catch (err) {
        console.error("[CamConfigView] Error fetching stations from master API:", err);
      }
    };
    fetchStationList();
  }, []);

  const fetchCameras = useCallback(async () => {
    try {
      const res = await fetch("/api/security/cctv?all=true", {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCameras(json.data);
      } else if (Array.isArray(json)) {
        setCameras(json);
      }
    } catch (err) {
      console.error("[CamConfigView] Error fetching cameras:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCameras();
  }, [fetchCameras]);

  const resetForm = () => {
    setCurrentCamera(null);
    setCameraCode("");
    setCameraName("");
    setLocation("");
    setStationSlugState(stationSlug || "security");
    setRtspUrl("");
    setIsActive(true);
    setSortOrder(0);
  };

  const handleEdit = (cam) => {
    setCurrentCamera(cam);
    setCameraCode(cam.camera_code || `CAM_${cam.id}`);
    setCameraName(cam.camera_name || "");
    setLocation(cam.location || "");
    setStationSlugState(cam.station_slug || "security");
    setRtspUrl(cam.rtsp_url || "");
    setIsActive(Boolean(cam.is_active));
    setSortOrder(cam.sort_order || 0);
    setShowCameraModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!rtspUrl.trim()) {
      alert("RTSP URL is required!");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        camera_code: cameraCode.trim() || undefined,
        camera_name: cameraName.trim(),
        location: location.trim(),
        station_slug: stationSlugState,
        rtsp_url: rtspUrl.trim(),
        is_active: isActive ? 1 : 0,
        sort_order: parseInt(sortOrder, 10) || 0,
      };

      const url = currentCamera
        ? `/api/security/cctv/${currentCamera.id}`
        : "/api/security/cctv";
      const method = currentCamera ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let json;
      try {
        json = JSON.parse(responseText);
      } catch {
        throw new Error(`Respons server tidak valid (HTTP ${res.status}). Pastikan backend Security berjalan pada port 3101.`);
      }
      if (res.ok && json.success) {
        setShowCameraModal(false);
        resetForm();
        window.dispatchEvent(new Event('cctv-cameras-changed'));
        fetchCameras();
      } else {
        alert(json.message || "Failed to save camera data.");
      }
    } catch (err) {
      console.error("[CamConfigView] Save error:", err);
      alert(err instanceof TypeError
        ? "Tidak dapat menghubungi server. Periksa koneksi dan backend Security pada port 3101."
        : err.message || "Gagal menyimpan kamera.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete camera "${name}"? This action cannot be undone.`))
      return;

    try {
      const res = await fetch(`/api/security/cctv/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        window.dispatchEvent(new Event('cctv-cameras-changed'));
        fetchCameras();
      } else {
        alert(json.message || "Failed to delete camera.");
      }
    } catch (err) {
      console.error("[CamConfigView] Delete error:", err);
    }
  };

  const handleToggleActive = async (cam) => {
    try {
      const payload = {
        camera_code: cam.camera_code || `CAM_${cam.id}`,
        camera_name: cam.camera_name,
        location: cam.location,
        station_slug: cam.station_slug || "security",
        rtsp_url: cam.rtsp_url,
        sort_order: cam.sort_order,
        is_active: cam.is_active ? 0 : 1,
      };
      const res = await fetch(`/api/security/cctv/${cam.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        window.dispatchEvent(new Event('cctv-cameras-changed'));
        fetchCameras();
      }
    } catch (err) {
      console.error("[CamConfigView] Toggle active error:", err);
    }
  };

  if (loading) {
    return (
      <div
        className="som-config-page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="som-loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="som-config-page">
      <div className="som-config-header-group">
        <div className="som-config-title-area">
          <h2>CCTV Camera Management</h2>
          <p className="som-config-subtitle">
            Configure master CCTV cameras, RTSP stream endpoints, and location
            mappings.
          </p>
        </div>
      </div>

      <div className="som-config-main-card">
        <div className="som-card-header">
          <div className="som-card-title">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Registered CCTV Cameras
            <span className="ccam-count-badge">{cameras.length}</span>
          </div>
          <button
            className="btn-premium btn-premium-primary"
            onClick={() => {
              resetForm();
              setShowCameraModal(true);
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Camera
          </button>
        </div>

        <div className="som-table-wrapper">
          <table className="som-modern-table">
            <thead>
              <tr>
                <th style={{ width: "52px" }}>#</th>
                <th>Camera Identifier</th>
                <th>Station Scope</th>
                <th>Location</th>
                <th>RTSP Stream Endpoint</th>
                <th style={{ width: "60px", textAlign: "center" }}>Order</th>
                <th style={{ width: "130px", textAlign: "center" }}>
                  Status
                </th>
                <th style={{ width: "100px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((cam) => (
                <tr key={cam.id}>
                  <td>
                    <div className="som-topology-badge">#{cam.id}</div>
                  </td>
                  <td>
                    <div className="som-device-name">
                      {cam.camera_name}
                      <span className="som-device-meta">RTSP Video Source</span>
                    </div>
                  </td>
                  <td>
                    <span className="som-ip-badge" style={{ background: '#f1f5f9', color: '#334155', fontWeight: '700', textTransform: 'uppercase' }}>
                      {cam.station_slug || 'security'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.875rem", opacity: 0.85 }}>
                      {cam.location || <span style={{ opacity: 0.4 }}>—</span>}
                    </span>
                  </td>
                  <td>
                    <span
                      className="som-ip-badge ccam-rtsp-badge"
                      title={cam.rtsp_url}
                    >
                      {cam.rtsp_url}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: "700",
                        opacity: 0.7,
                      }}
                    >
                      {cam.sort_order}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {/* Active / Inactive toggle pill */}
                    <button
                      className={`ccam-status-pill ${cam.is_active ? "ccam-status-active" : "ccam-status-inactive"
                        }`}
                      onClick={() => handleToggleActive(cam)}
                      title="Click to toggle status"
                    >
                      <span className="ccam-status-dot"></span>
                      {cam.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        className="action-icon-btn"
                        title="Edit"
                        onClick={() => handleEdit(cam)}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="action-icon-btn delete"
                        title="Delete"
                        onClick={() => handleDelete(cam.id, cam.camera_name)}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cameras.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: "80px 0",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No CCTV cameras registered. Click <strong>Add Camera</strong> to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── CAMERA ADD / EDIT MODAL ─── */}
      {showCameraModal && (
        <div
          className="som-modal-overlay"
          onClick={() => setShowCameraModal(false)}
          style={{
            zIndex: 10000,
            alignItems: "flex-start",
            paddingTop: "100px",
            overflowY: "auto",
          }}
        >
          <div
            className="som-premium-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSave}>
              <div className="som-modal-header">
                <h3>{currentCamera ? "Edit Camera" : "New Camera"}</h3>
                <button
                  type="button"
                  className="action-icon-btn"
                  onClick={() => setShowCameraModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="som-modal-body">
                <div className="form-grid-2">
                  <div className="form-group-full">
                    <label className="som-label">Camera Name (optional)</label>
                    <input
                      type="text"
                      className="som-input"
                      value={cameraName}
                      onChange={(e) => setCameraName(e.target.value)}
                      placeholder="Leave blank to name automatically"
                    />
                  </div>

                  <div className="form-group-full">
                    <label className="som-label">Target Station Scope (station_slug) *</label>
                    <select
                      className="som-input"
                      value={stationSlugState}
                      onChange={(e) => setStationSlugState(e.target.value)}
                      required
                    >
                      {availableStations.map((st) => (
                        <option key={st.slug} value={st.slug}>
                          {st.title} ({st.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group-full">
                    <label className="som-label">Location Area</label>
                    <input
                      type="text"
                      className="som-input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Security Post — Main Gate"
                    />
                  </div>

                  <div className="form-group-full">
                    <label className="som-label">RTSP Endpoint URL *</label>
                    <input
                      type="text"
                      className="som-input"
                      value={rtspUrl}
                      onChange={(e) => setRtspUrl(e.target.value)}
                      placeholder="rtsp://admin:password@10.0.0.2:554/Streaming/Channels/101"
                      required
                    />
                  </div>

                  <div>
                    <label className="som-label">Sort Order</label>
                    <input
                      type="number"
                      className="som-input"
                      value={sortOrder}
                      min="0"
                      onChange={(e) => setSortOrder(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="som-label">Status</label>
                    {/* Toggle Switch */}
                    <div className="ccam-toggle-row">
                      <label className="ccam-toggle-switch">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                        />
                        <span className="ccam-toggle-slider"></span>
                      </label>
                      <span
                        className={`ccam-toggle-label ${isActive ? "ccam-toggle-label-active" : "ccam-toggle-label-inactive"
                          }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="som-modal-footer">
                <button
                  type="button"
                  className="btn-premium btn-ghost"
                  onClick={() => setShowCameraModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-premium btn-premium-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : currentCamera
                      ? "Save Changes"
                      : "Add Camera"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CamConfigView;
