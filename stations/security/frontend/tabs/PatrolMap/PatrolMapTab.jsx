import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, CircleMarker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import './PatrolMapModern.css';
import { FaCog, FaPlay, FaPause, FaStop, FaTachometerAlt, FaClipboardList, FaMapMarkedAlt, FaMapSigns, FaExpand, FaCompress, FaTimes } from 'react-icons/fa';
import PatrolLogsView from './PatrolLogsView.jsx';
import CheckpointSettingsView from './CheckpointSettingsView.jsx';

// ═══════════════════════════════════════════════════════════════
// MOBILE WEBVIEW BRIDGE — window.updateGuardLocation
// Flutter injects guard GPS via: _controller.runJavaScript(
//   "updateGuardLocation(userId, lat, lng, guardName)")
// ═══════════════════════════════════════════════════════════════
const _mobileGuardUpdater = { fn: null };
const _mobileGuardRemover = { fn: null };
const _mobileRotate = { fn: null };
const _mobileTargetStation = { fn: null };
const _mobileVerifiedStations = { fn: null };
const _mobileCenterMap = { fn: null };

if (typeof window !== 'undefined') {
  window.updateGuardLocation = (userId, lat, lng, guardName, photoUrl) => {
    if (_mobileGuardUpdater.fn) {
      _mobileGuardUpdater.fn(userId, parseFloat(lat), parseFloat(lng), guardName || 'Guard Mobile', photoUrl || null);
    }
  };

  window.removeGuardMarker = (userId) => {
    if (_mobileGuardRemover.fn) {
      _mobileGuardRemover.fn(userId);
    }
  };

  // Flutter can also call this with JSON string
  window.updateGuardLocationJson = (jsonStr) => {
    try {
      const { userId, lat, lng, guardName, photoUrl, photo } = JSON.parse(jsonStr);
      if (_mobileGuardUpdater.fn) {
        _mobileGuardUpdater.fn(userId, parseFloat(lat), parseFloat(lng), guardName || 'Guard Mobile', photoUrl || photo || null);
      }
    } catch (e) { console.warn('updateGuardLocationJson parse error:', e); }
  };

  // ── TARGET & VERIFIED STATIONS BRIDGE: Flutter calls setTargetStation & setVerifiedStations ──
  window.setTargetStation = (targetId) => {
    if (_mobileTargetStation.fn) {
      _mobileTargetStation.fn(targetId);
    }
  };

  window.setVerifiedStations = (verifiedList) => {
    if (_mobileVerifiedStations.fn) {
      _mobileVerifiedStations.fn(verifiedList);
    }
  };

  // ── ROTATE MAP BRIDGE: Flutter calls window.rotateMap(deltaDegrees) ──
  // e.g. window.rotateMap(45)  → rotate clockwise 45°
  //      window.rotateMap(-45) → rotate counter-clockwise 45°
  //      window.rotateMap(0, true) → reset to 0° (absolute)
  window.rotateMap = (delta, absolute = false) => {
    if (_mobileRotate.fn) _mobileRotate.fn(parseFloat(delta), absolute);
  };

  // ── CENTER MAP BRIDGE: Flutter calls window.centerMap(lat, lng, zoom) ──
  window.centerMap = (lat, lng, zoom) => {
    if (_mobileCenterMap.fn) {
      _mobileCenterMap.fn(parseFloat(lat), parseFloat(lng), zoom ? parseInt(zoom) : null);
    }
  };
}

// Helper Haversine Formula (Meter)
const calculateHaversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// 🛡️ 2D Kalman Filter — Meredam GPS Multipath Error & Bergetar (Jumping GPS)
class KalmanFilter2D {
    constructor(processNoise = 0.00001, measurementNoise = 0.00008) {
        this.q = processNoise;       // Process Noise (Kecepatan pergerakan wajar)
        this.r = measurementNoise;  // Measurement Noise (Variansi eror sensor GPS HP)
        this.lat = null;
        this.lng = null;
        this.pLat = 1;
        this.pLng = 1;
    }

    filter(lat, lng) {
        if (this.lat === null || this.lng === null) {
            this.lat = lat;
            this.lng = lng;
            return [lat, lng];
        }

        // 1. Prediction Step (Estimasi error variance)
        this.pLat = this.pLat + this.q;
        this.pLng = this.pLng + this.q;

        // 2. Measurement Update Step (Hitung Kalman Gain)
        const kLat = this.pLat / (this.pLat + this.r);
        const kLng = this.pLng / (this.pLng + this.r);

        // 3. Update State (Menghaluskan posisi berdasarkan gain)
        this.lat = this.lat + kLat * (lat - this.lat);
        this.lng = this.lng + kLng * (lng - this.lng);

        // 4. Update Covariance
        this.pLat = (1 - kLat) * this.pLat;
        this.pLng = (1 - kLng) * this.pLng;

        return [this.lat, this.lng];
    }
}

// 🛡️ Filter Visualisasi Lintasan Patroli Akurat:
// 1. Hilangkan jitter saat berhenti di pos (< 2.0 meter)
// 2. Cegah pemotongan rute motor (hanya tolak lompatan ekstrim > 1500m yang jelas anomali sensor)
// 3. Jaga agar setiap pergerakan patroli membentuk garis mulus mengikuti pergerakan nyata
const filterCleanTrack = (rawPositions) => {
    if (!rawPositions || rawPositions.length === 0) return [];
    
    // Tahap 1: Eliminasi Stationary Noise (< 2.0 meter) dan hanya buang lonjakan di luar akal (> 1500 meter)
    const stage1Points = [rawPositions[0]];
    for (let i = 1; i < rawPositions.length; i++) {
        const prev = stage1Points[stage1Points.length - 1];
        const curr = rawPositions[i];
        const dist = calculateHaversine(prev[0], prev[1], curr[0], curr[1]);
        
        // Simpan titik jika berpindah >= 2.0m (menghilangkan garis bolak-balik kusut saat berhenti di pos)
        // dan tolak lonjakan anomali > 1500m
        if (dist >= 2.0 && dist <= 1500.0) {
            stage1Points.push(curr);
        }
    }

    if (stage1Points.length < 3) return stage1Points;

    // Tahap 2: Outlier / Spike Filter (Hanya buang lonjakan ekstrem bolak-balik A -> B -> A dalam 1 detik)
    const stage2Points = [stage1Points[0]];
    for (let i = 1; i < stage1Points.length - 1; i++) {
        const pPrev = stage1Points[i - 1];
        const pCurr = stage1Points[i];
        const pNext = stage1Points[i + 1];

        const d1 = calculateHaversine(pPrev[0], pPrev[1], pCurr[0], pCurr[1]);
        const d2 = calculateHaversine(pCurr[0], pCurr[1], pNext[0], pNext[1]);
        const dDirect = calculateHaversine(pPrev[0], pPrev[1], pNext[0], pNext[1]);

        // Jika pCurr melonjak > 50m tetapi pPrev dan pNext berjarak sangat dekat (< 15m), itu adalah false spike pantulan satelit
        const isSpike = (d1 > 50.0 && d2 > 50.0 && dDirect < 15.0);
        if (!isSpike) {
            stage2Points.push(pCurr);
        }
    }
    stage2Points.push(stage1Points[stage1Points.length - 1]);

    return stage2Points;
};

function MapUpdater({ center, zoom, bearing, isFullscreen }) {
    const map = useMap();
    useEffect(() => {
        if (center && zoom) map.setView(center, zoom);
        if (bearing !== undefined && map.setBearing) map.setBearing(bearing);
    }, [center, zoom, bearing, map]);

    useEffect(() => {
        // Trigger resize calculation when toggling fullscreen
        const t1 = setTimeout(() => {
            try { map.invalidateSize(); } catch (e) {}
        }, 100);
        const t2 = setTimeout(() => {
            try { map.invalidateSize(); } catch (e) {}
        }, 350);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isFullscreen, map]);

    return null;
}

