import { useRef, useState } from 'react';
import { FiCamera, FiMaximize, FiVideo, FiLayers } from 'react-icons/fi';
import SharedCctvStream from '../../../components/SharedCctvStream.jsx';
import CameraScene from './CameraScene.jsx';

export default function LoadingCamera({ camera, demo, time, onMessage }) {
    const ref = useRef(null), [status, setStatus] = useState('connecting'), [showZone, setShowZone] = useState(true);
    const fullscreen = async () => {
        try {
            if (document.fullscreenElement === ref.current) await document.exitFullscreen();
            else if (ref.current.requestFullscreen) await ref.current.requestFullscreen();
            else onMessage('Layar penuh tidak didukung browser ini.');
        } catch { onMessage('Layar penuh tidak dapat dibuka. Coba kembali dari tombol kamera.'); }
    };
    const live = !demo && camera && status === 'live';
    const statusLabel = { offline: 'Kamera offline', stale: 'Video tertunda', reconnecting: 'Menghubungkan ulang', error: 'Gangguan kamera' }[status] || 'Menghubungkan';
    return <section className="cpo-panel cpo-monitor" aria-label="Pantauan CCTV area CPO Loading">
        <header className="cpo-panel-header"><div className="cpo-section-label"><FiVideo /><h2>Pantauan area</h2></div><span className={`cpo-badge ${demo ? 'neutral' : live ? 'green' : 'neutral'}`}><i />{demo ? 'Ilustrasi' : live ? 'CCTV live' : camera ? statusLabel : 'Belum tersedia'}</span></header>
        <div ref={ref} className="cpo-camera-viewport">
            {demo ? <CameraScene /> : camera ? <SharedCctvStream src={camera.stream_url || `/api/security/cctv/stream/${camera.id}`} alt={camera.camera_name} fit="cover" onStatus={setStatus} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /> : <div className="cpo-camera-empty"><FiCamera /><strong>Kamera Oil Dispatch belum tersedia</strong><span>Periksa konfigurasi dan status kamera Oil Dispatch.</span></div>}
            <div className="cpo-camera-top"><span><i className={live ? 'is-live' : ''} />{demo ? 'OIL DISPATCH · ILUSTRASI AREA' : camera?.camera_name || 'CPO LOADING'}</span><span>{time} WIB</span></div>
            {demo && showZone && <svg className="cpo-zone-overlay" viewBox="0 0 1000 560" aria-label="Contoh zona pengamatan, belum dikalibrasi"><polygon points="325,210 770,240 894,508 180,465" /><text x="341" y="239">ZONA LOADING · CONTOH</text></svg>}
            <div className="cpo-camera-bottom">{demo && <span>Pratinjau visual · bukan rekaman atau bukti kejadian</span>}<div>{demo && <button type="button" className={showZone ? 'selected' : ''} onClick={() => setShowZone(!showZone)} aria-pressed={showZone} title="Tampilkan contoh zona pantau"><FiLayers /><span>Zona contoh</span></button>}<button type="button" onClick={fullscreen} aria-label="Buka CCTV layar penuh"><FiMaximize /></button></div></div>
        </div>
        <footer className="cpo-monitor-footer"><span className="cpo-camera-location"><FiCamera />{demo ? 'Kamera contoh · Loading bay 01' : camera ? `${camera.location || 'Area belum diberi lokasi'} · Kamera #${camera.id}` : 'Kamera belum terhubung'}</span><span><i />{demo ? 'Skenario UI' : 'Menunggu integrasi AI'}</span></footer>
    </section>;
}
