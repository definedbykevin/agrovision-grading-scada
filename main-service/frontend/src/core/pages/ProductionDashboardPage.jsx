import { useState } from 'react';
import './ProductionDashboardPage.css';

// Animated Ring / Gauge Chart
const GaugeRing = ({ value, max, color, size = 120, label, unit }) => {
    const stroke = size * 0.11;
    const r = (size / 2) - stroke;
    const circumference = 2 * Math.PI * r;
    const pct = Math.min(value / max, 1);
    const dash = pct * circumference;
    const gap = circumference - dash;

    return (
        <div className="gauge-wrap" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--gauge-bg,#e5e7eb)" strokeWidth={stroke} />
                <circle
                    cx={size/2} cy={size/2} r={r} fill="none"
                    stroke={color} strokeWidth={stroke}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeLinecap="round"
                    style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
                />
                <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle"
                    fill="var(--text-primary,#111)" fontSize={size * 0.18} fontWeight="700" fontFamily="Inter,sans-serif">
                    {value}
                </text>
                <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
                    fill="var(--text-secondary,#6b7280)" fontSize={size * 0.12} fontFamily="Inter,sans-serif">
                    {unit}
                </text>
            </svg>
            <div className="gauge-label">{label}</div>
        </div>
    );
};

// Horizontal bar with animated fill
const BarStat = ({ label, value, unit, pct, color }) => (
    <div className="bar-stat">
        <div className="bar-stat-top">
            <span className="bar-stat-label">{label}</span>
            <span className="bar-stat-val" style={{ color }}>{value}<small>{unit}</small></span>
        </div>
        <div className="bar-track">
            <div className="bar-fill" style={{ width: `${pct}%`, background: color }}></div>
        </div>
    </div>
);

