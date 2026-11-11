export const TIME_ZONE = 'Asia/Jakarta';
export const DEFAULT_SCHEDULE = { normal: { start: '07:00', end: '17:00', days: [0, 1, 2, 3, 4, 5, 6] }, exceptions: {} };

export function wibParts(value = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute), time: `${p.hour}:${p.minute}` };
}
export const dateKey = value => wibParts(value).date;
export const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const weekday = date => new Date(`${date}T12:00:00Z`).getUTCDay();
export function shiftDate(date, offset) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
}
export const formatDate = date => new Intl.DateTimeFormat('id-ID', { timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00+07:00`));
export const formatTime = value => value ? wibParts(value).time.replace(':', '.') : '—';
export function durationMinutes(start, end) {
    if (!start || !end) return null;
    const difference = new Date(end) - new Date(start);
    return Number.isFinite(difference) && difference >= 0 ? Math.floor(difference / 60000) : null;
}
export function formatDuration(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    const n = Math.max(0, Math.floor(value));
    return n >= 60 ? `${Math.floor(n / 60)} j ${n % 60} m` : `${n} mnt`;
}

export function validateNormal(normal) {
    if (!validTime(normal.start) || !validTime(normal.end)) return 'Isi jam mulai dan jam selesai yang valid.';
    if (normal.start === normal.end) return 'Jam mulai dan selesai harus berbeda.';
    if (!Array.isArray(normal.days) || !normal.days.length || normal.days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return 'Pilih minimal satu hari operasional.';
    return '';
}
export function validateException(exception, today) {
    if (!validDate(exception.date)) return 'Pilih tanggal jadwal khusus.';
    if (exception.date < today) return 'Jadwal khusus tidak dapat dibuat untuk tanggal yang sudah lewat.';
    if (!exception.closed && (!validTime(exception.start) || !validTime(exception.end) || minutes(exception.start) >= minutes(exception.end))) return 'Jam selesai harus setelah jam mulai pada tanggal yang sama.';
    if (typeof exception.reason !== 'string' || !exception.reason.trim()) return 'Tuliskan alasan perubahan agar dapat ditinjau.';
    return '';
}
export function normalizeSchedule(value) {
    const normal = value?.normal && !validateNormal(value.normal) ? { ...value.normal, days: [...new Set(value.normal.days)] } : { ...DEFAULT_SCHEDULE.normal, days: [...DEFAULT_SCHEDULE.normal.days] };
    const exceptions = {};
    for (const [date, item] of Object.entries(value?.exceptions || {})) {
        if (item && !validateException({ ...item, date }, '0000-00-00')) exceptions[date] = { ...item, date };
    }
    return { normal, exceptions };
}

export function planForDate(schedule, date) {
    const special = schedule.exceptions[date];
    if (special) return { ...special, special: true, open: !special.closed };
    const normal = schedule.normal;
    return { ...normal, special: false, open: normal.days.includes(weekday(date)) };
}
export function isOperational(at, schedule) {
    const { date, minute } = wibParts(at);
    const special = schedule.exceptions[date];
    if (special) return !special.closed && minute >= minutes(special.start) && minute < minutes(special.end);
    const normal = schedule.normal, start = minutes(normal.start), end = minutes(normal.end);
    if (start < end) return normal.days.includes(weekday(date)) && minute >= start && minute < end;
    if (minute >= start) return normal.days.includes(weekday(date));
    const previous = shiftDate(date, -1);
    return minute < end && !schedule.exceptions[previous] && normal.days.includes(weekday(previous));
}
// Calendar-day bands also include the tail of a normal shift started yesterday.
export function operationalWindows(schedule, date) {
    const plan = planForDate(schedule, date);
    if (plan.special || plan.start < plan.end) return plan.open ? [[plan.start, plan.end]] : [];
    const windows = [], previous = shiftDate(date, -1);
    if (!schedule.exceptions[previous] && schedule.normal.days.includes(weekday(previous)) && plan.end !== '00:00') windows.push(['00:00', plan.end]);
    if (plan.open) windows.push([plan.start, '24:00']);
    return windows;
}
export const scheduleLabel = plan => plan.open ? `${plan.start.replace(':', '.')} – ${plan.end.replace(':', '.')}${plan.start > plan.end ? ' (+1 hari)' : ''} WIB` : 'Tidak beroperasi';

export function summarize(visits, schedule, date, now) {
    const unique = [...new Map(visits.map(visit => [visit.id, visit])).values()].filter(visit => dateKey(visit.enteredAt) === date);
    const normal = unique.filter(visit => isOperational(visit.enteredAt, schedule));
    const fillings = normal.map(visit => durationMinutes(visit.loadingStartedAt, visit.loadingEndedAt)).filter(value => value !== null);
    return {
        visits: unique, admitted: normal.length, outside: unique.length - normal.length,
        active: unique.filter(visit => !visit.exitedAt && new Date(visit.enteredAt) <= new Date(now)).length,
        average: fillings.length ? Math.round(fillings.reduce((sum, value) => sum + value, 0) / fillings.length) : null,
        completedFillings: fillings.length,
    };
}
export const visitState = visit => visit.exitedAt ? 'completed' : visit.loadingStartedAt ? 'loading' : 'waiting';
export const STATE_LABELS = { completed: 'Selesai', loading: 'Mengisi', waiting: 'Di area' };
export const cameraCandidates = cameras => cameras.filter(camera => camera.is_active === undefined || camera.is_active === true || camera.is_active === 1);
export const recommendedCamera = cameras => cameraCandidates(cameras).find(camera => /^oil[\s_-]*dispatch$/i.test(String(camera.camera_name || '').trim()));
export function canManageSchedule(user = {}) {
    const role = String(user.role || user.userRole || user.role_name || '').toLowerCase();
    const position = String(user.position || user.position_title || user.positionTitle || '').toLowerCase();
    return ['admin', 'dev', 'developer', 'manager', 'asisten_manager', 'assistant_manager', 'general_manager', 'mill_manager'].includes(role) || position.includes('manager');
}
export function csvReport(visits, schedule) {
    const cell = value => {
        let s = String(value ?? '');
        if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
        return `"${s.replaceAll('"', '""')}"`;
    };
    return '\uFEFF' + [['ID kunjungan', 'Tanggal WIB', 'Plat (contoh)', 'Masuk WIB', 'Keluar WIB', 'Durasi area (menit)', 'Durasi pengisian (menit)', 'Klasifikasi jadwal'], ...visits.map(visit => [visit.id, dateKey(visit.enteredAt), visit.plate || 'Belum terbaca', formatTime(visit.enteredAt), formatTime(visit.exitedAt), durationMinutes(visit.enteredAt, visit.exitedAt), durationMinutes(visit.loadingStartedAt, visit.loadingEndedAt), isOperational(visit.enteredAt, schedule) ? 'Dalam jadwal' : 'Di luar jadwal'])].map(row => row.map(cell).join(',')).join('\r\n');
}
