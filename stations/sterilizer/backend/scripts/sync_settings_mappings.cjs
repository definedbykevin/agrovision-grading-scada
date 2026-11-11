const pg = require('pg');
const { Pool } = pg;

async function run() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin123',
    database: 'agrovision_sterilizer'
  });

  try {
    console.log('1. Loading existing plc_tags...');
    const tagRes = await pool.query('SELECT id, tag_name FROM plc_tags');
    const tagMap = new Map();
    tagRes.rows.forEach(r => tagMap.set(r.tag_name, r.id));

    // Helper to add extra tag if missing
    async function ensureTag(tagName, dataType, dbNum, byteOffset, bitOffset, access) {
      if (tagMap.has(tagName)) return tagMap.get(tagName);
      const res = await pool.query(
        `INSERT INTO plc_tags (plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id)
         VALUES (1, $1, $2, $3, $4, $5, $6, true, 'DB')
         ON CONFLICT (tag_name) DO UPDATE SET data_type = EXCLUDED.data_type, access = EXCLUDED.access
         RETURNING id`,
        [dbNum, byteOffset, bitOffset, dataType, tagName, access]
      );
      const id = res.rows[0]?.id;
      tagMap.set(tagName, id);
      return id;
    }

    // Ensure capacity & score tags if not present
    await ensureTag('DESIGN_CAPACITY', 'REAL', 1, 100, null, 'WRITE');
    await ensureTag('NUMBER_STERILIZER', 'INT', 1, 104, null, 'WRITE');
    await ensureTag('MILL_DESIGN_CAPACITY', 'REAL', 1, 106, null, 'WRITE');
    await ensureTag('ACTUAL_THROUGHPUT', 'REAL', 1, 110, null, 'READ');
    await ensureTag('SCORE_PERF_STERIL', 'REAL', 1, 114, null, 'READ');
    await ensureTag('SCORE_PERF_LEAD_TIME', 'REAL', 1, 118, null, 'READ');
    await ensureTag('SCORE_PERF_THROUGHPUT', 'REAL', 1, 122, null, 'READ');
    await ensureTag('OVER_LIMIT_TIME', 'INT', 1, 126, null, 'WRITE');
    await ensureTag('OVER_LIMIT_SCORE', 'REAL', 1, 150, null, 'WRITE');
    await ensureTag('SAFETY_DOOR_SETPOINT', 'REAL', 1, 128, null, 'WRITE');
    await ensureTag('AUTO_BLOWDOWN_SETPOINT', 'REAL', 1, 132, null, 'WRITE');
    await ensureTag('SAFETY_PRESSURE_SETPOINT', 'REAL', 1, 136, null, 'WRITE');
    await ensureTag('TIME_OPEN_CON', 'INT', 1, 140, null, 'WRITE');
    await ensureTag('TIME_CLOSE_CON', 'INT', 1, 142, null, 'WRITE');
    await ensureTag('TEMP_IDLE_SETPOINT', 'REAL', 1, 144, null, 'WRITE');
    await ensureTag('TEMP_LOW_SETPOINT', 'REAL', 1, 148, null, 'WRITE');

    console.log('2. Preparing settings mappings...');
    const mappings = [];
    const add = (equipment, signal_key, tagName) => {
      const id = tagMap.get(tagName);
      if (id) {
        mappings.push({ station: 'sterilizer', equipment, signal_key, tag_id: id });
      } else {
        console.warn(`Tag not found for mapping: ${tagName} -> (${equipment}, ${signal_key})`);
      }
    };

    // ── Matriks Resep: Line 1 s/d 4, Step 1 s/d 20 ──
    for (let line = 1; line <= 4; line++) {
      for (let step = 1; step <= 20; step++) {
        // Durasi Timers
        add(`recipe_line_${line}_step_${step}_nrm`, 'DURATION', `TimeSetpoint2[${step}]`);
        add(`recipe_line_${line}_step_${step}_unf`, 'DURATION', `TimeSetpoint1[${step}]`);
        add(`recipe_line_${line}_step_${step}_wet`, 'DURATION', `TimeSetpoint3[${step}]`);

        // Tekanan (Bar / Press)
        add(`recipe_line_${line}_step_${step}_bar`, 'PRESSURE', `PressureSetpoint[${step}]`);
        add(`recipe_line_${line}_step_${step}_bar`, 'BAR', `PressureSetpoint[${step}]`);
        add(`recipe_line_${line}_step_${step}_bar`, 'SETPOINT', `PressureSetpoint[${step}]`);
        add(`recipe_line_${line}_step_${step}_press`, 'SETPOINT', `PressureSetpoint[${step}]`);
        add(`recipe_line_${line}_step_${step}_press`, 'BAR', `PressureSetpoint[${step}]`);
        add(`recipe_line_${line}_step_${step}_press`, 'PRESSURE', `PressureSetpoint[${step}]`);

        // Mode / Jumper (MODE & VALVE_MODE)
        add(`recipe_line_${line}_step_${step}_mode`, 'MODE', `StepMode[${step}]`);
        add(`recipe_line_${line}_step_${step}_mode`, 'VALVE_MODE', `StepMode[${step}]`);

        // Katup
        add(`recipe_line_${line}_step_${step}_inl1`, 'VALVE', `Inlet1[${step}]`);
        add(`recipe_line_${line}_step_${step}_inl2`, 'VALVE', `Inlet2[${step}]`);
        add(`recipe_line_${line}_step_${step}_dinl`, 'VALVE', `Inlet3[${step}]`);
        add(`recipe_line_${line}_step_${step}_con`, 'VALVE', `Condensate1[${step}]`);
        add(`recipe_line_${line}_step_${step}_rcon`, 'VALVE', `Condensate2[${step}]`);
        add(`recipe_line_${line}_step_${step}_dcon`, 'VALVE', `Condensate1[${step}]`);
        add(`recipe_line_${line}_step_${step}_exh`, 'VALVE', `Exhaust1[${step}]`);
      }
    }

    // ── BPV Settings Mappings ──
    add('settings_bpv_makeup_high', 'SETPOINT', 'Set_high_bpv[1]');
    add('settings_bpv_makeup_low', 'SETPOINT', 'Set_low_bpv[1]');
    add('settings_bpv_makeup_position', 'POSITION', 'open_position_bpv[1]');
    add('settings_bpv_makeup_limit_high', 'SETPOINT', 'limit_high[1]');
    add('settings_bpv_makeup_limit_low', 'SETPOINT', 'limit_low[1]');

    add('settings_bpv_surplus_high', 'SETPOINT', 'Set_high_bpv[2]');
    add('settings_bpv_surplus_low', 'SETPOINT', 'Set_low_bpv[2]');
    add('settings_bpv_surplus_position', 'POSITION', 'open_position_bpv[2]');
    add('settings_bpv_surplus_limit_high', 'SETPOINT', 'limit_high[2]');
    add('settings_bpv_surplus_limit_low', 'SETPOINT', 'limit_low[2]');

    // ── Logic Settings ──
    add('settings_logic_main_steam', 'SETPOINT', 'Main_steam_premit');
    add('settings_logic_holding_pressure', 'SETPOINT', 'CurrentPressure');
    add('settings_logic_safety_door', 'SETPOINT', 'SAFETY_DOOR_SETPOINT');
    add('settings_logic_auto_blowdown', 'SETPOINT', 'AUTO_BLOWDOWN_SETPOINT');
    add('settings_logic_safety_pressure', 'SETPOINT', 'SAFETY_PRESSURE_SETPOINT');
    add('settings_logic_time_open_con', 'TIME', 'TIME_OPEN_CON');
    add('settings_logic_time_close_con', 'TIME', 'TIME_CLOSE_CON');
    add('settings_logic_temp_idle', 'SETPOINT', 'TEMP_IDLE_SETPOINT');
    add('settings_logic_temp_low', 'SETPOINT', 'TEMP_LOW_SETPOINT');
    add('settings_logic_high_temp', 'SETPOINT', 'Set_high_bpv[1]');
    add('settings_logic_temp_holding_step_start', 'STEP', 'Overriding_Step[1]');
    add('settings_logic_temp_holding_step_stop', 'STEP', 'Overriding_Step[2]');
    add('settings_logic_start_to_step_cycle', 'STEP', 'Overriding_Step[1]');
    add('settings_logic_sequencing_on_step', 'STEP', 'Overriding_Step[1]');
    add('settings_logic_sequencing_stop_step', 'STEP', 'Overriding_Step[2]');

    // ── Capacity & Scoring ──
    add('settings_capacity_design_capacity', 'DESIGN_CAPACITY', 'DESIGN_CAPACITY');
    add('settings_capacity_number_sterilizer', 'NUMBER_STERILIZER', 'NUMBER_STERILIZER');
    add('settings_capacity_mill_design_capacity', 'MILL_DESIGN_CAPACITY', 'MILL_DESIGN_CAPACITY');
    add('settings_capacity_actual_throughput', 'ACTUAL_THROUGHPUT', 'ACTUAL_THROUGHPUT');
    add('settings_score_perf_steril', 'SCORE', 'SCORE_PERF_STERIL');
    add('settings_score_perf_lead_time', 'SCORE', 'SCORE_PERF_LEAD_TIME');
    add('settings_score_perf_throughput', 'SCORE', 'SCORE_PERF_THROUGHPUT');
    add('settings_tolerance_over_limit_time', 'TIME', 'OVER_LIMIT_TIME');
    add('settings_tolerance_over_limit_score', 'SCORE', 'OVER_LIMIT_SCORE');

    // ── Scoring Logic Table (Line 1 s/d 4 & Global) ──
    const scoreLogicDefs = [
      { param: 'deaeration_temp', tagFn: (ln) => `Actual_Temperatur[${ln}]` },
      { param: 'peak1_press', tagFn: () => 'CurrentPressure' },
      { param: 'peak2_press', tagFn: () => 'CurrentPressure' },
      { param: 'peak3_press', tagFn: () => 'CurrentPressure' },
      { param: 'holding_press', tagFn: () => 'CurrentPressure' },
      { param: 'blow1_temp', tagFn: (ln) => `Actual_Temperatur[${ln}]` },
      { param: 'holding2_press', tagFn: () => 'CurrentPressure' },
      { param: 'blow2_temp', tagFn: (ln) => `Actual_Temperatur[${ln}]` },
      { param: 'holding3_press', tagFn: () => 'CurrentPressure' },
      { param: 'blow3_temp', tagFn: (ln) => `Actual_Temperatur[${ln}]` },
      { param: 'holding4_press', tagFn: () => 'CurrentPressure' },
      { param: 'blowdown_time', tagFn: () => 'TotalTime_Min' },
      { param: 'exhaust_time', tagFn: () => 'TotalTime_Min' },
      { param: 'ffb_loading', tagFn: () => 'TotalTime_Min' },
      { param: 'target_ster_time', tagFn: () => 'TotalTime_Min' },
      { param: 'target_cyc_time', tagFn: () => 'TotalTime_Min' },
      { param: 'throughput_rate', tagFn: () => 'ACTUAL_THROUGHPUT' }
    ];

    for (let ln = 1; ln <= 4; ln++) {
      scoreLogicDefs.forEach(item => {
        const tagName = item.tagFn(ln);
        add(`settings_score_logic_st${ln}_${item.param}_actual`, 'ACTUAL', tagName);
        add(`settings_score_logic_st${ln}_${item.param}_actual`, 'MONITOR', tagName);
      });
    }

    scoreLogicDefs.forEach(item => {
      const tagName = item.tagFn(1);
      add(`settings_score_logic_${item.param}_actual`, 'ACTUAL', tagName);
      add(`settings_score_logic_${item.param}_actual`, 'MONITOR', tagName);
    });

    console.log(`3. Inserting ${mappings.length} mappings into station_tag_mappings...`);

    let count = 0;
    for (const m of mappings) {
      await pool.query(
        `INSERT INTO station_tag_mappings (station, equipment, signal_key, tag_id, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (station, equipment, signal_key) DO UPDATE
         SET tag_id = EXCLUDED.tag_id, updated_at = CURRENT_TIMESTAMP`,
        [m.station, m.equipment, m.signal_key, m.tag_id]
      );
      count++;
    }

    const totalMappings = await pool.query('SELECT count(*) FROM station_tag_mappings');
    const totalTags = await pool.query('SELECT count(*) FROM plc_tags');

    console.log(`✅ Successfully synced! Total station_tag_mappings: ${totalMappings.rows[0].count}, Total plc_tags: ${totalTags.rows[0].count}`);

  } catch (err) {
    console.error('Sync error:', err);
  } finally {
    await pool.end();
  }
}

run();
