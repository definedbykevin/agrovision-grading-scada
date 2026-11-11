import { useState, useEffect } from 'react'
import './SecurityStationPage.css'
import DashboardTab from './tabs/Dashboard/DashboardTab.jsx'
import IncidentsTab from './tabs/Incidents/IncidentsTab.jsx'
import TruckQueuesTab from './tabs/TruckQueues/TruckQueuesTab.jsx'
import CpoLoadingTab from './tabs/CpoLoading/CpoLoadingTab.jsx'
import PatrolMapTab from './tabs/PatrolMap/PatrolMapTab.jsx'
import CctvFeedTab from './tabs/CctvFeed/CctvFeedTab.jsx'
import SecurityAside from './components/SecurityAside.jsx'
import ProofModal from './components/ProofModal.jsx'
import CctvModal from './components/CctvModal.jsx'

function SecurityStationPage({ user, isCamConfigOpen, setIsCamConfigOpen, isSettingCheckpointsOpen, setIsSettingCheckpointsOpen }) {
    // ── Detect ?mode=mobile from URL — render bare Patrol Map for Flutter WebView ──
    const urlParams = new URLSearchParams(window.location.search);
    const isMobileEmbed = urlParams.get('mode') === 'mobile';

    // If mobile embed: inject stored token from URL param (Flutter passes it)
    useEffect(() => {
        const tokenFromUrl = urlParams.get('token');
        if (tokenFromUrl) {
            localStorage.setItem('kip_token', tokenFromUrl);
        }
    }, []);

    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())
    const [activeTab, setActiveTab] = useState('dashboard')

    // Determine effective user info for CCTV access
    let effectiveUser = user || {};
    if (!effectiveUser.id && !effectiveUser.userId && !effectiveUser.username) {
        try {
            effectiveUser = JSON.parse(localStorage.getItem('kip_user') || '{}');
        } catch (_) {}
    }
    // If still missing user fields, decode from JWT token if available
    if (!effectiveUser.id && !effectiveUser.userId && !effectiveUser.username) {
        try {
            const token = localStorage.getItem('kip_token');
            if (token) {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                effectiveUser = JSON.parse(jsonPayload);
            }
        } catch (_) {}
    }

    const effectiveRole = (effectiveUser.role || effectiveUser.userRole || effectiveUser.role_name || '').toLowerCase();
    const effectivePosition = (effectiveUser.position || effectiveUser.position_title || effectiveUser.positionTitle || '').toLowerCase();
    const effectiveUsername = (effectiveUser.username || '').toLowerCase();
    const effectiveUserId = Number(effectiveUser.id || effectiveUser.userId || 0);

    // Manager, Asisten Manager, General Manager, Mill Manager, Dev, Admin, and Staff can access CCTV Feed EXCEPT user id = 21
    const isExcludedUser = effectiveUserId === 21 || effectiveUsername === 'hardi';
    const isAllowedRole = [
        'manager', 'asisten_manager', 'assistant_manager', 'general_manager', 'mill_manager', 
        'dev', 'developer', 'admin', 'staff'
    ].includes(effectiveRole) || 
    effectivePosition.includes('staff') || 
    effectivePosition.includes('manager') ||
    effectiveUsername.includes('manager') ||
    ['choirul', 'deka', 'manager', 'asisten_manager', 'general_manager', 'dev', 'admin'].includes(effectiveUsername);

    const canAccessCctv = !isExcludedUser && isAllowedRole;

    // Auto fallback activeTab to dashboard if user has no CCTV access
    useEffect(() => {
        if (!canAccessCctv && (activeTab === 'cctv' || activeTab === 'cpo-loading')) {
            setActiveTab('dashboard');
        }
    }, [canAccessCctv, activeTab]);

    // Shared State for Modals & Views
    const [activeProof, setActiveProof] = useState(null)
    const [proofIndex, setProofIndex] = useState(0)
    const [selectedCctv, setSelectedCctv] = useState(null)
    const [cctvCameras, setCctvCameras] = useState([])

    // Live Data State
    const [patrolGuards, setPatrolGuards] = useState([])
    const [stationCheckpoints, setStationCheckpoints] = useState([])
    const [mapStations, setMapStations] = useState([])
    const [patrolTracks, setPatrolTracks] = useState([])
    const [patrolHistory, setPatrolHistory] = useState([])
    const [replaySessionId, setReplaySessionId] = useState(null)

    // Update Clock
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Fetch CCTV Cameras dynamically from database
    useEffect(() => {
        let disposed = false;
        let controller;
        const fetchCctvCameras = async () => {
            if (controller) return;
            controller = new AbortController();
            try {
                const token = localStorage.getItem('kip_token');
                const response = await fetch('/api/security/cctv', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    signal: controller.signal, cache: 'no-store',
                });
                const json = await response.json();
                const cameras = Array.isArray(json) ? json : json.success ? json.data : null;
                if (!disposed && response.ok && Array.isArray(cameras)) {
                    setCctvCameras(previous => JSON.stringify(previous) === JSON.stringify(cameras) ? previous : cameras);
                    setSelectedCctv(previous => previous ? cameras.find(camera => camera.id === previous.id) || null : null);
                }
            } catch (error) {
                if (!disposed) console.error('[SecurityStationPage] Failed to fetch CCTV:', error.name);
            } finally { controller = null; }
        };
        void fetchCctvCameras();
        const timer = setInterval(fetchCctvCameras, 5000);
        window.addEventListener('cctv-cameras-changed', fetchCctvCameras);
        return () => {
            disposed = true;
            clearInterval(timer);
            controller?.abort();
            window.removeEventListener('cctv-cameras-changed', fetchCctvCameras);
        };
    }, []);


    // Fetch Live Patrol Data
    useEffect(() => {
        const fetchPatrolData = async () => {
            try {
                const token = localStorage.getItem('kip_token');
                const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
                const [guardsRes, checkpointsRes, stationsRes, tracksRes, historyRes] = await Promise.all([
                    fetch('/api/security/patrol/active', { headers: authHeaders }),
                    fetch('/api/security/patrol/checkpoints', { headers: authHeaders }),
                    fetch('/api/security/patrol/stations', { headers: authHeaders }),
                    fetch('/api/security/patrol/tracks', { headers: authHeaders }),
                    fetch('/api/security/patrol/history', { headers: authHeaders })
                ]);
                const guardsData = await guardsRes.json();
                const checkpointsData = await checkpointsRes.json();
                const stationsData = await stationsRes.json();
                const tracksData = await tracksRes.json();
                const historyData = await historyRes.json();

                if (Array.isArray(guardsData)) setPatrolGuards(guardsData);
                if (Array.isArray(checkpointsData)) setStationCheckpoints(checkpointsData);
                if (Array.isArray(stationsData)) setMapStations(stationsData);
                if (Array.isArray(tracksData)) setPatrolTracks(tracksData);
                if (Array.isArray(historyData)) setPatrolHistory(historyData);
            } catch (err) {
                console.error('[SecurityStationPage] Error fetching patrol data:', err);
            }
        };
        fetchPatrolData();
        const interval = setInterval(fetchPatrolData, 5000);

        // ⚡ Real-time WebSocket: Langsung refresh data ketika ada perubahan checkpoints/patroli tanpa nunggu interval
        let ws;
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.hostname}:3200/ws`;
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    if (parsed.event === 'patrol_checkpoints_updated' || parsed.event === 'checkpoint_verified' || parsed.event === 'patrol_session_started' || parsed.event === 'patrol_session_ended') {
                        fetchPatrolData();
                    } else if (parsed.event === 'guard_location_updated' && parsed.data) {
                        const loc = parsed.data;
                        const lat = parseFloat(loc.latitude);
                        const lng = parseFloat(loc.longitude);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            setPatrolGuards(prevGuards => {
                                const list = Array.isArray(prevGuards) ? [...prevGuards] : [];
                                const idx = list.findIndex(g => 
                                    (loc.session_id && g.session_id === loc.session_id) ||
                                    (loc.guard_id && (g.guard_id === loc.guard_id || g.user_id === loc.guard_id))
                                );
                                if (idx !== -1) {
                                    list[idx] = {
                                        ...list[idx],
                                        latitude: lat,
                                        longitude: lng,
                                        last_update: new Date().toISOString(),
                                        avatar_photo: loc.avatar_photo || list[idx].avatar_photo
                                    };
                                } else {
                                    list.push({
                                        session_id: loc.session_id,
                                        guard_id: loc.guard_id,
                                        user_id: loc.guard_id,
                                        name: loc.name || 'Security Officer',
                                        status: 'active',
                                        latitude: lat,
                                        longitude: lng,
                                        avatar_photo: loc.avatar_photo,
                                        last_update: new Date().toISOString()
                                    });
                                }
                                return list;
                            });

                            if (loc.saved_to_track) {
                                setPatrolTracks(prevTracks => {
                                    const list = Array.isArray(prevTracks) ? [...prevTracks] : [];
                                    list.push({
                                        session_id: loc.session_id,
                                        latitude: lat,
                                        longitude: lng,
                                        recorded_at: new Date().toISOString()
                                    });
                                    return list;
                                });
                            }
                        }
                    }
                } catch (e) {}
            };
        } catch (e) {}

        return () => {
            clearInterval(interval);
            if (ws) ws.close();
        };
    }, []);

    // ══════════════════════════════════════════════════════════════
    // MOBILE EMBED MODE — Flutter WebView renders ONLY PatrolMapTab
    // URL: http://host:5177/security?mode=mobile&token=<jwt>
    // ══════════════════════════════════════════════════════════════
    if (isMobileEmbed) {
        return (
            <div className="som-mobile-embed-container" style={{
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                background: '#0f172a',
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
            }}>
                <PatrolMapTab
                    isMobileEmbed={true}
                    mapStations={mapStations}
                    patrolGuards={patrolGuards}
                    stationCheckpoints={stationCheckpoints}
                    patrolTracks={patrolTracks}
                    cctvCameras={cctvCameras}
                    setProofIndex={setProofIndex}
                    setActiveProof={setActiveProof}
                    replaySessionId={replaySessionId}
                    setReplaySessionId={setReplaySessionId}
                    isSettingCheckpointsOpen={isSettingCheckpointsOpen}
                    setIsSettingCheckpointsOpen={setIsSettingCheckpointsOpen}
                />
            </div>
        );
    }

    return (
        <div className={`som-security-station ${activeTab === 'cpo-loading' ? 'som-cpo-active' : ''}`}>
            <header className="som-security-header">
                <div className="som-header-left">
                    <h1 className="som-security-title">SECURITY CONTROL CENTER</h1>
                </div>

                <div className="som-station-tabs">
                    <button className={`som-station-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
                    <button className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Patrol Map</button>
                    {canAccessCctv && (
                        <button className={`som-station-tab ${activeTab === 'cctv' ? 'active' : ''}`} onClick={() => setActiveTab('cctv')}>CCTV Feed</button>
                    )}
                    <button className={`som-station-tab ${activeTab === 'queues' ? 'active' : ''}`} onClick={() => setActiveTab('queues')}>Truck Queues</button>
                    {canAccessCctv && <button className={`som-station-tab ${activeTab === 'cpo-loading' ? 'active' : ''}`} onClick={() => setActiveTab('cpo-loading')}>CPO Loading</button>}
                    <button className="som-station-tab locked" disabled style={{ opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Incidents
                    </button>
                </div>

                <div className="som-header-right">
                    <div className="som-security-clock">{currentTime}</div>
                    <div className="som-security-date">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
            </header>

            <main className={`som-security-content tab-${activeTab}`}>
                <div className="som-security-main-panel">
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'incidents' && <IncidentsTab />}
                    {activeTab === 'overview' && (
                        <PatrolMapTab
                            user={user}
                            mapStations={mapStations}
                            patrolGuards={patrolGuards}
                            stationCheckpoints={stationCheckpoints}
                            patrolTracks={patrolTracks}
                            cctvCameras={cctvCameras}
                            setProofIndex={setProofIndex}
                            setActiveProof={setActiveProof}
                            replaySessionId={replaySessionId}
                            setReplaySessionId={setReplaySessionId}
                            isSettingCheckpointsOpen={isSettingCheckpointsOpen}
                            setIsSettingCheckpointsOpen={setIsSettingCheckpointsOpen}
                        />
                    )}
                    {activeTab === 'cctv' && canAccessCctv && (
                        <CctvFeedTab
                            setSelectedCctv={setSelectedCctv}
                            cctvCameras={cctvCameras}
                        />
                    )}
                    {activeTab === 'queues' && <TruckQueuesTab />}
                    {activeTab === 'cpo-loading' && canAccessCctv && <CpoLoadingTab key={effectiveUser.id || effectiveUser.userId || effectiveUser.username || 'local'} cctvCameras={cctvCameras} user={effectiveUser} />}
                </div>

                {activeTab === 'overview' && (
                    <SecurityAside
                        patrolGuards={patrolGuards}
                        stationCheckpoints={stationCheckpoints}
                        patrolHistory={patrolHistory}
                        replaySessionId={replaySessionId}
                        setReplaySessionId={setReplaySessionId}
                    />
                )}
            </main>

            <ProofModal
                activeProof={activeProof}
                setActiveProof={setActiveProof}
                proofIndex={proofIndex}
                setProofIndex={setProofIndex}
                currentTime={currentTime}
            />

            <CctvModal
                cctvCameras={cctvCameras}
                selectedCctv={selectedCctv}
                setSelectedCctv={setSelectedCctv}
            />
        </div>
    )
}

export default SecurityStationPage
