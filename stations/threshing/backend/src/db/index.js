import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../config/db.js';
import * as schema from './schema.js';

export const db = drizzle(pool, { schema });
export { schema };
export * from 'drizzle-orm';


