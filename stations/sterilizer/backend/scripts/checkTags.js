import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

async function checkTags() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_NAME || 'agrovision_sterilizer',
  });

  try {
    const res = await pool.query(
      'SELECT tag_name, data_type, db_number, byte_offset, bit_offset FROM plc_tags ORDER BY db_number, byte_offset, bit_offset'
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkTags();
