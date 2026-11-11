import React, { useState, useEffect } from 'react';
import usePlcStore from '@core/store';

const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00','03:00','04:00','05:00','06:00'];

const RIPPLE_MILLS = [1, 2, 3, 4, 5];
const NUT_SILOS = [1, 2, 3];
const KERNEL_SILOS = [1, 2, 3];

const machinesList = [
  { id: 'rip1', name: 'Ripple Mill 1' },
  { id: 'rip2', name: 'Ripple Mill 2' },
  { id: 'rip3', name: 'Ripple Mill 3' },
  { id: 'ltds1', name: 'LTDS 1' },
  { id: 'ltds2', name: 'LTDS 2' },
  { id: 'fiber_cyclone', name: 'Fiber Cyclone' }
];

export default function LogsheetView() {
  const [history, setHistory] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [msg, setMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('hourly');
  
  // Realtime tags for current viewing
  const tags = usePlcStore(s => s.tags);
  const [hourlyData, setHourlyData] = useState({});

  // Manual Form State
  const [form, setForm] = useState({
    losses_wet: '', losses_dry: '', dirt_feed: '', calcium: '', notes: '',
    machines: {
      rip1: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
      rip2: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
      rip3: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
      ltds1: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
      ltds2: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
      fiber_cyclone: { start: '', stop: '', total: '' }
    }
  });

  const fetchHourly = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/kernel-plant/logsheet/hourly?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setHourlyData(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/kernel-plant/logsheet?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          const entry = json.data[0];
          setHistory(json.data);
          if (entry.data_json) {
            setForm({
              losses_wet: entry.data_json.losses_wet || '',
              losses_dry: entry.data_json.losses_dry || '',
              dirt_feed: entry.data_json.dirt_feed || '',
              calcium: entry.data_json.calcium || '',
              notes: entry.notes || '',
              machines: entry.data_json.machines || form.machines
            });
          }
        } else {
          setHistory([]);
          // Reset
          setForm({
            losses_wet: '', losses_dry: '', dirt_feed: '', calcium: '', notes: '',
            machines: {
              rip1: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
              rip2: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
              rip3: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
              ltds1: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
              ltds2: { start: '', stop: '', total: '', hm_hari: '', hm_sd: '', hm_tot: '' },
              fiber_cyclone: { start: '', stop: '', total: '' }
            }
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHourly();
    fetchHistory();
    // eslint-disable-next-line
  }, [date]);

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const payload = {
        log_date: date,
        notes: form.notes,
        data_json: {
          losses_wet: form.losses_wet,
          losses_dry: form.losses_dry,
          dirt_feed: form.dirt_feed,
          calcium: form.calcium,
          machines: form.machines
        }
      };

      const res = await fetch('/api/kernel-plant/logsheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: 'Data saved successfully!' });
        fetchHistory();
      } else {
        setMsg({ type: 'error', text: json.error || 'Failed to save.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Connection error.' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/kernel-plant/logsheet/export-excel?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Logsheet_Kernel_Plant_${date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Export failed");
      }
    } catch (err) {
      alert("Export error: " + err.message);
    }
  };

  const getTagValue = (hourStr, tag) => {
    let targetDate = new Date(date);
    const hr = parseInt(hourStr.split(':')[0]);
    if (hr < 7) targetDate.setDate(targetDate.getDate() + 1);
    const fullDateStr = `${targetDate.toISOString().split('T')[0]} ${hourStr}:00`;
    
    if (hourlyData[fullDateStr] && hourlyData[fullDateStr][tag] !== undefined) {
      return Number(hourlyData[fullDateStr][tag]).toFixed(1);
    }
    return '-';
  };

  const handleMachineChange = (mach, field, val) => {
    setForm(prev => ({
      ...prev,
      machines: {
        ...prev.machines,
        [mach]: { ...prev.machines[mach], [field]: val }
      }
    }));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>Kernel Plant Logsheet</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
          <button onClick={fetchHourly} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Refresh Data</button>
          <button onClick={handleExport} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Export Excel</button>
        </div>
      </div>

      {msg && <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '6px', background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', color: msg.type === 'success' ? '#166534' : '#991b1b' }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <button onClick={() => setActiveTab('hourly')} style={{ padding: '10px 20px', background: activeTab === 'hourly' ? '#3b82f6' : '#f8fafc', color: activeTab === 'hourly' ? '#fff' : '#64748b', border: '1px solid #e2e8f0', borderBottom: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer' }}>Hourly Data</button>
        <button onClick={() => setActiveTab('manual')} style={{ padding: '10px 20px', background: activeTab === 'manual' ? '#3b82f6' : '#f8fafc', color: activeTab === 'manual' ? '#fff' : '#64748b', border: '1px solid #e2e8f0', borderBottom: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer' }}>Daily Summary & Manual Input</button>
      </div>

      {activeTab === 'hourly' && (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 12px 12px 12px', overflowX: 'auto', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
              <th rowSpan="3" style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>JAM</th>
              <th colSpan={RIPPLE_MILLS.length} style={{ padding: '8px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>EFFICIENCY RIPPLE MILL</th>
              <th colSpan={NUT_SILOS.length} style={{ padding: '8px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>LEVEL NUT SILO</th>
              <th colSpan={KERNEL_SILOS.length} style={{ padding: '8px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>LEVEL KERNEL SILO</th>
              <th colSpan={9} style={{ padding: '8px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>TEMPERATUR (°C) KERNEL SILO</th>
              <th rowSpan="3" style={{ padding: '8px', borderRight: '1px solid #e2e8f0', width: '80px', whiteSpace: 'normal' }}>Pengiriman Kernel ke bungkil silo</th>
              <th rowSpan="3" style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>FIBER<br/>Cyclone<br/>(A)</th>
              <th rowSpan="3" style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>LTDS 1<br/>Fan (A)</th>
              <th rowSpan="3" style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>LTDS 2<br/>Fan (A)</th>
            </tr>
            <tr style={{ background: '#f1f5f9', color: '#334155' }}>
              {RIPPLE_MILLS.map(n => <th rowSpan="2" key={`rip_h_${n}`} style={{ padding: '6px', borderRight: '1px solid #e2e8f0' }}>NO.{n}</th>)}
              {NUT_SILOS.map(n => <th rowSpan="2" key={`ns_h_${n}`} style={{ padding: '6px', borderRight: '1px solid #e2e8f0' }}>{n}</th>)}
              {KERNEL_SILOS.map(n => <th rowSpan="2" key={`ks_h_${n}`} style={{ padding: '6px', borderRight: '1px solid #e2e8f0' }}>{n}</th>)}
              {KERNEL_SILOS.map(n => <th colSpan={3} key={`kst_h_${n}`} style={{ padding: '4px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>SILO {n}</th>)}
            </tr>
            <tr style={{ background: '#f1f5f9', color: '#334155' }}>
              {KERNEL_SILOS.map(n => (
                <React.Fragment key={`kst_sub_${n}`}>
                  <th style={{ padding: '4px', borderRight: '1px solid #e2e8f0' }}>A 100°C</th>
                  <th style={{ padding: '4px', borderRight: '1px solid #e2e8f0' }}>T 60°C</th>
                  <th style={{ padding: '4px', borderRight: '1px solid #e2e8f0' }}>B 40°C</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hr, i) => (
              <tr key={hr} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', borderRight: '1px solid #e2e8f0' }}>{hr}</td>
                {RIPPLE_MILLS.map(n => <td key={`rip_${n}`} style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `RIP${n}_EFF`)}</td>)}
                {NUT_SILOS.map(n => <td key={`ns_${n}`} style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `NS${n}_LEVEL`)}</td>)}
                {KERNEL_SILOS.map(n => <td key={`ks_${n}`} style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `KS${n}_LEVEL`)}</td>)}
                
                {KERNEL_SILOS.map(n => (
                  <React.Fragment key={`kst_v_${n}`}>
                    <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `KS${n}_TEMP_A`)}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `KS${n}_TEMP_T`)}</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `KS${n}_TEMP_B`)}</td>
                  </React.Fragment>
                ))}
                
                <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `KERNEL_PENGIRIMAN`)}</td>
                <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `FIB_CYC_AMP`)}</td>
                <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `LTDS1_AMP`)}</td>
                <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{getTagValue(hr, `LTDS2_AMP`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {activeTab === 'manual' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Manual Entry</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Losses Wet Shell (%)</label>
              <input type="number" step="any" value={form.losses_wet} onChange={e => setForm({...form, losses_wet: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Losses Dry Shell (%)</label>
              <input type="number" step="any" value={form.losses_dry} onChange={e => setForm({...form, losses_dry: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Dirt Feed Kernel Silo (%)</label>
              <input type="number" step="any" value={form.dirt_feed} onChange={e => setForm({...form, dirt_feed: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Pemakaian Calsium (Kg)</label>
              <input type="number" step="any" value={form.calcium} onChange={e => setForm({...form, calcium: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Catatan / Keterangan</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', height: '60px' }} />
          </div>

          <button onClick={handleSubmit} style={{ width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Simpan Manual Data</button>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Operational Hours (HM)</h4>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '6px', textAlign: 'left' }}>Mesin</th>
                <th style={{ padding: '6px' }}>Start</th>
                <th style={{ padding: '6px' }}>Stop</th>
                <th style={{ padding: '6px' }}>Total</th>
                <th style={{ padding: '6px' }}>HM Hari</th>
                <th style={{ padding: '6px' }}>HM S/D</th>
                <th style={{ padding: '6px' }}>HM Total</th>
              </tr>
            </thead>
            <tbody>
              {machinesList.map(m => {
                const mach = form.machines;
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>{m.name}</td>
                    <td style={{ padding: '4px' }}><input type="time" value={mach[m.id]?.start||''} onChange={e=>handleMachineChange(m.id, 'start', e.target.value)} style={{ width: '90%', padding: '2px 4px', border: '1px solid #cbd5e1' }} /></td>
                    <td style={{ padding: '4px' }}><input type="time" value={mach[m.id]?.stop||''} onChange={e=>handleMachineChange(m.id, 'stop', e.target.value)} style={{ width: '90%', padding: '2px 4px', border: '1px solid #cbd5e1' }} /></td>
                    <td style={{ padding: '4px' }}><input type="text" value={mach[m.id]?.total||''} onChange={e=>handleMachineChange(m.id, 'total', e.target.value)} style={{ width: '90%', padding: '2px 4px', border: '1px solid #cbd5e1' }} /></td>
                    <td style={{ padding: '4px' }}>
                      {m.id !== 'fiber_cyclone' && <input type="number" step="any" value={mach[m.id]?.hm_hari||''} onChange={e=>handleMachineChange(m.id, 'hm_hari', e.target.value)} style={{ width: '90%', padding: '2px 4px', border: '1px solid #cbd5e1' }} />}
                    </td>
                    <td style={{ padding: '4px' }}>
                      {m.id !== 'fiber_cyclone' && <input type="number" step="any" value={mach[m.id]?.hm_sd||''} onChange={e=>handleMachineChange(m.id, 'hm_sd', e.target.value)} style={{ width: '90%', padding: '2px 4px', border: '1px solid #cbd5e1' }} />}
                    </td>
                    <td style={{ padding: '4px' }}>
                      {m.id !== 'fiber_cyclone' && <input type="number" step="any" value={mach[m.id]?.hm_tot||''} onChange={e=>handleMachineChange(m.id, 'hm_tot', e.target.value)} style={{ width: '90%', padding: '2px 4px', border: '1px solid #cbd5e1' }} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
