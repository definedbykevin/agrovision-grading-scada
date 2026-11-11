import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaExclamationTriangle, FaSearch, FaFilter, FaCheckCircle, FaTools, FaClock, FaEye, FaExternalLinkAlt, FaShieldAlt, FaLock } from 'react-icons/fa';

function IncidentsTab() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIncidents = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch('/api/security/incidents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      const dataList = Array.isArray(json) ? json : (json.data || json.incidents || []);
      setIncidents(dataList);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/security/incidents/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          status: newStatus,
          resolved_notes: newStatus === 'RESOLVED' ? 'Resolved and verified via Command Center' : 'Status updated to Maintenance WO'
        })
      });
      if (res.ok) {
        setSelectedIncident(null);
        fetchIncidents();
      }
    } catch (err) {
      console.error('Failed to update incident status:', err);
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    const status = (inc.status || 'SUBMITTED').toUpperCase();
    if (activeTab === 'SUBMITTED' && status !== 'SUBMITTED') return false;
    if (activeTab === 'REVIEWED' && status !== 'REVIEWED') return false;
    if (activeTab === 'RESOLVED' && status !== 'RESOLVED') return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const code = (inc.incident_code || inc.id || '').toString().toLowerCase();
    const type = (inc.incident_type || inc.type || inc.incident_category || '').toLowerCase();
    const location = (inc.location || inc.station_name || '').toLowerCase();
    const reporter = (inc.reported_by_name || inc.guardName || '').toLowerCase();
    const desc = (inc.description || inc.incident_description || '').toLowerCase();

    return code.includes(query) || type.includes(query) || location.includes(query) || reporter.includes(query) || desc.includes(query);
  });

  // Calculate Metrics
  const totalCount = incidents.length;
  const submittedCount = incidents.filter(i => (i.status || '').toUpperCase() === 'SUBMITTED').length;
  const reviewedCount = incidents.filter(i => (i.status || '').toUpperCase() === 'REVIEWED').length;
  const resolvedCount = incidents.filter(i => (i.status || '').toUpperCase() === 'RESOLVED').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b', fontFamily: 'system-ui' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em' }}>LOADING ANOMALY TICKETS PIPELINE...</span>
        </div>
      </div>
    );
  }

  const isUnderDevelopment = true;

  return (
    <div className="som-view-container" style={{ position: 'relative', padding: '0', background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

      {/* ── TOP METRICS PIPELINE BAR (FLUSH FULL-WIDTH ALIGNMENT) ── */}
      <div style={{
        padding: '16px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        flexShrink: 0,
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          width: '100%'
        }}>
          {/* Metric 1 */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaShieldAlt />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TOTAL ANOMALIES</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', lineHeight: '1.2' }}>{totalCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>Tickets</span></div>
            </div>
          </div>

          {/* Metric 2 */}
          <div style={{ background: '#f8fafc', border: '1px solid #fed7aa', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaClock />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#ea580c', letterSpacing: '0.05em', textTransform: 'uppercase' }}>WAITING OPERATOR</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#c2410c', lineHeight: '1.2' }}>{submittedCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#ea580c' }}>Submitted</span></div>
            </div>
          </div>

          {/* Metric 3 */}
          <div style={{ background: '#f8fafc', border: '1px solid #bae6fd', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaTools />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', letterSpacing: '0.05em', textTransform: 'uppercase' }}>MAINTENANCE WO</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0369a1', lineHeight: '1.2' }}>{reviewedCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7' }}>Work Orders</span></div>
            </div>
          </div>

          {/* Metric 4 */}
          <div style={{ background: '#f8fafc', border: '1px solid #bbf7d0', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaCheckCircle />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>RESOLVED & VERIFIED</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#15803d', lineHeight: '1.2' }}>{resolvedCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>Fixed</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA (FULL-WIDTH 100% WITHOUT SIDE SPACE) ── */}
      <div style={{ padding: '16px 0px', flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '0px',
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>

          {/* ── HEADER FILTER & SEARCH BAR ── */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            background: '#ffffff'
          }}>
            {/* Title & Pipeline Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                ANOMALY TICKETS PIPELINE
              </span>
              <span style={{ fontSize: '10px', fontWeight: '800', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '20px', border: '1px solid #fca5a5' }}>
                TIERED ROUTING ACTIVE
              </span>
            </div>

            {/* Right Controls: [Search Form] [Status Filter Tabs] */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }} />
                <input
                  type="text"
                  placeholder="Search Ticket, Station, Reporter..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '8px 14px 8px 36px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    outline: 'none',
                    width: '260px',
                    transition: 'all 0.2s'
                  }}
                />
              </div>

              {/* Status Filter Tabs */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
                {[
                  { key: 'ALL', label: 'ALL TICKETS' },
                  { key: 'SUBMITTED', label: 'WAITING OPERATOR' },
                  { key: 'REVIEWED', label: 'MAINTENANCE WO' },
                  { key: 'RESOLVED', label: 'RESOLVED' }
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      background: activeTab === t.key ? '#0f172a' : 'transparent',
                      color: activeTab === t.key ? '#ffffff' : '#64748b',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.03em',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── TABLE CONTAINER ── */}
          <div style={{ flex: '1', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={thStyle}>REPORT TIME</th>
                  <th style={thStyle}>TICKET NO.</th>
                  <th style={thStyle}>STATION / LOCATION</th>
                  <th style={thStyle}>ANOMALY CATEGORY</th>
                  <th style={thStyle}>REPORTED BY</th>
                  <th style={thStyle}>PRIORITY</th>
                  <th style={thStyle}>PHOTO PROOF</th>
                  <th style={thStyle}>WORKFLOW STATUS</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <FaExclamationTriangle style={{ fontSize: '32px', color: '#cbd5e1' }} />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>NO ANOMALY TICKETS FOUND</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Patrol findings recorded with notes will automatically appear here for Operator validation.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc, idx) => {
                    const reportedAt = inc.reported_at || inc.created_at;
                    const code = inc.incident_code || inc.id || `INC-${inc.id}`;
                    const location = inc.location || inc.station_name || 'General Factory Area';
                    const type = inc.incident_type || inc.type || inc.incident_category || 'Patrol Finding';
                    const reporter = inc.reported_by_name || inc.guardName || `Guard (ID: ${inc.reported_by || inc.user_id || '-'})`;
                    const priority = (inc.priority || 'MEDIUM').toUpperCase();
                    const rawPhoto = inc.photo_path || inc.photoPath;
                    const getPhotoUrl = (urlStr) => {
                      if (!urlStr) return null;
                      if (urlStr.startsWith('http') || urlStr.startsWith('blob:') || urlStr.startsWith('data:')) return urlStr;
                      if (urlStr.startsWith('/uploads')) return `http://${window.location.hostname}:3101${urlStr}`;
                      return urlStr;
                    };
                    const photo = getPhotoUrl(rawPhoto);
                    const status = (inc.status || 'SUBMITTED').toUpperCase();

                    let statusLabel = 'WAITING OPERATOR';
                    let statusBg = '#fff7ed';
                    let statusColor = '#c2410c';
                    let statusBorder = '#fed7aa';

                    if (status === 'REVIEWED') {
                      statusLabel = 'ROUTED TO MAINTENANCE';
                      statusBg = '#e0f2fe';
                      statusColor = '#0369a1';
                      statusBorder = '#bae6fd';
                    } else if (status === 'RESOLVED') {
                      statusLabel = 'RESOLVED & VERIFIED';
                      statusBg = '#dcfce7';
                      statusColor = '#15803d';
                      statusBorder = '#bbf7d0';
                    }

                    return (
                      <tr key={inc.id || code || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa', transition: 'background 0.15s' }}>

                        {/* Report Time */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                            {reportedAt ? new Date(reportedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') + ' WIB' : '-'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                            {reportedAt ? new Date(reportedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                        </td>

                        {/* Ticket Code */}
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '900',
                            color: '#991b1b',
                            background: '#fee2e2',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fca5a5'
                          }}>
                            {code}
                          </span>
                        </td>

                        {/* Location */}
                        <td style={{ ...tdStyle, fontWeight: '800', color: '#0f172a' }}>{location}</td>

                        {/* Type */}
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#334155' }}>{type}</td>

                        {/* Reporter */}
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#475569', fontWeight: '600' }}>{reporter}</td>

                        {/* Priority */}
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '900',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: priority === 'CRITICAL' || priority === 'HIGH' ? '#fef2f2' : '#f8fafc',
                            color: priority === 'CRITICAL' || priority === 'HIGH' ? '#dc2626' : '#64748b',
                            border: priority === 'CRITICAL' || priority === 'HIGH' ? '1px solid #fecaca' : '1px solid #e2e8f0'
                          }}>
                            {priority}
                          </span>
                        </td>

                        {/* Photo */}
                        <td style={tdStyle}>
                          {photo ? (
                            <button
                              onClick={() => setSelectedIncident(inc)}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '2px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <img 
                                src={photo} 
                                alt="Incident Proof" 
                                style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} 
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                }}
                              />
                              <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', paddingRight: '4px' }}>View</span>
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '600' }}>No Photo</span>
                          )}
                        </td>

                        {/* Workflow Status */}
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '900',
                            letterSpacing: '0.04em',
                            background: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusBorder}`
                          }}>
                            {statusLabel}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedIncident(inc)}
                            style={{
                              background: '#0f172a',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '800',
                              letterSpacing: '0.02em',
                              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
                              transition: 'all 0.15s'
                            }}
                          >
                            DETAILS
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── INCIDENT DETAIL & ROUTING MODAL ── */}
      {selectedIncident && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '650px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#dc2626', letterSpacing: '0.05em' }}>ANOMALY TICKET DETAILS</span>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: '2px 0 0 0' }}>
                  {selectedIncident.incident_type || selectedIncident.type || selectedIncident.incident_category || 'Patrol Anomaly'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ background: '#f1f5f9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Photo */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px' }}>PHOTO EVIDENCE</div>
                {(selectedIncident.photo_path || selectedIncident.photoPath) ? (
                  <div style={{ width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
                    <img 
                      src={(selectedIncident.photo_path || selectedIncident.photoPath).startsWith('/uploads') ? `http://${window.location.hostname}:3101${selectedIncident.photo_path || selectedIncident.photoPath}` : (selectedIncident.photo_path || selectedIncident.photoPath)} 
                      alt="Incident" 
                      style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '250px', objectFit: 'contain' }} 
                    />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '180px', borderRadius: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                    No Photo Attached
                  </div>
                )}
              </div>

              {/* Data & Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>TICKET CODE</div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#991b1b' }}>{selectedIncident.incident_code || selectedIncident.id}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>STATION LOCATION</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{selectedIncident.location || selectedIncident.station_name || 'General Factory Area'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>REPORTED BY</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>{selectedIncident.reported_by_name || selectedIncident.guardName || 'Security Officer'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>DESCRIPTION / FINDING NOTES</div>
                  <div style={{ fontSize: '12px', color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', marginTop: '4px', lineHeight: '1.4' }}>
                    {selectedIncident.description || selectedIncident.incident_description || 'No description provided'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedIncident.status === 'SUBMITTED' && (
                <button
                  onClick={() => handleStatusUpdate(selectedIncident.id, 'REVIEWED')}
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
                >
                  FORWARD TO MAINTENANCE WO
                </button>
              )}
              {selectedIncident.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleStatusUpdate(selectedIncident.id, 'RESOLVED')}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
                >
                  MARK AS RESOLVED
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── COMING SOON OVERLAY ── */}
      {isUnderDevelopment && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(3px)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#ffffff'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '24px', borderRadius: '50%', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <FaLock style={{ fontSize: '42px', color: '#FFDB3B' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1', marginTop: '8px' }}>The Incident Anomaly module is currently locked for development.</span>
        </div>
      )}

    </div>
  );
}

const thStyle = {
  padding: '12px 14px',
  fontSize: '10px',
  fontWeight: '900',
  color: '#475569',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '12px 14px',
  fontSize: '12px',
  whiteSpace: 'nowrap'
};

export default IncidentsTab;
