import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: './database/migrations',
    dbCredentials: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'willea123',
        database: process.env.DB_NAME || 'agrovision_daf',
        ssl: false,
    },
});