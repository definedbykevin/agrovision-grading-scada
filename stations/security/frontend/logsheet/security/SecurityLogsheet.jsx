import React, { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import './SecurityLogsheet.css'

const truncateText = (str, maxLen = 12) => {
    if (!str) return '---'
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

const calculateDateRange = (baseDateStr, rangeType) => {
    if (!baseDateStr) return { startDate: '', endDate: '' }
    const parts = baseDateStr.split('-')
    if (parts.length < 3) return { startDate: '', endDate: '' }
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)

    if (rangeType === 'WEEKLY') {
        const endDateObj = new Date(year, month, day + 6)
        const endY = endDateObj.getFullYear()
        const endM = String(endDateObj.getMonth() + 1).padStart(2, '0')
        const endD = String(endDateObj.getDate()).padStart(2, '0')
        return {
            startDate: `${baseDateStr} 00:00:00`,
            endDate: `${endY}-${endM}-${endD} 23:59:59`
        }
    }
    if (rangeType === 'MONTHLY') {
        const lastDay = new Date(year, month + 1, 0).getDate()
        const monthStr = String(month + 1).padStart(2, '0')
        return {
            startDate: `${year}-${monthStr}-01 00:00:00`,
            endDate: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')} 23:59:59`
        }
    }
    if (rangeType === 'YEARLY') {
        return {
            startDate: `${year}-01-01 00:00:00`,
            endDate: `${year}-12-31 23:59:59`
        }
    }
    return {
        startDate: `${baseDateStr} 00:00:00`,
        endDate: `${baseDateStr} 23:59:59`
    }
}

export default function SecurityLogsheet({ stationSlug = 'security', stationTitle = 'SECURITY', tabBar = null }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [timeSeries, setTimeSeries] = useState('DAILY')
    const [category, setCategory] = useState('ALL')
    const [selectedCapture, setSelectedCapture] = useState(null)

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const { startDate, endDate } = calculateDateRange(date, timeSeries)
            const query = new URLSearchParams({
                page,
                startDate,
                endDate
            })
            if (category && category !== 'ALL') {
                query.append('category', category)
            }
            const token = localStorage.getItem('kip_token')
            const url = `/api/security/logsheet/event-logs?stationSlug=${stationSlug}&limit=11&${query}`
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
            console.error(`Failed to fetch ${stationTitle} logs:`, err)
        } finally {
            setLoading(false)
        }
    }, [stationSlug, stationTitle, page, date, timeSeries, category])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    useEffect(() => {
        const socket = io()
        socket.on('station:log', (data) => {
            const incoming = data.station?.toUpperCase().replace(/\s+/g, '_')
            const current = stationTitle.toUpperCase().replace(/\s+/g, '_')
            if (incoming === current && page === 1) {
                fetchLogs()
            }
        })
        socket.on('ai:event', (data) => {
            if (data.station === stationSlug && page === 1) {
                fetchLogs()
            }
        })
        return () => socket.disconnect()
    }, [stationSlug, stationTitle, page, fetchLogs])

    const formatTimestamp = (ts) => {
        if (!ts) return '---'
        if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts)) {
            return ts
        }
        const d = new Date(ts)
        if (isNaN(d.getTime())) return String(ts)
        const year = d.getUTCFullYear()
        const month = String(d.getUTCMonth() + 1).padStart(2, '0')
        const day = String(d.getUTCDate()).padStart(2, '0')
        const hours = String(d.getUTCHours()).padStart(2, '0')
        const minutes = String(d.getUTCMinutes()).padStart(2, '0')
        const seconds = String(d.getUTCSeconds()).padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    const formatDisplayValue = (val, tagName) => {
        if (val === null || val === undefined) return '---'
        const num = parseFloat(val)
        if (isNaN(num)) return val
        const motorKeywords = ['run', 'stop', 'start', 'status', 'fan', 'pump', 'motor', 'cmd', 'onoff', 'screw', 'airlock', 'conveyor', 'feeder', 'breaker', 'gate', 'barrier']
        const isDigital = (num === 0 || num === 1) && motorKeywords.some(kw => tagName?.toLowerCase().includes(kw))
        if (isDigital) {
            return num === 1 ?
                <span style={{ color: '#16a34a', fontWeight: 900 }}>RUN</span> :
                <span style={{ color: '#dc2626', fontWeight: 900 }}>STOP</span>
        }
        return Number(Math.round(num + 'e2') + 'e-2').toString()
    }

    const handleExport = async () => {
        try {
            const { startDate, endDate } = calculateDateRange(date, timeSeries)
            const targetSlug = stationSlug || 'security'
            let exportUrl = `/api/security/logsheet/event-logs?stationSlug=${encodeURIComponent(targetSlug)}&limit=10000&page=1`
            if (startDate) exportUrl += `&startDate=${encodeURIComponent(startDate)}`
            if (endDate) exportUrl += `&endDate=${encodeURIComponent(endDate)}`
            if (category && category !== 'ALL') exportUrl += `&category=${encodeURIComponent(category)}`

            const res = await fetch(exportUrl)
            const data = await res.json()
            const exportLogs = data.data || data.aiLogs || []

            const headers = ['Timestamp', 'Station', 'Category', 'Tag/Event Name', 'Plate No', 'New Value/Details', 'Source', 'Shift']
            const csvRows = [
                headers.map(h => `"${h}"`).join(','),
                ...exportLogs.map(log => [
                    `"${formatTimestamp(log.timestamp || log.detected_at)}"`,
                    `"${(log.station || log.station_slug || targetSlug).toUpperCase()}"`,
                    `"${log.category || 'AI'}"`,
                    `"${(log.tag_name || log.camera_name || '').replace(/"/g, '""')}"`,
                    `"${log.plate_no || '---'}"`,
                    `"${(log.new_value || log.detection_detail || '').replace(/"/g, '""')}"`,
                    `"${log.source || log.camera_code || 'CAM'}"`,
                    `"${log.shift || 'SHIFT_1'}"`
                ].join(','))
            ]

            const csvContent = csvRows.join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${targetSlug.toUpperCase()}_Logsheet_${date}_${timeSeries}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Error exporting CSV:', err)
        }
    }

    return (
        <div className="security-log-container">
            <header className="security-log-header">
                <div className="security-log-title">
                    <h1>STATION EVENT LOG / {stationTitle}</h1>
                </div>
                <div>
                    <button className="security-btn-export" onClick={handleExport}>EXPORT CSV</button>
                </div>
            </header>

            {tabBar}

            <div className="security-log-controls">
                <div className="security-input-group">
                    <label>Date</label>
                    <input type="date" className="security-input" value={date} onChange={e => { setDate(e.target.value); setPage(1); }} />
                </div>
                <div className="security-input-group">
                    <label>Time Series</label>
                    <select className="security-select" value={timeSeries} onChange={e => { setTimeSeries(e.target.value); setPage(1); }}>
                        <option value="DAILY">DAILY</option>
                        <option value="WEEKLY">WEEKLY</option>
                        <option value="MONTHLY">MONTHLY</option>
                        <option value="YEARLY">YEARLY</option>
                    </select>
                </div>
                <div className="security-input-group">
                    <label>Category</label>
                    <select className="security-select" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
                        <option value="ALL">ALL CATEGORIES</option>
                        <option value="APD">APD (SAFETY GEAR)</option>
                        <option value="FIRE">FIRE / SMOKE</option>
                        <option value="HUMAN">HUMAN INTRUSION</option>
                        <option value="LPR">LPR (LICENSE PLATE)</option>
                        <option value="OILDISPATCH">OIL DISPATCH</option>
                    </select>
                </div>
            </div>

            <div className="security-log-card">
            <div className="security-log-content">
                <table className="security-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Category</th>
                            <th>CCTV / Source</th>
                            <th>Plate No</th>
                            <th>Event Message / Details</th>
                            <th>Accuracy</th>
                            <th style={{ textAlign: 'center' }}>Snapshot</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#475569' }}>
                                    {loading ? 'READING HISTORICAL DB...' : `NO EVENT DETECTED FOR ${stationTitle}`}
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => {
                                return (
                                    <tr key={log.id}>
                                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatTimestamp(log.timestamp)}</td>
                                        <td>
                                            <span className="security-cat-ai" style={{
                                              background: log.category === 'FIRE' ? '#fef2f2' : log.category === 'APD' ? '#fffbeb' : log.category === 'LPR' ? '#f0f9ff' : '#f8fafc',
                                              color: log.category === 'FIRE' ? '#dc2626' : log.category === 'APD' ? '#d97706' : log.category === 'LPR' ? '#0284c7' : '#475569',
                                              border: '1px solid currentColor',
                                              padding: '2px 8px',
                                              borderRadius: '4px',
                                              fontWeight: 700,
                                              fontSize: '0.75rem'
                                            }}>
                                                {log.category || 'AI'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }} title={log.tag_name || log.camera_name}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '0.85rem' }}>{truncateText(log.tag_name || log.camera_name, 18)}</span>
                                                <span className="security-source-pill" style={{ width: 'fit-content', fontSize: '0.7rem' }}>{log.camera_code || log.source}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {log.plate_no ? (
                                                <span style={{ background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                    {log.plate_no}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>---</span>
                                            )}
                                        </td>
                                        <td title={log.new_value || log.detection_detail || '---'}>
                                            <span style={{ fontSize: '0.85rem' }}>{log.new_value || log.detection_detail}</span>
                                        </td>
                                        <td>
                                            <span style={{
                                              background: '#ecfdf5',
                                              color: '#059669',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              fontWeight: 800,
                                              fontSize: '0.75rem'
                                            }}>
                                                {log.confidence_score || '95%'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="security-btn-capture" onClick={() => setSelectedCapture(log)} title="View Visual Snapshot">
                                                📷 Snapshot
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="security-pagination">
                <div>
                    TOTAL: <span style={{ color: '#a16207', fontWeight: 900 }}>{total}</span> EVENTS FOUND FOR {stationTitle}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="security-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>PREV</button>
                    <span>PAGE {page} OF {totalPages || 1}</span>
                    <button className="security-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>NEXT</button>
                </div>
            </div>
        </div>

            {selectedCapture && (
                <div className="security-modal-overlay" onClick={() => setSelectedCapture(null)}>
                    <div className="security-modal-card" onClick={e => e.stopPropagation()}>
                        <button className="security-modal-close-btn" onClick={() => setSelectedCapture(null)} title="Close">✕</button>
                        <div className="security-modal-layout">
                            <div className="security-modal-image-frame">
                                {selectedCapture.image_url ? (
                                    <img src={selectedCapture.image_url} alt="Detection Snapshot" onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="security-modal-image-empty">SNAPSHOT IMAGE NOT AVAILABLE</span>'; }} />
                                ) : (
                                    <span className="security-modal-image-empty">SNAPSHOT IMAGE NOT AVAILABLE</span>
                                )}
                            </div>
                            <div className="security-modal-details-panel">
                                <h3 className="security-modal-headline">{selectedCapture.tag_name || selectedCapture.camera_name || 'DETECTION SNAPSHOT'}</h3>
                                <div className="security-modal-grid">
                                    <div className="security-modal-row">
                                        <span className="security-modal-label">Timestamp</span>
                                        <span className="security-modal-value">{formatTimestamp(selectedCapture.timestamp || selectedCapture.detected_at)}</span>
                                    </div>
                                    <div className="security-modal-row">
                                        <span className="security-modal-label">Station</span>
                                        <span className="security-modal-value"><span className="security-station-badge">{(selectedCapture.station || selectedCapture.station_slug || stationTitle).toUpperCase()}</span></span>
                                    </div>
                                    <div className="security-modal-row">
                                        <span className="security-modal-label">Category</span>
                                        <span className="security-modal-value"><span className="security-cat-ai">{selectedCapture.category || 'AI'}</span></span>
                                    </div>
                                    {selectedCapture.plate_no && (
                                        <div className="security-modal-row">
                                            <span className="security-modal-label">Plate No</span>
                                            <span className="security-modal-value" style={{ color: '#0284c7', fontWeight: 800 }}>{selectedCapture.plate_no}</span>
                                        </div>
                                    )}
                                     <div className="security-modal-row">
                                         <span className="security-modal-label">Event Details</span>
                                         <span className="security-modal-value" style={{ color: '#0f172a' }}>{selectedCapture.new_value || selectedCapture.detection_detail}</span>
                                     </div>
                                     <div className="security-modal-row">
                                         <span className="security-modal-label">Accuracy Score</span>
                                         <span className="security-modal-value" style={{ color: '#059669', fontWeight: 800 }}>{selectedCapture.confidence_score || '95%'}</span>
                                     </div>
                                     <div className="security-modal-row">
                                         <span className="security-modal-label">Camera Source</span>
                                         <span className="security-modal-value"><span className="security-source-pill">{selectedCapture.source || selectedCapture.camera_code}</span></span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
