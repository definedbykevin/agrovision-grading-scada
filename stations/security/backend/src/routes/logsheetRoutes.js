import express from 'express';
import http from 'http';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const poolAi = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER && process.env.DB_USER !== 'root' ? process.env.DB_USER : 'postgres',
  password: process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== '' ? process.env.DB_PASSWORD : 'kip2026',
  database: 'agrovision_security_ai',
  max: 10,
  idleTimeoutMillis: 30000,
});

async function fetchLogsFromDb(targetStation, category, startDate, endDate, page, limit) {
  try {
    const whereConditions = [];
    const params = [];
    let paramIdx = 1;

    if (targetStation && targetStation !== 'all-stations') {
      whereConditions.push(`REPLACE(station_slug, '_', '-') = REPLACE($${paramIdx++}, '_', '-')`);
      params.push(targetStation);
    }

    if (category && category.toUpperCase() !== 'ALL' && category.toUpperCase() !== 'ALL CATEGORIES') {
      whereConditions.push(`category = $${paramIdx++}`);
      params.push(category.toUpperCase());
    }

    if (startDate) {
      const cleanStart = startDate.replace('T', ' ').replace('Z', '').split('.')[0];
      whereConditions.push(`detected_at >= $${paramIdx++}`);
      params.push(cleanStart);
    }

    if (endDate) {
      const cleanEnd = endDate.replace('T', ' ').replace('Z', '').split('.')[0];
      whereConditions.push(`detected_at <= $${paramIdx++}`);
      params.push(cleanEnd);
    }

    const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';

    const countRes = await poolAi.query(`SELECT COUNT(*) as total FROM security_ai_detection_logs${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const querySql = `SELECT * FROM security_ai_detection_logs${whereClause} ORDER BY detected_at DESC, id DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    const dataRes = await poolAi.query(querySql, [...params, limit, offset]);

    return {
      aiLogs: dataRes.rows || [],
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  } catch (err) {
    console.error('[Logsheet Gateway] Fallback DB Query Error:', err.message);
    return { aiLogs: [], pagination: { total: 0, page: parseInt(page, 10), totalPages: 1 } };
  }
}

/**
 * GET /api/security/logsheet/event-logs
 * Fetch event logs from AI Security microservice (:4101) or fallback to PostgreSQL DB
 */
router.get('/event-logs', async (req, res) => {
  const { station, stationSlug, category, page = 1, limit = 11, startDate, endDate } = req.query;
  const targetStation = stationSlug || station || req.params.station || 'all-stations';

  try {
    let { aiLogs, pagination } = await new Promise((resolve) => {
      let path = targetStation && targetStation !== 'all-stations'
        ? `/api/security-ai/analytics/detection-logs?station_slug=${encodeURIComponent(targetStation)}&page=${page}&limit=${limit}`
        : `/api/security-ai/analytics/detection-logs?page=${page}&limit=${limit}`;

      if (category && category !== 'ALL') path += `&category=${encodeURIComponent(category)}`;
      if (startDate) path += `&start_date=${encodeURIComponent(startDate)}`;
      if (endDate) path += `&end_date=${encodeURIComponent(endDate)}`;

      const reqAi = http.request({
        hostname: '127.0.0.1',
        port: 4101,
        path,
        method: 'GET'
      }, (resAi) => {
        let body = '';
        resAi.on('data', chunk => body += chunk);
        resAi.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.success && Array.isArray(parsed.data)) {
              resolve({
                aiLogs: parsed.data,
                pagination: parsed.pagination || { total: parsed.data.length, page: parseInt(page, 10), totalPages: 1 }
              });
            } else {
              resolve({ aiLogs: null, pagination: null });
            }
          } catch {
            resolve({ aiLogs: null, pagination: null });
          }
        });
      });

      reqAi.on('error', (err) => {
        console.warn('[Logsheet Gateway] Warning: Could not fetch logs from Security AI (:4101), using PostgreSQL fallback:', err.message);
        resolve({ aiLogs: null, pagination: null });
      });

      reqAi.end();
    });

    // Fallback to PostgreSQL DB if HTTP call failed or returned null
    if (!aiLogs) {
      const dbResult = await fetchLogsFromDb(targetStation, category, startDate, endDate, page, limit);
      aiLogs = dbResult.aiLogs;
      pagination = dbResult.pagination;
    }

    const formattedLogs = aiLogs.map(item => ({
      id: `ai_${item.id}`,
      timestamp: item.detected_at,
      station: (item.station_slug || 'SECURITY').toUpperCase(),
      station_slug: item.station_slug,
      category: item.category || 'AI',
      camera_code: item.camera_code,
      camera_name: item.camera_name || item.camera_code,
      tag_name: item.camera_name || item.camera_code,
      old_value: '---',
      new_value: item.detection_detail || 'DETECTION_EVENT',
      plate_no: item.plate_no || null,
      detection_detail: item.detection_detail,
      confidence_score: item.confidence_score ? `${Math.round(item.confidence_score * 100)}%` : '---',
      severity: 'WARNING',
      source: item.camera_code,
      snapshot_path: item.snapshot_path,
      image_url: item.snapshot_path ? `http://localhost:4101${item.snapshot_path}` : null,
      shift: 'SHIFT_1'
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: pagination || {
        total: formattedLogs.length,
        page: parseInt(page, 10),
        totalPages: Math.ceil(formattedLogs.length / limit) || 1
      }
    });
  } catch (error) {
    console.error('[Logsheet Gateway] Error fetching event logs:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data logsheet' });
  }
});

export default router;
