import React, { useState, useEffect } from 'react';

const STEP_COLUMNS = [
  { key: 'deaeration_temp', label: 'Deaer.', stepNum: 1 },
  { key: 'peak1_press', label: 'Pk 1', stepNum: 2 },
  { key: 'exhaust1_time', label: 'Exh 1', stepNum: 3 },
  { key: 'peak2_press', label: 'Pk 2', stepNum: 4 },
  { key: 'exhaust2_time', label: 'Exh 2', stepNum: 5 },
  { key: 'peak3_press', label: 'Pk 3', stepNum: 6 },
  { key: 'holding_press', label: 'Hld 1', stepNum: 7 },
  { key: 'blow1_temp', label: 'Blw 1', stepNum: 8 },
  { key: 'holding2_press', label: 'Hld 2', stepNum: 9 },
  { key: 'blow2_temp', label: 'Blw 2', stepNum: 10 },
  { key: 'holding3_press', label: 'Hld 3', stepNum: 11 },
  { key: 'blow3_temp', label: 'Blw 3', stepNum: 12 },
  { key: 'holding4_press', label: 'Hld 4', stepNum: 13 },
  { key: 'blowdown_time', label: 'Blowd.', stepNum: 14 },
  { key: 'exhaust_time', label: 'Exh 3', stepNum: 15 },
];

const getTodayLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function LogsheetView({ stationSlug = 'sterilizer' }) {
  const [date, setDate] = useState(getTodayLocalDateStr());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/logsheet?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load logsheet data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [date, stationSlug]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/logsheet/export-excel?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Logsheet_Sterilizer_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal Export: " + e.message);
    }
  };

  return (
    <div style={{ padding: '24px', flex: 1, overflowY: 'auto', background: '#f8fafc' }}>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>Automatic Sterilizer Logsheet</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Hari Operasional: Jam 07:00 Pagi s.d. 07:00 Pagi Besoknya</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              style={{ border: 'none', outline: 'none', padding: '8px 0', color: '#334155', fontWeight: '600', fontSize: '13px' }}
            />
          </div>
          <button 
            onClick={() => { setDate(''); fetchData(); }}
            title="Tampilkan Seluruh Data Logsheet Tanpa Filter Tanggal"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: date === '' ? '#2563eb' : '#fff', color: date === '' ? '#fff' : '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            Semua Data
          </button>
          <button 
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            Refresh
          </button>
          <button 
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            Export Excel
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <thead>
              {/* Super Header */}
              <tr style={{ background: '#FCD200', color: '#1e293b', fontWeight: 'bold' }}>
                <th colSpan="4" style={{ padding: '8px 6px', borderRight: '1px solid #ca8a04' }}>CYCLE INFO</th>
                <th colSpan="1" style={{ padding: '8px 6px', borderRight: '1px solid #ca8a04', background: '#eab308', color: '#fff' }}>LOADING</th>
                <th colSpan="15" style={{ padding: '8px 6px', borderRight: '1px solid #ca8a04', background: '#FCD200' }}>15 STEP DURATIONS (SECONDS & MINUTES)</th>
                <th colSpan="1" style={{ padding: '8px 6px', background: '#eab308', color: '#fff' }}>UNLOADING</th>
              </tr>
              {/* Sub Header */}
              <tr style={{ background: '#fef9c3', color: '#854d0e', borderBottom: '2px solid #fde047', fontWeight: '700' }}>
                <th style={{ padding: '8px 6px', borderRight: '1px solid #fef08a' }}>Line</th>
                <th style={{ padding: '8px 6px', borderRight: '1px solid #fef08a' }}>Cycle</th>
                <th style={{ padding: '8px 6px', borderRight: '1px solid #fef08a' }}>Start</th>
                <th style={{ padding: '8px 6px', borderRight: '2px solid #fde047' }}>End</th>

                <th style={{ padding: '8px 6px', borderRight: '2px solid #fde047' }}>Inlet</th>
                
                {STEP_COLUMNS.map((col, idx) => (
                  <th key={col.key} style={{ padding: '8px 6px', borderRight: idx === 14 ? '2px solid #fde047' : '1px solid #fef08a' }}>
                    {col.label}
                  </th>
                ))}
                
                <th style={{ padding: '8px 6px' }}>Outlet</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="21" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    Memuat data logsheet...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="21" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    Tidak ada data siklus pada hari operasional ini.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const door = row.door_details || {};
                  const stepDetails = typeof row.step_details === 'string' ? JSON.parse(row.step_details || '[]') : (row.step_details || []);
                  const dId = row.device_id;

                  const stepDurations = STEP_COLUMNS.map(col => {
                    const st = stepDetails.find(s => s.step === col.stepNum);
                    const actual = st ? st.duration : 0;
                    return { ...col, actual };
                  });

                  return (
                    <tr 
                      key={row.id} 
                      style={{ 
                        borderBottom: '1px solid #e2e8f0', 
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' 
                      }}>
                      
                      {/* Line Number */}
                      <td style={{ padding: '10px 6px', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
                        L{dId}
                      </td>

                      {/* Cycle Number */}
                      <td style={{ padding: '10px 6px', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2563eb' }}>
                        #{row.cycle_number}
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: '10px 6px', borderRight: '1px solid #e2e8f0', color: '#475569', fontWeight: '500' }}>
                        {new Date(row.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* End Time */}
                      <td style={{ padding: '10px 6px', borderRight: '2px solid #cbd5e1', color: '#475569', fontWeight: '500' }}>
                        {new Date(row.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Loading Inlet */}
                      <td style={{ padding: '10px 6px', borderRight: '2px solid #cbd5e1', fontWeight: 'bold', color: '#0284c7' }}>
                        {door.inlet?.duration ? `${door.inlet.duration}s (${Math.floor(door.inlet.duration / 60)}m)` : '-'}
                      </td>

                      {/* 15 Step Durations */}
                      {stepDurations.map((s, cIdx) => (
                        <td key={s.key} style={{ padding: '10px 6px', borderRight: cIdx === 14 ? '2px solid #cbd5e1' : '1px solid #e2e8f0', color: s.actual > 0 ? '#0f172a' : '#94a3b8', fontWeight: s.actual > 0 ? '600' : 'normal' }}>
                          {s.actual > 0 ? `${s.actual}s (${Math.floor(s.actual / 60)}m)` : '-'}
                        </td>
                      ))}

                      {/* Unloading Outlet */}
                      <td style={{ padding: '10px 6px', fontWeight: 'bold', color: '#0284c7' }}>
                        {door.outlet?.duration ? `${door.outlet.duration}s (${Math.floor(door.outlet.duration / 60)}m)` : '-'}
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
  );
}
