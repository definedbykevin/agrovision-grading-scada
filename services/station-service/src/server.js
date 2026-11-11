import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { dbPool } from './config/db.js';
import stationRoutes from './routes/stationRoutes.js';
import thresholdRoutes from './routes/thresholdRoutes.js';
import logsheetDataRoutes from './routes/logsheetDataRoutes.js';
import { StationEventWorker } from './workers/stationEventWorker.js';

dotenv.config();

const PORT = process.env.PORT || 3003;
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || 'kip:plc:data';

const app = express();
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Routes ──
app.use('/api/station', stationRoutes);
app.use('/api/settings', thresholdRoutes);
app.use('/api/logsheet', logsheetDataRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'station-service', mill: 'KIP' }));

// ── Start Redis Worker (threshold evaluation + notifications) ──
const redisWorker = createClient({ url: process.env.REDIS_URL });
redisWorker.connect().then(() => {
  console.log('[station-service] Redis worker connected — subscribing to PLC data...');
  redisWorker.subscribe(REDIS_CHANNEL, (message) => {
    try {
      const payload = JSON.parse(message);
      StationEventWorker.processBatch(payload.tags, payload.timestamp, dbPool);
    } catch {}
  });
}).catch(err => console.error('[station-service] Redis worker error:', err.message || err.toString() || err));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[station-service] listening on port ${PORT}`);
});
