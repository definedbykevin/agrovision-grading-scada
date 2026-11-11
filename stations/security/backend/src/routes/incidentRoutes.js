import express from 'express';
import { dbPool } from '../config/db.js';

const router = express.Router();

// Helper to broadcast WebSocket events via maintenance-service (Port 3200)
async function broadcastIncidentEvent(event, data) {
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
    req.on('error', (err) => console.error('[INCIDENT WS] Broadcast error:', err.message));
    req.write(postData);
    req.end();
  } catch (err) {
    console.error('[INCIDENT WS] Broadcast exception:', err);
  }
}

/**
 * GET /api/security/incidents
 * Fetch incidents reported by security guards
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT * FROM security_incidents ORDER BY reported_at DESC, created_at DESC LIMIT 100'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

/**
 * PUT /api/security/incidents/:id/status
 * Update incident status
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, resolved_notes } = req.body;
  
  try {
    const [result] = await dbPool.query(
      'UPDATE security_incidents SET status = ?, resolved_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, resolved_notes || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    const [[updatedRow]] = await dbPool.query('SELECT * FROM security_incidents WHERE id = ?', [id]);
    if (updatedRow) {
      broadcastIncidentEvent('incident_updated', updatedRow);
    }
    
    res.json({ success: true, message: 'Incident updated successfully' });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

/**
 * POST /api/security/incidents
 * Submit a new incident report from mobile app or checkpoint finding
 */
router.post('/', async (req, res) => {
  try {
    let guard_id = req.body.user_id || req.body.reported_by || null;
    let guard_name = req.body.reported_by_name || 'Security Officer';

    // Decode JWT token for guard info if provided in header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.decode(token);
        if (decoded && (decoded.userId || decoded.id)) {
          guard_id = guard_id || decoded.userId || decoded.id;
          guard_name = decoded.username || decoded.name || guard_name;
        }
      } catch (_) {}
    }

    const incCode = `INC-${Date.now()}`;
    const incident_type = req.body.type || req.body.incident_category || 'Patrol Anomaly Finding';
    const location = req.body.location || req.body.station_name || 'Main Gate';
    const description = req.body.description || req.body.incident_description || 'Anomaly reported';
    const priority = (req.body.priority || 'MEDIUM').toUpperCase();
    const photo_path = req.body.photoPath || req.body.photo_path || null;

    const [result] = await dbPool.query(
      `INSERT INTO security_incidents 
       (incident_code, incident_type, location, reported_by, reported_by_name, status, priority, description, photo_path, reported_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [incCode, incident_type, location, guard_id || 1, guard_name, priority, description, photo_path]
    );

    const insertId = result.insertId || (result.rows && result.rows[0] && result.rows[0].id) || 0;
    const [rows] = await dbPool.query('SELECT * FROM security_incidents WHERE id = ? OR incident_code = ? LIMIT 1', [insertId, incCode]);
    const newRow = rows && rows.length > 0 ? rows[0] : null;

    if (newRow) {
      broadcastIncidentEvent('incident_created', newRow);
    }
    
    res.status(201).json({ success: true, data: newRow, incident_id: insertId, message: 'Incident reported successfully' });
  } catch (error) {
    console.error('Error reporting incident:', error);
    res.status(500).json({ error: 'Failed to report incident' });
  }
});

export default router;
