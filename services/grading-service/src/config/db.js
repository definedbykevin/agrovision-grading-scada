import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
export const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'kip_backend',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agrovision_db',
  waitForConnections: true, connectionLimit: 3, queueLimit: 0,
});
