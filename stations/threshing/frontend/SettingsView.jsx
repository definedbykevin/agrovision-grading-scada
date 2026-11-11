import React, { useState, useEffect } from 'react';

export default function SettingsView({ stationSlug = 'template', stationTitle = 'Template Station' }) {
  const [thresholds, setThresholds] = useState([]);
  const [form, setForm] = useState({
    parameter_key: '',
    lower_val: 0,
    warning_val: 50,
    danger_val: 80,
    unit: ''
  });
  const [msg, setMsg] = useState(null);

  const fetchThresholds = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/settings/thresholds`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setThresholds(json.data);
      }
    } catch (err) {
      console.error("Failed to load thresholds:", err);
    }
  };

  useEffect(() => {
    fetchThresholds();
  }, [stationSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/settings/thresholds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: 'Threshold setting saved!' });
        fetchThresholds();
        setForm({
          parameter_key: '',
          lower_val: 0,
          warning_val: 50,
          danger_val: 80,
          unit: ''
        });
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to save threshold.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to communicate with server.' });
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>{stationTitle} - Threshold Settings</h2>

      {msg && (
        <div style={{
          padding: '10px 15px',
          background: msg.type === 'success' ? '#e8f5e9' : '#ffebee',
          color: msg.type === 'success' ? '#2e7d32' : '#c62828',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#475569' }}>Set Alarm Limit</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>PARAMETER KEY</label>
            <input type="text" required value={form.parameter_key} onChange={e => setForm({ ...form, parameter_key: e.target.value.toUpperCase() })} placeholder="e.g. STERI_TEMP" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>LOWER LIMIT</label>
            <input type="number" step="any" required value={form.lower_val} onChange={e => setForm({ ...form, lower_val: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>WARNING LIMIT (>=)</label>
            <input type="number" step="any" required value={form.warning_val} onChange={e => setForm({ ...form, warning_val: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>DANGER LIMIT (>=)</label>
            <input type="number" step="any" required value={form.danger_val} onChange={e => setForm({ ...form, danger_val: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>UNIT</label>
            <input type="text" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="e.g. °C, Bar, RPM" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>

          <button type="submit" style={{ width: '100%', padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Save Threshold
          </button>
        </form>

        {/* Existing Thresholds List */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#475569' }}>Active Parameter Thresholds</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>Parameter</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>Lower</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>Warning (>=)</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>Danger (>=)</th>
                <th style={{ textAlign: 'center', padding: '10px' }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No thresholds registered.</td>
                </tr>
              ) : (
                thresholds.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }} onClick={() => setForm(row)}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>{row.parameter_key}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{row.lower_val}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#d97706', fontWeight: 'bold' }}>{row.warning_val}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>{row.danger_val}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>{row.unit || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
