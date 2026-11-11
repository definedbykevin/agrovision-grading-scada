import React, { useState, useEffect } from 'react';
import { FaUserShield, FaMapMarkerAlt, FaShieldAlt, FaPlay, FaStop, FaWalking, FaCalendarAlt } from 'react-icons/fa';

function SecurityAside({ patrolGuards, stationCheckpoints, patrolHistory = [], replaySessionId, setReplaySessionId }) {
    const [realtimeDate, setRealtimeDate] = useState(() => {
        return new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    });

    useEffect(() => {
        const updateDate = () => {
            setRealtimeDate(new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }));
        };
        // Update check every minute
        const timer = setInterval(updateDate, 10000);
        return () => clearInterval(timer);
    }, []);

    return (
        <aside className="som-security-aside">
            {/* GUARD STATUS */}
            <div className="som-patrol-card guards-card">
                <div className="som-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><FaUserShield style={{ marginRight: '6px', fontSize: '11px' }} />GUARD STATUS</span>
                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>{patrolGuards.length} ACTIVE</span>
                </div>
                <div className="som-guards-list">
                    {patrolGuards.length === 0 && <div style={{color: '#64748b', fontSize: '12px', padding: '15px', textAlign: 'center'}}>No active guards</div>}
                    {patrolGuards.map(guard => {
                        const gColor = '#f59e0b';
                        const avatarSrc = guard.avatar_photo || guard.photo || null;
                        return (
                            <div key={guard.id || guard.session_id}
                                className="som-guard-item"
                                style={{ transition: 'all 0.2s', padding: '10px', borderRadius: '8px' }}
                            >
                                <div className="guard-initials" style={{color: '#fff', background: gColor, border: `1px solid ${gColor}`, overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    {avatarSrc ? (
                                        <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        (guard.name ? guard.name.charAt(0).toUpperCase() : '?')
                                    )}
                                </div>
                                <div className="guard-info">
                                    <div className="guard-name-row"><span className="guard-name">{guard.name || `ID: ${guard.session_id}`}</span></div>
                                    <div className="guard-location">
                                        {(!guard.latitude || !guard.longitude) ? (
                                            <b style={{ color: '#ef4444', animation: 'pulse 2s infinite' }}>Searching GPS Signal...</b>
                                        ) : (
                                            <b>{guard.current_station_key || 'Patrolling'}</b>
                                        )}
                                    </div>
                                </div>
                                <div className={`status-dot ${(!guard.latitude || !guard.longitude) ? 'waiting' : 'online'}`} style={{background: (!guard.latitude || !guard.longitude) ? '#ef4444' : gColor}}></div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* PATROL HISTORY — with Replay buttons */}
            <div className="som-patrol-card journey-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="som-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><FaWalking style={{ marginRight: '6px', fontSize: '11px' }} />PATROL HISTORY</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>{patrolHistory.length} SESSIONS</span>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 14px 6px 18px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#475569'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FaCalendarAlt style={{ color: '#f59e0b', fontSize: '10px' }} />
                        <span>{realtimeDate}</span>
                    </span>
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#059669',
                        background: '#ecfdf5',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: '1px solid #a7f3d0'
                    }}>
                        TODAY
                    </span>
                </div>
                <div className="som-checkpoint-journey" style={{ flex: 1, overflowY: 'auto' }}>
                    {patrolHistory.length === 0 && (
                        <div style={{color: '#64748b', fontSize: '12px', padding: '15px', textAlign: 'center'}}>No patrol history today</div>
                    )}
                    {patrolHistory.map((session) => {
                        const isActive = session.status === 'active';
                        const isReplaying = replaySessionId === session.id;
                        const formatTime = (dateStr) => {
                            if (!dateStr) return null;
                            const d = new Date(dateStr);
                            const hours = String(d.getHours()).padStart(2, '0');
                            const mins = String(d.getMinutes()).padStart(2, '0');
                            return `${hours}:${mins}`;
                        };
                        const startTime = formatTime(session.started_at);
                        const endTime = formatTime(session.completed_at);

                        return (
                            <div key={session.id} className={`som-history-item ${isReplaying ? 'replaying' : ''}`}>
                                <div className="history-left">
                                    <div 
                                        className="guard-initials" 
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            minWidth: '28px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            background: '#1e293b',
                                            border: '1px solid #ffdb3b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#ffdb3b',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            flexShrink: 0
                                        }}
                                    >
                                        {session.avatar_photo ? (
                                            <img src={session.avatar_photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            (session.full_name || session.guard_name || '?').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="history-info">
                                        <div className="history-name">{session.full_name || session.guard_name}</div>
                                        {session.shift && (
                                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', marginTop: '2px', letterSpacing: '0.02em' }}>
                                                {session.shift.startsWith('Shift') ? session.shift : `Shift ${session.shift}`} • Round {session.round_number}
                                            </div>
                                        )}
                                        <div className="history-meta" style={{ marginTop: '2px' }}>
                                            {startTime}{endTime ? ` — ${endTime} WIB` : ' WIB (active)'}
                                            <span 
                                                className="history-cp-count" 
                                                title={session.checkpoint_names ? `${session.checkpoint_count} Checkpoints: ${session.checkpoint_names}` : `${session.checkpoint_count} Checkpoints`}
                                                style={{ marginLeft: '4px' }}
                                            >
                                                <FaMapMarkerAlt style={{ fontSize: '9px', marginRight: '2px' }} /> 
                                                {session.checkpoint_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {!isActive && (session.track_count > 0 || session.checkpoint_count > 0) && (
                                    <button
                                        className={`history-replay-btn ${isReplaying ? 'stop' : ''}`}
                                        onClick={() => setReplaySessionId(isReplaying ? null : session.id)}
                                        title={isReplaying ? 'Stop Replay' : 'Replay Patrol'}
                                    >
                                        {isReplaying ? <FaStop /> : <FaPlay />}
                                    </button>
                                )}
                                {isActive && (
                                    <span className="history-live-badge">LIVE</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}

export default SecurityAside;
