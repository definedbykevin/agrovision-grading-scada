import React, { useState, useRef, useEffect } from 'react';
import './SettingsView.css';

// ─── EDITABLE CELL ─────────────────────────────────────────────────────────────
function EC({ value, onChange, suffix = '', className = '', isNull = false, decimals = 2 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef(null);
  
  let display = '–';
  if (!isNull && value !== null && value !== undefined) {
    if (typeof value === 'string' && value.includes('%')) {
      display = value; // keep string if it's a percentage string
    } else {
      display = decimals === null ? String(value) : Number(value).toFixed(decimals);
      display = display.replace('.', ',');
    }
  }

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (typeof value === 'string' && value.includes('%')) {
      onChange(draft.includes('%') ? draft : draft + '%');
      return;
    }
    const p = parseFloat(draft.replace(',', '.'));
    if (!isNaN(p)) onChange(p);
    else if (!draft.trim() || draft.trim() === '–') onChange(null);
  };

  if (editing) return (
    <td className={`value ${className}`}>
      <input ref={ref} className="efb-sv-inline-input" value={draft}
        onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        style={{ textAlign: className.includes('center') ? 'center' : 'left' }} />
    </td>
  );

  return (
    <td className={`value ${className} highlight-cell`} onClick={() => { setDraft(value == null ? '' : String(value).replace('.', ',')); setEditing(true); }}>
      {display}{display !== '–' && typeof value !== 'string' ? suffix : ''}
    </td>
  );
}

// ─── INITIAL DATA ──────────────────────────────────────────────────────────────
const INIT_DATA = {
  controlVal1: 50, controlVal2: 13, spEfbDilution: 3.00, spFfbWeight: 15.00, efbWeight: 3.45,
  dilutionTable: [
    { label: 'Control (each EFB Press)', load: '100%', req: 5.00 },
    { label: '', load: '90%', req: 4.50 },
    { label: '', load: '80%', req: 4.00 },
    { label: 'SP EFB : Dilution', load: '70%', req: 3.50, isSpEfb: true },
    { label: '', load: '60%', req: 3.00 },
    { label: '', load: '50%', req: 2.50 },
    { label: 'SP FFB Weight (kg)', load: '40%', req: 2.00, isSpFfb: true },
    { label: '', load: '30%', req: 1.50 },
    { label: 'EFB Weight (kg)', load: '20%', req: 1.00, isEfbWeight: true },
    { label: '', load: '10%', req: 0.50 },
    { label: '', load: '0%', req: 0.00 },
  ],
  press: [
    { id: 1, count: 1.189, th: 4.10, min1: 50, max: 100, pv: 90, run: 1, min2: 50, load: '80%' }, 
    { id: 2, count: 1.004, th: 3.46, min1: 50, max: 100, pv: 90, run: 1, min2: 50, load: '80%' }, 
    { id: 3, count: 446, th: 1.54, min1: 50, max: 100, pv: 80, run: 1, min2: 50, load: '60%' }, 
    { id: 4, count: null, th: null, min1: 50, max: 100, pv: 0, run: 0, min2: 0, load: '0%' },
  ],
  overallAmp: { min1: 200, max: 400, pv: 260, run: 3, min2: 150, load: '30%' },
  throughputScore: 88,
  spOilLayer: 300, spTemp: 95, spTempBlow: 90,
  designCap: 10.35, theoNum: 3.000, pressCap: 6.00, unprocessed: 1.25,
};

