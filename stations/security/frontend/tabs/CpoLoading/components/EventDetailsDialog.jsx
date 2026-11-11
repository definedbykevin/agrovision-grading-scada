import { useState } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import Dialog from './Dialog.jsx';
import CameraScene from './CameraScene.jsx';
import { durationMinutes, formatDate, formatDuration, formatTime, dateKey, isOperational } from '../loadingModel.js';

export default function EventDetailsDialog({ visit, schedule, now, review, canManage, onReview, onClose }) {
    const [note, setNote] = useState(''), [disposition, setDisposition] = useState('follow_up'), [panel, setPanel] = useState('summary');
    const outside = !isOperational(visit.enteredAt, schedule);
    const tabs = [['summary', 'Ringkasan'], ['timeline', 'Linimasa'], ['review', 'Tinjauan']];
    const submit = event => { event.preventDefault(); if (canManage && note.trim()) onReview({ note: note.trim(), disposition, at: new Date().toISOString() }); };
    return <Dialog title={visit.plate || 'Identitas belum terbaca'} eyebrow={`KUNJUNGAN CONTOH · ${visit.id}`} wide className="cpo-event-dialog" onClose={onClose}>
        <div className="cpo-detail-layout">
            <div className="cpo-detail-evidence"><div className="cpo-detail-image"><CameraScene compact /><span>ILUSTRASI · BUKAN BUKTI KEJADIAN</span></div><strong>{visit.zone}</strong><span>{formatDate(dateKey(visit.enteredAt))} · {formatTime(visit.enteredAt)} WIB</span><p>Keyakinan deteksi contoh: {visit.confidence}%</p></div>
            <div className="cpo-detail-content"><div className="cpo-detail-tabs" role="group" aria-label="Bagian detail kunjungan">{tabs.map(([value, label]) => <button type="button" key={value} aria-pressed={panel === value} onClick={() => setPanel(value)}>{label}</button>)}</div>
                <div className="cpo-detail-page">
                    {panel === 'summary' ? <><div className={`cpo-classification ${outside ? 'is-outside' : ''}`}>{outside ? <FiAlertTriangle /> : <FiCheckCircle />}<div><strong>{outside ? 'Aktivitas di luar jadwal' : 'Aktivitas dalam jadwal'}</strong><p>{outside ? 'Perlu verifikasi; bukan kesimpulan pencurian.' : 'Berdasarkan draf jadwal operasional.'}</p></div></div><div className="cpo-detail-duration"><div><span>Durasi di area</span><strong>{formatDuration(durationMinutes(visit.enteredAt, visit.exitedAt || now))}</strong></div><div><span>Durasi pengisian</span><strong>{formatDuration(durationMinutes(visit.loadingStartedAt, visit.loadingEndedAt || (!visit.exitedAt ? now : null)))}</strong></div></div><p className="cpo-detail-description">{visit.note}</p><div className="cpo-notice"><FiInfo /><p>Waktu di area dan pengisian dihitung terpisah. Seluruh data di dialog ini adalah contoh.</p></div></> : panel === 'timeline' ? <><h3>Urutan aktivitas</h3><ol className="cpo-event-timeline">{[['Terdeteksi masuk', visit.enteredAt], ['Pengisian dimulai', visit.loadingStartedAt], ['Pengisian selesai', visit.loadingEndedAt], ['Terdeteksi keluar', visit.exitedAt]].map(([label, time]) => <li key={label}><i className={time ? 'is-recorded' : ''} /><strong>{label}</strong><span>{time ? `${formatTime(time)} WIB` : 'Belum tercatat'}</span></li>)}</ol></> : review ? <div className="cpo-review-result"><FiCheckCircle /><strong>{review.disposition === 'authorized' ? 'Kegiatan terkonfirmasi sah' : 'Perlu tindak lanjut'}</strong><p>{review.note}</p><small>Catatan contoh pada sesi ini.</small></div> : outside && canManage ? <form className="cpo-review-form" onSubmit={submit}><h3>Tinjau kejadian contoh</h3><label>Hasil tinjauan<select value={disposition} onChange={event => setDisposition(event.target.value)}><option value="follow_up">Perlu tindak lanjut</option><option value="authorized">Kegiatan terkonfirmasi sah</option></select></label><label>Catatan manajemen<input type="text" required maxLength={300} value={note} onChange={event => setNote(event.target.value)} placeholder="Hasil pemeriksaan atau referensi izin" /></label><button type="submit" className="cpo-button cpo-button--primary">Simpan tinjauan contoh</button></form> : <div className="cpo-empty"><FiCheckCircle /><strong>{outside ? 'Menunggu tinjauan manajemen' : 'Aktivitas dalam jadwal'}</strong><p>{outside ? 'Akun ini dapat melihat hasil tinjauan setelah tersedia.' : 'Detail waktu aktivitas tersedia pada linimasa.'}</p></div>}
                </div>
            </div>
        </div>
        <footer className="cpo-dialog-footer"><span>Data contoh · WIB</span><button type="button" className="cpo-button" onClick={onClose}>Tutup detail</button></footer>
    </Dialog>;
}
