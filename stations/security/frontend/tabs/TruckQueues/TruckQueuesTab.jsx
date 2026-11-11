import React, { useState, useEffect } from 'react';
import { FaTruck, FaClock, FaSearch, FaFilter, FaCamera, FaChevronRight, FaPrint, FaVolumeUp } from 'react-icons/fa';

function TruckQueuesTab() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const todayDate = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(todayDate);
  const [visibleCount, setVisibleCount] = useState(100);

  React.useEffect(() => {
    setVisibleCount(100);
  }, [startDate, endDate, searchQuery, activeTab]);

  const fetchQueues = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch('/api/security/queues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      const dataList = Array.isArray(json) ? json : (json.data || json.queues || []);
      setQueues(dataList);
    } catch (err) {
      console.error('Failed to fetch queues:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Web Audio Chime Sound (Ding Before Speech) ──
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note chime
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn('[AudioChime] Error playing chime:', e);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 4000);

    // Audio unlock listener for browser autoplay policy
    const unlockAudio = () => {
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') ctx.resume();
        }
      } catch (e) {}
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // WebSocket listener with auto-reconnect for real-time speaker audio call & queue updates
    let ws;
    let reconnectTimer;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      const host = window.location.hostname || 'localhost';
      const wsUrl = `ws://${host}:3200/ws`;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => console.log('[WS Web Base] Connected to queue speaker channel');
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const evtName = (payload.event || '').toLowerCase();
            if (evtName === 'queue_called' || evtName === 'queue_call' || evtName === 'truck_queue_called') {
              if (payload.data) {
                announceQueue(payload.data);
                fetchQueues();
              }
            } else if (evtName.includes('queue') || evtName.includes('truck') || evtName.includes('update') || evtName.includes('create') || evtName.includes('delete')) {
              fetchQueues();
            }
          } catch (e) {}
        };
        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };
        ws.onerror = () => {
          try { ws.close(); } catch (e) {}
        };
      } catch (e) {
        if (!isDisposed) reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      isDisposed = true;
      clearInterval(interval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
    };
  }, []);

  // ── Helper to resolve photo proof URLs ──
  const getPhotoUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    
    // Check if running on standard public domain / Cloudflare HTTPS or custom host
    const isPublic = window.location.protocol === 'https:' || 
      (window.location.hostname && window.location.hostname.includes('.') && !/^[0-9.]+$/.test(window.location.hostname));

    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const u = new URL(url);
        if (isPublic) {
          return `${window.location.origin}${u.pathname}`;
        }
        const host = window.location.hostname || 'localhost';
        return `http://${host}:3101${u.pathname}`;
      } catch (e) {
        return url;
      }
    }

    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    if (isPublic) {
      return `${window.location.origin}${cleanPath}`;
    }
    const host = window.location.hostname || 'localhost';
    return `http://${host}:3101${cleanPath}`;
  };

  // ── Web Speech API (TTS Voice Call) ──
  const announceQueue = (q) => {
    if (!q) return;
    playChime();

    if (!('speechSynthesis' in window)) return;

    // Helper functions for spelling code and plate digit by digit / letter by letter
    const spellCode = (code = '') => {
      if (!code) return '';
      const prefix = code[0] || '';
      const digits = code.slice(1);
      const digitMap = { '0': 'nol', '1': 'satu', '2': 'dua', '3': 'tiga', '4': 'empat', '5': 'lima', '6': 'enam', '7': 'tujuh', '8': 'delapan', '9': 'sembilan' };
      const spelledDigits = digits.split('').map(d => digitMap[d] || d).join(' ');
      return `${prefix} ${spelledDigits}`;
    };

    const spellPlate = (plate = '') => {
      return plate.split('').map(c => c === ' ' ? ', ' : c).join(' ');
    };

    const code = spellCode(q.queueCode || q.queue_number || q.ticket_number || '');
    const driver = q.driverName || q.driver_name || '';
    const plate = spellPlate(q.licensePlate || q.plate_number || '');
    const status = (q.status || 'WAITING').toUpperCase();

    let text = `Nomor antrian ${code}, ${driver}, plat nomor ${plate}, silakan menuju timbangan.`;
    if (status === 'GRADING') {
      text = `Nomor antrian ${code}, ${driver}, plat nomor ${plate}, silakan menuju area sortir grading.`;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.88; // Slightly slower for clarity
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('[WebSpeech] Error playing utterance:', e);
    }
  };

  const handleStatusUpdate = async (id, newStatus, itemData = null) => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/security/queues/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        if (newStatus === 'WEIGH_IN' && itemData) {
          announceQueue(itemData);
        }
        fetchQueues();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const dateFilteredQueues = React.useMemo(() => {
    if (!startDate && !endDate) return queues;
    return queues.filter(q => {
      const timeVal = q.check_in_at || q.created_at;
      if (!timeVal) return false;
      const truckDate = new Date(timeVal).toISOString().split('T')[0];
      
      if (startDate && endDate) {
        return truckDate >= startDate && truckDate <= endDate;
      } else if (startDate) {
        return truckDate >= startDate;
      } else if (endDate) {
        return truckDate <= endDate;
      }
      return true;
    });
  }, [queues, startDate, endDate]);

  const filteredQueues = dateFilteredQueues.filter(q => {
    const status = (q.status || q.status_code || 'WAITING').toUpperCase();
    if (activeTab === 'WAITING' && status !== 'WAITING') return false;
    if (activeTab === 'WEIGHIN' && status !== 'WEIGH_IN') return false;
    if (activeTab === 'GRADING' && status !== 'GRADING') return false;
    if (activeTab === 'COMPLETED' && status !== 'COMPLETED' && status !== 'CHECKED_OUT') return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const plate = (q.licensePlate || q.plate_number || '').toLowerCase();
    const code = (q.queueCode || q.queue_number || '').toLowerCase();
    const driver = (q.driverName || q.driver_name || '').toLowerCase();
    const doNo = (q.noDo || q.no_do || '').toLowerCase();
    const company = (q.perusahaan || q.transporterCompany || '').toLowerCase();

    return plate.includes(query) || code.includes(query) || driver.includes(query) || doNo.includes(query) || company.includes(query);
  });

  const exportToExcel = () => {
    if (filteredQueues.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = [
      "Ticket No", "Classification", "License Plate", "Driver", "Company", "No DO",
      "Status", "Check-in Time", "Check-out Time", "PIC Security"
    ];

    let tableHTML = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
    tableHTML += '<head><meta charset="UTF-8"></head><body>';
    tableHTML += '<table border="1" style="font-family: Arial, sans-serif; border-collapse: collapse;">';
    
    // Styled Header Row
    tableHTML += '<tr>';
    headers.forEach(h => {
      tableHTML += `<th style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1;">${h}</th>`;
    });
    tableHTML += '</tr>';

    // Data Rows
    filteredQueues.forEach(q => {
      const ticket = q.ticket_number || q.queueCode || q.queue_number || '';
      const cls = q.classification_label || q.classification || q.classification_name || '';
      const plate = q.licensePlate || q.plate_number || '';
      const driver = q.driverName || q.driver_name || '';
      const company = q.perusahaan || q.transporterCompany || '';
      const noDo = q.noDo || q.no_do || '';
      const status = (q.status || q.status_code || 'WAITING').toUpperCase();
      const checkin = q.check_in_at ? new Date(q.check_in_at).toLocaleString('id-ID') : '';
      const checkout = q.check_out_at ? new Date(q.check_out_at).toLocaleString('id-ID') : '';
      const pic = q.registeredByName || q.registered_by_name || q.registeredbyname || 'System';

      tableHTML += '<tr>';
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${ticket}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${cls}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${plate}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${driver}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${company}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1; mso-number-format:'\@';">${noDo}</td>`; // Force string
      
      // Basic styling for status
      let statusColor = status === 'WAITING' ? '#b45309' : status === 'WEIGH_IN' ? '#0369a1' : status === 'GRADING' ? '#5b21b6' : '#15803d';
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1; color: ${statusColor}; font-weight: bold;">${status}</td>`;
      
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${checkin}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${checkout}</td>`;
      tableHTML += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${pic}</td>`;
      tableHTML += '</tr>';
    });

    tableHTML += '</table></body></html>';

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    let dateStr = 'ALL_DATA';
    if (startDate && endDate) {
      dateStr = `${startDate}_to_${endDate}`;
    } else if (startDate) {
      dateStr = `From_${startDate}`;
    } else if (endDate) {
      dateStr = `To_${endDate}`;
    }
    
    link.setAttribute("download", `truck_queues_${dateStr}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Metrics based on the Date Filtered Queues
  const totalCount = dateFilteredQueues.length;
  const waitingCount = dateFilteredQueues.filter(q => (q.status || '').toUpperCase() === 'WAITING').length;
  const weighinCount = dateFilteredQueues.filter(q => (q.status || '').toUpperCase() === 'WEIGH_IN').length;
  const gradingCount = dateFilteredQueues.filter(q => (q.status || '').toUpperCase() === 'GRADING').length;
  const completedCount = dateFilteredQueues.filter(q => ['COMPLETED', 'CHECKED_OUT'].includes((q.status || '').toUpperCase())).length;

  // Calculate Average Handle Time (Always display all transport classifications)
  const averageMetrics = React.useMemo(() => {
    const predefinedList = [
      { code: 'SO', label: 'FFB SUPER' },
      { code: 'U', label: 'FFB UMUM' },
      { code: 'M', label: 'FFB MITRA' },
      { code: 'C', label: 'CRUDE PALM OIL' },
      { code: 'K', label: 'PALM KERNEL' },
      { code: 'S', label: 'PALM KERNEL SHELL' },
      { code: 'DLL', label: 'DLL' },
    ];

    const groups = {};
    predefinedList.forEach(item => {
      groups[item.code] = { label: item.label, total: 0, sumSeconds: 0 };
    });

    queues.forEach(q => {
      const status = (q.status || q.status_code || '').toUpperCase();
      const startTimeVal = q.weighInAt || q.weigh_in_at || q.check_out_at && q.check_in_at;
      if (status === 'COMPLETED' && q.check_out_at && startTimeVal) {
        // Basic frontend mock filter for the operational date (ignoring exact shift hours for now just for UI demo)
        const checkOutDateStr = new Date(q.check_out_at).toISOString().split('T')[0];
        
        let matchDate = false;
        if (startDate && endDate) {
          matchDate = checkOutDateStr >= startDate && checkOutDateStr <= endDate;
        } else if (startDate) {
          matchDate = checkOutDateStr >= startDate;
        } else if (endDate) {
          matchDate = checkOutDateStr <= endDate;
        } else {
          matchDate = true;
        }

        if (matchDate) {
          const rawCls = (q.classification_id || q.classificationcode || q.classification_code || q.classificationCode || q.classification_name || q.classification || 'OTHER').toUpperCase().trim();
          let matchedKey = 'OTHER';
          if (groups[rawCls]) {
            matchedKey = rawCls;
          } else if (rawCls.includes('SUPER')) {
            matchedKey = 'SO';
          } else if (rawCls.includes('UMUM')) {
            matchedKey = 'U';
          } else if (rawCls.includes('MITRA')) {
            matchedKey = 'M';
          } else if (rawCls.includes('CPO') || rawCls.includes('CRUDE')) {
            matchedKey = 'C';
          } else if (rawCls.includes('KERNEL') && !rawCls.includes('SHELL') && !rawCls.includes('CANGKANG')) {
            matchedKey = 'K';
          } else if (rawCls.includes('SHELL') || rawCls.includes('CANGKANG')) {
            matchedKey = 'S';
          } else if (rawCls.includes('DLL') || rawCls.includes('LAIN')) {
            matchedKey = 'DLL';
          }

          if (!groups[matchedKey]) {
            groups[matchedKey] = { label: rawCls, total: 0, sumSeconds: 0 };
          }
          
          const inTime = new Date(startTimeVal).getTime();
          const outTime = new Date(q.check_out_at).getTime();
          if (outTime > inTime) {
            groups[matchedKey].total += 1;
            groups[matchedKey].sumSeconds += (outTime - inTime) / 1000;
          }
        }
      }
    });

    const results = [];
    predefinedList.forEach(item => {
      const g = groups[item.code];
      let avgText = '-';
      if (g.total > 0) {
        const avgSeconds = g.sumSeconds / g.total;
        if (avgSeconds < 3600) {
          avgText = `${Math.floor(avgSeconds / 60)} Menit`;
        } else {
          const hrs = Math.floor(avgSeconds / 3600);
          const mins = Math.floor((avgSeconds % 3600) / 60);
          avgText = `${hrs} Jam ${mins} Menit`;
        }
      }
      results.push({
        code: item.code,
        classification: item.label,
        total: g.total,
        avgText
      });
    });

    // Append any extra groups (e.g. OTHER) if they have data
    Object.keys(groups).forEach(k => {
      if (!predefinedList.some(p => p.code === k) && groups[k].total > 0) {
        const g = groups[k];
        const avgSeconds = g.sumSeconds / g.total;
        let avgText = '';
        if (avgSeconds < 3600) {
          avgText = `${Math.floor(avgSeconds / 60)} Menit`;
        } else {
          const hrs = Math.floor(avgSeconds / 3600);
          const mins = Math.floor((avgSeconds % 3600) / 60);
          avgText = `${hrs} Jam ${mins} Menit`;
        }
        results.push({
          code: k,
          classification: g.label || k,
          total: g.total,
          avgText
        });
      }
    });

    return results;
  }, [queues, startDate, endDate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b', fontFamily: 'system-ui' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em' }}>LOADING LIVE QUEUE SYSTEM...</span>
        </div>
      </div>
    );
  }
  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredQueues.length) {
        setVisibleCount(prev => prev + 100);
      }
    }
  };

  return (
    <div className="som-view-container" style={{ padding: '0', background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      {/* ── TOP INDUSTRIAL STATS BAR (FLUSH FULL-WIDTH ALIGNMENT) ── */}
      <div style={{
        padding: '16px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        flexShrink: 0,
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          width: '100%'
        }}>
          {/* Metric 1 */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaTruck />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TOTAL REGISTERED</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', lineHeight: '1.2' }}>{totalCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>Trucks</span></div>
            </div>
          </div>

          {/* Metric 2 */}
          <div style={{ background: '#f8fafc', border: '1px solid #fef08a', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#fefce8', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaClock />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#d97706', letterSpacing: '0.05em', textTransform: 'uppercase' }}>WAITING IN QUEUE</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#b45309', lineHeight: '1.2' }}>{waitingCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#d97706' }}>Pending</span></div>
            </div>
          </div>

          {/* Metric 3 */}
          <div style={{ background: '#f8fafc', border: '1px solid #bae6fd', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaVolumeUp />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', letterSpacing: '0.05em', textTransform: 'uppercase' }}>WEIGH-IN</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0369a1', lineHeight: '1.2' }}>{weighinCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7' }}>Active</span></div>
            </div>
          </div>

          {/* Metric 4 */}
          <div style={{ background: '#f8fafc', border: '1px solid #c4b5fd', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaSearch />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#7c3aed', letterSpacing: '0.05em', textTransform: 'uppercase' }}>GRADING</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#5b21b6', lineHeight: '1.2' }}>{gradingCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#7c3aed' }}>Active</span></div>
            </div>
          </div>

          {/* Metric 5 */}
          <div style={{ background: '#f8fafc', border: '1px solid #bbf7d0', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaChevronRight />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>COMPLETED TODAY</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#15803d', lineHeight: '1.2' }}>{completedCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>Finished</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AVERAGE HANDLE TIME & DATE FILTER BAR ── */}
      <div style={{
        padding: '12px 20px',
        background: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaClock style={{ color: '#64748b' }} />
            AVERAGE HANDLE TIME (OPERATIONAL DATE)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{
                padding: '6px 12px',
                background: (!startDate && !endDate) ? '#1e293b' : '#f8fafc',
                color: (!startDate && !endDate) ? '#fff' : '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ALL DATA
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>FROM:</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  outline: 'none',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>TO:</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#334155',
                  outline: 'none',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              />
            </div>

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
                marginLeft: '10px',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
              }}
            >
              EXPORT EXCEL
            </button>
          </div>
        </div>

        {averageMetrics.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
            No completed trucks for the selected date to calculate averages.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {averageMetrics.map((metric, idx) => {
              const classThemeMap = {
                'SO': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
                'U': { bg: '#d1fae5', text: '#047857', border: '#a7f3d0' },
                'M': { bg: '#cffafe', text: '#0369a1', border: '#bae6fd' },
                'C': { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
                'K': { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
                'S': { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
                'DLL': { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
              };
              const theme = classThemeMap[metric.code] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };

              return (
                <div key={idx} style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: theme.bg,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '900'
                  }}>
                    {metric.code || '🚚'}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{metric.classification.toUpperCase()}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Total: <strong style={{ color: '#334155' }}>{metric.total} Truk</strong> | Rata-rata: <strong style={{ color: metric.total > 0 ? '#059669' : '#94a3b8' }}>{metric.avgText}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT AREA (FULL-WIDTH 100% WITHOUT SIDE SPACE) ── */}
      <div style={{ padding: '16px 0px', flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '0px',
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>

          {/* ── HEADER FILTER & SEARCH BAR ── */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            background: '#ffffff'
          }}>
            {/* Title & Live Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                TRUCK QUEUE MANAGEMENT
              </span>
              <span style={{ fontSize: '10px', fontWeight: '800', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '20px', border: '1px solid #fde68a' }}>
                LIVE MONITORING
              </span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }} />
                <input
                  type="text"
                  placeholder="Search Plate, Ticket, Driver, DO..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '8px 14px 8px 36px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    outline: 'none',
                    width: '260px',
                    transition: 'all 0.2s'
                  }}
                />
              </div>

              {/* Status Filter Tabs */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
                {[
                  { key: 'ALL', label: 'ALL QUEUES' },
                  { key: 'WAITING', label: 'WAITING' },
                  { key: 'WEIGHIN', label: 'WEIGH-IN' },
                  { key: 'GRADING', label: 'GRADING' },
                  { key: 'COMPLETED', label: 'COMPLETED' }
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      background: activeTab === t.key ? '#0f172a' : 'transparent',
                      color: activeTab === t.key ? '#ffffff' : '#64748b',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.03em',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── TABLE CONTAINER ── */}
          <div style={{ flex: '1', overflowY: 'auto' }} onScroll={handleScroll}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={thStyle}>PIC / SECURITY</th>
                  <th style={thStyle}>CHECK-IN TIME</th>
                  <th style={thStyle}>CHECK-OUT TIME</th>
                  <th style={thStyle}>HANDLE TIME</th>
                  <th style={thStyle}>TICKET NO.</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>TRANSPORT CLASSIFICATION</th>
                  <th style={thStyle}>LICENSE PLATE</th>
                  <th style={thStyle}>DRIVER NAME</th>
                  <th style={thStyle}>SIM NO.</th>
                  <th style={thStyle}>DO NUMBER</th>
                  <th style={thStyle}>COMPANY / VENDOR</th>
                  <th style={thStyle}>PHOTO PROOF</th>
                  <th style={thStyle}>QUEUE STATUS</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueues.length === 0 ? (
                  <tr>
                    <td colSpan="13" style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <FaTruck style={{ fontSize: '32px', color: '#cbd5e1' }} />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>NO TRUCK QUEUE RECORDS FOUND</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Try adjusting your search query or filter tab</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQueues.slice(0, visibleCount).map((q, idx) => {
                    const weighInDate = q.weighInAt || q.weigh_in_at;
                    const checkInDate = q.checkInAt || q.check_in_at;
                    const status = (q.status || 'WAITING').toUpperCase();
                    const checkOutDate = q.checkOutAt || q.check_out_at || (status === 'COMPLETED' ? (q.updatedAt || q.updated_at) : null);
                    
                    let handleTime = '-';
                    const effectiveStart = weighInDate || (status === 'COMPLETED' ? checkInDate : null);
                    if (effectiveStart) {
                      const start = new Date(effectiveStart);
                      const end = checkOutDate ? new Date(checkOutDate) : new Date();
                      const diffMs = end - start;
                      if (diffMs >= 0) {
                        const diffMins = Math.floor(diffMs / 60000);
                        const hours = Math.floor(diffMins / 60);
                        const mins = diffMins % 60;
                        handleTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                      }
                    }

                    const queueCode = q.queueCode || q.queue_number;
                    const plate = q.licensePlate || q.plate_number;
                    const driver = q.driverName || q.driver_name || '-';
                    const sim = q.noSim || q.no_sim || '-';
                    const doNo = q.noDo || q.no_do || '-';
                    const company = q.perusahaan || q.transporterCompany || q.transporter_company || '-';
                    const classCode = q.classification_id || q.classificationcode || q.classification_code || q.classificationCode || '-';
                    const photo = q.driverPhoto || q.driver_photo;

                    return (
                      <tr key={q.id || queueCode || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa', transition: 'background 0.15s' }}>
                        
                        {/* PIC / Security */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>
                              {q.registeredByName || q.registered_by_name || q.registeredbyname || 'System'}
                            </span>
                          </div>
                        </td>

                        {/* Check-in Time */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>
                            {checkInDate ? new Date(checkInDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') + ' WIB' : '-'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '900', marginTop: '2px' }}>
                            {checkInDate ? new Date(checkInDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                        </td>

                        {/* Check-out Time */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: checkOutDate ? '#0f172a' : '#94a3b8' }}>
                            {checkOutDate ? new Date(checkOutDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') + ' WIB' : '-'}
                          </div>
                          {checkOutDate && (
                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '900', marginTop: '2px' }}>
                              {new Date(checkOutDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </td>

                        {/* Handle Time */}
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '900',
                            color: checkOutDate ? '#16a34a' : '#ea580c',
                            background: checkOutDate ? '#dcfce7' : '#ffedd5',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}>
                            {handleTime}
                          </span>
                        </td>

                        {(() => {
                          const classMap = {
                            'SO': { label: 'FFB SUPER', bg: '#fef3c7', text: '#f59e0b', border: '#fde68a' },
                            'U': { label: 'FFB UMUM', bg: '#d1fae5', text: '#10b981', border: '#a7f3d0' },
                            'M': { label: 'FFB MITRA', bg: '#cffafe', text: '#06b6d4', border: '#bae6fd' },
                            'C': { label: 'CRUDE PALM OIL', bg: '#ffedd5', text: '#ff6b35', border: '#fed7aa' },
                            'K': { label: 'PALM KERNEL', bg: '#ffedd5', text: '#f97316', border: '#fed7aa' },
                            'S': { label: 'PALM KERNEL SHELL', bg: '#f3e8ff', text: '#8b5cf6', border: '#e9d5ff' },
                            'DLL': { label: 'DLL', bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' }
                          };
                          const meta = classMap[classCode] || { label: q.classification_name || classCode, bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' };

                          return (
                            <>
                              {/* Ticket Code */}
                              <td style={tdStyle}>
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: '900',
                                  color: meta.text,
                                  background: meta.bg,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${meta.border}`,
                                  textTransform: 'uppercase'
                                }}>
                                  {queueCode}
                                </span>
                              </td>

                              {/* Classification */}
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: '900',
                                  background: meta.bg,
                                  color: meta.text,
                                  border: `1px solid ${meta.border}`,
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  letterSpacing: '0.02em',
                                  display: 'inline-block',
                                  textTransform: 'uppercase'
                                }}>
                                  {meta.label}
                                </span>
                              </td>
                            </>
                          );
                        })()}

                        {/* License Plate */}
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '900',
                            color: '#0f172a',
                            letterSpacing: '0.03em',
                            background: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            textTransform: 'uppercase'
                          }}>
                            {plate}
                          </span>
                        </td>

                        {/* Driver */}
                        <td style={{ ...tdStyle, fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>{driver}</td>

                        {/* SIM */}
                        <td style={{ ...tdStyle, fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>{sim}</td>

                        {/* DO */}
                        <td style={{ ...tdStyle, fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>{doNo}</td>

                        {/* Company */}
                        <td style={{ ...tdStyle, fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>{company}</td>

                        {/* Photo */}
                        <td style={tdStyle}>
                          {photo ? (
                            <button
                              onClick={() => setSelectedPhoto(photo)}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '2px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <img 
                                src={getPhotoUrl(photo)} 
                                alt="Proof" 
                                style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} 
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                              <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', paddingRight: '4px' }}>View</span>
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '600' }}>No Photo</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '900',
                            letterSpacing: '0.04em',
                            background: status === 'WAITING' ? '#fefce8' : status === 'WEIGH_IN' ? '#e0f2fe' : status === 'GRADING' ? '#ede9fe' : status === 'COMPLETED' || status === 'CHECKED_OUT' ? '#dcfce7' : '#f1f5f9',
                            color: status === 'WAITING' ? '#b45309' : status === 'WEIGH_IN' ? '#0369a1' : status === 'GRADING' ? '#5b21b6' : status === 'COMPLETED' || status === 'CHECKED_OUT' ? '#15803d' : '#64748b',
                            border: status === 'WAITING' ? '1px solid #fde68a' : status === 'WEIGH_IN' ? '1px solid #bae6fd' : status === 'GRADING' ? '1px solid #c4b5fd' : status === 'COMPLETED' || status === 'CHECKED_OUT' ? '1px solid #bbf7d0' : '1px solid #cbd5e1'
                          }}>
                            {status}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {status === 'WAITING' && (
                              <button
                                onClick={() => handleStatusUpdate(q.id, 'WEIGH_IN', q)}
                                title="Call truck to weigh bridge speaker"
                                style={{
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '900',
                                  letterSpacing: '0.02em',
                                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
                                  transition: 'all 0.15s',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <FaVolumeUp style={{ fontSize: '13px' }} />
                                CALL WEIGH-IN
                              </button>
                            )}

                            {status === 'WEIGH_IN' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(q.id, 'COMPLETED')}
                                  style={{
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '900',
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  COMPLETE
                                </button>
                                <button
                                  onClick={async () => {
                                    announceQueue(q);
                                    try {
                                      const token = localStorage.getItem('kip_token');
                                      await fetch(`/api/security/queues/call/${q.id}`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      });
                                    } catch (e) {
                                      console.error('Failed to trigger recall API:', e);
                                    }
                                  }}
                                  title="Repeat speaker call on Web & Mobile"
                                  style={{
                                    background: '#fff7ed',
                                    color: '#ea580c',
                                    border: '1px solid #ffedd5',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '900',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  <FaVolumeUp />
                                  RE-CALL
                                </button>
                              </>
                            )}

                            {status === 'GRADING' && (
                              <button
                                onClick={() => handleStatusUpdate(q.id, 'COMPLETED')}
                                style={{
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '900',
                                  letterSpacing: '0.02em',
                                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                                  transition: 'all 0.15s'
                                }}
                              >
                                COMPLETE
                              </button>
                            )}

                            {(status === 'COMPLETED' || status === 'CHECKED_OUT') && (
                              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '900' }}>DONE</span>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PHOTO PROOF LIGHTBOX MODAL ── */}
      {selectedPhoto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.04em' }}>DRIVER / TRUCK PHOTO PROOF</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{ background: '#f1f5f9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div style={{ width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
              <img src={getPhotoUrl(selectedPhoto)} alt="Driver Proof" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '400px', objectFit: 'contain' }} />
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
            >
              CLOSE PREVIEW
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const thStyle = {
  padding: '12px 14px',
  fontSize: '10px',
  fontWeight: '900',
  color: '#475569',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '12px 14px',
  fontSize: '12px',
  whiteSpace: 'nowrap'
};

export default TruckQueuesTab;
