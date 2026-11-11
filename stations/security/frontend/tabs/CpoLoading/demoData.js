// Explicit UI examples, never mixed with CCTV or AI production events.
export const DEMO_TIME = '16:42';
export function demoVisits(date) {
    const at = time => time ? `${date}T${time}:00+07:00` : null;
    return [
        ['01', null, '05:43', '05:49', null, null, 89, 'Truk terdeteksi sebelum jam operasional. Identitas perlu dikonfirmasi.'],
        ['02', 'BK 9832 UF', '06:18', '06:34', null, null, 96, 'Kendaraan berada di area sebelum jadwal dibuka. Perlu verifikasi petugas.'],
        ['03', 'BK 9274 XA', '07:18', '07:58', '07:23', '07:54', 98, 'Sesi pengisian selesai.'],
        ['04', 'BM 8812 LM', '09:04', '09:54', '09:11', '09:47', 97, 'Sesi pengisian selesai.'],
        ['05', 'BK 9352 XS', '11:32', '12:14', '11:38', '12:08', 99, 'Sesi pengisian selesai.'],
        ['06', 'BM 9127 AU', '13:25', '14:10', '13:33', '14:03', 97, 'Sesi pengisian selesai.'],
        ['07', 'BK 8165 MU', '16:12', null, '16:20', null, 98, 'Truk sedang berada di zona pengisian.'],
        ['08', 'BK 9421 FR', '16:31', null, null, null, 95, 'Truk berada di area; pengisian belum terkonfirmasi.'],
    ].map(([id, plate, entered, exited, started, ended, confidence, note]) => ({
        id: `CPO-${date.replaceAll('-', '')}-${id}`, plate, enteredAt: at(entered), exitedAt: at(exited), loadingStartedAt: at(started), loadingEndedAt: at(ended), confidence, note, zone: 'Loading bay 01', example: true,
    }));
}
