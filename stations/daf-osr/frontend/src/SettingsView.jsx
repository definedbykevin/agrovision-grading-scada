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
    <div className="som-settings-view-root" style={{ padding: '20px', fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--som-text-primary, #f8fafc)' }}>
      <h2 className="som-settings-title" style={{ margin: '0 0 20px 0', color: 'var(--som-accent-primary, #20d7f2)', fontSize: '20px', fontWeight: 800, letterSpacing: '0.04em', textShadow: '0 0 12px rgba(32, 215, 242, 0.35)' }}>
        {stationTitle} - Threshold Settings
      </h2>

      {msg && (
        <div style={{
          padding: '10px 15px',
          background: msg.type === 'success' ? 'rgba(32, 215, 242, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: msg.type === 'success' ? '#20d7f2' : '#f87171',
          border: `1px solid ${msg.type === 'success' ? 'rgba(32, 215, 242, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '12px',
          fontWeight: 600
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '24px' }}>
        {/* Form */}
        <form className="som-settings-form-card" onSubmit={handleSubmit} style={{ background: 'var(--som-card-bg, rgba(8, 24, 48, 0.85))', border: '1px solid var(--som-border-color, rgba(32, 215, 242, 0.25))', borderRadius: '10px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
          <h3 className="som-settings-subtitle" style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(32, 215, 242, 0.2)', paddingBottom: '10px', color: 'var(--som-accent-primary, #20d7f2)', fontSize: '14px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Set Alarm Limit
          </h3>

          <div style={{ marginBottom: '15px' }}>
            <label className="som-settings-label" style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'rgba(175, 235, 245, 0.8)', marginBottom: '6px', letterSpacing: '0.05em' }}>PARAMETER KEY</label>
            <input className="som-settings-input" type="text" required value={form.parameter_key} onChange={e => setForm({ ...form, parameter_key: e.target.value.toUpperCase() })} placeholder="e.g. STERI_TEMP" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(4, 16, 36, 0.85)', border: '1px solid rgba(32, 215, 242, 0.35)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label className="som-settings-label" style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'rgba(175, 235, 245, 0.8)', marginBottom: '6px', letterSpacing: '0.05em' }}>LOWER LIMIT</label>
            <input className="som-settings-input" type="number" step="any" required value={form.lower_val} onChange={e => setForm({ ...form, lower_val: parseFloat(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(4, 16, 36, 0.85)', border: '1px solid rgba(32, 215, 242, 0.35)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label className="som-settings-label" style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'rgba(175, 235, 245, 0.8)', marginBottom: '6px', letterSpacing: '0.05em' }}>WARNING LIMIT (≥)</label>
            <input className="som-settings-input" type="number" step="any" required value={form.warning_val} onChange={e => setForm({ ...form, warning_val: parseFloat(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(4, 16, 36, 0.85)', border: '1px solid rgba(32, 215, 242, 0.35)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label className="som-settings-label" style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'rgba(175, 235, 245, 0.8)', marginBottom: '6px', letterSpacing: '0.05em' }}>DANGER LIMIT (≥)</label>
            <input className="som-settings-input" type="number" step="any" required value={form.danger_val} onChange={e => setForm({ ...form, danger_val: parseFloat(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(4, 16, 36, 0.85)', border: '1px solid rgba(32, 215, 242, 0.35)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="som-settings-label" style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'rgba(175, 235, 245, 0.8)', marginBottom: '6px', letterSpacing: '0.05em' }}>UNIT</label>
            <input className="som-settings-input" type="text" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="e.g. °C, Bar, RPM" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(4, 16, 36, 0.85)', border: '1px solid rgba(32, 215, 242, 0.35)', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', outline: 'none' }} />
          </div>

          <button className="som-settings-save-btn" type="submit" style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, #20d7f2 0%, #0099ff 100%)', color: '#020c1b', border: 'none', borderRadius: '6px', fontWeight: '900', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 0 14px rgba(32, 215, 242, 0.4)', transition: 'all 0.2s ease' }}>
            Save Threshold
          </button>
        </form>

        {/* Existing Thresholds List */}
        <div className="som-settings-table-card" style={{ background: 'var(--som-card-bg, rgba(8, 24, 48, 0.85))', border: '1px solid var(--som-border-color, rgba(32, 215, 242, 0.25))', borderRadius: '10px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
          <h3 className="som-settings-subtitle" style={{ margin: '0 0 16px 0', borderBottom: '1px solid rgba(32, 215, 242, 0.2)', paddingBottom: '10px', color: 'var(--som-accent-primary, #20d7f2)', fontSize: '14px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Active Parameter Thresholds
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="som-settings-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(12, 34, 68, 0.95)', borderBottom: '2px solid rgba(32, 215, 242, 0.4)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 10px', color: 'var(--som-accent-primary, #20d7f2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parameter</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--som-accent-primary, #20d7f2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lower</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--som-accent-primary, #20d7f2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warning (≥)</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--som-accent-primary, #20d7f2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danger (≥)</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', color: 'var(--som-accent-primary, #20d7f2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit</th>
                </tr>
              </thead>
              <tbody>
                {thresholds.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px 20px', color: 'rgba(148, 163, 184, 0.7)', fontStyle: 'italic' }}>No thresholds registered.</td>
                  </tr>
                ) : (
                  thresholds.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid rgba(32, 215, 242, 0.1)', cursor: 'pointer', transition: 'background 0.15s ease' }} onClick={() => setForm(row)}>
                      <td style={{ padding: '12px 10px', fontWeight: '800', color: '#38bdf8' }}>{row.parameter_key}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', color: '#f8fafc' }}>{row.lower_val}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', color: '#f59e0b', fontWeight: '800' }}>{row.warning_val}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', color: '#ef4444', fontWeight: '800' }}>{row.danger_val}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', color: '#94a3b8' }}>{row.unit || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
