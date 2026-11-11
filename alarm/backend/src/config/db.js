import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agrovision_alarm',
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
});

// Koneksi ke database config terpusat PLC untuk membaca parameter & ambang batas
export const dbPoolStation = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: 'root',
  password: '',
  database: 'agrovision_station',
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
});
