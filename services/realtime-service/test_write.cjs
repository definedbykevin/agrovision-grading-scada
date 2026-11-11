const mysql = require('mysql2/promise');
async function run() {
  try {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'agrovision_sterilizer' });
    const [cols] = await pool.query('DESCRIBE plc_commands');
    console.log('plc_commands structure:', cols);

    // Also check station_tag_mappings for design_capacity
    const [maps] = await pool.query("SELECT * FROM station_tag_mappings WHERE equipment LIKE '%capacity%'");
    console.log('tag mappings for capacity:', maps);

    // Also check what the tag actually is
    const [tag] = await pool.query("SELECT * FROM plc_tags WHERE id=644");
    console.log('tag 644 details:', tag);

    process.exit(0);
  } catch(err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}
run();
