import React, { useState } from 'react'
import './DailyAbnormalitiesPage.css'

const ABNORMALITIES_DATA = [
    { id: 'ANM-001', time: '08:45', station: 'STERILIZER 2', param: 'Pressure', desc: 'Sudden pressure drop below 1.5 bar', severity: 'HIGH', status: 'RESOLVED' },
    { id: 'ANM-002', time: '09:12', station: 'THRESHER', param: 'Motor Load', desc: 'Intermittent high load detected (35A+)', severity: 'MED', status: 'MONITORING' },
    { id: 'ANM-003', time: '10:30', station: 'BOILER 1', param: 'Water Level', desc: 'Low water level alarm trigger', severity: 'HIGH', status: 'RESOLVED' },
    { id: 'ANM-004', time: '11:05', station: 'CLARIFICATION', param: 'Temperature', desc: 'Temperature fluctuation in oil tank', severity: 'LOW', status: 'OPEN' },
    { id: 'ANM-005', time: '13:20', station: 'PRESS 1', param: 'Vibration', desc: 'Higher than normal vibration detected', severity: 'MED', status: 'OPEN' },
    { id: 'ANM-006', time: '14:45', station: 'TURBINE', param: 'RPM', desc: 'Frequency deviation outside +/- 0.5Hz', severity: 'HIGH', status: 'RESOLVED' },
    { id: 'ANM-007', time: '15:10', station: 'KERNEL PLANT', param: 'Blower', desc: 'Drive belt slip detected (sensor feedback)', severity: 'LOW', status: 'MONITORING' },
]

const DailyAbnormalitiesPage = () => {

    const [filter, setFilter] = useState('')

    const filteredData = ABNORMALITIES_DATA.filter(item =>
        item.station.toLowerCase().includes(filter.toLowerCase()) ||
        item.desc.toLowerCase().includes(filter.toLowerCase())
    )

    const getSevClass = (s) => {
        if (s === 'HIGH') return 'sev-high'
        if (s === 'MED') return 'sev-med'
        return 'sev-low'
    }

    return (
        <div className="abnormalities-container">
            {/* Header */}
            <div className="scada-report-header">
                <div className="scada-report-title">
                    <h1>DAR - DAILY ABNORMALITIES REPORT</h1>
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
                    <button className="btn-scada-action">GENERATE_PDF</button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="scada-stats-strip">
                <div className="scada-stat-node">
                    <label>TOTAL_INCIDENTS</label>
                    <span className="val">{ABNORMALITIES_DATA.length} UNITS</span>
                </div>
                <div className="scada-stat-node">
                    <label>UNRESOLVED</label>
                    <span className="val" style={{ color: '#ef4444' }}>02 OPEN</span>
                </div>
                <div className="scada-stat-node">
                    <label>RELIABILITY_INDEX</label>
                    <span className="val" style={{ color: '#059669' }}>94.2%</span>
                </div>
                <div className="scada-stat-node" style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <label>TIMESTAMP_LOG</label>
                    <span className="val" style={{ color: '#000000', fontSize: '1rem' }}>{new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Grid Area */}
            <div className="table-scroll-area">
                <table className="abnormality-grid">
                    <thead>
                        <tr>
                            <th>REF_ID</th>
                            <th>TIME</th>
                            <th>STATION_SOURCE</th>
                            <th>PARAMETER</th>
                            <th>INCIDENT_LOG_DESCRIPTION</th>
                            <th>SEVERITY</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={item.id}>
                                <td style={{ fontWeight: 'bold' }}>{item.id}</td>
                                <td>{item.time}</td>
                                <td style={{ color: '#3b82f6', fontWeight: 800 }}>{item.station}</td>
                                <td>{item.param}</td>
                                <td style={{ opacity: 0.9, fontSize: '0.8rem' }}>{item.desc}</td>
                                <td>
                                    <span className={`sev-badge ${getSevClass(item.severity)}`}>
                                        {item.severity}
                                    </span>
                                </td>
                                <td className={`status-text ${item.status === 'RESOLVED' ? 'status-resolved' : 'status-open'}`}>
                                    {item.status}
                                </td>
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
                <span>ANALYSIS_SOURCE: PLC_EVENT_LOG_V2</span>
                <span>© 2026 PEI SMART SOLUTION - ABNORMALITY TRACKING</span>
            </div>
        </div>
    )
}

export default DailyAbnormalitiesPage
