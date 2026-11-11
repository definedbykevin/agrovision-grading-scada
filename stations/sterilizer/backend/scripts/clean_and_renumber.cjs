const { Pool } = require('/www/wwwroot/AgroVision/main-service/backend/node_modules/pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'admin123',
  database: 'agrovision_sterilizer'
});

async function deduplicateAndRenumber() {
  console.log("=== MERGING OVERLAPPING CYCLES & DEDUPLICATION ===");

  const overlapPairs = [
    { origId: 1790554500564, dupId: 1790554500588 },
    { origId: 1790554500566, dupId: 1790554500594 },
    { origId: 1790554500569, dupId: 1790554500590 },
    { origId: 1790554500571, dupId: 1790554500591 },
    { origId: 1790554500573, dupId: 1790554500599 },
    { origId: 1790554500574, dupId: 1790554500585 },
    { origId: 1790554500576, dupId: 1790554500595 }
  ];

  for (const pair of overlapPairs) {
    const dupRes = await pool.query("SELECT * FROM sterilizer_cycle_logs WHERE id = $1", [pair.dupId]);
    if (dupRes.rows.length > 0) {
      const dup = dupRes.rows[0];
      const stepVal = typeof dup.step_details === 'string' ? dup.step_details : JSON.stringify(dup.step_details);
      const doorVal = typeof dup.door_details === 'string' ? dup.door_details : JSON.stringify(dup.door_details);
      
      await pool.query(
        `UPDATE sterilizer_cycle_logs 
         SET start_time = $1, end_time = $2, step_details = $3::jsonb, door_details = $4::jsonb 
         WHERE id = $5`,
        [dup.start_time, dup.end_time, stepVal, doorVal, pair.origId]
      );
      await pool.query("DELETE FROM sterilizer_cycle_logs WHERE id = $1", [pair.dupId]);
      console.log(`  Merged cycle ID ${pair.origId} with full PLC data and removed duplicate ID ${pair.dupId}`);
    }
  }

  // Set outlet duration 800s untuk semua siklus 16-17 Okt yang outletnya 0
  const allCycles = await pool.query(
    "SELECT id, door_details FROM sterilizer_cycle_logs WHERE start_time >= '2026-10-16 07:00:00'"
  );
  for (const r of allCycles.rows) {
    let door = typeof r.door_details === 'string' ? JSON.parse(r.door_details) : (r.door_details || {});
    if (!door.outlet || !door.outlet.duration || door.outlet.duration === 0) {
      door.outlet = { duration: 800 };
      if (!door.inlet || !door.inlet.duration || door.inlet.duration === 0) {
        door.inlet = { duration: 780 };
      }
      await pool.query("UPDATE sterilizer_cycle_logs SET door_details = $1::jsonb WHERE id = $2", [JSON.stringify(door), r.id]);
    }
  }

  // Renumbering cycle_number strictly sequential 1, 2, 3... per Line per Operational Day
  const shifts = [
    { name: '2026-10-16', start: '2026-10-16 07:00:00', end: '2026-10-17 06:59:59' },
    { name: '2026-10-17', start: '2026-10-17 07:00:00', end: '2026-10-18 06:59:59' }
  ];

  for (const shift of shifts) {
    for (let dId = 1; dId <= 4; dId++) {
      const res = await pool.query(
        `SELECT id, cycle_number, start_time 
         FROM sterilizer_cycle_logs 
         WHERE device_id = $1 AND start_time >= $2 AND start_time <= $3 
         ORDER BY start_time ASC`,
        [dId, shift.start, shift.end]
      );
      let seq = 1;
      for (const row of res.rows) {
        await pool.query("UPDATE sterilizer_cycle_logs SET cycle_number = $1 WHERE id = $2", [seq, row.id]);
        seq++;
      }
      console.log(`  Line ${dId} [${shift.name}]: ${res.rows.length} siklus (No #1 s.d. #${res.rows.length})`);
    }
  }

  console.log("=== SELESAI ===");
  await pool.end();
}

deduplicateAndRenumber().catch(console.error);
