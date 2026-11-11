import { Router } from 'express';
import { db, schema, eq, asc, sql } from '../db/index.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

router.use(requireAuth);

// GET /api/{station}/settings/thresholds
router.get('/thresholds', async (_req, res) => {
  try {
    const rows = await db.select({
      id: schema.thresholdSettings.id,
      parameter_key: schema.thresholdSettings.parameterKey,
      lower_val: schema.thresholdSettings.lowerVal,
      warning_val: schema.thresholdSettings.warningVal,
      danger_val: schema.thresholdSettings.dangerVal,
      unit: schema.thresholdSettings.unit,
      updated_at: schema.thresholdSettings.updatedAt,
    })
    .from(schema.thresholdSettings)
    .orderBy(asc(schema.thresholdSettings.parameterKey));

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/thresholds (Upsert single threshold)
router.post('/thresholds', authorize(['developer', 'admin']), async (req, res) => {
  const { parameter_key, lower_val, warning_val, danger_val, unit } = req.body;
  try {
    // 1. Fetch old value for diff
    const [oldR] = await db.select({
      parameter_key: schema.thresholdSettings.parameterKey,
      lower_val: schema.thresholdSettings.lowerVal,
      warning_val: schema.thresholdSettings.warningVal,
      danger_val: schema.thresholdSettings.dangerVal,
    })
    .from(schema.thresholdSettings)
    .where(eq(schema.thresholdSettings.parameterKey, parameter_key))
    .limit(1);

    let changes = [];
    if (!oldR) {
      changes.push(`Added ${parameter_key}`);
    } else {
      if (String(oldR.lower_val) !== String(lower_val)) changes.push(`Lower ${oldR.lower_val}->${lower_val}`);
      if (String(oldR.warning_val) !== String(warning_val)) changes.push(`Warn ${oldR.warning_val}->${warning_val}`);
      if (String(oldR.danger_val) !== String(danger_val)) changes.push(`Danger ${oldR.danger_val}->${danger_val}`);
    }

    // 2. Save (Native PostgreSQL Upsert via Drizzle ORM)
    await db.insert(schema.thresholdSettings)
      .values({
        parameterKey: parameter_key,
        lowerVal: lower_val !== undefined && lower_val !== '' ? Number(lower_val) : 0,
        warningVal: warning_val !== undefined && warning_val !== '' ? Number(warning_val) : 50,
        dangerVal: danger_val !== undefined && danger_val !== '' ? Number(danger_val) : 80,
        unit: unit || null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .onConflictDoUpdate({
        target: schema.thresholdSettings.parameterKey,
        set: {
          lowerVal: lower_val !== undefined && lower_val !== '' ? Number(lower_val) : 0,
          warningVal: warning_val !== undefined && warning_val !== '' ? Number(warning_val) : 50,
          dangerVal: danger_val !== undefined && danger_val !== '' ? Number(danger_val) : 80,
          unit: unit || null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });

    // 3. Log
    if (req.user && req.user.userRole !== 'developer' && changes.length > 0) {
      const desc = `Threshing Station threshold ${parameter_key}: ${changes.join(', ')}`;
      const userAgent = req.headers['user-agent'] || 'unknown';
      await db.execute(sql`
        INSERT INTO agrovision_auth.activity_logs (user_id, username, activity_type, description, ip_address, user_agent)
        VALUES (${req.user.userId}, ${req.user.username}, 'setting_change', ${desc}, ${getClientIp(req)}, ${userAgent})
      `).catch((err) => console.error('[SettingLog] Error:', err));
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
