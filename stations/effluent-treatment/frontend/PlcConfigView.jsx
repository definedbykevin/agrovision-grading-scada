import React, { useState, useEffect } from 'react';

export default function PlcConfigView({ stationSlug = 'template', stationTitle = 'Template Station' }) {
  const [devices, setDevices] = useState([]);
  const [tags, setTags] = useState([]);
  const [msg, setMsg] = useState(null);
  const [deviceForm, setDeviceForm] = useState({ name: '', ip_address: '', rack: 0, slot: 1, enabled: 1 });
  const [tagForm, setTagForm] = useState({ plc_id: '', db_number: 1, byte_offset: 0, bit_offset: null, data_type: 'REAL', tag_name: '', access: 'READ', enabled: 1 });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const devRes = await fetch(`/api/${stationSlug}/plc-config/devices`, { headers: { 'Authorization': `Bearer ${token}` } });
      const tagRes = await fetch(`/api/${stationSlug}/plc-config/tags`, { headers: { 'Authorization': `Bearer ${token}` } });
      
      if (devRes.ok) {
        const dJson = await devRes.json();
        if (dJson.success) setDevices(dJson.data);
      }
      if (tagRes.ok) {
        const tJson = await tagRes.json();
        if (tJson.success) setTags(tJson.data);
      }
    } catch (err) {
      console.error("Failed to load PLC config:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stationSlug]);

  const handleSaveDevice = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/plc-config/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(deviceForm)
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: 'PLC Device saved!' });
        fetchData();
        setDeviceForm({ name: '', ip_address: '', rack: 0, slot: 1, enabled: 1 });
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to save PLC device.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Communication error.' });
    }
  };

  const handleSaveTag = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/plc-config/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(tagForm)
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: 'PLC Tag saved!' });
        fetchData();
        setTagForm({ plc_id: '', db_number: 1, byte_offset: 0, bit_offset: null, data_type: 'REAL', tag_name: '', access: 'READ', enabled: 1 });
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to save PLC tag.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Communication error.' });
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>{stationTitle} - PLC Registry Configuration</h2>

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Device Registration */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>PLC Devices</h3>
          <form onSubmit={handleSaveDevice} style={{ marginBottom: '25px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <input type="text" required placeholder="Device Name" value={deviceForm.name} onChange={e => setDeviceForm({ ...deviceForm, name: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <input type="text" required placeholder="IP Address" value={deviceForm.ip_address} onChange={e => setDeviceForm({ ...deviceForm, ip_address: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <input type="number" required placeholder="Rack" value={deviceForm.rack} onChange={e => setDeviceForm({ ...deviceForm, rack: parseInt(e.target.value) || 0 })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <input type="number" required placeholder="Slot" value={deviceForm.slot} onChange={e => setDeviceForm({ ...deviceForm, slot: parseInt(e.target.value) || 1 })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <button type="submit" style={{ padding: '8px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add PLC Device</button>
          </form>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Device</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>IP</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Rack/Slot</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{d.name}</td>
                  <td style={{ padding: '8px' }}>{d.ip_address}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{d.rack} / {d.slot}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ color: d.enabled ? 'green' : 'red' }}>{d.enabled ? 'Enabled' : 'Disabled'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tag Registration */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>PLC Tags</h3>
          <form onSubmit={handleSaveTag} style={{ marginBottom: '25px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <select required value={tagForm.plc_id} onChange={e => setTagForm({ ...tagForm, plc_id: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <option value="">Select PLC Device</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="text" required placeholder="Tag Name (e.g. STERI_TEMP)" value={tagForm.tag_name} onChange={e => setTagForm({ ...tagForm, tag_name: e.target.value.toUpperCase() })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <input type="number" required placeholder="DB Number" value={tagForm.db_number} onChange={e => setTagForm({ ...tagForm, db_number: parseInt(e.target.value) || 1 })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <input type="number" required placeholder="Byte Offset" value={tagForm.byte_offset} onChange={e => setTagForm({ ...tagForm, byte_offset: parseInt(e.target.value) || 0 })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              <select required value={tagForm.data_type} onChange={e => setTagForm({ ...tagForm, data_type: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <option value="REAL">REAL (Float)</option>
                <option value="BOOL">BOOL</option>
                <option value="INT">INT (16bit)</option>
                <option value="DINT">DINT (32bit)</option>
              </select>
              <select required value={tagForm.access} onChange={e => setTagForm({ ...tagForm, access: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                <option value="READ">READ Only</option>
                <option value="WRITE">WRITE (Control)</option>
              </select>
            </div>
            <button type="submit" style={{ padding: '8px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Register PLC Tag</button>
          </form>

          <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Tag Name</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>DB.Byte</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Type</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Access</th>
                </tr>
              </thead>
              <tbody>
                {tags.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{t.tag_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>DB {t.db_number}.{t.byte_offset}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{t.data_type}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{t.access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
