import pg from 'pg';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

const dbName = process.env.DB_NAME || 'agrovision_threshing';
const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT) || 5432;
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'admin123';

async function setupDatabase() {
    console.log(`[db:init] Target database: ${dbName} on ${host}:${port}`);

    // 1. Pastikan database target ada di PostgreSQL
    const rootPool = new pg.Pool({
        host,
        port,
        user,
        password,
        database: 'postgres',
    });

    try {
        const checkDb = await rootPool.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [dbName]
        );
        if (checkDb.rowCount === 0) {
            console.log(`[db:init] Database "${dbName}" belum ada. Membuat database baru...`);
            await rootPool.query(`CREATE DATABASE "${dbName}"`);
            console.log(`[db:init] Database "${dbName}" berhasil dibuat.`);
        } else {
            console.log(`[db:init] Database "${dbName}" sudah tersedia.`);
        }
    } catch (err) {
        console.error(`[db:init] Gagal memeriksa/membuat database:`, err.message);
    } finally {
        await rootPool.end();
    }

    // 2. Cek apakah ada tabel lama yang konflik tipe data dan kosong (0 baris)
    const targetPool = new pg.Pool({
        host,
        port,
        user,
        password,
        database: dbName,
    });

    try {
        const tablesRes = await targetPool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        let allEmpty = true;
        for (const row of tablesRes.rows) {
            const countRes = await targetPool.query(`SELECT count(*) FROM "${row.table_name}"`);
            if (parseInt(countRes.rows[0].count, 10) > 0) {
                allEmpty = false;
                break;
            }
        }
        // Jika tabel ada tapi semuanya kosong (0 baris) dan skema belum sinkron, bersihkan agar Drizzle push mulus tanpa prompt TTY
        if (tablesRes.rowCount > 0 && allEmpty) {
            console.log(`[db:init] Menyiapkan sinkronisasi awal (membersihkan tabel kosong lama)...`);
            for (const row of tablesRes.rows) {
                await targetPool.query(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
            }
        }
    } catch (err) {
        console.error(`[db:init] Warning saat cek tabel:`, err.message);
    } finally {
        await targetPool.end();
    }

    // 3. Jalankan Drizzle ORM Push langsung (Pure Drizzle ORM)
    try {
        console.log(`[db:init] Menyelaraskan tabel menggunakan Drizzle ORM (schema.js)...`);
        execSync('npx drizzle-kit push', { stdio: 'inherit' });
        console.log(`[db:init] SELURUH TABEL DRIZZLE ORM BERHASIL DISINKRONISASI DI "${dbName}"!`);
    } catch (err) {
        console.error(`[db:init] Gagal sinkronisasi Drizzle:`, err.message);
    }
}

setupDatabase();
