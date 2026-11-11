import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import './GradingRampPage.css'
import AiGradingRampTab from './tabs/AiGradingRamp/AiGradingRampTab.jsx'

// Images served from main-service/frontend/public/Ripeness/
const ripeImg = '/Ripeness/RIPE.jpg'
const unripeImg = '/Ripeness/UNRIPE.jpg'
const overripeImg = '/Ripeness/OVERRIPE.jpg'
const abnormalImg = '/Ripeness/ABNORMAL.jpg'
const emptyImg = '/Ripeness/EMPTY.jpg'

const PLACEHOLDER_GRADING_BG = ripeImg

const IMAGE_MAP = {
    ripe: ripeImg,
    unripe: unripeImg,
    overripe: overripeImg,
    underripe: unripeImg,
    abnormal: abnormalImg,
    empty: emptyImg,
    all: ripeImg,
    unknown: ripeImg,
}

const CATEGORIES = [
    { id: 'all', label: 'ALL CATEGORIES', color: '#334155' },
    { id: 'ripe', label: 'RIPE', color: '#10b981', baseCount: 245800 },
    { id: 'unripe', label: 'UNRIPE', color: '#f59e0b', baseCount: 42150 },
    { id: 'overripe', label: 'OVERRIPE', color: '#f97316', baseCount: 12400 },
    { id: 'underripe', label: 'UNDER-RIPE', color: '#3b82f6', baseCount: 0 },
    { id: 'abnormal', label: 'ABNORMAL', color: '#ef4444', baseCount: 8520 },
    { id: 'empty', label: 'EMPTY', color: '#64748b', baseCount: 3200 },
    { id: 'unknown', label: 'UNKNOWN', color: '#1e293b', baseCount: 0 },
]

const TIME_FILTERS = ['DAY', 'WEEK', 'MONTH']

function CategoryTrendChart({ datasets, timeFilter }) {
    const [hoveredPoint, setHoveredPoint] = useState(null)

    const width = 400
    const height = 160
    const paddingL = 35
    const paddingR = 15
    const paddingT = 15
    const paddingB = 25

    const maxVal = useMemo(() => {
        let max = 10;
        datasets.forEach(ds => {
            if (ds.data) max = Math.max(max, ...ds.data);
        });
        return max;
    }, [datasets])

    const yGridLines = [0, 0.25, 0.5, 0.75, 1]

    const xLabels = useMemo(() => {
        if (timeFilter === 'DAY') return ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']
        if (timeFilter === 'WEEK') return ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        if (timeFilter === 'MONTH') return ['Day 1', 'Day 7', 'Day 14', 'Day 21', 'Day 30']
        return []
    }, [timeFilter])

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                style={{ overflow: 'visible' }}
                onMouseLeave={() => setHoveredPoint(null)}
            >
                <rect x={paddingL} y={paddingT} width={width - paddingL - paddingR} height={height - paddingT - paddingB} fill="#f8fafc" rx="2" />

                {xLabels.map((_, i) => {
                    const xPos = paddingL + (i * (width - paddingL - paddingR)) / (xLabels.length - 1)
                    return <line key={`x-grid-${i}`} x1={xPos} y1={paddingT} x2={xPos} y2={height - paddingB} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                })}

                {yGridLines.map((ratio, i) => {
                    const yPos = height - paddingB - ratio * (height - paddingT - paddingB)
                    const val = Math.round(ratio * maxVal)
                    return (
                        <g key={`y-grid-${i}`}>
                            <line x1={paddingL} y1={yPos} x2={width - paddingR} y2={yPos} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={ratio === 0 ? "0" : "3 3"} />
                            <text x={paddingL - 10} y={yPos + 3} textAnchor="end" fontSize="9" fill="#64748b" fontWeight="700">{val}</text>
                        </g>
                    )
                })}

                {xLabels.map((label, i) => {
                    const xPos = paddingL + (i * (width - paddingL - paddingR)) / (xLabels.length - 1)
                    return <text key={`x-label-${i}`} x={xPos} y={height - 10} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">{label}</text>
                })}

                <line x1={paddingL} y1={paddingT} x2={paddingL} y2={height - paddingB} stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1={paddingL} y1={height - paddingB} x2={width - paddingR} y2={height - paddingB} stroke="#cbd5e1" strokeWidth="1.5" />

                {datasets.map(ds => {
                    if (!ds.data || ds.data.length < 2) return null;
                    const innerWidth = width - paddingL - paddingR;
                    const innerHeight = height - paddingT - paddingB;
                    const stepX = innerWidth / (ds.data.length - 1);
                    const pts = ds.data.map((val, i) => ({
                        x: paddingL + i * stepX,
                        y: height - paddingB - (val / maxVal) * innerHeight,
                        value: val,
                        label: xLabels[Math.floor((i / (ds.data.length - 1)) * (xLabels.length - 1))] || '',
                        color: ds.color,
                        dsLabel: ds.label
                    }));
                    const pathStr = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
                    return (
                        <g key={ds.id}>
                            <path d={pathStr} fill="none" stroke={ds.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {pts.map((p, i) => (
                                <g key={i} onMouseEnter={() => setHoveredPoint(p)}>
                                    <circle cx={p.x} cy={p.y} r="10" fill="transparent" style={{ cursor: 'pointer' }} />
                                    <circle cx={p.x} cy={p.y} r={hoveredPoint?.x === p.x && hoveredPoint?.color === ds.color ? "4" : "2.5"} fill="white" stroke={ds.color} strokeWidth="1.5" />
                                </g>
                            ))}
                        </g>
                    )
                })}
            </svg>

            {hoveredPoint && (
                <div
                    className="som-chart-tooltip"
                    style={{
                        position: 'absolute',
                        left: `${(hoveredPoint.x / width) * 100}%`,
                        top: `${(hoveredPoint.y / height) * 100}%`,
                        transform: 'translate(-50%, -120%)',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                >
                    <div className="tooltip-inner" style={{ borderLeft: `3px solid ${hoveredPoint.color}` }}>
                        <div className="time" style={{ color: hoveredPoint.color }}>{hoveredPoint.dsLabel} - {hoveredPoint.label}</div>
                        <div className="value">{hoveredPoint.value} <small>BUNCHES</small></div>
                    </div>
                </div>
            )}
        </div>
    )
}

function HourlyConfidenceChart({ data = [98.2, 97.5, 98.8, 99.1, 98.4, 98.7] }) {
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    const confs = data;
    const [hoverIndex, setHoverIndex] = useState(null);

    return (
        <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, rgba(2, 6, 23, 0.4) 100%)', borderRadius: '4px', marginTop: '0.5rem', border: '1px solid rgba(59,130,246,0.1)' }}>
            {confs.map((val, i) => (
                <div 
                    key={i} 
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', position: 'relative', width: '28px', cursor: 'crosshair', transition: 'transform 0.2s', transform: hoverIndex === i ? 'scale(1.1)' : 'scale(1)' }} 
                    onMouseEnter={() => setHoverIndex(i)} 
                    onMouseLeave={() => setHoverIndex(null)}
                >
                    {hoverIndex === i && (
                        <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', padding: '6px 10px', borderRadius: '6px', border: '1px solid #3b82f6', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10, whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>POINT {i+1} CONFIDENCE</span>
                            <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 900 }}>{val}%</span>
                            <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #3b82f6' }}></div>
                        </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '2px' }}>
                        <div style={{ width: '100%', background: hoverIndex === i ? 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)' : 'linear-gradient(180deg, #3b82f6 0%, #1e3a8a 100%)', height: `${(val - 90) * 10}%`, borderRadius: '2px', boxShadow: hoverIndex === i ? '0 0 12px rgba(59,130,246,0.8)' : '0 0 8px rgba(59,130,246,0.4)', transition: 'all 0.2s ease-out' }}></div>
                    </div>
                    <span style={{ fontSize: '0.55rem', color: hoverIndex === i ? '#fff' : '#94a3b8', fontWeight: 600, transition: 'color 0.2s' }}>{hours[i] || '—'}</span>
                    <span style={{ fontSize: '0.65rem', color: hoverIndex === i ? '#60a5fa' : '#fff', fontWeight: 'bold', transition: 'color 0.2s' }}>{val}%</span>
                </div>
            ))}
        </div>
    )
}

function DailyRejectionChart({ data = [4.2, 3.8, 5.1, 4.5, 3.2, 4.8] }) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const rates = data;
    const [hoverIndex, setHoverIndex] = useState(null);

    return (
        <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(2, 6, 23, 0.4) 100%)', borderRadius: '4px', marginTop: '0.5rem', border: '1px solid rgba(239,68,68,0.1)' }}>
            {rates.map((val, i) => (
                <div 
                    key={i} 
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', position: 'relative', width: '28px', cursor: 'crosshair', transition: 'transform 0.2s', transform: hoverIndex === i ? 'scale(1.1)' : 'scale(1)' }} 
                    onMouseEnter={() => setHoverIndex(i)} 
                    onMouseLeave={() => setHoverIndex(null)}
                >
                    {hoverIndex === i && (
                        <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10, whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>POINT {i+1} REJECTION</span>
                            <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 900 }}>{val}%</span>
                            <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #ef4444' }}></div>
                        </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '2px' }}>
                        <div style={{ width: '100%', background: hoverIndex === i ? 'linear-gradient(180deg, #f87171 0%, #b91c1c 100%)' : 'linear-gradient(180deg, #ef4444 0%, #7f1d1d 100%)', height: `${val * 15}%`, borderRadius: '2px', boxShadow: hoverIndex === i ? '0 0 12px rgba(239,68,68,0.8)' : '0 0 8px rgba(239,68,68,0.4)', transition: 'all 0.2s ease-out' }}></div>
                    </div>
                    <span style={{ fontSize: '0.55rem', color: hoverIndex === i ? '#fff' : '#94a3b8', fontWeight: 600, transition: 'color 0.2s' }}>{days[i] || '—'}</span>
                    <span style={{ fontSize: '0.65rem', color: hoverIndex === i ? '#fca5a5' : '#fff', fontWeight: 'bold', transition: 'color 0.2s' }}>{val}%</span>
                </div>
            ))}
        </div>
    )
}

