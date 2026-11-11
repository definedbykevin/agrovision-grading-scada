import { Router } from 'express';
import { requireAuth } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// In-memory cache for realtime tag values, updated by Redis subscriber
export const liveDataCache = {};

// GET /api/{station}/monitor/realtime
router.get('/realtime', (req, res) => {
  res.json({ success: true, data: liveDataCache });
});

export default router;
