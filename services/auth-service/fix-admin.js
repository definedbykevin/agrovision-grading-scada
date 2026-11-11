import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function fixPassword() {
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
    
    await dbPool.query('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin']);
    console.log("Password updated for admin.");

    // Let's test the query that authRoutes.js runs:
    const [[user]] = await dbPool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = ?`,
      ['admin']
    );
    console.log("User:", user.username, "Role:", user.role_name);
    
  } catch (err) {
    console.error("Error occurred:", err.message);
  }
  process.exit(0);
}

fixPassword();