function ThroughputAreaChart({ data, customLabel }) {
    const [hoverIdx, setHoverIdx] = useState(null);
    const width = 300;
    const height = 60;
    const padding = 10;
    const maxVal = Math.max(...data) || 1;
    
    // Generate points for the path
    const points = data.map((v, i) => ({
        x: (i / (data.length - 1)) * (width - padding * 2) + padding,
        y: height - (v / maxVal) * (height - padding * 2) - padding
    }));

    // Create a smooth curve (Cubic Bezier)
    const d = points.reduce((acc, p, i, a) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        const prev = a[i - 1];
        const cp1x = prev.x + (p.x - prev.x) / 2;
        const cp2x = prev.x + (p.x - prev.x) / 2;
        return `${acc} C ${cp1x},${prev.y} ${cp2x},${p.y} ${p.x},${p.y}`;
    }, "");

    const fillD = `${d} L ${points[points.length-1].x},${height} L ${points[0].x},${height} Z`;

    return (
        <div style={{ position: 'relative', width: '100%', height: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1.2rem 0.5rem 0.5rem 0.5rem' }}>
            <div style={{ position: 'absolute', top: '0.4rem', left: '0.5rem', fontSize: '0.55rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{customLabel || "Throughput Flow (24H)"}</div>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#39FF14" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#39FF14" stopOpacity="0" />
                    </linearGradient>
                    <filter id="lineGlow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* Area Fill */}
                <path d={fillD} fill="url(#areaGradient)" style={{ transition: 'all 0.5s ease' }} />
                
                {/* Main Line */}
                <path d={d} fill="none" stroke="#39FF14" strokeWidth="2" filter="url(#lineGlow)" style={{ transition: 'all 0.5s ease' }} />
                
                {/* Hover Indicator Line */}
                {hoverIdx !== null && (
                    <line 
                        x1={points[hoverIdx].x} y1="0" x2={points[hoverIdx].x} y2={height} 
                        stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2,2" 
                    />
                )}

                {/* Invisible hover zones */}
                {points.map((p, i) => (
                    <rect 
                        key={i}
                        x={i === 0 ? 0 : points[i-1].x + (p.x - points[i-1].x)/2}
                        y="0"
                        width={width / data.length}
                        height={height}
                        fill="transparent"
                        onMouseEnter={() => setHoverIdx(i)}
                        onMouseLeave={() => setHoverIdx(null)}
                        style={{ cursor: 'crosshair' }}
                    />
                ))}

                {/* Data point highlight */}
                {hoverIdx !== null && (
                    <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="4" fill="#39FF14" filter="url(#lineGlow)" />
                )}
            </svg>

            {/* Tooltip */}
            {hoverIdx !== null && (
                <div style={{ 
                    position: 'absolute', 
                    top: '0.2rem', 
                    right: '0.5rem', 
                    background: 'rgba(57, 255, 20, 0.1)', 
                    border: '1px solid #39FF14',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    boxShadow: '0 0 15px rgba(57, 255, 20, 0.2)'
                }}>
                    <span style={{ fontSize: '0.7rem', color: '#39FF14', fontWeight: '900' }}>{(data[hoverIdx] * 100).toLocaleString()}</span>
                    <span style={{ fontSize: '0.45rem', color: '#94a3b8' }}>BUNCHES/HR</span>
                </div>
            )}
        </div>
    );
}

function AiDistributionDonut({ data }) {
    const [hoveredId, setHoveredId] = useState(null);
    const size = 160;
    const center = size / 2;
    const strokeWidth = 24;
    const activeStrokeWidth = 32;
    const radius = center - activeStrokeWidth / 2;
    const circumference = 2 * Math.PI * radius;

    const validData = data.filter(d => d.id !== 'all' && d.count > 0);
    const total = validData.reduce((sum, d) => sum + d.count, 0) || 1;

    let currentOffset = 0;

    const hoveredData = hoveredId ? validData.find(d => d.id === hoveredId) : null;

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5rem 0' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                {validData.map((d, i) => {
                    const dashVal = (d.count / total) * circumference;
                    const strokeDasharray = `${dashVal} ${circumference}`;
                    const strokeDashoffset = -currentOffset;
                    currentOffset += dashVal;
                    const isHovered = hoveredId === d.id;
                    
                    return (
                        <circle
                            key={d.id}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke={d.color}
                            strokeWidth={isHovered ? activeStrokeWidth : strokeWidth}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            onMouseEnter={() => setHoveredId(d.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            style={{ 
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                                cursor: 'pointer',
                                filter: isHovered ? 'url(#glow)' : 'none',
                                opacity: hoveredId && !isHovered ? 0.6 : 1
                            }}
                        />
                    );
                })}
            </svg>
            <div style={{ 
                position: 'absolute', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                pointerEvents: 'none',
                transition: 'all 0.3s ease'
            }}>
                <span style={{ 
                    fontSize: '0.5rem', 
                    color: hoveredData ? hoveredData.color : '#94a3b8', 
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    {hoveredData ? hoveredData.label : 'TOTAL'}
                </span>
                <span style={{ 
                    fontSize: hoveredData ? '1.2rem' : '0.85rem', 
                    color: '#fff', 
                    fontWeight: 900,
                    transition: 'all 0.2s ease'
                }}>
                    {(hoveredData ? hoveredData.count : total).toLocaleString()}
                </span>
                {hoveredData && (
                    <span style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 'bold' }}>
                        {((hoveredData.count / total) * 100).toFixed(1)}%
                    </span>
                )}
            </div>
        </div>
    )
}

function GradingRampPage({ user }) {
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedTimeFilter, setSelectedTimeFilter] = useState('DAY')
    const [currentTime, setCurrentTime] = useState(new Date())
    
    // Global Time Filtering States
    const [selectedDateRange, setSelectedDateRange] = useState('TODAY')
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [customDates, setCustomDates] = useState({ start: '2026-04-18', end: '2026-04-25' })

    // Data Simulation Logic based on Time Range
    const displayMetrics = useMemo(() => {
        let multiplier = 1;
        let trendData = [120, 180, 150, 220, 190, 250, 200, 280, 320, 260, 380, 340];
        let label = "Throughput Flow (24H)";
        
        if (selectedDateRange === 'WEEKLY') {
            multiplier = 7.2;
            trendData = [2100, 2400, 1950, 2800, 3100, 2900, 2200]; // 7 days
            label = "Weekly Production Flow (7 Days)";
        } else if (selectedDateRange === 'MONTHLY') {
            multiplier = 30.5;
            trendData = [8500, 9200, 11000, 9800, 12500, 10200, 11800, 9500, 10500, 13000]; // 10 buckets for month
            label = "Monthly Production Flow (30 Days)";
        } else if (selectedDateRange === 'CUSTOM') {
            multiplier = 12.4;
            trendData = [1500, 1800, 1600, 2200, 2100, 2400, 2000, 2800];
            label = "Custom Period Flow";
        }

        const stats = CATEGORIES.map(c => {
            const count = c.id === 'all' 
                ? Math.round(CATEGORIES.reduce((s, x) => s + (x.baseCount || 0), 0) * multiplier)
                : Math.round((c.baseCount || 0) * multiplier * (0.9 + Math.random() * 0.2)); // Add some variance
            return { ...c, count };
        });

        const total = stats.find(s => s.id === 'all')?.count || 1;

        // Dynamic Chart Datasets
        const confidenceData = selectedDateRange === 'TODAY' 
            ? [98.2, 97.5, 98.8, 99.1, 98.4, 98.7]
            : [97.8, 98.2, 98.5, 98.1, 98.8, 98.6, 99.0];
            
        const rejectionData = selectedDateRange === 'TODAY'
            ? [4.2, 3.8, 5.1, 4.6, 3.2, 4.8]
            : [3.5, 4.1, 3.8, 4.5, 3.2, 4.0, 3.7];

        return { stats, total, trendData, label, confidenceData, rejectionData };
    }, [selectedDateRange]);

    const [categoryStats, setCategoryStats] = useState(displayMetrics.stats);

    // Keep categoryStats in sync with simulation data when date range changes
    useEffect(() => {
        setCategoryStats(displayMetrics.stats);
    }, [displayMetrics.stats]);

    const totalCount = useMemo(() => categoryStats.find(c => c.id === 'all')?.count || 0, [categoryStats]);
    const ripeCount = useMemo(() => categoryStats.find(c => c.id === 'ripe')?.count || 0, [categoryStats]);
    const ripenessRate = totalCount > 0 ? ((ripeCount / totalCount) * 100).toFixed(1) : 0;

    // Supplier Data Simulation
    const baseSuppliers = [
        { id: 'SUP-5403', name: 'Est. Tunas Makmur', bunches: 124000, ripe: 92, grade: 'A+' },
        { id: 'SUP-2109', name: 'KUD Harapan Jaya', bunches: 89000, ripe: 85, grade: 'A' },
        { id: 'SUP-8821', name: 'PT. Agro Lestari', bunches: 75000, ripe: 82, grade: 'A-' },
        { id: 'SUP-4412', name: 'Kop. Sawit Bersama', bunches: 62000, ripe: 78, grade: 'B+' },
        { id: 'SUP-3091', name: 'Bundo Maju', bunches: 54000, ripe: 75, grade: 'B' },
        { id: 'SUP-1102', name: 'CV. Hasil Bumi', bunches: 48000, ripe: 71, grade: 'B-' },
        { id: 'SUP-9004', name: 'Supplier Mandiri', bunches: 42000, ripe: 68, grade: 'C' }
    ];

    const scaledSuppliers = useMemo(() => {
        let multiplier = 1;
        if (selectedDateRange === 'WEEKLY') multiplier = 7.1;
        if (selectedDateRange === 'MONTHLY') multiplier = 30.2;
        if (selectedDateRange === 'CUSTOM') multiplier = 12.5;

        return baseSuppliers.map(s => ({
            ...s,
            bunches: Math.round(s.bunches * multiplier * (0.95 + Math.random() * 0.1)),
            deliveries: [
                { truck: `BK ${Math.floor(1000+Math.random()*8999)} ${String.fromCharCode(65+Math.random()*26)}${String.fromCharCode(65+Math.random()*26)}`, driver: 'Simulated Driver', ripe: s.ripe + 2, time: '14:20', bunches: 450 },
                { truck: `BK ${Math.floor(1000+Math.random()*8999)} ${String.fromCharCode(65+Math.random()*26)}${String.fromCharCode(65+Math.random()*26)}`, driver: 'Simulated Driver', ripe: s.ripe - 1, time: '11:45', bunches: 380 }
            ]
        }));
    }, [selectedDateRange]);

    const [detections, setDetections] = useState([])
    const [trendDatasets, setTrendDatasets] = useState([])
    const [loading, setLoading] = useState(true)

    const [currentPage, setCurrentPage] = useState(1)
    const [paginationData, setPaginationData] = useState({ total: 0, totalPages: 1 })
    const itemsPerPage = 36 // Adjusted to 36 (6x6 grid) for maximum photo visibility and balanced quantity

    const [showStreamSettings, setShowStreamSettings] = useState(false)
    const [selectedMetricDetail, setSelectedMetricDetail] = useState(null)
    const exportDataToCsv = () => {
        const dateStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

        // Build CSV header and category section
        let csvRows = [
            `AgroVision Grading Ramp Report`,
            `Generated: ${dateStr} ${timeStr}`,
            `Period: ${selectedDateRange}`,
            ``,
            `=== CATEGORY BREAKDOWN ===`,
            `Category,Count,Percentage`
        ];

        const total = categoryStats.find(c => c.id === 'all')?.count || 1;
        categoryStats.forEach(cat => {
            const pct = cat.id === 'all' ? '100' : ((cat.count / total) * 100).toFixed(1);
            csvRows.push(`${cat.label},${cat.count},${pct}%`);
        });

        csvRows.push('');
        csvRows.push('=== SUPPLIER QUALITY SCORECARD ===');
        csvRows.push('Supplier ID,Supplier Name,Bunches,Ripe %,Grade');
        scaledSuppliers.forEach(sup => {
            csvRows.push(`${sup.id},"${sup.name}",${sup.bunches},${sup.ripe}%,${sup.grade}`);
        });

        csvRows.push('');
        csvRows.push('=== AI PERFORMANCE METRICS ===');
        csvRows.push('Metric,Value');
        csvRows.push(`AI Confidence AVG,98.4%`);
        csvRows.push(`AI Latency AVG,34ms`);
        csvRows.push(`EST. OER Potential,22.4%`);
        csvRows.push(`Ripeness Rate,${ripenessRate}%`);

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `grading_ramp_export_${selectedDateRange.toLowerCase()}_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const generateReport = () => {
        const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('id-ID');
        const total = categoryStats.find(c => c.id === 'all')?.count || 1;

        const categoryRowsHtml = categoryStats.filter(c => c.id !== 'all').map(cat => {
            const pct = ((cat.count / total) * 100).toFixed(1);
            return `<tr>
                <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cat.color};margin-right:8px"></span>${cat.label}</td>
                <td style="text-align:right;font-weight:600">${cat.count.toLocaleString()}</td>
                <td style="text-align:right">${pct}%</td>
                <td><div style="background:#e2e8f0;border-radius:4px;height:8px;width:100%"><div style="background:${cat.color};border-radius:4px;height:100%;width:${pct}%"></div></div></td>
            </tr>`;
        }).join('');

        const supplierRowsHtml = scaledSuppliers.map((sup, idx) => `
            <tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#fff'}">
                <td style="font-weight:600">${sup.name}</td>
                <td style="text-align:right">${sup.bunches.toLocaleString()}</td>
                <td style="text-align:right;color:${sup.ripe > 85 ? '#10b981' : sup.ripe > 75 ? '#ca8a04' : '#ef4444'};font-weight:700">${sup.ripe}%</td>
                <td style="text-align:center"><span style="background:${sup.ripe > 85 ? '#dcfce7' : sup.ripe > 75 ? '#fef9c3' : '#fee2e2'};color:${sup.ripe > 85 ? '#166534' : sup.ripe > 75 ? '#854d0e' : '#991b1b'};padding:2px 10px;border-radius:4px;font-weight:700;font-size:0.8rem">${sup.grade}</span></td>
            </tr>
        `).join('');

        const reportHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>AgroVision Grading Report - ${dateStr}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; background: #fff; padding: 2rem; }
        .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 1.5rem; margin-bottom: 2rem; }
        .report-title { font-size: 1.8rem; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
        .report-subtitle { font-size: 0.9rem; color: #64748b; margin-top: 0.3rem; }
        .report-meta { text-align: right; font-size: 0.8rem; color: #64748b; }
        .report-meta strong { color: #0f172a; display: block; font-size: 0.9rem; }
        .section-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 2rem 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 0.5rem; }
        .section-title::before { content: ''; display: inline-block; width: 4px; height: 18px; background: #10b981; border-radius: 2px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; text-align: center; }
        .stat-card .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 0.3rem; }
        .stat-card .stat-value { font-size: 1.6rem; font-weight: 800; color: #0f172a; }
        .stat-card .stat-value small { font-size: 0.7rem; color: #94a3b8; margin-left: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        th { background: #0f172a; color: #fff; padding: 0.6rem 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; text-align: left; }
        td { padding: 0.5rem 1rem; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; }
        .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 2px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; text-align: center; }
        .footer strong { color: #64748b; }
        @media print { body { padding: 1rem; } }
    </style>
</head>
<body>
    <div class="report-header">
        <div>
            <div class="report-title">GRADING RAMP REPORT</div>
            <div class="report-subtitle">AgroVision — Intelligent Palm Oil Mill Automation System</div>
        </div>
        <div class="report-meta">
            <strong>Period: ${selectedDateRange}</strong>
            ${dateStr}<br>${timeStr} WIB
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Detected</div>
            <div class="stat-value">${totalCount.toLocaleString()}<small>Bunches</small></div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Ripeness Rate</div>
            <div class="stat-value">${ripenessRate}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">EST. OER Potential</div>
            <div class="stat-value">22.4%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">AI Confidence</div>
            <div class="stat-value">98.4%</div>
        </div>
    </div>

    <div class="section-title">Category Breakdown</div>
    <table>
        <thead><tr><th>Category</th><th style="text-align:right">Count</th><th style="text-align:right">%</th><th style="width:30%">Distribution</th></tr></thead>
        <tbody>${categoryRowsHtml}</tbody>
    </table>

    <div class="section-title">Supplier Quality Scorecard (ALPR)</div>
    <table>
        <thead><tr><th>Supplier</th><th style="text-align:right">Bunches</th><th style="text-align:right">Ripe %</th><th style="text-align:center">Grade</th></tr></thead>
        <tbody>${supplierRowsHtml}</tbody>
    </table>

    <div class="section-title">System Performance</div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">AI Speed</div><div class="stat-value">34<small>ms</small></div></div>
        <div class="stat-card"><div class="stat-label">CPU Load</div><div class="stat-value">14%</div></div>
        <div class="stat-card"><div class="stat-label">Uptime</div><div class="stat-value">14d 06h</div></div>
        <div class="stat-card"><div class="stat-label">Model Version</div><div class="stat-value" style="font-size:0.9rem">Current</div></div>
    </div>

    <div class="footer">
        <strong>AgroVision — Intelligent Palm Oil Mill Automation System</strong><br>
        Report generated automatically on ${dateStr} at ${timeStr} WIB<br>
        © ${new Date().getFullYear()} AgroVision. All rights reserved.
    </div>
</body>
</html>`;

        // Use a hidden iframe to print directly without opening a new tab
        let printFrame = document.getElementById('agrovision-print-frame');
        if (printFrame) printFrame.remove();

        printFrame = document.createElement('iframe');
        printFrame.id = 'agrovision-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.top = '-10000px';
        printFrame.style.left = '-10000px';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);

        const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(reportHtml);
        frameDoc.close();

        printFrame.onload = () => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        };
    };
    const [streamUrl, setStreamUrl] = useState('rtsp://demo-stream:554/live/grading-ramp')
    const [tempStreamUrl, setTempStreamUrl] = useState('rtsp://demo-stream:554/live/grading-ramp')
    const [isStreamingConnected, setIsStreamingConnected] = useState(false)
    const [tempIsStreaming, setTempIsStreaming] = useState(false)

    const [selectedCapture, setSelectedCapture] = useState(null)
    const [activeTab, setActiveTab] = useState('ai-grading-ramp')

    // Fetch Stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/grading/stats?period=${selectedTimeFilter}`, { credentials: 'include' });
                if (res.ok) {
                    if (!Array.isArray(stats)) {
                        console.warn("API returned invalid stats format, expected array.");
                        return;
                    }

                    // Sum all counts from DB for the 'all' category
                    const totalFromDb = stats.reduce((sum, s) => sum + (s.count || 0), 0);

                    setCategoryStats(prevStats => CATEGORIES.map(cat => {
                        const dbMatch = stats.find(s => s.category === cat.id);
                        let count = cat.baseCount || 0;
                        
                        if (cat.id === 'all') {
                            count = stats.length ? totalFromDb : prevStats.find(c => c.id === 'all')?.count || 0;
                        } else if (dbMatch) {
                            count = dbMatch.count;
                        }
                        
                        return { ...cat, count };
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch stats:", err);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [selectedTimeFilter]);

    // Fetch Recent Detections with Pagination & Filter
    useEffect(() => {
        const fetchRecent = async () => {
            setLoading(true);
            try {
                const categoryParam = selectedCategory === 'all' ? '' : `&category=${selectedCategory}`;
                const res = await fetch(`/api/grading/recent?page=${currentPage}&limit=${itemsPerPage}${categoryParam}`, { credentials: 'include' });
                if (res.ok) {
                    const result = await res.json();
                    setDetections(result.data.map(d => ({
                        ...d,
                        type: d.category,
                        time: new Date(d.created_at).toLocaleTimeString(),
                        image_url: IMAGE_MAP[d.category] || d.image_url || PLACEHOLDER_GRADING_BG
                    })));
                    setPaginationData(result.pagination);
                } else {
                    throw new Error('API not available, using mock data');
                }
            } catch (err) {
                console.warn("Failed to fetch recent detections, falling back to mock data:", err.message);
                if (selectedCategory === 'underripe' || selectedCategory === 'unknown') {
                    setDetections([]);
                    setPaginationData({ total: 0, totalPages: 1 });
                    return;
                }
                const mockData = Array.from({ length: itemsPerPage }, (_, i) => {
                    const validCategories = CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'underripe' && c.id !== 'unknown');
                    const mockType = selectedCategory === 'all'
                        ? validCategories[Math.floor(Math.random() * validCategories.length)].id
                        : selectedCategory;
                    return {
                        id: `mock-det-${Date.now()}-${i}`,
                        type: mockType,
                        confidence: Math.floor(Math.random() * 15) + 85,
                        time: new Date(Date.now() - i * 300000).toLocaleTimeString(),
                        image_url: IMAGE_MAP[mockType] || PLACEHOLDER_GRADING_BG
                    };
                });
                setDetections(mockData);
                setPaginationData({ total: 500, totalPages: Math.ceil(500 / itemsPerPage) });
            } finally {
                setLoading(false);
            }
        };
        fetchRecent();
    }, [currentPage, itemsPerPage, selectedCategory]);

    // Reset page when category changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory]);

    // Fetch Trend Data
    useEffect(() => {
        const fetchTrend = async () => {
            const MOCK_TREND = {
                ripe: [12000, 20000, 15000, 30000, 25000, 40000],
                unripe: [3000, 5000, 4000, 8000, 6000, 9000],
                overripe: [500, 1000, 800, 1500, 1200, 2000],
                underripe: [0, 0, 0, 0, 0, 0],
                abnormal: [200, 500, 400, 800, 600, 1000],
                empty: [100, 200, 100, 300, 200, 400],
            };
            try {
                const res = await fetch(`/api/grading/trend?category=${selectedCategory}&period=${selectedTimeFilter}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setTrendDatasets([{
                        id: selectedCategory,
                        label: CATEGORIES.find(c => c.id === selectedCategory)?.label || 'DATA',
                        color: CATEGORIES.find(c => c.id === selectedCategory)?.color || '#fff',
                        data: data.map(d => d.value)
                    }]);
                } else {
                    throw new Error('fallback');
                }
            } catch (err) {
                if (selectedCategory === 'all') {
                    setTrendDatasets(CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'unknown').map(c => ({
                        id: c.id,
                        label: c.label,
                        color: c.color,
                        data: MOCK_TREND[c.id] || [0, 0, 0, 0, 0, 0]
                    })));
                } else {
                    setTrendDatasets([{
                        id: selectedCategory,
                        label: CATEGORIES.find(c => c.id === selectedCategory)?.label,
                        color: CATEGORIES.find(c => c.id === selectedCategory)?.color,
                        data: MOCK_TREND[selectedCategory] || [0, 0, 0, 0, 0, 0]
                    }]);
                }
            }
        };
        fetchTrend();
    }, [selectedCategory, selectedTimeFilter]);

    const saveSettings = (e) => {
        e.preventDefault()
        setStreamUrl(tempStreamUrl)
        setIsStreamingConnected(tempIsStreaming)
        setShowStreamSettings(false)
    }

    const openSettings = () => {
        setTempStreamUrl(streamUrl)
        setTempIsStreaming(isStreamingConnected)
        setShowStreamSettings(true)
    }

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])


    const handleCorrectType = async (id, newType) => {
        try {
            const res = await fetch(`/api/grading/detections/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: newType }),
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error('API not available, mocking update');
            }
        } catch (err) {
            console.warn("Update detection API failed, applying mock UI update:", err.message);
        } finally {
            setDetections(prev => prev.map(d => d.id === id ? { ...d, type: newType } : d));
            setSelectedCapture(prev => (prev?.id === id ? { ...prev, type: newType } : prev));
        }
    }

    return (
        <div className="som-grading-station">
            <header className="som-grading-ramp-header">
                <div className="som-header-left">
                    <h2 className="som-grading-ramp-title">GRADING RAMP VIEW</h2>
                    <div className="som-station-tabs">
                        <button className={`som-station-tab ${activeTab === 'ai-grading-ramp' ? 'active' : ''}`} onClick={() => setActiveTab('ai-grading-ramp')}>AI GRADING - RAMP</button>
                        <button className={`som-station-tab ${activeTab === 'OVERVIEW' ? 'active' : ''}`} onClick={() => setActiveTab('OVERVIEW')}>OVERVIEW</button>
                        <button className={`som-station-tab ${activeTab === 'ANALYTICS' ? 'active' : ''}`} onClick={() => setActiveTab('ANALYTICS')}>ANALYTICS & REPORTS</button>
                    </div>
                </div>

                <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
                    <button className="som-view-btn active">PROCESS VIEW</button>
                    <button className="som-view-btn">MAINTENANCE VIEW</button>
                </div>
            </header>

            {activeTab === 'ai-grading-ramp' ? (
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <AiGradingRampTab />
                </div>
            ) : (
            <main className="som-grading-station-main">
                <div className="som-grading-summary-row">
                    <div className="som-grading-stat-card">
                        <span className="label">TOTAL DETECTED {selectedTimeFilter}</span>
                        <span className="value">{totalCount.toLocaleString()} <small>BUNCHES</small></span>
                    </div>
                    <div className="som-grading-stat-card">
                        <span className="label">RIPENESS RATE</span>
                        <span className="value">{ripenessRate}%</span>
                    </div>
                    <div className="som-grading-stat-card" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                        <span className="label" style={{ color: '#10b981' }}>EST. OER POTENTIAL</span>
                        <span className="value" style={{ color: '#10b981' }}>22.4<small>%</small></span>
                    </div>
                    <div className="som-grading-stat-card">
                        <span className="label">AI CONFIDENCE AVG</span>
                        <span className="value">98.4%</span>
                    </div>
                    <div className="som-grading-stat-card">
                        <span className="label">AI LATENCY AVG</span>
                        <span className="value">34<small>ms</small></span>
                    </div>
                </div>

                <div className="som-grading-content-grid">
                    {activeTab === 'OVERVIEW' ? (
                        <>
                            <div className="som-grading-layout-left">
                                <section className="som-grading-card-v4 som-feed-card" style={{ flex: 1, width: '100%' }}>
                                    <div className="som-card-header-v4">
                                        <div className="som-card-title-v4">
                                            <span className='live-dot'></span>
                                            LIVE RAMP STREAMING
                                        </div>
                                        <div className="som-card-meta-v4-controls">
                                            <span className="som-card-meta-v4">CAM-01 | 1080P ACTIVE</span>
                                            <button className="som-settings-btn" onClick={openSettings}>
                                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 1.51 1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="som-feed-viewport-v4" style={{ width: '100%' }}>
                                        <video
                                            src="/Ripeness/VideoStream.mp4"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="live-img"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                </section>
                                <section className="som-grading-card-v4" style={{ flex: 1.2, padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 800 }}>LIVE QUALITY ALERTS</span>
                                        <span className="live-dot" style={{ background: '#ef4444', boxShadow: '0 0 5px #ef4444' }}></span>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
                                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '2px solid #ef4444', padding: '0.2rem 0.4rem', fontSize: '0.55rem' }}>
                                            <div style={{ color: '#ef4444', fontWeight: 'bold' }}>TRK-8812</div>
                                            <div style={{ color: '#cbd5e1' }}>&gt;15% Unripe. Telegram alert sent.</div>
                                        </div>
                                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '2px solid #f59e0b', padding: '0.2rem 0.4rem', fontSize: '0.55rem' }}>
                                            <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>TRK-1092</div>
                                            <div style={{ color: '#cbd5e1' }}>Abnormal spike detected.</div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                            <div className="som-grading-layout-middle">
                                <section className="som-grading-card-v4 som-captures-card" style={{ flex: 1 }}>
                                    <div className="som-card-header-v4">
                                        <div className="som-card-title-v4">RECENT CAPTURES</div>
                                        <div className="som-grading-filters">
                                            <select className="som-grading-select" style={{ width: '80px', padding: '2px' }}>
                                                <option>Today</option>
                                                <option>This Week</option>
                                            </select>
                                            <select
                                                className="som-grading-select"
                                                style={{ width: '100px', padding: '2px' }}
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                            >
                                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="som-captures-grid-v4">
                                        {detections.map(det => (
                                            <div key={det.id} className="som-capture-item-v4">
                                                <div className="img-box" onClick={() => setSelectedCapture(det)} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }} title="Click to view details">
                                                    <img src={det.image_url || PLACEHOLDER_GRADING_BG} alt="Capture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                                                        padding: '12px 8px 4px 8px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        pointerEvents: 'none'
                                                    }}>
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            color: '#39FF14',
                                                            fontWeight: '900',
                                                            fontFamily: 'monospace',
                                                            textShadow: '0 0 5px rgba(57, 255, 20, 0.5)',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            {det.time}
                                                        </span>
                                                        <div style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            background: '#39FF14',
                                                            borderRadius: '50%',
                                                            boxShadow: '0 0 5px #39FF14',
                                                            animation: 'pulse 1.5s infinite'
                                                        }}></div>
                                                    </div>
                                                </div>
                                                <div className="info-box" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0.4rem', flex: 'none' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: CATEGORIES.find(c => c.id === det.type)?.color || '#fff' }}>
                                                            {CATEGORIES.find(c => c.id === det.type)?.label.toUpperCase()}
                                                        </span>
                                                        <span className="conf" style={{ margin: 0 }}>{det.confidence}%</span>
                                                    </div>
                                                    <button
                                                        style={{ width: '100%', padding: '3px 0', fontSize: '0.55rem', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: 'none', borderRadius: '2px', cursor: 'pointer', marginTop: '2px', marginBottom: '2px' }}
                                                        onClick={() => setSelectedCapture(det)}
                                                    >
                                                        VIEW DETAIL
                                                    </button>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: '#64748b', fontWeight: 'bold' }}>
                                                        <span>TRK-{Math.floor(1000 + Math.random() * 9000)}</span>
                                                        <span>CAM-01</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {detections.length === 0 && !loading && (
                                            <div className="som-no-captures">No recent detections found.</div>
                                        )}
                                        {loading && (
                                            <div className="som-loading-captures">Loading detections...</div>
                                        )}
                                    </div>
                                    <div className="som-pagination-controls" style={{ padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: 'center' }}>
                                        <button
                                            className="som-page-btn"
                                            disabled={currentPage <= 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                        >
                                            &lsaquo;
                                        </button>
                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Page {currentPage} of {paginationData.totalPages}</span>
                                        <button
                                            className="som-page-btn"
                                            disabled={currentPage >= paginationData.totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                        >
                                            &rsaquo;
                                        </button>
                                    </div>
                                </section>
                            </div>
                            <div className="som-grading-layout-right">
                                <section className="som-grading-card-v4 som-analysis-card">
                                    <div className="som-card-header-v4">
                                        <div className="som-card-title-v4">CATEGORY ANALYSIS</div>
                                        <div className="som-grading-filters">
                                            {TIME_FILTERS.map(f => (
                                                <button
                                                    key={f}
                                                    className={`som-filter-pill ${selectedTimeFilter === f ? 'active' : ''}`}
                                                    onClick={() => setSelectedTimeFilter(f)}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="som-analysis-body">
                                        <div className="som-categories-container">
                                            {categoryStats.map(cat => {
                                                const actualTotal = categoryStats.find(c => c.id === 'all')?.count || 1;
                                                const percentage = cat.id === 'all' ? 100 : Math.round((cat.count / actualTotal) * 100);

                                                return (
                                                    <div
                                                        key={cat.id}
                                                        className={`som-cat-row-v4 ${selectedCategory === cat.id ? 'active' : ''}`}
                                                        onClick={() => setSelectedCategory(cat.id)}
                                                    >
                                                        <div className="row-main">
                                                            <div className="indicator" style={{ backgroundColor: cat.color }}></div>
                                                            <span className="label">{cat.label}</span>
                                                            <div className="stats">
                                                                <span className="count">{cat.count.toLocaleString()}</span>
                                                                <span className="percent">{percentage}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="row-bar">
                                                            <div className="fill" style={{ width: `${percentage}%`, backgroundColor: cat.color }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="som-trend-section-v4">
                                            <div className="trend-header">
                                                <span className="title">{selectedCategory.toUpperCase()} TREND ({selectedTimeFilter})</span>
                                            </div>
                                            <div className="trend-graph-v4">
                                                <CategoryTrendChart
                                                    datasets={trendDatasets}
                                                    timeFilter={selectedTimeFilter}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Global Analytics Toolbar */}
                            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Time Range</div>
                                    <div style={{ display: 'flex', background: '#ffffff', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        {['TODAY', 'WEEKLY', 'MONTHLY', 'CUSTOM'].map(range => (
                                            <button
                                                key={range}
                                                onClick={() => {
                                                    setSelectedDateRange(range);
                                                    if (range === 'CUSTOM') setIsCalendarOpen(true);
                                                }}
                                                style={{
                                                    padding: '6px 16px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 'bold',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    background: selectedDateRange === range ? '#facc15' : 'transparent',
                                                    color: selectedDateRange === range ? '#1e293b' : '#64748b',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: selectedDateRange === range ? '0 4px 12px rgba(250, 204, 21, 0.4)' : 'none'
                                                }}
                                            >
                                                {range}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedDateRange === 'CUSTOM' && (
                                        <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: 'bold', background: '#fef9c3', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                            {customDates.start} — {customDates.end}
                                            <button onClick={() => setIsCalendarOpen(true)} style={{ background: 'none', border: 'none', color: '#1e293b', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <button onClick={generateReport} style={{ background: '#facc15', color: '#1e293b', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(250, 204, 21, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                        GENERATE REPORT
                                    </button>
                                </div>
                            </div>

                            <div className="som-grading-layout-left">
                                <section className="som-grading-card-v4 som-ai-metrics-card" style={{ flex: 1 }}>
                                    <div className="som-card-header-v4">
                                        <div className="som-card-title-v4">AI CLASSIFICATION DIST</div>
                                    </div>
                                    <div className="som-ai-metrics-body" style={{ alignItems: 'center' }}>
                                        <AiDistributionDonut data={categoryStats} />
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                                            {categoryStats.filter(c => c.id !== 'all' && c.count > 0).map(c => (
                                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.color }}></div>
                                                    <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 700 }}>{c.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                                <section className="som-grading-card-v4 som-performance-card" style={{ flex: 'none' }}>
                                    <div className="som-card-header-v4" style={{ marginBottom: '0.25rem', paddingBottom: '0.25rem' }}>
                                        <div className="som-card-title-v4" style={{ fontSize: '0.65rem' }}>SYSTEM PERFORMANCE</div>
                                    </div>
                                    <div className="som-performance-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div className="perf-item" style={{ padding: '0.25rem 0' }}>
                                            <span className="label" style={{ fontSize: '0.55rem' }}>AI Speed</span>
                                            <span className="value" style={{ fontSize: '0.6rem' }}>34ms</span>
                                        </div>
                                        <div className="perf-item" style={{ padding: '0.25rem 0' }}>
                                            <span className="label" style={{ fontSize: '0.55rem' }}>Version</span>
                                            <span className="value" style={{ fontSize: '0.6rem' }}>Last Version (Current)</span>
                                        </div>
                                        <div className="perf-item" style={{ padding: '0.25rem 0', borderBottom: 'none' }}>
                                            <span className="label" style={{ fontSize: '0.55rem' }}>Load</span>
                                            <span className="value" style={{ fontSize: '0.6rem' }}>14% CPU</span>
                                        </div>
                                        <div className="perf-item" style={{ padding: '0.25rem 0', borderBottom: 'none' }}>
                                            <span className="label" style={{ fontSize: '0.55rem' }}>Uptime</span>
                                            <span className="value" style={{ fontSize: '0.6rem' }}>14d 06h</span>
                                        </div>
                                    </div>
                                </section>

                                <section className="som-grading-card-v4" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div className="som-card-header-v4">
                                        <div className="som-card-title-v4" style={{ color: '#ef4444' }}>RECENT ANOMALIES</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
                                        {[
                                            { time: '14:22', trk: 'TRK-5891', desc: 'Overripe > 20%' },
                                            { time: '13:45', trk: 'TRK-2234', desc: 'Empty Bunches Detected' },
                                            { time: '12:10', trk: 'TRK-9003', desc: 'Camera Obstruction' },
                                            { time: '11:05', trk: 'TRK-4421', desc: 'Abnormal Spike' },
                                            { time: '09:30', trk: 'TRK-1122', desc: 'Under-ripe > 15%' }
                                        ].map((anom, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '2px solid #ef4444', borderRadius: '0 4px 4px 0' }}>
                                                <span style={{ fontSize: '0.55rem', color: '#94a3b8', width: '30px' }}>{anom.time}</span>
                                                <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 'bold', width: '50px' }}>{anom.trk}</span>
                                                <span style={{ fontSize: '0.55rem', color: '#fca5a5' }}>{anom.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                            </div>
                            <div className="som-grading-layout-middle">
                                <div style={{ display: 'flex', gap: '0.5rem', flex: 0.8 }}>
                                    <section className="som-grading-card-v4" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(57, 255, 20, 0.1)' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>TOTAL DETECTED TODAY</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(57, 255, 20, 0.1)', padding: '2px 6px', borderRadius: '10px' }}>
                                                    <div style={{ width: '5px', height: '5px', background: '#39FF14', borderRadius: '50%', animation: 'pulse 1s infinite' }}></div>
                                                    <span style={{ fontSize: '0.5rem', color: '#39FF14', fontWeight: 'bold' }}>LIVE FEED</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <span style={{ fontSize: '2.2rem', color: '#39FF14', fontWeight: 900, lineHeight: 1, letterSpacing: '-1px' }}>{totalCount.toLocaleString()}</span>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800 }}>BUNCHES</span>
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                                {selectedDateRange === 'TODAY' ? '+12.4%' : selectedDateRange === 'WEEKLY' ? '+4.2%' : '-1.5%'} <span style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 'normal' }}>vs Prev Period</span>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1rem' }}>
                                            <ThroughputAreaChart 
                                                data={displayMetrics.trendData} 
                                                customLabel={displayMetrics.label}
                                            />
                                        </div>
                                    </section>
                                    <section className="som-grading-card-v4" style={{ flex: 1.2, padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(2,6,23,0.8) 100%)' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>VOLUMETRIC SIZE DISTRIBUTION</span>
                                        <div style={{ display: 'flex', gap: '0.4rem', height: '100%', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                                            <div onClick={() => setSelectedMetricDetail({ type: 'volumetric', data: { size: 'SMALL', percentage: 15, count: 176, color: '#3b82f6' } })} style={{ flex: 1, height: '40%', background: 'linear-gradient(180deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.05) 100%)', borderTop: '2px solid #3b82f6', borderRadius: '4px 4px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 -4px 10px rgba(59,130,246,0.15)', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.4)'} onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(180deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.05) 100%)'}>
                                                <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: '900' }}>15%</div>
                                                <div style={{ fontSize: '0.55rem', color: '#94a3b8', letterSpacing: '1px' }}>SMALL</div>
                                            </div>
                                            <div onClick={() => setSelectedMetricDetail({ type: 'volumetric', data: { size: 'MEDIUM', percentage: 60, count: 706, color: '#10b981' } })} style={{ flex: 1, height: '90%', background: 'linear-gradient(180deg, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.05) 100%)', borderTop: '2px solid #10b981', borderRadius: '4px 4px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 -4px 10px rgba(16,185,129,0.15)', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.4)'} onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(180deg, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.05) 100%)'}>
                                                <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: '900' }}>60%</div>
                                                <div style={{ fontSize: '0.55rem', color: '#94a3b8', letterSpacing: '1px' }}>MEDIUM</div>
                                            </div>
                                            <div onClick={() => setSelectedMetricDetail({ type: 'volumetric', data: { size: 'LARGE', percentage: 25, count: 294, color: '#f59e0b' } })} style={{ flex: 1, height: '60%', background: 'linear-gradient(180deg, rgba(245,158,11,0.3) 0%, rgba(245,158,11,0.05) 100%)', borderTop: '2px solid #f59e0b', borderRadius: '4px 4px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 -4px 10px rgba(245,158,11,0.15)', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.4)'} onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(180deg, rgba(245,158,11,0.3) 0%, rgba(245,158,11,0.05) 100%)'}>
                                                <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: '900' }}>25%</div>
                                                <div style={{ fontSize: '0.55rem', color: '#94a3b8', letterSpacing: '1px' }}>LARGE</div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                                <section className="som-grading-card-v4" style={{ flex: 1, padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                    <div className="som-card-header-v4" style={{ marginBottom: '0.25rem', paddingBottom: '0.25rem' }}>
                                        <div className="som-card-title-v4" style={{ fontSize: '0.65rem' }}>SUPPLIER QUALITY SCORECARD (ALPR)</div>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        <table style={{ width: '100%', fontSize: '0.6rem', color: '#cbd5e1', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8' }}>
                                                    <th style={{ paddingBottom: '4px' }}>SUPPLIER</th>
                                                    <th style={{ paddingBottom: '4px' }}>BUNCHES</th>
                                                    <th style={{ paddingBottom: '4px' }}>RIPE %</th>
                                                    <th style={{ paddingBottom: '4px' }}>GRADE</th>
                                                    <th style={{ paddingBottom: '4px', textAlign: 'right' }}>ACTION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scaledSuppliers.map((sup, idx) => (
                                                    <tr 
                                                        key={sup.id}
                                                        style={{ cursor: 'pointer', transition: 'background 0.2s' }} 
                                                        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} 
                                                        onMouseLeave={e => e.currentTarget.style.background='transparent'} 
                                                        onClick={() => setSelectedMetricDetail({ type: 'supplier', data: sup })}
                                                    >
                                                        <td style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{sup.name}</td>
                                                        <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{sup.bunches.toLocaleString()}</td>
                                                        <td style={{ color: sup.ripe > 85 ? '#10b981' : sup.ripe > 75 ? '#84cc16' : '#ef4444', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{sup.ripe}%</td>
                                                        <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <span style={{ background: sup.ripe > 85 ? 'rgba(16, 185, 129, 0.2)' : sup.ripe > 75 ? 'rgba(132, 204, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: sup.ripe > 85 ? '#10b981' : sup.ripe > 75 ? '#84cc16' : '#ef4444', padding: '2px 4px', borderRadius: '2px', fontWeight: 'bold' }}>
                                                                {sup.grade}
                                                            </span>
                                                        </td>
                                                        <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                                                            <button style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 'bold', cursor: 'pointer' }}>DETAILS</button>
                                                        </td>
                                                    </tr>
                                                ))}

                                                <tr style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => setSelectedMetricDetail({ 
                                                    type: 'supplier', 
                                                    data: { 
                                                        id: 'SUP-4410', 
                                                        name: 'Koperasi Sawit Bersama', 
                                                        bunches: 62000, 
                                                        ripe: 78, 
                                                        grade: 'B+', 
                                                        deliveries: [
                                                            { truck: 'BK 5541 Z', driver: 'Wahyu Hidayat', ripe: 79, time: '14:45', bunches: 240 },
                                                            { truck: 'BK 1092 OP', driver: 'Bambang Sukojo', ripe: 77, time: '10:20', bunches: 260 }
                                                        ]
                                                    } 
                                                })}>
                                                    <td style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Koperasi Sawit Bersama</td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>62,000</td>
                                                    <td style={{ color: '#eab308', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>78%</td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '2px 4px', borderRadius: '2px', fontWeight: 'bold' }}>B+</span></td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                                                        <button style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 'bold', cursor: 'pointer' }}>DETAILS</button>
                                                    </td>
                                                </tr>
                                                <tr style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => setSelectedMetricDetail({ 
                                                    type: 'supplier', 
                                                    data: { 
                                                        id: 'SUP-3305', 
                                                        name: 'Bumdes Maju', 
                                                        bunches: 54000, 
                                                        ripe: 75, 
                                                        grade: 'B', 
                                                        deliveries: [
                                                            { truck: 'BK 2210 PQ', driver: 'Andi Wijaya', ripe: 76, time: '11:15', bunches: 190 },
                                                            { truck: 'BK 6678 RS', driver: 'Zulkifli', ripe: 74, time: '08:45', bunches: 210 }
                                                        ]
                                                    } 
                                                })}>
                                                    <td style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Bumdes Maju</td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>54,000</td>
                                                    <td style={{ color: '#eab308', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>75%</td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '2px 4px', borderRadius: '2px', fontWeight: 'bold' }}>B</span></td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                                                        <button style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 'bold', cursor: 'pointer' }}>DETAILS</button>
                                                    </td>
                                                </tr>
                                                <tr style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => setSelectedMetricDetail({ 
                                                    type: 'supplier', 
                                                    data: { 
                                                        id: 'SUP-1200', 
                                                        name: 'CV. Hasil Bumi', 
                                                        bunches: 48000, 
                                                        ripe: 71, 
                                                        grade: 'B-', 
                                                        deliveries: [
                                                            { truck: 'BK 7777 W', driver: 'Taufik Hidayat', ripe: 72, time: '15:55', bunches: 150 },
                                                            { truck: 'BK 8811 KL', driver: 'Yanto', ripe: 70, time: '09:30', bunches: 180 }
                                                        ]
                                                    } 
                                                })}>
                                                    <td style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>CV. Hasil Bumi</td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>48,000</td>
                                                    <td style={{ color: '#f97316', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>71%</td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#f97316', padding: '2px 4px', borderRadius: '2px', fontWeight: 'bold' }}>B-</span></td>
                                                    <td style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                                                        <button style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 'bold', cursor: 'pointer' }}>DETAILS</button>
                                                    </td>
                                                </tr>
                                                <tr style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'} onClick={() => setSelectedMetricDetail({ 
                                                    type: 'supplier', 
                                                    data: { 
                                                        id: 'SUP-9004', 
                                                        name: 'Supplier Mandiri', 
                                                        bunches: 42000, 
                                                        ripe: 68, 
                                                        grade: 'C', 
                                                        deliveries: [
                                                            { truck: 'BK 1010 SS', driver: 'Eko Patrio', ripe: 69, time: '13:10', bunches: 120 },
                                                            { truck: 'BK 5544 JJ', driver: 'Parto', ripe: 67, time: '07:30', bunches: 140 }
                                                        ]
                                                    } 
                                                })}>
                                                    <td style={{ padding: '6px 0' }}>Supplier Mandiri</td>
                                                    <td>42,000</td>
                                                    <td style={{ color: '#ef4444' }}>68%</td>
                                                    <td><span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 4px', borderRadius: '2px', fontWeight: 'bold' }}>C</span></td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 'bold', cursor: 'pointer' }}>DETAILS</button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>
                            <div className="som-grading-layout-right">
                                <section className="som-grading-card-v4" style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.8)'} onClick={() => setSelectedMetricDetail({ type: 'confidence', data: { avg: 98.4, status: 'OPTIMAL', drift: -0.2 } })}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#e2e8f0', fontWeight: 800 }}>AI CONFIDENCE TREND</span>
                                        <span style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 800 }}>OPTIMAL</span>
                                    </div>
                                    <HourlyConfidenceChart data={displayMetrics.confidenceData} />
                                </section>
                                <section className="som-grading-card-v4" style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.8)'} onClick={() => setSelectedMetricDetail({ type: 'rejection', data: { avg: 4.2, trend: '+1.2%', status: 'WARNING' } })}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#e2e8f0', fontWeight: 800 }}>REJECTION RATE ({selectedDateRange})</span>
                                        <span style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 800 }}>+1.2%</span>
                                    </div>
                                    <DailyRejectionChart data={displayMetrics.rejectionData} />
                                </section>
                            </div>
                        </>
                    )}
                </div>
            </main>
            )}

            
            {selectedMetricDetail && createPortal(
                <div className="som-modal-overlay" onClick={() => setSelectedMetricDetail(null)}>
                    <div className="som-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', background: 'linear-gradient(to bottom right, #0f172a, #020617)', border: '1px solid #334155' }}>
                        <div className="som-modal-header" style={{ borderBottom: '1px solid #1e293b' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                    {selectedMetricDetail.type === 'supplier' ? 'SUPPLIER PERFORMANCE' : 
                                     selectedMetricDetail.type === 'volumetric' ? 'VOLUMETRIC ANALYSIS' :
                                     selectedMetricDetail.type === 'confidence' ? 'AI MODEL ACCURACY' : 'REJECTION TRENDS'}
                                </h3>
                            <button className="som-close-btn" onClick={() => setSelectedMetricDetail(null)}>&times;</button>
                        </div>
                        <div className="som-modal-body" style={{ padding: '1.5rem' }}>
                            {selectedMetricDetail.type === 'supplier' && selectedMetricDetail.data && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', letterSpacing: '-0.5px' }}>{selectedMetricDetail.data.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{selectedMetricDetail.data.id}</span> | Last Delivery: Today, {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                        <div style={{ padding: '0.5rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', textAlign: 'center', boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)' }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>{selectedMetricDetail.data.grade}</div>
                                            <div style={{ fontSize: '0.5rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Quality Grade</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.1)' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#93c5fd', marginBottom: '0.25rem', fontWeight: 'bold' }}>TOTAL BUNCHES (TODAY)</div>
                                            <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>{(selectedMetricDetail.data.bunches || 0).toLocaleString()}</div>
                                        </div>
                                        <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#6ee7b7', marginBottom: '0.25rem', fontWeight: 'bold' }}>AVG. RIPENESS %</div>
                                            <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>{selectedMetricDetail.data.ripe}%</div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Deliveries by Fleet (ALPR)</div>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {(selectedMetricDetail.data.deliveries || []).map((delivery, idx) => (
                                                <div key={idx} style={{ padding: '0.75rem', borderBottom: idx === selectedMetricDetail.data.deliveries.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem', borderRadius: '4px' }}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>{delivery.truck}</div>
                                                            <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Driver: {delivery.driver} • {delivery.time} WIB</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.8rem', color: delivery.ripe >= 85 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{delivery.ripe}% Ripe</div>
                                                        <div style={{ fontSize: '0.55rem', color: '#64748b' }}>{delivery.bunches} Bunches</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <h4 style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Historical Ripeness Trend (7 Days)</h4>
                                            <span style={{ fontSize: '0.6rem', color: '#10b981' }}>TARGET: &gt;85%</span>
                                        </div>
                                        <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                            {[78, 82, 85, 81, 88, 86, selectedMetricDetail.data.ripe || 0].map((val, i) => (
                                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', gap: '4px' }}>
                                                    <div style={{ textAlign: 'center', fontSize: '0.55rem', color: val >= 85 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{val}%</div>
                                                    <div style={{ 
                                                        flex: 1, 
                                                        background: val >= 85 ? 'linear-gradient(to top, #10b98188, #10b981)' : 'linear-gradient(to top, #ef444488, #ef4444)', 
                                                        height: `${val}%`, 
                                                        borderRadius: '4px 4px 2px 2px', 
                                                        opacity: i === 6 ? 1 : 0.4, 
                                                        transition: 'all 0.5s ease-out',
                                                        boxShadow: i === 6 ? `0 0 15px ${val >= 85 ? '#10b98144' : '#ef444444'}` : 'none'
                                                    }}></div>
                                                    <div style={{ textAlign: 'center', fontSize: '0.5rem', color: '#64748b' }}>{['M','T','W','T','F','S','S'][i]}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 'bold' }}>QUICK ACTIONS</div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                EXPORT PDF
                                            </button>
                                            <button style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                                SEND TO EMAIL
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedMetricDetail.type === 'volumetric' && selectedMetricDetail.data && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                                    <div style={{ width: '120px', height: '120px', background: `radial-gradient(circle, ${selectedMetricDetail.data.color}33 0%, ${selectedMetricDetail.data.color}00 70%)`, border: `2px dashed ${selectedMetricDetail.data.color}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${selectedMetricDetail.data.color}40` }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: selectedMetricDetail.data.color }}>{selectedMetricDetail.data.size}</div>
                                    </div>
                                    
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>{selectedMetricDetail.data.percentage}%</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Of Total Production Today</div>
                                    </div>

                                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.25rem' }}>ESTIMATED BUNCH COUNT</div>
                                            <div style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 'bold' }}>{(selectedMetricDetail.data.count || 0).toLocaleString()} <span style={{fontSize:'0.65rem', fontWeight:'normal'}}>Bunches</span></div>
                                        </div>
                                        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)' }}></div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.25rem' }}>RECOMMENDED ACTION</div>
                                            <div style={{ fontSize: '0.85rem', color: selectedMetricDetail.data.color, fontWeight: 'bold' }}>
                                                {selectedMetricDetail.data.size === 'SMALL' ? 'Adjust Press Pressure' : selectedMetricDetail.data.size === 'LARGE' ? 'Increase Sterilization Time' : 'Optimal Settings'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedMetricDetail.type === 'confidence' && selectedMetricDetail.data && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>{selectedMetricDetail.data.avg}%</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Current Model Confidence Score</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.9rem', color: '#39FF14', fontWeight: 'bold' }}>{selectedMetricDetail.data.status}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>STABILITY INDEX</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h4 style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Inference Drift (Hourly)</h4>
                                        <div style={{ height: '60px', width: '100%', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {[0.1, -0.2, 0.3, -0.1, 0.2, -0.2].map((v, i) => (
                                                <div key={i} style={{ flex: 1, background: v > 0 ? '#10b981' : '#ef4444', height: `${Math.abs(v * 100)}%`, borderRadius: '2px', opacity: 0.6 }}></div>
                                            ))}
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.5' }}>
                                        AI models are currently operating within optimal parameters. No significant drift detected in last 6 hours. High confidence (&gt;95%) maintained across all classification types.
                                    </p>
                                </div>
                            )}

                            {selectedMetricDetail.type === 'rejection' && selectedMetricDetail.data && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>{selectedMetricDetail.data.avg}%</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Average Rejection Rate (7D)</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 'bold' }}>{selectedMetricDetail.data.trend}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>VS PREVIOUS WEEK</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#fca5a5', marginBottom: '0.25rem' }}>TOP REJECTION CAUSE</div>
                                            <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>UNRIPE FFB (68%)</div>
                                        </div>
                                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.25rem' }}>EST. REJECTION LOSS</div>
                                            <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>IDR 12.4M / DAY</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        <h4 style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.5rem' }}>ACTIONABLE INSIGHTS</h4>
                                        <ul style={{ fontSize: '0.65rem', color: '#cbd5e1', paddingLeft: '1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <li>Increased rejection on Thursday linked to Supplier [PT. Agro Lestari].</li>
                                            <li>Recommendation: Review harvesting protocol with supplier field team.</li>
                                            <li>AI Alert: Abnormal spike detected in 'Empty Bunches' at 13:45 today.</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showStreamSettings && createPortal(
                <div className="som-modal-overlay">
                    <div className="som-modal-content">
                        <div className="som-modal-header">
                            <h3>STREAM CONFIGURATION</h3>
                            <button className="som-close-modal" onClick={() => setShowStreamSettings(false)}>&times;</button>
                        </div>
                        <form onSubmit={saveSettings} className="som-modal-form">
                            <div className="som-toggle-group">
                                <span className="som-toggle-label">ACTIVATE LIVE STREAM</span>
                                <label className="som-switch">
                                    <input
                                        type="checkbox"
                                        checked={tempIsStreaming}
                                        onChange={(e) => setTempIsStreaming(e.target.checked)}
                                    />
                                    <span className="som-slider"></span>
                                </label>
                            </div>

                            <div className="som-form-group">
                                <label>CAMERA STREAM URL</label>
                                <input
                                    type="text"
                                    value={tempStreamUrl}
                                    onChange={(e) => setTempStreamUrl(e.target.value)}
                                    placeholder="rtsp://address:port/path"
                                />
                                <small>Enter the RTSP or HTTP stream address for the grading ramp camera.</small>
                            </div>
                            <div className="som-modal-actions">
                                <button type="button" className="som-btn-secondary" onClick={() => setShowStreamSettings(false)}>CANCEL</button>
                                <button type="submit" className="som-btn-primary">SAVE SETTINGS</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {selectedCapture && createPortal(
                <div className="som-modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="som-modal-content" style={{ maxWidth: '750px', width: '90%', padding: '1rem' }}>
                        <div className="som-modal-header" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#f8fafc' }}>CAPTURE DETAILS & OVERRIDE</h3>
                            <button className="som-close-modal" onClick={() => setSelectedCapture(null)}>&times;</button>
                        </div>
                        <div className="som-capture-detail-body" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div className="som-capture-img-wrapper" style={{ flex: 2, position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ background: 'transparent', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <img src={selectedCapture.image_url || PLACEHOLDER_GRADING_BG} alt="Capture High-Res" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }} />
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', color: '#64748b', fontWeight: '800' }}>QUICK ACTIONS</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <button 
                                            style={{ background: 'rgba(57, 255, 20, 0.1)', color: '#39FF14', border: '1px solid rgba(57, 255, 20, 0.2)', padding: '6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', cursor: 'pointer' }}
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = selectedCapture.image_url;
                                                link.download = `capture-${selectedCapture.id}.jpg`;
                                                link.click();
                                            }}
                                        >
                                            DOWNLOAD IMAGE
                                        </button>
                                        <button 
                                            style={{ background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '800', cursor: 'pointer' }}
                                            onClick={() => window.print()}
                                        >
                                            GENERATE PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="som-capture-info-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '4px' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#94a3b8' }}>METADATA</h4>
                                    <div style={{ fontSize: '0.65rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <span style={{ color: '#64748b' }}>Camera:</span> <span style={{ color: '#e2e8f0' }}>CAM-01</span>
                                        <span style={{ color: '#64748b' }}>Timestamp:</span> <span style={{ color: '#e2e8f0' }}>{selectedCapture.time}</span>
                                        <span style={{ color: '#64748b' }}>AI Conf:</span> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{selectedCapture.confidence}%</span>
                                        <span style={{ color: '#64748b' }}>Supplier:</span> <span style={{ color: '#e2e8f0' }}>TRK-1092</span>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '4px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#94a3b8' }}>MANUAL OVERRIDE</h4>
                                    <p style={{ fontSize: '0.55rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Incorrect classification? Update the class to retrain the AI.</p>
                                    <select
                                        className="som-grading-select"
                                        style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '4px' }}
                                        value={selectedCapture.type}
                                        onChange={(e) => handleCorrectType(selectedCapture.id, e.target.value)}
                                    >
                                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                    <div className="som-form-group" style={{ marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>REASON / NOTES</label>
                                        <textarea className="som-input" rows="2" placeholder="e.g., Hidden by shadow..." style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.5rem', borderRadius: '4px', resize: 'none', fontSize: '0.65rem' }}></textarea>
                                    </div>
                                    <button className="som-btn-primary" style={{ width: '100%', marginTop: 'auto', padding: '0.5rem', background: '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => {
                                        setSelectedCapture(null)
                                    }}>SAVE & FLAG FOR RETRAIN</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isCalendarOpen && createPortal(
                <div className="som-modal-overlay" onClick={() => setIsCalendarOpen(false)}>
                    <div className="som-modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', padding: '0' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Select Date Range</h3>
                            </div>
                            <button className="som-close-modal" onClick={() => setIsCalendarOpen(false)}>&times;</button>
                        </div>
                        
                        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Start Date</div>
                                <input 
                                    type="date" 
                                    value={customDates.start}
                                    onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}
                                />
                                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Select the starting point for your analysis report.</div>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>End Date</div>
                                <input 
                                    type="date" 
                                    value={customDates.end}
                                    onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}
                                />
                                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Select the end date. Max range is 31 days.</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => setIsCalendarOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>CANCEL</button>
                            <button 
                                onClick={() => {
                                    setSelectedDateRange('CUSTOM');
                                    setIsCalendarOpen(false);
                                }}
                                style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}
                            >
                                APPLY RANGE
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default GradingRampPage
