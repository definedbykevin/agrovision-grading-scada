import { useEffect, useMemo, useRef, useState } from 'react';
import { FiActivity, FiCalendar, FiCamera, FiCheckCircle, FiChevronRight, FiClock, FiDownload, FiGrid, FiInfo, FiSettings, FiTruck, FiAlertTriangle, FiX } from 'react-icons/fi';
import LoadingCamera from './components/LoadingCamera.jsx';
import ScheduleDialog from './components/ScheduleDialog.jsx';
import EventDetailsDialog from './components/EventDetailsDialog.jsx';
import { demoVisits, DEMO_TIME } from './demoData.js';
import { canManageSchedule, csvReport, dateKey, formatTime, isOperational, normalizeSchedule, recommendedCamera, summarize } from './loadingModel.js';
import ActivityPanel from './components/ActivityPanel.jsx';
import CapturePanel from './components/CapturePanel.jsx';
import './CpoLoading.css';

const readStored = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };

export default function CpoLoadingTab({ cctvCameras = [], user = {} }) {
    const identity = user.id || user.userId || user.username || 'local';
    const storageKey = `agrovision.cpo-loading.draft.v1.${identity}`;
    const [schedule, setSchedule] = useState(() => normalizeSchedule(readStored(storageKey)));
    const [demo, setDemo] = useState(false), [selectedDate, setSelectedDate] = useState(dateKey());
    const [now, setNow] = useState(() => new Date()), [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
    const [scheduleTab, setScheduleTab] = useState(null), [mobilePanel, setMobilePanel] = useState('monitor');
    const [selectedVisit, setSelectedVisit] = useState(null), [reviews, setReviews] = useState({}), [message, setMessage] = useState('');
    const lastToday = useRef(dateKey());
    const canManage = canManageSchedule(user);
    const camera = useMemo(() => recommendedCamera(cctvCameras), [cctvCameras]);
    useEffect(() => {
        const timer = setInterval(() => {
            const next = new Date(), today = dateKey(next), previous = lastToday.current;
            setNow(next);
            if (today !== previous) { lastToday.current = today; setSelectedDate(date => date === previous ? today : date); }
        }, 15000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!message) return undefined;
        const timer = setTimeout(() => setMessage(''), 6500);
        return () => clearTimeout(timer);
    }, [message]);
    const selectedNow = demo ? new Date(`${selectedDate}T${DEMO_TIME}:00+07:00`) : now;
    const visits = useMemo(() => demo ? demoVisits(selectedDate) : [], [demo, selectedDate]);
    const summary = useMemo(() => summarize(visits, schedule, selectedDate, selectedNow), [visits, schedule, selectedDate, selectedNow]);
    const outsideVisits = summary.visits.filter(visit => !isOperational(visit.enteredAt, schedule));
    const unreviewed = outsideVisits.filter(visit => !reviews[visit.id]);
    const filtered = summary.visits.filter(visit => {
        const matches = `${visit.plate || ''} ${visit.id}`.toLowerCase().includes(query.toLowerCase().trim());
        return matches && (filter === 'all' || filter === 'outside' && !isOperational(visit.enteredAt, schedule) || filter === 'active' && !visit.exitedAt || filter === 'completed' && !!visit.exitedAt);
    }).sort((a, b) => new Date(b.enteredAt) - new Date(a.enteredAt));
    const captures = [...summary.visits].sort((a, b) => new Date(b.enteredAt) - new Date(a.enteredAt)).slice(0, 4);
    const changeMode = value => { setDemo(value); setFilter('all'); setQuery(''); setSelectedVisit(null); };
    const saveSchedule = next => {
        if (!canManage) return false;
        try { localStorage.setItem(storageKey, JSON.stringify(next)); setSchedule(next); setMessage('Draf jadwal disimpan di browser ini. Belum diterapkan ke alarm atau pengguna lain.'); return true; }
        catch { return false; }
    };
    const exportCsv = () => {
        const url = URL.createObjectURL(new Blob([csvReport(filtered, schedule)], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a'); link.href = url; link.download = `cpo-loading-CONTOH-${selectedDate}.csv`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('CSV data contoh diekspor sesuai filter yang dipilih.');
    };
    const reviewEvents = () => { setFilter('outside'); setQuery(''); setMobilePanel('activity'); };
    const tableFilters = [['all', 'Semua', summary.visits.length], ['outside', 'Di luar jadwal', summary.outside], ['active', 'Di area', summary.active], ['completed', 'Selesai', summary.visits.filter(visit => visit.exitedAt).length]];
    const metrics = [
        { icon: FiTruck, label: 'Truk masuk', value: summary.admitted, unit: 'truk', detail: 'Dalam jam operasional' },
        { icon: FiActivity, label: 'Di area', value: summary.active, unit: 'truk', detail: 'Termasuk antre pengisian' },
        { icon: FiClock, label: 'Rerata isi', value: summary.average, unit: 'menit', detail: `${summary.completedFillings} sesi pengisian selesai` },
        { icon: FiAlertTriangle, label: 'Di luar jam', value: summary.outside, unit: 'kejadian', detail: `${unreviewed.length} perlu ditinjau`, warning: true },
    ];
    return <div className="cpo-loading" data-panel={mobilePanel}>
        <header className="cpo-page-heading" aria-label="Kontrol CPO Loading">
            <div className="cpo-heading-controls">
                <div className="cpo-mode-switch" aria-label="Sumber tampilan"><button type="button" aria-pressed={!demo} onClick={() => changeMode(false)}><FiCamera />Live CCTV</button><button type="button" aria-pressed={demo} onClick={() => changeMode(true)}><FiGrid />Data contoh</button></div>
                <label className="cpo-date-control"><FiCalendar /><input aria-label="Tanggal aktivitas" type="date" value={selectedDate} onChange={event => { if (event.target.value) { setSelectedDate(event.target.value); setFilter('all'); setQuery(''); } }} /><span>WIB</span></label>
            </div>
            <div className="cpo-page-actions"><button type="button" className="cpo-button cpo-export" disabled={!demo || !filtered.length} onClick={exportCsv} aria-label="Ekspor CSV" title="Ekspor data contoh sesuai filter"><FiDownload /><span>CSV</span></button><button type="button" className="cpo-button cpo-button--primary" onClick={() => setScheduleTab('normal')} aria-label={canManage ? 'Atur jadwal' : 'Lihat jadwal'}><FiSettings /><span>{canManage ? 'Atur jadwal' : 'Lihat jadwal'}</span></button></div>
        </header>
        {demo && <div className="cpo-mode-notice is-demo"><FiInfo /><p><strong>Data contoh · {DEMO_TIME.replace(':', '.')} WIB.</strong> Simulasi; bukan kejadian nyata.</p><span className="cpo-notice-detail">Jadwal: draf browser</span></div>}
        <section className="cpo-metrics" aria-label="Ringkasan aktivitas tanggal terpilih">{metrics.map(({ icon: Icon, label, value, unit, detail, warning }) => <button type="button" key={label} className={`cpo-metric ${warning ? 'cpo-metric--warning' : ''}`} onClick={() => { if (warning) reviewEvents(); else { setMobilePanel('activity'); setFilter(label === 'Di area' ? 'active' : 'all'); } }}><i><Icon /></i><div><span className="cpo-metric-label">{label}</span><strong>{demo && value !== null ? value : '—'}<small>{demo && value !== null && unit}</small></strong><p>{demo ? detail : 'Menunggu data AI'}</p></div>{warning && <FiChevronRight className="cpo-metric-arrow" />}</button>)}</section>
        <nav className="cpo-mobile-panels" aria-label="Panel CPO Loading">{[['monitor', FiCamera, 'CCTV'], ['captures', FiGrid, 'Capture'], ['activity', FiTruck, 'Aktivitas']].map(([value, Icon, label]) => <button type="button" key={value} aria-pressed={mobilePanel === value} onClick={() => setMobilePanel(value)}><Icon />{label}</button>)}</nav>
        <div className="cpo-workspace">
            <section className="cpo-monitor-column" aria-label="Kamera dan capture">
                <LoadingCamera key={`${demo}-${camera?.id || 'none'}`} demo={demo} camera={camera} time={formatTime(demo ? selectedNow : now)} onMessage={setMessage} />
            </section>
            <aside className="cpo-data-column">
                <CapturePanel captures={captures} demo={demo} onSelect={setSelectedVisit} />
                <ActivityPanel visits={filtered} total={summary.visits.length} demo={demo} now={selectedNow} schedule={schedule} reviews={reviews} query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} filters={tableFilters} onSelect={setSelectedVisit} />
            </aside>
        </div>
        {demo && <footer className="cpo-page-footer"><span><i />Mode contoh · tidak mencatat kejadian nyata</span><span>Aktivitas di luar jadwal perlu verifikasi petugas.</span></footer>}
        {scheduleTab && <ScheduleDialog schedule={schedule} initialTab={scheduleTab} selectedDate={selectedDate} user={user} canManage={canManage} onSave={saveSchedule} onClose={() => setScheduleTab(null)} />}
        {selectedVisit && <EventDetailsDialog visit={selectedVisit} schedule={schedule} now={selectedNow} review={reviews[selectedVisit.id]} canManage={canManage} onClose={() => setSelectedVisit(null)} onReview={review => { setReviews(previous => ({ ...previous, [selectedVisit.id]: review })); setMessage('Tinjauan contoh disimpan untuk sesi pratinjau ini.'); }} />}
        {message && <div className="cpo-toast" role="status"><FiCheckCircle /><span>{message}</span><button type="button" aria-label="Tutup pemberitahuan" onClick={() => setMessage('')}><FiX /></button></div>}
    </div>;
}
