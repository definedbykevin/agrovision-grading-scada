import React, { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import './Logsheet.css'

const LogsheetBase = ({ stationTitle, stationSlug }) => {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Filters
    const [shift, setShift] = useState('')
    const [severity, setSeverity] = useState('')
    const [search, setSearch] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    // Dynamic Shift Config
    const [shiftConfig, setShiftConfig] = useState(null)

    // Initial Fetch
    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const query = new URLSearchParams({
                page,
                shift,
                severity,
                search,
                startDate: date ? `${date}T00:00:00Z` : '',
                endDate: date ? `${date}T23:59:59Z` : ''
            })
            const token = localStorage.getItem('kip_token');
            const url = stationSlug
                ? `/api/${stationSlug}/logsheet/event-logs?${query}`
                : `/api/logsheet/${encodeURIComponent(stationTitle)}?${query}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const result = await response.json()
            if (result.data) {
                setLogs(result.data)
                setTotalPages(result.pagination?.totalPages || 1)
                setTotal(result.pagination?.total || result.data.length)
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err)
        } finally {
            setLoading(false)
        }
    }, [stationTitle, stationSlug, page, shift, severity, search, date])

    // Fetch Shift Config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem('kip_token');
                const res = await fetch('/api/config/system/all', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (result.success && result.data.shift_config) {
                    setShiftConfig(result.data.shift_config);
                }
            } catch (e) {
                console.error('Failed to fetch shift config', e);
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    // ⚡ WebSocket Integration for Real-time Log Updates
    useEffect(() => {
        const socket = io();

        socket.on('station:log', (data) => {
            const incoming = data.station.toUpperCase().replace(/\s+/g, '_');
            const current = stationTitle.toUpperCase().replace(/\s+/g, '_');

            if (incoming === current && page === 1 && !shift && !severity && !search) {
                fetchLogs();
            }
        });

        return () => socket.disconnect();
    }, [stationTitle, page, shift, severity, search, fetchLogs]);

    const formatTimestamp = (ts) => {
        const d = new Date(ts)
        return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
    }

    const formatDisplayValue = (val, tagName) => {
        if (val === null || val === undefined) return '---';
        const num = parseFloat(val);
        if (isNaN(num)) return val;

        // Check if it's a digital/motor tag (0 or 1 and matches motor keywords)
        const motorKeywords = ['run', 'stop', 'start', 'status', 'fan', 'pump', 'motor', 'cmd', 'onoff', 'screw', 'airlock', 'conveyor', 'feeder', 'breaker'];
        const isDigital = (num === 0 || num === 1) && 
                         motorKeywords.some(kw => tagName.toLowerCase().includes(kw));

        if (isDigital) {
            return num === 1 ? 
                <span style={{ color: '#00ff41', fontWeight: 900, textShadow: '0 0 5px rgba(0,255,65,0.5)' }}>RUN</span> : 
                <span style={{ color: '#ef4444', fontWeight: 900 }}>STOP</span>;
        }

        // Standard number formatting
        return Number(Math.round(num + 'e2') + 'e-2').toString();
    };

    const formatValue = (val) => {
        if (val === null || val === undefined) return '---'
        const num = parseFloat(val)
        if (isNaN(num)) return val
        return Number(Math.round(num + 'e2') + 'e-2').toString()
    }

    const handleExport = () => {
        const headers = ['Timestamp', 'Tag Name', 'Old Value', 'New Value', 'Severity', 'Source', 'Shift']
        const csvContent = [
            headers.join(','),
            ...logs.map(log => [
                log.timestamp,
                log.tag_name,
                formatValue(log.old_value),
                formatValue(log.new_value),
                log.severity,
                log.source,
                log.shift
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${stationTitle.replace(' ', '_')}_Log_${date}.csv`
        a.click()
    }

    return (
        <div className="scada-log-container">
            <header className="scada-log-header">
                <div className="scada-log-title">
                    <h1>STATION EVENT LOG / {stationTitle.toUpperCase()}</h1>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button className="page-btn" onClick={handleExport}>EXPORT CSV</button>
                </div>
            </header>

            <div className="scada-log-controls">
                <div className="scada-input-group">
                    <label>Date</label>
                    <input type="date" className="scada-input" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="scada-input-group">
                    <label>Shift</label>
                    <select className="scada-select" value={shift} onChange={e => setShift(e.target.value)}>
                        <option value="">ALL SHIFTS</option>
                        {shiftConfig ? (
                            Object.entries(shiftConfig).map(([key, cfg]) => (
                                <option key={key} value={key}>
                                    SHIFT {key} ({String(cfg.start).padStart(2, '0')}-{String(cfg.end).padStart(2, '0')})
                                </option>
                            ))
                        ) : (
                            <>
                                <option value="A">SHIFT A (07-15)</option>
                                <option value="B">SHIFT B (15-23)</option>
                                <option value="C">SHIFT C (23-07)</option>
                            </>
                        )}
                    </select>
                </div>
                <div className="scada-input-group">
                    <label>Severity</label>
                    <select className="scada-select" value={severity} onChange={e => setSeverity(e.target.value)}>
                        <option value="">ALL LEVELS</option>
                        <option value="INFO">INFO</option>
                        <option value="WARNING">WARNING</option>
                        <option value="ALARM">ALARM</option>
                    </select>
                </div>
                <div className="scada-input-group" style={{ flex: 1, minWidth: '200px' }}>
                    <label>Search Tag / Value</label>
                    <input
                        type="text"
                        className="scada-input"
                        placeholder="Type to filter..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="scada-log-content">
                <table className="scada-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Tag Name</th>
                            <th>Old Value</th>
                            <th>New Value</th>
                            <th>Severity</th>
                            <th>Source</th>
                            <th>Shift</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#475569' }}>
                                    {loading ? 'READING HISTORICAL DB...' : 'NO EVENT DETECTED FOR SELECTED FILTERS'}
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className={`log-row-${log.severity.toLowerCase()}`}>
                                    <td className="timestamp">{formatTimestamp(log.timestamp)}</td>
                                    <td className="tag-name">{log.tag_name}</td>
                                    <td className="old-val">{formatDisplayValue(log.old_value, log.tag_name)}</td>
                                    <td className="new-val">{formatDisplayValue(log.new_value, log.tag_name)}</td>
                                    <td className={`severity-${log.severity.toLowerCase()}`}>
                                        {log.severity}
                                    </td>
                                    <td><span className="source-pill">{log.source}</span></td>
                                    <td>{log.shift}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="scada-pagination">
                <div>
                    TOTAL: <span style={{ color: '#10b981', fontWeight: 800 }}>{total}</span> EVENTS FOUND
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>PREV</button>
                    <span>PAGE {page} OF {totalPages || 1}</span>
                    <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>NEXT</button>
                </div>
            </div>
        </div>
    )
}

export default LogsheetBase
