import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import maintenanceRoutes from './routes/maintenanceRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 3200;
const app = express();
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.use('/api/maintenance', maintenanceRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'maintenance-service', mill: 'KIP' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[maintenance-service] listening on port ${PORT}`);
});
