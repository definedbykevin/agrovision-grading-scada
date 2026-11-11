import React, { useState } from 'react'
import './MillStabilityPage.css'

const STABILITY_DATA = [
    { id: 1, station: 'STERILIZATION 1', temp_stable: 98.2, press_stable: 95.5, throughput: 92.0, overall: 95.2, trend: 'UP' },
    { id: 2, station: 'STERILIZATION 2', temp_stable: 94.5, press_stable: 92.1, throughput: 88.5, overall: 91.7, trend: 'DOWN' },
    { id: 3, station: 'THRESHING UNIT', temp_stable: 99.0, press_stable: 100, throughput: 96.4, overall: 98.4, trend: 'STABLE' },
    { id: 4, station: 'DIGEST & PRESS 1', temp_stable: 88.5, press_stable: 85.0, throughput: 82.2, overall: 85.2, trend: 'DOWN' },
    { id: 5, station: 'DIGEST & PRESS 2', temp_stable: 96.8, press_stable: 94.0, throughput: 93.5, overall: 94.7, trend: 'UP' },
    { id: 6, station: 'CLARIFICATION', temp_stable: 92.4, press_stable: 98.2, throughput: 89.0, overall: 93.2, trend: 'STABLE' },
    { id: 7, station: 'KERNEL PLANT', temp_stable: 97.5, press_stable: 99.1, throughput: 95.8, overall: 97.4, trend: 'UP' },
    { id: 8, station: 'STEAM BOILER', temp_stable: 91.0, press_stable: 89.5, throughput: 94.2, overall: 91.5, trend: 'DOWN' },
]

const MillStabilityPage = () => {

    const [filter, setFilter] = useState('')

    const filteredData = STABILITY_DATA.filter(item =>
        item.station.toLowerCase().includes(filter.toLowerCase())
    )

    const getMeterColor = (val) => {
        if (val >= 95) return 'stable-green'
        if (val >= 85) return 'stable-yellow'
        return 'stable-red'
    }

    const getTrendIcon = (t) => {
        if (t === 'UP') return <span style={{ color: '#10b981' }}>▲</span>
        if (t === 'DOWN') return <span style={{ color: '#ef4444' }}>▼</span>
        return <span style={{ color: '#94a3b8' }}>━</span>
    }

    return (
        <div className="stability-container">
            {/* Header */}
            <div className="scada-report-header">
                <div className="scada-report-title">
                    <h1>MSR - MILL STABILITY REPORT</h1>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="FILTER_STATION..."
                        style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#000000',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            fontFamily: 'inherit',
                            outline: 'none',
                            borderRadius: '4px'
                        }}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <button className="btn-scada-action">EXPORT_STABILITY_LOG</button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="scada-stats-strip">
                <div className="scada-stat-node">
                    <label>TOTAL_STABLE_ZONE</label>
                    <span className="val" style={{ color: '#059669' }}>82.5%</span>
                </div>
                <div className="scada-stat-node">
                    <label>CRITICAL_FLUCTUATION</label>
                    <span className="val" style={{ color: '#ef4444' }}>01 STATION</span>
                </div>
                <div className="scada-stat-node">
                    <label>AVG_STABILITY_INDEX</label>
                    <span className="val">93.4 / 100</span>
                </div>
                <div className="scada-stat-node" style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <label>DATA_REF_PERIOD</label>
                    <span className="val" style={{ color: '#000000', fontSize: '1rem' }}>{new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Grid Area */}
            <div className="table-scroll-area">
                <table className="stability-grid">
                    <thead>
                        <tr>
                            <th>STATION_ID</th>
                            <th>TEMP_STABILITY</th>
                            <th>PRESS_STABILITY</th>
                            <th>THROUGHPUT_CONSISTENCY</th>
                            <th>OVERALL_INDEX</th>
                            <th>TREND</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={item.id}>
                                <td style={{ fontWeight: '800' }}>{item.station}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="stability-meter">
                                            <div className={`stability-fill ${getMeterColor(item.temp_stable)}`} style={{ width: `${item.temp_stable}%` }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem' }}>{item.temp_stable}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="stability-meter">
                                            <div className={`stability-fill ${getMeterColor(item.press_stable)}`} style={{ width: `${item.press_stable}%` }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem' }}>{item.press_stable}%</span>
                                    </div>
                                </td>
                                <td style={{ color: '#1d4ed8', fontWeight: 'bold' }}>{item.throughput}%</td>
                                <td style={{ fontSize: '1rem', fontWeight: '900', color: '#166534' }}>{item.overall}%</td>
                                <td style={{ fontSize: '1.2rem' }}>{getTrendIcon(item.trend)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div style={{
                padding: '8px 24px',
                background: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                color: '#64748b'
            }}>
                <span>COMPUTATION: STABILITY_ALGO_v2.4</span>
                <span>© 2026 PEI SMART SOLUTION - MILL PERFORMANCE OPS</span>
            </div>
        </div>
    )
}

export default MillStabilityPage