export default function SettingsView() {
  const [data, setData] = useState(INIT_DATA);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }));
  const updatePress = (id, field, val) => setData(p => ({ ...p, press: p.press.map(x => x.id === id ? { ...x, [field]: val } : x) }));
  
  const updateDilution = (idx, field, val) => setData(p => {
    const newArr = [...p.dilutionTable];
    newArr[idx][field] = val;
    return { ...p, dilutionTable: newArr };
  });

  const updateOverallAmp = (field, val) => setData(p => ({
    ...p, overallAmp: { ...p.overallAmp, [field]: val }
  }));

  const currentThroughput = data.press.reduce((a, p) => a + (p.th || 0), 0);
  const currentCount = data.press.reduce((a, p) => a + (p.count || 0), 0);

  return (
    <div className="efb-sv-root">
      {/* HEADER */}
      <div className="efb-sv-header">
        <div>
          <div className="efb-sv-title">🌿 EFB Plant — Settings</div>
          <div className="efb-sv-subtitle">Zero-Scroll AgroVision Layout</div>
        </div>
        <button className={`efb-sv-save-btn ${saved ? 'efb-sv-save-btn--saved' : ''}`} onClick={handleSave}>
          {saved ? '✓ Saved!' : '💾 Save Settings'}
        </button>
      </div>

      <div className="efb-sv-body">
        
        {/* ── TOP HALF: EFB PLANT AUTOMATION ── */}
        <div className="efb-sv-section">
          <div className="efb-sv-section-header">⚙️ EFB Plant Automation Control</div>
          <div className="efb-sv-section-body">
            
            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
              <table className="efb-sv-table" style={{ height: '100%' }}>
                <thead>
                  <tr>
                    <th className="left">Dilution & Temperature Control</th>
                    <th>Overall Load</th>
                    <th>Dilution Requir</th>
                    <th>Water Valve Opening</th>
                    <th>Steam Valve Opening</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dilutionTable.map((row, i) => (
                    <tr key={i}>
                      {row.isSpEfb ? (
                        <td className="label highlight-cell" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>SP EFB : Dilution</span>
                          <EC value={data.spEfbDilution} onChange={v => update('spEfbDilution', v)} className="text-red right" />
                        </td>
                      ) : row.isSpFfb ? (
                        <td className="label highlight-cell" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>SP FFB Weight (kg)</span>
                          <EC value={data.spFfbWeight} onChange={v => update('spFfbWeight', v)} className="text-red right" />
                        </td>
                      ) : row.isEfbWeight ? (
                        <td className="label text-red highlight-cell" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>EFB Weight (kg)</span>
                          <EC value={data.efbWeight} onChange={v => update('efbWeight', v)} className="text-red right" />
                        </td>
                      ) : (
                        <td className="label">{row.label}</td>
                      )}
                      
                      <EC value={row.load} onChange={v => updateDilution(i, 'load', v)} decimals={null} className="center" />
                      <EC value={row.req} onChange={v => updateDilution(i, 'req', v)} className="center" />
                      
                      {i === 0 ? (
                        <>
                          <EC value={data.controlVal1} onChange={v => update('controlVal1', v)} suffix="%" className="center highlight-cell" decimals={0} />
                          <EC value={data.controlVal2} onChange={v => update('controlVal2', v)} suffix="%" className="center highlight-cell" decimals={0} />
                        </>
                      ) : i === data.dilutionTable.length - 1 ? (
                        <>
                          <td className="center computed">0%</td>
                          <td className="center computed">0%</td>
                        </>
                      ) : (
                        <>
                          <td className="center" style={{ color: '#cbd5e1' }}>|</td>
                          <td className="center" style={{ color: '#cbd5e1' }}>|</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <table className="efb-sv-table">
                <thead>
                  <tr>
                    <th></th>
                    <th className="left">Read</th>
                    <th className="center">Lead time</th>
                    <th className="left">Command</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="label">Temperature</td>
                    <td className="computed">Fiber Temp &gt; 90°C</td>
                    <td className="center computed">1 s</td>
                    <td className="computed">Valve Opening -1%</td>
                  </tr>
                  <tr>
                    <td className="label">Overriding</td>
                    <td className="computed">Fiber Temp = 90°C</td>
                    <td className="center computed">1 s</td>
                    <td className="computed">No Action</td>
                  </tr>
                  <tr>
                    <td className="label">(EFB Press)</td>
                    <td className="computed">Fiber Temp &lt; 90°C</td>
                    <td className="center computed">1 s</td>
                    <td className="computed">Valve Opening +1%</td>
                  </tr>
                </tbody>
              </table>

              <table className="efb-sv-table" style={{ flex: 1 }}>
                <thead>
                  <tr>
                    <th colSpan={2} className="left">EFB Count</th>
                    <th className="right">Throughput</th>
                  </tr>
                </thead>
                <tbody>
                  {data.press.map(p => (
                    <tr key={p.id}>
                      <td className="label">EFB Press {p.id}</td>
                      <EC value={p.count} onChange={v => updatePress(p.id, 'count', v)} className={`center ${p.count !== null ? 'highlight-green' : ''}`} isNull={p.count == null} decimals={null} />
                      <EC value={p.th} onChange={v => updatePress(p.id, 'th', v)} className="right" isNull={p.th == null} suffix=" mt/hr" />
                    </tr>
                  ))}
                  <tr className="total">
                    <td className="label highlight-blue">Current Throughput</td>
                    <td className="center highlight-blue" style={{ fontWeight: 900 }}>{currentCount.toFixed(3).replace('.', ',')}</td>
                    <td className="right highlight-blue" style={{ fontWeight: 900 }}>{currentThroughput.toFixed(2).replace('.', ',')} mt/hr</td>
                  </tr>
                  <tr className="total" style={{ borderTop: 'none' }}>
                    <td colSpan={2} className="label highlight-blue">EFB Plant Throughput Score</td>
                    <EC value={data.throughputScore} onChange={v => update('throughputScore', v)} decimals={0} className="right highlight-blue" suffix="%" />
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
              <table className="efb-sv-table" style={{ height: '100%' }}>
                <thead>
                  <tr>
                    <th></th>
                    <th colSpan={2} className="center">Ampere Setting</th>
                    <th colSpan={4}></th>
                  </tr>
                  <tr>
                    <th className="left">EFB Press</th>
                    <th className="center">Min</th>
                    <th className="center">Max</th>
                    <th className="center">PV</th>
                    <th className="center">Run</th>
                    <th className="center">Min</th>
                    <th className="center">Load</th>
                  </tr>
                </thead>
                <tbody>
                  {data.press.map((p) => (
                    <tr key={p.id}>
                      <td className="label">EFB Press {p.id}</td>
                      <EC value={p.min1} onChange={v => updatePress(p.id, 'min1', v)} decimals={0} className="center" />
                      <EC value={p.max} onChange={v => updatePress(p.id, 'max', v)} decimals={0} className="center" />
                      <EC value={p.pv} onChange={v => updatePress(p.id, 'pv', v)} decimals={0} className="center" />
                      <EC value={p.run} onChange={v => updatePress(p.id, 'run', v)} decimals={0} className="center" />
                      <EC value={p.min2} onChange={v => updatePress(p.id, 'min2', v)} decimals={0} className="center" />
                      <EC value={p.load} onChange={v => updatePress(p.id, 'load', v)} decimals={null} className="center text-green-600 font-bold" />
                    </tr>
                  ))}
                  <tr className="total">
                    <td className="label">Overall</td>
                    <EC value={data.overallAmp.min1} onChange={v => updateOverallAmp('min1', v)} decimals={0} className="center" />
                    <EC value={data.overallAmp.max} onChange={v => updateOverallAmp('max', v)} decimals={0} className="center" />
                    <EC value={data.overallAmp.pv} onChange={v => updateOverallAmp('pv', v)} decimals={0} className="center" />
                    <EC value={data.overallAmp.run} onChange={v => updateOverallAmp('run', v)} decimals={0} className="center" />
                    <EC value={data.overallAmp.min2} onChange={v => updateOverallAmp('min2', v)} decimals={0} className="center" />
                    <EC value={data.overallAmp.load} onChange={v => updateOverallAmp('load', v)} decimals={null} className="center" />
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* ── BOTTOM HALF: OIL RECOVERY PLANT ── */}
        <div className="efb-sv-section">
          <div className="efb-sv-section-header">💧 Oil Recovery Plant Automation</div>
          <div className="efb-sv-section-body">
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <table className="efb-sv-table" style={{ height: '100%' }}>
                <thead>
                  <tr>
                    <th colSpan={2} className="left">Read</th>
                    <th className="left">Command</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="label" rowSpan={3}>Oil Skinning</td>
                    <td className="computed">Oil Layer &gt; 300mm</td>
                    <td className="computed">Skimmer level +1%</td>
                  </tr>
                  <tr>
                    <td className="label highlight-cell" style={{ display: 'flex', gap: '4px' }}>
                      SP Oil Layer = <EC value={data.spOilLayer} onChange={v => update('spOilLayer', v)} decimals={0} />
                    </td>
                    <td className="computed">No Action</td>
                  </tr>
                  <tr>
                    <td className="computed">Oil Layer &lt; 300mm</td>
                    <td className="computed">Skimmer level -1%</td>
                  </tr>
                  
                  {/* Divider */}
                  <tr><td colSpan={3} style={{ height: '4px', background: '#f8fafc', padding: 0 }}></td></tr>
                  
                  <tr>
                    <th colSpan={2} className="left" style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>Read</th>
                    <th className="left" style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>Command</th>
                  </tr>
                  <tr>
                    <td className="label">Tank Heating</td>
                    <td className="computed">Temperature &lt; 90°C</td>
                    <td className="computed">Valve Opening</td>
                  </tr>
                  <tr>
                    <td className="label">(LCT, CST, LDT)</td>
                    <td className="computed">Temperature = 90°C</td>
                    <td className="computed">No Action</td>
                  </tr>
                  <tr>
                    <td className="label highlight-cell" style={{ display: 'flex', gap: '4px' }}>
                      SP Temperature = <EC value={data.spTemp} onChange={v => update('spTemp', v)} decimals={0} />
                    </td>
                    <td className="computed">Temperature &gt; 90°C</td>
                    <td className="computed">Valve Opening</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <table className="efb-sv-table">
                <thead>
                  <tr>
                    <th colSpan={2} className="left">Read</th>
                    <th className="left">Command</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="label">Tank Bottom Blow-down</td>
                    <td className="computed">Temperature &lt; 90°C</td>
                    <td className="computed"><span className="efb-sv-badge efb-sv-badge--close">Valve Close</span></td>
                  </tr>
                  <tr>
                    <td className="label">(LCT, CST, LDT)</td>
                    <td className="computed">Temperature = 90°C</td>
                    <td className="computed">No Action</td>
                  </tr>
                  <tr>
                    <td className="label highlight-cell" style={{ display: 'flex', gap: '4px' }}>
                      SP Temperature = <EC value={data.spTempBlow} onChange={v => update('spTempBlow', v)} decimals={0} />
                    </td>
                    <td className="computed">Temperature &gt; 90°C</td>
                    <td className="computed"><span className="efb-sv-badge efb-sv-badge--open">Valve Open</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <table className="efb-sv-table" style={{ height: '100%' }}>
                <thead>
                  <tr>
                    <th colSpan={2} className="left">Capacities & Metrics</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="label">EFB Plant Design Caps</td>
                    <EC value={data.designCap} onChange={v => update('designCap', v)} className="right" suffix=" mt/hr" />
                  </tr>
                  <tr>
                    <td className="label">Theoretical number of</td>
                    <EC value={data.theoNum} onChange={v => update('theoNum', v)} className="right" decimals={3} suffix=" count/hr" />
                  </tr>
                  <tr>
                    <td className="label">EFB Press Capacity</td>
                    <EC value={data.pressCap} onChange={v => update('pressCap', v)} className="right" suffix=" mt/hr" />
                  </tr>
                  <tr>
                    <td className="label">Current Rate</td>
                    <td className="right computed">1,739 count/hr</td>
                  </tr>
                  <tr className="total">
                    <td className="label highlight-blue">Unprocessed EFB</td>
                    <EC value={data.unprocessed} onChange={v => update('unprocessed', v)} className="right highlight-blue" suffix=" mt/hr" />
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