// Donut chart (SVG pure)
const DonutChart = ({ slices, size = 160, cx, cxLabel, unit }) => {
    const sw = size * 0.145;
    const r = size / 2 - sw;
    const circ = 2 * Math.PI * r;
    let acc = 0;
    const total = slices.reduce((s, d) => s + d.v, 0);
    return (
        <div className="donut-wrap">
            <div style={{ position:'relative', width: size, height: size, flexShrink: 0 }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--gauge-bg,#e5e7eb)" strokeWidth={sw}/>
                    {slices.map((s, i) => {
                        const da = (s.v / total) * circ;
                        const off = -(acc / total) * circ;
                        acc += s.v;
                        return (
                            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
                                stroke={s.color} strokeWidth={sw}
                                strokeDasharray={`${da} ${circ - da}`}
                                strokeDashoffset={off}
                                strokeLinecap="butt"
                                style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dasharray 1.2s ease-out' }}
                            />
                        );
                    })}
                    <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle"
                        fill="var(--text-primary,#111)" fontSize={size*0.18} fontWeight="800" fontFamily="Inter,sans-serif">
                        {total.toFixed(1)}
                    </text>
                    <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle"
                        fill="var(--text-secondary,#6b7280)" fontSize={size*0.12} fontFamily="Inter,sans-serif">
                        {unit}
                    </text>
                </svg>
            </div>
            <div className="donut-legend">
                {slices.map((s, i) => (
                    <div key={i} className="dl-item">
                        <span className="dl-dot" style={{ background: s.color }}></span>
                        <span className="dl-name">{s.label}</span>
                        <span className="dl-pct" style={{ color: s.color }}>{((s.v/total)*100).toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Machine status indicator row
const MachineRow = ({ name, dots }) => (
    <div className="machine-row">
        <span className="machine-name">{name}</span>
        <div className="dot-row">
            {dots.map((c,i)=>(
                <span key={i} className={`machine-dot-led ${c==='red'?'led-red':'led-green'}`}></span>
            ))}
        </div>
    </div>
);

// Simple KPI card at top
const KpiCard = ({ label, value, unit, sub, trend, color }) => (
    <div className="kpi-card">
        <div className="kpi-top">
            <span className="kpi-label">{label}</span>
            {trend && <span className={`kpi-badge ${trend === 'up' ? 'badge-up' : trend === 'down' ? 'badge-down' : 'badge-neutral'}`}>
                {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'} {sub}
            </span>}
        </div>
        <div className="kpi-value" style={{ color }}>{value}<span className="kpi-unit">{unit}</span></div>
        {!trend && sub && <div className="kpi-sub">{sub}</div>}
    </div>
);

// Key-value row with dotted line
const KV = ({ label, value, red }) => (
    <div className="kv-row">
        <span className="kv-label">{label}</span>
        <span className="kv-dots"></span>
        <span className={`kv-val ${red ? 'kv-red' : ''}`}>{value}</span>
    </div>
);

export default function ProductionDashboardPage({ user }) {
    const [filter, setFilter] = useState('Daily');

    const m = filter === 'Monthly' ? 30 : filter === 'Weekly' ? 7 : 1;

    return (
        <div className="pd2-shell">
            {/* ─── TOPBAR ─── */}
            <div className="pd2-topbar">
                <div>
                    <h1 className="pd2-title">Production Dashboard</h1>
                    <p className="pd2-sub">Palm Oil Mill · Real-time Performance & Quality Monitoring</p>
                </div>
                <div className="pd2-filters">
                    {['Weekly','Monthly','Yearly'].map(p => (
                        <button key={p} className={`pf-btn ${filter===p?'pf-active':''}`} onClick={()=>setFilter(p)}>{p}</button>
                    ))}
                </div>
            </div>

            {/* ─── KPI SUMMARY STRIP ─── */}
            <div className="kpi-strip">
                <KpiCard label="OER Forecast" value="20.15" unit="%" sub="Target 21%" trend="down" color="#ef4444" />
                <KpiCard label="FFB Processed" value={(209*m).toLocaleString()} unit=" mt" sub={`×${m} period`} color="#3b82f6" />
                <KpiCard label="CPO Production" value="12" unit=" mt/hr" sub="Normal" trend="up" color="#22c55e" />
                <KpiCard label="Steam Pressure" value="19.8" unit=" bar" sub="⚠ Alert" trend="down" color="#f59e0b" />
                <KpiCard label="Power Consumption" value="1,050" unit=" kW" sub="⚠ High" trend="down" color="#ef4444" />
                <KpiCard label="Online COD" value="221" unit=" mg/L" sub="Within limit" color="#8b5cf6" />
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <div className="pd2-grid">

                {/* ── MILL PERFORMANCE ── */}
                <div className="pd2-card span-1">
                    <div className="card-head">
                        <span className="card-title">Mill Performance</span>
                        <span className="card-badge badge-ok">ONLINE</span>
                    </div>

                    <div className="gauge-row">
                        <GaugeRing value={41.38} max={60} color="#3b82f6" size={110} label="Throughput" unit="mt/hr"/>
                        <GaugeRing value={75} max={100} color="#22c55e" size={110} label="Ripeness" unit="%"/>
                        <GaugeRing value={21.85} max={30} color="#d4af37" size={110} label="GOER" unit="%"/>
                    </div>

                    <div className="section-divider"><span>Statistics · {filter}</span></div>

                    <div className="two-col-kv">
                        <div>
                            <KV label="FFB Opening" value={`${(218*m).toLocaleString()} mt`}/>
                            <KV label="FFB Received" value={`${(335*m).toLocaleString()} mt`}/>
                            <KV label="FFB Queing" value={`${12} trucks`}/>
                            <KV label="FFB Grading" value="4 trucks"/>
                            <KV label="Daily Processed" value={`${(209*m).toLocaleString()} mt`}/>
                            <KV label="FFB Balance" value={`${(344*m).toLocaleString()} mt`}/>
                        </div>
                        <div>
                            <KV label="FFB Ripeness" value="75.12%"/>
                            <KV label="GOER" value="21.85%"/>
                            <KV label="CPO Production" value="12 mt/hr"/>
                            <KV label="OER Forecast" value="20.15%"/>
                        </div>
                    </div>

                    <div className="section-divider"><span>Oil Losses Report</span></div>
                    <div className="losses-chart-row">
                        <div style={{ flex: 1 }}>
                            <KV label="USB count" value="0.65%"/>
                            <KV label="PSB count" value="1.25%"/>
                            <KV label="EFB" value="Wet" red/>
                            <KV label="Unprocessed EFB" value="50%" red/>
                            <KV label="Press Fiber" value="Wet" red/>
                            <KV label="Sludge" value="Oily" red/>
                        </div>
                        <DonutChart size={150} unit="% loss" slices={[
                            { label:'Press Fiber', v: 49, color:'#f59e0b' },
                            { label:'Sludge',      v: 35, color:'#ef4444' },
                            { label:'EFB',         v: 11, color:'#8b5cf6' },
                            { label:'USB/PSB',     v: 5,  color:'#10b981' },
                        ]}/>
                    </div>
                </div>

                {/* ── MIDDLE COLUMN ── */}
                <div className="pd2-col span-1">

                    {/* Water Supply */}
                    <div className="pd2-card">
                        <div className="card-head">
                            <span className="card-title">Water Supply</span>
                            <span className="card-badge badge-ok">NORMAL</span>
                        </div>
                        <DonutChart size={150} unit="m3/hr" slices={[
                            { label:'Boiler',   v: 23.2, color:'#3b82f6' },
                            { label:'Domestic', v: 4.2,  color:'#10b981' },
                            { label:'Process',  v: 2.3,  color:'#8b5cf6' },
                        ]}/>
                        <div style={{ marginTop:'1rem' }}>
                            <KV label="Treated supply" value="100 m3/hr"/>
                            <KV label="TDS" value="34 mg/L"/>
                            <KV label="Turbidity" value="3.5 NTU"/>
                            <KV label="Ratio" value="0.72 / FFB"/>
                        </div>
                    </div>

                    {/* Power Plant */}
                    <div className="pd2-card">
                        <div className="card-head">
                            <span className="card-title">Power Plant</span>
                            <span className="card-badge badge-warn">⚠ ALERT</span>
                        </div>
                        <div style={{ display:'flex', gap:'1rem', alignItems:'center', marginBottom:'1rem' }}>
                            <GaugeRing value={19.8} max={25} color="#f59e0b" size={100} label="Steam Pressure" unit="bar"/>
                            <div style={{ flex: 1 }}>
                                <BarStat label="Steam Throughput" value={28.0} unit=" mt/hr" pct={(28/35)*100} color="#ef4444"/>
                                <BarStat label="Power Usage"      value="1,050" unit=" kW"  pct={(1050/1500)*100} color="#ef4444"/>
                                <BarStat label="Boiler TDS"       value="1,189" unit=" mg/L" pct={(1189/1500)*100} color="#f59e0b"/>
                            </div>
                        </div>
                        <KV label="Frequency" value="49.5 Hz"/>
                        <KV label="Opacity"   value="40%" red/>
                    </div>

                    {/* Effluent Treatment */}
                    <div className="pd2-card">
                        <div className="card-head">
                            <span className="card-title">Effluent Treatment</span>
                            <span className="card-badge badge-warn">PARTIAL</span>
                        </div>
                        <div style={{ display:'flex', gap:'1.5rem', marginBottom:'1rem' }}>
                            <GaugeRing value={221} max={400} color="#8b5cf6" size={95} label="Online COD" unit="mg/L"/>
                            <GaugeRing value={5.89} max={10} color="#22c55e" size={95} label="DO Aerobic" unit="mg/L"/>
                        </div>
                        <div className="machines-box">
                            <MachineRow name="MIXER RUNNING"           dots={['green','green','green','green']}/>
                            <MachineRow name="AERATOR RUNNING"         dots={['green','green','red','green','green','red']}/>
                            <MachineRow name="DESLUDGING PUMP RUNNING" dots={['green','green','red','green','red']}/>
                        </div>
                    </div>
                </div>

                {/* ── MINI MILL ── */}
                <div className="pd2-card span-1">
                    <div className="card-head">
                        <span className="card-title">Mini Mill Performance</span>
                        <span className="card-badge badge-ok">ONLINE</span>
                    </div>

                    <div className="gauge-row">
                        <GaugeRing value={13.1} max={20} color="#3b82f6" size={110} label="Throughput" unit="mt/hr"/>
                        <GaugeRing value={65} max={100} color="#22c55e" size={110} label="LF Ripeness" unit="%"/>
                        <GaugeRing value={27.49} max={35} color="#d4af37" size={110} label="GOER" unit="%"/>
                    </div>

                    <div className="section-divider"><span>LF Statistics · {filter}</span></div>

                    <div className="two-col-kv">
                        <div>
                            <KV label="LF Opening"  value={`${(0*m).toLocaleString()} mt`}/>
                            <KV label="LF Received" value={`${(35*m).toLocaleString()} mt`}/>
                            <KV label="LF Queing"   value="0 trucks"/>
                            <KV label="LF Grading"  value="1 trucks"/>
                            <KV label="LF Processed" value={`${(30*m).toLocaleString()} mt`}/>
                            <KV label="LF Balance"  value={`${(5*m).toLocaleString()} mt`}/>
                        </div>
                        <div>
                            <KV label="LF Ripeness"   value="65.12%"/>
                            <KV label="GOER"          value="27.49%"/>
                            <KV label="CPO Production" value="0 mt/hr"/>
                            <KV label="OER Forecast"  value="28.33%"/>
                        </div>
                    </div>

                    <div className="section-divider"><span>Oil Losses Report</span></div>
                    <div className="losses-chart-row">
                        <div style={{ flex: 1 }}>
                            <KV label="Press Fiber" value="Wet"  red/>
                            <KV label="Sludge"      value="Oily" red/>
                        </div>
                        <DonutChart size={150} unit="% loss" slices={[
                            { label:'Press Fiber', v: 65, color:'#f59e0b' },
                            { label:'Sludge',      v: 35, color:'#ef4444' },
                        ]}/>
                    </div>
                </div>
            </div>
        </div>
    );
}
