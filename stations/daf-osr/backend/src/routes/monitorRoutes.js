import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// In-memory cache for realtime tag values, updated by Redis subscriber
export const liveDataCache = {};

// GET /api/daf-osr/monitor/realtime
router.get('/realtime', (req, res) => {
  res.json({ success: true, data: liveDataCache });
});

// GET /api/daf-osr/monitor/historical
router.get('/historical', async (req, res) => {
  const { period = "5H", start, end, type = "pressure", paramKey } = req.query;

  let resolution = 300;
  if (period === "2H") resolution = 120;
  else if (period === "5H" || period === "H") resolution = 300;
  else if (period === "8H") resolution = 240;
  else if (period === "D") resolution = 288;

  const nowMs = Date.now();
  let startTimeMs = Number(start);
  let endTimeMs = Number(end);

  if (!startTimeMs || !endTimeMs || isNaN(startTimeMs) || isNaN(endTimeMs)) {
    let durationMs = 5 * 60 * 60 * 1000;
    if (period === "2H") durationMs = 2 * 60 * 60 * 1000;
    else if (period === "8H") durationMs = 8 * 60 * 60 * 1000;
    else if (period === "D") durationMs = 24 * 60 * 60 * 1000;
    endTimeMs = nowMs;
    startTimeMs = nowMs - durationMs;
  }

  try {
    const { rows: mappings } = await pool.query(
      `SELECT equipment, signal_key, tag_id FROM station_tag_mappings`
    );

    const { rows: tags } = await pool.query(
      `SELECT id, tag_name FROM plc_tags WHERE enabled = true`
    );

    const tagIdToName = {};
    tags.forEach((t) => { tagIdToName[t.id] = t.tag_name; });

    // 10 Dedicated Parameters Map
    const PARAM_CONFIG = {
      air_compressor: { eq: "compressor_pressure", sig: "PRESSURE" },
      ae_tank: { eq: "ae_tank", sig: "PRESSURE" },
      water_level_pv: { eq: "water_level", sig: "PV" },
      chiller_in: { eq: "chiller", sig: "INLET_TEMP" },
      chiller_mid: { eq: "chiller", sig: "MID_TEMP" },
      chiller_out: { eq: "chiller", sig: "OUTLET_TEMP" },
      ae_inlet_flow_pv: { eq: "ae_inlet_flow", sig: "PV" },
      skimmer_hz: { eq: "skimmer", sig: "SPEED" },
      skimmer_amp: { eq: "skimmer", sig: "CURRENT" },
      mt_inlet_flow_pv: { eq: "mt_inlet_flow", sig: "PV" },
    };

    const targetTagIds = {};
    const validTagIds = [];
    const tagIdToParamKeys = {};

    Object.keys(PARAM_CONFIG).forEach((pk) => {
      const cfg = PARAM_CONFIG[pk];
      const m = mappings.find(
        (item) =>
          item.equipment?.toLowerCase() === cfg.eq.toLowerCase() &&
          item.signal_key?.toUpperCase() === cfg.sig.toUpperCase()
      );
      if (m && m.tag_id) {
        targetTagIds[pk] = m.tag_id;
        if (!tagIdToParamKeys[m.tag_id]) tagIdToParamKeys[m.tag_id] = [];
        tagIdToParamKeys[m.tag_id].push(pk);
        if (!validTagIds.includes(m.tag_id)) validTagIds.push(m.tag_id);
      }
    });

    const totalDurationMs = Math.max(1000, endTimeMs - startTimeMs);
    const bucketMs = totalDurationMs / resolution;

    const series = {};
    Object.keys(PARAM_CONFIG).forEach((pk) => {
      series[pk] = new Array(resolution).fill(null);
    });

    // Query historical data jika tag_id ditemukan
    if (validTagIds.length > 0) {
      const { rows: logs } = await pool.query(
        `SELECT tag_id, value, timestamp 
         FROM plc_tag_values 
         WHERE tag_id = ANY($1) 
           AND timestamp >= $2 
           AND timestamp <= $3
         ORDER BY timestamp ASC`,
        [validTagIds, new Date(startTimeMs), new Date(endTimeMs)]
      );

      logs.forEach((row) => {
        const pks = tagIdToParamKeys[row.tag_id];
        if (!pks) return;
        const tMs = new Date(row.timestamp).getTime();
        const bucketIdx = Math.floor((tMs - startTimeMs) / bucketMs);
        if (bucketIdx >= 0 && bucketIdx < resolution) {
          const num = parseFloat(row.value);
          if (!isNaN(num)) {
            pks.forEach((pk) => {
              series[pk][bucketIdx] = num;
            });
          }
        }
      });
    }

    // Process each series: forward fill if data exists, or if live value exists, or empty array if no data
    Object.keys(PARAM_CONFIG).forEach((pk) => {
      const tid = targetTagIds[pk];
      const tName = tid ? tagIdToName[tid] : null;
      let liveVal = null;
      if (tName && liveDataCache[tName] !== undefined) {
        const parsed = parseFloat(liveDataCache[tName]);
        if (!isNaN(parsed)) liveVal = parsed;
      }

      const hasHistorical = series[pk].some((v) => v !== null);

      if (hasHistorical) {
        let lastVal = series[pk].find((v) => v !== null) ?? liveVal ?? 0;
        for (let i = 0; i < resolution; i++) {
          if (series[pk][i] !== null) {
            lastVal = series[pk][i];
          } else {
            series[pk][i] = lastVal;
          }
        }
      } else if (liveVal !== null) {
        // Tag ter-mapping dan memiliki nilai live aktif saat ini
        series[pk] = new Array(resolution).fill(liveVal);
      } else {
        // Belum ada mapping / data riil: kembalikan array kosong (tidak ada gelombang tiruan)
        series[pk] = [];
      }
    });

    // Fallback single series if specific paramKey requested
    let singleSeries = null;
    if (paramKey && series[paramKey]) {
      singleSeries = series[paramKey];
    }

    res.json({
      success: true,
      data: {
        resolution,
        start: startTimeMs,
        end: endTimeMs,
        period,
        type,
        paramKey,
        series: singleSeries,
        ...series,
      },
    });
  } catch (err) {
    console.error('[daf-osr /historical] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
