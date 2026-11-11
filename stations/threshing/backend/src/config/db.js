import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

// PostgreSQL Connection Pool untuk stasiun Threshing (agrovision_threshing)
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "admin123",
  database: process.env.DB_NAME || "agrovision_threshing",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  options: "-c timezone=Asia/Jakarta",
});

pool.on("error", (err) => {
  console.error("[Threshing dbPool] Unexpected error on idle client:", err.message);
});

/**
 * Universal Query Formatter: MySQL -> PostgreSQL 18
 */
function formatPgQuery(sql, params = []) {
  let pgSql = sql;
  let finalParams = [];

  // 1. Bersihkan keyword DDL khusus MySQL
  pgSql = pgSql.replace(/ENGINE\s*=\s*InnoDB/gi, "");
  pgSql = pgSql.replace(/DEFAULT\s+CHARSET\s*=\s*[^\s;]+/gi, "");
  pgSql = pgSql.replace(/COLLATE\s*=\s*[^\s;]+/gi, "");
  pgSql = pgSql.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP(\(\d+\))?/gi, "");
  pgSql = pgSql.replace(/(INT|BIGINT)?\s*AUTO_INCREMENT\s*PRIMARY\s*KEY/gi, "SERIAL PRIMARY KEY");
  pgSql = pgSql.replace(/AUTO_INCREMENT/gi, "SERIAL");
  pgSql = pgSql.replace(/TINYINT\(\d+\)/gi, "SMALLINT");
  pgSql = pgSql.replace(/\bJSON\b(?=\s*(DEFAULT|,|\)))/gi, "JSONB");
  pgSql = pgSql.replace(/`([^`]+)`/g, '"$1"');
  pgSql = pgSql.replace(/agrovision_[a-z0-9_]+\./gi, "");

  // 1b. Konversi pembanding boolean (PostgreSQL boolean)
  pgSql = pgSql.replace(/\benabled\s*=\s*1\b/gi, "enabled = true");
  pgSql = pgSql.replace(/\benabled\s*=\s*0\b/gi, "enabled = false");
  pgSql = pgSql.replace(/\bis_synced\s*=\s*1\b/gi, "is_synced = true");
  pgSql = pgSql.replace(/\bis_synced\s*=\s*0\b/gi, "is_synced = false");

  // 2. Format query interval (NOW() - INTERVAL 2 HOUR -> NOW() - INTERVAL '2 HOUR')
  pgSql = pgSql.replace(
    /INTERVAL\s+(\d+)\s+(SECOND|MINUTE|HOUR|DAY|MONTH|YEAR)/gi,
    "INTERVAL '$1 $2'"
  );

  // 3. Konversi ON DUPLICATE KEY UPDATE untuk setiap tabel threshing
  if (/threshold_settings/i.test(pgSql) && /ON DUPLICATE KEY UPDATE/i.test(pgSql)) {
    pgSql = pgSql.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/i,
      "ON CONFLICT (parameter_key) DO UPDATE SET lower_val = EXCLUDED.lower_val, warning_val = EXCLUDED.warning_val, danger_val = EXCLUDED.danger_val, unit = EXCLUDED.unit, updated_at = CURRENT_TIMESTAMP"
    );
  } else if (/plc_tag_latest/i.test(pgSql) && /ON DUPLICATE KEY UPDATE/i.test(pgSql)) {
    pgSql = pgSql.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/i,
      "ON CONFLICT (tag_id) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP"
    );
  } else if (/plc_desired_state/i.test(pgSql) && /ON DUPLICATE KEY UPDATE/i.test(pgSql)) {
    pgSql = pgSql.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/i,
      "ON CONFLICT (tag_id) DO UPDATE SET desired_value = EXCLUDED.desired_value, is_synced = EXCLUDED.is_synced, updated_at = CURRENT_TIMESTAMP"
    );
  } else if (/plc_devices/i.test(pgSql) && /ON DUPLICATE KEY UPDATE/i.test(pgSql)) {
    pgSql = pgSql.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/i,
      "ON CONFLICT (name) DO UPDATE SET ip_address = EXCLUDED.ip_address, rack = EXCLUDED.rack, slot = EXCLUDED.slot, enabled = EXCLUDED.enabled"
    );
  } else if (/plc_tags/i.test(pgSql) && /ON DUPLICATE KEY UPDATE/i.test(pgSql)) {
    pgSql = pgSql.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/i,
      "ON CONFLICT (tag_name) DO UPDATE SET db_number = EXCLUDED.db_number, byte_offset = EXCLUDED.byte_offset, bit_offset = EXCLUDED.bit_offset, data_type = EXCLUDED.data_type, access = EXCLUDED.access, enabled = EXCLUDED.enabled, node_id = EXCLUDED.node_id"
    );
  } else if (/station_tag_mappings/i.test(pgSql) && /ON DUPLICATE KEY UPDATE/i.test(pgSql)) {
    pgSql = pgSql.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/i,
      "ON CONFLICT (station, signal_key, equipment) DO UPDATE SET tag_id = EXCLUDED.tag_id, updated_at = CURRENT_TIMESTAMP"
    );
  }

  // 4. Ekspansi Bulk Insert array 'VALUES ?'
  let paramIdx = 1;
  const bulkValuesMatch = pgSql.match(/VALUES\s*\?/i);
  if (bulkValuesMatch && Array.isArray(params[0]) && Array.isArray(params[0][0])) {
    const rows = params[0];
    const rowPlaceholders = [];
    for (const row of rows) {
      const colPlaceholders = [];
      for (const val of row) {
        colPlaceholders.push(`$${paramIdx++}`);
        finalParams.push(val);
      }
      rowPlaceholders.push(`(${colPlaceholders.join(", ")})`);
    }
    pgSql = pgSql.replace(/VALUES\s*\?/i, `VALUES ${rowPlaceholders.join(", ")}`);
    return { pgSql, finalParams };
  }

  // 5. Substitusi parameter '?' standar & array 'IN (?)'
  let pIndex = 0;
  pgSql = pgSql.replace(/\?/g, () => {
    const val = params[pIndex++];
    if (Array.isArray(val)) {
      if (val.length === 0) return "NULL";
      const inPlaceholders = val.map((item) => {
        finalParams.push(item);
        return `$${paramIdx++}`;
      });
      return inPlaceholders.join(", ");
    } else {
      finalParams.push(val);
      return `$${paramIdx++}`;
    }
  });

  // 6. Auto-append RETURNING id jika insert query belum memiliki RETURNING
  if (/^\s*INSERT\s+INTO\s+/i.test(pgSql) && !/RETURNING/i.test(pgSql) && !/ON CONFLICT.*DO NOTHING/i.test(pgSql)) {
    pgSql += " RETURNING id";
  }

  return { pgSql, finalParams };
}

// Adapter dbPool utama untuk Station Threshing
export const dbPool = {
  async query(sql, params = []) {
    const { pgSql, finalParams } = formatPgQuery(sql, params);
    const res = await pool.query(pgSql, finalParams);
    const resultMeta = {
      affectedRows: res.rowCount,
      rowCount: res.rowCount,
      insertId: res.rows?.[0]?.id || 0,
    };
    return [res.rows || [], resultMeta];
  },

  async getConnection() {
    const client = await pool.connect();
    return {
      async query(sql, params = []) {
        const { pgSql, finalParams } = formatPgQuery(sql, params);
        const res = await client.query(pgSql, finalParams);
        const resultMeta = {
          affectedRows: res.rowCount,
          rowCount: res.rowCount,
          insertId: res.rows?.[0]?.id || 0,
        };
        return [res.rows || [], resultMeta];
      },
      async beginTransaction() {
        await client.query("BEGIN");
      },
      async commit() {
        await client.query("COMMIT");
      },
      async rollback() {
        await client.query("ROLLBACK");
      },
      release() {
        client.release();
      },
    };
  },
};

// Dedicated Connection Pool untuk Main Service Database (agrovision_main)
export const mainPool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "admin123",
  database: process.env.DB_NAME_AUTH || "agrovision_main",
  max: 3,
  idleTimeoutMillis: 30000,
});

mainPool.on("error", (err) => {
  console.error("[mainDbPool] Idle client error:", err.message);
});

export const mainDbPool = {
  async query(sql, params = []) {
    let paramIdx = 1;
    let pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
    pgSql = pgSql.replace(/`([^`]+)`/g, '"$1"');
    pgSql = pgSql.replace(/agrovision_[a-z0-9_]+\./gi, "");
    if (/^\s*INSERT\s+INTO\s+/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
      pgSql += " RETURNING id";
    }
    const res = await mainPool.query(pgSql, params);
    const resultMeta = {
      affectedRows: res.rowCount,
      rowCount: res.rowCount,
      insertId: res.rows?.[0]?.id || 0,
    };
    return [res.rows || [], resultMeta];
  },
};

export const dbPoolPlc = dbPool;

export default dbPool;
