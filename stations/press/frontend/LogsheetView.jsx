import React, { useState, useEffect } from 'react';
import './Logsheet.css';

const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
  '19:00', '20:00', '21:00', '22:00', '23:00', '00:00',
  '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'
];

export default function LogsheetView({ stationSlug = 'press' }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('hourly'); // 'hourly' or 'summary'
  const [hourlyData, setHourlyData] = useState({});
  const [manualData, setManualData] = useState({
    press: {}, digester: {}, mesin: {}, notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entryId, setEntryId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kip_token');
      // Fetch automated hourly data
      const resHour = await fetch(`/api/${stationSlug}/logsheet/hourly?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resHour.ok) {
        const json = await resHour.json();
        if (json.success) setHourlyData(json.data || {});
      }

      // Fetch manual entries for this date
      const resManual = await fetch(`/api/${stationSlug}/logsheet?date=${date}&shift=ALL`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resManual.ok) {
        const jsonM = await resManual.json();
        if (jsonM.success && jsonM.data.length > 0) {
          const entry = jsonM.data[0];
          setEntryId(entry.id);
          setManualData({
            press: entry.data_json?.press || {},
            digester: entry.data_json?.digester || {},
            mesin: entry.data_json?.mesin || {},
            notes: entry.notes || ''
          });
        } else {
          setEntryId(null);
          setManualData({ press: {}, digester: {}, mesin: {}, notes: '' });
        }
      }
    } catch (err) {
      console.error("Failed to load press logsheet data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [date, stationSlug]);

  const handleManualChange = (section, key, field, value) => {
    setManualData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: {
          ...(prev[section][key] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('kip_token');
      const payload = {
        shift: 'ALL',
        log_date: date,
        data_json: {
          press: manualData.press,
          digester: manualData.digester,
          mesin: manualData.mesin
        },
        notes: manualData.notes
      };

      const url = entryId ? `/api/${stationSlug}/logsheet/${entryId}` : `/api/${stationSlug}/logsheet`;
      const method = entryId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        alert('Manual summary saved successfully!');
        if (!entryId) setEntryId(json.id);
      } else {
        alert('Failed to save data: ' + json.error);
      }
    } catch (e) {
      console.error(e);
      alert('Error saving data');
    }
    setSaving(false);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/logsheet/export-excel?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Logsheet_Pressing_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  };

  const getTagValue = (hourStr, tag) => {
    let targetDate = new Date(date);
    const hr = parseInt(hourStr.split(':')[0]);
    if (hr < 7) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const fullDateStr = `${targetDate.toISOString().split('T')[0]} ${hourStr}:00`;
    
    if (hourlyData[fullDateStr] && hourlyData[fullDateStr][tag] !== undefined) {
      return Number(hourlyData[fullDateStr][tag]).toFixed(1);
    }
    return '-';
  };

  return (
    <div style={{ padding: '24px', flex: 1, overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: 'bold' }}>Press Station Logsheet</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Automated Hourly Monitoring & Daily Summary</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              style={{ border: 'none', outline: 'none', padding: '8px 0', color: '#334155', fontWeight: '500' }}
            />
          </div>
          <button 
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            Refresh Data
          </button>
          <button 
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            Export to Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('hourly')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'hourly' ? '3px solid #3b82f6' : '3px solid transparent', color: activeTab === 'hourly' ? '#3b82f6' : '#64748b', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s' }}>
          Hourly Logs
        </button>
        <button 
          onClick={() => setActiveTab('summary')}
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'summary' ? '3px solid #3b82f6' : '3px solid transparent', color: activeTab === 'summary' ? '#3b82f6' : '#64748b', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s' }}>
          Daily Summary & Manual Input
        </button>
      </div>

      {/* Content */}
      {activeTab === 'hourly' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Fetching automated scada logs...</div>
          ) : (
            <>
              {/* Press Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#0f172a', color: '#fff', padding: '12px 16px', fontWeight: 'bold' }}>
                  Screw Press Unit Status
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                        <th rowSpan="2" style={{ padding: '12px 8px', borderRight: '1px solid #e2e8f0', width: '80px' }}>Hour</th>
                        {[1, 2, 3, 4].map(n => (
                          <th key={`th_p_${n}`} colSpan="3" style={{ padding: '8px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Press No. {n}</th>
                        ))}
                      </tr>
                      <tr style={{ background: '#f1f5f9', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                        {[1, 2, 3, 4].map(n => (
                          <React.Fragment key={`sub_th_p_${n}`}>
                            <th style={{ padding: '6px', borderRight: '1px solid #e2e8f0' }}>Amp (A)</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #e2e8f0' }}>Hid Press (Kg)</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #e2e8f0' }}>Cone Load (A)</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {HOURS.map((hr, i) => (
                        <tr key={hr} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#334155', borderRight: '1px solid #e2e8f0' }}>{hr}</td>
                          {[1, 2, 3, 4].map(n => (
                            <React.Fragment key={`td_p_${n}`}>
                              <td style={{ padding: '10px 8px', borderRight: '1px solid #f1f5f9', color: '#0284c7', fontWeight: '500' }}>{getTagValue(hr, `PRESS${n}_AMP`)}</td>
                              <td style={{ padding: '10px 8px', borderRight: '1px solid #f1f5f9', color: '#0284c7', fontWeight: '500' }}>{getTagValue(hr, `PRESS${n}_HL`)}</td>
                              <td style={{ padding: '10px 8px', borderRight: '1px solid #e2e8f0', color: '#0284c7', fontWeight: '500' }}>{getTagValue(hr, `PRESS${n}_%`)}</td>
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Digester Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#f59e0b', color: '#fff', padding: '12px 16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Digester Unit Status</span>
                  <span>COT Temp: <strong>{getTagValue('12:00', 'COT_TEMP')} °C</strong></span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                        <th rowSpan="2" style={{ padding: '12px 8px', borderRight: '1px solid #e2e8f0', width: '80px' }}>Hour</th>
                        {[1, 2, 3, 4].map(n => (
                          <th key={`th_d_${n}`} colSpan="3" style={{ padding: '8px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Digester No. {n}</th>
                        ))}
                      </tr>
                      <tr style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px', textTransform: 'uppercase' }}>
                        {[1, 2, 3, 4].map(n => (
                          <React.Fragment key={`sub_th_d_${n}`}>
                            <th style={{ padding: '6px', borderRight: '1px solid #fde68a' }}>Amp</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #fde68a' }}>Level (%)</th>
                            <th style={{ padding: '6px', borderRight: '1px solid #fde68a' }}>Temp (°C)</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {HOURS.map((hr, i) => (
                        <tr key={hr} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fffbeb' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#334155', borderRight: '1px solid #e2e8f0' }}>{hr}</td>
                          {[1, 2, 3, 4].map(n => (
                            <React.Fragment key={`td_d_${n}`}>
                              <td style={{ padding: '10px 8px', borderRight: '1px solid #fef08a', color: '#b45309', fontWeight: '500' }}>{getTagValue(hr, `DIG${n}_AMP`)}</td>
                              <td style={{ padding: '10px 8px', borderRight: '1px solid #fef08a', color: '#b45309', fontWeight: '500' }}>{getTagValue(hr, `DIG${n}_%`)}</td>
                              <td style={{ padding: '10px 8px', borderRight: '1px solid #fde68a', color: '#dc2626', fontWeight: 'bold' }}>{getTagValue(hr, `DIG${n}_TEMP`)}</td>
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          {/* Press Summary Card */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0f172a' }}>
              Screw Press Operations Summary
            </div>
            <div style={{ padding: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }}>
                <thead>
                  <tr style={{ color: '#64748b' }}>
                    <th style={{ paddingBottom: '8px' }}>Press</th>
                    <th style={{ paddingBottom: '8px' }}>Start</th>
                    <th style={{ paddingBottom: '8px' }}>Stop</th>
                    <th style={{ paddingBottom: '8px' }}>Wormscrew</th>
                    <th style={{ paddingBottom: '8px' }}>HM Hari Ini</th>
                    <th style={{ paddingBottom: '8px' }}>HM S/D</th>
                    <th style={{ paddingBottom: '8px' }}>HM Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map(num => (
                    <tr key={`press_sm_${num}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#334155' }}>#{num}</td>
                      <td style={{ padding: '4px' }}><input type="time" style={inputStyle} value={manualData.press[num]?.start || ''} onChange={e => handleManualChange('press', num, 'start', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="time" style={inputStyle} value={manualData.press[num]?.stop || ''} onChange={e => handleManualChange('press', num, 'stop', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="text" placeholder="RPM" style={inputStyle} value={manualData.press[num]?.rpm || ''} onChange={e => handleManualChange('press', num, 'rpm', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="text" placeholder="Hours" style={inputStyle} value={manualData.press[num]?.hm_hari || ''} onChange={e => handleManualChange('press', num, 'hm_hari', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="text" placeholder="S/D" style={inputStyle} value={manualData.press[num]?.hm_sd || ''} onChange={e => handleManualChange('press', num, 'hm_sd', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="text" placeholder="Total" style={inputStyle} value={manualData.press[num]?.hm_total || ''} onChange={e => handleManualChange('press', num, 'hm_total', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Digester Summary Card */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ background: '#fef3c7', padding: '16px', borderBottom: '1px solid #fde68a', fontWeight: 'bold', color: '#92400e' }}>
              Digester Operations Summary
            </div>
            <div style={{ padding: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }}>
                <thead>
                  <tr style={{ color: '#92400e' }}>
                    <th style={{ paddingBottom: '8px' }}>Digester</th>
                    <th style={{ paddingBottom: '8px' }}>Start</th>
                    <th style={{ paddingBottom: '8px' }}>Stop</th>
                    <th style={{ paddingBottom: '8px' }}>Op Hour (Total)</th>
                    <th style={{ paddingBottom: '8px' }}>HM Hari Ini</th>
                    <th style={{ paddingBottom: '8px' }}>HM S/D</th>
                    <th style={{ paddingBottom: '8px' }}>HM Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map(num => (
                    <tr key={`dig_sm_${num}`} style={{ borderTop: '1px solid #fef08a' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#b45309' }}>#{num}</td>
                      <td style={{ padding: '4px' }}><input type="time" style={inputStyleWarm} value={manualData.digester[num]?.start || ''} onChange={e => handleManualChange('digester', num, 'start', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="time" style={inputStyleWarm} value={manualData.digester[num]?.stop || ''} onChange={e => handleManualChange('digester', num, 'stop', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="text" placeholder="Op Total" style={inputStyleWarm} value={manualData.digester[num]?.total || ''} onChange={e => handleManualChange('digester', num, 'total', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="text" placeholder="Hours" style={inputStyleWarm} value={manualData.digester[num]?.hm_hari || ''} onChange={e => handleManualChange('digester', num, 'hm_hari', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="text" placeholder="S/D" style={inputStyleWarm} value={manualData.digester[num]?.hm_sd || ''} onChange={e => handleManualChange('digester', num, 'hm_sd', e.target.value)} /></td>
                      <td style={{ padding: '4px' }}><input type="text" placeholder="HM Total" style={inputStyleWarm} value={manualData.digester[num]?.hm_total || ''} onChange={e => handleManualChange('digester', num, 'hm_total', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CBC & V.Screen Card */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0f172a' }}>
              Auxiliary Machinery (CBC & V.Screen)
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {['CBC 1', 'CBC 2'].map((mesin, idx) => (
                  <div key={mesin} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155', marginBottom: '8px' }}>{mesin}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <input type="time" title="Start" style={inputStyle} value={manualData.mesin[mesin]?.start || ''} onChange={e => handleManualChange('mesin', mesin, 'start', e.target.value)} />
                        <input type="time" title="Stop" style={inputStyle} value={manualData.mesin[mesin]?.stop || ''} onChange={e => handleManualChange('mesin', mesin, 'stop', e.target.value)} />
                        <input type="text" placeholder="Total" title="Total" style={inputStyle} value={manualData.mesin[mesin]?.total || ''} onChange={e => handleManualChange('mesin', mesin, 'total', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155', marginBottom: '8px' }}>V.Screen {idx+1}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input type="time" title="Stop" style={inputStyle} value={manualData.mesin[`V.Screen ${idx+1}`]?.vstop || ''} onChange={e => handleManualChange('mesin', `V.Screen ${idx+1}`, 'vstop', e.target.value)} />
                        <input type="text" placeholder="Total" title="Total" style={inputStyle} value={manualData.mesin[`V.Screen ${idx+1}`]?.vtotal || ''} onChange={e => handleManualChange('mesin', `V.Screen ${idx+1}`, 'vtotal', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
              <span>Shift Supervisor Notes</span>
              <button 
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '4px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                {saving ? 'Saving...' : 'Save Summary'}
              </button>
            </div>
            <div style={{ padding: '16px', flex: 1, display: 'flex' }}>
              <textarea 
                placeholder="Enter any abnormalities or breakdown notes here..."
                value={manualData.notes}
                onChange={e => setManualData(p => ({ ...p, notes: e.target.value }))}
                style={{ width: '100%', minHeight: '150px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'vertical', outline: 'none', fontSize: '13px', color: '#334155', fontFamily: 'inherit' }}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  outline: 'none',
  fontSize: '12px',
  color: '#334155',
  textAlign: 'center',
  background: '#fff'
};

const inputStyleWarm = {
  ...inputStyle,
  border: '1px solid #fcd34d',
  background: '#fffbeb',
  color: '#92400e'
};
