import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cctvRoutes from './routes/cctvRoutes.js';
import patrolRoutes from './routes/patrolRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import logsheetRoutes from './routes/logsheetRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3100;
const STATION_SLUG = process.env.STATION_SLUG || 'security';

// ── Middleware ──
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Routes (Security Module) ──
app.use(`/api/${STATION_SLUG}/cctv`, cctvRoutes);
app.use(`/api/${STATION_SLUG}/patrol`, patrolRoutes);
app.use(`/api/${STATION_SLUG}/incidents`, incidentRoutes);
app.use(`/api/${STATION_SLUG}/queues`, queueRoutes);
app.use(`/api/${STATION_SLUG}/logsheet`, logsheetRoutes);

// Mobile app compat alias
app.use(`/api/${STATION_SLUG}/truck-queue`, queueRoutes);
app.use(`/api/${STATION_SLUG}/upload`, uploadRoutes);
// Alias for mobile app that hardcodes /api/upload
app.use('/api/upload', uploadRoutes);

// ── Static Files (Uploads) ──
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(`/api/${STATION_SLUG}/uploads`, express.static(path.join(__dirname, '../uploads')));
app.use(`/api/${STATION_SLUG}/apk`, express.static(path.join(__dirname, '../uploads/apk')));

// Endpoint khusus download APK yang pasti lolos proxy Cloudflare
app.get([`/api/${STATION_SLUG}/download-apk`, '/api/security/download-apk'], (_req, res) => {
  const filePath = path.join(__dirname, '../uploads/apk/agrovision-v1.0.2.apk');
  res.download(filePath, 'agrovision-v1.0.2.apk', (err) => {
    if (err) {
      console.error('[APK Download] File not found or error:', err.message);
      if (!res.headersSent) res.status(404).send('APK file not found on server');
    }
  });
});

// ── App Update & Version Check (Self-Hosted OTA) ──
const APP_VERSION_CONFIG = {
  version: '1.0.2',
  build_number: 2,
  apk_url: '/api/security/apk/agrovision-v1.0.2.apk',
  force_update: false,
  release_notes: 'Peningkatan performa, pembaruan tampilan, dan stabilitas in-app update.',
  released_at: '2026-10-23'
};

app.get(['/api/security/app-version', '/api/app-version'], (_req, res) => {
  res.json({
    success: true,
    data: APP_VERSION_CONFIG
  });
});

// Endpoint untuk update konfigurasi versi dari admin jika dibutuhkan nanti
app.post('/api/security/app-version', (req, res) => {
  const { version, build_number, release_notes, force_update } = req.body;
  if (version) APP_VERSION_CONFIG.version = version;
  if (build_number) APP_VERSION_CONFIG.build_number = Number(build_number);
  if (release_notes) APP_VERSION_CONFIG.release_notes = release_notes;
  if (force_update !== undefined) APP_VERSION_CONFIG.force_update = Boolean(force_update);
  res.json({ success: true, message: 'App version updated', data: APP_VERSION_CONFIG });
});

// ── Health ──
const getHealthResponse = () => ({
  success: true,
  message: 'API is reachable',
  server: 'Node.js Express',
  service: `security-station (${STATION_SLUG})`,
  port: PORT
});

app.get('/health', (_req, res) => res.json(getHealthResponse()));
app.get('/api/health', (_req, res) => res.json(getHealthResponse()));

// ── Ensure Critical Database Indexes ──
async function ensureDatabaseIndexes() {
  try {
    const { dbPool } = await import('./config/db.js');
    await dbPool.query('CREATE INDEX IF NOT EXISTS idx_patrol_tracks_session_id_id ON security_patrol_tracks (session_id, id DESC);');
    await dbPool.query('CREATE INDEX IF NOT EXISTS idx_patrol_tracks_session_recorded ON security_patrol_tracks (session_id, recorded_at ASC);');
    await dbPool.query('CREATE INDEX IF NOT EXISTS idx_patrol_tracks_id ON security_patrol_tracks (id);');
  } catch (err) {
    console.error('[DB Index] Warning ensuring indexes:', err.message);
  }
}
ensureDatabaseIndexes();

// ── Start Server ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[station-${STATION_SLUG}] Security backend listening on port ${PORT}`);
});
