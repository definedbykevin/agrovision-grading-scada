import express from 'express';
import { dbPool, dbMainPool } from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { requireAuth } from '../middleware/jwtMiddleware.js';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper to calculate 7 AM of the current operational shift (in server's local time)
const getShiftStartTimeStr = () => {
    const now = new Date();
    let startOfDay = new Date(now);
    startOfDay.setHours(7, 0, 0, 0);
    // If it's currently before 7 AM, the operational day started yesterday at 7 AM
    if (now.getHours() < 7) {
        startOfDay.setDate(startOfDay.getDate() - 1);
    }
    const pad = (n) => n.toString().padStart(2, '0');
    return `${startOfDay.getFullYear()}-${pad(startOfDay.getMonth() + 1)}-${pad(startOfDay.getDate())} ${pad(startOfDay.getHours())}:${pad(startOfDay.getMinutes())}:${pad(startOfDay.getSeconds())}`;
};

/**
 * Helper Logika Auto-Shift & Sesi/Round (4 Sesi per Shift - Tiap 2 Jam)
 * - Shift 1: 07.00 – 15.00 (Round 1: 07-09, Round 2: 09-11, Round 3: 11-13, Round 4: 13-15)
 * - Shift 2: 15.00 – 23.00 (Round 1: 15-17, Round 2: 17-19, Round 3: 19-21, Round 4: 21-23)
 * - Shift 3: 23.00 – 07.00 (Round 1: 23-01, Round 2: 01-03, Round 3: 03-05, Round 4: 05-07)
 */
export const calculateAutoShift = (dateObj = new Date()) => {
    const hours = dateObj.getHours();
    
    let shift = 'Shift 1';
    let round_number = 1;
    let workDateObj = new Date(dateObj);

    if (hours >= 7 && hours < 15) {
        shift = 'Shift 1';
        if (hours >= 7 && hours < 9) round_number = 1;
        else if (hours >= 9 && hours < 11) round_number = 2;
        else if (hours >= 11 && hours < 13) round_number = 3;
        else round_number = 4;
    } else if (hours >= 15 && hours < 23) {
        shift = 'Shift 2';
        if (hours >= 15 && hours < 17) round_number = 1;
        else if (hours >= 17 && hours < 19) round_number = 2;
        else if (hours >= 19 && hours < 21) round_number = 3;
        else round_number = 4;
    } else {
        shift = 'Shift 3';
        if (hours >= 23 || hours < 1) round_number = 1;
        else if (hours >= 1 && hours < 3) round_number = 2;
        else if (hours >= 3 && hours < 5) round_number = 3;
        else round_number = 4;

        if (hours < 7) {
            workDateObj.setDate(workDateObj.getDate() - 1);
        }
    }

    const pad = (n) => n.toString().padStart(2, '0');
    const work_date = `${workDateObj.getFullYear()}-${pad(workDateObj.getMonth() + 1)}-${pad(workDateObj.getDate())}`;

    return { shift, round_number, work_date };
};

// ==========================================
// Haversine Formula for Distance Calculation
// ==========================================
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // Earth radius in meters
  const toRad = (val) => (val * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Ensure security_map_settings table exists & has default factory row
const initMapSettingsTable = async () => {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS security_map_settings (
        id SERIAL PRIMARY KEY,
        factory_name VARCHAR(100) DEFAULT 'Pabrik SKL',
        center_latitude DECIMAL(10, 8) NULL,
        center_longitude DECIMAL(11, 8) NULL,
        default_zoom INT NULL,
        default_bearing INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('[patrolRoutes] Failed to initialize security_map_settings table:', err);
  }
};
initMapSettingsTable();

/**
 * GET /api/security/patrol/map-settings
 * Fetch factory map settings (latitude, longitude, zoom, bearing)
 */
router.get('/map-settings', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM security_map_settings ORDER BY id ASC LIMIT 1');
    if (rows.length > 0) {
      return res.json(rows[0]);
    }
    res.json({
      center_latitude: 3.683095,
      center_longitude: 98.704352,
      default_zoom: 18,
      default_bearing: 0
    });
  } catch (error) {
    console.error('Error fetching map settings:', error);
    res.status(500).json({ error: 'Failed to fetch map settings' });
  }
});

/**
 * POST /api/security/patrol/map-settings
 * Update factory map settings (latitude, longitude, zoom, bearing)
 */
