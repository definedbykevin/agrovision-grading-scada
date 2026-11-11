import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SCHEDULE, canManageSchedule, csvReport, dateKey, durationMinutes, isOperational, normalizeSchedule, operationalWindows, planForDate, recommendedCamera, summarize, validateException, validateNormal } from './loadingModel.js';
import { demoVisits } from './demoData.js';

const at = (date, time) => `${date}T${time}:00+07:00`;
const schedule = () => normalizeSchedule(DEFAULT_SCHEDULE);

test('WIB dates do not depend on the browser or host timezone', () => {
    assert.equal(dateKey('2026-10-20T16:59:59Z'), '2026-10-20');
    assert.equal(dateKey('2026-10-20T17:00:00Z'), '2026-10-21');
});
test('normal schedule includes opening and excludes closing time', () => {
    const s = schedule();
    assert.equal(isOperational(at('2026-10-20', '06:59'), s), false);
    assert.equal(isOperational(at('2026-10-20', '07:00'), s), true);
    assert.equal(isOperational(at('2026-10-20', '16:59'), s), true);
    assert.equal(isOperational(at('2026-10-20', '17:00'), s), false);
});
test('one-date extension expires at WIB midnight and leaves the normal schedule intact', () => {
    const s = schedule();
    s.exceptions['2026-10-20'] = { start: '07:00', end: '21:00', reason: 'Truk terlambat' };
    assert.equal(isOperational(at('2026-10-20', '20:59'), s), true);
    assert.equal(isOperational(at('2026-10-20', '21:00'), s), false);
    assert.equal(isOperational(at('2026-10-21', '20:00'), s), false);
    assert.equal(isOperational(at('2026-10-21', '08:00'), s), true);
    assert.equal(planForDate(s, '2026-10-21').special, false);
    assert.deepEqual(s.normal.days, [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(s.normal.end, '17:00');
});
test('management changes to normal hours persist across dates', () => {
    const s = schedule();
    s.normal = { ...s.normal, start: '08:00', end: '19:00' };
    for (const date of ['2026-10-20', '2026-10-21']) {
        assert.equal(isOperational(at(date, '07:30'), s), false);
        assert.equal(isOperational(at(date, '18:30'), s), true);
    }
});
test('weekly closures and explicit date closures override admission', () => {
    const s = schedule(); s.normal.days = [1, 2, 3, 4, 5];
    assert.equal(isOperational(at('2026-10-25', '08:00'), s), false);
    s.exceptions['2026-10-20'] = { closed: true, reason: 'Pemeliharaan' };
    assert.equal(isOperational(at('2026-10-20', '08:00'), s), false);
});
test('overnight normal shifts respect the starting weekday and a replaced prior date', () => {
    const s = schedule(); s.normal = { start: '22:00', end: '06:00', days: [1] };
    assert.equal(isOperational(at('2026-10-19', '23:00'), s), true);
    assert.equal(isOperational(at('2026-10-20', '05:00'), s), true);
    assert.equal(isOperational(at('2026-10-20', '06:00'), s), false);
    assert.equal(isOperational(at('2026-10-20', '23:00'), s), false);
    s.exceptions['2026-10-19'] = { start: '07:00', end: '21:00', reason: 'Jadwal satu hari' };
    assert.equal(isOperational(at('2026-10-20', '05:00'), s), false);
});
test('invalid, retroactive or ambiguous one-day exceptions are rejected', () => {
    const base = { date: '2026-10-20', start: '07:00', end: '21:00', reason: 'Perpanjangan' };
    assert.equal(validateException(base, '2026-10-20'), '');
    for (const changes of [{ reason: ' ' }, { date: '2026-10-19' }, { date: '2026-02-30' }, { start: '22:00', end: '06:00' }, { end: '07:00' }]) assert.ok(validateException({ ...base, ...changes }, '2026-10-20'));
    assert.ok(validateNormal({ start: '07:00', end: '07:00', days: [1] }));
    assert.ok(validateNormal({ start: '07:00', end: '17:00', days: [] }));
});
test('counts are per session, limited to operational entries, with filling separate from occupancy', () => {
    const rows = demoVisits('2026-10-20');
    const summary = summarize([...rows, rows[0]], schedule(), '2026-10-20', at('2026-10-20', '16:42'));
    assert.equal(summary.visits.length, 8);
    assert.equal(summary.admitted, 6);
    assert.equal(summary.outside, 2);
    assert.equal(summary.active, 2);
    assert.equal(summary.completedFillings, 4);
    assert.equal(summary.average, 32);
    assert.equal(durationMinutes(rows[0].loadingStartedAt, rows[0].exitedAt), null);
    assert.equal(durationMinutes(rows[2].enteredAt, rows[2].exitedAt), 40);
    assert.equal(durationMinutes(rows[2].loadingStartedAt, rows[2].loadingEndedAt), 31);
});
test('corrupt saved schedules fall back safely and retain valid dated overrides', () => {
    const s = normalizeSchedule({ normal: { start: 'invalid' }, exceptions: { '2026-10-20': { start: '07:00', end: '21:00', reason: 'Izin' }, bad: { closed: true } } });
    assert.equal(s.normal.start, '07:00');
    assert.equal(Object.keys(s.exceptions).length, 1);
});
test('camera is fixed to active Oil Dispatch, excluding other dispatch cameras and location-only matches', () => {
    const rows = [{ id: 1, camera_name: 'Oil Pipe Tank Dispatch', location: 'Oil Dispatch', is_active: 1 }, { id: 2, camera_name: 'OIL DISPATCH', is_active: 0 }, { id: 3, camera_name: 'Oil Dispatch', is_active: 1 }];
    assert.equal(recommendedCamera(rows).id, 3);
    assert.equal(recommendedCamera(rows.slice(0, 2)), undefined);
    assert.equal(recommendedCamera([{ id: 4, camera_name: 'Loading Ramp', location: 'Oil Dispatch' }]), undefined);
    assert.equal(recommendedCamera([{ id: 5, camera_name: ' oil_dispatch ' }]).id, 5);
});
test('management UI permissions exclude ordinary staff and permit management roles', () => {
    assert.equal(canManageSchedule({ role: 'staff' }), false);
    assert.equal(canManageSchedule({ role: 'admin' }), true);
    assert.equal(canManageSchedule({ position: 'Mill Manager' }), true);
});
test('CSV clearly identifies example plates and escapes spreadsheet formulas', () => {
    const row = { ...demoVisits('2026-10-20')[0], plate: '=HYPERLINK("example")' };
    const csv = csvReport([row], schedule());
    assert.match(csv, /Plat \(contoh\)/);
    assert.ok(csv.includes('"\'=HYPERLINK(""example"")"'));
    assert.match(csv, /Di luar jadwal/);
});

test('calendar-day timeline includes only the actual overnight windows', () => {
    const s = schedule(); s.normal = { start: '22:00', end: '06:00', days: [1] };
    assert.deepEqual(operationalWindows(s, '2026-10-19'), [['22:00', '24:00']]);
    assert.deepEqual(operationalWindows(s, '2026-10-20'), [['00:00', '06:00']]);
    s.exceptions['2026-10-20'] = { closed: true, reason: 'Penutupan' };
    assert.deepEqual(operationalWindows(s, '2026-10-20'), []);
});
