import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import monitorRoutes from './routes/monitorRoutes.js';
import logsheetRoutes from './routes/logsheetRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import plcConfigRoutes from './routes/plcConfigRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import { startAlarmWorker } from './workers/alarmWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3100;
const STATION_SLUG = process.env.STATION_SLUG || 'template';

// ── Middleware ──
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Routes (Dynamic based on STATION_SLUG) ──
app.use(`/api/${STATION_SLUG}/monitor`, monitorRoutes);
app.use(`/api/${STATION_SLUG}/logsheet`, logsheetRoutes);
app.use(`/api/${STATION_SLUG}/settings`, settingsRoutes);
app.use(`/api/${STATION_SLUG}/plc-config`, plcConfigRoutes);
app.use(`/api/${STATION_SLUG}/transactions`, transactionRoutes);

// ── Health ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', station: STATION_SLUG, mill: 'KIP' });
});

// ── Start Server & Redis Alarm Worker ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[station-${STATION_SLUG}] listening on port ${PORT}`);
  
  // Start the Redis alarm subscriber
  startAlarmWorker().catch(err => {
    console.error(`[station-${STATION_SLUG} worker] Failed to start alarm worker:`, err.message);
  });
});