router.post('/map-settings', async (req, res) => {
  try {
    const { center_latitude, center_longitude, default_zoom, default_bearing, factory_name } = req.body;
    
    const lat = parseFloat(center_latitude) || 3.683095;
    const lng = parseFloat(center_longitude) || 98.704352;
    const zoom = parseInt(default_zoom) || 18;
    const bearing = parseInt(default_bearing) || 0;
    const fname = factory_name || 'Pabrik SKL';

    const [rows] = await dbPool.query('SELECT id FROM security_map_settings ORDER BY id ASC LIMIT 1');
    if (rows.length > 0) {
      await dbPool.query(`
        UPDATE security_map_settings 
        SET center_latitude = ?, center_longitude = ?, default_zoom = ?, default_bearing = ?, factory_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [lat, lng, zoom, bearing, fname, rows[0].id]);
    } else {
      await dbPool.query(`
        INSERT INTO security_map_settings (factory_name, center_latitude, center_longitude, default_zoom, default_bearing)
        VALUES (?, ?, ?, ?, ?)
      `, [fname, lat, lng, zoom, bearing]);
    }

    res.json({
      success: true,
      message: 'Map settings updated successfully',
      settings: { center_latitude: lat, center_longitude: lng, default_zoom: zoom, default_bearing: bearing, factory_name: fname }
    });
  } catch (error) {
    console.error('Error updating map settings:', error);
    res.status(500).json({ error: 'Failed to update map settings' });
  }
});

/**
 * GET /api/security/patrol/active
 * Fetch currently active patrols (guards)
 */
const getActiveGuardsHandler = async (req, res) => {
  try {
    const { shift, round_number, work_date } = calculateAutoShift(new Date());

    // 🛡️ Auto-close sesi usang yang sudah melewati jadwal shift atau ronde berjalan
    await dbPool.query(`
      UPDATE security_patrol_sessions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' 
        AND (work_date < ? OR shift != ? OR round_number != ?)
    `, [work_date, shift, round_number]);

    // Tampilkan HANYA guard yang sedang memiliki sesi patroli AKTIF pada shift & round berjalan
    const [rows] = await dbPool.query(`
      SELECT 
        s.id as session_id,
        s.session_code,
        s.guard_id,
        s.guard_name as name,
        s.status,
        COALESCE(s.avatar_photo, gs.avatar_photo) as avatar_photo,
        (SELECT station_name FROM security_session_checkpoints c WHERE c.session_id = s.id ORDER BY verified_at DESC LIMIT 1) as current_station_key,
        (SELECT verified_at FROM security_session_checkpoints c WHERE c.session_id = s.id ORDER BY verified_at DESC LIMIT 1) as last_update,
        (SELECT verification_photo FROM security_session_checkpoints c WHERE c.session_id = s.id AND verification_photo IS NOT NULL ORDER BY verified_at DESC LIMIT 1) as latest_photo,
        gs.latitude,
        gs.longitude
      FROM security_patrol_sessions s
      LEFT JOIN security_guards_status gs ON gs.user_id = s.guard_id
      WHERE s.status = 'active' 
        AND s.work_date = ? 
        AND s.shift = ? 
        AND s.round_number = ?
      ORDER BY s.started_at DESC
    `, [work_date, shift, round_number]);

    let finalRows = rows;
    try {
      const [userRows] = await dbMainPool.query('SELECT id, username, full_name, avatar_photo FROM users');
      const userMapById = new Map();
      const userMapByName = new Map();
      const avatarMapById = new Map();
      const avatarMapByName = new Map();
      for (const u of userRows) {
        if (u.full_name) {
          userMapById.set(Number(u.id), u.full_name);
          userMapByName.set(String(u.username).toLowerCase(), u.full_name);
        }
        if (u.avatar_photo) {
          avatarMapById.set(Number(u.id), u.avatar_photo);
          avatarMapByName.set(String(u.username).toLowerCase(), u.avatar_photo);
        }
      }
      finalRows = rows.map(r => {
        const guardIdNum = Number(r.guard_id);
        const guardNameLower = String(r.name).toLowerCase();
        const userAvatar = avatarMapById.get(guardIdNum) || avatarMapByName.get(guardNameLower);
        const resolvedAvatar = userAvatar || r.avatar_photo || null;
        return {
          ...r,
          name: userMapById.get(guardIdNum) || avatarMapByName.get(guardNameLower) || r.name,
          avatar_photo: resolvedAvatar,
          // Prioritaskan avatar profile tab di atas checkpoint photo
          photo: resolvedAvatar || r.latest_photo || null
        };
      });
    } catch (_) {}

    res.json(finalRows);
  } catch (error) {
    console.error('Error fetching active guards:', error);
    res.status(500).json({ error: 'Failed to fetch active guards' });
  }
};

router.get('/active', getActiveGuardsHandler);
router.get('/guards', getActiveGuardsHandler);

/**
 * GET /api/security/patrol/sessions/active
 * Fetch the active patrol session for the currently authenticated guard
 */
router.get('/sessions/active', async (req, res) => {
  let guard_id = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
        guard_id = decoded.userId || decoded.id || decoded.sub;
      }
    } catch (_) {}
  }

  if (!guard_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { shift, round_number, work_date } = calculateAutoShift(new Date());

    // 🛡️ Auto-close sesi usang yang sudah melewati jadwal shift atau ronde berjalan
    await dbPool.query(`
      UPDATE security_patrol_sessions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' 
        AND (work_date < ? OR shift != ? OR round_number != ?)
    `, [work_date, shift, round_number]);

    // 1. Prioritaskan cari sesi patroli yang aktif milik guard ini sendiri PADA SHIFT & ROUND BERJALAN
    let [sessions] = await dbPool.query(
      "SELECT * FROM security_patrol_sessions WHERE guard_id = ? AND status = 'active' AND work_date = ? AND shift = ? AND round_number = ? ORDER BY id DESC LIMIT 1",
      [guard_id, work_date, shift, round_number]
    );

    // 2. Jika tidak ada sesi personal, cari sesi tim yang aktif di shift/ronde saat ini
    if (sessions.length === 0) {
      const [teamSessions] = await dbPool.query(
        "SELECT * FROM security_patrol_sessions WHERE status = 'active' AND work_date = ? AND shift = ? AND round_number = ? ORDER BY id DESC LIMIT 1",
        [work_date, shift, round_number]
      );
      if (teamSessions.length > 0) {
        sessions = teamSessions;
      }
    }

    if (sessions.length === 0) {
      return res.json(null);
    }

    const session = sessions[0];

    // Ambil semua checkpoint yang sudah disubmit di sesi ini
    const [checkpoints] = await dbPool.query(
      'SELECT * FROM security_session_checkpoints WHERE session_id = ? ORDER BY verified_at ASC',
      [session.id]
    );

    session.checkpoints = checkpoints;

    res.json(session);
  } catch (error) {
    console.error('Error fetching active guard session:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
});

/**
 * GET /api/security/patrol/sessions
 * Fetch patrol sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT * FROM security_patrol_sessions ORDER BY started_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching patrol sessions:', error);
    res.status(500).json({ error: 'Failed to fetch patrol sessions' });
  }
});

/**
 * GET /api/security/patrol/checkpoints
 * Fetch patrol checkpoints (photos/notes uploaded by guards)
 */
const getCheckpointsHandler = async (req, res) => {
  try {
    const { shift, round_number, work_date } = calculateAutoShift(new Date());

    // 1. Tidak auto-close sesi secara paksa agar sesi berjalan tidak terputus di tengah jalan


    // 2. Ambil data checkpoint yang HANYA milik round yang berlaku saat ini
    const [rows] = await dbPool.query(`
      SELECT c.*, s.guard_name, s.guard_id, s.started_at, s.completed_at, s.shift 
      FROM security_session_checkpoints c
      JOIN security_patrol_sessions s ON c.session_id = s.id
      WHERE c.status = 'verified' 
        AND s.work_date = ? 
        AND s.shift = ? 
        AND s.round_number = ?
      ORDER BY c.verified_at DESC 
      LIMIT 200
    `, [work_date, shift, round_number]);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching patrol checkpoints:', error);
    res.status(500).json({ error: 'Failed to fetch patrol checkpoints' });
  }
};

router.get('/checkpoints', getCheckpointsHandler);

// Historical Logs for Web View
router.get('/logs', async (req, res) => {
  try {
    const { from_date, to_date, all_data } = req.query;
    let queryParams = [];
    let dateFilter = "";

    if (all_data !== 'true') {
      const today = new Date().toISOString().split('T')[0];
      const fromDate = from_date || today;
      const toDate = to_date || today;
      dateFilter = "AND DATE(c.verified_at) BETWEEN ? AND ?";
      queryParams.push(fromDate, toDate);
    }

    const [rows] = await dbPool.query(`
      SELECT 
        c.*, 
        COALESCE(u.full_name, s.guard_name) AS guard_name, 
        COALESCE(u.avatar_photo, s.avatar_photo) AS avatar_photo,
        s.guard_id, 
        s.started_at, 
        s.completed_at, 
        s.shift,
        s.round_number,
        (SELECT COUNT(*) FROM security_session_checkpoints sc WHERE sc.session_id = c.session_id AND sc.verified_at <= c.verified_at) as checkpoint_order,
        (SELECT COUNT(*) FROM security_session_checkpoints sc WHERE sc.session_id = c.session_id) as session_total_scanned,
        (SELECT COUNT(*) FROM security_stations WHERE is_active = 1) as total_master_stations
      FROM security_session_checkpoints c
      JOIN security_patrol_sessions s ON c.session_id = s.id
      LEFT JOIN dblink('dbname=agrovision_main', 'SELECT id, full_name, username, avatar_photo FROM users') AS u(id INT, full_name TEXT, username TEXT, avatar_photo TEXT) ON s.guard_id = u.id OR s.guard_name = u.username
      WHERE c.status = 'verified' 
      ${dateFilter}
      ORDER BY c.verified_at DESC 
      LIMIT 1000
    `, queryParams).catch(async (dbLinkErr) => {
      // Fallback jika dblink extension belum aktif di database
      const [baseRows] = await dbPool.query(`
        SELECT 
          c.*, 
          s.guard_name, 
          s.avatar_photo,
          s.guard_id, 
          s.started_at, 
          s.completed_at, 
          s.shift, 
          s.round_number,
          (SELECT COUNT(*) FROM security_session_checkpoints sc WHERE sc.session_id = c.session_id AND sc.verified_at <= c.verified_at) as checkpoint_order,
          (SELECT COUNT(*) FROM security_session_checkpoints sc WHERE sc.session_id = c.session_id) as session_total_scanned,
          (SELECT COUNT(*) FROM security_stations WHERE is_active = 1) as total_master_stations
        FROM security_session_checkpoints c
        JOIN security_patrol_sessions s ON c.session_id = s.id
        WHERE c.status = 'verified' 
        ${dateFilter}
        ORDER BY c.verified_at DESC 
        LIMIT 1000
      `, queryParams);

      try {
        const [userRows] = await dbMainPool.query('SELECT id, username, full_name, avatar_photo FROM users');
        const userMapById = new Map();
        const userMapByName = new Map();
        const avatarMapById = new Map();
        const avatarMapByName = new Map();
        for (const u of userRows) {
          if (u.full_name) {
            userMapById.set(Number(u.id), u.full_name);
            userMapByName.set(String(u.username).toLowerCase(), u.full_name);
          }
          if (u.avatar_photo) {
            avatarMapById.set(Number(u.id), u.avatar_photo);
            avatarMapByName.set(String(u.username).toLowerCase(), u.avatar_photo);
          }
        }
        return [baseRows.map(r => ({
          ...r,
          guard_name: userMapById.get(Number(r.guard_id)) || userMapByName.get(String(r.guard_name).toLowerCase()) || r.guard_name,
          avatar_photo: avatarMapById.get(Number(r.guard_id)) || avatarMapByName.get(String(r.guard_name).toLowerCase()) || r.avatar_photo || null
        }))];
      } catch (_) {
        return [baseRows];
      }
    });

    let logsList = [...rows];

    // Sertakan data pelaporan penangguhan (round suspensions) jika ada
    try {
      let suspQueryParams = [];
      let suspDateFilter = "";
      if (all_data !== 'true') {
        const today = new Date().toISOString().split('T')[0];
        const fromDate = from_date || today;
        const toDate = to_date || today;
        suspDateFilter = "WHERE (work_date BETWEEN ? AND ? OR DATE(created_at) BETWEEN ? AND ?)";
        suspQueryParams.push(fromDate, toDate, fromDate, toDate);
      }

      const [suspensions] = await dbPool.query(`
        SELECT 
          id,
          work_date,
          shift,
          round_number,
          reason_notes,
          evidence_photo,
          reported_by_id,
          reported_by_name,
          created_at
        FROM security_patrol_round_suspensions
        ${suspDateFilter}
        ORDER BY created_at DESC
        LIMIT 200
      `, suspQueryParams);

      if (suspensions.length > 0) {
        // Ambil total master stations untuk perhitungan persentase/progress
        const [stCount] = await dbPool.query('SELECT COUNT(*) as total FROM security_stations WHERE is_active = 1');
        const masterCount = stCount.length > 0 ? Number(stCount[0].total) : 24;

        // Ambil avatar pelapor dari user table
        let userAvatarMap = new Map();
        try {
          const [uRows] = await dbMainPool.query('SELECT id, avatar_photo FROM users');
          for (const u of uRows) {
            if (u.avatar_photo) userAvatarMap.set(Number(u.id), u.avatar_photo);
          }
        } catch (_) {}

        for (const s of suspensions) {
          logsList.push({
            id: `susp-${s.id}`,
            session_id: null,
            checkpoint_code: 'SUSPENDED',
            station_name: `[Penangguhan Patroli] ${s.reason_notes || 'Tersuspensi'}`,
            verification_photo: s.evidence_photo || null,
            photo_path: s.evidence_photo || null,
            notes: s.reason_notes || 'Patroli ditangguhkan',
            status: 'suspended',
            is_suspended: true,
            reason_notes: s.reason_notes,
            evidence_photo: s.evidence_photo,
            verified_at: s.created_at,
            created_at: s.created_at,
            latitude: null,
            longitude: null,
            guard_id: s.reported_by_id,
            guard_name: s.reported_by_name || 'Security Officer',
            avatar_photo: userAvatarMap.get(Number(s.reported_by_id)) || null,
            started_at: s.created_at,
            completed_at: s.created_at,
            shift: s.shift,
            round_number: s.round_number,
            checkpoint_order: 0,
            session_total_scanned: 0,
            total_master_stations: masterCount
          });
        }

        // Urutkan ulang secara kronologis menurun
        logsList.sort((a, b) => new Date(b.verified_at || b.created_at) - new Date(a.verified_at || a.created_at));
      }
    } catch (suspErr) {
      console.error('Error fetching suspensions for logs:', suspErr);
    }

    res.json(logsList);
  } catch (error) {
    console.error('Error fetching patrol logs history:', error);
    res.status(500).json({ error: 'Failed to fetch patrol logs history' });
  }
});

/**
 * POST /api/security/patrol/sessions/start
 * Start a new patrol session from mobile app
 */
router.post('/sessions/start', async (req, res) => {
  const user_id = req.body.user_id || req.body.guard_id;
  const shift = req.body.shift;
  const initial_lat = req.body.initial_lat;
  const initial_lng = req.body.initial_lng;
  let guard_name = req.body.guard_name;
  
  if (!user_id || !shift) {
    return res.status(400).json({ error: 'user_id and shift are required' });
  }
  
  try {
    let full_name = 'Security Officer';
    let avatar_photo = req.body.avatar_photo || null;
    try {
      const [uMain] = await dbMainPool.query('SELECT username, full_name, avatar_photo FROM users WHERE id = ?', [user_id]);
      if (uMain && uMain.length > 0) {
        full_name = uMain[0].full_name || guard_name || uMain[0].username;
        guard_name = full_name;
        if (!avatar_photo && uMain[0].avatar_photo) {
          avatar_photo = uMain[0].avatar_photo;
        }
      } else {
        const [userRows] = await dbPool.query('SELECT name, fullName, avatar_photo FROM security_guards_status WHERE user_id = ?', [user_id]);
        if (userRows.length > 0) {
          guard_name = userRows[0].fullName || userRows[0].name || guard_name;
          full_name = guard_name;
          if (!avatar_photo && userRows[0].avatar_photo) {
            avatar_photo = userRows[0].avatar_photo;
          }
        } else {
          if (!guard_name) guard_name = `Guard-${user_id}`;
          full_name = guard_name;
        }
      }
    } catch (err) {
      if (!guard_name) guard_name = `Guard-${user_id}`;
      full_name = guard_name;
    }

    // Hitung Auto Shift, Work Date, dan Round Number secara presisi dari jam server saat ini
    const autoShiftInfo = calculateAutoShift(new Date());
    const finalShift = autoShiftInfo.shift;
    const workDate = autoShiftInfo.work_date;
    const roundNum = autoShiftInfo.round_number;

    // 🔒 CEK KUNCIAN PUTARAN: Jika ronde ini sedang ditutup/terkendala, tolak pembuatan sesi untuk seluruh tim
    const [suspensionRows] = await dbPool.query(
      "SELECT * FROM security_patrol_round_suspensions WHERE work_date = ? AND shift = ? AND round_number = ? LIMIT 1",
      [workDate, finalShift, roundNum]
    );
    if (suspensionRows.length > 0) {
      const sus = suspensionRows[0];
      return res.status(403).json({
        error: `Ronde Ditutup: ${finalShift} Putaran ke-${roundNum} tidak dapat dipatroli karena ada kendala lapangan.`,
        is_suspended: true,
        suspension: sus
      });
    }

    // Auto-close any previous active session for this guard to maintain clean single-session lifecycle
    await dbPool.query(
      "UPDATE security_patrol_sessions SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE guard_id = ? AND status = 'active'",
      [user_id]
    );

    const session_code = `PTR-${Date.now()}`;
    const [result] = await dbPool.query(
      "INSERT INTO security_patrol_sessions (session_code, guard_id, guard_name, shift, work_date, round_number, status, avatar_photo, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id",
      [session_code, user_id, guard_name, finalShift, workDate, roundNum, avatar_photo]
    );

    const newSessionId = result.insertId || (result.length > 0 && result[0].id) || 0;
    
    // Clear Kalman filter cache for this session if any
    sessionKalmanMap.delete(newSessionId);

    // Update guard status: Reset to NULL unless initial_lat & initial_lng are provided for the NEW patrol
    try {
        if (initial_lat && initial_lng) {
            const initLatNum = parseFloat(initial_lat);
            const initLngNum = parseFloat(initial_lng);
            
            await dbPool.query(
              "INSERT INTO security_guards_status (user_id, name, fullName, status, latitude, longitude, avatar_photo, last_update) VALUES (?, ?, ?, 'active', ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET status='active', latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, avatar_photo=COALESCE(EXCLUDED.avatar_photo, security_guards_status.avatar_photo), last_update=CURRENT_TIMESTAMP",
              [user_id, guard_name, full_name, initLatNum, initLngNum, avatar_photo]
            );

            // Simpan sebagai titik PERTAMA di tracks untuk sesi baru ini
            await dbPool.query(
              'INSERT INTO security_patrol_tracks (session_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
              [newSessionId, initLatNum, initLngNum]
            );
        } else {
            // Jika belum ada koordinat saat tekan start: RESET lat & lng ke NULL agar tidak memakai lokasi sesi lama!
            await dbPool.query(
              "INSERT INTO security_guards_status (user_id, name, fullName, status, latitude, longitude, avatar_photo, last_update) VALUES (?, ?, ?, 'active', NULL, NULL, ?, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET status='active', latitude=NULL, longitude=NULL, avatar_photo=COALESCE(EXCLUDED.avatar_photo, security_guards_status.avatar_photo), last_update=CURRENT_TIMESTAMP",
              [user_id, guard_name, full_name, avatar_photo]
            );
        }
    } catch (e) {
        console.error('Error resetting/updating guard status on session start:', e);
    }

    res.status(201).json({ success: true, session_id: newSessionId, session_code, message: 'Patrol session started' });
  } catch (error) {
    console.error('Error starting patrol session:', error);
    res.status(500).json({ error: 'Failed to start patrol session' });
  }
});

/**
 * POST /api/security/patrol/sessions/end
 * End a patrol session from mobile app
 */
router.post('/sessions/end', async (req, res) => {
  let { session_id } = req.body;
  let guard_id = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.userId) guard_id = decoded.userId;
    } catch (_) {}
  }

  try {
    if (!session_id && guard_id) {
      const [activeSess] = await dbPool.query(
        "SELECT id FROM security_patrol_sessions WHERE guard_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
        [guard_id]
      );
      if (activeSess.length > 0) {
        session_id = activeSess[0].id;
      } else {
        const [anyActive] = await dbPool.query(
          "SELECT id FROM security_patrol_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1"
        );
        if (anyActive.length > 0) {
          session_id = anyActive[0].id;
        }
      }
    }

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required or no active session found' });
    }

    // 1. Set status sesi menjadi completed
    await dbPool.query(
      "UPDATE security_patrol_sessions SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [session_id]
    );

    // 2. Ambil guard_id dan reset status guard di security_guards_status
    const [sess] = await dbPool.query('SELECT guard_id FROM security_patrol_sessions WHERE id = ?', [session_id]);
    if (sess.length > 0) {
      const gId = sess[0].guard_id;
      await dbPool.query(
        "UPDATE security_guards_status SET status = 'standby', latitude = NULL, longitude = NULL, last_update = CURRENT_TIMESTAMP WHERE user_id = ?",
        [gId]
      );
    }

    res.json({ success: true, message: 'Patrol session ended' });
  } catch (error) {
    console.error('Error ending patrol session:', error);
    res.status(500).json({ error: 'Failed to end patrol session: ' + error.message });
  }
});

/**
 * GET /api/security/patrol/rounds/status
 * Check if the current round (or requested work_date, shift, round_number) is suspended
 */
router.get('/rounds/status', async (req, res) => {
  try {
    const autoShiftInfo = calculateAutoShift(new Date());
    const work_date = req.query.work_date || autoShiftInfo.work_date;
    const shift = req.query.shift || autoShiftInfo.shift;
    const round_number = parseInt(req.query.round_number || autoShiftInfo.round_number);

    const [rows] = await dbPool.query(
      'SELECT * FROM security_patrol_round_suspensions WHERE work_date = ? AND shift = ? AND round_number = ? LIMIT 1',
      [work_date, shift, round_number]
    );

    if (rows.length > 0) {
      return res.json({
        is_suspended: true,
        suspension: rows[0],
        shift,
        round_number,
        work_date
      });
    }

    res.json({
      is_suspended: false,
      suspension: null,
      shift,
      round_number,
      work_date
    });
  } catch (error) {
    console.error('Error checking round status:', error);
    res.status(500).json({ error: 'Failed to check round status: ' + error.message });
  }
});

/**
 * POST /api/security/patrol/rounds/suspend
 * Report field obstacle/issue for the current round, locking patrol for all guards
 */
router.post('/rounds/suspend', async (req, res) => {
  let guard_id = req.body.guard_id || req.body.user_id;
  let guard_name = req.body.guard_name || 'Security Officer';
  const reason_notes = (req.body.reason_notes || '').trim();
  const evidence_photo = req.body.evidence_photo || req.body.photo_path || null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.userId || decoded.id)) guard_id = decoded.userId || decoded.id;
    } catch (_) {}
  }

  if (!guard_id) {
    return res.status(401).json({ error: 'Unauthorized: Guard ID is required' });
  }
  if (!reason_notes) {
    return res.status(400).json({ error: 'Keterangan kendala lapangan (reason_notes) wajib diisi' });
  }
  if (!evidence_photo) {
    return res.status(400).json({ error: 'Foto bukti kamera langsung (evidence_photo) wajib dilampirkan' });
  }

  try {
    // Resolve user real full name
    try {
      const [uMain] = await dbMainPool.query('SELECT full_name, username FROM users WHERE id = ?', [guard_id]);
      if (uMain && uMain.length > 0) {
        guard_name = uMain[0].full_name || uMain[0].username || guard_name;
      }
    } catch (_) {}

    const autoShiftInfo = calculateAutoShift(new Date());
    const finalShift = req.body.shift || autoShiftInfo.shift;
    const workDate = req.body.work_date || autoShiftInfo.work_date;
    const roundNum = parseInt(req.body.round_number || autoShiftInfo.round_number);

    // Auto-close any active sessions for all guards in this round since it is now suspended
    await dbPool.query(
      "UPDATE security_patrol_sessions SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE status = 'active' AND work_date = ? AND shift = ? AND round_number = ?",
      [workDate, finalShift, roundNum]
    );

    // Insert suspension record (ON CONFLICT DO UPDATE)
    const [result] = await dbPool.query(`
      INSERT INTO security_patrol_round_suspensions 
        (work_date, shift, round_number, reason_notes, evidence_photo, reported_by_id, reported_by_name, created_at)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (work_date, shift, round_number)
      DO UPDATE SET 
        reason_notes = EXCLUDED.reason_notes,
        evidence_photo = EXCLUDED.evidence_photo,
        reported_by_id = EXCLUDED.reported_by_id,
        reported_by_name = EXCLUDED.reported_by_name,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [workDate, finalShift, roundNum, reason_notes, evidence_photo, guard_id, guard_name]);

    const savedSuspension = result.length > 0 ? result[0] : null;

    // Broadcast WebSocket event agar web dashboard & mobile guards langsung update tanpa reload
    broadcastPatrolEvent('patrol_round_suspended', {
      work_date: workDate,
      shift: finalShift,
      round_number: roundNum,
      suspension: savedSuspension
    });

    res.json({
      success: true,
      message: `Ronde ke-${roundNum} (${finalShift}) berhasil ditutup dengan keterangan kendala lapangan.`,
      suspension: savedSuspension
    });
  } catch (error) {
    console.error('Error suspending patrol round:', error);
    res.status(500).json({ error: 'Gagal menutup ronde patroli: ' + error.message });
  }
});

/**
 * POST /api/security/patrol/checkpoints
 * Submit a checkpoint (photo/location) from mobile app
 */
router.post('/checkpoints', async (req, res) => {
  console.log('[DEBUG] Incoming POST /checkpoints body:', req.body);
  
  let guard_id = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
          // Lenient decode to avoid 'expired token' blocking the checkpoint submission
          const decoded = jwt.decode(token);
          if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
              guard_id = decoded.userId || decoded.id || decoded.sub;
          }

      } catch (e) {
          // Ignore decode errors
      }
  }
  
  let session_id = req.body.session_id;
  
  try {
      if (guard_id) {
          // 1. Prioritize active session for this guard
          const [activeSessions] = await dbPool.query(
              "SELECT id FROM security_patrol_sessions WHERE guard_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1", 
              [guard_id]
          );
          
          if (activeSessions.length > 0) {
              session_id = activeSessions[0].id;
          } else if (session_id) {
              // Verify requested session_id exists
              const [reqSession] = await dbPool.query(
                  "SELECT id, status FROM security_patrol_sessions WHERE id = ?",
                  [session_id]
              );
              if (reqSession.length === 0) {
                  // Fallback: check any active session in system
                  const [anyActive] = await dbPool.query(
                      "SELECT id FROM security_patrol_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1"
                  );
                  if (anyActive.length > 0) {
                      session_id = anyActive[0].id;
                  }
              }
          } else {
              // Fallback if no session_id provided: check any active session
              const [anyActive] = await dbPool.query(
                  "SELECT id FROM security_patrol_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1"
              );
              if (anyActive.length > 0) {
                  session_id = anyActive[0].id;
              }
          }
      }
  } catch (err) {
      console.error('[DEBUG] Auto-correct session failed:', err);
  }
      
  let latitude = req.body.latitude;
  let longitude = req.body.longitude;
  const station_id = req.body.station_id || null;
  const checkpoint_code = req.body.checkpoint_code || null;
  const gps_accuracy = req.body.gps_accuracy || null;
  
  const station_name = (req.body.station_name || req.body.notes || '').trim();
  const verification_photo = req.body.photo_path || req.body.verification_photo;
  const verification_notes = req.body.notes || req.body.verification_notes;
  
  if (!session_id || !latitude || !longitude || !station_name) {
    // LOG IT TO FILE SO I CAN SEE WHY IT FAILED
    const fs = await import('fs');
    fs.appendFileSync('failed_checkpoints_log.txt', JSON.stringify(req.body) + '\n');
    return res.status(400).json({ error: 'session_id, station_name (or notes), latitude, and longitude are required' });
  }
  
  try {
    // === SEQUENCE VALIDATION LOGIC ===
    const [masterCheckpoints] = await dbPool.query("SELECT * FROM security_stations WHERE is_active = 1 ORDER BY sequence_order ASC, id ASC");
    
    const reqNameLower = station_name.toLowerCase().trim();
    const reqCodeLower = (checkpoint_code || '').toLowerCase().trim();

    // Validasi apakah CP ini terdaftar di master
    const isValidMasterCP = masterCheckpoints.find(mc => {
      const mcCode = (mc.checkpoint_code || '').toLowerCase().trim();
      const mcLabel = (mc.label || '').toLowerCase().trim();
      const mcKey = (mc.station_key || '').toLowerCase().trim();
      return (reqCodeLower && mcCode === reqCodeLower) ||
             mcLabel === reqNameLower ||
             mcKey === reqNameLower;
    });
    
    if (isValidMasterCP) {
        // Ambil CP yang sudah di-scan di sesi ini
        const [scannedCheckpoints] = await dbPool.query("SELECT checkpoint_code, station_name FROM security_session_checkpoints WHERE session_id = ? ORDER BY verified_at ASC", [session_id]);
        
        // Ambil set station master yang sudah diverifikasi di sesi ini
        const scannedLabels = new Set(scannedCheckpoints.map(sc => (sc.station_name || '').toLowerCase().trim()));
        const scannedCodes = new Set(scannedCheckpoints.map(sc => (sc.checkpoint_code || '').toLowerCase().trim()));

        // Tentukan expected checkpoint berikutnya berdasarkan urutan master yang belum di-scan
        const unverifiedMasters = masterCheckpoints.filter(mc => {
            const mcLabel = (mc.label || '').toLowerCase().trim();
            const mcCode = (mc.checkpoint_code || '').toLowerCase().trim();
            return !scannedLabels.has(mcLabel) && (!mcCode || !scannedCodes.has(mcCode));
        });

        if (unverifiedMasters.length > 0) {
            const expectedCheckpoint = unverifiedMasters[0];
            const expLabel = (expectedCheckpoint.label || '').toLowerCase().trim();
            const expCode = (expectedCheckpoint.checkpoint_code || '').toLowerCase().trim();
            const expKey = (expectedCheckpoint.station_key || '').toLowerCase().trim();
            
            // Validasi urutan beruntun
            const isMatchExpected = (reqCodeLower && reqCodeLower === expCode) ||
                                    reqNameLower === expLabel ||
                                    reqNameLower === expKey;

            if (!isMatchExpected) {
                return res.status(400).json({ error: `Beruntun Patroli Gagal: Anda harus scan Checkpoint urutan ke-${expectedCheckpoint.sequence_order || (masterCheckpoints.length - unverifiedMasters.length + 1)} (${expectedCheckpoint.label}) terlebih dahulu!` });
            }

            // Validasi Radius (Dispensasi Jarak)
            const maxRadius = expectedCheckpoint.radius_meters || 30; // Default 30 meter jika NULL
            if (expectedCheckpoint.latitude && expectedCheckpoint.longitude) {
                const distance = calculateDistanceMeters(
                    parseFloat(latitude), 
                    parseFloat(longitude), 
                    parseFloat(expectedCheckpoint.latitude), 
                    parseFloat(expectedCheckpoint.longitude)
                );
                
                if (distance > maxRadius) {
                    return res.status(400).json({ error: `Gagal: Anda berada di luar radius area pos! (Jarak Anda ${distance}m, Maksimal ${maxRadius}m)` });
                }
            }
        } else {
            return res.status(400).json({ error: 'Beruntun Patroli Gagal: Semua checkpoint sudah di-scan untuk ronde ini.' });
        }
    }
    // ===================================

    const [result] = await dbPool.query(
      "INSERT INTO security_session_checkpoints (session_id, checkpoint_code, station_name, status, verified_at, verification_photo, verification_notes, latitude, longitude, gps_accuracy) VALUES (?, ?, ?, 'verified', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)",
      [session_id, checkpoint_code, station_name, verification_photo || null, verification_notes || null, latitude, longitude, gps_accuracy]
    );

    // 🚀 AUTOMATIC ANOMALY INCIDENT ROUTING: If notes exist (finding recorded during patrol checkpoint),
    // automatically generate an Incident Report for Operator Validation & Maintenance Ticketing!
    let guard_name = 'Security Officer';
    if (verification_notes && verification_notes.trim().length > 0 && !verification_notes.trim().startsWith('Checkpoint:')) {
      try {
        if (guard_id) {
          try {
            const [uRows] = await dbPool.query('SELECT name, fullName FROM security_guards_status WHERE user_id = ?', [guard_id]);
            if (uRows.length > 0 && uRows[0].name) guard_name = uRows[0].name;
          } catch (_) {}
        }

        const incCode = `INC-${Date.now()}`;
        
        // 1. Resolve dynamic station slug from agrovision_config.station_registry
        let station_slug = station_name.toLowerCase().replace(/\s+/g, '-');
        let regRows = [];
        try {
          const [rows] = await dbPool.query('SELECT slug, title FROM agrovision_config.station_registry WHERE title = ? OR slug = ?', [station_name, station_name]);
          regRows = rows;
          if (regRows.length > 0) station_slug = regRows[0].slug;
        } catch (err) {
          console.error('[INCIDENT ROUTER] Error resolving station slug:', err);
        }

        // Read priority from request body (default to MEDIUM if not specified or invalid)
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        let reqPriority = (req.body.priority || 'MEDIUM').toUpperCase();
        if (!validPriorities.includes(reqPriority)) reqPriority = 'MEDIUM';

        // 2. Save incident ticket to database using the resolved slug and selected priority
        await dbPool.query(
          `INSERT INTO security_incidents 
           (incident_code, incident_type, location, reported_by, reported_by_name, status, priority, description, photo_path, reported_at, created_at, updated_at) 
           VALUES (?, 'Patrol Anomaly Finding', ?, ?, ?, 'SUBMITTED', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [incCode, station_slug, guard_id || 1, guard_name, reqPriority, verification_notes.trim(), verification_photo || null]
        );
        console.log(`[INCIDENT ROUTER] Auto-created incident ticket ${incCode} [Priority: ${reqPriority}] for station slug: ${station_slug}`);

        // 3. Broadcast WebSocket incident_created event with full payload
        const http = await import('http');
        const incidentPayload = {
          id: incCode,
          incident_code: incCode,
          incident_type: 'Patrol Anomaly Finding',
          location: station_slug,
          station_name: station_name,
          reported_by: guard_id || 1,
          reported_by_name: guard_name,
          status: 'SUBMITTED',
          priority: reqPriority,
          description: verification_notes.trim(),
          photo_path: verification_photo || null,
          created_at: new Date().toISOString()
        };

        const sendWs = (evt, dataObj) => {
          const postData = JSON.stringify({ event: evt, data: dataObj });
          const postReq = http.request('http://localhost:3200/api/maintenance/notify-ticket', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          });
          postReq.on('error', (err) => console.error(`[INCIDENT ROUTER] WS Broadcast error (${evt}):`, err.message));
          postReq.write(postData);
          postReq.end();
        };

        sendWs('incident_created', incidentPayload);
        sendWs('ticket_created', {
          id: incCode,
          ticketNumber: incCode,
          station: station_slug,
          priority: reqPriority,
          status: 'pending',
          equipment: 'Patrol Anomaly'
        });

        // 4. FCM tokens dispatch (optional)
        try {
          console.log(`[INCIDENT ROUTER] Incident ticket ${incCode} registered successfully`);
        } catch (fcmErr) {
          console.error('[INCIDENT ROUTER] FCM dispatch error:', fcmErr);
        }

      } catch (incErr) {
        console.error('[INCIDENT ROUTER] Error auto-creating incident ticket:', incErr);
      }
    }
    
    // Auto update guard status location (use UPSERT with subquery for user_id)
    try {
        let guard_name = 'security1';
        let full_name = 'Security Officer';
        if (guard_id) {
          try {
            const [uRows] = await dbPool.query('SELECT name, fullName FROM security_guards_status WHERE user_id = ?', [guard_id]);
            if (uRows.length > 0) {
              guard_name = uRows[0].name || guard_name;
              full_name = uRows[0].fullName || uRows[0].name || full_name;
            }
          } catch (_) {}
        }
        await dbPool.query(`
          INSERT INTO security_guards_status (user_id, name, fullName, status, latitude, longitude, last_update) 
          VALUES (?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id) DO UPDATE SET status='active', latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, last_update=CURRENT_TIMESTAMP
        `, [guard_id, guard_name, full_name, latitude, longitude]);
    } catch (e) {
        console.error('Error updating guard status location:', e);
    }
    
    res.status(201).json({
      success: true,
      checkpoint_id: result.insertId,
      message: 'Checkpoint submitted successfully',
      data: {
        id: result.insertId,
        session_id: session_id,
        station_id: station_id,
        status: "verified",
        verified_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error submitting checkpoint:', error);
    res.status(500).json({ error: 'Failed to submit checkpoint' });
  }
});

/**
 * POST /api/security/patrol/location
 * Submit live GPS tracking ping from mobile app
 */
// 🛡️ Kalman Filter 2D untuk Backend (Server-Side Smoothing)
class KalmanFilter2D {
    constructor(processNoise = 0.00001, measurementNoise = 0.00008) {
        this.q = processNoise;
        this.r = measurementNoise;
        this.lat = null;
        this.lng = null;
        this.pLat = 1;
        this.pLng = 1;
    }

    filter(lat, lng) {
        if (this.lat === null || this.lng === null) {
            this.lat = lat;
            this.lng = lng;
            return [lat, lng];
        }

        this.pLat = this.pLat + this.q;
        this.pLng = this.pLng + this.q;

        const kLat = this.pLat / (this.pLat + this.r);
        const kLng = this.pLng / (this.pLng + this.r);

        this.lat = this.lat + kLat * (lat - this.lat);
        this.lng = this.lng + kLng * (lng - this.lng);

        this.pLat = (1 - kLat) * this.pLat;
        this.pLng = (1 - kLng) * this.pLng;

        return [this.lat, this.lng];
    }
}

// In-memory Kalman instances per session
const sessionKalmanMap = new Map();

// Helper Haversine Formula (Meter)
function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.post('/location', async (req, res) => {
  const { session_id, latitude, longitude, gps_accuracy } = req.body;
  if (!session_id || !latitude || !longitude) {
    return res.status(400).json({ error: 'session_id, latitude, and longitude are required' });
  }

  // 1. Inisialisasi atau ambil Kalman Filter untuk session ini
  if (!sessionKalmanMap.has(session_id)) {
      sessionKalmanMap.set(session_id, new KalmanFilter2D());
  }
  const kalman = sessionKalmanMap.get(session_id);

  let lat = parseFloat(latitude);
  let lng = parseFloat(longitude);
  const accuracy = gps_accuracy ? parseFloat(gps_accuracy) : null;
  let shouldSaveToTrack = true;

  try {
    // Cek apakah ini ping pertama untuk session ini
    const [lastLog] = await dbPool.query(
      "SELECT latitude, longitude FROM security_patrol_tracks WHERE session_id = ? ORDER BY id DESC LIMIT 1",
      [session_id]
    );
    const isFirstPing = !lastLog || lastLog.length === 0;

    if (accuracy !== null && accuracy > 18.0) {
      // Abaikan titik dengan akurasi buruk (> 18m) dari penyimpanan lintasan
      shouldSaveToTrack = false;
    }

    if (!isFirstPing && shouldSaveToTrack) {
      const prevLat = parseFloat(lastLog[0].latitude);
      const prevLng = parseFloat(lastLog[0].longitude);
      const distance = calculateHaversine(prevLat, prevLng, lat, lng);

      // 🛡️ 1. Filter getaran stasioner saat motor berhenti di checkpoint / pos (< 3.5m)
      const isStationaryJitter = distance < 3.5;

      // 🛡️ 2. Filter lompatan teleportasi tak wajar (> 75m)
      const isImpossibleJump = distance > 75.0;

      if (isStationaryJitter || isImpossibleJump) {
        shouldSaveToTrack = false;
      }
    }

    if (shouldSaveToTrack) {
      await dbPool.query(
        'INSERT INTO security_patrol_tracks (session_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [session_id, lat, lng]
      );
    }

    // Selalu update guard status/posisi avatar (bahkan jika track di-skip)
    // sehingga icon security SELALU muncul di peta
    const [sessions] = await dbPool.query('SELECT guard_id, guard_name, avatar_photo FROM security_patrol_sessions WHERE id = ?', [session_id]);
    if (sessions.length > 0) {
       const guard_id = sessions[0].guard_id;
       const guard_name = sessions[0].guard_name || 'Security Officer';
       let avatar_photo = req.body.avatar_photo || sessions[0].avatar_photo || null;
       let full_name = guard_name;
        try {
            const [userRows] = await dbPool.query('SELECT fullName, name, avatar_photo FROM security_guards_status WHERE user_id = ?', [guard_id]);
            if (userRows.length > 0) {
                if (userRows[0].fullName || userRows[0].name) {
                    full_name = userRows[0].fullName || userRows[0].name;
                }
                if (!avatar_photo && userRows[0].avatar_photo) {
                    avatar_photo = userRows[0].avatar_photo;
                }
            }
        } catch (_) {}
       
       await dbPool.query(`
          INSERT INTO security_guards_status (user_id, name, fullName, status, latitude, longitude, avatar_photo, last_update) 
          VALUES (?, ?, ?, 'active', ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id) DO UPDATE SET 
            status='active', 
            latitude=EXCLUDED.latitude, 
            longitude=EXCLUDED.longitude, 
            avatar_photo=COALESCE(EXCLUDED.avatar_photo, security_guards_status.avatar_photo),
            last_update=CURRENT_TIMESTAMP
        `, [guard_id, guard_name, full_name, lat, lng, avatar_photo]);

       // ⚡ Broadcast live guard position to Web Posko Map via WebSocket
       broadcastPatrolEvent('guard_location_updated', {
         session_id: parseInt(session_id, 10),
         guard_id: guard_id,
         name: full_name,
         latitude: lat,
         longitude: lng,
         avatar_photo: avatar_photo,
         saved_to_track: shouldSaveToTrack
       });
    }

    res.status(201).json({ success: true, message: shouldSaveToTrack ? 'Location track recorded' : 'Guard position updated (track filtered)' });
  } catch (error) {
    console.error('Error recording location track:', error);
    res.status(500).json({ error: 'Failed to record location' });
  }
});

/**
 * GET /api/security/patrol/tracks
 * Fetch live GPS tracking breadcrumbs for all active sessions
 */
router.get('/tracks', async (req, res) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT t.session_id, t.latitude, t.longitude, t.recorded_at
      FROM security_patrol_tracks t
      JOIN security_patrol_sessions s ON t.session_id = s.id
      WHERE s.status = 'active' AND s.started_at >= ?
      ORDER BY t.session_id, t.recorded_at ASC
    `, [getShiftStartTimeStr()]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

const getReplayHandler = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const parsedId = parseInt(sessionId, 10);
    const queryId = !isNaN(parsedId) ? parsedId : sessionId;

    // Get session info (support integer id OR string session_code)
    const [sessions] = await dbPool.query(
      'SELECT id, guard_id, guard_name, status, started_at, completed_at, avatar_photo FROM security_patrol_sessions WHERE id = ? OR session_code = ? ORDER BY id DESC LIMIT 1',
      [queryId, String(sessionId)]
    );
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionObj = { ...sessions[0] };
    try {
      let resolvedAvatar = sessionObj.avatar_photo || null;
      if (sessionObj.guard_id) {
        const [uMain] = await dbMainPool.query('SELECT avatar_photo, full_name FROM users WHERE id = ?', [sessionObj.guard_id]);
        if (uMain && uMain.length > 0) {
          if (uMain[0].avatar_photo) resolvedAvatar = uMain[0].avatar_photo;
          if (uMain[0].full_name) sessionObj.guard_name = uMain[0].full_name;
        }
      }
      sessionObj.avatar_photo = resolvedAvatar;
      sessionObj.photo = resolvedAvatar;
    } catch (_) {}

    const realSessionId = sessionObj.id;

    // Get all GPS tracks for this session
    let [tracks] = await dbPool.query(
      'SELECT latitude, longitude, recorded_at FROM security_patrol_tracks WHERE session_id = ? ORDER BY recorded_at ASC',
      [realSessionId]
    );

    // Get all checkpoints for this session
    const [checkpoints] = await dbPool.query(
      'SELECT id, checkpoint_code, station_name, latitude, longitude, verified_at, verification_photo FROM security_session_checkpoints WHERE session_id = ? ORDER BY verified_at ASC',
      [realSessionId]
    );

    // 🛡️ Smart Fallback: Jika session offline dan tracks GPS kosong, gunakan checkpoints sebagai rute tracking replay!
    if ((!tracks || tracks.length === 0) && checkpoints.length > 0) {
      tracks = checkpoints
        .filter(cp => cp.latitude && cp.longitude)
        .map(cp => ({
          latitude: cp.latitude,
          longitude: cp.longitude,
          recorded_at: cp.verified_at
        }));
    }

    res.json({
      session: sessionObj,
      tracks,
      checkpoints
    });
  } catch (error) {
    console.error('Error fetching replay data:', error);
    res.status(500).json({ error: 'Failed to fetch replay data' });
  }
};

router.get('/replay/:sessionId', getReplayHandler);
router.get('/sessions/:sessionId/replay', getReplayHandler);

/**
 * POST /api/security/patrol/tracks/batch
 * Menerima batch titik GPS track dari mobile app (terutama saat sync offline)
 */
router.post('/tracks/batch', async (req, res) => {
  const { session_id, tracks } = req.body;
  if (!session_id || !Array.isArray(tracks) || tracks.length === 0) {
    return res.status(400).json({ error: 'session_id and tracks array are required' });
  }

  try {
    const validRows = [];
    for (const t of tracks) {
      const lat = parseFloat(t.latitude);
      const lng = parseFloat(t.longitude);
      const recordedAt = t.recorded_at || t.timestamp || new Date().toISOString();
      if (!isNaN(lat) && !isNaN(lng)) {
        validRows.push([session_id, lat, lng, recordedAt]);
      }
    }

    if (validRows.length > 0) {
      const placeholders = validRows.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
      await dbPool.query(
        `INSERT INTO security_patrol_tracks (session_id, latitude, longitude, recorded_at) VALUES ${placeholders}`,
        validRows.flat()
      );
    }

    res.json({ success: true, count: validRows.length });
  } catch (error) {
    console.error('Error saving batch tracks:', error);
    res.status(500).json({ error: 'Failed to save batch tracks' });
  }
});

/**
 * GET /api/security/patrol/history
 * Fetch today's patrol sessions for the sidebar (active + completed)
 */
router.get('/history', async (req, res) => {
  try {
    const [baseRows] = await dbPool.query(`
      SELECT 
        s.id, s.guard_id, s.guard_name, s.status, s.started_at, s.completed_at, s.shift, s.round_number, s.avatar_photo,
        (SELECT COUNT(*) FROM security_session_checkpoints c WHERE c.session_id = s.id) as checkpoint_count,
        (SELECT STRING_AGG(DISTINCT c.station_name, ', ') FROM security_session_checkpoints c WHERE c.session_id = s.id) as checkpoint_names,
        (SELECT COUNT(*) FROM security_patrol_tracks t WHERE t.session_id = s.id) as track_count
      FROM security_patrol_sessions s
      WHERE s.started_at >= ?
      ORDER BY s.started_at DESC
    `, [getShiftStartTimeStr()]);

    let finalRows = baseRows;
    try {
      const [userRows] = await dbMainPool.query('SELECT id, username, full_name, avatar_photo FROM users');
      const userMapById = new Map();
      const userMapByName = new Map();
      const avatarMapById = new Map();
      const avatarMapByName = new Map();
      for (const u of userRows) {
        if (u.full_name) {
          userMapById.set(Number(u.id), u.full_name);
          userMapByName.set(String(u.username).toLowerCase(), u.full_name);
        }
        if (u.avatar_photo) {
          avatarMapById.set(Number(u.id), u.avatar_photo);
          avatarMapByName.set(String(u.username).toLowerCase(), u.avatar_photo);
        }
      }
      finalRows = baseRows.map(r => ({
        ...r,
        guard_name: userMapById.get(Number(r.guard_id)) || userMapByName.get(String(r.guard_name).toLowerCase()) || r.guard_name,
        avatar_photo: avatarMapById.get(Number(r.guard_id)) || avatarMapByName.get(String(r.guard_name).toLowerCase()) || r.avatar_photo || null
      }));
    } catch (_) {}

    res.json(finalRows);
  } catch (error) {
    console.error('Error fetching patrol history:', error);
    res.status(500).json({ error: 'Failed to fetch patrol history' });
  }
});

/**
 * GET /api/security/patrol/stations
 * Fetch all defined factory stations with their coordinates
 */
router.get('/stations', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM security_stations WHERE is_active = 1 ORDER BY sequence_order ASC, id ASC');
    const mappedRows = rows.map(r => ({ ...r, station_name: r.label || r.station_name || r.checkpoint_code }));
    res.json(mappedRows);
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

/**
 * GET /api/security/patrol/map-image
 * Provide the map image to the mobile app
 */
router.get('/map-image', (req, res) => {
  const imagePath = path.join(__dirname, '../../../frontend/assets/skl.webp');
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: 'Map image not found' });
  }
});

