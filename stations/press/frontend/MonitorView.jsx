import React, { useState, useEffect } from 'react';

export default function MonitorView({ stationSlug = 'template', stationTitle = 'Template Station' }) {
  const [realtimeData, setRealtimeData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchLive = async () => {
      try {
        const token = localStorage.getItem('kip_token');
        const res = await fetch(`/api/${stationSlug}/monitor/realtime`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (active && json.success) {
            setRealtimeData(json.data);
            setError(null);
          }
        } else {
          if (res.status === 401) {
            setError("Unauthorized. Please login again.");
          } else {
            setError(`Server error: ${res.status}`);
          }
        }
      } catch (err) {
        if (active) setError("Connecting to backend...");
      }
    };

    fetchLive();
    const timer = setInterval(fetchLive, 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [stationSlug]);

  return (
    <div className="som-station-view" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>{stationTitle} - Live Monitoring</h2>
        <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>Real-time telemetry and sensors</p>
      </header>

      {error && (
        <div style={{ padding: '10px 15px', background: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '20px', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {Object.keys(realtimeData).length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#95a5a6', border: '1px dashed #bdc3c7', borderRadius: '8px' }}>
            Waiting for PLC telemetry data broadcast...
          </div>
        ) : (
          Object.entries(realtimeData).map(([tag, val]) => (
            <div key={tag} className="som-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                {tag.replace(`${stationSlug.toUpperCase()}_`, '')}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>
                {val}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  PLC GOOD
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
