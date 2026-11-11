import { useState } from 'react'
import './AlarmStyles.css'

function InternetErrorPage() {
    const [logs] = useState([
        { id: 1, time: '16:05:22', route: 'ISP-Main -> Gateway', event: 'High packet loss detected (18%)', status: 'Investigation' },
        { id: 2, time: '14:30:11', route: 'VPN-Tunnel-7', event: 'Handshake timeout — Remote site offline', status: 'Disruption' },
    ])

    return (
        <div className="alm-spec-page net-theme">
            <header className="alm-spec-header">
                <div className="alm-spec-title-group">
                    <div className="alm-spec-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
                    </div>
                    <div>
                        <h1>Network Connectivity Control</h1>
                        <p>External uplink and inter-site VPN tunnel management</p>
                    </div>
                </div>
            </header>

            <div className="alm-spec-dashboard">
                {/* Connection Map Simulation */}
                <div className="alm-spec-card net-map">
                    <h3>Link Topology Status</h3>
                    <div className="net-nodes">
                        <div className="node active">Cloud ERP</div>
                        <div className="net-line active"></div>
                        <div className="node master">Plant Gateway</div>
                        <div className="net-line warn"></div>
                        <div className="node alert">Remote Client</div>
                    </div>
                </div>

                {/* Latency Monitor */}
                <div className="alm-spec-card net-latency">
                    <h3>Real-time Latency (RTT)</h3>
                    <div className="latency-grid">
                        <div className="lat-box">
                            <span className="l-val">28ms</span>
                            <span className="l-lbl">Google DNS</span>
                        </div>
                        <div className="lat-box">
                            <span className="l-val warn">452ms</span>
                            <span className="l-lbl">Primary ISP</span>
                        </div>
                    </div>
                </div>

                {/* Bandwidth Usage */}
                <div className="alm-spec-card net-usage">
                    <h3>Bandwidth Performance</h3>
                    <div className="net-bw">
                        <div className="bw-flow">
                            <div className="bw-up"><span>UP</span> <strong>12.4 Mbps</strong></div>
                            <div className="bw-down"><span>DOWN</span> <strong>88.2 Mbps</strong></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="alm-spec-log-section">
                <h3>Network Disruption Logs</h3>
                <div className="alm-spec-table-wrapper">
                    <table className="alm-spec-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Involved Route</th>
                                <th>Connectivity Event</th>
                                <th>Current Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.time}</td>
                                    <td className="route-cell">{log.route}</td>
                                    <td>{log.event}</td>
                                    <td><span className={`badge-net ${log.status.toLowerCase()}`}>{log.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default InternetErrorPage
