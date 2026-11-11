import { useState, useEffect } from 'react'
import './WeighbridgePage.css'

// ── Helper: format Date → "DD/MM/YYYY HH:MM:SS" ──
function formatTimestamp(date) {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    const HH = String(date.getHours()).padStart(2, '0')
    const MM = String(date.getMinutes()).padStart(2, '0')
    const SS = String(date.getSeconds()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${HH}:${MM}:${SS}`
}

function WeighbridgePage() {
    const [currentWeight, setCurrentWeight] = useState(0)
    const [isStable, setIsStable] = useState(true)
    const [timestamp, setTimestamp] = useState(formatTimestamp(new Date()))  // ← realtime

    // Security Truck Queue, CCTV, Throughput & Scale State
    const [queues, setQueues] = useState([])
    const [cctvs, setCctvs] = useState([])
    const [throughput, setThroughput] = useState({ ffbReceived: 0, cpoDispatch: 0, pkDispatch: 0, pksDispatch: 0 })
    const [scalesStatus, setScalesStatus] = useState({
        scale1: { inTruck: '-', inWeight: 0, outTruck: '-', outWeight: 0 },
        scale2: { inTruck: '-', inWeight: 0, outTruck: '-', outWeight: 0 }
    })

    // Realtime clock — update setiap detik
    useEffect(() => {
        const clockInterval = setInterval(() => {
            setTimestamp(formatTimestamp(new Date()))
        }, 1000)
        return () => clearInterval(clockInterval)
    }, [])

    // Fetch Security Queue Data, Weighbridge Filtered CCTVs, Throughput, and Scales Status (every 5 seconds)
    useEffect(() => {
        let isMounted = true
        const fetchData = async () => {
            // 1. Fetch Queues
            try {
                const qRes = await fetch('/api/security/queues')
                if (qRes.ok) {
                    const qJson = await qRes.json()
                    if (qJson.success && isMounted) setQueues(qJson.data || [])
                }
            } catch (err) {
                console.warn('[Weighbridge] Queue fetch fallback:', err)
            }

            // 2. Fetch CCTVs
            try {
                const cRes = await fetch('/api/security/cctv?location=weighbridge')
                if (cRes.ok) {
                    const cJson = await cRes.json()
                    if (cJson.success && isMounted) {
                        const wbCameras = (cJson.data || []).filter(cam => {
                            const loc = (cam.location || '').toLowerCase()
                            const name = (cam.camera_name || '').toLowerCase()
                            return loc.includes('weighbridge') || loc.includes('wb') || name.includes('weighbridge') || name.includes('wb')
                        })
                        setCctvs(wbCameras)
                    }
                }
            } catch (err) {
                console.warn('[Weighbridge] CCTV fetch fallback:', err)
            }

            // 3. Fetch Throughput
            try {
                const tpRes = await fetch('/api/weighbridge/transactions/throughput/daily')
                if (tpRes.ok) {
                    const tpJson = await tpRes.json()
                    if (tpJson.success && tpJson.data && isMounted) {
                        setThroughput(tpJson.data)
                    }
                }
            } catch (err) {
                console.warn('[Weighbridge] Throughput fetch fallback:', err)
            }

            // 4. Fetch Scales Status
            try {
                const scRes = await fetch('/api/weighbridge/transactions/scales/status')
                if (scRes.ok) {
                    const scJson = await scRes.json()
                    if (scJson.success && scJson.data && isMounted) {
                        setScalesStatus(scJson.data)
                    }
                }
            } catch (err) {
                console.warn('[Weighbridge] Scales status fetch fallback:', err)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [])

    // Calculate 07:00 AM operational day shift window
    const now = new Date()
    const shiftStart = new Date(now)
    if (now.getHours() < 7) {
        shiftStart.setDate(shiftStart.getDate() - 1)
    }
    shiftStart.setHours(7, 0, 0, 0)

    const shiftEnd = new Date(shiftStart)
    shiftEnd.setDate(shiftEnd.getDate() + 1)
    shiftEnd.setMilliseconds(-1)

    // Realtime live status counts (UN-RESET for WAITING, WEIGH_IN, GRADING)
    const waitingOutside = (queues || []).filter(q => (q.status || '').toUpperCase() === 'WAITING').length
    const weighingCount = (queues || []).filter(q => (q.status || '').toUpperCase() === 'WEIGH_IN').length
    const gradingCount = (queues || []).filter(q => (q.status || '').toUpperCase() === 'GRADING').length

    // Trucks Today: total queue registrations count within the 07:00 AM operational shift window
    const queuesShiftToday = (queues || []).filter(q => {
        const rawDate = q.created_at || q.check_in_at || q.checkInAt || q.registered_at || q.timestamp || q.createdAt
        if (!rawDate) return false
        // Replace SQL space format with ISO 'T' format if needed
        const formattedDateStr = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate
        const qDate = new Date(formattedDateStr)
        return !isNaN(qDate.getTime()) && qDate >= shiftStart && qDate <= shiftEnd
    })

    const trucksToday = queuesShiftToday.length

    // Active WAITING trucks list for NEXT TRUCK IN QUEUE card (top 3)
    const nextWaitingTrucks = (queues || [])
        .filter(q => (q.status || '').toUpperCase() === 'WAITING')
        .slice(0, 3)

    // Active WEIGH_IN trucks list from Security queues
    const activeWeighInTrucks = (queues || []).filter(q => (q.status || '').toUpperCase() === 'WEIGH_IN')
    
    // Scale 1 IN: 1st WEIGH_IN truck
    const scale1InTruckObj = activeWeighInTrucks[0] || null
    const scale1InTruck = (scalesStatus && scalesStatus.scale1 && scalesStatus.scale1.inTruck && scalesStatus.scale1.inTruck !== '-')
        ? scalesStatus.scale1.inTruck
        : (scale1InTruckObj?.licensePlate || scale1InTruckObj?.plate_number || '-')

    // Scale 2 IN: 2nd WEIGH_IN truck
    const scale2InTruckObj = activeWeighInTrucks[1] || null
    const scale2InTruck = (scalesStatus && scalesStatus.scale2 && scalesStatus.scale2.inTruck && scalesStatus.scale2.inTruck !== '-')
        ? scalesStatus.scale2.inTruck
        : (scale2InTruckObj?.licensePlate || scale2InTruckObj?.plate_number || '-')

    return (
        <div className="som-weighbridge-page">
            <header className="som-wb-header">
                <div className="som-header-left">
                    <h1 className="som-wb-title">WEIGHBRIDGE STATION</h1>
                </div>
            </header>

            <div className="som-wb-content">
                <aside className="som-wb-sidebar">

                    {/* ── PERFORMANCE PANEL ── */}
                    <div className="wb-panel">
                        <div className="wb-panel-title">LOGISTICS FLOW</div>
                        <div className="wb-flow-grid">
                            <div className="wb-flow-item total">
                                <span className="wb-flow-count">{trucksToday}</span>
                                <span className="wb-flow-label">TRUCKS TODAY</span>
                            </div>
                            <div className="wb-flow-item waiting">
                                <span className="wb-flow-count">{waitingOutside}</span>
                                <span className="wb-flow-label">WAITING</span>
                            </div>
                            <div className="wb-flow-item weighing">
                                <span className="wb-flow-count">{weighingCount}</span>
                                <span className="wb-flow-label">WEIGH-IN</span>
                            </div>
                            <div className="wb-flow-item grading">
                                <span className="wb-flow-count">{gradingCount}</span>
                                <span className="wb-flow-label">GRADING</span>
                            </div>
                        </div>
                    </div>

                    {/* ── THROUGHPUT ── */}
                    <div className="wb-panel">
                        <div className="wb-panel-title">DAILY THROUGHPUT</div>
                        <div className="wb-throughput-list">
                            <div className="wb-tp-row"><span>FFB RECEIVED (UMUM & MITRA)</span><span className="wb-tp-val">{throughput?.ffbReceived ?? 0} <small>MT</small></span></div>
                            <div className="wb-tp-row"><span>CPO DISPATCH</span><span className="wb-tp-val">{throughput?.cpoDispatch ?? 0} <small>MT</small></span></div>
                            <div className="wb-tp-row"><span>PALM KERNEL DISPATCH</span><span className="wb-tp-val">{throughput?.pkDispatch ?? 0} <small>MT</small></span></div>
                            <div className="wb-tp-row"><span>PKS DISPATCH (SHELL)</span><span className="wb-tp-val">{throughput?.pksDispatch ?? 0} <small>MT</small></span></div>
                        </div>
                    </div>

                    {/* ── COMBINED SCALES STATUS ── */}
                    <div className="wb-panel">
                        <div className="wb-scale-header">
                            <span className="wb-panel-title" style={{ margin: 0 }}>SCALES STATUS</span>
                            <span className={`wb-dot ${isStable ? 'online' : 'offline'}`}></span>
                        </div>
                        <div className="wb-scales-compact-grid">
                            {(() => {
                                const labelMap = {
                                    'U': 'FFB UMUM',
                                    'M': 'FFB MITRA',
                                    'C': 'CRUDE PALM OIL',
                                    'K': 'PALM KERNEL',
                                    'S': 'PALM KERNEL SHELL'
                                }
                                const s1InCode = scalesStatus?.scale1?.inClass || scale1InTruckObj?.classification_code || scale1InTruckObj?.classificationCode || null
                                const s1InLabel = s1InCode ? (labelMap[s1InCode.toUpperCase()] || s1InCode) : null
                                
                                const s1OutCode = scalesStatus?.scale1?.outClass || null
                                const s1OutLabel = s1OutCode ? (labelMap[s1OutCode.toUpperCase()] || s1OutCode) : null
                                
                                const s2InCode = scalesStatus?.scale2?.inClass || scale2InTruckObj?.classification_code || scale2InTruckObj?.classificationCode || null
                                const s2InLabel = s2InCode ? (labelMap[s2InCode.toUpperCase()] || s2InCode) : null
                                
                                const s2OutCode = scalesStatus?.scale2?.outClass || null
                                const s2OutLabel = s2OutCode ? (labelMap[s2OutCode.toUpperCase()] || s2OutCode) : null

                                return (
                                    <>
                                        <div className="wb-scale-section">
                                            <div className="wb-scale-sec-title">SCALE 1</div>
                                            <div className="wb-scale-row">
                                                <div className="wb-scale-badge in">IN</div>
                                                <div className="wb-scale-info">
                                                    <div className="wb-scale-plate-wrapper">
                                                        <span className="wb-scale-plate">{scale1InTruck}</span>
                                                        {scale1InTruck !== '-' && s1InLabel && <span className="wb-scale-class-tag">{s1InLabel}</span>}
                                                    </div>
                                                    <div className="wb-scale-weight in-weight">
                                                        {Number(scalesStatus?.scale1?.inWeight || 0).toLocaleString()} <span>KG</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="wb-scale-row">
                                                <div className="wb-scale-badge out">OUT</div>
                                                <div className="wb-scale-info">
                                                    <div className="wb-scale-plate-wrapper">
                                                        <span className="wb-scale-plate">{scalesStatus?.scale1?.outTruck || '-'}</span>
                                                        {scalesStatus?.scale1?.outTruck && scalesStatus.scale1.outTruck !== '-' && s1OutLabel && <span className="wb-scale-class-tag out">{s1OutLabel}</span>}
                                                    </div>
                                                    <div className="wb-scale-weight out-weight">
                                                        {Number(scalesStatus?.scale1?.outWeight || 0).toLocaleString()} <span>KG</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="wb-scale-divider"></div>

                                        <div className="wb-scale-section">
                                            <div className="wb-scale-sec-title">SCALE 2</div>
                                            <div className="wb-scale-row">
                                                <div className="wb-scale-badge in">IN</div>
                                                <div className="wb-scale-info">
                                                    <div className="wb-scale-plate-wrapper">
                                                        <span className="wb-scale-plate">{scale2InTruck}</span>
                                                        {scale2InTruck !== '-' && s2InLabel && <span className="wb-scale-class-tag">{s2InLabel}</span>}
                                                    </div>
                                                    <div className="wb-scale-weight in-weight">
                                                        {Number(scalesStatus?.scale2?.inWeight || 0).toLocaleString()} <span>KG</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="wb-scale-row">
                                                <div className="wb-scale-badge out">OUT</div>
                                                <div className="wb-scale-info">
                                                    <div className="wb-scale-plate-wrapper">
                                                        <span className="wb-scale-plate">{scalesStatus?.scale2?.outTruck || '-'}</span>
                                                        {scalesStatus?.scale2?.outTruck && scalesStatus.scale2.outTruck !== '-' && s2OutLabel && <span className="wb-scale-class-tag out">{s2OutLabel}</span>}
                                                    </div>
                                                    <div className="wb-scale-weight out-weight">
                                                        {Number(scalesStatus?.scale2?.outWeight || 0).toLocaleString()} <span>KG</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>

                    {/* ── NEXT TRUCK IN QUEUE ── */}
                    <div className="wb-panel wb-next-queue-panel">
                        <div className="wb-panel-title">NEXT TRUCK IN QUEUE</div>
                        <div className="wb-next-queue-list">
                            {nextWaitingTrucks.length === 0 ? (
                                <div className="wb-queue-empty">NO TRUCKS WAITING</div>
                            ) : (
                                nextWaitingTrucks.map((truck, idx) => {
                                    const code = truck.queueCode || truck.queue_code || `U-${String(idx + 1).padStart(3, '0')}`
                                    const plate = truck.licensePlate || truck.plate_number || 'UNKNOWN'
                                    const classCode = (truck.classificationCode || truck.classification_name || 'U').toUpperCase()

                                    const labelMap = {
                                        'U': 'FFB UMUM',
                                        'M': 'FFB MITRA',
                                        'C': 'CRUDE PALM OIL',
                                        'K': 'PALM KERNEL',
                                        'S': 'PALM KERNEL SHELL'
                                    }
                                    const classLabel = labelMap[classCode] || classCode

                                    return (
                                        <div className="wb-queue-row" key={truck.id || idx}>
                                            <span className="wb-queue-code">{code}</span>
                                            <span className="wb-queue-plate">{plate}</span>
                                            <span className="wb-queue-tag" title={classLabel}>{classLabel}</span>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                </aside>

                <main className="som-wb-cctv-grid">
                    {/* CAM 1: SCALE 1 INBOUND */}
                    <div className="som-bridge-cctv">
                        <div className="cctv-feed-container">
                            <div className="cctv-label-overlay">
                                <span className="cctv-cam-name">{cctvs[0] ? cctvs[0].camera_name : 'CAM 1 (WEIGH-IN)'}</span>
                                <span className="cctv-cam-location">{cctvs[0]?.location || 'SCALE 1 INBOUND'}</span>
                            </div>
                            <div className="cctv-top-right-overlay">
                                <div className="cctv-timestamps">{timestamp}</div>
                                <div className={`cctv-status-rec ${cctvs[0]?.stream_url ? '' : 'offline'}`}>
                                    {cctvs[0]?.stream_url ? '●REC' : 'OFFLINE'}
                                </div>
                            </div>
                            {cctvs[0]?.stream_url ? (
                                <img src={cctvs[0].stream_url} alt="CCTV 1" className="cctv-img" />
                            ) : (
                                <div className="cctv-offline-screen">
                                    <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="1.5" fill="none">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                    <span>OFFLINE STREAM</span>
                                </div>
                            )}
                            <div className="cctv-data-overlay">
                                {scale1InTruck !== '-' ? (
                                    <>
                                        <span className="cctv-truck-badge">PLATE: {scale1InTruck}</span>
                                        <span className="cctv-weight-badge">WEIGH-IN: {Number(scalesStatus?.scale1?.inWeight || 0).toLocaleString()} KG</span>
                                    </>
                                ) : (
                                    <span className="cctv-empty-badge">NO VEHICLE ON SCALE 1</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CAM 2: SCALE 1 OUTBOUND */}
                    <div className="som-bridge-cctv">
                        <div className="cctv-feed-container">
                            <div className="cctv-label-overlay">
                                <span className="cctv-cam-name">{cctvs[1] ? cctvs[1].camera_name : 'CAM 2 (WEIGH-OUT)'}</span>
                                <span className="cctv-cam-location">{cctvs[1]?.location || 'SCALE 1 OUTBOUND'}</span>
                            </div>
                            <div className="cctv-top-right-overlay">
                                <div className="cctv-timestamps">{timestamp}</div>
                                <div className={`cctv-status-rec ${cctvs[1]?.stream_url ? '' : 'offline'}`}>
                                    {cctvs[1]?.stream_url ? '●REC' : 'OFFLINE'}
                                </div>
                            </div>
                            {cctvs[1]?.stream_url ? (
                                <img src={cctvs[1].stream_url} alt="CCTV 2" className="cctv-img" />
                            ) : (
                                <div className="cctv-offline-screen">
                                    <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="1.5" fill="none">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                    <span>OFFLINE STREAM</span>
                                </div>
                            )}
                            <div className="cctv-data-overlay">
                                {scalesStatus?.scale1?.outTruck && scalesStatus.scale1.outTruck !== '-' ? (
                                    <>
                                        <span className="cctv-truck-badge out">PLATE: {scalesStatus.scale1.outTruck}</span>
                                        <span className="cctv-weight-badge out">WEIGH-OUT: {Number(scalesStatus.scale1.outWeight || 0).toLocaleString()} KG</span>
                                    </>
                                ) : (
                                    <span className="cctv-empty-badge">SCALE 1 OUT IDLE</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CAM 3: SCALE 2 INBOUND */}
                    <div className="som-bridge-cctv">
                        <div className="cctv-feed-container">
                            <div className="cctv-label-overlay">
                                <span className="cctv-cam-name">{cctvs[2] ? cctvs[2].camera_name : 'CAM 3 (SCALE 2 IN)'}</span>
                                <span className="cctv-cam-location">{cctvs[2]?.location || 'SCALE 2 INBOUND'}</span>
                            </div>
                            <div className="cctv-top-right-overlay">
                                <div className="cctv-timestamps">{timestamp}</div>
                                <div className={`cctv-status-rec ${cctvs[2]?.stream_url ? '' : 'offline'}`}>
                                    {cctvs[2]?.stream_url ? '●REC' : 'OFFLINE'}
                                </div>
                            </div>
                            {cctvs[2]?.stream_url ? (
                                <img src={cctvs[2].stream_url} alt="CCTV 3" className="cctv-img" />
                            ) : (
                                <div className="cctv-offline-screen">
                                    <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="1.5" fill="none">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                    <span>OFFLINE STREAM</span>
                                </div>
                            )}
                            <div className="cctv-data-overlay">
                                {scale2InTruck !== '-' ? (
                                    <>
                                        <span className="cctv-truck-badge">PLATE: {scale2InTruck}</span>
                                        <span className="cctv-weight-badge">WEIGH-IN: {Number(scalesStatus?.scale2?.inWeight || 0).toLocaleString()} KG</span>
                                    </>
                                ) : (
                                    <span className="cctv-empty-badge">NO VEHICLE ON SCALE 2</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CAM 4: SCALE 2 OUTBOUND */}
                    <div className="som-bridge-cctv">
                        <div className="cctv-feed-container">
                            <div className="cctv-label-overlay">
                                <span className="cctv-cam-name">{cctvs[3] ? cctvs[3].camera_name : 'CAM 4 (SCALE 2 OUT)'}</span>
                                <span className="cctv-cam-location">{cctvs[3]?.location || 'SCALE 2 OUTBOUND'}</span>
                            </div>
                            <div className="cctv-top-right-overlay">
                                <div className="cctv-timestamps">{timestamp}</div>
                                <div className={`cctv-status-rec ${cctvs[3]?.stream_url ? '' : 'offline'}`}>
                                    {cctvs[3]?.stream_url ? '●REC' : 'OFFLINE'}
                                </div>
                            </div>
                            {cctvs[3]?.stream_url ? (
                                <img src={cctvs[3].stream_url} alt="CCTV 4" className="cctv-img" />
                            ) : (
                                <div className="cctv-offline-screen">
                                    <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="1.5" fill="none">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                    <span>OFFLINE STREAM</span>
                                </div>
                            )}
                            <div className="cctv-data-overlay">
                                {scalesStatus?.scale2?.outTruck && scalesStatus.scale2.outTruck !== '-' ? (
                                    <>
                                        <span className="cctv-truck-badge out">PLATE: {scalesStatus.scale2.outTruck}</span>
                                        <span className="cctv-weight-badge out">WEIGH-OUT: {Number(scalesStatus.scale2.outWeight || 0).toLocaleString()} KG</span>
                                    </>
                                ) : (
                                    <span className="cctv-empty-badge">SCALE 2 OUT IDLE</span>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default WeighbridgePage