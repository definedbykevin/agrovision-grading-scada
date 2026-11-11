import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/USER/Documents/.DEV/PEI/AgroVision/AGROVISION/AGROVISION-PC/stations/security/backend/.env' });

async function checkSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'agrovision_security'
  });

  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log("TABLES:");
    console.log(tables);

    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [columns] = await pool.query(`DESCRIBE ${tableName}`);
      console.log(`\nTABLE: ${tableName}`);
      console.log(columns);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
