import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const makePool = (dbName) => mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'kip_reporting_ro',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
});

// ── Read-only pools untuk setiap domain database ──
export const stationDb     = makePool(process.env.DB_NAME_STATION     || 'agrovision_station');
export const plcDb         = makePool(process.env.DB_NAME_PLC         || 'agrovision_plc');
export const maintenanceDb = makePool(process.env.DB_NAME_MAINTENANCE || 'agrovision_maintenance');
export const logsheetDb    = makePool(process.env.DB_NAME_LOGSHEET    || 'agrovision_logsheet');
export const gradingDb     = makePool(process.env.DB_NAME_GRADING     || 'agrovision_grading');
export const authDb        = makePool(process.env.DB_NAME_AUTH        || 'agrovision_auth');

// Default pool alias (backward compat)
export const dbPool = stationDb;
