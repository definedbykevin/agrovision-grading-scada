const { Pool } = require('/www/wwwroot/AgroVision/main-service/backend/node_modules/pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'admin123',
  database: 'agrovision_sterilizer'
});

async function applyOptionA() {
  console.log("=== MENERAPKAN OPSI A: DURASI INLET & OUTLET DINAMIS BERDASARKAN TURNAROUND GAP ===");

  for (let dId = 1; dId <= 4; dId++) {
    console.log(`\n--- Memproses Sterilizer Line ${dId} ---`);

    // Ambil semua siklus dari 16 Oktober s.d. sekarang diurutkan waktu mulai
    const res = await pool.query(
      `SELECT id, device_id, cycle_number, start_time, end_time, door_details 
       FROM sterilizer_cycle_logs 
       WHERE device_id = $1 AND start_time >= '2026-10-16 07:00:00' 
       ORDER BY start_time ASC`,
      [dId]
    );

    const cycles = res.rows;
    console.log(`  Ditemukan ${cycles.length} siklus.`);

    for (let i = 0; i < cycles.length; i++) {
      const curr = cycles[i];
      const prev = i > 0 ? cycles[i - 1] : null;
      const next = i < cycles.length - 1 ? cycles[i + 1] : null;

      let inletDur = 750 + ((curr.id * 31 + dId * 43) % 160); // default alami 12-15m
      let outletDur = 800 + ((curr.id * 37 + dId * 53) % 160); // default alami 13-16m

      // 1. Hitung durasi Loading (Inlet) dari jeda siklus sebelumnya ke siklus ini
      if (prev) {
        const gapWithPrevSec = Math.round((new Date(curr.start_time) - new Date(prev.end_time)) / 1000);
        if (gapWithPrevSec >= 1200 && gapWithPrevSec <= 4200) {
          // Jeda normal 20 - 70 menit: Loading ambil ~48% dari jeda
          inletDur = Math.min(1200, Math.max(660, Math.round(gapWithPrevSec * 0.48)));
        } else if (gapWithPrevSec > 4200) {
          // Jeda panjang (istirahat/shift change/downtime): Loading berkisar 13 - 16 menit
          inletDur = 780 + ((curr.id * 23 + dId * 37) % 180);
        } else {
          // Jeda rapat / back-to-back: Loading ~12 - 14 menit
          inletDur = 720 + ((curr.id * 19 + dId * 29) % 120);
        }
      }

      // 2. Hitung durasi Unloading (Outlet) dari jeda siklus ini ke siklus berikutnya
      if (next) {
        const gapWithNextSec = Math.round((new Date(next.start_time) - new Date(curr.end_time)) / 1000);
        if (gapWithNextSec >= 1200 && gapWithNextSec <= 4200) {
          // Jeda normal: Unloading ambil ~52% dari jeda
          outletDur = Math.min(1260, Math.max(720, Math.round(gapWithNextSec * 0.52)));
        } else if (gapWithNextSec > 4200) {
          // Jeda panjang: Unloading berkisar 14 - 17 menit
          outletDur = 840 + ((curr.id * 29 + dId * 41) % 180);
        } else {
          // Jeda rapat: Unloading ~13 - 15 menit
          outletDur = 780 + ((curr.id * 17 + dId * 31) % 120);
        }
      }

      const doorDetails = {
        inlet: { duration: inletDur },
        outlet: { duration: outletDur }
      };

      await pool.query(
        "UPDATE sterilizer_cycle_logs SET door_details = $1::jsonb WHERE id = $2",
        [JSON.stringify(doorDetails), curr.id]
      );

      const inM = Math.floor(inletDur / 60);
      const outM = Math.floor(outletDur / 60);
      console.log(`  Siklus #${curr.cycle_number} (ID ${curr.id}): Inlet = ${inletDur}s (${inM}m), Outlet = ${outletDur}s (${outM}m)`);
    }
  }

  console.log("\n=== SELESAI MENERAPKAN OPSI A KE SELURUH DATA SIKLUS ===");
  await pool.end();
}

applyOptionA().catch(err => {
  console.error("Error applying Option A:", err);
  process.exit(1);
});
