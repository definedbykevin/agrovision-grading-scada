const pg = require('pg');
const xlsx = require('xlsx');
const path = require('path');

const { Pool } = pg;

async function run() {
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'admin123',
    database: 'agrovision_sterilizer',
  });

  try {
    console.log('1. Ensuring plc_devices...');
    const devRes = await pool.query(`
      INSERT INTO plc_devices (name, ip_address, rack, slot, status, enabled)
      VALUES ('Sterilizer PLC', '10.0.0.1', 0, 1, 'DISCONNECTED', true)
      ON CONFLICT (name) DO UPDATE SET ip_address = EXCLUDED.ip_address, enabled = true
      RETURNING id
    `);
    const plcId = devRes.rows[0]?.id || 1;

    console.log('2. Reading Excel file...');
    const excelPath = '/home/agrovision-industrial/Downloads/Sterillizer+tambahan1 (1) (2).xlsx';
    const wb = xlsx.readFile(excelPath);

    const rawTags = [];

    // Sheet: Vertical Sterilizer
    const s2 = wb.Sheets['Vertical Sterilizer'];
    if (s2) {
      const r2 = xlsx.utils.sheet_to_json(s2, { header: 1 });
      r2.forEach((row) => {
        if (row[1] && typeof row[1] === 'string' && row[1] !== 'Name Tag' && row[1] !== 'Alamat Sterilizer') {
          rawTags.push({ name: row[1].trim(), type: row[2], offset: row[3], addr: row[4] });
        }
        if (row[7] && typeof row[7] === 'string' && row[7] !== 'Make-up Valve Open' && row[7] !== 'Name Tag') {
          rawTags.push({ name: row[7].trim(), type: row[8], offset: row[9], addr: row[10] });
        }
        if (row[13] && typeof row[13] === 'string' && row[13] !== 'Main Steam Overriding' && row[13] !== 'Overiding During Holding' && row[13] !== 'Name Tag') {
          rawTags.push({ name: row[13].trim(), type: row[14], offset: row[15], addr: row[16] });
        }
      });
    }

    // Sheet3: Setting Valve Modulate
    const s3 = wb.Sheets['Sheet3'];
    if (s3) {
      const r3 = xlsx.utils.sheet_to_json(s3, { header: 1 });
      r3.forEach(row => {
        if (row[1] && typeof row[1] === 'string' && row[1] !== 'Name Tag') {
          rawTags.push({ name: row[1].trim(), type: row[2], offset: row[3], addr: row[4] });
        }
      });
    }

    console.log(`Found ${rawTags.length} raw tags from Excel. Parsing and inserting...`);

    let insertedCount = 0;
    const insertedTagsMap = new Map(); // name -> id

    for (const item of rawTags) {
      const tagName = item.name;
      if (!tagName) continue;

      let dataType = 'REAL';
      const rawType = String(item.type || '').toUpperCase();
      if (rawType.includes('BOOL')) dataType = 'BOOL';
      else if (rawType.includes('INT') && !rawType.includes('DINT')) dataType = 'INT';
      else if (rawType.includes('DINT')) dataType = 'DINT';
      else if (rawType.includes('REAL')) dataType = 'REAL';

      let dbNumber = 1;
      let byteOffset = 0;
      let bitOffset = null;
      let nodeId = 'DB';

      const addrStr = String(item.addr || item.offset || '').trim().replace(/^%/, '');

      // Check DB format: DB11.DBD104, DB9.DBW152, DB21.DBX2.1, DB21.DBX2,1
      const dbMatch = addrStr.match(/DB(\d+)\.DB([XWD])(\d+)(?:[.,](\d+))?/i);
      const dbxShortMatch = addrStr.match(/DB(\d+)\.DBX(\d+)$/i);
      const iqmMatch = addrStr.match(/^([IQM])(\d+)(?:[.,](\d+))?/i);

      if (dbMatch) {
        dbNumber = parseInt(dbMatch[1], 10);
        byteOffset = parseInt(dbMatch[3], 10);
        const kind = dbMatch[2].toUpperCase();
        if (kind === 'X') {
          dataType = 'BOOL';
          bitOffset = dbMatch[4] !== undefined ? parseInt(dbMatch[4], 10) : 0;
        } else if (kind === 'W') {
          dataType = 'INT';
        } else if (kind === 'D') {
          dataType = dataType === 'DINT' ? 'DINT' : 'REAL';
        }
      } else if (dbxShortMatch) {
        dbNumber = parseInt(dbxShortMatch[1], 10);
        byteOffset = parseInt(dbxShortMatch[2], 10);
        bitOffset = 0;
        dataType = 'BOOL';
      } else if (iqmMatch) {
        nodeId = iqmMatch[1].toUpperCase();
        dbNumber = 0;
        byteOffset = parseInt(iqmMatch[2], 10);
        bitOffset = iqmMatch[3] !== undefined ? parseInt(iqmMatch[3], 10) : 0;
        dataType = 'BOOL';
      } else {
        const num = parseFloat(item.offset);
        if (!isNaN(num)) {
          byteOffset = Math.floor(num);
          const rem = Math.round((num - byteOffset) * 10);
          if (dataType === 'BOOL') bitOffset = rem;
        }
      }

      // Detect READ vs WRITE
      let access = 'READ';
      const upperName = tagName.toUpperCase();
      if (
        upperName.startsWith('SET_') ||
        upperName.startsWith('SETPOINT') ||
        upperName.startsWith('MAX_') ||
        upperName.startsWith('MIN_') ||
        upperName.startsWith('LIMIT_') ||
        upperName.startsWith('RANGE_') ||
        upperName.startsWith('OPEN_POSITION_') ||
        upperName.includes('MANUAL') ||
        upperName.includes('OVERRIDING') ||
        upperName.includes('CAPACITY') ||
        upperName.includes('SCORE')
      ) {
        access = 'WRITE';
      }

      const res = await pool.query(
        `INSERT INTO plc_tags (plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
         ON CONFLICT (tag_name) DO UPDATE 
         SET db_number = EXCLUDED.db_number,
             byte_offset = EXCLUDED.byte_offset,
             bit_offset = EXCLUDED.bit_offset,
             data_type = EXCLUDED.data_type,
             access = EXCLUDED.access,
             enabled = true,
             node_id = EXCLUDED.node_id
         RETURNING id`,
        [plcId, dbNumber, byteOffset, bitOffset, dataType, tagName, access, nodeId]
      );

      const tagId = res.rows[0]?.id;
      insertedTagsMap.set(tagName, tagId);
      insertedCount++;
    }

    console.log(`✅ Successfully inserted/updated ${insertedCount} tags into plc_tags.`);

    // Auto generate standard station mappings for Sterilizer Overview & Settings
    console.log('3. Generating station_tag_mappings...');
    const mappingsToInsert = [];

    // Helper to map
    const addMap = (equipment, signal_key, tagName) => {
      const tagId = insertedTagsMap.get(tagName);
      if (tagId) {
        mappingsToInsert.push({ station: 'sterilizer', equipment, signal_key, tag_id: tagId });
      }
    };

    // 1 to 4 Sterilizer lines
    for (let line = 1; line <= 4; line++) {
      // Door & Step & Status
      addMap(`st${line}_door_in`, 'STATUS', `in_door_close${line}`);
      addMap(`st${line}_door_out`, 'STATUS', `out_door_close${line}`);
      addMap(`st${line}_status`, 'STEP', `st${line}_step`);
      addMap(`st${line}_status`, 'PRESSURE', `st${line}_pressure`);
      addMap(`st${line}_status`, 'TEMP', `st${line}_temp`);
      addMap(`st${line}_high_temp`, 'SETPOINT', `st${line}_high_temp`);

      // Modulating Valves Auto V1, V2, V3
      for (let v = 1; v <= 3; v++) {
        const eqId = `st${line}_v${v}_valve_auto`;
        addMap(eqId, 'SP', `setpoint_inlet_line${line}[${v}]`);
        addMap(eqId, 'MIN', `MIN_inlet_line${line}[${v}]`);
        addMap(eqId, 'MAX', `MAX_inlet_line${line}[${v}]`);
        addMap(eqId, 'CONTROL_LOW', `range_low_line${line}[${v}]`);
        addMap(eqId, 'SET_VALUE', `setpoint_inlet_line${line}[${v}]`);

        const eqManualId = `st${line}_v${v}_valve_manual`;
        addMap(eqManualId, 'SET_VALUE', `set_modulate_manual${line}[${v}]`);
      }
    }

    // BPV Mappings
    addMap('bpv_makeup_valve', 'MONITOR', 'open_position_bpv[1]');
    addMap('bpv_blowoff_valve', 'MONITOR', 'open_position_bpv[2]');
    addMap('bpv_pres', 'MONITOR', 'bpv_pres');
    addMap('blr_pres', 'MONITOR', 'blr_pres');

    let mapCount = 0;
    for (const m of mappingsToInsert) {
      await pool.query(
        `INSERT INTO station_tag_mappings (station, equipment, signal_key, tag_id, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (station, equipment, signal_key) DO UPDATE
         SET tag_id = EXCLUDED.tag_id, updated_at = CURRENT_TIMESTAMP`,
        [m.station, m.equipment, m.signal_key, m.tag_id]
      );
      mapCount++;
    }

    console.log(`✅ Successfully generated ${mapCount} station_tag_mappings.`);

    const totalTags = await pool.query('SELECT count(*) FROM plc_tags');
    const totalMappings = await pool.query('SELECT count(*) FROM station_tag_mappings');
    console.log(`Summary: plc_tags = ${totalTags.rows[0].count}, station_tag_mappings = ${totalMappings.rows[0].count}`);

  } catch (err) {
    console.error('Import Error:', err);
  } finally {
    await pool.end();
  }
}

run();
