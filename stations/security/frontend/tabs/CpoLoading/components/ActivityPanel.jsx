import { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiSearch, FiTruck, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { durationMinutes, formatDuration, formatTime, isOperational, STATE_LABELS, visitState } from '../loadingModel.js';

export default function ActivityPanel({ visits, total, demo, now, schedule, reviews, query, onQuery, filter, onFilter, filters, onSelect }) {
    const listRef = useRef(null);
    const [capacity, setCapacity] = useState(3), [page, setPage] = useState(0);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            if (!entry.target.isConnected) return;
            const rowHeight = parseFloat(getComputedStyle(entry.target).getPropertyValue('--cpo-row-height')) || 76;
            setCapacity(Math.max(1, Math.min(8, Math.floor(entry.contentRect.height / rowHeight))));
        });
        observer.observe(listRef.current);
        return () => observer.disconnect();
    }, []);
    useEffect(() => setPage(0), [query, filter, visits.length, capacity]);
    const pages = Math.max(1, Math.ceil(visits.length / capacity)), current = Math.min(page, pages - 1);
    const rows = visits.slice(current * capacity, (current + 1) * capacity);
    return <section className="cpo-panel cpo-activity-panel">
        <header className="cpo-panel-header"><div className="cpo-section-label"><FiTruck /><h2>Aktivitas truk</h2><span className="cpo-count">{demo ? total : '—'}</span></div><span className="cpo-muted">Masuk · durasi · status</span></header>
        <div className="cpo-activity-tools"><label className="cpo-search"><FiSearch /><input type="search" aria-label="Cari plat atau ID kunjungan" placeholder="Cari plat atau ID kunjungan" value={query} onChange={event => onQuery(event.target.value)} /></label><div className="cpo-table-filters" role="group" aria-label="Filter aktivitas">{filters.map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilter(value)}>{label}{demo && <span>{count}</span>}</button>)}</div></div>
        <div ref={listRef} className="cpo-activity-list" aria-live="polite">
            {rows.length ? rows.map(visit => {
                const outside = !isOperational(visit.enteredAt, schedule), state = visitState(visit);
                return <button type="button" key={visit.id} className={`cpo-visit ${outside ? 'is-outside' : ''}`} onClick={() => onSelect(visit)} aria-label={`Lihat detail ${visit.plate || visit.id}`}>
                    <span className="cpo-visit-icon">{outside ? <FiAlertTriangle /> : <FiTruck />}</span>
                    <span className="cpo-visit-identity"><strong>{visit.plate || 'Belum terbaca'}</strong><small>{formatTime(visit.enteredAt)} → {formatTime(visit.exitedAt)} WIB</small><span>{outside ? reviews[visit.id] ? 'Di luar jadwal · ditinjau' : 'Di luar jadwal · perlu tinjauan' : STATE_LABELS[state]}</span></span>
                    <span className="cpo-visit-duration"><strong><FiClock />{formatDuration(durationMinutes(visit.enteredAt, visit.exitedAt || now))}</strong><small>Isi: {formatDuration(durationMinutes(visit.loadingStartedAt, visit.loadingEndedAt || (!visit.exitedAt ? now : null)))}</small></span><FiChevronRight />
                </button>;
            }) : <div className="cpo-empty"><FiTruck /><strong>{demo ? 'Tidak ada aktivitas yang cocok' : 'Menunggu aktivitas dari AI'}</strong><p>{demo ? 'Ubah pencarian atau filter aktivitas.' : 'Hitungan dan durasi belum tersedia. Nilai kosong bukan berarti area aman.'}</p>{demo && <button type="button" className="cpo-text-button" onClick={() => { onQuery(''); onFilter('all'); }}>Reset filter</button>}</div>}
        </div>
        <footer className="cpo-pagination"><span>{demo ? `${visits.length ? current * capacity + 1 : 0}–${Math.min((current + 1) * capacity, visits.length)} dari ${visits.length}` : 'Belum ada data AI'}</span><div><button type="button" className="cpo-icon-button" aria-label="Aktivitas sebelumnya" disabled={current === 0} onClick={() => setPage(current - 1)}><FiChevronLeft /></button><span aria-live="polite">{current + 1} / {pages}</span><button type="button" className="cpo-icon-button" aria-label="Aktivitas berikutnya" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}><FiChevronRight /></button></div></footer>
    </section>;
}
