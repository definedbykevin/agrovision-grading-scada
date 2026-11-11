import { useState, useEffect, useCallback } from "react";
import "./PlcConfigView.css";
import usePlcStore from "@core/store";

// Auth header helper
const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function PlcConfigView({ user, stationSlug = "daf-osr" }) {
  const [devices, setDevices] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("devices");
  const [liveValues, setLiveValues] = useState({});

  // WebSocket Store
  const initSocket = usePlcStore((state) => state.initSocket);
  const storeTags = usePlcStore((state) => state.tags);

  useEffect(() => {
    if (typeof initSocket === "function") {
      initSocket();
    }
  }, [initSocket]);

  // Modal states
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentTag, setCurrentTag] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [importProgress, setImportProgress] = useState(null);
  const [stickyConfig, setStickyConfig] = useState({
    plc_id: "",
    db_number: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [devRes, tagRes] = await Promise.all([
        fetch(`/api/${stationSlug}/plc-config/devices`, { headers: authHeaders() }),
        fetch(`/api/${stationSlug}/plc-config/tags`, { headers: authHeaders() }),
      ]);

      if (devRes.status === 403 || tagRes.status === 403) return;

      const devData = await devRes.json();
      const tagData = await tagRes.json();

      if (devData.success) setDevices(devData.data || []);
      if (tagData.success) setTags(tagData.data || []);
    } catch (err) {
      console.error("Failed to fetch PLC config data:", err);
    } finally {
      setLoading(false);
    }
  }, [stationSlug]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Polling device status every 3 seconds
  useEffect(() => {
    if (activeTab !== "devices") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/${stationSlug}/plc-config/devices`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) setDevices(data.data || []);
        }
      } catch (e) {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab, stationSlug]);

  // Polling live values on tags tab
  useEffect(() => {
    if (activeTab !== "tags" || tags.length === 0) return;

    let inFlight = false;
    const pollLive = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/${stationSlug}/plc-config/tags-live`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setLiveValues(json.data);
          }
        }
      } catch (e) {
        console.error("Tags live poll failed:", e);
      } finally {
        inFlight = false;
      }
    };

    pollLive();
    const intervalId = setInterval(pollLive, 500);
    return () => clearInterval(intervalId);
  }, [activeTab, tags, stationSlug]);

  // Save device handler
  const handleSaveDevice = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.enabled = data.enabled === "on" ? 1 : 0;
    data.rack = parseInt(data.rack) || 0;
    data.slot = parseInt(data.slot) || 1;

    const url = currentDevice
      ? `/api/${stationSlug}/plc-config/devices/${currentDevice.id}`
      : `/api/${stationSlug}/plc-config/devices`;
    const method = currentDevice ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowDeviceModal(false);
        fetchData();
      } else if (res.status === 403) {
        alert("Access Denied: Developer/Admin role required.");
      }
    } catch (err) {
      console.error("Failed to save device:", err);
    }
  };

  // Delete device handler
  const handleDeleteDevice = async (id) => {
    if (!window.confirm("Delete this PLC device and its associated tags?")) return;
    try {
      const res = await fetch(`/api/${stationSlug}/plc-config/devices/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Failed to delete device:", err);
    }
  };

  // Delete tag handler
  const handleDeleteTag = async (id) => {
    if (!window.confirm("Delete this PLC tag?")) return;
    try {
      const res = await fetch(`/api/${stationSlug}/plc-config/tags/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
  };

  // Bulk Excel import handler
  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split("\n").filter((l) => l.trim());
    const selectedPlcId =
      stickyConfig.plc_id || (devices.length > 0 ? devices[0].id : null);

    if (!selectedPlcId) {
      alert("Please register and select a PLC device first.");
      return;
    }

    setImportProgress({ total: lines.length, current: 0 });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split("\t").map((p) => p.trim());

      // Smart Format Detection
      let name, addr, type;

      // Find which column contains the PLC address (starts with DB, M, I, Q)
      const isAddress = (str) => /^(DB\d+|[MIQ][WDX]?\d+)/i.test(str.trim());
      const addrIndex = parts.findIndex(isAddress);

      if (addrIndex !== -1) {
        addr = parts[addrIndex];

        // Find data type if it exists in columns before address
        for (let j = 0; j < addrIndex; j++) {
          const pUpper = parts[j].toUpperCase();
          if (pUpper.includes("REAL") || pUpper.includes("FLOAT")) type = "REAL";
          else if (pUpper.includes("INT") || pUpper.includes("WORD")) type = "INT";
          else if (pUpper.includes("BOOL")) type = "BOOL";
        }

        // The tag name is usually the first non-numeric column
        const firstNonNum = parts.findIndex((p) => !/^\d+$/.test(p.trim()));
        if (firstNonNum !== -1 && firstNonNum < addrIndex) {
          name = parts[firstNonNum];
        } else {
          name = parts[0];
        }
      } else {
        // Fallback for standard 5 columns or minimal 2 columns
        if (parts.length >= 5) {
          name = parts[1];
          type = parts[2]
            .toUpperCase()
            .replace("REAL (FLOAT)", "REAL")
            .replace("BOOL", "BOOL")
            .replace("INT (16-BIT)", "INT");
          addr = parts[4];
        } else if (parts.length >= 2) {
          name = parts[0];
          addr = parts[parts.length - 1];
        }
      }

      if (name && addr) {
        const addrStr = addr.trim().toUpperCase();

        // Regex patterns for DB and M/I/Q areas
        const boolRegex = /^DB(\d+)\.?DBX(\d+)(?:[.,](\d+))?$/i;
        const otherRegex = /^DB(\d+)\.?DB([WD])(\d+)$/i;
        const miqBoolRegex = /^([MIQ])(\d+)\.(\d+)$/i;
        const miqOtherRegex = /^([MIQ])([WD])(\d+)$/i;

        let db_number, byte_offset, bit_offset, node_id;
        let data_type = type || "BOOL";

        const boolMatch = addrStr.match(boolRegex);
        const otherMatch = addrStr.match(otherRegex);
        const miqBoolMatch = addrStr.match(miqBoolRegex);
        const miqOtherMatch = addrStr.match(miqOtherRegex);

        if (boolMatch) {
          db_number = parseInt(boolMatch[1]);
          byte_offset = parseInt(boolMatch[2]);
          bit_offset = boolMatch[3] !== undefined ? parseInt(boolMatch[3]) : 0;
          data_type = "BOOL";
          node_id = "DB";
        } else if (otherMatch) {
          db_number = parseInt(otherMatch[1]);
          byte_offset = parseInt(otherMatch[3]);
          data_type = otherMatch[2] === "W" ? "INT" : "REAL";
          bit_offset = null;
          node_id = "DB";
        } else if (miqBoolMatch) {
          db_number = 0;
          node_id = miqBoolMatch[1];
          byte_offset = parseInt(miqBoolMatch[2]);
          bit_offset = parseInt(miqBoolMatch[3]);
          data_type = "BOOL";
        } else if (miqOtherMatch) {
          db_number = 0;
          node_id = miqOtherMatch[1];
          byte_offset = parseInt(miqOtherMatch[3]);
          data_type = miqOtherMatch[2] === "W" ? "INT" : "REAL";
          bit_offset = null;
        }

        if (db_number !== undefined) {
          const controlKeywords = ["start", "stop", "open", "close", "reset", "run", "set", "write", "cmd"];
          const isControl = controlKeywords.some((k) => name.toLowerCase().includes(k));

          const tagData = {
            tag_name: name,
            plc_id: selectedPlcId,
            data_type,
            db_number,
            byte_offset,
            bit_offset,
            access: isControl ? "WRITE" : "READ",
            enabled: 1,
            node_id,
          };

          try {
            await fetch(`/api/${stationSlug}/plc-config/tags`, {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify(tagData),
            });
          } catch (e) {
            console.error("Bulk import line failed:", line, e);
          }
        }
      }
      setImportProgress((prev) => ({ ...prev, current: i + 1 }));
    }

    setImportProgress(null);
    setBulkText("");
    setShowBulkModal(false);
    fetchData();
  };

  // Helper: render live value
  const renderLiveValue = (tagName, tagId) => {
    // 1. Check WebSocket Store first
    const wsData = storeTags[tagName];
    // 2. Fallback to HTTP poll liveValues cache
    const httpVal = liveValues[tagName] !== undefined ? liveValues[tagName] : liveValues[tagId];
    const liveVal = wsData?.value !== undefined ? wsData.value : httpVal;

    if (liveVal === undefined || liveVal === null) {
      return (
        <span style={{ color: "var(--plc-text-muted)", fontSize: "0.75rem", fontStyle: "italic" }}>
          0 25h ago
        </span>
      );
    }

    const num = parseFloat(liveVal);
    const displayVal = isNaN(num) ? String(liveVal) : +(Math.round(num + "e+2") + "e-2");

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: "800",
            fontSize: "1rem",
            color: "#0f172a",
          }}
        >
          {displayVal}
        </span>
        <span
          style={{
            fontSize: "0.625rem",
            fontWeight: "800",
            padding: "2px 6px",
            borderRadius: "4px",
            background: "rgba(16, 185, 129, 0.15)",
            color: "#10b981",
            border: "1px solid rgba(16, 185, 129, 0.3)",
          }}
        >
          LIVE
        </span>
      </div>
    );
  };

  // Helper: render device status
  const renderDeviceStatus = (dev) => {
    const isOnline = dev.enabled && dev.status?.toLowerCase() === "connected";
    const statusText = isOnline ? "CONNECTED" : (dev.status || "DISCONNECTED");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div className={`som-status-indicator ${isOnline ? "som-status-connected" : "som-status-disconnected"}`}>
          <span className="som-status-dot"></span>
          {statusText}
        </div>
        {dev.last_seen_at && (
          <span style={{ fontSize: "0.65rem", color: "var(--plc-text-muted)", opacity: 0.8 }}>
            Last: {new Date(dev.last_seen_at).toLocaleTimeString("id-ID")}
          </span>
        )}
      </div>
    );
  };

  // ✅ Helper: Format PLC address in Siemens S7 standard & M/I/Q / OPC_UA
  const formatAddress = (tag) => {
    if (!tag) return "N/A";
    if (tag.protocol === 'OPC_UA') return tag.node_id || 'NOT SET';

    const area = tag.node_id && ['M', 'I', 'Q'].includes(tag.node_id.toUpperCase())
      ? tag.node_id.toUpperCase()
      : 'DB';

    if (area !== 'DB') {
      if (tag.byte_offset === null || tag.byte_offset === undefined || tag.byte_offset === "") return "N/A";
      if (tag.data_type === "BOOL")
        return `${area}${tag.byte_offset}.${tag.bit_offset ?? 0}`;
      if (tag.data_type === "INT")
        return `${area}W${tag.byte_offset}`;
      if (tag.data_type === "DINT" || tag.data_type === "REAL")
        return `${area}D${tag.byte_offset}`;
      return `${area}${tag.byte_offset}`;
    } else {
      const isDbEmpty = tag.db_number === null || tag.db_number === undefined || tag.db_number === "";
      const isOffsetEmpty = tag.byte_offset === null || tag.byte_offset === undefined || tag.byte_offset === "";
      if (isDbEmpty || isOffsetEmpty) return "N/A";
      if (tag.data_type === "BOOL")
        return `DB${tag.db_number}.DBX${tag.byte_offset}.${tag.bit_offset ?? 0}`;
      if (tag.data_type === "INT")
        return `DB${tag.db_number}.DBW${tag.byte_offset}`;
      if (tag.data_type === "DINT" || tag.data_type === "REAL")
        return `DB${tag.db_number}.DBD${tag.byte_offset}`;
      return `DB${tag.db_number}.${tag.byte_offset}`;
    }
  };

  if (loading) {
    return (
      <div className="som-config-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div className="som-loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="som-config-page">
      {/* Header Section */}
      <div className="som-config-header-group">
        <div className="som-config-title-area">
          <h2>PLC Integration</h2>
          <p className="som-config-subtitle">
            Configure Devices and map Tags I/O to logical memory addresses.
          </p>
        </div>

        {/* Tab Switcher - Industrial Amber Accent */}
        <div className="som-tab-container">
          <button
            className={`som-tab-btn ${activeTab === "devices" ? "active" : ""}`}
            onClick={() => setActiveTab("devices")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <line x1="6" y1="6" x2="6" y2="6" />
              <line x1="6" y1="18" x2="6" y2="18" />
            </svg>
            Devices
          </button>
          <button
            className={`som-tab-btn ${activeTab === "tags" ? "active" : ""}`}
            onClick={() => setActiveTab("tags")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 2H3s-1 10 9 10 9-10 9-10z" />
              <path d="M12 12v10" />
              <path d="M7 22h10" />
            </svg>
            Tags I/O
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="som-config-main-card">
        {activeTab === "devices" ? (
          <>
            <div className="som-card-header">
              <div className="som-card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Registered Devices
              </div>
              <button
                className="btn-premium btn-premium-primary"
                onClick={() => {
                  setCurrentDevice(null);
                  setShowDeviceModal(true);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Device
              </button>
            </div>

            <div className="som-table-wrapper">
              <table className="som-modern-table">
                <thead>
                  <tr>
                    <th>Identity</th>
                    <th>Network Endpoint</th>
                    <th>Topology (Rack/Slot)</th>
                    <th>Operational Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((dev) => (
                    <tr key={dev.id}>
                      <td>
                        <div className="som-device-name">
                          {dev.name}
                          <span className="som-device-meta">PLC Interface</span>
                        </div>
                      </td>
                      <td>
                        <span className="som-ip-badge">{dev.ip_address}</span>
                      </td>
                      <td>
                        <div className="som-topology-badge">
                          R{dev.rack} / S{dev.slot}
                        </div>
                      </td>
                      <td>{renderDeviceStatus(dev)}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            className="action-icon-btn"
                            title="Edit"
                            onClick={() => {
                              setCurrentDevice(dev);
                              setShowDeviceModal(true);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="action-icon-btn delete"
                            title="Delete"
                            onClick={() => handleDeleteDevice(dev.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "80px 0", color: "var(--plc-text-muted)" }}>
                        No hardware devices registered. Click "+ Add Device" above to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="som-card-header">
              <div className="som-card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Registered Tags I/O
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn-premium btn-ghost"
                  onClick={() => setShowBulkModal(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  Bulk Import Excel
                </button>
                <button
                  className="btn-premium btn-premium-primary"
                  onClick={() => {
                    setCurrentTag(null);
                    setShowTagModal(true);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Tag
                </button>
              </div>
            </div>

            <div className="som-table-wrapper">
              <table className="som-modern-table">
                <thead>
                  <tr>
                    <th>Tag Identifier</th>
                    <th>Source Device</th>
                    <th>Memory Address</th>
                    <th>Data Type</th>
                    <th>Live Value</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag) => (
                    <tr key={tag.id}>
                      <td style={{ fontWeight: "700" }}>{tag.tag_name}</td>
                      <td>
                        <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
                          {tag.device_name || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className="som-ip-badge"
                          style={{
                            color: "var(--text-primary)",
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--plc-border)",
                            fontWeight: "700",
                          }}
                        >
                          {formatAddress(tag)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#64748b" }}>
                          {tag.data_type}
                        </span>
                      </td>
                      <td>{renderLiveValue(tag.tag_name, tag.id)}</td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            className="action-icon-btn"
                            title="Edit"
                            onClick={() => {
                              setCurrentTag(tag);
                              setShowTagModal(true);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="action-icon-btn delete"
                            title="Delete"
                            onClick={() => handleDeleteTag(tag.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tags.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "80px 0", color: "var(--plc-text-muted)" }}>
                        No PLC tags registered. Click "+ Add Tag" or "Bulk Import Excel" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Add/Edit Device */}
      {showDeviceModal && (
        <div className="som-modal-overlay" onClick={() => setShowDeviceModal(false)}>
          <div className="som-premium-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveDevice}>
              <div className="som-modal-header">
                <h3>{currentDevice ? "Update Device" : "New Device"}</h3>
                <button type="button" className="action-icon-btn" onClick={() => setShowDeviceModal(false)}>
                  ✕
                </button>
              </div>
              <div className="som-modal-body">
                <div className="form-grid-2">
                  <div className="form-group-full">
                    <label className="som-label">Device Identifier</label>
                    <input
                      type="text"
                      name="name"
                      className="som-input"
                      defaultValue={currentDevice?.name}
                      required
                      placeholder="e.g. DAF_PLC_01"
                    />
                  </div>
                  <div className="form-group-full">
                    <label className="som-label">Network IP Endpoint</label>
                    <input
                      type="text"
                      name="ip_address"
                      className="som-input"
                      defaultValue={currentDevice?.ip_address}
                      required
                      placeholder="10.0.0.10"
                    />
                  </div>
                  <div>
                    <label className="som-label">Rack Position</label>
                    <input
                      type="number"
                      name="rack"
                      className="som-input"
                      defaultValue={currentDevice?.rack || 0}
                      required
                    />
                  </div>
                  <div>
                    <label className="som-label">Slot Position</label>
                    <input
                      type="number"
                      name="slot"
                      className="som-input"
                      defaultValue={currentDevice?.slot || 1}
                      required
                    />
                  </div>
                </div>
                <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    name="enabled"
                    id="p-en"
                    defaultChecked={currentDevice ? currentDevice.enabled : true}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <label htmlFor="p-en" style={{ fontSize: "0.875rem", fontWeight: "600", cursor: "pointer" }}>
                    Active Operational Mode
                  </label>
                </div>
              </div>
              <div className="som-modal-footer">
                <button type="button" className="btn-premium btn-ghost" onClick={() => setShowDeviceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-premium btn-premium-primary">
                  Synchronize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Tag */}
      <TagModalContent
        show={showTagModal}
        onClose={() => setShowTagModal(false)}
        currentTag={currentTag}
        stickyConfig={stickyConfig}
        setStickyConfig={setStickyConfig}
        devices={devices}
        fetchData={fetchData}
        stationSlug={stationSlug}
      />

      {/* Modal: Bulk Spreadsheet Import */}
      {showBulkModal && (
        <div className="som-modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="som-premium-modal" style={{ maxWidth: "800px" }} onClick={(e) => e.stopPropagation()}>
            <div className="som-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "var(--plc-primary)", color: "white", padding: "8px", borderRadius: "8px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Bulk Spreadsheet Import</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
                    Paste multiple rows directly from Excel / Google Sheets
                  </p>
                </div>
              </div>
            </div>
            <div className="som-modal-body">
              {importProgress ? (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                  <div className="som-loading-spinner" style={{ margin: "0 auto 1.5rem" }}></div>
                  <h4 style={{ margin: "0 0 8px 0" }}>Importing Tags...</h4>
                  <p style={{ fontSize: "0.875rem", color: "var(--plc-text-muted)" }}>
                    {importProgress.current} / {importProgress.total} completed
                  </p>
                  <div style={{ width: "100%", height: "8px", background: "var(--bg-tertiary)", borderRadius: "4px", marginTop: "1.5rem", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                        height: "100%",
                        background: "var(--plc-primary)",
                        transition: "width 0.3s ease",
                      }}
                    ></div>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      marginBottom: "1.5rem",
                      fontSize: "0.8125rem",
                      color: "var(--plc-text-muted)",
                      background: "rgba(14, 165, 233, 0.05)",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(14, 165, 233, 0.2)",
                    }}
                  >
                    <b>Instruksi:</b> Blok baris di Excel (termasuk kolom Nama, Tipe Data, dan Alamat), tekan <b>Ctrl+C</b>, lalu paste (<b>Ctrl+V</b>) di bawah. Sistem akan memproses semuanya sekaligus.
                  </div>
                  <div className="form-group-full">
                    <label className="som-label">Excel Data Container</label>
                    <textarea
                      className="som-input"
                      rows="10"
                      placeholder="1	AIR_FLOW	REAL	0	DB1.DBD0&#10;2	WATER_LEVEL	REAL	4	DB1.DBD4"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      style={{ fontFamily: "monospace", fontSize: "0.8125rem", lineHeight: "1.5" }}
                    ></textarea>
                  </div>
                  <div style={{ marginTop: "1rem" }}>
                    <label className="som-label">Import Target Controller</label>
                    <select
                      className="som-select"
                      value={stickyConfig.plc_id}
                      onChange={(e) => setStickyConfig({ ...stickyConfig, plc_id: e.target.value })}
                    >
                      <option value="">Select PLC Device...</option>
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="som-modal-footer">
              <button
                className="btn-premium btn-ghost"
                onClick={() => setShowBulkModal(false)}
                disabled={!!importProgress}
              >
                Cancel
              </button>
              <button
                className="btn-premium btn-premium-primary"
                onClick={handleBulkImport}
                disabled={!bulkText || !!importProgress}
              >
                Start Bulk Deployment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components & Helpers ---

const formatAddress = (tag) => {
  if (!tag) return "N/A";
  if (tag.protocol === 'OPC_UA') return tag.node_id || 'NOT SET';

  const area = tag.node_id && ['M', 'I', 'Q'].includes(tag.node_id.toUpperCase())
    ? tag.node_id.toUpperCase()
    : 'DB';

  if (area !== 'DB') {
    if (tag.byte_offset === null || tag.byte_offset === undefined || tag.byte_offset === "") return "N/A";
    if (tag.data_type === "BOOL")
      return `${area}${tag.byte_offset}.${tag.bit_offset ?? 0}`;
    if (tag.data_type === "INT")
      return `${area}W${tag.byte_offset}`;
    if (tag.data_type === "DINT" || tag.data_type === "REAL")
      return `${area}D${tag.byte_offset}`;
    return `${area}${tag.byte_offset}`;
  } else {
    const isDbEmpty = tag.db_number === null || tag.db_number === undefined || tag.db_number === "";
    const isOffsetEmpty = tag.byte_offset === null || tag.byte_offset === undefined || tag.byte_offset === "";
    if (isDbEmpty || isOffsetEmpty) return "N/A";
    if (tag.data_type === "BOOL")
      return `DB${tag.db_number}.DBX${tag.byte_offset}.${tag.bit_offset ?? 0}`;
    if (tag.data_type === "INT")
      return `DB${tag.db_number}.DBW${tag.byte_offset}`;
    if (tag.data_type === "DINT" || tag.data_type === "REAL")
      return `DB${tag.db_number}.DBD${tag.byte_offset}`;
    return `DB${tag.db_number}.${tag.byte_offset}`;
  }
};

// Sub-component: TagModalContent
function TagModalContent({
  show,
  onClose,
  currentTag,
  stickyConfig,
  setStickyConfig,
  devices,
  fetchData,
  stationSlug,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    tag_name: "",
    plc_id: "",
    data_type: "REAL",
    db_number: "1",
    byte_offset: "0",
    bit_offset: "",
    node_id: "",
    access: "READ",
    enabled: true,
    quick_address: "",
  });

  useEffect(() => {
    if (show) {
      setFormData({
        tag_name: currentTag?.tag_name ?? "",
        plc_id: currentTag?.plc_id ?? stickyConfig.plc_id ?? (devices[0]?.id || ""),
        data_type: currentTag?.data_type ?? "REAL",
        db_number: currentTag?.db_number ?? stickyConfig.db_number ?? "1",
        byte_offset: currentTag?.byte_offset ?? "0",
        bit_offset: currentTag?.bit_offset ?? "",
        node_id: currentTag?.node_id ?? "",
        access: currentTag?.access ?? "READ",
        enabled: currentTag ? currentTag.enabled : true,
        quick_address: currentTag ? formatAddress(currentTag) : "",
      });
      setShowAdvanced(false);
    }
  }, [show, currentTag, stickyConfig, devices]);

  const handleQuickParse = (val) => {
    const newUpdates = { quick_address: val };
    if (!val) {
      setFormData((prev) => ({ ...prev, ...newUpdates }));
      return;
    }
    
    const dbBoolRegex = /^DB(\d+)\.DBX(\d+)(?:[.,](\d+))?$/i;
    const dbOtherRegex = /^DB(\d+)\.DB([WD])(\d+)$/i;
    const iqmMxRegex = /^([IMQ])([WD]?)(\d+)(?:\.(\d+))?$/i;

    const dbBoolMatch = val.match(dbBoolRegex);
    if (dbBoolMatch) {
      newUpdates.node_id = "DB";
      newUpdates.db_number = dbBoolMatch[1];
      newUpdates.byte_offset = dbBoolMatch[2];
      newUpdates.bit_offset = dbBoolMatch[3] !== undefined ? dbBoolMatch[3] : "0";
      newUpdates.data_type = "BOOL";
    } else {
      const dbOtherMatch = val.match(dbOtherRegex);
      if (dbOtherMatch) {
        newUpdates.node_id = "DB";
        newUpdates.db_number = dbOtherMatch[1];
        newUpdates.byte_offset = dbOtherMatch[3];
        newUpdates.data_type = dbOtherMatch[2].toUpperCase() === "W" ? "INT" : "REAL";
        newUpdates.bit_offset = "";
      } else {
        const iqmMatch = val.match(iqmMxRegex);
        if (iqmMatch) {
          const area = iqmMatch[1].toUpperCase();
          const sizeChar = iqmMatch[2].toUpperCase();
          const byteOffset = iqmMatch[3];
          const bitOffset = iqmMatch[4];
          
          newUpdates.node_id = area;
          newUpdates.db_number = "0";
          newUpdates.byte_offset = byteOffset;
          
          if (!sizeChar && bitOffset !== undefined) {
             newUpdates.bit_offset = bitOffset;
             newUpdates.data_type = "BOOL";
          } else {
             newUpdates.bit_offset = "";
             newUpdates.data_type = sizeChar === "W" ? "INT" : "REAL";
          }
        }
      }
    }
    setFormData((prev) => ({ ...prev, ...newUpdates }));
  };

  const getPreview = () => {
    const { data_type, db_number, byte_offset, bit_offset, node_id } = formData;
    const area = node_id && ['M', 'I', 'Q'].includes(node_id.toUpperCase()) ? node_id.toUpperCase() : 'DB';

    if (area !== 'DB') {
      if (byte_offset === "" || byte_offset === null || byte_offset === undefined) return `${area}?.?`;
      if (data_type === "BOOL")
        return `${area}${byte_offset}.${bit_offset !== "" && bit_offset !== null && bit_offset !== undefined ? bit_offset : 0}`;
      if (data_type === "INT") return `${area}W${byte_offset}`;
      if (data_type === "DINT" || data_type === "REAL")
        return `${area}D${byte_offset}`;
      return `${area}${byte_offset}`;
    } else {
      const isDbEmpty = db_number === "" || db_number === null || db_number === undefined;
      const isOffsetEmpty = byte_offset === "" || byte_offset === null || byte_offset === undefined;
      if (isDbEmpty || isOffsetEmpty) return "DB?.???";
      if (data_type === "BOOL")
        return `DB${db_number}.DBX${byte_offset}.${bit_offset !== "" && bit_offset !== null && bit_offset !== undefined ? bit_offset : 0}`;
      if (data_type === "INT") return `DB${db_number}.DBW${byte_offset}`;
      if (data_type === "DINT" || data_type === "REAL")
        return `DB${db_number}.DBD${byte_offset}`;
      return `DB${db_number}.${byte_offset}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isOpcUa = devices?.find(d => String(d.id) === String(formData.plc_id))?.protocol === 'OPC_UA';
    const area = formData.node_id && ['M', 'I', 'Q'].includes(formData.node_id.toUpperCase())
      ? formData.node_id.toUpperCase()
      : 'DB';

    let dbNumber = 0;
    let byteOffset = 0;

    if (isOpcUa) {
      if (!formData.node_id) {
        alert('Please fill in the Node ID for OPC UA.');
        return;
      }
    } else {
      if (area === 'DB' && (formData.db_number === "" || formData.db_number === null || formData.db_number === undefined)) {
        alert('Please fill in DB Number for Snap7 Data Block.');
        return;
      }
      if (formData.byte_offset === "" || formData.byte_offset === null || formData.byte_offset === undefined) {
        alert('Please fill in Byte Offset for Snap7.');
        return;
      }
      dbNumber = area === 'DB' ? parseInt(formData.db_number) : 0;
      byteOffset = parseInt(formData.byte_offset);
      if (isNaN(dbNumber) || isNaN(byteOffset)) {
        alert('DB Number and Byte Offset must be valid numbers.');
        return;
      }
    }

    const submissionData = {
      ...formData,
      plc_id: parseInt(formData.plc_id),
      db_number: dbNumber,
      byte_offset: byteOffset,
      bit_offset: formData.data_type === "BOOL" ? parseInt(formData.bit_offset || 0) : null,
      enabled: formData.enabled ? 1 : 0,
      node_id: formData.node_id || (area !== 'DB' ? area : 'DB'),
    };

    const url = currentTag
      ? `/api/${stationSlug}/plc-config/tags/${currentTag.id}`
      : `/api/${stationSlug}/plc-config/tags`;
    const method = currentTag ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(submissionData),
      });
      if (res.ok) {
        setStickyConfig({
          plc_id: submissionData.plc_id,
          db_number: submissionData.db_number,
        });
        onClose();
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to save tag"}`);
      }
    } catch (err) {
      console.error("Failed to save tag:", err);
    }
  };

  if (!show) return null;

  return (
    <div className="som-modal-overlay" onClick={onClose}>
      <div className="som-premium-modal" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="som-modal-header">
            <h3>{currentTag ? "Edit Tag Settings" : "Register New Tag I/O"}</h3>
            <button type="button" className="action-icon-btn" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="som-modal-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ padding: "1rem", background: "var(--bg-tertiary)", borderRadius: "12px", border: "1px dashed var(--plc-border)" }}>
                <label className="som-label" style={{ color: "var(--plc-primary)" }}>
                  Siemens Address Parser (Ctrl+V)
                </label>
                <input
                  type="text"
                  className="som-input"
                  placeholder="e.g. DB1.DBD0 or DB1.DBX0.0"
                  value={formData.quick_address}
                  autoFocus
                  onChange={(e) => handleQuickParse(e.target.value)}
                  style={{ borderStyle: "dashed", fontSize: "1rem", fontWeight: "700" }}
                />
              </div>

              <div>
                <label className="som-label">Tag Name</label>
                <input
                  type="text"
                  name="tag_name"
                  className="som-input"
                  value={formData.tag_name}
                  onChange={(e) => setFormData({ ...formData, tag_name: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. AIR_FLOW_PV"
                />
              </div>

              <div>
                <label className="som-label">Target Controller</label>
                <select
                  name="plc_id"
                  className="som-select"
                  value={formData.plc_id}
                  onChange={(e) => setFormData({ ...formData, plc_id: e.target.value })}
                  required
                >
                  <option value="">Select PLC Device...</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {!showAdvanced ? (
                <div style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--plc-primary)",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Show Technical Details (DB, Byte, Data Type)
                  </button>
                </div>
              ) : (
                <div className="form-grid-2">
                  <div>
                    <label className="som-label">Data Type</label>
                    <select
                      name="data_type"
                      className="som-select"
                      value={formData.data_type}
                      onChange={(e) => setFormData({ ...formData, data_type: e.target.value })}
                      required
                    >
                      <option value="REAL">REAL (Float)</option>
                      <option value="BOOL">BOOL</option>
                      <option value="INT">INT (16bit)</option>
                      <option value="DINT">DINT (32bit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="som-label">Access</label>
                    <select
                      name="access"
                      className="som-select"
                      value={formData.access}
                      onChange={(e) => setFormData({ ...formData, access: e.target.value })}
                      required
                    >
                      <option value="READ">READ Only</option>
                      <option value="WRITE">WRITE (Control)</option>
                    </select>
                  </div>
                  <div>
                    <label className="som-label">DB Number</label>
                    <input
                      type="number"
                      name="db_number"
                      className="som-input"
                      value={formData.db_number}
                      onChange={(e) => setFormData({ ...formData, db_number: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="som-label">Byte Offset</label>
                    <input
                      type="number"
                      name="byte_offset"
                      className="som-input"
                      value={formData.byte_offset}
                      onChange={(e) => setFormData({ ...formData, byte_offset: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="som-label">Bit (0-7)</label>
                    <input
                      type="number"
                      name="bit_offset"
                      className="som-input"
                      value={formData.bit_offset}
                      onChange={(e) => setFormData({ ...formData, bit_offset: e.target.value })}
                      disabled={formData.data_type !== "BOOL"}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "28px" }}>
                    <input
                      type="checkbox"
                      name="enabled"
                      id="t-en"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    />
                    <label htmlFor="t-en" className="som-label" style={{ marginBottom: 0, cursor: "pointer" }}>
                      Active
                    </label>
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(14, 165, 233, 0.08)",
                  borderRadius: "8px",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "0.7rem", fontWeight: "800", color: "var(--plc-primary)", textTransform: "uppercase" }}>
                  Computed Address
                </span>
                <span style={{ fontFamily: "monospace", fontWeight: "900", fontSize: "1.25rem", color: "var(--plc-primary)" }}>
                  {getPreview()}
                </span>
              </div>
            </div>
          </div>
          <div className="som-modal-footer">
            <button type="button" className="btn-premium btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-premium btn-premium-primary">
              Deploy Tag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
