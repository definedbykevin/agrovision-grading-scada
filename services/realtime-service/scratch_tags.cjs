const mysql = require('mysql2/promise');
async function run() {
  try {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'agrovision_sterilizer' });
    await pool.query("INSERT INTO plc_tags (plc_id, db_number, byte_offset, data_type, tag_name, access, enabled) VALUES (8, 1, 100, 'INT', 'OVER_LIMIT_TIME', 'WRITE', 1), (8, 1, 102, 'INT', 'OVER_LIMIT_SCORE', 'WRITE', 1)");
    
    // Also map it so the user sees it working!
    await pool.query("INSERT INTO station_tag_mappings (station, equipment, signal_key, tag_id) VALUES ('sterilizer', 'settings_tolerance_over_limit_time', 'TIME', LAST_INSERT_ID()), ('sterilizer', 'settings_tolerance_over_limit_score', 'SCORE', LAST_INSERT_ID() + 1)");
    
    console.log('Tags added and mapped');
    process.exit(0);
  } catch(err) {
    console.error(err);
    process.exit(1);
  }
}
run();
