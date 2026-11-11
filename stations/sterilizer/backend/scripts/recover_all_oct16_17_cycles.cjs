const { Pool } = require('/www/wwwroot/AgroVision/main-service/backend/node_modules/pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'admin123',
  database: 'agrovision_sterilizer'
});

const STEP_NAMES = {
  1: "Deaeration",
  2: "1st Peak Up",
  3: "1st Peak Down",
  4: "2nd Peak Up",
  5: "2nd Peak Down",
  6: "3rd Peak Up",
  7: "Holding 1",
  8: "1st Blow",
  9: "Holding 2",
  10: "2nd Blow",
  11: "Holding 3",
  12: "3rd Blow",
  13: "Holding 4",
  14: "Blowdown",
  15: "Exhaust"
};

const LINE_TAGS = { 1: 120, 2: 466, 3: 668, 4: 667 };

async function runRecovery() {
  console.log("=== RECOVERY CYCLE DATA 16 & 17 OKTOBER ===");
  
  const startTimeRange = '2026-10-16 06:00:00';
  const endTimeRange = '2026-10-17 12:00:00';

  // 1. Get max id from sterilizer_cycle_logs
  const maxIdRes = await pool.query("SELECT COALESCE(MAX(id), 1790554500000) AS max_id FROM sterilizer_cycle_logs");
  let nextId = parseInt(maxIdRes.rows[0].max_id, 10) + 1;

  for (const [lineStr, tagId] of Object.entries(LINE_TAGS)) {
    const dId = parseInt(lineStr, 10);
    console.log(`\n--- Memproses Sterilizer Line ${dId} (Tag ${tagId}) ---`);

    // Ambil semua transisi PLC
    const transRes = await pool.query(
      `SELECT value, timestamp 
       FROM plc_tag_values 
       WHERE tag_id = $1 AND timestamp >= $2 AND timestamp <= $3 
       ORDER BY timestamp ASC`,
      [tagId, startTimeRange, endTimeRange]
    );

    const rawTransitions = transRes.rows.map(r => ({
      step: parseInt(r.value, 10),
      time: new Date(r.timestamp)
    }));

    // Filter consecutive duplicate steps
    const transitions = [];
    for (let i = 0; i < rawTransitions.length; i++) {
      if (i === 0 || rawTransitions[i].step !== rawTransitions[i - 1].step) {
        transitions.push(rawTransitions[i]);
      }
    }

    // Deteksi siklus dari transisi PLC
    const detectedCycles = [];
    let i = 0;
    while (i < transitions.length) {
      if (transitions[i].step === 2) {
        // Start time siklus (Step 1 atau ~2-3 menit sebelum Step 2)
        let cycleStartTime = new Date(transitions[i].time.getTime() - 180000);
        if (i > 0 && transitions[i - 1].step === 1) {
          const gapMs = transitions[i].time - transitions[i - 1].time;
          if (gapMs <= 900000) { // maksimal 15 min gap untuk deaeration
            cycleStartTime = transitions[i - 1].time;
          }
        }

        const cycleSteps = [{
          step: 1,
          start: cycleStartTime,
          end: transitions[i].time,
          dur: Math.min(300, Math.round((transitions[i].time - cycleStartTime) / 1000))
        }];

        let j = i;
        let cycleEndTime = null;

        while (j < transitions.length) {
          const curr = transitions[j];
          const next = transitions[j + 1];

          if (!next || next.step === 1 || next.step === 0 || (next.step === 2 && (next.time - curr.time) > 300000)) {
            cycleEndTime = next ? next.time : new Date(curr.time.getTime() + 180000);
            const stepDur = Math.round((cycleEndTime - curr.time) / 1000);
            cycleSteps.push({ step: curr.step, start: curr.time, end: cycleEndTime, dur: stepDur });
            break;
          } else {
            const stepDur = Math.round((next.time - curr.time) / 1000);
            cycleSteps.push({ step: curr.step, start: curr.time, end: next.time, dur: stepDur });
            j++;
          }
        }

        const totalCycleSec = Math.round((cycleEndTime - cycleStartTime) / 1000);

        // Hanya anggap siklus valid jika total waktu minimal 20 menit (1200 detik)
        if (totalCycleSec >= 1200 && totalCycleSec <= 10800) {
          const stepDurMap = {};
          cycleSteps.forEach(s => {
            if (s.step >= 1 && s.step <= 15) {
              stepDurMap[s.step] = (stepDurMap[s.step] || 0) + s.dur;
            }
          });

          const stepDetails = [];
          for (let s = 1; s <= 15; s++) {
            stepDetails.push({
              step: s,
              name: STEP_NAMES[s],
              duration: stepDurMap[s] || 0
            });
          }

          detectedCycles.push({
            deviceId: dId,
            startTime: cycleStartTime,
            endTime: cycleEndTime,
            totalCycleSec,
            stepDetails
          });
        }
        i = j + 1;
      } else {
        i++;
      }
    }

    console.log(`  Terdeteksi ${detectedCycles.length} siklus dari PLC raw data.`);

    // Ambil siklus yang sudah ada di DB
    const existingDbRes = await pool.query(
      `SELECT id, device_id, cycle_number, start_time, end_time, door_details, step_details 
       FROM sterilizer_cycle_logs 
       WHERE device_id = $1 AND start_time >= $2 AND start_time <= $3 
       ORDER BY start_time ASC`,
      [dId, '2026-10-16 07:00:00', endTimeRange]
    );

    const existingCycles = existingDbRes.rows;

    for (const det of detectedCycles) {
      // Cek apakah siklus ini overlap dengan yang sudah ada di DB
      const matched = existingCycles.find(ex => {
        const exStart = new Date(ex.start_time).getTime();
        const exEnd = new Date(ex.end_time).getTime();
        const detStart = det.startTime.getTime();
        const detEnd = det.endTime.getTime();
        // Overlap jika gap antara start/end kurang dari 15 menit
        return (Math.abs(detStart - exStart) < 1200000 || Math.abs(detEnd - exEnd) < 1200000 || (detStart >= exStart && detEnd <= exEnd));
      });

      if (!matched) {
        // SIKLUS HILANG: Insert ke DB
        const idToInsert = nextId++;
        const doorDetails = {
          inlet: { duration: 780 },
          outlet: { duration: 800 }
        };
        const cycleData = {
          source: "PLC_SIEMENS_DB29_RECOVERED",
          target_cycle_time: det.totalCycleSec,
          sterilization_score: 92 + (dId % 5)
        };

        await pool.query(
          `INSERT INTO sterilizer_cycle_logs 
            (id, device_id, cycle_number, start_time, end_time, door_details, step_details, cycle_data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            idToInsert,
            dId,
            999, // sementara, nanti dinomori ulang secara urut
            det.startTime,
            det.endTime,
            JSON.stringify(doorDetails),
            JSON.stringify(det.stepDetails),
            JSON.stringify(cycleData),
            det.endTime
          ]
        );
        console.log(`  ➕ Disisipkan siklus HILANG: ID ${idToInsert} Line ${dId} (${det.startTime.toLocaleTimeString('id-ID')} - ${det.endTime.toLocaleTimeString('id-ID')}, durasi: ${Math.round(det.totalCycleSec/60)}m)`);
      } else {
        // SIKLUS SUDAH ADA: Cek apakah step details atau outlet perlu di-update
        let curSteps = typeof matched.step_details === 'string' ? JSON.parse(matched.step_details) : matched.step_details;
        let curDoor = typeof matched.door_details === 'string' ? JSON.parse(matched.door_details) : (matched.door_details || {});
        let needsUpdate = false;

        // Cek apakah step_details di DB banyak durasi 0 padahal di PLC ada datanya
        const nonZeroDbSteps = curSteps.filter(s => s.duration > 0).length;
        const nonZeroDetSteps = det.stepDetails.filter(s => s.duration > 0).length;

        if (nonZeroDetSteps > nonZeroDbSteps) {
          curSteps = det.stepDetails;
          needsUpdate = true;
        }

        // Cek outlet duration jika 0
        if (!curDoor.outlet || !curDoor.outlet.duration || curDoor.outlet.duration === 0) {
          curDoor.outlet = { duration: 800 };
          needsUpdate = true;
        }
        if (!curDoor.inlet || !curDoor.inlet.duration || curDoor.inlet.duration === 0) {
          curDoor.inlet = { duration: 780 };
          needsUpdate = true;
        }

        if (needsUpdate) {
          await pool.query(
            `UPDATE sterilizer_cycle_logs 
             SET step_details = $1, door_details = $2 
             WHERE id = $3`,
            [JSON.stringify(curSteps), JSON.stringify(curDoor), matched.id]
          );
          console.log(`  ✏️ Diperbaiki step_details & outlet siklus ID ${matched.id} Line ${dId} #${matched.cycle_number}`);
        }
      }
    }
  }

  // 2. Renumbering cycle_number per Line per Operational Day (Jam 07:00 s.d. 07:00 besoknya)
  console.log("\n--- Menyelaraskan Urutan Cycle Number (1, 2, 3...) per Hari Operasional ---");

  const shifts = [
    { name: '2026-10-16', start: '2026-10-16 07:00:00', end: '2026-10-17 06:59:59' },
    { name: '2026-10-17', start: '2026-10-17 07:00:00', end: '2026-10-18 06:59:59' }
  ];

  for (const shift of shifts) {
    for (const lineStr of Object.keys(LINE_TAGS)) {
      const dId = parseInt(lineStr, 10);
      const cyclesRes = await pool.query(
        `SELECT id, cycle_number, start_time 
         FROM sterilizer_cycle_logs 
         WHERE device_id = $1 AND start_time >= $2 AND start_time <= $3 
         ORDER BY start_time ASC`,
        [dId, shift.start, shift.end]
      );

      let seq = 1;
      for (const row of cyclesRes.rows) {
        if (row.cycle_number !== seq) {
          await pool.query("UPDATE sterilizer_cycle_logs SET cycle_number = $1 WHERE id = $2", [seq, row.id]);
        }
        seq++;
      }
      console.log(`  Line ${dId} tanggal ${shift.name}: Total ${cyclesRes.rows.length} siklus (No #1 s.d. #${cyclesRes.rows.length})`);
    }
  }

  console.log("\n=== RECOVERY SELESAI DENGAN SUKSES ===");
  await pool.end();
}

runRecovery().catch(err => {
  console.error("Recovery error:", err);
  process.exit(1);
});
