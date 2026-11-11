import { useState } from 'react'
import './AlarmStyles.css'

function SystemErrorPage() {
    const [logs] = useState([
        { id: 1, time: '15:12:44', source: 'DB-Cluster-01', desc: 'Deadlock detected in production transactions', level: 'Error' },
        { id: 2, time: '14:55:01', source: 'API-Gateway', desc: 'Auth middleware timeout exceeded (5000ms)', level: 'Critical' },
        { id: 3, time: '14:20:10', source: 'Process-Engine', desc: 'Memory leak suspected in tag calculation worker', level: 'Warning' },
    ])

    return (
        <div className="alm-spec-page system-theme">
            <header className="alm-spec-header">
                <div className="alm-spec-title-group">
                    <div className="alm-spec-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6" y2="6" /><line x1="6" y1="18" x2="6" y2="18" /></svg>
                    </div>
                    <div>
                        <h1>Central Processing & System Integrity</h1>
                        <p>Application server health and database synchronization monitoring</p>
                    </div>
                </div>
            </header>

            <div className="alm-spec-dashboard">
                {/* Computing Resources */}
                <div className="alm-spec-card sys-resources">
                    <h3>Compute Allocation</h3>
                    <div className="sys-res-bars">
                        <div className="res-row">
                            <label>CPU Usage</label>
                            <div className="res-bar"><div className="res-fill" style={{ width: '24%' }}></div></div>
                            <span>24%</span>
                        </div>
                        <div className="res-row">
                            <label>RAM (8/32GB)</label>
                            <div className="res-bar"><div className="res-fill warn" style={{ width: '78%' }}></div></div>
                            <span>78%</span>
                        </div>
                        <div className="res-row">
                            <label>Disk I/O</label>
                            <div className="res-bar"><div className="res-fill" style={{ width: '12%' }}></div></div>
                            <span>12%</span>
                        </div>
                    </div>
                </div>

                {/* Microservices Status */}
                <div className="alm-spec-card sys-services">
                    <h3>Microservices Integrity</h3>
                    <div className="sys-svc-grid">
                        <div className="svc-box ok"><span>Auth Service</span> <strong>UP</strong></div>
                        <div className="svc-box ok"><span>MQTT Broker</span> <strong>UP</strong></div>
                        <div className="svc-box err"><span>Worker Node 2</span> <strong>DOWN</strong></div>
                        <div className="svc-box ok"><span>Storage API</span> <strong>UP</strong></div>
                    </div>
                </div>

                {/* Recent Error Stack */}
                <div className="alm-spec-card sys-stack">
                    <h3>Recent Exception Stack</h3>
                    <div className="code-display">
                        <code>[ERROR] 15:12:44 - ER_LOCK_DEADLOCK: Deadlock found when trying to get lock; try restarting transaction</code>
                        <code>[WARN] 14:20:10 - HEAP_MEM: Allocation failed - process out of memory</code>
                    </div>
                </div>
            </div>

            <div className="alm-spec-log-section">
                <h3>System Exception Audit</h3>
                <div className="alm-spec-table-wrapper">
                    <table className="alm-spec-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Source Component</th>
                                <th>Exception Message</th>
                                <th>Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.time}</td>
                                    <td><span className="source-pill">{log.source}</span></td>
                                    <td className="msg">{log.desc}</td>
                                    <td><span className={`badge-lvl ${log.level.toLowerCase()}`}>{log.level}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default SystemErrorPage
