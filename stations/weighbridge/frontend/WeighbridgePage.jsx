import { useState, useEffect } from 'react'
import './WeighbridgePage.css'
import cctv1 from './assets/cctv1_weighbridge.png'
import cctv2 from './assets/cctv2_weighbridge.png'
import cctv3 from './assets/cctv3_weighbridge.png'
import cctv4 from './assets/cctv4_weighbridge.png'

const RECENT_TRANSACTIONS = [
    { id: 'WB-7821', truck: 'BK 9122 CJ', product: 'FFB (Fresh Fruit Bunch)', supplier: 'Estate Alpha', timeIn: '16:40', weightIn: 28450, weightOut: 8120, net: 20330 },
    { id: 'WB-7820', truck: 'BM 8831 AA', product: 'CPO (Crude Palm Oil)', supplier: 'Bulking Station', timeIn: '16:15', weightIn: 32100, weightOut: 11200, net: 20900 },
    { id: 'WB-7819', truck: 'BK 7722 BB', product: 'PK (Palm Kernel)', supplier: 'Kernel Plant', timeIn: '15:50', weightIn: 18400, weightOut: 6500, net: 11900 },
    { id: 'WB-7818', truck: 'BK 1124 AC', product: 'FFB (Fresh Fruit Bunch)', supplier: 'Independent Farmer 4', timeIn: '15:32', weightIn: 12400, weightOut: 4200, net: 8200 },
    { id: 'WB-7817', truck: 'BM 9921 ZA', product: 'FFB (Fresh Fruit Bunch)', supplier: 'Estate Bravo', timeIn: '15:10', weightIn: 29100, weightOut: 8350, net: 20750 },
]

