import React, { useState } from 'react'
import './RunningHoursPage.css'

const EQUIPMENT_DATA = [
    { id: 1, name: 'STERILIZER LINE 1', status: 'RUNNING', today: 12.5, monthly: 342.1, total: 12450.5, limit: 15000 },
    { id: 2, name: 'STERILIZER LINE 2', status: 'STOP', today: 0.0, monthly: 298.4, total: 11820.2, limit: 15000 },
    { id: 3, name: 'THRESHER DRUM V-201', status: 'RUNNING', today: 14.2, monthly: 410.5, total: 8900.4, limit: 10000 },
    { id: 4, name: 'DIGESTER PRESS UNIT 1', status: 'RUNNING', today: 11.8, monthly: 322.0, total: 9245.8, limit: 12000 },
    { id: 5, name: 'DIGESTER PRESS UNIT 2', status: 'RUNNING', today: 12.2, monthly: 355.6, total: 9540.1, limit: 12000 },
    { id: 6, name: 'CLARIFIER PUMP P-401', status: 'STOP', today: 0.0, monthly: 145.2, total: 4520.6, limit: 8000 },
    { id: 7, name: 'STEAM BOILER B-101', status: 'RUNNING', today: 24.0, monthly: 720.0, total: 45600.8, limit: 50000 },
    { id: 8, name: 'POWER TURBINE TG-01', status: 'RUNNING', today: 24.0, monthly: 715.4, total: 42100.2, limit: 45000 },
    { id: 9, name: 'KERNEL SILO FAN F-501', status: 'RUNNING', today: 24.0, monthly: 698.2, total: 15400.5, limit: 20000 },
]

const RunningHoursPage = () => {

    const [filter, setFilter] = useState('')

    const filteredData = EQUIPMENT_DATA.filter(item =>
        item.name.toLowerCase().includes(filter.toLowerCase())
    )

    const totalHoursToday = filteredData.reduce((acc, curr) => acc + curr.today, 0)
    const activeMachines = filteredData.filter(m => m.status === 'RUNNING').length

    return (
        <div className="running-hours-container">
            {/* SCADA KPI STRIP */}
            <div className="scada-report-header">
                <div className="scada-report-title">
                    <h1>MHM - MACHINE RUNNING HOURS MONITOR</h1>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="SEARCH_TAG..."
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
                    <button className="btn-scada-export">EXPORT CSV/PDF</button>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>SYSTEM_OP_v8.1</div>
                </div>
            </div>

            {/* QUICK STATS STRIP */}
            <div className="scada-stats-strip">
                <div className="scada-stat-node">
                    <label>TOTAL_UPTIME_DAY</label>
                    <span className="val">{totalHoursToday.toFixed(1)} HRS</span>
                </div>
                <div className="scada-stat-node">
                    <label>ACTIVE_UNITS</label>
                    <span className="val" style={{ color: '#3b82f6' }}>{activeMachines}/{filteredData.length}</span>
                </div>
                <div className="scada-stat-node">
                    <label>MAINTENANCE_DUE</label>
                    <span className="val" style={{ color: '#ef4444' }}>02 UNITS</span>
                </div>
                <div className="scada-stat-node" style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <label>REF_TIME</label>
                    <span className="val" style={{ color: '#000000', fontSize: '1rem' }}>{new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* DATA GRID */}
            <div className="scada-table-wrapper">
                <table className="scada-grid-table">
                    <thead>
                        <tr>
                            <th>TAG_IDENTIFIER</th>
                            <th>OPS_STATUS</th>
                            <th>TODAY (H)</th>
                            <th>MONTHLY (H)</th>
                            <th>ACCUMULATED (H)</th>
                            <th>SERVICE_LIFE_MONITOR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => {
                            const prog = (item.total % item.limit) / item.limit * 100
                            return (
                                <tr key={item.id}>
                                    <td className="scada-tag-name">{item.name}</td>
                                    <td>
                                        <span className={`scada-pill ${item.status.toLowerCase()}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td style={{ color: '#166534', fontWeight: 'bold' }}>{item.today.toFixed(1)}</td>
                                    <td style={{ opacity: 0.8 }}>{item.monthly.toFixed(1)}</td>
                                    <td style={{ color: '#1d4ed8', fontWeight: 800 }}>{item.total.toLocaleString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div className="scada-gauge-track">
                                                <div
                                                    className={`scada-gauge-bar ${prog > 90 ? 'critical' : ''}`}
                                                    style={{ width: `${prog}%` }}
                                                ></div>
                                            </div>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: prog > 90 ? '#ef4444' : 'inherit' }}>
                                                {prog.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* INDUSTRIAL FOOTER */}
            <div style={{
                padding: '8px 24px',
                background: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                color: '#64748b'
            }}>
                <span>DATA_SOURCE: PLC_S7_1500_NODE_01</span>
                <span>© 2026 PEI SMART SOLUTION - TOTAL ASSET MONITORING</span>
            </div>
        </div>
    )
}

export default RunningHoursPage
