import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import CameraScene from './CameraScene.jsx';
import { formatTime } from '../loadingModel.js';

export default function CapturePanel({ captures, demo, onSelect }) {
    const ref = useRef(null), [capacity, setCapacity] = useState(3), [page, setPage] = useState(0);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            if (!entry.target.isConnected) return;
            const { width } = entry.contentRect;
            const slots = width / 220;
            setCapacity(Math.max(1, Math.min(4, Math.floor(slots))));
        });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    useEffect(() => setPage(0), [capacity, demo, captures[0]?.id]);
    const pages = Math.max(1, Math.ceil(captures.length / capacity)), current = Math.min(page, pages - 1);
    return <section className="cpo-panel cpo-captures">
        <header className="cpo-panel-header"><div className="cpo-section-label"><FiCamera /><h2>Recent capture</h2><span className="cpo-count">{captures.length}</span></div>{pages > 1 && <div className="cpo-capture-navigation"><button type="button" className="cpo-icon-button" aria-label="Capture sebelumnya" disabled={current === 0} onClick={() => setPage(current - 1)}><FiChevronLeft /></button><span>{current + 1}/{pages}</span><button type="button" className="cpo-icon-button" aria-label="Capture berikutnya" disabled={current === pages - 1} onClick={() => setPage(current + 1)}><FiChevronRight /></button></div>}</header>
        <div ref={ref} className="cpo-capture-items" style={{ '--capture-count': capacity }}>
            {captures.length ? captures.slice(current * capacity, (current + 1) * capacity).map(visit => <button key={visit.id} type="button" className="cpo-capture-card" onClick={() => onSelect(visit)} aria-label={`Capture ${visit.plate || visit.id}`}><div className="cpo-capture-picture"><CameraScene compact /><span>CONTOH</span></div><div><strong>{visit.plate || 'Belum terbaca'}</strong><span>{formatTime(visit.enteredAt)} WIB</span></div></button>) : <div className="cpo-capture-empty"><span className="cpo-capture-empty-icon"><FiCamera /></span><div><strong>Belum ada capture</strong><p>Capture otomatis muncul setelah AI terhubung.</p></div></div>}
        </div>
    </section>;
}
