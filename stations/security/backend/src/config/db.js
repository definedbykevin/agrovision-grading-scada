import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER && process.env.DB_USER !== 'root' ? process.env.DB_USER : 'postgres';
const dbPassword = process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== '' ? process.env.DB_PASSWORD : 'kip2026';
const dbName = process.env.DB_NAME || 'agrovision_security';

export const pool = new Pool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  max: 10,
  idleTimeoutMillis: 30000,
});

export const mainPool = new Pool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: 'agrovision_main',
  max: 5,
  idleTimeoutMillis: 30000,
});

/**
 * Converts MySQL parameter placeholders (?) to PostgreSQL placeholders ($1, $2, ...)
 */
function convertSqlParams(sql) {
  let paramIndex = 1;
  const converted = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return converted.replace(/`/g, '"');
}

/**
 * Execute a query with MySQL-compatible return format [rows, fields]
 */
async function executeQuery(sql, params = []) {
  const pgSql = convertSqlParams(sql);
  const res = await pool.query(pgSql, params);

  const rows = res.rows || [];
  
  const affectedRows = res.rowCount || 0;
  const insertId = (rows[0] && (rows[0].id || rows[0].insert_id)) || 0;

  Object.defineProperties(rows, {
    affectedRows: { value: affectedRows, writable: true, enumerable: true },
    insertId: { value: insertId, writable: true, enumerable: true },
    changedRows: { value: affectedRows, writable: true, enumerable: true },
  });

  const fields = res.fields || [];
  return [rows, fields];
}

async function executeMainQuery(sql, params = []) {
  const pgSql = convertSqlParams(sql);
  const res = await mainPool.query(pgSql, params);
  const rows = res.rows || [];
  return [rows, res.fields || []];
}

export const dbMainPool = {
  query: executeMainQuery
};

export const dbPool = {
  query: executeQuery,
  execute: executeQuery,
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: (sql, params) => executeQuery.call(client, sql, params),
      execute: (sql, params) => executeQuery.call(client, sql, params),
      release: () => client.release(),
      beginTransaction: async () => client.query('BEGIN'),
      commit: async () => client.query('COMMIT'),
      rollback: async () => client.query('ROLLBACK'),
    };
  },
  on: (...args) => pool.on(...args),
  end: () => pool.end(),
};

// Koneksi ke database khusus stasiun (PLC tables now hosted locally in each station's database)
export const dbPoolPlc = dbPool;
