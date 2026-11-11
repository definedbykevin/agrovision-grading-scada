import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import contactRoutes from './routes/contactRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 3400;
const app = express();
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.use('/api/contacts', contactRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'contacts-service', mill: 'KIP' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[contacts-service] listening on port ${PORT}`);
});
