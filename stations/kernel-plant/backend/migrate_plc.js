import { dbPool } from "./src/config/db.js";

async function runMigration() {
  console.log("Starting PLC tables migration for Kernel Plant...");
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS plc_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        rack INT NOT NULL DEFAULT 0,
        slot INT NOT NULL DEFAULT 1,
        enabled BOOLEAN NOT NULL DEFAULT 1,
        UNIQUE KEY uk_ip (ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("plc_devices table created or verified.");

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS plc_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plc_id INT NOT NULL,
        db_number INT NOT NULL,
        byte_offset INT NOT NULL,
        bit_offset INT NOT NULL DEFAULT 0,
        data_type VARCHAR(20) NOT NULL,
        tag_name VARCHAR(100) NOT NULL,
        access VARCHAR(10) NOT NULL DEFAULT 'read',
        enabled BOOLEAN NOT NULL DEFAULT 1,
        UNIQUE KEY uk_tag_name (tag_name),
        FOREIGN KEY (plc_id) REFERENCES plc_devices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("plc_tags table created or verified.");

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS plc_tag_latest (
        tag_id INT PRIMARY KEY,
        value VARCHAR(255),
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tag_id) REFERENCES plc_tags(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("plc_tag_latest table created or verified.");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

runMigration();
