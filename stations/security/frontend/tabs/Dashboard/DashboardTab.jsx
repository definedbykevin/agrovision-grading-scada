import React, { useState, useEffect } from 'react';
import {
  FaTruck,
  FaShieldAlt,
  FaExclamationTriangle,
  FaVideo,
  FaMapMarkerAlt,
  FaArrowUp,
  FaChartBar,
  FaChartLine
} from 'react-icons/fa';

/* ────────────────────────────────────────────────────────────────
   DESIGN TOKENS
   Enterprise operations dashboard — restrained palette, consistent
   spacing/radius/shadow scale. Yellow (#FFDB3B) is the brand accent,
   used sparingly, never as a dominant surface color.
   ──────────────────────────────────────────────────────────────── */
const colors = {
  primary: '#FFDB3B',
  primaryText: '#8A6D00',

  white: '#FFFFFF',
  bg: '#F8FAFC',
  bgAlt: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  textMuted: '#64748B',
  textBody: '#334155',
  textStrong: '#0F172A',

  success: '#16A34A',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',

  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',

  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',

  info: '#2563EB',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
};

const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const radius = { sm: 8, md: 10, lg: 12 };
const shadow = '0 1px 3px rgba(15, 23, 42, 0.06)';

const font = {
  section: { fontSize: '0.8rem', fontWeight: 700, color: colors.textStrong },
  metric: { fontSize: '1.75rem', fontWeight: 800, color: colors.textStrong, lineHeight: 1.1 },
  support: { fontSize: '0.7rem', fontWeight: 500, color: colors.textMuted },
  label: { fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted },
  mono: { fontFamily: 'JetBrains Mono, monospace' },
};

const panelStyle = {
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  boxShadow: shadow,
};

// Single chart accent — one primary color, no multi-color gradients / glow.
const chartColor = colors.info;

/* ────────────────────────────────────────────────────────────────
   REUSABLE COMPONENTS
   Kept in this file to avoid a wider refactor of the project's
   component tree; only the visual concerns that repeat across the
   dashboard are consolidated here.
   ──────────────────────────────────────────────────────────────── */

function SectionHeader({ icon, iconColor, title, badgeLabel, badgeColor, badgeBg, badgeBorder }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: space.sm,
        paddingBottom: space.sm,
        borderBottom: `1px solid ${colors.bgAlt}`,
        flexShrink: 0,
        gap: space.xs,
      }}
    >
      <h3 style={{ margin: 0, ...font.section, display: 'flex', alignItems: 'center', gap: space.xs }}>
        {icon && <span style={{ color: iconColor || colors.textMuted, display: 'flex' }}>{icon}</span>}
        {title}
      </h3>
      {badgeLabel && (
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            color: badgeColor || colors.textMuted,
            background: badgeBg || colors.bgAlt,
            border: `1px solid ${badgeBorder || colors.border}`,
            padding: '2px 7px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          {badgeLabel}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ label, color, bg }) {
  return (
    <span
      style={{
        fontSize: '0.6rem',
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 6,
        background: bg,
        color: color,
        textTransform: 'capitalize',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function MetricCard({ icon, label, value, valueColor, iconColor, trendLabel, trendPositive, style }) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: `${space.md}px ${space.lg}px`,
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div style={{ ...font.label, fontSize: '1.2rem', fontWeight: 700 }}>{label}</div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...font.metric, fontSize: 64, fontWeight: 800, color: valueColor || colors.textStrong }}>
          {value}
        </div>
      </div>

      {trendLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: space.xs, ...font.support, fontSize: '0.85rem' }}>
          {trendPositive && (
            <span style={{ color: colors.success, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
              <FaArrowUp size={8} />
            </span>
          )}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        color: colors.textMuted,
        textAlign: 'center',
        padding: space.lg,
      }}
    >
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textBody }}>{title}</span>
      {message && <span style={{ fontSize: '0.68rem' }}>{message}</span>}
    </div>
  );
}

function SkeletonBlock({ width = '100%', height = 12, r = 6 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: r,
        background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 37%, #F1F5F9 63%)',
        backgroundSize: '400% 100%',
        animation: 'dashboardSkeletonPulse 1.4s ease infinite',
      }}
    />
  );
}

function LoadingDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, height: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes dashboardSkeletonPulse {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: space.md, minHeight: 0 }}>
        {/* LEFT: chart + queue list, stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, minHeight: 0 }}>
          <div style={{ ...panelStyle, padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.sm, flex: '1.2 1 0%', minHeight: 0 }}>
            <SkeletonBlock width="45%" height={11} />
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: space.sm, paddingTop: space.sm }}>
              {[40, 65, 30, 80, 50].map((h, j) => (
                <SkeletonBlock key={j} width="100%" height={`${h}%`} />
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: space.md, flex: '1 1 0%', minHeight: 0 }}>
            <div style={{ ...panelStyle, padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.sm, minHeight: 0 }}>
              <SkeletonBlock width="45%" height={11} />
              {[0, 1, 2, 3].map((j) => (
                <SkeletonBlock key={j} height={22} />
              ))}
            </div>
            <div style={{ ...panelStyle, padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.sm, minHeight: 0 }}>
              <SkeletonBlock width="55%" height={11} />
              {[0, 1, 2].map((j) => (
                <SkeletonBlock key={j} height={26} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: stacked summary cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, minHeight: 0 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...panelStyle, padding: `${space.md}px ${space.lg}px`, display: 'flex', flexDirection: 'column', gap: space.sm, justifyContent: 'center', flex: 1, minHeight: 0 }}>
              <SkeletonBlock width="55%" height={9} />
              <SkeletonBlock width="35%" height={22} />
              <SkeletonBlock width="75%" height={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Status → visual mapping, restrained semantic palette */
function getQueueStatusStyle(status) {
  switch (status) {
    case 'WAITING':
      return { color: colors.primaryText, bg: '#FEF9E7', label: 'Waiting' };
    case 'WEIGH_IN':
      return { color: colors.info, bg: colors.infoBg, label: 'Weigh In' };
    case 'GRADING':
      return { color: colors.textBody, bg: colors.bgAlt, label: 'Grading' };
    case 'COMPLETED':
      return { color: colors.success, bg: colors.successBg, label: 'Completed' };
    default:
      return { color: colors.textMuted, bg: colors.bgAlt, label: status };
  }
}

/* ────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   Data fetching, polling, filtering, and calculation logic is
   unchanged from the existing implementation — only presentation
   has been redesigned.
   ──────────────────────────────────────────────────────────────── */
function DashboardTab() {
  const [summary, setSummary] = useState({ activeQueues: 0, activePatrols: 0, openIncidents: 0, activeCctvs: 0 });
  const [queues, setQueues] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activeGuards, setActiveGuards] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [cctvs, setCctvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'
  const [timeFilter, setTimeFilter] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAllDashboardData = async () => {
      try {
        const token = localStorage.getItem('kip_token');
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Parallel Data Fetching from all stations
        const [
          summaryRes,
          queuesRes,
          classRes,
          incidentsRes,
          guardsRes,
          checkpointsRes,
          cctvsRes
        ] = await Promise.all([
          fetch('/api/security/queues/summary', { headers: authHeaders }),
          fetch('/api/security/queues', { headers: authHeaders }),
          fetch('/api/security/queues/classifications', { headers: authHeaders }),
          fetch('/api/security/incidents', { headers: authHeaders }),
          fetch('/api/security/patrol/active', { headers: authHeaders }),
          fetch('/api/security/patrol/checkpoints', { headers: authHeaders }),
          fetch('/api/security/cctv', { headers: authHeaders })
        ]);

        const summaryJson = await summaryRes.json().catch(() => ({}));
        const queuesJson = await queuesRes.json().catch(() => ({}));
        const classJson = await classRes.json().catch(() => ({}));
        const incidentsData = await incidentsRes.json().catch(() => []);
        const guardsData = await guardsRes.json().catch(() => []);
        const checkpointsData = await checkpointsRes.json().catch(() => []);
        const cctvsJson = await cctvsRes.json().catch(() => ({}));

        if (isMounted) {
          const queueList = Array.isArray(queuesJson.data) ? queuesJson.data : (Array.isArray(queuesJson) ? queuesJson : []);
          const classList = Array.isArray(classJson.data) ? classJson.data : (Array.isArray(classJson) ? classJson : []);
          const cctvList = Array.isArray(cctvsJson.data) ? cctvsJson.data : (Array.isArray(cctvsJson) ? cctvsJson : []);
          const guardList = Array.isArray(guardsData) ? guardsData : [];
          const incidentList = Array.isArray(incidentsData) ? incidentsData : [];
          const checkpointList = Array.isArray(checkpointsData) ? checkpointsData : [];

          setQueues(queueList);
          setClassifications(classList);
          setIncidents(incidentList);
          setActiveGuards(guardList);
          setCheckpoints(checkpointList);
          setCctvs(cctvList);

          setSummary({
            activeQueues: summaryJson.activeQueues ?? queueList.filter(q => ['WAITING', 'WEIGH_IN', 'GRADING'].includes((q.status || '').toUpperCase())).length,
            activePatrols: summaryJson.activePatrols ?? guardList.length,
            openIncidents: summaryJson.openIncidents ?? incidentList.filter(i => ['SUBMITTED', 'PENDING', 'OPEN'].includes((i.status || '').toUpperCase())).length,
            activeCctvs: cctvList.filter(c => c.is_active === 1 || c.is_active === true).length
          });
        }
      } catch (err) {
        console.error('[Security Dashboard] Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllDashboardData();
    const interval = setInterval(fetchAllDashboardData, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute Time Window Boundaries (Daily 07:00 AM shift, Weekly 7 days, Monthly 30 days)
  const now = new Date();
  const shiftStart = new Date(now);
  if (now.getHours() < 7) {
    shiftStart.setDate(shiftStart.getDate() - 1);
  }
  shiftStart.setHours(7, 0, 0, 0);

  const shiftEnd = new Date(shiftStart);
  shiftEnd.setDate(shiftEnd.getDate() + 1);
  shiftEnd.setMilliseconds(-1);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);

  // Filter queues shift today
  const queuesToday = queues.filter(q => {
    const rawDate = q.created_at || q.check_in_at || q.checkInAt || q.registered_at || q.timestamp || q.createdAt;
    if (!rawDate) return false;
    const formatted = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate;
    const qDate = new Date(formatted);
    return !isNaN(qDate.getTime()) && qDate >= shiftStart && qDate <= shiftEnd;
  });

  // Filter incidents reported today
  const incidentsToday = incidents.filter(inc => {
    const rawDate = inc.reported_at || inc.created_at || inc.createdAt;
    if (!rawDate) return false;
    const formatted = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate;
    const incDate = new Date(formatted);
    return !isNaN(incDate.getTime()) && incDate >= shiftStart && incDate <= shiftEnd;
  });

  // Filter checkpoints scanned today
  const checkpointsToday = checkpoints.filter(cp => {
    const rawDate = cp.verified_at || cp.created_at || cp.createdAt;
    if (!rawDate) return false;
    const formatted = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate;
    const cpDate = new Date(formatted);
    return !isNaN(cpDate.getTime()) && cpDate >= shiftStart && cpDate <= shiftEnd;
  });

  // Filter Queues according to Selected Time Filter (Daily, Weekly, Monthly)
  const filteredQueuesForChart = queues.filter(q => {
    const rawDate = q.created_at || q.check_in_at || q.checkInAt || q.registered_at || q.timestamp || q.createdAt;
    if (!rawDate) return true;
    const formatted = typeof rawDate === 'string' ? rawDate.replace(' ', 'T') : rawDate;
    const qDate = new Date(formatted);
    if (isNaN(qDate.getTime())) return true;

    if (timeFilter === 'daily') {
      return qDate >= shiftStart && qDate <= shiftEnd;
    } else if (timeFilter === 'weekly') {
      return qDate >= weekStart;
    } else if (timeFilter === 'monthly') {
      return qDate >= monthStart;
    }
    return true;
  });

  // Commodity Classification Colors (100% matched to mobile app Select Transport Classification)
  const CLASSIFICATION_COLORS = {
    'SO': { color: '#f59e0b', bg: '#fef3c7', border: '#fde68a' }, // FFB Super (Amber Gold)
    'U':  { color: '#10b981', bg: '#d1fae5', border: '#a7f3d0' }, // FFB Umum (Mint / Emerald Green #10B981)
    'M':  { color: '#06b6d4', bg: '#cffafe', border: '#bae6fd' }, // FFB Mitra (Sky Cyan #06B6D4)
    'C':  { color: '#ff6b35', bg: '#ffedd5', border: '#fed7aa' }, // Crude Palm Oil (Coral Orange #FF6B35)
    'K':  { color: '#f97316', bg: '#ffedd5', border: '#fed7aa' }, // Palm Kernel (Tangerine Orange #F97316)
    'S':  { color: '#8b5cf6', bg: '#f3e8ff', border: '#e9d5ff' }, // Palm Kernel Shell (Soft Purple #8B5CF6)
    'DLL': { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' }, // DLL (Slate Gray #64748B)
    'OTHER': { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  };

  const getCommodityColor = (code) => {
    const upper = (code || '').toUpperCase();
    return CLASSIFICATION_COLORS[upper] || { color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' };
  };

  // Dynamic Commodity Breakdown
  const commodityCounts = {};
  classifications.forEach(c => {
    const meta = getCommodityColor(c.code);
    commodityCounts[c.code] = { count: 0, label: c.label || c.code, code: c.code, ...meta };
  });
  // Fallback for missing/unknown classifications
  if (!commodityCounts['OTHER']) {
    const meta = getCommodityColor('OTHER');
    commodityCounts['OTHER'] = { count: 0, label: 'Lain-lain', code: 'OTHER', ...meta };
  }

  filteredQueuesForChart.forEach(q => {
    const code = (q.classification_code || q.classificationCode || q.classification_id || 'OTHER').toUpperCase();
    if (commodityCounts[code]) {
      commodityCounts[code].count++;
    } else {
      // Try finding by label if code didn't match (fallback)
      const found = classifications.find(c => c.label && c.label.toUpperCase() === code);
      if (found) {
        commodityCounts[found.code].count++;
      } else {
        commodityCounts['OTHER'].count++;
      }
    }
  });

  // Filter out 'OTHER' if it has 0 count to keep chart clean
  const commodityItems = Object.values(commodityCounts).filter(c => c.count > 0 || c.code !== 'OTHER');

  const totalCommoditiesCount = commodityItems.reduce((a, b) => a + b.count, 0);
  const maxCount = Math.max(...commodityItems.map(c => c.count), 1);

  // Calculate coordinates for smooth Bezier Spline Line Chart (SVG viewBox 0 0 300 120)
  const coords = commodityItems.map((item, idx) => {
    // If only 1 item, place at center (150)
    // If more, distribute across 240px (from 30 to 270)
    const span = commodityItems.length > 1 ? 240 / (commodityItems.length - 1) : 0;
    const x = commodityItems.length > 1 ? 30 + (idx * span) : 150;
    const heightRatio = totalCommoditiesCount > 0 ? (item.count / maxCount) : 0;
    const y = 95 - (heightRatio * 70);
    return { x, y, item, idx };
  });

  // Generate Smooth Cubic Bezier Path (d)
  const createSmoothPath = (points) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
    return d;
  };

  const smoothPathD = createSmoothPath(coords);
  const areaPathD = coords.length > 0
    ? `${smoothPathD} L ${coords[coords.length - 1].x},100 L ${coords[0].x},100 Z`
    : '';

  if (loading) {
    return <LoadingDashboard />;
  }

  return (
    <div className="som-view-container" style={{ display: 'flex', flexDirection: 'column', gap: space.md, height: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* ── LAYOUT ──
          Two-column layout: primary content (chart + truck queue list) on
          the left, a stacked column of compact summary cards on the right —
          mirrors the reference (large chart + list on the left, a vertical
          stack of stat cards on the right). */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: space.md, minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT: Operational Overview (chart) + Truck Queues, stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, minHeight: 0, overflow: 'hidden' }}>

          {/* Operational Overview / Commodity Mix */}
          <div style={{ ...panelStyle, padding: space.lg, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: '1.2 1 0%', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm, paddingBottom: space.sm, borderBottom: `1px solid ${colors.bgAlt}`, flexShrink: 0, gap: space.xs }}>
              <h3 style={{ margin: 0, ...font.section, display: 'flex', alignItems: 'center', gap: space.xs }}>
                <FaChartBar size={12} style={{ color: colors.textMuted }} /> Operational Overview
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: space.xs }}>
                {/* Daily / Weekly / Monthly */}
                <div style={{ display: 'flex', background: colors.bgAlt, padding: 2, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                  {[
                    { key: 'daily', label: 'Daily' },
                    { key: 'weekly', label: 'Weekly' },
                    { key: 'monthly', label: 'Monthly' },
                  ].map((tf) => (
                    <button
                      key={tf.key}
                      onClick={() => setTimeFilter(tf.key)}
                      title={`Filter ${tf.key}`}
                      style={{
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: timeFilter === tf.key ? colors.textStrong : 'transparent',
                        color: timeFilter === tf.key ? colors.white : colors.textMuted,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                {/* Bar / Line */}
                <div style={{ display: 'flex', gap: 2, background: colors.bgAlt, padding: 2, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                  <button
                    onClick={() => setChartType('bar')}
                    title="Bar chart"
                    style={{
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: chartType === 'bar' ? chartColor : 'transparent',
                      color: chartType === 'bar' ? colors.white : colors.textMuted,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FaChartBar size={14} />
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    title="Line chart"
                    style={{
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: chartType === 'line' ? chartColor : 'transparent',
                      color: chartType === 'line' ? colors.white : colors.textMuted,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FaChartLine size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0, position: 'relative' }}>
              {chartType === 'bar' ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: space.md, padding: `${space.sm}px 2px 2px 2px`, borderBottom: `1px solid ${colors.bgAlt}` }}>
                  {commodityItems.map((item, idx) => {
                    const heightPct = totalCommoditiesCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
                    const isHovered = hoveredNode?.code === item.code;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredNode(item)}
                        onMouseLeave={() => setHoveredNode(null)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4, cursor: 'default' }}
                      >
                        <span
                          style={{
                            ...font.mono,
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: item.count > 0 ? item.color : colors.borderStrong,
                            background: item.count > 0 ? item.bg : 'transparent',
                            border: item.count > 0 ? `1px solid ${item.border}` : '1px solid transparent',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {item.count}
                        </span>
                        <div
                          style={{
                            width: '80%', // Responsive width relative to container
                            maxWidth: 80, // Much wider than 24
                            height: `${Math.max(heightPct, 5)}%`,
                            background: item.count > 0 ? item.color : colors.bgAlt,
                            opacity: isHovered || !hoveredNode ? 1 : 0.45,
                            borderRadius: '6px 6px 0 0',
                            boxShadow: item.count > 0 ? `0 2px 8px ${item.color}40` : 'none',
                            transition: 'opacity 0.15s ease, height 0.2s ease, transform 0.15s ease',
                            transform: isHovered ? 'scaleY(1.03)' : 'scaleY(1)',
                            transformOrigin: 'bottom',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: item.color,
                            background: item.bg,
                            border: `1px solid ${item.border}`,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            marginTop: 4,
                          }}
                        >
                          {item.code}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `${space.xs}px 2px 2px 2px`, borderBottom: `1px solid ${colors.bgAlt}` }}>
                  <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
                    <svg style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }} viewBox="0 0 300 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColor} stopOpacity="0.22" />
                          <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                        </linearGradient>
                        <filter id="lineShadow" x="-20%" y="-40%" width="140%" height="180%">
                          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor={chartColor} floodOpacity="0.25" />
                        </filter>
                      </defs>

                      <line x1="20" y1="25" x2="280" y2="25" stroke={colors.bgAlt} strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      <line x1="20" y1="60" x2="280" y2="60" stroke={colors.bgAlt} strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      <line x1="20" y1="95" x2="280" y2="95" stroke={colors.border} strokeWidth="1" vectorEffect="non-scaling-stroke" />

                      {/* Vertical guide from the hovered point down to the baseline */}
                      {hoveredNode && (() => {
                        const hc = coords.find((c) => c.item.code === hoveredNode.code);
                        if (!hc) return null;
                        return <line x1={hc.x} y1={hc.y} x2={hc.x} y2="95" stroke={colors.borderStrong} strokeDasharray="2 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                      })()}

                      <path d={areaPathD} fill="url(#areaGradient)" />
                      <path
                        d={smoothPathD}
                        fill="none"
                        stroke={chartColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#lineShadow)"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>

                    {/* Nodes (rendered as HTML divs to avoid SVG stretching) */}
                    {coords.map((c, i) => {
                      const isHovered = hoveredNode?.code === c.item.code;
                      const leftPct = (c.x / 300) * 100;
                      const topPct = (c.y / 120) * 100;
                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredNode(c.item)}
                          onMouseLeave={() => setHoveredNode(null)}
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: isHovered ? 24 : 16,
                            height: isHovered ? 24 : 16,
                            transform: 'translate(-50%, -50%)',
                            background: c.item.color,
                            border: `3px solid ${colors.white}`,
                            borderRadius: '50%',
                            boxShadow: isHovered ? `0 0 0 8px ${c.item.color}33` : `0 2px 6px ${c.item.color}40`,
                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: 'pointer',
                            zIndex: 10
                          }}
                        />
                      );
                    })}

                    {/* Y-axis scale labels */}
                    <div style={{ position: 'absolute', left: 0, top: '18%', transform: 'translateY(-50%)', fontSize: '0.55rem', fontWeight: 600, color: colors.textMuted, pointerEvents: 'none' }}>
                      {maxCount}
                    </div>
                    <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: '0.55rem', fontWeight: 600, color: colors.textMuted, pointerEvents: 'none' }}>
                      {Math.round(maxCount / 2)}
                    </div>
                    <div style={{ position: 'absolute', left: 0, top: '79%', transform: 'translateY(-50%)', fontSize: '0.55rem', fontWeight: 600, color: colors.textMuted, pointerEvents: 'none' }}>
                      0
                    </div>

                    {/* Hover tooltip */}
                    {hoveredNode && (() => {
                      const hc = coords.find((c) => c.item.code === hoveredNode.code);
                      if (!hc) return null;
                      const leftPct = (hc.x / 300) * 100;
                      const topPct = (hc.y / 120) * 100;
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            transform: 'translate(-50%, -135%)',
                            background: colors.textStrong,
                            color: colors.white,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 6,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            boxShadow: '0 4px 10px rgba(15, 23, 42, 0.18)',
                            borderLeft: `3px solid ${hoveredNode.color}`,
                          }}
                        >
                          {hoveredNode.label}: {hoveredNode.count}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 2, padding: '0 5px', flexShrink: 0 }}>
                    {commodityItems.map((item, idx) => (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredNode(item)}
                        onMouseLeave={() => setHoveredNode(null)}
                        style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                      >
                        <span
                          style={{
                            ...font.mono,
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            color: hoveredNode?.code === item.code ? colors.white : (item.count > 0 ? item.color : colors.borderStrong),
                            background: hoveredNode?.code === item.code ? item.color : (item.count > 0 ? item.bg : 'transparent'),
                            border: item.count > 0 ? `1px solid ${item.border}` : '1px solid transparent',
                            padding: '1px 4px',
                            borderRadius: 4,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {item.count}
                        </span>
                        <span
                          style={{
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            color: item.color,
                            background: item.bg,
                            border: `1px solid ${item.border}`,
                            padding: '1px 4px',
                            borderRadius: 4,
                          }}
                        >
                          {item.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: space.xs, fontSize: '0.65rem', color: colors.textMuted, fontWeight: 600 }}>
                <span style={{ textTransform: 'capitalize' }}>{timeFilter} volume</span>
                <span style={{ ...font.mono, color: colors.textStrong, fontWeight: 700 }}>{totalCommoditiesCount} trucks</span>
              </div>
            </div>
          </div>

          {/* Bottom split: Truck Queues + Active Patrols */}
          <div style={{ display: 'grid', gridTemplateColumns: '3.6fr 1.4fr', gap: space.md, flex: '1 1 0%', minHeight: 0 }}>

            {/* Truck Queues */}
            <div style={{ ...panelStyle, padding: `${space.md}px ${space.lg}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <SectionHeader
                icon={<FaTruck size={12} />}
                title="Truck Queues"
                badgeLabel="Live Recently (15)"
                badgeColor={colors.primaryText}
                badgeBg="#FEF9E7"
                badgeBorder="#FDE68A"
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: space.xs, overflowY: 'auto', paddingRight: 2 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(70px, 1fr) minmax(70px, 1fr) minmax(70px, 1fr) minmax(75px, 1fr) minmax(70px, 1fr) minmax(70px, 1fr) minmax(95px, 1.3fr) minmax(85px, 1.1fr) minmax(90px, 1.3fr) 80px 75px',
                    gap: space.xs,
                    padding: `0 ${space.sm}px ${space.xs}px ${space.sm}px`,
                    borderBottom: `1px solid ${colors.border}`,
                    marginBottom: space.xs,
                  }}
                >
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted, textAlign: 'center' }}>FFB SUPER</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted, textAlign: 'center' }}>FFB UMUM</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted, textAlign: 'center' }}>FFB MITRA</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted, textAlign: 'center' }}>CPO</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted, textAlign: 'center' }}>KERNEL</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted, textAlign: 'center' }}>SHELL</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted }}>DRIVER NAME</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted }}>LICENSE PLATE</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted }}>VENDOR</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted }}>CHECKIN TIME</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: colors.textMuted, textAlign: 'right' }}>STATUS</span>
                </div>

                {queues.length === 0 ? (
                  <EmptyState title="No active queues" message="All truck operations are clear." />
                ) : (
                  queues.slice(0, 15).map((q, idx) => {
                    const code = q.ticket_number || q.queueCode || q.queue_code || q.queue_number || `U-${idx + 1}`;
                    const plate = q.licensePlate || q.plate_number || 'Unknown';
                    const driver = q.driverName || q.driver_name || '-';
                    const vendor = q.perusahaan || q.transporterCompany || q.transporter_company || '-';
                    const rawClassCode = (q.classification_code || q.classificationCode || q.classification_id || '').toUpperCase();

                    const status = (q.status || 'WAITING').toUpperCase();
                    const s = getQueueStatusStyle(status);
                    
                    const checkInDate = q.check_in_at ? new Date(q.check_in_at) : null;
                    const timeStr = checkInDate ? checkInDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

                    // Helper to render active ticket badge vs clean subtle dot for empty slot
                    const renderTicketSlot = (targetCode, badgeStyle) => {
                      if (rawClassCode === targetCode) {
                        return (
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <span
                              style={{
                                ...font.mono,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4,
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                                ...badgeStyle,
                              }}
                              title={code}
                            >
                              {code}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1, userSelect: 'none' }}>·</span>
                        </div>
                      );
                    };

                    return (
                      <div
                        key={q.id || idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(70px, 1fr) minmax(70px, 1fr) minmax(70px, 1fr) minmax(75px, 1fr) minmax(70px, 1fr) minmax(70px, 1fr) minmax(95px, 1.3fr) minmax(85px, 1.1fr) minmax(90px, 1.3fr) 80px 75px',
                          gap: space.xs,
                          alignItems: 'center',
                          padding: `${space.xs + 2}px ${space.sm}px`,
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.sm - 2,
                        }}
                      >
                        {/* 1. FFB SUPER (Amber / Gold) */}
                        {renderTicketSlot('SO', {
                          color: '#B45309',
                          background: '#FEF3C7',
                          border: '1px solid #FDE68A',
                        })}

                        {/* 2. FFB UMUM (Slate) */}
                        {renderTicketSlot('U', {
                          color: '#334155',
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                        })}

                        {/* 3. FFB MITRA (Cyan / Blue) */}
                        {renderTicketSlot('M', {
                          color: '#0369A1',
                          background: '#E0F2FE',
                          border: '1px solid #BAE6FD',
                        })}

                        {/* 4. CRUDE PALM OIL (Orange) */}
                        {renderTicketSlot('C', {
                          color: '#C2410C',
                          background: '#FFEDD5',
                          border: '1px solid #FED7AA',
                        })}

                        {/* 5. PALM KERNEL (Purple) */}
                        {renderTicketSlot('K', {
                          color: '#6D28D9',
                          background: '#EDE9FE',
                          border: '1px solid #DDD6FE',
                        })}

                        {/* 6. PALM KERNEL SHELL (Teal / Emerald) */}
                        {renderTicketSlot('S', {
                          color: '#0F766E',
                          background: '#CCFBF1',
                          border: '1px solid #99F6E4',
                        })}

                        {/* DRIVER NAME */}
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: colors.textBody, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 4, textTransform: 'uppercase' }} title={driver}>
                          {driver}
                        </span>

                        {/* LICENSE PLATE */}
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: colors.textBody, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {plate}
                        </span>

                        {/* VENDOR */}
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: colors.textBody, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 4, textTransform: 'uppercase' }} title={vendor}>
                          {vendor}
                        </span>
                        
                        {/* CHECKIN TIME */}
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                          {timeStr}
                        </span>

                        {/* STATUS */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <StatusBadge label={s.label} color={s.color} bg={s.bg} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Active Patrols */}
            <div style={{ ...panelStyle, padding: `${space.md}px ${space.md}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <SectionHeader
                icon={<FaShieldAlt size={12} />}
                title="Active Patrols"
                badgeLabel={`${activeGuards.length} on duty`}
                badgeColor={colors.success}
                badgeBg={colors.successBg}
                badgeBorder={colors.successBorder}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: space.xs, overflowY: 'auto', paddingRight: 2 }}>
                {activeGuards.length === 0 ? (
                  <EmptyState title="No active patrol sessions" />
                ) : (
                  activeGuards.map((g, idx) => (
                    <div
                      key={g.session_id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: `${space.xs + 2}px ${space.sm}px`,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.sm - 2,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: space.xs + 4 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: colors.bgAlt,
                            border: `1.5px solid ${colors.primary}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: colors.textBody,
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {(g.avatar_photo || g.photo) ? (
                            <img
                              src={g.avatar_photo || g.photo}
                              alt={g.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            (g.name || 'G').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.textStrong }}>{g.name || 'Security Officer'}</span>
                          <span style={{ fontSize: '0.62rem', color: colors.textMuted, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FaMapMarkerAlt size={8} style={{ color: colors.primary }} /> {g.current_station_key || 'Patrolling area'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.6rem', color: colors.success, fontWeight: 700 }}>ON DUTY</span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.success, flexShrink: 0, boxShadow: `0 0 6px ${colors.success}` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {/* close left column */}
        </div>

        {/* RIGHT: stacked summary cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, minHeight: 0, overflow: 'hidden' }}>
          <MetricCard
            style={{ flex: 1, minHeight: 0 }}
            label="Trucks in Queue"
            value={summary.activeQueues}
            trendLabel={`${queuesToday.length} Registered Today`}
            trendPositive={queuesToday.length > 0}
          />
          <MetricCard
            style={{ flex: 1, minHeight: 0 }}
            label="Active Patrols"
            value={summary.activePatrols}
            trendLabel={`${activeGuards.length} On Duty · ${checkpoints.length} Checkpoints Verified`}
          />
          <MetricCard
            style={{ flex: 1, minHeight: 0 }}
            label="Total Checkpoints"
            value={checkpointsToday.length}
            trendLabel="Scanned Today"
          />
          <MetricCard
            style={{ flex: 1, minHeight: 0 }}
            label="CCTV Cameras"
            value={`${summary.activeCctvs} / ${cctvs.length}`}
            trendLabel="Online"
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardTab;