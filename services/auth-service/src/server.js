import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 4000;

// ── Middleware ──
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Routes ──
app.use('/auth', authRoutes);
app.use('/api/admin', userRoutes);

// ── Health ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service', mill: 'KIP' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[auth-service] listening on port ${PORT}`);
});
