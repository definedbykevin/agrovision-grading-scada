import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Pool untuk agrovision_auth
const dbPassword = process.env.DB_PASSWORD_AUTH || "";

export const dbPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER_AUTH || "root",
  password: dbPassword,
  database: process.env.DB_NAME_AUTH || "agrovision_auth",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Pool untuk agrovision_config
export const dbPoolConfig = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER_CONFIG || "root",
  password: dbPassword,
  database: process.env.DB_NAME_CONFIG || "agrovision_config",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