/**
 * GET /api/security/patrol/debug-gps
 * Debug endpoint: cek status GPS ping semua sesi aktif hari ini
 */
router.get('/debug-gps', async (req, res) => {
  try {
    const [sessions] = await dbPool.query(`
      SELECT 
        s.id as session_id,
        s.guard_name,
        s.guard_id,
        s.status,
        s.started_at,
        (SELECT COUNT(*) FROM security_patrol_tracks t WHERE t.session_id = s.id) as total_pings,
        (SELECT latitude FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_track_lat,
        (SELECT longitude FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_track_lng,
        (SELECT recorded_at FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_ping_time,
        gs.latitude as status_lat,
        gs.longitude as status_lng,
        gs.last_update as status_last_update
      FROM security_patrol_sessions s
      LEFT JOIN security_guards_status gs ON gs.user_id = s.guard_id
      WHERE s.status = 'active' AND s.started_at >= ?
      ORDER BY s.started_at DESC
    `, [getShiftStartTimeStr()]);

    const result = sessions.map(s => ({
      session_id: s.session_id,
      guard_name: s.guard_name,
      started_at: s.started_at,
      total_gps_pings: s.total_pings,
      last_ping_time: s.last_ping_time,
      has_track_data: !!(s.last_track_lat && s.last_track_lng),
      last_track_position: s.last_track_lat ? `${s.last_track_lat}, ${s.last_track_lng}` : 'BELUM ADA',
      has_status_position: !!(s.status_lat && s.status_lng),
      status_position: s.status_lat ? `${s.status_lat}, ${s.status_lng}` : 'NULL',
      diagnosis: s.total_pings === 0
        ? '❌ HP TIDAK MENGIRIM GPS SAMA SEKALI — cek mobile app'
        : (!s.last_track_lat ? '⚠️ Ping masuk tapi difilter semua — akurasi GPS terlalu buruk' : '✅ GPS OK')
    }));

    res.json({ shift_start: getShiftStartTimeStr(), active_sessions: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to broadcast WebSocket events via maintenance-service (Port 3200)
async function broadcastPatrolEvent(event, data) {
  try {
    const http = await import('http');
    const postData = JSON.stringify({ event, data });
    const req = http.request('http://localhost:3200/api/maintenance/notify-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    });
    req.on('error', (err) => console.error('[PATROL WS] Broadcast error:', err.message));
    req.write(postData);
    req.end();
  } catch (err) {
    console.error('[PATROL WS] Broadcast exception:', err);
  }
}

/**
 * POST /api/security/patrol/sync-offline-batch (or /sync-offline-batch)
 * Receive queued offline items (checkpoints, incidents, tracks) from mobile app and process in DB
 */
const syncOfflineBatchHandler = async (req, res) => {
  const { sessions = [], checkpoints = [], incidents = [], tracks = [] } = req.body;
  const synced_ids = [];

  try {
    // Cache for session check / auto-creation to avoid redundant DB queries per item
    const verifiedSessions = new Set();

    // 0. Process explicit Patrol Sessions (START_SESSION & END_SESSION)
    for (const item of sessions) {
      try {
        const { local_id, action, session_id, user_id, guard_id, guard_name, shift, recorded_at } = item;
        const effectiveSessionId = parseInt(session_id, 10) || session_id;
        const gId = guard_id || user_id || 1;
        const gName = guard_name || 'Security Officer';
        const eventTime = recorded_at || new Date().toISOString();

        if (action === 'START_SESSION' || !action) {
          if (effectiveSessionId) {
            const [existing] = await dbPool.query("SELECT id FROM security_patrol_sessions WHERE id = ?", [effectiveSessionId]);
            if (!existing || existing.length === 0) {
              const sCode = `PTR-${effectiveSessionId}`;
              const autoShiftInfo = calculateAutoShift(new Date(eventTime));
              await dbPool.query(
                "INSERT INTO security_patrol_sessions (id, session_code, guard_id, guard_name, shift, work_date, round_number, status, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)",
                [effectiveSessionId, sCode, gId, gName, autoShiftInfo.shift, autoShiftInfo.work_date, autoShiftInfo.round_number, eventTime, eventTime, eventTime]
              );
              console.log(`[SYNC BATCH] Processed START_SESSION: ${effectiveSessionId}`);
              broadcastPatrolEvent('patrol_session_started', {
                id: effectiveSessionId,
                session_code: sCode,
                guard_name: gName,
                started_at: eventTime,
                status: 'active'
              });
            }
            verifiedSessions.add(effectiveSessionId);
          }
        } else if (action === 'END_SESSION') {
          if (effectiveSessionId) {
            await dbPool.query(
              "UPDATE security_patrol_sessions SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ? OR session_code LIKE ?",
              [eventTime, eventTime, effectiveSessionId, `%${effectiveSessionId}%`]
            );
            console.log(`[SYNC BATCH] Processed END_SESSION: ${effectiveSessionId}`);
            broadcastPatrolEvent('patrol_session_ended', {
              id: effectiveSessionId,
              status: 'completed',
              completed_at: eventTime
            });
          }
        }
        if (local_id) synced_ids.push(local_id);
      } catch (err) {
        console.error('[SYNC BATCH] Session error:', err);
      }
    }

    // 1. Process Checkpoints
    for (const item of checkpoints) {
      try {
        const { local_id, session_id, session_code, checkpoint_code, station_name, notes, verification_photo, latitude, longitude, verified_at, gps_accuracy, guard_id, guard_name } = item;
        
        if (session_id && station_name && latitude && longitude) {
          const effectiveSessionId = parseInt(session_id, 10) || session_id;
          
          // Auto-verify and create patrol session if started offline and not exists in DB
          if (!verifiedSessions.has(effectiveSessionId)) {
            const [sessRows] = await dbPool.query(
              "SELECT id FROM security_patrol_sessions WHERE id = ?",
              [effectiveSessionId]
            );

            if (!sessRows || sessRows.length === 0) {
              const sCode = session_code || `OFFLINE-PTR-${effectiveSessionId}`;
              const gId = guard_id || 1;
              const gName = guard_name || 'Security Officer';
              const startTime = verified_at || new Date().toISOString();

              await dbPool.query(
                "INSERT INTO security_patrol_sessions (id, session_code, guard_id, guard_name, shift, status, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'Shift A', 'active', ?, ?, ?)",
                [effectiveSessionId, sCode, gId, gName, startTime, startTime, startTime]
              );
              console.log(`[SYNC BATCH] Auto-created offline patrol session: ${effectiveSessionId} (${sCode})`);
              
              broadcastPatrolEvent('patrol_session_started', {
                id: effectiveSessionId,
                session_code: sCode,
                guard_name: gName,
                started_at: startTime,
                status: 'active'
              });
            }
            verifiedSessions.add(effectiveSessionId);
          }

          const verifiedTime = verified_at || new Date().toISOString();
          const [insRes] = await dbPool.query(
            "INSERT INTO security_session_checkpoints (session_id, checkpoint_code, station_name, status, verified_at, verification_photo, verification_notes, latitude, longitude, gps_accuracy) VALUES (?, ?, ?, 'verified', ?, ?, ?, ?, ?, ?)",
            [effectiveSessionId, checkpoint_code || null, station_name, verifiedTime, verification_photo || null, notes || null, latitude, longitude, gps_accuracy || null]
          );

          const insertedCheckpoint = {
            id: insRes.insertId,
            session_id: effectiveSessionId,
            station_name,
            status: 'verified',
            verified_at: verifiedTime,
            verification_photo: verification_photo || null,
            verification_notes: notes || null,
            latitude,
            longitude,
            gps_accuracy: gps_accuracy || null
          };

          // Live Broadcast to Web Command Center
          broadcastPatrolEvent('patrol_checkpoint_recorded', insertedCheckpoint);

          // If notes exist, auto-create incident ticket
          if (notes && notes.trim().length > 0 && !notes.trim().startsWith('Checkpoint:')) {
            const incCode = `INC-${Date.now()}`;
            let station_slug = station_name.toLowerCase().replace(/\s+/g, '-');
            const incPriority = (item.priority || 'MEDIUM').toUpperCase();
            const incGuardId = guard_id || 1;
            const incGuardName = guard_name || 'Security Officer';

            const [incRes] = await dbPool.query(
              `INSERT INTO security_incidents 
               (incident_code, incident_type, location, reported_by, reported_by_name, status, priority, description, photo_path, reported_at, created_at, updated_at) 
               VALUES (?, 'Patrol Anomaly Finding', ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?)`,
              [incCode, station_slug, incGuardId, incGuardName, incPriority, notes.trim(), verification_photo || null, verifiedTime, verifiedTime, verifiedTime]
            );

            broadcastPatrolEvent('incident_created', {
              id: incRes.insertId,
              incident_code: incCode,
              incident_type: 'Patrol Anomaly Finding',
              location: station_slug,
              description: notes.trim(),
              status: 'SUBMITTED',
              priority: incPriority,
              photo_path: verification_photo || null,
              reported_at: verifiedTime
            });
          }
        }
        if (local_id) synced_ids.push(local_id);
      } catch (err) {
        console.error('[SYNC BATCH] Checkpoint error:', err);
      }
    }

    // 2. Process Incidents
    for (const item of incidents) {
      try {
        const { local_id, title, category, description, photo_path, location, reported_by, reported_by_name, priority, reported_at } = item;
        const incCode = `INC-${Date.now()}`;
        const reportedTime = reported_at || new Date().toISOString();
        const station_slug = (location || title || 'general').toLowerCase().replace(/\s+/g, '-');

        const [incRes] = await dbPool.query(
          `INSERT INTO security_incidents 
           (incident_code, incident_type, location, reported_by, reported_by_name, status, priority, description, photo_path, reported_at, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?)`,
          [incCode, category || 'Patrol Anomaly Finding', station_slug, reported_by || 1, reported_by_name || 'Security Officer', (priority || 'MEDIUM').toUpperCase(), description || title || '', photo_path || null, reportedTime, reportedTime, reportedTime]
        );

        broadcastPatrolEvent('incident_created', {
          id: incRes.insertId,
          incident_code: incCode,
          incident_type: category || 'Patrol Anomaly Finding',
          location: station_slug,
          description: description || title || '',
          status: 'SUBMITTED',
          reported_at: reportedTime
        });

        if (local_id) synced_ids.push(local_id);
      } catch (err) {
        console.error('[SYNC BATCH] Incident error:', err);
      }
    }

    // 3. Process Tracks
    for (const item of tracks) {
      try {
        const { local_id, session_id, latitude, longitude, recorded_at } = item;
        if (session_id && latitude && longitude) {
          const recTime = recorded_at || new Date().toISOString();
          await dbPool.query(
            'INSERT INTO security_patrol_tracks (session_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, ?)',
            [session_id, latitude, longitude, recTime]
          );
        }
        if (local_id) synced_ids.push(local_id);
      } catch (err) {
        console.error('[SYNC BATCH] Track error:', err);
      }
    }

    res.json({
      success: true,
      message: 'Offline batch data synced successfully',
      synced_ids: [...new Set(synced_ids)]
    });
  } catch (error) {
    console.error('Error processing sync-offline-batch:', error);
    res.status(500).json({ error: 'Failed to process offline batch sync' });
  }
};

router.post('/sync-offline-batch', syncOfflineBatchHandler);

// --- Master Checkpoints CRUD API ---

// 1. GET all checkpoints
router.get('/master-checkpoints', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM security_stations ORDER BY sequence_order ASC, id ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching master checkpoints:', error);
    res.status(500).json({ error: 'Failed to fetch master checkpoints' });
  }
});

// 2. POST create new checkpoint
router.post('/master-checkpoints', async (req, res) => {
  try {
    const { checkpoint_code, label, latitude, longitude, radius_meters, sequence_order } = req.body;
    
    // Get max id since the column is not serial
    const [maxRows] = await dbPool.query('SELECT MAX(id) as max_id FROM security_stations');
    const newId = (maxRows[0]?.max_id || 0) + 1;
    const seq = sequence_order !== undefined ? parseInt(sequence_order, 10) : newId;

    await dbPool.query(
      `INSERT INTO security_stations (id, station_key, checkpoint_code, label, normalized_x, normalized_y, latitude, longitude, radius_meters, sequence_order, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 0.5, 0.5, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [newId, checkpoint_code.toLowerCase().replace(/[^a-z0-9]/g, '_'), checkpoint_code, label, latitude, longitude, radius_meters || 30, seq]
    );
    broadcastPatrolEvent('patrol_checkpoints_updated', { action: 'created', id: newId });
    res.json({ success: true, message: 'Checkpoint created successfully' });
  } catch (error) {
    console.error('Error creating checkpoint:', error);
    res.status(500).json({ error: 'Failed to create checkpoint' });
  }
});

// 3. PUT update checkpoint
router.put('/master-checkpoints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkpoint_code, label, latitude, longitude, radius_meters, sequence_order } = req.body;
    const seq = sequence_order !== undefined ? parseInt(sequence_order, 10) : 0;
    await dbPool.query(
      `UPDATE security_stations 
       SET checkpoint_code = ?, label = ?, latitude = ?, longitude = ?, radius_meters = ?, sequence_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [checkpoint_code, label, latitude, longitude, radius_meters, seq, id]
    );
    broadcastPatrolEvent('patrol_checkpoints_updated', { action: 'updated', id: parseInt(id, 10) });
    res.json({ success: true, message: 'Checkpoint updated successfully' });
  } catch (error) {
    console.error('Error updating checkpoint:', error);
    res.status(500).json({ error: 'Failed to update checkpoint' });
  }
});

// 4. PUT toggle status (soft delete)
router.put('/master-checkpoints/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await dbPool.query(
      'UPDATE security_stations SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [is_active ? 1 : 0, id]
    );
    broadcastPatrolEvent('patrol_checkpoints_updated', { action: 'toggled', id: parseInt(id, 10), is_active: !!is_active });
    res.json({ success: true, message: 'Checkpoint status updated' });
  } catch (error) {
    console.error('Error toggling checkpoint status:', error);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// 5. DELETE hard delete checkpoint
router.delete('/master-checkpoints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbPool.query('DELETE FROM security_stations WHERE id = ?', [id]);
    broadcastPatrolEvent('patrol_checkpoints_updated', { action: 'deleted', id: parseInt(id, 10) });
    res.json({ success: true, message: 'Checkpoint deleted successfully' });
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    res.status(500).json({ error: 'Failed to delete checkpoint' });
  }
});

// 6. POST /avatar: Update profile avatar for current user/guard in database
router.post('/avatar', async (req, res) => {
  try {
    let guard_id = req.body.user_id || null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.decode(token);
        if (decoded && (decoded.userId || decoded.id)) guard_id = decoded.userId || decoded.id;
      } catch (_) {}
    }

    const { photo_url, avatar_photo } = req.body;
    const finalPhoto = photo_url || avatar_photo || null;

    if (!guard_id && req.body.username) {
      try {
        const [u] = await dbMainPool.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [req.body.username]);
        if (u.length > 0) guard_id = u[0].id;
      } catch (_) {}
    }

    if (!guard_id) {
      return res.status(400).json({ error: 'User ID or valid token required' });
    }

    // 1. Update di agrovision_main.users
    try {
      await dbMainPool.query('UPDATE users SET avatar_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [finalPhoto, guard_id]);
    } catch (e) {
      console.warn('Failed updating avatar in agrovision_main users:', e.message);
    }

    // 2. Update di agrovision_security.security_guards_status
    try {
      await dbPool.query('UPDATE security_guards_status SET avatar_photo = ?, last_update = CURRENT_TIMESTAMP WHERE user_id = ?', [finalPhoto, guard_id]);
    } catch (e) {
      console.warn('Failed updating avatar in security_guards_status:', e.message);
    }

    // 3. Update di active patrol session (jika sedang patrol)
    try {
      await dbPool.query("UPDATE security_patrol_sessions SET avatar_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE guard_id = ? AND status = 'active'", [finalPhoto, guard_id]);
    } catch (e) {
      console.warn('Failed updating avatar in active session:', e.message);
    }

    // Broadcast ke frontend web patrol map realtime
    broadcastPatrolEvent('guard_avatar_updated', {
      user_id: guard_id,
      avatar_photo: finalPhoto
    });

    res.json({ success: true, message: 'Avatar updated successfully', avatar_photo: finalPhoto });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Failed to update avatar: ' + error.message });
  }
});

export default router;
