import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

// Inisialisasi PostgreSQL Connection Pool untuk Station Sterilizer
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "admin123",
  database: process.env.DB_NAME || "agrovision_sterilizer",
  max: 15,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("[PostgreSQL Pool Warning - handled]", err.message);
});

/**
 * Helper untuk konversi format query MySQL ke PostgreSQL secara otomatis:
 * 1. Menangani parameter placeholder '?' -> '$1, $2, ...'
 * 2. Menangani 'IN (?)' dengan array parameter [1, 2, 3] -> '$1, $2, $3'
 * 3. Menangani bulk array insert 'VALUES ?' -> 'VALUES ($1, $2), ($3, $4)'
 * 4. Menangani ON DUPLICATE KEY UPDATE -> ON CONFLICT (...) DO UPDATE
 * 5. Menangani MySQL DDL & tipe data (AUTO_INCREMENT, TINYINT, ENGINE=InnoDB, backticks)
 * 6. Menangani interval query (NOW() - INTERVAL X HOUR)
 */
function formatPgQuery(sql, params = []) {
  let pgSql = sql;
  let finalParams = [];

  // 1. Bersihkan keyword DDL khusus MySQL jika ada auto-create table
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

  // 1b. Konversi pembanding boolean (MySQL 1/0 ke PostgreSQL TRUE/FALSE)
  pgSql = pgSql.replace(/\benabled\s*=\s*1\b/gi, "enabled = TRUE");
  pgSql = pgSql.replace(/\benabled\s*=\s*0\b/gi, "enabled = FALSE");
  pgSql = pgSql.replace(/\bis_synced\s*=\s*1\b/gi, "is_synced = TRUE");
  pgSql = pgSql.replace(/\bis_synced\s*=\s*0\b/gi, "is_synced = FALSE");

  // 2. Format query interval (NOW() - INTERVAL 2 HOUR -> NOW() - INTERVAL '2 HOUR')
  pgSql = pgSql.replace(
    /INTERVAL\s+(\d+)\s+(SECOND|MINUTE|HOUR|DAY|MONTH|YEAR)/gi,
    "INTERVAL '$1 $2'"
  );

  // 3. Konversi ON DUPLICATE KEY UPDATE untuk setiap tabel sterilizer
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
      "ON CONFLICT (station, equipment, signal_key) DO UPDATE SET tag_id = EXCLUDED.tag_id, updated_at = CURRENT_TIMESTAMP"
    );
  } else if (/recipe_settings/i.test(pgSql) && /ON DUPLICATE KEY UPDATE/i.test(pgSql)) {
    pgSql = pgSql.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/i,
      "ON CONFLICT (category, line_number, step_number) DO UPDATE SET unf = EXCLUDED.unf, nrm = EXCLUDED.nrm, wet = EXCLUDED.wet, inl = EXCLUDED.inl, con = EXCLUDED.con, exh = EXCLUDED.exh, bar = EXCLUDED.bar, mode = EXCLUDED.mode, door_in = EXCLUDED.door_in, door_out = EXCLUDED.door_out, inl1 = EXCLUDED.inl1, inl2 = EXCLUDED.inl2, dinl = EXCLUDED.dinl, rcon = EXCLUDED.rcon, dcon = EXCLUDED.dcon"
    );
  } else if (/station_parameters/i.test(pgSql) && /ON DUPLICATE KEY UPDATE/i.test(pgSql)) {
    pgSql = pgSql.replace(
      /ON DUPLICATE KEY UPDATE[\s\S]*$/i,
      "ON CONFLICT (param_key) DO UPDATE SET param_value = EXCLUDED.param_value, updated_at = CURRENT_TIMESTAMP"
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

  return { pgSql, finalParams };
}

// Adapter dbPool utama
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

export const dbPoolPlc = dbPool;
export default dbPool;
