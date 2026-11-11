import React, { useState, useEffect, useMemo } from 'react';
import { FaClipboardList, FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaCamera, FaCheckCircle, FaFilter, FaSync, FaArrowLeft, FaFileExcel, FaPlay, FaChevronDown, FaChevronRight, FaClock, FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import ProofModal from '../../components/ProofModal.jsx';

function PatrolLogsView({ onBack, onReplaySession }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [selectedOfficer, setSelectedOfficer] = useState('ALL');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [isAllData, setIsAllData] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [logViewMode, setLogViewMode] = useState('session'); // 'session' (Grouped) or 'checkpoint' (Flat)

  const [stations, setStations] = useState([]);
  const [activeProof, setActiveProof] = useState(null);
  const [proofIndex, setProofIndex] = useState(0);

  const toggleSessionExpand = (sessId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessId]: !prev[sessId]
    }));
  };

  const fetchStations = async () => {
    try {
      const res = await fetch('/api/security/patrol/stations');
      const json = await res.json();
      if (Array.isArray(json)) {
        setStations(json.map(st => st.station_name || st.label).filter(Boolean).sort());
      }
    } catch (err) {
      console.error('[PatrolLogsView] Failed to fetch stations:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kip_token');
      const queryParams = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        all_data: isAllData
      });

      const res = await fetch(`/api/security/patrol/logs?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      const rawLogs = Array.isArray(json) ? json : (json.logs || json.data || []);
      
      const parsedLogs = [];

      rawLogs.forEach(item => {
        if (!item.verified_at && !item.created_at) return;
        const verifiedAt = new Date(item.verified_at || item.created_at);
        const officer = item.full_name || item.fullName || item.guard_name || item.verified_by_name || item.officer_name || 'Security Officer';
        const station = item.station_name || item.station || 'Station';
        const lat = parseFloat(item.latitude || 0).toFixed(5);
        const lng = parseFloat(item.longitude || 0).toFixed(5);
        const photo = item.verification_photo || item.photo_path || item.photo_url || item.photo;

        const startAt = item.started_at ? new Date(item.started_at) : null;
        const completeAt = item.completed_at ? new Date(item.completed_at) : null;
        
        const formatTime = (d) => d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ':') + ' WIB' : '-';
        const formatDate = (d) => d ? d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

        const roundNum = item.round_number || 1;
        const totalMaster = parseInt(item.total_master_stations || stations.length || 20, 10);
        const orderDone = parseInt(item.checkpoint_order || 1, 10);
        const sessionTotal = parseInt(item.session_total_scanned || orderDone, 10);
        const pct = totalMaster > 0 ? Math.min(100, Math.round((orderDone / totalMaster) * 100)) : 0;

        parsedLogs.push({
          id: item.id || Math.random(),
          sessionId: item.session_id,
          dateObj: verifiedAt,
          dateStr: verifiedAt.toISOString().split('T')[0],
          timeStr: formatTime(verifiedAt),
          formattedDate: formatDate(verifiedAt),
          startTimeStr: formatTime(startAt),
          startDateStr: formatDate(startAt),
          endTimeStr: formatTime(completeAt),
          endDateStr: formatDate(completeAt),
          shift: item.shift || '-',
          roundNum,
          orderDone,
          sessionTotal,
          totalMaster,
          progressPct: pct,
          officer,
          initial: officer.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          station,
          coord: (lat !== '0.00000' && lng !== '0.00000') ? `${lat}, ${lng}` : (item.is_suspended ? 'Tersuspensi' : '-'),
          status: (item.status || 'VERIFIED').toUpperCase(),
          isSuspended: !!item.is_suspended,
          reasonNotes: item.reason_notes || item.notes || null,
          evidencePhoto: item.evidence_photo || photo || null,
          photo: photo,
          avatar_photo: item.avatar_photo || null
        });
      });

      setLogs(parsedLogs);
    } catch (err) {
      console.error('[PatrolLogsView] Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fromDate, toDate, isAllData, stations.length]);

  const exportToExcel = () => {
    if (filteredLogs.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = [
      "No", "PIC Security", "Shift", "Round", "Checkpoint Progress",
      "Start Time", "End Time", "Location Checkpoint", "GPS Coordinates",
      "Verified Timestamp", "Status"
    ];

    let tableHTML = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
    tableHTML += '<head><meta charset="UTF-8"></head><body>';
    tableHTML += '<table border="1" style="font-family: Arial, sans-serif; border-collapse: collapse;">';
    
    // Styled Header Row (Matching Truck Queues #1e293b dark header)
    tableHTML += '<tr>';
    headers.forEach(h => {
      tableHTML += `<th style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1;">${h}</th>`;
    });
    tableHTML += '</tr>';

    // Data Rows
    filteredLogs.forEach((log, index) => {
      const no = index + 1;
      const pic = log.officer || '-';
      const shift = log.shift || '-';
      const round = `Round ${log.roundNum}`;
      const progress = `${log.orderDone}/${log.totalMaster} (${log.progressPct}%)`;
      const startTime = log.startTimeStr !== '-' ? `${log.startDateStr} ${log.startTimeStr}` : '-';
      const endTime = log.endTimeStr !== '-' ? `${log.endDateStr} ${log.endTimeStr}` : '-';
      const station = log.station || '-';
      const coord = log.coord || '-';
      const verifiedTime = `${log.formattedDate} ${log.timeStr}`;
      const status = (log.status || 'VERIFIED').toUpperCase();

      // Basic styling for status (matching Truck Queues style palette)
      let statusColor = '#15803d'; // Green for verified
      if (status.includes('PENDING') || status.includes('PROGRESS')) {
        statusColor = '#b45309'; // Amber
      } else if (status.includes('MISSING') || status.includes('ALERT')) {
        statusColor = '#b91c1c'; // Red
      }

      tableHTML += '<tr>';
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${no}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${pic}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${shift}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${round}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${progress}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${startTime}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${endTime}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: 500;">${station}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1; mso-number-format:'\\@'; font-family: monospace;">${coord}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${verifiedTime}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1; color: ${statusColor}; font-weight: bold; text-align: center;">${status}</td>`;
      tableHTML += '</tr>';
    });

    tableHTML += '</table></body></html>';

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    let dateStr = 'ALL_DATA';
    if (!isAllData) {
      if (fromDate && toDate) {
        dateStr = `${fromDate}_to_${toDate}`;
      } else if (fromDate) {
        dateStr = `From_${fromDate}`;
      } else if (toDate) {
        dateStr = `To_${toDate}`;
      }
    }
    
    link.setAttribute("download", `patrol_logs_${dateStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unique officers present in logs
  const officerList = Array.from(new Set(logs.map(l => l.officer).filter(Boolean))).sort();

  const filteredLogs = logs.filter(log => {
    const searchMatch = 
      log.officer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.shift && log.shift.toLowerCase().includes(searchQuery.toLowerCase())) ||
      `round ${log.roundNum}`.includes(searchQuery.toLowerCase()) ||
      log.coord.toLowerCase().includes(searchQuery.toLowerCase());

    const stationMatch = selectedStation === 'ALL' || log.station === selectedStation;
    const officerMatch = selectedOfficer === 'ALL' || log.officer === selectedOfficer;

    return searchMatch && stationMatch && officerMatch;
  });

  // ── GROUPING PER SESI PATROLI ──
  const groupedSessions = useMemo(() => {
    const sessionMap = new Map();

    filteredLogs.forEach(log => {
      const sId = log.sessionId || `adhoc-${log.officer}-${log.dateStr}-${log.roundNum}`;
      if (!sessionMap.has(sId)) {
        sessionMap.set(sId, {
          sessionId: log.sessionId,
          officer: log.officer,
          avatar_photo: log.avatar_photo,
          initial: log.initial,
          shift: log.shift,
          roundNum: log.roundNum,
          startTimeStr: log.startTimeStr,
          startDateStr: log.startDateStr,
          endTimeStr: log.endTimeStr,
          endDateStr: log.endDateStr,
          totalMaster: log.totalMaster,
          completedAt: log.completedAt,
          checkpoints: []
        });
      }
      sessionMap.get(sId).checkpoints.push(log);
    });

    return Array.from(sessionMap.values()).map(sess => {
      // Sort checkpoints by order / verified time ascending
      sess.checkpoints.sort((a, b) => new Date(a.dateObj) - new Date(b.dateObj));
      const hasSuspendedLog = sess.checkpoints.some(c => c.isSuspended);
      const suspendedItem = sess.checkpoints.find(c => c.isSuspended);
      const validCheckpoints = sess.checkpoints.filter(c => !c.isSuspended);
      const scannedCount = validCheckpoints.length;
      const totalTarget = sess.totalMaster || stations.length || 20;
      const isComplete = sess.endTimeStr !== '-' || scannedCount >= totalTarget;
      const progressPct = totalTarget > 0 ? Math.min(100, Math.round((scannedCount / totalTarget) * 100)) : 0;
      return {
        ...sess,
        isSuspended: hasSuspendedLog,
        reasonNotes: suspendedItem ? suspendedItem.reasonNotes : null,
        evidencePhoto: suspendedItem ? suspendedItem.evidencePhoto : null,
        scannedCount,
        totalTarget,
        isComplete,
        progressPct
      };
    });
  }, [filteredLogs, stations.length]);

  const thStyle = {
    padding: '12px 14px',
    fontSize: '11px',
    fontWeight: '800',
    color: '#475569',
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  };

  const tdStyle = {
    padding: '12px 14px',
    verticalAlign: 'middle'
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #cbd5e1',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      
      {/* ── HEADER TOOLBAR ── */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        color: '#0f172a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: '#0f172a',
                border: '1px solid #0f172a',
                color: '#ffdb3b',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '700',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <FaArrowLeft /> Back to Map
            </button>
          )}

          {onBack && <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Patrol Logs</h2>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Historical verified checkpoint findings & guard activity logs</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={exportToExcel}
            style={{
              padding: '6px 14px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
            }}
          >
            <FaFileExcel style={{ fontSize: '14px' }} /> EXPORT EXCEL
          </button>
          
          <button
            onClick={fetchLogs}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              transition: 'all 0.2s'
            }}
          >
            <FaSync style={{ fontSize: '12px', color: '#64748b' }} /> Refresh
          </button>
        </div>
      </div>

      {/* ── TOP KPI SUMMARY CARDS ── */}
      {(() => {
        const totalMaster = stations.length > 0 ? stations.length : (logs[0]?.totalMaster || 25);
        // Use filteredLogs for KPI cards so filters accurately reflect on metrics
        const targetLogs = (selectedOfficer !== 'ALL' || selectedStation !== 'ALL') ? filteredLogs : logs;
        
        const uniqueSessions = new Set(targetLogs.map(l => l.sessionId).filter(Boolean));
        const totalRounds = uniqueSessions.size || (targetLogs.length > 0 ? 1 : 0);
        
        // Count distinct officers in the current view
        const activeOfficers = Array.from(new Set(targetLogs.map(l => l.officer).filter(Boolean)));
        
        // Count rounds that reached 100%
        const completedRounds = Array.from(uniqueSessions).filter(sid => {
          const sessLogs = targetLogs.filter(l => l.sessionId === sid);
          return sessLogs.some(l => l.progressPct >= 100 || l.orderDone >= totalMaster);
        }).length;

        const totalScanned = targetLogs.length;

        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            padding: '12px 24px',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Master Checkpoints</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{totalMaster}</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Active Stations</span>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {selectedOfficer !== 'ALL' ? `Rounds (${selectedOfficer})` : 'Total Patrol Rounds'}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{totalRounds}</span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>({completedRounds} Completed 100%)</span>
                {selectedOfficer === 'ALL' && activeOfficers.length > 0 && (
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                    {activeOfficers.length} Active Officers
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Checkpoints Verified</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{totalScanned}</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Scanned Logs</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SEARCH & FILTERS BAR ── */}
      <div style={{
        padding: '14px 24px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }} />
          <input
            type="text"
            placeholder="Search officer, station, shift, round..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              padding: '9px 14px 9px 36px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* PIC Security Officer Filter (Opsi B) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7' }}>PIC</span>
            <select
              value={selectedOfficer}
              onChange={e => setSelectedOfficer(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Officers ({officerList.length})</option>
              {officerList.map(off => (
                <option key={off} value={off}>{off}</option>
              ))}
            </select>
          </div>

          {/* Station Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <FaFilter style={{ color: '#64748b', fontSize: '12px' }} />
            <select
              value={selectedStation}
              onChange={e => setSelectedStation(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Stations ({stations.length})</option>
              {stations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Date Picker Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', opacity: isAllData ? 0.5 : 1, pointerEvents: isAllData ? 'none' : 'auto' }}>
            <FaCalendarAlt style={{ color: '#64748b', fontSize: '13px' }} />
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '800' }}>-</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* All Data Toggle */}
          <button
            onClick={() => setIsAllData(!isAllData)}
            style={{
              background: isAllData ? '#0f172a' : '#f1f5f9',
              color: isAllData ? '#ffffff' : '#64748b',
              border: `1px solid ${isAllData ? '#0f172a' : '#cbd5e1'}`,
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            All Data
          </button>

          {/* View Mode Toggle: By Session (Grouped) vs All Checkpoints */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setLogViewMode('session')}
              style={{
                background: logViewMode === 'session' ? '#0f172a' : 'transparent',
                color: logViewMode === 'session' ? '#ffdb3b' : '#64748b',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title="Summarize by Patrol Session (Expandable)"
            >
              By Session ({groupedSessions.length})
            </button>
            <button
              onClick={() => setLogViewMode('checkpoint')}
              style={{
                background: logViewMode === 'checkpoint' ? '#0f172a' : 'transparent',
                color: logViewMode === 'checkpoint' ? '#ffdb3b' : '#64748b',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title="Individual checkpoint details"
            >
              All Checkpoints ({filteredLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── TABLE CONTENT ── */}
      <div style={{ flex: '1', overflowY: 'auto', background: '#ffffff' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
            Loading patrol logs...
          </div>
        ) : logViewMode === 'session' ? (
          /* ═══════════════════════════════════════════════════════
             VIEW A: GROUPED BY PATROL SESSION (HIERARCHICAL / ACCORDION)
             ═══════════════════════════════════════════════════════ */
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}></th>
                <th style={thStyle}>PIC SECURITY</th>
                <th style={thStyle}>SHIFT & ROUND</th>
                <th style={{ ...thStyle, minWidth: '170px' }}>CHECKPOINT PROGRESS</th>
                <th style={thStyle}>START TIME</th>
                <th style={thStyle}>END TIME</th>
                <th style={thStyle}>CHECKPOINTS</th>
                <th style={thStyle}>REPLAY</th>
                <th style={thStyle}>SESSION STATUS</th>
                <th style={thStyle}>KENDALA / CATATAN</th>
                <th style={thStyle}>BUKTI FOTO</th>
              </tr>
            </thead>
            <tbody>
              {groupedSessions.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <FaClipboardList style={{ fontSize: '36px', color: '#cbd5e1' }} />
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>NO PATROL SESSIONS FOUND</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Try adjusting your search filters or selected date</span>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedSessions.map((sess, idx) => {
                  const isExpanded = !!expandedSessions[sess.sessionId || idx];
                  const isSuspended = !!sess.isSuspended;
                  const isFullComplete = sess.scannedCount >= sess.totalTarget;
                  const isSessionEnded = sess.endTimeStr !== '-';
                  
                  // Progress color calculation
                  const progressColor = isSuspended ? '#ea580c' : (isFullComplete ? '#10b981' : (isSessionEnded ? '#f59e0b' : '#0284c7'));
                  const progressBg = isSuspended ? '#fff7ed' : (isFullComplete ? '#ecfdf5' : (isSessionEnded ? '#fffbeb' : '#f0f9ff'));
                  const progressBorder = isSuspended ? '#fed7aa' : (isFullComplete ? '#a7f3d0' : (isSessionEnded ? '#fde68a' : '#bae6fd'));

                  return (
                    <React.Fragment key={sess.sessionId || idx}>
                      {/* Main Session Row */}
                      <tr 
                        style={{ 
                          borderBottom: isExpanded ? '1px dashed #cbd5e1' : '1px solid #f1f5f9', 
                          background: isExpanded ? '#f8fafc' : (idx % 2 === 0 ? '#ffffff' : '#fafafa'),
                          transition: 'background 0.15s'
                        }}
                      >
                        {/* Expand / Collapse Button */}
                        <td style={{ ...tdStyle, textAlign: 'center', cursor: 'pointer', padding: '12px 6px' }} onClick={() => toggleSessionExpand(sess.sessionId || idx)}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: isExpanded ? '#0f172a' : '#e2e8f0',
                            color: isExpanded ? '#ffdb3b' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            transition: 'all 0.2s',
                            margin: '0 auto'
                          }}>
                            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                          </div>
                        </td>

                        {/* Officer */}
                        <td style={tdStyle} onClick={() => toggleSessionExpand(sess.sessionId || idx)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#0f172a',
                              color: '#ffdb3b',
                              border: '1px solid #ffdb3b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: '800',
                              overflow: 'hidden',
                              flexShrink: 0
                            }}>
                              {sess.avatar_photo ? (
                                <img src={sess.avatar_photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                sess.initial
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{sess.officer}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Security Duty</div>
                            </div>
                          </div>
                        </td>

                        {/* Shift & Round */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', border: '1px solid #cbd5e1', width: 'fit-content' }}>
                              {sess.shift}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                              Round {sess.roundNum}
                            </span>
                          </div>
                        </td>

                        {/* Checkpoint Progress */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                                {sess.scannedCount}/{sess.totalTarget} Points
                              </span>
                              <span style={{ fontSize: '10px', fontWeight: '800', color: progressColor, background: progressBg, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${progressBorder}` }}>
                                {sess.progressPct}% {isFullComplete ? '✓ Complete' : (isSessionEnded ? 'Completed' : 'In Progress')}
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${sess.progressPct}%`,
                                height: '100%',
                                background: progressColor,
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </td>

                        {/* Start Time */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{sess.startTimeStr}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{sess.startDateStr}</div>
                        </td>

                        {/* End Time */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{sess.endTimeStr}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{sess.endDateStr}</div>
                        </td>

                        {/* Checkpoint list preview pill */}
                        <td style={tdStyle}>
                          <button
                            onClick={() => toggleSessionExpand(sess.sessionId || idx)}
                            style={{
                              background: isExpanded ? '#0f172a' : '#f1f5f9',
                              color: isExpanded ? '#ffdb3b' : '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <FaMapMarkerAlt style={{ color: isExpanded ? '#ffdb3b' : '#ef4444' }} />
                            {sess.scannedCount} Points {isExpanded ? '▲ Collapse' : '▼ View Details'}
                          </button>
                        </td>

                        {/* Replay */}
                        <td style={tdStyle}>
                          {sess.sessionId ? (
                            <button
                              onClick={() => onReplaySession && onReplaySession(sess.sessionId)}
                              style={{
                                background: '#0f172a',
                                border: '1px solid #0f172a',
                                color: '#ffdb3b',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '800',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                              title={`Replay patrol round ${sess.roundNum} by ${sess.officer}`}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#1e293b';
                                e.currentTarget.style.borderColor = '#1e293b';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#0f172a';
                                e.currentTarget.style.borderColor = '#0f172a';
                              }}
                            >
                              <FaPlay style={{ fontSize: '9px', color: '#ffdb3b' }} /> Replay
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', paddingLeft: '8px' }}>-</span>
                          )}
                        </td>

                        {/* Status Sesi */}
                        <td style={tdStyle}>
                          {isSuspended ? (
                            <span style={{
                              background: '#fff7ed',
                              color: '#ea580c',
                              border: '1px solid #fdba74',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              width: 'fit-content'
                            }}>
                              <FaExclamationTriangle /> SUSPENDED
                            </span>
                          ) : (
                            <span style={{
                              background: isSessionEnded ? '#ecfdf5' : '#eff6ff',
                              color: isSessionEnded ? '#059669' : '#0284c7',
                              border: `1px solid ${isSessionEnded ? '#a7f3d0' : '#bfdbfe'}`,
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <FaCheckCircle /> {isSessionEnded ? 'COMPLETED' : 'ACTIVE'}
                            </span>
                          )}
                        </td>

                        {/* Kendala / Catatan */}
                        <td style={tdStyle}>
                          {sess.reasonNotes ? (
                            <span style={{
                              fontSize: '12px',
                              color: '#9a3412',
                              background: '#fff7ed',
                              border: '1px solid #fed7aa',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontWeight: '600',
                              display: 'inline-block',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={sess.reasonNotes}>
                              {sess.reasonNotes}
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                          )}
                        </td>

                        {/* Bukti Foto */}
                        <td style={tdStyle}>
                          {sess.evidencePhoto ? (
                            <button
                              onClick={() => {
                                const imgUrl = sess.evidencePhoto.startsWith('http') ? sess.evidencePhoto : `/uploads/${sess.evidencePhoto.replace(/^\/+uploads\/+/, '')}`;
                                setProofIndex(0);
                                setActiveProof({
                                  name: `Suspended Round ${sess.roundNum}`,
                                  proofs: [{
                                    img: imgUrl,
                                    guard: sess.officer,
                                    id: sess.sessionId || 'susp',
                                    time: sess.startTimeStr,
                                    date: sess.startDateStr
                                  }]
                                });
                              }}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#2563eb',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                width: 'fit-content',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#dbeafe';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#eff6ff';
                              }}
                            >
                              <FaCamera /> Bukti Foto
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Sub-Table: Checkpoint Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="11" style={{ padding: '0', background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                            <div style={{ padding: '16px 20px 20px 48px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FaShieldAlt style={{ color: '#0284c7' }} /> Details: {sess.checkpoints.length} Verified Checkpoints (Session #{sess.sessionId})
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  Duration: {sess.startTimeStr} – {sess.endTimeStr}
                                </span>
                              </div>

                              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <thead>
                                  <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                                    <th style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.04em' }}>#</th>
                                    <th style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.04em' }}>CHECKPOINT</th>
                                    <th style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.04em' }}>TIMESTAMP</th>
                                    <th style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.04em' }}>GPS COORDINATES</th>
                                    <th style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.04em' }}>PHOTO PROOF</th>
                                    <th style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.04em' }}>STATUS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sess.checkpoints.map((cp, cpIdx) => (
                                    <tr key={cp.id || cpIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b' }}>
                                        #{cpIdx + 1}
                                      </td>
                                      <td style={{ padding: '8px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <FaMapMarkerAlt style={{ color: '#ef4444', fontSize: '12px' }} />
                                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{cp.station}</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                                        {cp.timeStr} ({cp.formattedDate})
                                      </td>
                                      <td style={{ padding: '8px 12px' }}>
                                        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#475569', fontWeight: '700' }}>
                                          {cp.coord}
                                        </code>
                                      </td>
                                      <td style={{ padding: '8px 12px' }}>
                                        {cp.photo ? (
                                          <button
                                            onClick={() => {
                                              const imgUrl = cp.photo.startsWith('http') ? cp.photo : `/uploads/${cp.photo.replace(/^\/+uploads\/+/, '')}`;
                                              setProofIndex(0);
                                              setActiveProof({
                                                name: cp.station,
                                                proofs: [{
                                                  img: imgUrl,
                                                  guard: cp.officer,
                                                  id: cp.id,
                                                  time: cp.timeStr,
                                                  date: cp.formattedDate
                                                }]
                                              });
                                            }}
                                            style={{
                                              background: '#eff6ff',
                                              border: '1px solid #bfdbfe',
                                              color: '#2563eb',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              fontSize: '11px',
                                              fontWeight: '700',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px'
                                            }}
                                          >
                                            <FaCamera /> View Photo
                                          </button>
                                        ) : (
                                          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No Photo</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '8px 12px' }}>
                                        <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800' }}>
                                          ✓ VERIFIED
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          /* ═══════════════════════════════════════════════════════
             VIEW B: FLAT LIST PER CHECKPOINT (DETAIL LENGKAP)
             ═══════════════════════════════════════════════════════ */
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={thStyle}>PIC SECURITY</th>
                <th style={thStyle}>SHIFT & ROUND</th>
                <th style={{ ...thStyle, minWidth: '150px' }}>CHECKPOINT PROGRESS</th>
                <th style={thStyle}>START TIME</th>
                <th style={thStyle}>END TIME</th>
                <th style={thStyle}>LOCATION CHECKPOINT</th>
                <th style={thStyle}>GPS COORDINATES</th>
                <th style={thStyle}>PHOTO PROOF</th>
                <th style={thStyle}>REPLAY</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <FaClipboardList style={{ fontSize: '36px', color: '#cbd5e1' }} />
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>NO PATROL LOGS FOUND</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Try adjusting your search filters or selected date</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isComplete = log.progressPct >= 100 || log.orderDone >= log.totalMaster;
                  const progressColor = isComplete ? '#10b981' : (log.progressPct >= 50 ? '#0284c7' : '#d97706');
                  const progressBg = isComplete ? '#ecfdf5' : (log.progressPct >= 50 ? '#f0f9ff' : '#fffbeb');
                  const progressBorder = isComplete ? '#a7f3d0' : (log.progressPct >= 50 ? '#bae6fd' : '#fde68a');

                  return (
                    <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      
                      {/* Officer / PIC Security */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#0f172a',
                            color: '#ffdb3b',
                            border: '1px solid #ffdb3b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '800',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            {log.avatar_photo ? (
                              <img src={log.avatar_photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              log.initial
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{log.officer}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Security Duty</div>
                          </div>
                        </div>
                      </td>

                      {/* Shift & Round */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', border: '1px solid #cbd5e1', width: 'fit-content' }}>
                            {log.shift}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                            Round {log.roundNum}
                          </span>
                        </div>
                      </td>

                      {/* Checkpoint Progress & Percentage */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                              {log.orderDone}/{log.totalMaster}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: progressColor, background: progressBg, padding: '1px 5px', borderRadius: '4px', border: `1px solid ${progressBorder}` }}>
                              {log.progressPct}% {isComplete ? '✓' : ''}
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${log.progressPct}%`,
                              height: '100%',
                              background: progressColor,
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      </td>

                      {/* Start Time */}
                      <td style={tdStyle}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{log.startTimeStr}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{log.startDateStr}</div>
                      </td>

                      {/* End Time */}
                      <td style={tdStyle}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{log.endTimeStr}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{log.endDateStr}</div>
                      </td>

                      {/* Location Checkpoint */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaMapMarkerAlt style={{ color: '#ef4444', fontSize: '14px' }} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{log.station}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Verified: {log.timeStr}</div>
                          </div>
                        </div>
                      </td>

                      {/* Coordinates */}
                      <td style={tdStyle}>
                        <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: '#334155', fontWeight: '700' }}>
                          {log.coord}
                        </code>
                      </td>

                    {/* Photo Proof */}
                    <td style={tdStyle}>
                      {log.photo ? (
                        <button
                          onClick={() => {
                            const imgUrl = log.photo.startsWith('http') ? log.photo : `/uploads/${log.photo.replace(/^\/+uploads\/+/, '')}`;
                            setProofIndex(0);
                            setActiveProof({
                              name: log.station,
                              proofs: [{
                                img: imgUrl,
                                guard: log.officer,
                                id: log.id,
                                time: log.timeStr,
                                date: log.formattedDate
                              }]
                            });
                          }}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <FaCamera /> View Photo
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No Photo</span>
                      )}
                    </td>

                    {/* Replay Patrol */}
                    <td style={tdStyle}>
                      {log.sessionId ? (
                        <button
                          onClick={() => onReplaySession && onReplaySession(log.sessionId)}
                          style={{
                            background: '#0f172a',
                            border: '1px solid #0f172a',
                            color: '#ffdb3b',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          title={`Replay patrol round ${log.roundNum} by ${log.officer}`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#1e293b';
                            e.currentTarget.style.borderColor = '#1e293b';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#0f172a';
                            e.currentTarget.style.borderColor = '#0f172a';
                          }}
                        >
                          <FaPlay style={{ fontSize: '9px', color: '#ffdb3b' }} /> Replay
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={tdStyle}>
                      {log.isSuspended ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{
                            background: '#fff7ed',
                            color: '#ea580c',
                            border: '1px solid #fdba74',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            width: 'fit-content'
                          }}>
                            <FaExclamationTriangle /> SUSPENDED
                          </span>
                          {log.reasonNotes && (
                            <div style={{
                              fontSize: '11px',
                              color: '#9a3412',
                              background: '#ffedd5',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={log.reasonNotes}>
                              {log.reasonNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <FaCheckCircle /> {log.status}
                        </span>
                      )}
                    </td>

                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FOOTER STATS ── */}
      <div style={{
        padding: '12px 24px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '600'
      }}>
        <span>
          {logViewMode === 'session' ? (
            <>Total Patrol Sessions: <strong>{groupedSessions.length} Sessions</strong> ({filteredLogs.length} Checkpoints)</>
          ) : (
            <>Total Checkpoint Logs: <strong>{filteredLogs.length}</strong> {filteredLogs.length !== logs.length && `(Filtered from ${logs.length})`}</>
          )}
        </span>
        <span>Security Station Gateway Command Center</span>
      </div>

      {/* ── AI VERIFIED PROOF MODAL (MATCHING MAP STYLE) ── */}
      <ProofModal
        activeProof={activeProof}
        setActiveProof={setActiveProof}
        proofIndex={proofIndex}
        setProofIndex={setProofIndex}
        currentTime={new Date().toLocaleTimeString('id-ID')}
      />
    </div>
  );
}

export default PatrolLogsView;
