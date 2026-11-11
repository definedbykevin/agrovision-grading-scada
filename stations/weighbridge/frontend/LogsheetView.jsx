import React, { useState, useEffect } from 'react';

export default function LogsheetView({ stationSlug = 'template', stationTitle = 'Template Station', defaultParameters = {} }) {
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    shift: '1',
    log_date: new Date().toISOString().split('T')[0],
    data_json: { ...defaultParameters },
    notes: ''
  });
  const [msg, setMsg] = useState(null);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/logsheet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setHistory(json.data);
      }
    } catch (err) {
      console.error("Failed to load logsheet history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [stationSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/logsheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: 'Logsheet entry saved successfully!' });
        fetchHistory();
        setForm({
          ...form,
          data_json: { ...defaultParameters },
          notes: ''
        });
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to save entry.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to communicate with server.' });
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>{stationTitle} - Logsheet Form</h2>

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
        {/* Form Column */}
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#475569' }}>New Shift Entry</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>LOG DATE</label>
            <input type="date" required value={form.log_date} onChange={e => setForm({ ...form, log_date: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>SHIFT</label>
            <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              <option value="1">Shift 1 (Morning)</option>
              <option value="2">Shift 2 (Afternoon)</option>
              <option value="3">Shift 3 (Night)</option>
            </select>
          </div>

          {/* Dynamic Parameters based on defaultParameters keys */}
          <h4 style={{ margin: '20px 0 10px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Parameters</h4>
          {Object.keys(form.data_json).map(key => (
            <div key={key} style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#334155', marginBottom: '4px', textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </label>
              <input
                type="number"
                step="any"
                required
                value={form.data_json[key] || ''}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setForm({
                    ...form,
                    data_json: { ...form.data_json, [key]: isNaN(val) ? '' : val }
                  });
                }}
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '20px', marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>OPERATOR NOTES</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', height: '80px', resize: 'vertical' }} placeholder="Add observations, problems, or events..." />
          </div>

          <button type="submit" style={{ width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Submit Entry
          </button>
        </form>

        {/* History Column */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#475569' }}>Entry History</h3>
          <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
            {history.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>No logsheet entries recorded yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Shift</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Operator</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Parameters</th>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>{new Date(row.log_date).toLocaleDateString()}</td>
                      <td style={{ padding: '10px' }}>Shift {row.shift}</td>
                      <td style={{ padding: '10px' }}>{row.operator_name}</td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        {Object.entries(row.data_json || {}).map(([k, v]) => (
                          <div key={k}><strong>{k}</strong>: {v}</div>
                        ))}
                      </td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
