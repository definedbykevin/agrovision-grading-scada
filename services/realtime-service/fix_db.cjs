const mysql = require('mysql2/promise');
async function run() {
  try {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'agrovision_sterilizer' });
    
    // Fix tag 644 access from READ to WRITE so it can receive commands
    console.log('Fixing tag 644 access to WRITE...');
    await pool.query("UPDATE plc_tags SET access='WRITE' WHERE id=644");
    
    // Also fix any other capacity-related tags (mappings show 644 for all 3, so all will benefit)
    const [tag] = await pool.query('SELECT id, tag_name, access FROM plc_tags WHERE id=644');
    console.log('Tag 644 now:', tag);
    
    // Test insert a command
    const [result] = await pool.query(
      'INSERT INTO plc_commands (tag_id, value, status, created_at) VALUES (?, ?, ?, NOW())',
      [644, '40', 'PENDING']
    );
    console.log('Test INSERT SUCCESS, id:', result.insertId);
    
    // Verify command exists
    const [cmds] = await pool.query('SELECT * FROM plc_commands WHERE id=?', [result.insertId]);
    console.log('Command in DB:', cmds);
    
    process.exit(0);
  } catch(err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}
run();
