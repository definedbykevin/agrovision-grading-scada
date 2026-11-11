import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logsheetRoutes from './routes/logsheetRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 3005;
const app = express();
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Manual logsheet input by operators
app.use('/api/logsheet-form', logsheetRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'logsheet-service', mill: 'KIP' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[logsheet-service] listening on port ${PORT}`);
});
