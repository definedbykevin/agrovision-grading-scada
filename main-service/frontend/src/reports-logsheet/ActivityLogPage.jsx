import { useState, useEffect } from 'react'
import './ActivityLogPage.css'

function ActivityLogPage({ type, user }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const endpoint = type === 'User Login' ? '/api/activity/login' : '/api/activity/settings'
    const title = type === 'User Login' ? 'User Login Audit' : 'Settings Changes Audit'

    useEffect(() => {
        fetchLogs()
    }, [type])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('kip_token');
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Failed to fetch logs')
            const result = await response.json()
            if (result.success) {
                setLogs(result.data || [])
            } else {
                throw new Error(result.error || 'Failed to fetch logs')
            }
            setError(null)
        } catch (err) {
            setError(err.message)
        } finally {
            // Small delay for smooth transition
            setTimeout(() => setLoading(false), 400)
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const getBadgeClass = (activityType) => {
        if (activityType === 'login') return 'som-badge-login'
        if (activityType === 'setting_change') return 'som-badge-setting-change'
        return ''
    }

    const getActivityIcon = (activityType) => {
        if (activityType === 'login') {
            return (
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
            )
        }
        return (
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        )
    }

    return (
        <div className="som-activity-log-page">
            <div className="som-log-header">
                <div className="som-log-title-area">
                    <h3>{title}</h3>
                    <p className="som-log-subtitle">
                        {type === 'User Login'
                            ? 'Monitoring comprehensive user access records across the refinery network'
                            : 'Verifying real-time instrumentation and control changes for process integrity'}
                    </p>
                </div>
                <button className="som-btn-refresh" onClick={fetchLogs} disabled={loading}>
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'som-spin' : ''}>
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    {loading ? 'Fetching...' : 'Refresh Logs'}
                </button>
            </div>

            <div className="som-log-container">
                {loading ? (
                    <div className="som-log-loading">
                        <div className="som-loading-spinner"></div>
                        <p>Syncing audit trail with master server...</p>
                    </div>
                ) : error ? (
                    <div className="som-log-error">
                        <svg viewBox="0 0 24 24" width="48" height="48" stroke="#ef4444" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <p>System Error: {error}</p>
                        <button className="som-btn-refresh" onClick={fetchLogs} style={{ marginTop: '1rem', alignSelf: 'center' }}>Try Again</button>
                    </div>
                ) : (
                    <div className="som-table-wrapper">
                        <table className="som-log-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User Identity</th>
                                    <th>Activity Type</th>
                                    <th>Observation / Action</th>
                                    {type === 'User Login' && <th>Origin IP</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={type === 'User Login' ? 5 : 4} className="som-no-data">
                                            <div style={{ opacity: 0.5, marginBottom: '1rem' }}>
                                                <svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                            </div>
                                            No audit records found for the current period.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="som-log-row">
                                            <td className="som-log-date">{formatDate(log.created_at)}</td>
                                            <td className="som-log-user">
                                                <div className="som-user-pill">
                                                    <span className="som-user-icon">{(log.username || 'U').charAt(0).toUpperCase()}</span>
                                                    {log.username || 'System'}
                                                </div>
                                            </td>
                                            <td className="som-log-type">
                                                <span className={`som-badge-type ${getBadgeClass(log.activity_type)}`}>
                                                    {getActivityIcon(log.activity_type)}
                                                    {log.activity_type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="som-log-desc">{log.description}</td>
                                            {type === 'User Login' && (
                                                <td className="som-log-ip">
                                                    <code>{log.ip_address || '0.0.0.0'}</code>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ActivityLogPage
