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
    const tagRes = await pool.query('SELECT id, tag_name FROM plc_tags');
    const tagMap = new Map();
    tagRes.rows.forEach(r => tagMap.set(r.tag_name, r.id));

    const mappings = [];
    const add = (equipment, signal_key, tagName) => {
      const id = tagMap.get(tagName);
      if (id) {
        mappings.push({ station: 'sterilizer', equipment, signal_key, tag_id: id });
      } else {
        console.log('WARNING: Tag not found:', tagName, 'for', equipment, signal_key);
      }
    };

    for (let n = 1; n <= 4; n++) {
      // Doors
      add(`card_inlet_door_st${n}`, 'MONITOR', `in_door_close${n}`);
      add(`top_door_st${n}`, 'STATUS', `in_door_close${n}`);
      add(`card_outlet_door_st${n}`, 'MONITOR', `out_door_close${n}`);
      add(`bot_door_st${n}`, 'STATUS', `out_door_close${n}`);
      add(`st${n}_door_in`, 'STATUS', `in_door_close${n}`);
      add(`st${n}_door_out`, 'STATUS', `out_door_close${n}`);

      // Valves
      add(`card_exhaust_steam_st${n}`, 'MONITOR', `exhaust${n}_in`);
      add(`st${n}_exhaust`, 'MONITOR', `exhaust${n}_in`);
      add(`card_inlet_steam_1_st${n}`, 'MONITOR', `inlet${n}_In(1)`);
      add(`card_inlet_steam_2_st${n}`, 'MONITOR', `inlet${n}_In(2)`);
      add(`st${n}_inlet_steam`, 'MONITOR', `inlet${n}_In(1)`);
      add(`card_flashing_st${n}`, 'MONITOR', 'Flashing');
      add(`card_condensate_1_st${n}`, 'MONITOR', `condensateL${n}(1)_in`);
      add(`card_relief_condensate_st${n}`, 'MONITOR', `condensateL${n}(2)_in`);
      add(`st${n}_condensate`, 'MONITOR', `condensateL${n}(1)_in`);
      add(`d_cond_st${n}`, 'MONITOR', `condensateL${n}(1)_in`);

      // Overview Sensors
      add(`overview_pressure_${n}`, 'MONITOR', 'CurrentPressure');
      add(`overview_temp_${n}`, 'MONITOR', `Actual_Temperatur[${n}]`);
      add(`st${n}_pressure_card`, 'MONITOR', 'CurrentPressure');
      add(`st${n}_temp_card`, 'MONITOR', `Actual_Temperatur[${n}]`);

      // Status Object
      add(`st${n}_status`, 'STEP', 'CurrentStep');
      add(`st${n}_status`, 'PRESSURE', 'CurrentPressure');
      add(`st${n}_status`, 'TEMP', `Actual_Temperatur[${n}]`);
      add(`st${n}_status`, 'TOTAL_TIME', 'TotalTime_Min');
      add(`st${n}_status`, 'STATUS', 'Status');
      add(`st${n}_status`, 'DOOR_IN', `in_door_close${n}`);
      add(`st${n}_status`, 'DOOR_OUT', `out_door_close${n}`);

      // Modulating Auto V1..V3
      for (let v = 1; v <= 3; v++) {
        const eqId = `st${n}_v${v}_valve_auto`;
        add(eqId, 'SP', `Setpoint_for_inlet${n}`);
        add(eqId, 'SET_VALUE', `Setpoint_for_inlet${n}`);
        add(eqId, 'MIN', `MIN_inlet_line${n}[${v}]`);
        add(eqId, 'MAX', `MAX_inlet_line${n}[${v}]`);
        add(eqId, 'CONTROL_LOW', `range_low_line${n}[${v}]`);

        const eqManualId = `st${n}_v${v}_valve_manual`;
        add(eqManualId, 'SET_VALUE', `set_modulate_manual${n}[${v}]`);
      }

      // High Temp
      add(`st${n}_high_temp`, 'SETPOINT', 'Set_high_bpv[1]');
    }

    // BPV
    add('bpv_makeup_valve', 'MONITOR', 'open_position_bpv[1]');
    add('bpv_blowoff_valve', 'MONITOR', 'open_position_bpv[2]');
    add('bpv_pres', 'MONITOR', 'CurrentPressure');
    add('blr_pres', 'MONITOR', 'Main_steam_premit');
    add('bpv_status', 'STATUS', 'Status');
    add('bpv_status', 'MAKEUP', 'open_position_bpv[1]');
    add('bpv_status', 'SURPLUS', 'open_position_bpv[2]');
    add('bpv_status', 'PRESSURE', 'CurrentPressure');

    console.log(`Total mappings prepared: ${mappings.length}`);

    for (const m of mappings) {
      await pool.query(
        `INSERT INTO station_tag_mappings (station, equipment, signal_key, tag_id, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (station, equipment, signal_key) DO UPDATE
         SET tag_id = EXCLUDED.tag_id, updated_at = CURRENT_TIMESTAMP`,
        [m.station, m.equipment, m.signal_key, m.tag_id]
      );
    }

    const check = await pool.query('SELECT count(*) FROM station_tag_mappings');
    console.log(`✅ Success! Total station_tag_mappings in DB: ${check.rows[0].count}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
