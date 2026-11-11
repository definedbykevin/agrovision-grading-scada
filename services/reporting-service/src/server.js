import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import reportsRoutes from './routes/reportsRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 3007;
const app = express();
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Read-only aggregation service
app.use('/api/reports', reportsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'reporting-service', mill: 'KIP' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[reporting-service] listening on port ${PORT}`);
});
