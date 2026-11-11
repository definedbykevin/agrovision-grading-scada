import { useState } from 'react'
import './AlarmStyles.css'

function BreakdownPage() {
    const [logs] = useState([
        { id: 1, time: '12:00:00', machine: 'Screw Press #3', fault: 'Main Motor Overload Trip', downtime: '45m', status: 'In Repair' },
        { id: 2, time: '10:30:15', machine: 'Conveyor CV-01', fault: 'Belt Torn detected by Optic Sensor', downtime: '2h 10m', status: 'Awaiting Spare-part' },
    ])

    return (
        <div className="alm-spec-page brk-theme">
            <header className="alm-spec-header">
                <div className="alm-spec-title-group">
                    <div className="alm-spec-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                    </div>
                    <div>
                        <h1>Mechanical & Equipment Breakdown</h1>
                        <p>Downtime analytics and machinery health incidents</p>
                    </div>
                </div>
            </header>

            <div className="alm-spec-dashboard">
                <div className="alm-spec-card brk-downtime">
                    <h3>Total Downtime (Today)</h3>
                    <div className="downtime-val">02:55<span>h:m</span></div>
                    <div className="downtime-trend">↑ 12% vs Yesterday</div>
                </div>
                <div className="alm-spec-card brk-machines">
                    <h3>Maintenance Priority</h3>
                    <div className="maint-item alert"><span>Digester #1</span> (Bearing wear)</div>
                    <div className="maint-item"><span>Empty Bunch Press</span> (Scheduled oil change)</div>
                </div>
            </div>

            <div className="alm-spec-log-section">
                <h3>Breakdown Incident History</h3>
                <div className="alm-spec-table-wrapper">
                    <table className="alm-spec-table">
                        <thead>
                            <tr>
                                <th>Time Triggered</th>
                                <th>Equipment / Machine</th>
                                <th>Failure Description</th>
                                <th>Downtime</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.time}</td>
                                    <td className="bold">{log.machine}</td>
                                    <td>{log.fault}</td>
                                    <td className="mono">{log.downtime}</td>
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

export default BreakdownPage