function PatrolMapTab({ user, isMobileEmbed = false, mapStations = [], patrolGuards = [], stationCheckpoints = [], patrolTracks = [], cctvCameras = [], setProofIndex, setActiveProof, replaySessionId, setReplaySessionId, isSettingCheckpointsOpen, setIsSettingCheckpointsOpen }) {
    // Check if user is 'dev' role with role_id = 4
    const isDevRole = (() => {
        let u = user;
        if (!u || (!u.role && !u.userRole && !u.role_id && !u.roleId)) {
            try {
                u = JSON.parse(localStorage.getItem('kip_user') || '{}');
            } catch (_) {
                u = {};
            }
        }
        const roleId = Number(u?.role_id ?? u?.roleId ?? 0);
        const roleName = String(u?.role || u?.userRole || u?.role_name || '').toLowerCase().trim();
        return roleId === 4 && (roleName === 'dev' || roleName === 'developer');
    })();

    const initialLat = parseFloat(localStorage.getItem('agrovision_factory_lat')) || null;
    const initialLng = parseFloat(localStorage.getItem('agrovision_factory_lng')) || null;
    const initialZoom = parseInt(localStorage.getItem('agrovision_factory_zoom')) || null;
    const initialBearing = parseInt(localStorage.getItem('agrovision_factory_bearing')) || null;

    const [center, setCenter] = useState(initialLat && initialLng ? [initialLat, initialLng] : null);
    const [zoom, setZoom] = useState(initialZoom || 18);
    const [bearing, setBearing] = useState(initialBearing || 0);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(!!(initialLat && initialLng));
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [showSettings, setShowSettings] = useState(false);
    const [viewMode, setViewMode] = useState('map'); // 'map' or 'logs'
    const [replayOrigin, setReplayOrigin] = useState(null); // 'logs' or null
    const [tempLat, setTempLat] = useState(initialLat || '');
    const [tempLng, setTempLng] = useState(initialLng || '');
    const [tempZoom, setTempZoom] = useState(initialZoom || '');
    const [tempBearing, setTempBearing] = useState(initialBearing || '');

    // Escape key to exit full screen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // ── MOBILE WEBVIEW BRIDGE: live guard positions injected from Flutter ──
    const [mobileGuards, setMobileGuards] = useState({});
    const [mobileTargetSeq, setMobileTargetSeq] = useState(null);
    const [mobileVerifiedKeys, setMobileVerifiedKeys] = useState(null);

    useEffect(() => {
        _mobileGuardUpdater.fn = (userId, lat, lng, guardName, photoUrl) => {
            setMobileGuards(prev => ({
                ...prev,
                [userId]: { 
                    userId, 
                    lat, 
                    lng, 
                    name: guardName, 
                    avatar_photo: photoUrl || (prev[userId] && prev[userId].avatar_photo) || null,
                    lastUpdate: Date.now() 
                }
            }));
        };
        _mobileGuardRemover.fn = (userId) => {
            setMobileGuards(prev => {
                if (!userId) return {};
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        };
        _mobileTargetStation.fn = (targetId) => {
            setMobileTargetSeq(targetId !== '' && targetId !== null && targetId !== undefined ? String(targetId) : null);
        };
        _mobileVerifiedStations.fn = (verifiedList) => {
            try {
                let keys = verifiedList;
                if (typeof verifiedList === 'string') keys = JSON.parse(verifiedList);
                if (Array.isArray(keys)) {
                    setMobileVerifiedKeys(keys.map(k => String(k).toLowerCase().trim()));
                } else if (keys && typeof keys === 'object') {
                    setMobileVerifiedKeys(Object.keys(keys).map(k => String(k).toLowerCase().trim()));
                }
            } catch (err) {
                console.warn('[PatrolMapTab] setVerifiedStations error:', err);
            }
        };
        return () => { 
            _mobileGuardUpdater.fn = null; 
            _mobileGuardRemover.fn = null;
            _mobileTargetStation.fn = null;
            _mobileVerifiedStations.fn = null;
        };
    }, []);

    // Wire rotate map bridge
    useEffect(() => {
        _mobileRotate.fn = (delta, absolute) => {
            setBearing(prev => {
                const next = absolute ? delta : (prev + delta + 360) % 360;
                localStorage.setItem('agrovision_factory_bearing', Math.round(next));
                return next;
            });
        };
        _mobileCenterMap.fn = (lat, lng, newZoom) => {
            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                setCenter([lat, lng]);
                if (newZoom && !isNaN(newZoom)) {
                    setZoom(newZoom);
                }
            }
        };
        return () => { 
            _mobileRotate.fn = null; 
            _mobileCenterMap.fn = null;
        };
    }, []);

    // Replay state
    const [replayData, setReplayData] = useState(null);
    const [replayIndex, setReplayIndex] = useState(0);
    const [replayPlaying, setReplayPlaying] = useState(false);
    const [replaySpeed, setReplaySpeed] = useState(1);
    const replayTimerRef = useRef(null);

    // Fetch map settings from DB API on mount
    useEffect(() => {
        const token = localStorage.getItem('kip_token');
        fetch('/api/security/patrol/map-settings', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.center_latitude && data.center_longitude) {
                const lat = parseFloat(data.center_latitude);
                const lng = parseFloat(data.center_longitude);
                const zm = parseInt(data.default_zoom) || 18;
                const br = parseInt(data.default_bearing) || 0;
                setCenter([lat, lng]);
                setZoom(zm);
                setBearing(br);
                setIsSettingsLoaded(true);
                localStorage.setItem('agrovision_factory_lat', lat);
                localStorage.setItem('agrovision_factory_lng', lng);
                localStorage.setItem('agrovision_factory_zoom', zm);
                localStorage.setItem('agrovision_factory_bearing', br);
                setTempLat(data.center_latitude);
                setTempLng(data.center_longitude);
                setTempZoom(zm);
                setTempBearing(br);
            } else {
                setIsSettingsLoaded(true);
            }
        })
        .catch(err => {
            console.warn('[PatrolMapTab] Error fetching map settings from API:', err);
            setIsSettingsLoaded(true);
        });
    }, []);

    const saveSettings = async () => {
        const parsedLat = parseFloat(String(tempLat).replace(',', '.')) || 3.683095;
        const parsedLng = parseFloat(String(tempLng).replace(',', '.')) || 98.704352;
        const parsedZoom = parseInt(tempZoom) || 18;
        const parsedBearing = parseInt(tempBearing) || 0;

        localStorage.setItem('agrovision_factory_lat', parsedLat);
        localStorage.setItem('agrovision_factory_lng', parsedLng);
        localStorage.setItem('agrovision_factory_zoom', parsedZoom);
        localStorage.setItem('agrovision_factory_bearing', parsedBearing);

        setCenter([parsedLat, parsedLng]);
        setZoom(parsedZoom);
        setBearing(parsedBearing);
        setTempLat(parsedLat);
        setTempLng(parsedLng);
        setTempZoom(parsedZoom);
        setTempBearing(parsedBearing);
        setShowSettings(false);

        // Sync to backend DB
        try {
            const token = localStorage.getItem('kip_token');
            await fetch('/api/security/patrol/map-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    center_latitude: parsedLat,
                    center_longitude: parsedLng,
                    default_zoom: parsedZoom,
                    default_bearing: parsedBearing
                })
            });
        } catch (e) {
            console.warn('[PatrolMapTab] Failed to save settings to API:', e);
        }
    };

    // Fetch replay data when replaySessionId changes
    useEffect(() => {
        if (!replaySessionId) {
            setReplayData(null);
            setReplayIndex(0);
            setReplayPlaying(false);
            if (replayTimerRef.current) clearInterval(replayTimerRef.current);
            return;
        }
        const token = localStorage.getItem('kip_token');
        fetch(`/api/security/patrol/replay/${replaySessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(data => {
            let effectiveTracks = data.tracks || [];
            if (effectiveTracks.length === 0 && data.checkpoints && data.checkpoints.length > 0) {
                effectiveTracks = data.checkpoints
                    .filter(cp => cp.latitude && cp.longitude)
                    .map(cp => ({
                        latitude: cp.latitude,
                        longitude: cp.longitude,
                        recorded_at: cp.verified_at
                    }));
            }
            if (effectiveTracks.length > 0) {
                // 🎯 Pre-calculate exact trigger track index for each checkpoint in replay
                const rawCps = data.checkpoints || [];
                let lastTrackIdx = 0;
                const enrichedCheckpoints = rawCps.map((cp, idx) => {
                    const cpLat = parseFloat(cp.latitude);
                    const cpLng = parseFloat(cp.longitude);
                    let resolvedIdx = -1;

                    // 1. Proximity matching along sequential track points
                    let minDist = Infinity;
                    let bestProxIdx = -1;
                    for (let i = lastTrackIdx; i < effectiveTracks.length; i++) {
                        const t = effectiveTracks[i];
                        if (cpLat && cpLng && t.latitude && t.longitude) {
                            const d = calculateHaversine(cpLat, cpLng, parseFloat(t.latitude), parseFloat(t.longitude));
                            if (d < minDist) {
                                minDist = d;
                                bestProxIdx = i;
                            }
                        }
                    }

                    if (bestProxIdx !== -1 && minDist <= 50) {
                        resolvedIdx = bestProxIdx;
                        lastTrackIdx = bestProxIdx;
                    } else {
                        // 2. Timestamp fallback matching
                        const cpTime = cp.verified_at ? new Date(cp.verified_at).getTime() : null;
                        if (cpTime) {
                            let minTimeDiff = Infinity;
                            let bestTimeIdx = -1;
                            effectiveTracks.forEach((t, i) => {
                                const diff = Math.abs(new Date(t.recorded_at).getTime() - cpTime);
                                if (diff < minTimeDiff) {
                                    minTimeDiff = diff;
                                    bestTimeIdx = i;
                                }
                            });
                            resolvedIdx = bestTimeIdx !== -1 ? bestTimeIdx : lastTrackIdx;
                            lastTrackIdx = Math.max(lastTrackIdx, resolvedIdx);
                        } else {
                            resolvedIdx = Math.min(effectiveTracks.length - 1, Math.round(((idx + 1) / (rawCps.length + 1)) * effectiveTracks.length));
                            lastTrackIdx = resolvedIdx;
                        }
                    }

                    return { ...cp, triggerTrackIndex: resolvedIdx };
                });

                setReplayData({ ...data, tracks: effectiveTracks, checkpoints: enrichedCheckpoints });
                setReplayIndex(0);
                setReplayPlaying(true);
            }
        })
        .catch(err => console.error('Replay fetch error:', err));
    }, [replaySessionId]);

    // Replay animation timer
    useEffect(() => {
        if (replayTimerRef.current) clearInterval(replayTimerRef.current);
        if (!replayPlaying || !replayData) return;

        const totalPoints = replayData.tracks.length;
        replayTimerRef.current = setInterval(() => {
            setReplayIndex(prev => {
                if (prev >= totalPoints - 1) {
                    setReplayPlaying(false);
                    return totalPoints - 1;
                }
                return prev + 1;
            });
        }, 150 / replaySpeed);

        return () => clearInterval(replayTimerRef.current);
    }, [replayPlaying, replayData, replaySpeed]);

    const stopReplay = useCallback(() => {
        setReplaySessionId(null);
        setReplayOrigin(null);
    }, [setReplaySessionId]);

    const isReplayMode = !!replayData;

    // Helper matcher to link a station entity with a verified checkpoint record
    const matchCheckpointToStation = (cp, station) => {
        if (!cp || !station) return false;
        if (cp.station_id && String(cp.station_id) === String(station.id)) return true;
        const cpName = String(cp.station_name || cp.checkpoint_code || '').toLowerCase().trim();
        const stName = String(station.station_name || station.label || '').toLowerCase().trim();
        const stKey = String(station.station_key || station.key || '').toLowerCase().trim();
        const stCode = String(station.checkpoint_code || '').toLowerCase().trim();

        if (cpName && (cpName === stName || cpName === stKey || cpName === stCode)) return true;
        if (stName && cpName.includes(stName)) return true;
        if (stKey && cpName.includes(stKey)) return true;
        return false;
    };

    // Which checkpoints have been reached in replay up to current replayIndex
    const replayVisibleCheckpoints = isReplayMode ? (replayData.checkpoints || []).filter((cp) => {
        if (cp.triggerTrackIndex !== undefined && cp.triggerTrackIndex !== null && cp.triggerTrackIndex >= 0) {
            return replayIndex >= cp.triggerTrackIndex;
        }
        if (!replayData.tracks[replayIndex]) return false;
        const currentTime = new Date(replayData.tracks[replayIndex].recorded_at);
        return new Date(cp.verified_at) <= currentTime;
    }) : [];

    // Replay trail (only up to current index, filtered with filterCleanTrack for smooth single-line route)
    const replayRawPositions = isReplayMode
        ? replayData.tracks.slice(0, replayIndex + 1).map(t => [parseFloat(t.latitude) + 0, parseFloat(t.longitude) + 0])
        : [];
    const replayTrailPositions = filterCleanTrack(replayRawPositions);

    // Current replay avatar position
    const replayCurrentPos = isReplayMode && replayData.tracks[replayIndex]
        ? [parseFloat(replayData.tracks[replayIndex].latitude) + 0, parseFloat(replayData.tracks[replayIndex].longitude) + 0]
        : null;

    const getStationData = (cp, latestLog = null) => {
        if (!latestLog) {
            return {
                status: 'PENDING',
                lastCheck: 'Not Checked',
                activeProofImg: null,
                activeGuardName: 'None',
                proofs: []
            };
        }
        return {
            status: 'SECURE',
            lastCheck: new Date(latestLog.verified_at).toLocaleTimeString('id-ID'),
            activeProofImg: latestLog.verification_photo || null,
            activeGuardName: latestLog.guard_name || `Guard`,
            proofs: [{
                guard: latestLog.guard_name || `Guard`,
                id: latestLog.session_id,
                img: latestLog.verification_photo || null,
                time: new Date(latestLog.verified_at).toLocaleTimeString('id-ID'),
                date: new Date(latestLog.verified_at).toLocaleDateString('id-ID')
            }]
        };
    };

    const createGuardIcon = (guard, color = '#fbbf24', searching = false) => {
        const initial = (guard.name || guard.guard_name || '?').charAt(0).toUpperCase();
        const avatarImg = guard.avatar_photo || guard.photo || guard.photo_url || guard.latest_photo || null;
        const photoHtml = avatarImg
            ? `<img src="${avatarImg}" alt="G" style="width:100%;height:100%;object-fit:cover;border-radius:50% !important;" />`
            : `<span style="color:#fff;font-size:15px;font-weight:800;">${initial}</span>`;
        const borderColor = searching ? '#ef4444' : color;
        const tagExtra = searching ? `<div style="font-size:8px;color:#ef4444;font-weight:700;margin-top:2px;">📡 Searching GPS...</div>` : '';
        return L.divIcon({
            className: 'custom-guard-icon',
            html: `
                <div style="position:absolute;bottom:0px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;z-index:99999;pointer-events:none;">
                    <div style="background:rgba(0,0,0,0.8);color:#fff;padding:4px 8px;border-radius:4px !important;font-size:11px;font-weight:bold;margin-bottom:4px;white-space:nowrap;border:1px solid #fbbf24;">${guard.name || guard.guard_name || 'Guard'}</div>
                    ${tagExtra}
                    <div style="position:relative;width:44px;height:44px;">
                        <div style="width:44px;height:44px;border-radius:50% !important;border:3px solid ${borderColor};overflow:hidden;background:#1e293b;display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px ${borderColor};box-sizing:border-box;">
                            ${photoHtml}
                        </div>
                        <div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50% !important;border:2px solid ${borderColor};opacity:0.5;box-sizing:border-box;"></div>
                        <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${borderColor};"></div>
                    </div>
                </div>
            `,
            iconSize: [44, 70],
            iconAnchor: [22, 70]
        });
    };

    const createCheckpointIcon = (cp, isVerified = false, isNextTarget = false) => {
        const seq = cp.sequence_order !== undefined && cp.sequence_order !== null ? cp.sequence_order : '';
        
        let bgColor = '#f8fafc'; // Default: Belum dikunjungi (Putih cerah)
        let labelColor = '#ffffff'; 
        let shadow = '0 0 4px rgba(0,0,0,0.8)';
        
        if (isVerified) {
            bgColor = '#fbbf24'; // Kuning (Selesai)
            labelColor = '#fbbf24';
        } else if (isNextTarget) {
            bgColor = '#ef4444'; // Merah (Target Selanjutnya)
            labelColor = '#ef4444';
            shadow = '0 0 10px #ef4444, 0 0 4px rgba(0,0,0,0.8)';
        }

        const seqBadge = seq ? `<span style="background: ${bgColor}; color: #0f172a; padding: 1px 5px; border-radius: 8px; font-size: 10px; font-weight: 800; margin-right: 4px; box-shadow: ${shadow};">#${seq}</span>` : '';
        
        let displayLabelText = cp.station_name || cp.checkpoint_code || `CP-${cp.id}`;
        
        if (isMobileEmbed) {
            // Mobile UX: Sembunyikan label panjang kecuali untuk target selanjutnya
            if (!isNextTarget) {
                displayLabelText = ''; 
            }
        }

        const labelHtml = displayLabelText ? `<div class="pm-cp-label" style="color: ${labelColor}; text-shadow: 1px 1px 2px black, -1px -1px 2px black; font-weight: bold;">${seqBadge}${displayLabelText}</div>` : `<div class="pm-cp-label">${seqBadge}</div>`;

        return L.divIcon({
            className: 'custom-cp-icon',
            html: `<div class="pm-cp-marker"><div class="pm-cp-dot" style="background: ${bgColor}; box-shadow: ${shadow}; border: 1.5px solid #0f172a;"></div>${labelHtml}</div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
    };

    if (isMobileEmbed) {
        return (
            <div style={{ width: '100vw', height: '100vh', background: '#0f172a', margin: 0, padding: 0, overflow: 'hidden' }}>
                {(!isSettingsLoaded || !center) ? (
                    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                        Loading Patrol Map...
                    </div>
                ) : (
                    <MapContainer center={center} zoom={zoom} rotate={true} bearing={bearing} touchRotate={true} style={{ width: '100%', height: '100%', zIndex: 1 }} zoomControl={true} attributionControl={false} dragging={true} touchZoom={true} doubleClickZoom={true} scrollWheelZoom={true}>
                        <MapUpdater center={center} zoom={zoom} bearing={bearing} />
                        <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={22} />

                    {isReplayMode ? (
                        <>
                            {/* Replay trail (drawn progressively) */}
                            {replayTrailPositions.length > 1 && (
                                <Polyline
                                    positions={replayTrailPositions}
                                    pathOptions={{ color: '#ff0055', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round', className: 'pm-track-replay-glow' }}
                                />
                            )}

                            {/* Replay checkpoints */}
                            {mapStations.map((station, i) => {
                                if (!station.latitude || !station.longitude) return null;
                                const logsForStation = replayVisibleCheckpoints.filter(cp => matchCheckpointToStation(cp, station));
                                const latestLog = logsForStation.length > 0 ? logsForStation[0] : null;
                                const sData = getStationData(station, latestLog);
                                
                                const isVerified = !!latestLog;
                                const sortedReplayStations = [...mapStations]
                                    .filter(s => s.latitude && s.longitude)
                                    .sort((a, b) => (Number(a.sequence_order) || Number(a.id)) - (Number(b.sequence_order) || Number(b.id)));
                                const nextReplayTarget = sortedReplayStations.find(s => 
                                    !replayVisibleCheckpoints.some(cp => matchCheckpointToStation(cp, s))
                                );
                                const isNextTarget = nextReplayTarget && nextReplayTarget.id === station.id;

                                const stLat = parseFloat(station.latitude) + 0;
                                const stLng = parseFloat(station.longitude) + 0;
                                const radiusM = parseFloat(station.radius_meters) > 0 ? parseFloat(station.radius_meters) : 30;
                                
                                let isInsideRadius = false;
                                if (replayCurrentPos) {
                                    const dist = calculateHaversine(replayCurrentPos[0], replayCurrentPos[1], stLat, stLng);
                                    isInsideRadius = dist <= radiusM;
                                }

                                const circleColor = isInsideRadius ? '#10b981' : (isNextTarget ? '#ef4444' : '#10b981');
                                const circleOpacity = (isNextTarget || isInsideRadius) ? 0.28 : 0.15;
                                const showRadiusCircle = isNextTarget || isInsideRadius;

                                return (
                                    <React.Fragment key={`rcp-m-frag-${station.id || i}`}>
                                        {/* Dynamic Checkpoint Radius Circle: Only active target or guard inside radius */}
                                        {showRadiusCircle && (
                                            <Circle
                                                center={[stLat, stLng]}
                                                radius={radiusM}
                                                pathOptions={{
                                                    color: circleColor,
                                                    fillColor: circleColor,
                                                    fillOpacity: circleOpacity,
                                                    weight: isNextTarget ? 2.5 : 1.5,
                                                    dashArray: isInsideRadius ? undefined : '4, 4'
                                                }}
                                            />
                                        )}
                                        <Marker
                                            key={`rcp-m-${i}`}
                                            position={[stLat, stLng]}
                                            icon={createCheckpointIcon(station, isVerified, isNextTarget)}
                                        >
                                            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="pm-hover-tooltip">
                                                <div className="pm-tooltip-card">
                                                    <div className="pm-tooltip-title">{station.station_name}</div>
                                                    <div className="pm-tooltip-meta">
                                                        Radius: {radiusM}m • {isInsideRadius ? 'Guard Inside Radius' : sData.lastCheck}
                                                    </div>
                                                </div>
                                            </Tooltip>
                                        </Marker>
                                    </React.Fragment>
                                );
                            })}

                            {/* Replay guard avatar */}
                            {replayCurrentPos && (
                                <Marker
                                    key={`replay-avatar-${replayData.session?.id || 'rep'}-${replayData.session?.avatar_photo || 'init'}`}
                                    position={replayCurrentPos}
                                    icon={createGuardIcon(replayData.session, '#ff0055')}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            {/* LIVE: Patrol track polyline */}
                            {patrolTracks.filter(t => t.latitude && t.longitude).reduce((acc, curr) => {
                                let group = acc.find(g => g[0].session_id === curr.session_id);
                                if (!group) { group = []; acc.push(group); }
                                group.push(curr);
                                return acc;
                            }, []).map(pts => {
                                const sorted = [...pts].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
                                const rawPositions = sorted.map(t => [parseFloat(t.latitude), parseFloat(t.longitude)]);
                                let positions = filterCleanTrack(rawPositions).map(p => [p[0] + 0, p[1] + 0]);
                                
                                // Sambungkan ujung lintasan merah secara presisi dan dinamis ke avatar guard aktif
                                const activeGuard = patrolGuards.find(g => (g.session_id === sorted[0].session_id || g.user_id === sorted[0].guard_id) && g.latitude && g.longitude)
                                    || Object.values(mobileGuards).find(mg => mg && mg.lat && mg.lng);
                                if (activeGuard) {
                                    const guardLat = parseFloat(activeGuard.latitude || activeGuard.lat);
                                    const guardLng = parseFloat(activeGuard.longitude || activeGuard.lng);
                                    if (!isNaN(guardLat) && !isNaN(guardLng)) {
                                        const guardPos = [guardLat, guardLng];
                                        const lastPos = positions[positions.length - 1];
                                        if (!lastPos || calculateHaversine(lastPos[0], lastPos[1], guardPos[0], guardPos[1]) > 0.3) {
                                            positions = [...positions, guardPos];
                                        }
                                    }
                                }
                                
                                if (positions.length < 2) return null;

                                return (
                                    <React.Fragment key={`lt-m-${sorted[0].session_id}`}>
                                        {/* Outer glowing halo */}
                                        <Polyline positions={positions} pathOptions={{ color: '#ff0055', weight: 8, opacity: 0.25, lineCap: 'round', lineJoin: 'round', className: 'pm-track-halo' }} />
                                        {/* Main clean route polyline */}
                                        <Polyline positions={positions} pathOptions={{ color: '#ff0055', weight: 3.5, opacity: 0.95, lineCap: 'round', lineJoin: 'round', smoothFactor: 1.2 }} />
                                        {/* Titik awal patroli (Start dot) */}
                                        {positions.length > 0 && (
                                            <CircleMarker center={positions[0]} radius={4} pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#10b981', fillOpacity: 1 }} />
                                        )}
                                    </React.Fragment>
                                );
                            })}

                            {/* LIVE: Checkpoint markers */}
                            {mapStations.map(station => {
                                if (!station.latitude || !station.longitude) return null;
                                
                                const logsForStation = stationCheckpoints.filter(cp => cp.station_id === station.id || cp.station_name === station.station_name);
                                const latestLog = logsForStation.length > 0 ? logsForStation[0] : null;
                                const sData = getStationData(station, latestLog);
                                
                                const handleMarkerClick = () => {
                                    if (window.MapMarkerChannel && window.MapMarkerChannel.postMessage) {
                                        window.MapMarkerChannel.postMessage(JSON.stringify({
                                            title: station.station_name,
                                            time: sData.lastCheck,
                                            guard: sData.activeGuardName,
                                            photo: sData.activeProofImg,
                                            lat: station.latitude,
                                            lng: station.longitude
                                        }));
                                    }
                                };
                                const stNameLower = (station.station_name || station.label || '').toLowerCase().trim();
                                const stKeyLower = (station.station_key || station.key || '').toLowerCase().trim();
                                const stCodeLower = (station.checkpoint_code || '').toLowerCase().trim();
                                const isVerified = mobileVerifiedKeys 
                                    ? mobileVerifiedKeys.some(k => k === stNameLower || k === stKeyLower || k === stCodeLower || k === String(station.id) || k === String(station.sequence_order))
                                    : !!latestLog;

                                let isNextTarget = false;
                                if (mobileTargetSeq !== null && mobileTargetSeq !== undefined && mobileTargetSeq !== '') {
                                    // Target dicocokkan secara spesifik: utamakan sequence_order, checkpoint_code, atau nama station
                                    isNextTarget = (station.sequence_order !== undefined && station.sequence_order !== null && String(station.sequence_order) === String(mobileTargetSeq)) ||
                                                   (stCodeLower && stCodeLower === String(mobileTargetSeq).toLowerCase().trim()) ||
                                                   (stNameLower && stNameLower === String(mobileTargetSeq).toLowerCase().trim());
                                } else {
                                    const sortedLiveStations = [...mapStations].filter(s => s.latitude && s.longitude).sort((a, b) => (a.sequence_order || a.id) - (b.sequence_order || b.id));
                                    const nextLiveTarget = sortedLiveStations.find(s => {
                                        const sName = (s.station_name || s.label || '').toLowerCase().trim();
                                        const sKey = (s.station_key || s.key || '').toLowerCase().trim();
                                        const sCode = (s.checkpoint_code || '').toLowerCase().trim();
                                        if (mobileVerifiedKeys) {
                                            return !mobileVerifiedKeys.some(k => k === sName || k === sKey || k === sCode || (s.sequence_order !== undefined && k === String(s.sequence_order)));
                                        }
                                        return stationCheckpoints.filter(cp => cp.station_id === s.id || cp.station_name === s.station_name).length === 0;
                                    });
                                    isNextTarget = nextLiveTarget && nextLiveTarget.id === station.id;
                                }

                                return (
                                    <React.Fragment key={`cp-frag-${station.id}`}>
                                        {isNextTarget && (
                                                <Circle 
                                                    center={[parseFloat(station.latitude) + 0, parseFloat(station.longitude) + 0]} 
                                                    radius={parseFloat(station.radius_meters) > 0 ? parseFloat(station.radius_meters) : 10} 
                                                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25, weight: 3 }} 
                                                />
                                        )}
                                        <Marker 
                                            key={`cp-m-${station.id}`} 
                                            position={[parseFloat(station.latitude) + 0, parseFloat(station.longitude) + 0]} 
                                            icon={createCheckpointIcon(station, isVerified, isNextTarget)}
                                            eventHandlers={{ click: handleMarkerClick }}
                                        >
                                            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="pm-hover-tooltip">
                                                <div className="pm-tooltip-card" onClick={handleMarkerClick}>
                                                    <div className="pm-tooltip-title">{station.station_name}</div>
                                                    <div className="pm-tooltip-meta">{sData.lastCheck} • {sData.activeGuardName}</div>
                                                    {sData.activeProofImg && (
                                                        <div className="pm-tooltip-photo">
                                                            <img src={sData.activeProofImg} alt="Bukti" />
                                                            <div className="pm-click-hint">KLIK UNTUK PERBESAR</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Tooltip>
                                        </Marker>
                                    </React.Fragment>
                                );
                            })}

                             {/* LIVE: Guard avatars (including bridge mobile guards) */}
                            {(() => {
                                const merged = [...patrolGuards];
                                Object.values(mobileGuards).forEach(mg => {
                                    if (mg && mg.lat && mg.lng) {
                                        const mgId = String(mg.userId || mg.id || '');
                                        const mgName = (mg.name || '').toLowerCase();
                                        
                                        const existingIdx = merged.findIndex(g => {
                                            const gId = String(g.user_id || g.id || g.session_id || '');
                                            const gName = (g.guard_name || g.name || '').toLowerCase();
                                            return (mgId && gId === mgId) || (mgName && gName === mgName);
                                        });

                                        const guardItem = {
                                            session_id: mg.userId || mg.id,
                                            guard_name: mg.name || 'Guard Mobile',
                                            latitude: mg.lat,
                                            longitude: mg.lng,
                                            avatar_photo: mg.avatar_photo || null,
                                            photo: mg.avatar_photo || null,
                                            status: 'active'
                                        };
                                        if (existingIdx >= 0) {
                                            merged[existingIdx] = { 
                                                ...merged[existingIdx], 
                                                ...guardItem,
                                                avatar_photo: mg.avatar_photo || merged[existingIdx].avatar_photo || null,
                                                photo: mg.avatar_photo || merged[existingIdx].photo || null
                                            };
                                        } else {
                                            merged.push(guardItem);
                                        }
                                    }
                                });

                                return merged.map((guard, idx) => {
                                    const hasGps = !!(guard.latitude && guard.longitude);
                                    if (!hasGps) return null;
                                    const pos = [parseFloat(guard.latitude), parseFloat(guard.longitude)];
                                    const avatarId = guard.avatar_photo || guard.photo || guard.latest_photo || 'initial';
                                    return (
                                        <Marker key={`guard-m-${guard.session_id || idx}-${avatarId}`} position={pos} icon={createGuardIcon(guard)} zIndexOffset={10000}>
                                            <Tooltip direction="top" offset={[0, -45]} opacity={1} className="pm-hover-tooltip">
                                                <div className="pm-tooltip-card">
                                                    <div className="pm-tooltip-title">{guard.guard_name || guard.name || 'Guard Mobile'}</div>
                                                    <div className="pm-tooltip-meta">Active Patrol</div>
                                                </div>
                                            </Tooltip>
                                        </Marker>
                                    );
                                });
                            })()}
                        </>
                    )}
                </MapContainer>
                )}
            </div>
        );
    }

    if (viewMode === 'logs') {
        return (
            <PatrolLogsView 
                onBack={() => setViewMode('map')} 
                onReplaySession={(sessionId) => {
                    setReplaySessionId(sessionId);
                    setReplayOrigin('logs');
                    setViewMode('map');
                }}
            />
        );
    }

    if (viewMode === 'settings' || isSettingCheckpointsOpen) {
        return <CheckpointSettingsView onBack={() => {
            setViewMode('map');
            if (setIsSettingCheckpointsOpen) setIsSettingCheckpointsOpen(false);
        }} />;
    }

    return (
        <div 
            className={`som-view-container overview-grid ${isFullscreen ? 'pm-fullscreen-wrapper' : ''}`} 
            style={isFullscreen ? {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999999,
                margin: 0,
                padding: 0,
                background: '#0b1120',
                overflow: 'hidden'
            } : { position: 'relative' }}
        >
            {/* Settings Modal (Only accessible for role 'dev' with role_id = 4) */}
            {isDevRole && showSettings && (
                <div className="pm-settings-overlay">
                    <div className="pm-settings-modal">
                        <h3 className="pm-settings-title">Factory Location Settings</h3>
                        <div className="pm-field"><label>Latitude</label><input type="text" value={tempLat} onChange={e => setTempLat(e.target.value)} /></div>
                        <div className="pm-field"><label>Longitude</label><input type="text" value={tempLng} onChange={e => setTempLng(e.target.value)} /></div>
                        <div className="pm-field"><label>Zoom Level</label><input type="number" step="1" min="1" max="22" value={tempZoom} onChange={e => setTempZoom(e.target.value)} /></div>
                        <div className="pm-field"><label>Map Rotation (Degrees)</label><input type="number" step="1" min="0" max="360" value={tempBearing} onChange={e => setTempBearing(e.target.value)} /></div>

                        <div className="pm-settings-actions">
                            <button onClick={() => setShowSettings(false)} className="pm-btn-cancel">Cancel</button>
                            <button onClick={saveSettings} className="pm-btn-save">Save</button>
                        </div>
                    </div>
                </div>
            )}

            <section 
                className={`som-patrol-map-section mini ${isFullscreen ? 'pm-fullscreen-mode' : ''}`}
                style={isFullscreen ? {
                    width: '100vw',
                    height: '100vh',
                    margin: 0,
                    padding: '14px 20px',
                    boxSizing: 'border-box',
                    background: '#0b1120',
                    display: 'flex',
                    flexDirection: 'column'
                } : {}}
            >
                {!isMobileEmbed && (
                    <div className="som-section-header">
                        <div className="som-section-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="dot animate-ping" style={{ backgroundColor: isReplayMode ? '#f59e0b' : '#ffdb3b' }}></span>
                                {isReplayMode ? `REPLAY: ${replayData.session.guard_name}` : 'LIVE PATROL MAP'}
                            </div>
                            
                            {!isReplayMode && (
                                <button
                                    onClick={() => setViewMode('logs')}
                                    style={{
                                        background: '#0f172a',
                                        border: '1px solid #ffdb3b',
                                        color: '#ffdb3b',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#ffdb3b';
                                        e.currentTarget.style.color = '#0f172a';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#0f172a';
                                        e.currentTarget.style.color = '#ffdb3b';
                                    }}
                                >
                                    <FaClipboardList style={{ fontSize: '12px' }} /> Patrol Logs
                                </button>
                            )}
                        </div>
                        <div className="som-map-legend" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {isReplayMode && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="legend-item" title="Verified checkpoint"><span className="dot selesai"></span> COMPLETED</span>
                                    <span className="legend-item" title="Target checkpoint radius"><span className="dot target"></span> TARGET RADIUS</span>
                                    <button onClick={stopReplay} className="pm-stop-replay-btn">
                                        <FaStop style={{ marginRight: '5px' }} /> Back to Live
                                    </button>
                                    {replayOrigin === 'logs' && (
                                        <button 
                                            onClick={() => {
                                                setReplaySessionId(null);
                                                setReplayOrigin(null);
                                                setViewMode('logs');
                                            }} 
                                            className="pm-stop-replay-btn"
                                            style={{ background: '#0284c7', borderColor: '#38bdf8', color: '#ffffff' }}
                                        >
                                            <FaClipboardList style={{ marginRight: '5px' }} /> Back to Logs
                                        </button>
                                    )}
                                </div>
                            )}
                            {!isReplayMode && (
                                <>
                                    <span className="legend-item"><span className="dot selesai"></span> COMPLETED</span>
                                    <span className="legend-item"><span className="dot target"></span> TARGET</span>
                                    <span className="legend-item"><span className="dot pending"></span> PENDING</span>
                                    <span className="legend-item"><span className="dot guard"></span> GUARD</span>
                                </>
                            )}
                            {isDevRole && (
                                <button 
                                    onClick={() => setShowSettings(true)} 
                                    title="Factory Location Settings"
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', padding: '0 5px', transition: 'color 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffdb3b'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                >
                                    <FaCog />
                                </button>
                            )}
                            <button 
                                onClick={() => setIsFullscreen(!isFullscreen)} 
                                title={isFullscreen ? "Exit Full Screen" : "Full Screen Map"}
                                style={{ 
                                    background: isFullscreen ? '#ffdb3b' : 'transparent', 
                                    border: isFullscreen ? '1px solid #ffdb3b' : '1px solid #334155', 
                                    color: isFullscreen ? '#0f172a' : '#94a3b8', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontSize: '13px', 
                                    padding: '4px 7px', 
                                    borderRadius: '6px',
                                    transition: 'all 0.2s' 
                                }}
                                onMouseEnter={(e) => {
                                    if (!isFullscreen) {
                                        e.currentTarget.style.color = '#ffdb3b';
                                        e.currentTarget.style.borderColor = '#ffdb3b';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isFullscreen) {
                                        e.currentTarget.style.color = '#94a3b8';
                                        e.currentTarget.style.borderColor = '#334155';
                                    }
                                }}
                            >
                                {isFullscreen ? <FaCompress /> : <FaExpand />}
                            </button>
                        </div>
                    </div>
                )}

                <div 
                    className="som-patrol-map-container mini-map real-map-container" 
                    style={{ 
                        position: 'relative', 
                        height: isFullscreen ? 'calc(100% - 48px)' : '100%', 
                        flex: isFullscreen ? '1' : undefined,
                        minHeight: isMobileEmbed ? '100vh' : (isFullscreen ? 'auto' : '500px'), 
                        backgroundColor: '#0f172a', 
                        borderRadius: isMobileEmbed ? '0px' : '10px', 
                        overflow: 'hidden' 
                    }}
                >

                    {/* Floating Exit Full Screen button (Aligned symmetrically with zoom control at top: 48px, right: 28px) */}
                    {isFullscreen && (
                        <button
                            onClick={() => setIsFullscreen(false)}
                            title="Tutup Layar Penuh (Esc)"
                            className="pm-exit-fullscreen-btn"
                            style={{
                                position: 'absolute',
                                top: '48px',
                                right: '28px',
                                zIndex: 1000,
                                background: '#0f172a',
                                border: '1px solid #ffdb3b',
                                color: '#ffdb3b',
                                padding: '8px 18px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                fontWeight: '800',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                                transition: 'all 0.15s',
                                letterSpacing: '0.04em'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ffdb3b';
                                e.currentTarget.style.color = '#0f172a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#0f172a';
                                e.currentTarget.style.color = '#ffdb3b';
                            }}
                        >
                            <FaTimes style={{ fontSize: '14px' }} />
                            <span>EXIT FULL SCREEN</span>
                        </button>
                    )}

                    {(!isSettingsLoaded || !center) ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                            Loading Patrol Map...
                        </div>
                    ) : (
                        <MapContainer center={center} zoom={zoom} rotate={true} bearing={bearing} touchRotate={true} style={{ width: '100%', height: '100%', zIndex: 1 }} zoomControl={true} attributionControl={false} dragging={true} touchZoom={true} doubleClickZoom={true} scrollWheelZoom={true}>
                            <MapUpdater center={center} zoom={zoom} bearing={bearing} isFullscreen={isFullscreen} />
                            <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={22} />

                        {isReplayMode ? (
                            <>
                                {/* Replay trail (drawn progressively) */}
                                {replayTrailPositions.length > 1 && (
                                    <Polyline
                                        positions={replayTrailPositions}
                                        pathOptions={{ color: '#ff0055', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round', className: 'pm-track-replay-glow' }}
                                    />
                                )}

                                {/* Replay checkpoints (appear as avatar passes them) */}
                                {mapStations.map((station, i) => {
                                    if (!station.latitude || !station.longitude) return null;
                                    const logsForStation = replayVisibleCheckpoints.filter(cp => matchCheckpointToStation(cp, station));
                                    const latestLog = logsForStation.length > 0 ? logsForStation[0] : null;
                                    const sData = getStationData(station, latestLog);
                                    
                                    const isVerified = !!latestLog;
                                    const sortedReplayStations = [...mapStations]
                                        .filter(s => s.latitude && s.longitude)
                                        .sort((a, b) => (Number(a.sequence_order) || Number(a.id)) - (Number(b.sequence_order) || Number(b.id)));
                                    const nextReplayTarget = sortedReplayStations.find(s => 
                                        !replayVisibleCheckpoints.some(cp => matchCheckpointToStation(cp, s))
                                    );
                                    const isNextTarget = nextReplayTarget && nextReplayTarget.id === station.id;

                                    const stLat = parseFloat(station.latitude) + 0;
                                    const stLng = parseFloat(station.longitude) + 0;
                                    const radiusM = parseFloat(station.radius_meters) > 0 ? parseFloat(station.radius_meters) : 30;
                                    
                                    let isInsideRadius = false;
                                    if (replayCurrentPos) {
                                        const dist = calculateHaversine(replayCurrentPos[0], replayCurrentPos[1], stLat, stLng);
                                        isInsideRadius = dist <= radiusM;
                                    }

                                    const circleColor = isInsideRadius ? '#10b981' : (isNextTarget ? '#ef4444' : '#10b981');
                                    const circleOpacity = (isNextTarget || isInsideRadius) ? 0.28 : 0.15;
                                    const showRadiusCircle = isNextTarget || isInsideRadius;
                                    
                                    return (
                                        <React.Fragment key={`rcp-frag-${station.id || i}`}>
                                            {/* Dynamic Radius Circle: Only active target or guard inside radius */}
                                            {showRadiusCircle && (
                                                <Circle
                                                    center={[stLat, stLng]}
                                                    radius={radiusM}
                                                    pathOptions={{
                                                        color: circleColor,
                                                        fillColor: circleColor,
                                                        fillOpacity: circleOpacity,
                                                        weight: isNextTarget ? 2.5 : 1.5,
                                                        dashArray: isInsideRadius ? undefined : '4, 4'
                                                    }}
                                                />
                                            )}
                                            <Marker
                                                key={`rcp-${i}`}
                                                position={[stLat, stLng]}
                                                icon={createCheckpointIcon(station, isVerified, isNextTarget)}
                                                eventHandlers={{ click: () => { setProofIndex(0); setActiveProof({ name: station.station_name, ...sData }); } }}
                                            >
                                                <Tooltip direction="top" offset={[0, -10]} opacity={1} className="pm-hover-tooltip">
                                                    <div className="pm-tooltip-card">
                                                        <div className="pm-tooltip-title">{station.station_name}</div>
                                                        <div className="pm-tooltip-meta">
                                                            Radius: {radiusM}m • {isInsideRadius ? 'Guard Inside Radius' : sData.lastCheck}
                                                        </div>
                                                        {sData.activeProofImg && (
                                                            <div className="pm-tooltip-photo">
                                                                <img src={sData.activeProofImg} alt="Proof" />
                                                                <div className="pm-click-hint">Click to enlarge</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Tooltip>
                                            </Marker>
                                        </React.Fragment>
                                    );
                                })}

                                {/* Replay guard avatar */}
                                {replayCurrentPos && (
                                    <Marker
                                        key={`replay-avatar-${replayData.session?.id || 'rep'}-${replayData.session?.avatar_photo || 'init'}`}
                                        position={replayCurrentPos}
                                        icon={createGuardIcon(replayData.session, '#f59e0b')}
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                {/* LIVE: GPS Tracks per session */}
                                {patrolTracks && Object.values(
                                    patrolTracks.reduce((acc, t) => {
                                        if (!t.latitude || !t.longitude) return acc;
                                        if (!acc[t.session_id]) acc[t.session_id] = [];
                                        acc[t.session_id].push(t);
                                        return acc;
                                    }, {})
                                ).map(pts => {
                                    const sorted = [...pts].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
                                    const rawPositions = sorted.map(t => [parseFloat(t.latitude), parseFloat(t.longitude)]);
                                    let positions = filterCleanTrack(rawPositions).map(p => [p[0] + 0, p[1] + 0]);
                                    
                                    // Sambungkan titik akhir lintasan secara presisi ke marker guard aktif jika ada
                                    const activeGuard = patrolGuards.find(g => (g.session_id === sorted[0].session_id || g.user_id === sorted[0].guard_id) && g.latitude && g.longitude)
                                        || Object.values(mobileGuards).find(mg => mg && mg.lat && mg.lng);
                                    if (activeGuard) {
                                        const guardLat = parseFloat(activeGuard.latitude || activeGuard.lat);
                                        const guardLng = parseFloat(activeGuard.longitude || activeGuard.lng);
                                        if (!isNaN(guardLat) && !isNaN(guardLng)) {
                                            const guardPos = [guardLat, guardLng];
                                            const lastPos = positions[positions.length - 1];
                                            if (!lastPos || calculateHaversine(lastPos[0], lastPos[1], guardPos[0], guardPos[1]) > 0.3) {
                                                positions = [...positions, guardPos];
                                            }
                                        }
                                    }
                                    
                                    if (positions.length < 2) return null;

                                    return (
                                            <React.Fragment key={`lt-${sorted[0].session_id}`}>
                                                {/* Halo Glow */}
                                                <Polyline
                                                    positions={positions}
                                                    pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.2, lineCap: 'round', lineJoin: 'round', className: 'pm-track-halo' }}
                                                />
                                                {/* Core Track (Thin Solid Line + Smoothing) */}
                                                <Polyline
                                                    positions={positions}
                                                    pathOptions={{ color: '#ef4444', weight: 2, opacity: 0.8, lineCap: 'round', lineJoin: 'round', smoothFactor: 1.5 }}
                                                />
                                                {/* Titik awal patroli (Start dot) */}
                                                {positions.length > 0 && (
                                                    <CircleMarker
                                                        center={positions[0]}
                                                        radius={4}
                                                        pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#10b981', fillOpacity: 1 }}
                                                    />
                                                )}
                                            </React.Fragment>
                                    );
                                })}

                                {/* LIVE: Planned sequence patrol route polyline (Dashed Line) */}
                            {(() => {
                                const sortedStations = [...mapStations]
                                    .filter(s => s.latitude && s.longitude)
                                    .sort((a, b) => (a.sequence_order || a.id) - (b.sequence_order || b.id));
                                const routeCoords = sortedStations.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)]);
                                if (routeCoords.length < 2) return null;
                                return (
                                    <Polyline 
                                        positions={routeCoords} 
                                        pathOptions={{ color: '#64748b', weight: 2, dashArray: '6, 8', opacity: 0.6 }} 
                                    />
                                );
                            })()}

                            {/* LIVE: Checkpoint markers */}
                                {mapStations.map(station => {
                                    if (!station.latitude || !station.longitude) return null;
                                    const logsForStation = stationCheckpoints.filter(cp => cp.station_id === station.id || cp.station_name === station.station_name);
                                    const latestLog = logsForStation.length > 0 ? logsForStation[0] : null;
                                    const sData = getStationData(station, latestLog);
                                    
                                    const stNameLower = (station.station_name || station.label || '').toLowerCase().trim();
                                    const stKeyLower = (station.station_key || station.key || '').toLowerCase().trim();
                                    const stCodeLower = (station.checkpoint_code || '').toLowerCase().trim();
                                    const isVerified = mobileVerifiedKeys 
                                        ? mobileVerifiedKeys.some(k => k === stNameLower || k === stKeyLower || k === stCodeLower || k === String(station.id) || k === String(station.sequence_order))
                                        : !!latestLog;

                                    let isNextTarget = false;
                                    if (mobileTargetSeq !== null && mobileTargetSeq !== undefined && mobileTargetSeq !== '') {
                                        // Target dicocokkan secara spesifik: utamakan sequence_order, checkpoint_code, atau nama station
                                        isNextTarget = (station.sequence_order !== undefined && station.sequence_order !== null && String(station.sequence_order) === String(mobileTargetSeq)) ||
                                                       (stCodeLower && stCodeLower === String(mobileTargetSeq).toLowerCase().trim()) ||
                                                       (stNameLower && stNameLower === String(mobileTargetSeq).toLowerCase().trim());
                                    } else {
                                        const sortedLiveStations = [...mapStations].filter(s => s.latitude && s.longitude).sort((a, b) => (a.sequence_order || a.id) - (b.sequence_order || b.id));
                                        const nextLiveTarget = sortedLiveStations.find(s => {
                                            const sName = (s.station_name || s.label || '').toLowerCase().trim();
                                            const sKey = (s.station_key || s.key || '').toLowerCase().trim();
                                            const sCode = (s.checkpoint_code || '').toLowerCase().trim();
                                            if (mobileVerifiedKeys) {
                                                return !mobileVerifiedKeys.some(k => k === sName || k === sKey || k === sCode || (s.sequence_order !== undefined && k === String(s.sequence_order)));
                                            }
                                            return stationCheckpoints.filter(cp => cp.station_id === s.id || cp.station_name === s.station_name).length === 0;
                                        });
                                        isNextTarget = nextLiveTarget && nextLiveTarget.id === station.id;
                                    }
                                    
                                    return (
                                        <React.Fragment key={`cp-frag-${station.id}`}>
                                            {isNextTarget && (
                                                <Circle 
                                                    center={[parseFloat(station.latitude) + 0, parseFloat(station.longitude) + 0]} 
                                                    radius={parseFloat(station.radius_meters) > 0 ? parseFloat(station.radius_meters) : 10} 
                                                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25, weight: 3 }} 
                                                />
                                            )}
                                            <Marker
                                                key={`cp-${station.id}`}
                                                position={[parseFloat(station.latitude) + 0, parseFloat(station.longitude) + 0]}
                                                icon={createCheckpointIcon(station, isVerified, isNextTarget)}
                                                eventHandlers={{ click: () => { setProofIndex(0); setActiveProof({ name: station.station_name, ...sData }); } }}
                                            >
                                                <Tooltip direction="top" offset={[0, -10]} opacity={1} className="pm-hover-tooltip">
                                                    <div className="pm-tooltip-card">
                                                        <div className="pm-tooltip-title">{station.station_name}</div>
                                                        <div className="pm-tooltip-meta">{sData.lastCheck} • {sData.activeGuardName}</div>
                                                        {sData.activeProofImg && (
                                                            <div className="pm-tooltip-photo">
                                                                <img src={sData.activeProofImg} alt="Bukti" />
                                                                <div className="pm-click-hint">Klik untuk perbesar</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Tooltip>
                                            </Marker>
                                        </React.Fragment>
                                    );
                                })}

                                {/* LIVE: Guard avatars */}
                                {(() => {
                                    // Hitung centroid dari guard yg punya GPS
                                    const guardsWithGps = patrolGuards.filter(g => g.latitude && g.longitude);
                                    const centroidLat = guardsWithGps.length > 0
                                        ? guardsWithGps.reduce((sum, g) => sum + parseFloat(g.latitude), 0) / guardsWithGps.length
                                        : center[0];
                                    const centroidLng = guardsWithGps.length > 0
                                        ? guardsWithGps.reduce((sum, g) => sum + parseFloat(g.longitude), 0) / guardsWithGps.length
                                        : center[1];

                                    return patrolGuards.map((guard, idx, arr) => {
                                        const hasGps = !!(guard.latitude && guard.longitude);
                                        
                                        let lat = hasGps ? parseFloat(guard.latitude) : centroidLat;
                                        let lng = hasGps ? parseFloat(guard.longitude) : centroidLng;
                                        
                                        if (hasGps) {
                                            // Cegah marker bertumpuk jika koordinatnya persis sama
                                            const overlapping = arr.filter(g => g.latitude === guard.latitude && g.longitude === guard.longitude);
                                            if (overlapping.length > 1) {
                                                const myOverlapIdx = overlapping.findIndex(g => g.session_id === guard.session_id);
                                                const offsetDist = 0.00003;
                                                const angle = (Math.PI * 2 / overlapping.length) * myOverlapIdx;
                                                lat += Math.sin(angle) * offsetDist;
                                                lng += Math.cos(angle) * offsetDist;
                                            }
                                        } else {
                                            // Guards tanpa GPS: sebar kecil di sekitar centroid agar tidak tumpuk
                                            const noGpsGuards = arr.filter(g => !g.latitude || !g.longitude);
                                            const myIdx = noGpsGuards.findIndex(g => g.session_id === guard.session_id);
                                            const angle = (Math.PI * 2 / Math.max(noGpsGuards.length, 1)) * myIdx;
                                            lat += Math.sin(angle) * 0.00005;
                                            lng += Math.cos(angle) * 0.00005;
                                        }

                                        const avatarId = guard.avatar_photo || guard.photo || guard.latest_photo || 'initial';
                                        return (
                                            <Marker 
                                                key={`g-${guard.session_id || idx}-${avatarId}`} 
                                                position={[lat, lng]} 
                                                icon={createGuardIcon(guard, '#fbbf24', !hasGps)} 
                                                zIndexOffset={hasGps ? (10000 - idx) : 5000}
                                            />
                                        );
                                    });
                                })()}
                            </>
                        )}
                    </MapContainer>
                    )}

                    {/* HUD or Replay Controls */}
                    {isReplayMode ? (
                        <div className="pm-replay-controls">
                            <button onClick={() => setReplayPlaying(!replayPlaying)} className="pm-ctrl-btn">
                                {replayPlaying ? <FaPause /> : <FaPlay />}
                            </button>
                            <button onClick={stopReplay} className="pm-ctrl-btn stop"><FaStop /></button>
                            <div className="pm-progress-bar">
                                <input
                                    type="range"
                                    min={0}
                                    max={replayData.tracks.length - 1}
                                    value={replayIndex}
                                    onChange={e => { setReplayIndex(parseInt(e.target.value)); setReplayPlaying(false); }}
                                    className="pm-slider"
                                />
                            </div>
                            <div className="pm-speed-selector">
                                <FaTachometerAlt style={{ marginRight: '4px', fontSize: '11px' }} />
                                {[1, 2, 4].map(s => (
                                    <button key={s} onClick={() => setReplaySpeed(s)} className={`pm-speed-btn ${replaySpeed === s ? 'active' : ''}`}>{s}x</button>
                                ))}
                            </div>
                            <div className="pm-replay-progress-text">
                                {replayIndex + 1} / {replayData.tracks.length}
                            </div>
                            {(() => {
                                if (!replayCurrentPos) return null;
                                const sortedReplayStations = [...mapStations].filter(s => s.latitude && s.longitude).sort((a, b) => (a.sequence_order || a.id) - (b.sequence_order || b.id));
                                const nextReplayTarget = sortedReplayStations.find(s => replayVisibleCheckpoints.filter(cp => cp.station_id === s.id || cp.station_name === s.station_name).length === 0);
                                if (!nextReplayTarget) {
                                    return (
                                        <div style={{ marginLeft: 'auto', background: '#10b981', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            ✓ ALL CHECKPOINTS REACHED
                                        </div>
                                    );
                                }
                                const dist = Math.round(calculateHaversine(
                                    replayCurrentPos[0], 
                                    replayCurrentPos[1], 
                                    parseFloat(nextReplayTarget.latitude), 
                                    parseFloat(nextReplayTarget.longitude)
                                ));
                                const rM = parseFloat(nextReplayTarget.radius_meters) > 0 ? parseFloat(nextReplayTarget.radius_meters) : 30;
                                const inRadius = dist <= rM;
                                return (
                                    <div style={{ 
                                        marginLeft: 'auto', 
                                        background: inRadius ? '#10b981' : '#0f172a', 
                                        border: `1px solid ${inRadius ? '#059669' : '#334155'}`,
                                        color: '#fff', 
                                        padding: '3px 10px', 
                                        borderRadius: '6px', 
                                        fontSize: '11px', 
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <span>Target: <b>{nextReplayTarget.station_name}</b></span>
                                        <span style={{ 
                                            background: inRadius ? '#059669' : '#ef4444', 
                                            padding: '1px 6px', 
                                            borderRadius: '4px', 
                                            fontSize: '10px',
                                            fontWeight: '800'
                                        }}>
                                            {inRadius ? `INSIDE RADIUS (${dist}m / ${rM}m)` : `${dist}m (Radius: ${rM}m)`}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="pm-hud">
                            <div className="pm-hud-item">
                                <span className="pm-hud-value">{patrolGuards.length}</span>
                                <span className="pm-hud-label">ACTIVE</span>
                            </div>
                            <div className="pm-hud-divider"></div>
                            <div className="pm-hud-item">
                                <span className="pm-hud-value">{stationCheckpoints.length}</span>
                                <span className="pm-hud-label">CHECKPOINTS</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default PatrolMapTab;