// ── Helper: format Date → "DD/MM/YYYY HH:MM:SS" ──
function formatTimestamp(date) {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    const HH = String(date.getHours()).padStart(2, '0')
    const MM = String(date.getMinutes()).padStart(2, '0')
    const SS = String(date.getSeconds()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${HH}:${MM}:${SS}`
}

function WeighbridgePage() {
    const [currentWeight, setCurrentWeight] = useState(24560)
    const [isStable, setIsStable] = useState(true)
    const [timestamp, setTimestamp] = useState(formatTimestamp(new Date()))  // ← realtime

    // Realtime clock — update setiap detik
    useEffect(() => {
        const clockInterval = setInterval(() => {
            setTimestamp(formatTimestamp(new Date()))
        }, 1000)
        return () => clearInterval(clockInterval)
    }, [])

    // Simulate fluctuating weight if not stable
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isStable) {
                setCurrentWeight(prev => prev + Math.floor(Math.random() * 20 - 10))
            }
        }, 100)
        return () => clearInterval(interval)
    }, [isStable])

    const stats = {
        waitingOutside: 20,
        weighing: 4,
        grading: 8,
        ffbReceived: 234,
        cpoDispatched: 120,
        pkDispatched: 40,
        pksDispatched: 80
    }

    const weights = {
        out: 12340,
        cam2Out: 14500
    }

    return (
        <div className="som-weighbridge-page">
            <header className="som-wb-header">
                <div className="som-header-left">
                    <h1 className="som-wb-title">WEIGHBRIDGE STATION</h1>
                    <div className="som-wb-status">
                        <span className="dot stable"></span> SYSTEM ONLINE
                    </div>
                </div>
                <div className="som-wb-stats-top">
                    <div className="top-stat">
                        <span className="label">DAILY TOTAL (TBS)</span>
                        <span className="value">1,240.42 <small>TONS</small></span>
                    </div>
                    <div className="top-stat">
                        <span className="label">TRUCKS TODAY</span>
                        <span className="value">64 <small>UNITS</small></span>
                    </div>
                </div>
            </header>

            <div className="som-wb-content">
                <aside className="som-wb-sidebar">
                    <div className="sidebar-section">
                        <h2 className="sidebar-title">WEIGHBRIDGE PERFORMANCE</h2>
                        <div className="stats-groups-container">

                            {/* ── LOGISTICS FLOW ── */}
                            <div className="stats-subheader">LOGISTICS FLOW</div>
                            <div className="stats-group logistics-group">
                                <div className="stat-row logistics-row waiting">
                                    <span className="stat-label">WAITING</span>
                                    <span className="stat-value highlight">
                                        {stats.waitingOutside} <small>TRUCKS</small>
                                    </span>
                                </div>
                                <div className="stat-row logistics-row weighing">
                                    <span className="stat-label">WEIGHING</span>
                                    <span className="stat-value weighing-val">
                                        {stats.weighing} <small>TRUCKS</small>
                                    </span>
                                </div>
                                <div className="stat-row logistics-row grading">
                                    <span className="stat-label">GRADING</span>
                                    <span className="stat-value grading-val">
                                        {stats.grading} <small>TRUCKS</small>
                                    </span>
                                </div>
                            </div>

                            {/* ── DAILY THROUGHPUT ── */}
                            <div className="stats-subheader">DAILY THROUGHPUT</div>
                            <div className="stats-group throughput-group">
                                <div className="stat-row">
                                    <span className="stat-label">FFB RECEIVED</span>
                                    <span className="stat-value">
                                        {stats.ffbReceived} <small>MT</small>
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">CPO DISPATCH</span>
                                    <span className="stat-value">
                                        {stats.cpoDispatched} <small>MT</small>
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">PK DISPATCH</span>
                                    <span className="stat-value">
                                        {stats.pkDispatched} <small>MT</small>
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">PKS DISPATCH</span>
                                    <span className="stat-value">
                                        {stats.pksDispatched} <small>MT</small>
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="sidebar-section weight-indicators">
                        <div className="weight-scales-container">
                            <div className="weight-scale-header">
                                <span className="weight-scale-title">SCALE 1</span>
                                <span className={`status-dot ${isStable ? 'stable' : 'unstable'}`}></span>
                            </div>

                            <div className="weight-box in">
                                <div className="weight-truck-label">
                                    Truck Number: <span className="weight-truck-number">BK 9122 CJ</span>
                                </div>
                                <div className="weight-value">
                                    {currentWeight.toLocaleString('en-US', { minimumFractionDigits: 0 })} <span className="unit">KG</span>
                                </div>
                                <div className="weight-sublabel">WEIGH IN</div>
                            </div>

                            <div className="weight-box out">
                                <div className="weight-truck-label">
                                    Truck Number: <span className="weight-truck-number">BM 4451 XP</span>
                                </div>
                                <div className="weight-value">
                                    {weights.out.toLocaleString('en-US', { minimumFractionDigits: 0 })} <span className="unit">KG</span>
                                </div>
                                <div className="weight-sublabel">WEIGH OUT</div>
                            </div>

                            {/* ── SCALE 2 ── */}
                            <div className="weight-scale-header" style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px dashed #e2e8f0' }}>
                                <span className="weight-scale-title">SCALE 2</span>
                                <span className="status-dot stable" style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}></span>
                            </div>

                            <div className="weight-box in">
                                <div className="weight-truck-label">
                                    Truck Number: <span className="weight-truck-number">BM 8831 AA</span>
                                </div>
                                <div className="weight-value" style={{ color: '#10b981' }}>
                                    14,500 <span className="unit">KG</span>
                                </div>
                                <div className="weight-sublabel">WEIGH IN</div>
                            </div>

                            <div className="weight-box out">
                                <div className="weight-truck-label">
                                    Truck Number: <span className="weight-truck-number">BK 7702 MQ</span>
                                </div>
                                <div className="weight-value">
                                    {weights.cam2Out.toLocaleString()} <span className="unit">KG</span>
                                </div>
                                <div className="weight-sublabel">WEIGH OUT</div>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="som-wb-cctv-grid">
                    {/* CAM 1 - Top Left */}
                    <div className="som-bridge-cctv">
                        <div className="cctv-feed-container">
                            <div className="cctv-label-overlay">CAM 1</div>
                            <div className="cctv-top-right-overlay">
                                <div className="cctv-timestamps">{timestamp}</div>   {/* ← realtime */}
                                <div className="cctv-status-rec">●REC</div>
                            </div>
                            <div className="cctv-scanline"></div>
                            <img src={cctv1} alt="CCTV 1" className="cctv-img" />
                            <div className="cctv-data-overlay">
                                WEIGH-IN: {currentWeight.toLocaleString()} KG
                            </div>
                        </div>
                    </div>

                    {/* CAM 2 - Top Right */}
                    <div className="som-bridge-cctv">
                        <div className="cctv-feed-container">
                            <div className="cctv-label-overlay">CAM 2</div>
                            <div className="cctv-top-right-overlay">
                                <div className="cctv-timestamps">{timestamp}</div>   {/* ← realtime */}
                                <div className="cctv-status-rec">●REC</div>
                            </div>
                            <div className="cctv-scanline"></div>
                            <img src={cctv2} alt="CCTV 2" className="cctv-img" />
                            <div className="cctv-data-overlay">
                                WEIGH-OUT: {weights.out.toLocaleString()} KG
                            </div>
                        </div>
                    </div>

                    {/* Operator View - Bottom Left */}
                    <div className="som-bridge-cctv">
                        <div className="cctv-feed-container">
                            <div className="cctv-label-overlay">CAM 3</div>
                            <div className="cctv-top-right-overlay">
                                <div className="cctv-timestamps">{timestamp}</div>   {/* ← realtime */}
                                <div className="cctv-status-rec">●REC</div>
                            </div>
                            <div className="cctv-scanline"></div>
                            <img src={cctv3} alt="CCTV 3" className="cctv-img" />
                            <div className="cctv-data-overlay">
                                WEIGH-OUT: {weights.out.toLocaleString()} KG
                            </div>
                        </div>
                    </div>

                    {/* CAM 4 - Bottom Right */}
                    <div className="som-bridge-cctv">
                        <div className="cctv-feed-container">
                            <div className="cctv-label-overlay">CAM 4</div>
                            <div className="cctv-top-right-overlay">
                                <div className="cctv-timestamps">{timestamp}</div>   {/* ← realtime */}
                                <div className="cctv-status-rec">●REC</div>
                            </div>
                            <div className="cctv-scanline"></div>
                            <img src={cctv4} alt="CCTV 4" className="cctv-img" />
                            <div className="cctv-data-overlay">
                                WEIGH-OUT: {weights.out.toLocaleString()} KG
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    )
}

export default WeighbridgePage