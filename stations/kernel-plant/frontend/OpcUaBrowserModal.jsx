import React, { useState, useEffect } from "react";
import "./PlcConfigView.css";

const OpcUaBrowserModal = ({ onClose, onImport, stationSlug, authHeaders }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [currentPath, setCurrentPath] = useState([{ nodeId: "RootFolder", browseName: "Root" }]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Selection state for import
  const [selectedNodes, setSelectedNodes] = useState([]);

  useEffect(() => {
    // Fetch devices to see which ones are OPC UA
    fetch(`/api/${stationSlug}/plc-config/devices`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const opcUaDevs = data.data.filter(d => d.protocol === 'OPC_UA');
          setDevices(opcUaDevs);
          if (opcUaDevs.length === 1) {
            setSelectedDevice(opcUaDevs[0].id);
          }
        }
      })
      .catch(err => console.error("Failed to fetch devices for browser:", err));
  }, [stationSlug, authHeaders]);

  useEffect(() => {
    if (selectedDevice) {
      browseNode("RootFolder");
    }
  }, [selectedDevice]);

  const browseNode = async (nodeId, browseName = null) => {
    if (!selectedDevice) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${stationSlug}/plc-config/devices/${selectedDevice}/opcua-browse?nodeId=${encodeURIComponent(nodeId)}`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNodes(data.data);
        if (browseName) {
          const pathIdx = currentPath.findIndex(p => p.nodeId === nodeId);
          if (pathIdx >= 0) {
            setCurrentPath(currentPath.slice(0, pathIdx + 1));
          } else {
            setCurrentPath([...currentPath, { nodeId, browseName }]);
          }
        }
      } else {
        setError(data.error || "Failed to browse node");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateUp = (index) => {
    const target = currentPath[index];
    setCurrentPath(currentPath.slice(0, index + 1));
    browseNode(target.nodeId);
  };

  const handleNodeClick = (node) => {
    if (node.nodeClass !== 'Variable') {
      browseNode(node.nodeId, node.browseName);
    }
  };

  const toggleNodeSelection = (node) => {
    if (node.nodeClass !== 'Variable') return;
    setSelectedNodes(prev => {
      const exists = prev.find(n => n.nodeId === node.nodeId);
      if (exists) return prev.filter(n => n.nodeId !== node.nodeId);
      return [...prev, node];
    });
  };

  const isSelected = (nodeId) => selectedNodes.some(n => n.nodeId === nodeId);

  const handleImport = () => {
    onImport(selectedNodes, selectedDevice);
    onClose();
  };

  return (
    <div className="som-modal-overlay" onClick={onClose}>
      <div className="som-premium-modal" style={{ maxWidth: '800px', width: '90vw' }} onClick={e => e.stopPropagation()}>
        <div className="som-modal-header">
          <h3>Browse OPC UA Server</h3>
          <button type="button" className="action-icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="som-modal-body" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          {devices.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--plc-text-muted)' }}>
              No OPC UA devices configured or connected. Please add an OPC UA device first.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '15px' }}>
                <label className="som-label">Select Device to Browse</label>
                <select 
                  className="som-select"
                  value={selectedDevice} 
                  onChange={(e) => {
                    setSelectedDevice(e.target.value);
                    setCurrentPath([{ nodeId: "RootFolder", browseName: "Root" }]);
                  }}
                >
                  <option value="">-- Select OPC UA Device --</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.ip_address})</option>
                  ))}
                </select>
              </div>

              {selectedDevice && (
                <>
                  {/* Breadcrumb Path */}
                  <div style={{ background: '#f5f7f9', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--plc-primary)' }}>Path:</span>
                    {currentPath.map((p, idx) => (
                      <React.Fragment key={p.nodeId}>
                        <span 
                          style={{ cursor: 'pointer', color: idx === currentPath.length - 1 ? 'var(--text-primary)' : 'var(--plc-primary)', textDecoration: idx === currentPath.length - 1 ? 'none' : 'underline' }}
                          onClick={() => handleNavigateUp(idx)}
                        >
                          {p.browseName}
                        </span>
                        {idx < currentPath.length - 1 && <span>/</span>}
                      </React.Fragment>
                    ))}
                  </div>

                  {error && <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px', background: '#fee', padding: '10px', borderRadius: '4px' }}>{error}</div>}

                  {/* Nodes List */}
                  <div style={{ flex: 1, border: '1px solid var(--plc-border)', borderRadius: '6px', overflowY: 'auto', maxHeight: '400px', position: 'relative' }}>
                    {loading ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--plc-text-muted)' }}>Loading nodes...</div>
                    ) : nodes.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--plc-text-muted)' }}>No items found in this folder.</div>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {nodes.map(node => (
                          <li 
                            key={node.nodeId}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              padding: '10px 15px',
                              borderBottom: '1px solid var(--plc-border)',
                              background: isSelected(node.nodeId) ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {node.nodeClass === 'Variable' ? (
                              <input 
                                type="checkbox" 
                                checked={isSelected(node.nodeId)}
                                onChange={() => toggleNodeSelection(node)}
                                style={{ marginRight: '15px', transform: 'scale(1.2)' }}
                              />
                            ) : (
                              <span style={{ marginRight: '15px', width: '16px', display: 'inline-block' }}></span>
                            )}
                            
                            <div 
                              style={{ 
                                flex: 1, 
                                cursor: node.nodeClass === 'Object' || node.nodeClass === 'Folder' ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                              }}
                              onClick={() => handleNodeClick(node)}
                            >
                              {node.nodeClass === 'Object' || node.nodeClass === 'Folder' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--plc-primary)" stroke="var(--plc-primary)" strokeWidth="1">
                                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                              ) : node.nodeClass === 'Variable' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--plc-success)" strokeWidth="2">
                                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                </svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--plc-text-muted)" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                </svg>
                              )}
                              <div>
                                <div style={{ fontWeight: '500', color: node.nodeClass === 'Object' || node.nodeClass === 'Folder' ? 'var(--plc-primary)' : 'var(--text-primary)' }}>
                                  {node.browseName}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--plc-text-muted)' }}>{node.nodeId}</div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="som-modal-footer">
          <div style={{ fontSize: '13px', color: 'var(--plc-text-muted)' }}>
            {selectedNodes.length} tags selected
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-premium btn-ghost" onClick={onClose}>Cancel</button>
            <button 
              className="btn-premium btn-premium-primary" 
              onClick={handleImport}
              disabled={selectedNodes.length === 0}
            >
              Import Selected Tags
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpcUaBrowserModal;
