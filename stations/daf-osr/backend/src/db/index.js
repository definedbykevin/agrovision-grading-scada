import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../config/db.js';
import * as schema from './schema.ts';

export const db = drizzle(pool, { schema });
export { schema };