import { useState, useEffect } from 'react'
import './AlarmStyles.css'

function PowerErrorPage({ user }) {
    const [logs, setLogs] = useState([
        { id: 1, time: '14:20:05', code: 'PWR-001', desc: 'Voltage Sag detected on Main Incomer (L1-L2)', status: 'Active', severity: 'Critical' },
        { id: 2, time: '13:45:12', code: 'PWR-042', desc: 'Power Factor dropped below 0.85 — Capacitor Bank 2 check', status: 'Resolved', severity: 'Warning' },
        { id: 3, time: '11:10:33', code: 'PWR-105', desc: 'UPS Battery Temp High — Cooling system verification', status: 'Acknowledged', severity: 'Warning' },
    ])

    return (
        <div className="alm-spec-page power-theme">
            <header className="alm-spec-header">
                <div className="alm-spec-title-group">
                    <div className="alm-spec-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    </div>
                    <div>
                        <h1>Power Infrastructure Monitoring</h1>
                        <p>Electrical grid stability and substation telemetry</p>
                    </div>
                </div>
                <div className="alm-spec-actions">
                    <button className="alm-spec-btn-primary">SYNC TELEMETRY</button>
                </div>
            </header>

            <div className="alm-spec-dashboard">
                {/* Real-time Voltages */}
                <div className="alm-spec-card pwr-monitor">
                    <h3>Phase Voltages (VAC)</h3>
                    <div className="pwr-volt-grid">
                        <div className="volt-item">
                            <span className="v-label">L1-N</span>
                            <span className="v-val">231.4</span>
                            <div className="v-bar"><div className="v-fill" style={{ width: '95%' }}></div></div>
                        </div>
                        <div className="volt-item">
                            <span className="v-label">L2-N</span>
                            <span className="v-val">229.8</span>
                            <div className="v-bar"><div className="v-fill" style={{ width: '94%' }}></div></div>
                        </div>
                        <div className="volt-item">
                            <span className="v-label">L3-N</span>
                            <span className="v-val">230.2</span>
                            <div className="v-bar"><div className="v-fill" style={{ width: '95%' }}></div></div>
                        </div>
                    </div>
                </div>

                {/* Load Distribution */}
                <div className="alm-spec-card pwr-load">
                    <h3>Current Load Distribution</h3>
                    <div className="pwr-gauge-container">
                        <div className="pwr-gauge">
                            <svg viewBox="0 0 36 36" className="circular-chart">
                                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="circle" strokeDasharray="72, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <text x="18" y="20.35" className="percentage">72%</text>
                            </svg>
                            <span>Total Load</span>
                        </div>
                        <div className="pwr-stats">
                            <div className="p-stat"><span>Frequency</span><strong>50.02 Hz</strong></div>
                            <div className="p-stat"><span>Power Factor</span><strong>0.92</strong></div>
                        </div>
                    </div>
                </div>

                {/* Status Mini Cards */}
                <div className="alm-spec-card pwr-status">
                    <h3>Grid Status</h3>
                    <div className="grid-status-list">
                        <div className="status-item ok"><span>Main Line</span><span className="dot"></span> ONLINE</div>
                        <div className="status-item warn"><span>Genset Standby</span><span className="dot"></span> READY</div>
                        <div className="status-item ok"><span>UPS Bank</span><span className="dot"></span> HEALTHY</div>
                    </div>
                </div>
            </div>

            <div className="alm-spec-log-section">
                <h3>Power Fault Logs</h3>
                <div className="alm-spec-table-wrapper">
                    <table className="alm-spec-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Event Code</th>
                                <th>Technical Description</th>
                                <th>Status</th>
                                <th>Severity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.time}</td>
                                    <td className="mono">{log.code}</td>
                                    <td>{log.desc}</td>
                                    <td><span className={`badge-status ${log.status.toLowerCase()}`}>{log.status}</span></td>
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

export default PowerErrorPage
