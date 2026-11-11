import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import configRoutes from './routes/configRoutes.js';

import { runMigration } from './config/migration.js';

dotenv.config();

// Run database migrations
await runMigration().catch(err => {
  console.error('[server] Migration failed:', err);
});

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3011;

// ── Middleware ──
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Diagnostic] ${req.method} ${req.url}`);
  console.log(`[Diagnostic] Auth Header:`, req.headers.authorization);
  next();
});

// ── Routes ──
app.use('/auth', authRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/config', configRoutes);

// ── Health ──
const getHealthResponse = () => ({
  success: true,
  message: 'API is reachable',
  server: 'Node.js Express',
  service: 'main-service',
  port: PORT
});

app.get('/health', (_req, res) => res.json(getHealthResponse()));
app.get('/api/health', (_req, res) => res.json(getHealthResponse()));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[main-service] listening on port ${PORT}`);
});

// Emulate config-service on port 3008 for other services during transition
const CONFIG_PORT = 3009;
app.listen(CONFIG_PORT, '0.0.0.0', () => {
  console.log(`[main-service] emulating config-service on port ${CONFIG_PORT}`);
});
