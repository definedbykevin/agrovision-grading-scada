import { useState } from 'react'
import './AlarmStyles.css'

function InstrumentErrorPage() {
    const [logs] = useState([
        { id: 1, time: '10:15:22', sensor: 'FT-201 (Flow)', issue: 'Signal Drift > 5% detected', status: 'Recalibration Required' },
        { id: 2, time: '09:45:10', sensor: 'PT-305 (Pressure)', issue: 'Out of range (0.2 mA) — Possible wire break', status: 'Critical Fail' },
    ])

    return (
        <div className="alm-spec-page inst-theme">
            <header className="alm-spec-header">
                <div className="alm-spec-title-group">
                    <div className="alm-spec-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                    </div>
                    <div>
                        <h1>In-Plant Instrumentation & Sensors</h1>
                        <p>Real-time sensor accuracy and field device health monitoring</p>
                    </div>
                </div>
            </header>

            <div className="alm-spec-dashboard">
                <div className="alm-spec-card inst-health">
                    <h3>Active Sensors Health</h3>
                    <div className="gauge-simple">
                        <div className="gauge-val">98.2<span>%</span></div>
                        <div className="gauge-lbl">System Accuracy</div>
                    </div>
                </div>
                <div className="alm-spec-card inst-alerts">
                    <h3>Calibration Due</h3>
                    <div className="inst-list">
                        <div className="inst-item warn"><span>TT-102 (Temp)</span> <strong>2 Days left</strong></div>
                        <div className="inst-item"><span>LT-401 (Level)</span> <strong>15 Days left</strong></div>
                    </div>
                </div>
                <div className="alm-spec-card inst-diagnostics">
                    <h3>Field Diagnostics</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--alm-text-sec)' }}>Scanning 124 loop devices... All loops stable except Loop 42 (Check PT-305).</p>
                </div>
            </div>

            <div className="alm-spec-log-section">
                <h3>Instrument Fault Log</h3>
                <div className="alm-spec-table-wrapper">
                    <table className="alm-spec-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Sensor ID</th>
                                <th>Diagnostic Issue</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.time}</td>
                                    <td className="mono">{log.sensor}</td>
                                    <td>{log.issue}</td>
                                    <td><span className={`badge-status ${log.status.toLowerCase().replace(/\s/g, '-')}`}>{log.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default InstrumentErrorPage
