import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'agrovision_security'
});

// Shift start: hari ini jam 07:00
const now = new Date();
const shiftStart = new Date(now);
shiftStart.setHours(7, 0, 0, 0);
if (now.getHours() < 7) shiftStart.setDate(shiftStart.getDate() - 1);
const pad = n => n.toString().padStart(2, '0');
const shiftStr = `${shiftStart.getFullYear()}-${pad(shiftStart.getMonth()+1)}-${pad(shiftStart.getDate())} ${pad(shiftStart.getHours())}:00:00`;

console.log('=== DIAGNOSA GPS SECURITY PATROL ===');
console.log('Shift mulai:', shiftStr);
console.log('');

const [sessions] = await db.query(`
  SELECT 
    s.id as session_id,
    s.guard_name,
    s.guard_id,
    s.started_at,
    (SELECT COUNT(*) FROM security_patrol_tracks t WHERE t.session_id = s.id) as total_pings,
    (SELECT latitude FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_lat,
    (SELECT longitude FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_lng,
    (SELECT recorded_at FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_ping_time,
    gs.latitude as status_lat,
    gs.longitude as status_lng,
    gs.last_update as status_update
  FROM security_patrol_sessions s
  LEFT JOIN security_guards_status gs ON gs.user_id = s.guard_id
  WHERE s.status = 'active' AND s.started_at >= ?
  ORDER BY s.started_at DESC
`, [shiftStr]);

for (const s of sessions) {
  console.log(`--- ${s.guard_name} (session_id: ${s.session_id}) ---`);
  console.log(`  Sesi dimulai    : ${s.started_at}`);
  console.log(`  Total GPS ping  : ${s.total_pings}`);
  console.log(`  Ping terakhir   : ${s.last_ping_time || 'TIDAK ADA'}`);
  console.log(`  Posisi track    : ${s.last_lat ? `${s.last_lat}, ${s.last_lng}` : 'NULL'}`);
  console.log(`  Posisi status   : ${s.status_lat ? `${s.status_lat}, ${s.status_lng}` : 'NULL'}`);
  
  if (s.total_pings == 0) {
    console.log(`  ❌ DIAGNOSIS: HP tidak pernah kirim GPS ke server!`);
    console.log(`     → Pastikan mobile app memanggil POST /api/security/patrol/location`);
    console.log(`     → Pastikan permission Location diizinkan di HP`);
  } else if (!s.last_lat) {
    console.log(`  ⚠️ DIAGNOSIS: Ping masuk tapi semua difilter (akurasi GPS buruk)`);
  } else {
    console.log(`  ✅ GPS OK`);
  }
  console.log('');
}

await db.end();
