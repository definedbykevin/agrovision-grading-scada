import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function fixDevPassword() {
  try {
    const dbPool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "agrovision_auth",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const pass = "bgamaljuaramtq";
    const hash = await bcrypt.hash(pass, 10);
    
    await dbPool.query('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'dev']);
    console.log("Password updated for user 'dev'.");
    
  } catch (err) {
    console.error("Error occurred:", err.message);
  }
  process.exit(0);
}

fixDevPassword();
