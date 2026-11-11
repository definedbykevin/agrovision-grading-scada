import mysql from 'mysql2/promise';

async function updateDb(dbName) {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: dbName,
    });

    console.log("Updating " + dbName + "...");

    // Add protocol to plc_devices
    try {
      await connection.query("ALTER TABLE plc_devices ADD COLUMN protocol VARCHAR(50) DEFAULT 'SNAP7'");
      console.log("- Added protocol to plc_devices");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("- protocol already exists in plc_devices");
      else console.error("Error adding protocol: ", e.message);
    }

    // Add node_id to plc_tags
    try {
      await connection.query("ALTER TABLE plc_tags ADD COLUMN node_id VARCHAR(255) DEFAULT NULL");
      console.log("- Added node_id to plc_tags");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("- node_id already exists in plc_tags");
      else console.error("Error adding node_id: ", e.message);
    }

    await connection.end();
  } catch (err) {
    console.error("Could not connect to " + dbName + ":", err.message);
  }
}

async function run() {
  await updateDb('agrovision_kernel_plant');
  console.log('Done!');
}

run();
