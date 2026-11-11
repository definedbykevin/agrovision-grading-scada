import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Koneksi ke database khusus stasiun
export const dbPool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'kip_station_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'agrovision_{station}',
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit:         0,
});

// Koneksi ke database khusus stasiun (PLC tables now hosted locally in each station's database)
export const dbPoolPlc = dbPool;
