import { useId, useState } from 'react';
import { FiCalendar, FiClock, FiInfo, FiRotateCcw, FiSave, FiLock } from 'react-icons/fi';
import Dialog from './Dialog.jsx';
import { dateKey, formatDate, scheduleLabel, validateNormal, validateException } from '../loadingModel.js';

const DAYS = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [0, 'Min']];

export default function ScheduleDialog({ schedule, initialTab, selectedDate, user, canManage, onSave, onClose }) {
    const today = dateKey();
    const date = selectedDate < today ? today : selectedDate;
    const [tab, setTab] = useState(initialTab || 'special');
    const [normal, setNormal] = useState({ ...schedule.normal, days: [...schedule.normal.days] });
    const makeSpecial = d => ({ date: d, start: schedule.normal.start, end: schedule.normal.end, reason: '', closed: false, ...schedule.exceptions[d] });
    const [special, setSpecial] = useState(() => makeSpecial(date));
    const [error, setError] = useState(''), [step, setStep] = useState(0);
    const tabId = useId();
    const switchTab = value => { setTab(value); setError(''); setStep(0); };
    const moveTab = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'normal' : event.key === 'End' ? 'special' : tab === 'normal' ? 'special' : 'normal';
        switchTab(next);
        document.getElementById(`${tabId}-${next}`)?.focus();
    };
    const actor = user.full_name || user.fullName || user.name || user.username || 'Manajemen';
    const submit = event => {
        event.preventDefault();
        if (!canManage) return;
        if (tab === 'special' && step === 0) { setStep(1); return; }
        const invalid = tab === 'normal' ? validateNormal(normal) : validateException(special, today);
        if (invalid) { setError(invalid); return; }
        const audit = { updatedBy: actor, updatedAt: new Date().toISOString() };
        const next = tab === 'normal'
            ? { ...schedule, normal: { ...normal, ...audit } }
            : { ...schedule, exceptions: { ...schedule.exceptions, [special.date]: { ...special, reason: special.reason.trim(), ...audit } } };
        if (onSave(next)) onClose();
        else setError('Penyimpanan browser tidak tersedia. Draf belum disimpan.');
    };
    const removeSpecial = () => {
        const exceptions = { ...schedule.exceptions };
        delete exceptions[special.date];
        if (onSave({ ...schedule, exceptions })) onClose();
        else setError('Draf belum dapat dihapus dari penyimpanan browser.');
    };
    return <Dialog title="Jadwal operasional" eyebrow="PENGATURAN CPO LOADING" className="cpo-schedule-dialog" onClose={onClose}>
        <div className="cpo-dialog-tabs" role="tablist" aria-label="Jenis jadwal" onKeyDown={moveTab}>
            <button id={`${tabId}-normal`} type="button" role="tab" aria-controls={`${tabId}-panel`} tabIndex={tab === 'normal' ? 0 : -1} aria-selected={tab === 'normal'} onClick={() => switchTab('normal')}><FiClock />Jadwal normal</button>
            <button id={`${tabId}-special`} type="button" role="tab" aria-controls={`${tabId}-panel`} tabIndex={tab === 'special' ? 0 : -1} aria-selected={tab === 'special'} onClick={() => switchTab('special')}><FiCalendar />Jadwal khusus</button>
        </div>
        <form onSubmit={submit} className="cpo-schedule-form">
            <div id={`${tabId}-panel`} className="cpo-form-content" role="tabpanel" aria-labelledby={`${tabId}-${tab}`}>
                <div className="cpo-notice"><FiInfo /><p><strong>Draf browser per akun.</strong> Belum mengubah alarm, AI, atau jadwal pengguna lain.</p></div>
                {!canManage && <p className="cpo-read-only"><FiLock />Hanya manajemen dapat mengubah jadwal.</p>}
                {tab === 'special' && <div className="cpo-step-switch" aria-label="Langkah jadwal khusus"><button type="button" aria-pressed={step === 0} onClick={() => setStep(0)}>1. Tanggal & waktu</button><button type="button" aria-pressed={step === 1} onClick={() => setStep(1)}>2. Alasan & konfirmasi</button></div>}
                <fieldset disabled={!canManage}>
                    {tab === 'normal' ? <>
                        <div className="cpo-form-intro"><h3>Jadwal rutin</h3><p>Berlaku seterusnya sampai diubah manajemen.</p></div>
                        <div className="cpo-time-fields"><label>Jam mulai<input required type="time" value={normal.start} onChange={event => setNormal({ ...normal, start: event.target.value })} /></label><span>—</span><label>Jam selesai<input required type="time" value={normal.end} onChange={event => setNormal({ ...normal, end: event.target.value })} /></label><span>WIB</span></div>
                        <label className="cpo-field-label">Hari operasional</label><div className="cpo-day-picker">{DAYS.map(([day, label]) => <button key={day} type="button" aria-pressed={normal.days.includes(day)} onClick={() => setNormal({ ...normal, days: normal.days.includes(day) ? normal.days.filter(d => d !== day) : [...normal.days, day] })}>{label}</button>)}</div>
                        <p className="cpo-form-hint">{normal.start > normal.end ? 'Lintas hari: selesai pada hari berikutnya.' : 'Hari yang tidak dipilih dianggap tidak beroperasi.'}</p>
                    </> : step === 0 ? <>
                        <label>Tanggal berlaku<input required type="date" min={today} value={special.date} onChange={event => { setSpecial(makeSpecial(event.target.value)); setError(''); }} /></label>
                        <label className="cpo-checkbox"><input type="checkbox" checked={special.closed} onChange={event => setSpecial({ ...special, closed: event.target.checked })} /><span>Tidak beroperasi pada tanggal ini</span></label>
                        {!special.closed && <div className="cpo-time-fields"><label>Jam mulai<input required type="time" value={special.start} onChange={event => setSpecial({ ...special, start: event.target.value })} /></label><span>—</span><label>Jam selesai<input required type="time" value={special.end} onChange={event => setSpecial({ ...special, end: event.target.value })} /></label><span>WIB</span></div>}
                        <p className="cpo-form-hint">Menggantikan jadwal normal hanya pada tanggal ini.</p>
                    </> : <>
                        <div className="cpo-confirm-schedule"><span>{special.date ? formatDate(special.date) : 'Pilih tanggal'}</span><strong>{scheduleLabel({ ...special, open: !special.closed })}</strong></div>
                        <label>Alasan perubahan<input required type="text" maxLength={300} placeholder="Contoh: kedatangan truk terlambat" value={special.reason} onChange={event => setSpecial({ ...special, reason: event.target.value })} /></label>
                        <div className="cpo-return-note"><FiRotateCcw /><p><strong>Kembali otomatis ke jadwal normal</strong>Tanggal berikutnya memakai jadwal normal, kecuali ada pengecualian lain.</p></div>
                    </>}
                </fieldset>
                {tab === 'special' && schedule.exceptions[special.date] && <div className="cpo-existing-exception"><span>Draf khusus tersimpan</span>{canManage && <button type="button" className="cpo-text-button" onClick={removeSpecial}>Hapus pengecualian</button>}</div>}
            </div>
            <footer className="cpo-dialog-footer"><div className="cpo-dialog-feedback">{error ? <p role="alert">{error}</p> : <span>Asia/Jakarta · WIB</span>}</div><div>{tab === 'special' && step === 1 ? <button type="button" className="cpo-button" onClick={() => { setStep(0); setError(''); }}>Kembali</button> : <button type="button" className="cpo-button" onClick={onClose}>Tutup</button>}{tab === 'special' && step === 0 ? <button type="button" className="cpo-button cpo-button--primary" onClick={event => { event.preventDefault(); const invalid = validateException({ ...special, reason: 'validation' }, today); if (invalid) setError(invalid); else { setStep(1); setError(''); } }}>Lanjut</button> : canManage && <button type="submit" className="cpo-button cpo-button--primary"><FiSave />Simpan draf</button>}</div></footer>
        </form>
    </Dialog>;
}
