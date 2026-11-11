import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Inisialisasi PostgreSQL Connection Pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER_AUTH || process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD_AUTH || process.env.DB_PASSWORD || '200898',
  database: process.env.DB_NAME_AUTH || process.env.DB_NAME || 'agrovision_main',
  max: 10,
  idleTimeoutMillis: 30000,
});

// Helper untuk konversi format query MySQL (?) ke PostgreSQL ($1, $2)
function formatPgQuery(sql) {
  let paramIdx = 1;
  let pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
  pgSql = pgSql.replace(/`([^`]+)`/g, '"$1"'); // Ubah backtick ke quotes
  pgSql = pgSql.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  if (/^\s*INSERT\s+INTO\s+/i.test(pgSql) && !/RETURNING/i.test(pgSql) && !/(user_permissions|role_permissions)/i.test(pgSql)) {
    pgSql += ' RETURNING id';
  }
  return pgSql;
}

// Adapter agar format dbPool.query(...) tetap kompatibel dengan kode yang ada
export const dbPool = {
  async query(sql, params = []) {
    const formattedSql = formatPgQuery(sql);
    const res = await pool.query(formattedSql, params);
    const rows = res.rows || [];
    rows.insertId = rows[0]?.id || 0;
    rows.affectedRows = res.rowCount;
    const resultMeta = {
      affectedRows: res.rowCount,
      rowCount: res.rowCount,
      insertId: rows.insertId,
    };
    return [rows, resultMeta];
  },

  async getConnection() {
    const client = await pool.connect();
    return {
      async query(sql, params = []) {
        const formattedSql = formatPgQuery(sql);
        const res = await client.query(formattedSql, params);
        const rows = res.rows || [];
        rows.insertId = rows[0]?.id || 0;
        rows.affectedRows = res.rowCount;
        const resultMeta = {
          affectedRows: res.rowCount,
          rowCount: res.rowCount,
          insertId: rows.insertId,
        };
        return [rows, resultMeta];
      },
      async beginTransaction() {
        await client.query('BEGIN');
      },
      async commit() {
        await client.query('COMMIT');
      },
      async rollback() {
        await client.query('ROLLBACK');
      },
      release() {
        client.release();
      },
    };
  },
};

export const dbPoolConfig = dbPool;
export default dbPool;
