import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import alarmRoutes from './routes/alarmRoutes.js';
import { startNotificationWorker } from './workers/notificationWorker.js';

dotenv.config();

const PORT = process.env.PORT || 3300;
const app = express();
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.use('/api/alarm', alarmRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'alarm-service', mill: 'KIP' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[alarm-service] listening on port ${PORT}`);
  // Start the background Redis subscriber and Telegram notifier
  startNotificationWorker();
});
