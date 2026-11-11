import { useState } from 'react'
import './AlarmStyles.css'

function ProcessDisturbancePage() {
    const [logs] = useState([
        { id: 1, time: '11:30:00', parameter: 'CPO Moisture', val: '0.45%', limit: '< 0.25%', severity: 'Critical' },
        { id: 2, time: '10:05:44', parameter: 'Kernel FFA', val: '6.2%', limit: '< 5.0%', severity: 'Warning' },
    ])

    return (
        <div className="alm-spec-page proc-theme">
            <header className="alm-spec-header">
                <div className="alm-spec-title-group">
                    <div className="alm-spec-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <div>
                        <h1>Process Stability & Quality Anomaly</h1>
                        <p>Production parameter deviations and quality specification alerts</p>
                    </div>
                </div>
            </header>

            <div className="alm-spec-dashboard">
                <div className="alm-spec-card proc-stability">
                    <h3>Overall Mill Stability</h3>
                    <div className="stability-meter">
                        <div className="meter-bg">
                            <div className="meter-fill" style={{ width: '84%', background: '#22c55e' }}></div>
                        </div>
                        <span>84.0%</span>
                    </div>
                </div>
                <div className="alm-spec-card proc-key-metrics">
                    <h3>Quality Outliers</h3>
                    <div className="metric-row warn"><span>Oil Loss (Sludge)</span> <strong>2.1%</strong></div>
                    <div className="metric-row ok"><span>Kernel Loss</span> <strong>0.8%</strong></div>
                </div>
            </div>

            <div className="alm-spec-log-section">
                <h3>Process Disturbance Logs</h3>
                <div className="alm-spec-table-wrapper">
                    <table className="alm-spec-table">
                        <thead>
                            <tr>
                                <th>Detected Time</th>
                                <th>Parameter</th>
                                <th>Current Value</th>
                                <th>Standard Limit</th>
                                <th>Severity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.time}</td>
                                    <td className="bold">{log.parameter}</td>
                                    <td className="mono">{log.val}</td>
                                    <td className="mono">{log.limit}</td>
                                    <td><span className={`badge-sev ${log.severity.toLowerCase()}`}>{log.severity}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default ProcessDisturbancePage
