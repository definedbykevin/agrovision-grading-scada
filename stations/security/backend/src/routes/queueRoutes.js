import express from 'express';
import { dbPool, dbMainPool } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';

const router = express.Router();

// Helper to broadcast WebSocket events via maintenance-service (Port 3200)
async function broadcastQueueEvent(event, data) {
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
    req.on('error', (err) => console.error('[QUEUE WS] Broadcast error:', err.message));
    req.write(postData);
    req.end();
  } catch (err) {
    console.error('[QUEUE WS] Broadcast exception:', err);
  }
}

// Auto transition worker (WEIGH_IN -> GRADING) has been intentionally removed
// due to real-world operations needing manual control to avoid chaotic queues.

/**
 * 🏭 Helper Menentukan Window Siklus Operasional Antrean Truk:
 * - Weekday (Senin - Sabtu): Cut-off jam 20:00 Malam (berjalan 20:00 s/d 20:00 hari berikutnya)
 * - Weekend (Minggu): Penerimaan hanya s/d jam 12:00 Siang.
 *   - Siklus Sabtu Malam s/d Minggu Siang: Sabtu 20:00 s/d Minggu 12:00
 *   - Siklus Minggu Siang s/d Senin Malam: Minggu 12:00 s/d Senin 20:00
 * Siklus menghasilkan format: [KODE_KOMODITAS][TANGGAL_SIKLUS]-[NOMOR_URUT] (misal: M22-001)
 */
export function getQueueCycleWindow(dateObj = new Date()) {
  const day = dateObj.getDay(); // 0: Minggu, 1: Senin, ..., 6: Sabtu
  const hours = dateObj.getHours();

  let cycleStart = new Date(dateObj);
  let operationalDate = new Date(dateObj);

  if (day === 0) {
    // MINGGU: Cut-off jam 12:00 siang
    if (hours >= 12) {
      // Minggu jam 12:00 siang ke atas -> siklus dimulai Minggu 12:00
      cycleStart.setHours(12, 0, 0, 0);
    } else {
      // Minggu pagi sebelum jam 12:00 -> siklus dari Sabtu jam 20:00 malam
      cycleStart.setDate(cycleStart.getDate() - 1);
      cycleStart.setHours(20, 0, 0, 0);
    }
  } else if (day === 1) {
    // SENIN: Cut-off jam 20:00 malam
    if (hours >= 20) {
      // Senin jam 20:00 ke atas -> siklus dimulai Senin 20:00
      cycleStart.setHours(20, 0, 0, 0);
    } else {
      // Senin sebelum jam 20:00 -> siklus dari Minggu kemarin jam 12:00 siang
      cycleStart.setDate(cycleStart.getDate() - 1);
      cycleStart.setHours(12, 0, 0, 0);
    }
  } else {
    // SELASA - SABTU: Cut-off jam 20:00 malam
    if (hours >= 20) {
      // Jam 20:00 ke atas -> siklus dimulai hari ini jam 20:00
      cycleStart.setHours(20, 0, 0, 0);
    } else {
      // Sebelum jam 20:00 -> siklus dimulai kemarin jam 20:00
      cycleStart.setDate(cycleStart.getDate() - 1);
      cycleStart.setHours(20, 0, 0, 0);
    }
  }

  const pad = (n) => n.toString().padStart(2, '0');
  const cycleStartStr = `${cycleStart.getFullYear()}-${pad(cycleStart.getMonth() + 1)}-${pad(cycleStart.getDate())} ${pad(cycleStart.getHours())}:${pad(cycleStart.getMinutes())}:${pad(cycleStart.getSeconds())}`;
  const opDayStr = pad(operationalDate.getDate());

  return { cycleStart, cycleStartStr, opDayStr };
}

/**
 * GET /api/security/queues/classifications
 */
router.get('/classifications', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT code, label as name, label, requires_grading 
       FROM security_queue_classifications 
       WHERE is_active = 1 
       ORDER BY sort_order ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching classifications:', err);
    res.status(500).json({ success: false, data: [] });
  }
});

/**
 * GET /api/security/queues/lookup?q=:query
 * Search truck & driver history by license_plate OR driver_name
 */
router.get('/lookup', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }

  const rawQuery = q.trim();
  const cleanPlateQuery = `%${rawQuery.replace(/\s+/g, '%')}%`;
  const cleanDriverQuery = `%${rawQuery}%`;

  try {
    const [rows] = await dbPool.query(
      `SELECT q1.id, q1.license_plate, q1.driver_name, q1.no_sim, q1.perusahaan, 
              q1.transporter_company, q1.classification_code
       FROM security_truck_queues q1
       INNER JOIN (
         SELECT MAX(id) as max_id 
         FROM security_truck_queues 
         WHERE license_plate LIKE ? OR driver_name LIKE ?
         GROUP BY license_plate, driver_name
       ) q2 ON q1.id = q2.max_id
       ORDER BY q1.id DESC
       LIMIT 10`,
      [cleanPlateQuery, cleanDriverQuery]
    );

    const formatted = rows.map(r => ({
      id: r.id,
      licensePlate: r.license_plate,
      driverName: r.driver_name,
      noSim: r.no_sim || '',
      perusahaan: r.perusahaan || '',
      transporterCompany: r.transporter_company || '',
      classificationCode: r.classification_code || 'U'
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error looking up truck history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/security/queues/next-sequence/:code
 */
router.get('/next-sequence/:code', async (req, res) => {
  const { code } = req.params;
  const upperCode = (code || 'U').toUpperCase();

  try {
    const { cycleStartStr, opDayStr } = getQueueCycleWindow(new Date());

    const [rows] = await dbPool.query(
      `SELECT queue_code, sequence_number FROM security_truck_queues 
       WHERE classification_code = ? AND created_at >= ?
       ORDER BY sequence_number DESC, id DESC LIMIT 1`,
      [upperCode, cycleStartStr]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      if (rows[0].sequence_number && rows[0].sequence_number > 0) {
        nextNum = rows[0].sequence_number + 1;
      } else if (rows[0].queue_code) {
        const parts = rows[0].queue_code.split('-');
        if (parts.length > 1) {
          const parsed = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(parsed)) nextNum = parsed + 1;
        }
      }
    }

    let ticketNumber = null;
    do {
      const candidate = `${upperCode}${opDayStr}-${String(nextNum).padStart(3, '0')}`;
      const [exist] = await dbPool.query(
        'SELECT id FROM security_truck_queues WHERE queue_code = ?',
        [candidate]
      );
      if (exist.length > 0) {
        nextNum++;
      } else {
        ticketNumber = candidate;
      }
    } while (!ticketNumber);

    res.json({ success: true, ticket_number: ticketNumber });
  } catch (error) {
    console.error('Error generating next sequence:', error);
    const { opDayStr } = getQueueCycleWindow(new Date());
    res.json({ success: true, ticket_number: `${upperCode}${opDayStr}-001` });
  }
});

/**
 * GET /api/security/queues
 * GET /api/security/queues/active
 */
const getQueueList = async (req, res) => {
  try {
    const { date, startDate, endDate, start_date, end_date } = req.query;
    let whereClause = '';
    const params = [];

    const fromDate = startDate || start_date;
    const toDate = endDate || end_date;

    if (fromDate && toDate) {
      // Sertakan data dalam rentang tanggal, ATAU antrean dari hari sebelumnya yang belum terselesaikan
      whereClause = `WHERE (
        (DATE(COALESCE(q.check_in_at, q.created_at)) >= ? AND DATE(COALESCE(q.check_in_at, q.created_at)) <= ?)
        OR
        (q.status IN ('WAITING', 'WEIGH_IN', 'GRADING', 'PENDING') AND DATE(COALESCE(q.check_in_at, q.created_at)) < ?)
      )`;
      params.push(fromDate, toDate, fromDate);
    } else if (fromDate) {
      whereClause = `WHERE (
        DATE(COALESCE(q.check_in_at, q.created_at)) = ?
        OR
        (q.status IN ('WAITING', 'WEIGH_IN', 'GRADING', 'PENDING') AND DATE(COALESCE(q.check_in_at, q.created_at)) < ?)
      )`;
      params.push(fromDate, fromDate);
    } else if (date) {
      whereClause = `WHERE (
        DATE(COALESCE(q.check_in_at, q.created_at)) = ?
        OR
        (q.status IN ('WAITING', 'WEIGH_IN', 'GRADING', 'PENDING') AND DATE(COALESCE(q.check_in_at, q.created_at)) < ?)
      )`;
      params.push(date, date);
    }

    const { cycleStartStr } = getQueueCycleWindow(new Date());

    const [rows] = await dbPool.query(
      `SELECT 
        q.id,
        COALESCE(q.queue_code, CONCAT(q.classification_code, '-', LPAD(q.sequence_number, 3, '0'))) AS queueCode,
        COALESCE(q.queue_code, CONCAT(q.classification_code, '-', LPAD(q.sequence_number, 3, '0'))) AS queue_number,
        COALESCE(q.queue_code, CONCAT(q.classification_code, '-', LPAD(q.sequence_number, 3, '0'))) AS ticket_number,
        q.license_plate AS licensePlate,
        q.license_plate AS plate_number,
        q.driver_name AS driverName,
        q.driver_name,
        q.classification_code AS classification_id,
        q.classification_code AS classificationCode,
        COALESCE(c.label, q.classification_code) AS classification_label,
        COALESCE(c.label, q.classification_code) AS classification_name,
        COALESCE(c.label, q.classification_code) AS classification,
        q.status,
        q.check_in_at AS checkInAt,
        q.check_in_at,
        q.weigh_in_at AS weighInAt,
        q.weigh_in_at,
        q.check_out_at AS checkOutAt,
        q.check_out_at,
        q.driver_photo AS driverPhoto,
        q.driver_photo,
        q.no_do AS noDo,
        q.no_do,
        q.no_sim AS noSim,
        q.no_sim,
        q.perusahaan,
        q.transporter_company AS transporterCompany,
        q.transporter_company,
        q.notes,
        q.registered_by AS registeredBy,
        q.registered_by_name AS registeredByName,
        q.created_at AS createdAt,
        q.created_at,
        q.updated_at AS updatedAt,
        q.updated_at,
        CASE 
          WHEN q.status IN ('WAITING', 'WEIGH_IN', 'GRADING', 'PENDING') AND (DATE(COALESCE(q.check_in_at, q.created_at)) < CURRENT_DATE OR COALESCE(q.check_in_at, q.created_at) < '${cycleStartStr}') THEN 1 
          ELSE 0 
        END AS is_carry_over
       FROM security_truck_queues q
       LEFT JOIN (
         SELECT DISTINCT ON (code) code, label FROM security_queue_classifications ORDER BY code, id
       ) c ON q.classification_code = c.code
       ${whereClause}
       ORDER BY is_carry_over DESC, q.check_in_at ASC`,
      params
    );

    // Enrich registeredByName with full_name from agrovision_main users table
    try {
      const [userRows] = await dbMainPool.query('SELECT id, username, full_name FROM users');
      const userMapById = new Map();
      const userMapByName = new Map();
      for (const u of userRows) {
        if (u.full_name) {
          userMapById.set(Number(u.id), u.full_name);
          userMapByName.set(String(u.username).toLowerCase(), u.full_name);
        }
      }

      for (const r of rows) {
        const enrichedName = userMapById.get(Number(r.registeredBy)) || 
                             userMapByName.get(String(r.registeredByName).toLowerCase()) || 
                             r.registeredByName;
        r.registeredByName = enrichedName;
        r.registered_by_name = enrichedName;
      }
    } catch (_) {}

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching truck queues:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch truck queues' });
  }
};

router.get('/', getQueueList);
router.get('/active', getQueueList);

/**
 * GET /api/security/queues/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const [queueCount] = await dbPool.query(
      "SELECT COUNT(*) as count FROM security_truck_queues WHERE status IN ('WAITING', 'WEIGH_IN', 'GRADING')"
    );
    const [patrolCount] = await dbPool.query(
      "SELECT COUNT(DISTINCT guard_id) as count FROM security_patrol_sessions WHERE status = 'active'"
    );
    const [incidentCount] = await dbPool.query(
      "SELECT COUNT(*) as count FROM security_incidents WHERE status = 'SUBMITTED'"
    );
    
    res.json({
      activeQueues: queueCount[0].count,
      activePatrols: patrolCount[0].count,
      openIncidents: incidentCount[0].count
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

/**
 * POST /api/security/queues
 * POST /api/security/queues/checkin
 * Register new truck queue
 */
const createQueueHandler = async (req, res) => {
  const {
    driverName, driver_name,
    licensePlate, plate_number,
    classificationCode, classification_name,
    noSim, no_sim,
    noDo, no_do,
    perusahaan,
    transporterCompany, transporter_company,
    notes,
    driverPhoto, driver_photo,
    queueCode, queue_number
  } = req.body;
  console.log('[DEBUG] createQueue body:', req.body);

  const finalDriverName = driverName || driver_name || 'Driver';
  const finalPlateNumber = licensePlate || plate_number || '';
  const finalClassCode = (classificationCode || classification_name || 'U').toUpperCase();
  const finalNoSim = noSim || no_sim || null;
  const finalNoDo = noDo || no_do || null;
  const finalPerusahaan = perusahaan || null;
  const finalTransporter = transporterCompany || transporter_company || null;
  const finalNotes = notes || null;
  const finalPhoto = driverPhoto || driver_photo || null;

  // Extract from body (Payload-based approach) or JWT (if available)
  // Extract from body (Payload-based approach) or JWT (if available)
  let registeredBy = req.body.registeredBy || req.body.registered_by || req.user?.userId || req.user?.id || 1;
  let registeredByName = req.body.registeredByName || req.body.registered_by_name || req.user?.username || null;

  if (!finalPlateNumber) {
    return res.status(400).json({ success: false, message: 'License plate number is required' });
  }

  try {
    if (registeredBy || registeredByName) {
      try {
        const [userRows] = await dbMainPool.query('SELECT username, full_name FROM users WHERE id = ? OR username = ?', [registeredBy, registeredByName]);
        if (userRows && userRows.length > 0) {
          registeredByName = userRows[0].full_name || userRows[0].username || registeredByName || 'System';
        } else if (!registeredByName) {
          registeredByName = 'System';
        }
      } catch (e) {
        console.error('Error fetching user full_name:', e);
        if (!registeredByName) registeredByName = 'System';
      }
    } else if (!registeredByName) {
      registeredByName = 'System';
    }

    const { cycleStartStr, opDayStr } = getQueueCycleWindow(new Date());
    const today = new Date().toISOString().split('T')[0];
    
    // 🏭 Cari sequence tertinggi yang terdaftar pada siklus operasional saat ini
    const [seqRows] = await dbPool.query(
      `SELECT sequence_number, queue_code FROM security_truck_queues 
       WHERE classification_code = ? AND created_at >= ?
       ORDER BY sequence_number DESC, id DESC LIMIT 1`,
      [finalClassCode, cycleStartStr]
    );

    let nextSeq = 1;
    if (seqRows.length > 0) {
      if (seqRows[0].sequence_number && seqRows[0].sequence_number > 0) {
        nextSeq = seqRows[0].sequence_number + 1;
      } else if (seqRows[0].queue_code) {
        const parts = seqRows[0].queue_code.split('-');
        if (parts.length > 1) {
          const parsed = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(parsed)) nextSeq = parsed + 1;
        }
      }
    }

    let finalQueueCode = queueCode || queue_number;
    if (!finalQueueCode) {
      do {
        const candidate = `${finalClassCode}${opDayStr}-${String(nextSeq).padStart(3, '0')}`;
        const [exist] = await dbPool.query(
          'SELECT id FROM security_truck_queues WHERE queue_code = ?',
          [candidate]
        );
        if (exist.length > 0) {
          nextSeq++;
        } else {
          finalQueueCode = candidate;
        }
      } while (!finalQueueCode);
    } else {
      const [exist] = await dbPool.query(
        'SELECT id FROM security_truck_queues WHERE queue_code = ?',
        [finalQueueCode]
      );
      if (exist.length > 0) {
        do {
          const candidate = `${finalClassCode}${opDayStr}-${String(nextSeq).padStart(3, '0')}`;
          const [existCand] = await dbPool.query(
            'SELECT id FROM security_truck_queues WHERE queue_code = ?',
            [candidate]
          );
          if (existCand.length > 0) {
            nextSeq++;
          } else {
            finalQueueCode = candidate;
          }
        } while (finalQueueCode === (queueCode || queue_number));
      }
    }

    const [result] = await dbPool.query(
      `INSERT INTO security_truck_queues 
       (queue_code, classification_code, queue_date, sequence_number, driver_name, no_sim, license_plate, no_do, transporter_company, perusahaan, driver_photo, status, check_in_at, notes, registered_by, registered_by_name, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'WAITING', CURRENT_TIMESTAMP, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        finalQueueCode,
        finalClassCode,
        today,
        nextSeq,
        finalDriverName,
        finalNoSim,
        finalPlateNumber,
        finalNoDo,
        finalTransporter,
        finalPerusahaan,
        finalPhoto,
        finalNotes,
        registeredBy,
        registeredByName
      ]
    );


    const newQueue = {
      id: result.insertId,
      queueCode: finalQueueCode,
      queue_number: finalQueueCode,
      licensePlate: finalPlateNumber,
      plate_number: finalPlateNumber,
      driverName: finalDriverName,
      driver_name: finalDriverName,
      classificationCode: finalClassCode,
      classification_name: finalClassCode,
      noSim: finalNoSim,
      noDo: finalNoDo,
      perusahaan: finalPerusahaan,
      transporterCompany: finalTransporter,
      notes: finalNotes,
      driverPhoto: finalPhoto,
      status: 'WAITING',
      registeredBy: registeredBy,
      registeredByName: registeredByName,
      checkInAt: new Date(),
    };

    broadcastQueueEvent('queue_created', newQueue);

    res.status(201).json({
      success: true,
      message: 'Truck queue registered successfully',
      data: newQueue,
      queue_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating truck queue:', error);
    res.status(500).json({ success: false, message: 'Failed to create truck queue: ' + error.message });
  }
};

router.post('/', createQueueHandler);
router.post('/checkin', createQueueHandler);

/**
 * POST /api/security/queues/call/:id
 * POST /api/security/queues/:id/call
 * Call queue speaker and update status to WEIGH_IN
 */
const callQueueHandler = async (req, res) => {
  const { id } = req.params;
  try {
    const [[queueRow]] = await dbPool.query(
      'SELECT * FROM security_truck_queues WHERE id = ?',
      [id]
    );

    if (!queueRow) {
      return res.status(404).json({ success: false, message: 'Truck queue entry not found' });
    }

    const currentStatus = (queueRow.status || 'WAITING').toUpperCase();

    // Only update to WEIGH_IN and set timestamp if it is still WAITING
    if (currentStatus === 'WAITING') {
      await dbPool.query(
        "UPDATE security_truck_queues SET status = 'WEIGH_IN', weigh_in_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );
    }

    const [[updatedRow]] = await dbPool.query(
      'SELECT * FROM security_truck_queues WHERE id = ?',
      [id]
    );

    const newStatus = (updatedRow.status || 'WAITING').toUpperCase();

    const payload = {
      id: updatedRow.id,
      queueCode: updatedRow.queue_code,
      licensePlate: updatedRow.license_plate,
      driverName: updatedRow.driver_name,
      classificationCode: updatedRow.classification_code,
      status: newStatus,
      weighInAt: updatedRow.weigh_in_at
    };

    // Broadcast audio speaker call event and status update event
    broadcastQueueEvent('queue_called', payload);
    broadcastQueueEvent('queue_updated', payload);

    res.json({
      success: true,
      message: `Queue ticket ${updatedRow.queue_code} called to speaker. Current status: ${newStatus}.`,
      data: updatedRow
    });
  } catch (error) {
    console.error('Error calling truck queue speaker:', error);
    res.status(500).json({ success: false, message: 'Failed to call queue speaker: ' + error.message });
  }
};

router.post('/call/:id', callQueueHandler);
router.post('/:id/call', callQueueHandler);

/**
 * PUT /api/security/queues/:id
 * PUT /api/security/queues/:id/status
 * Edit / Update queue entry
 */
const updateQueueHandler = async (req, res) => {
  const { id } = req.params;
  const {
    status,
    driverName, driver_name,
    licensePlate, plate_number,
    classificationCode, classification_name,
    noSim, no_sim,
    noDo, no_do,
    perusahaan,
    transporterCompany, transporter_company,
    notes,
    driverPhoto, driver_photo
  } = req.body;

  try {
    const fields = [];
    const values = [];

    const finalStatus = status ? status.toUpperCase() : null;
    const finalDriverName = driverName || driver_name;
    const finalPlateNumber = licensePlate || plate_number;
    const finalClassCode = classificationCode || classification_name;
    const finalNoSim = noSim !== undefined ? noSim : no_sim;
    const finalNoDo = noDo !== undefined ? noDo : no_do;
    const finalTransporter = transporterCompany !== undefined ? transporterCompany : transporter_company;
    const finalPhoto = driverPhoto !== undefined ? driverPhoto : driver_photo;

    if (finalStatus) {
      fields.push('status = ?');
      values.push(finalStatus);
      if (finalStatus === 'WEIGH_IN') {
        fields.push('weigh_in_at = CURRENT_TIMESTAMP');
      } else if (finalStatus === 'COMPLETED') {
        fields.push('check_out_at = CURRENT_TIMESTAMP');
      }
    }
    if (finalDriverName) {
      fields.push('driver_name = ?');
      values.push(finalDriverName);
    }
    if (finalPlateNumber) {
      fields.push('license_plate = ?');
      values.push(finalPlateNumber);
    }
    if (finalClassCode) {
      fields.push('classification_code = ?');
      values.push(finalClassCode.toUpperCase());
    }
    if (finalNoSim !== undefined) {
      fields.push('no_sim = ?');
      values.push(finalNoSim);
    }
    if (finalNoDo !== undefined) {
      fields.push('no_do = ?');
      values.push(finalNoDo);
    }
    if (perusahaan !== undefined) {
      fields.push('perusahaan = ?');
      values.push(perusahaan);
    }
    if (finalTransporter !== undefined) {
      fields.push('transporter_company = ?');
      values.push(finalTransporter);
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      values.push(notes);
    }
    if (finalPhoto !== undefined) {
      fields.push('driver_photo = ?');
      values.push(finalPhoto);
    }
    
    // Always update updated_at when updating a queue
    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (fields.length === 1) { // Only updated_at is in there
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    const [result] = await dbPool.query(
      `UPDATE security_truck_queues SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Truck queue entry not found' });
    }

    const [[updatedRow]] = await dbPool.query(
      'SELECT * FROM security_truck_queues WHERE id = ?',
      [id]
    );

    broadcastQueueEvent('queue_updated', updatedRow);

    res.json({
      success: true,
      message: 'Truck queue updated successfully',
      data: updatedRow
    });
  } catch (error) {
    console.error('Error updating truck queue:', error);
    res.status(500).json({ success: false, message: 'Failed to update truck queue: ' + error.message });
  }
};

router.put('/:id', updateQueueHandler);
router.put('/:id/status', updateQueueHandler);

/**
 * DELETE /api/security/queues/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await dbPool.query('DELETE FROM security_truck_queues WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Truck queue not found' });
    }
    broadcastQueueEvent('queue_updated', { deletedId: id });
    res.json({ success: true, message: 'Truck queue deleted successfully' });
  } catch (error) {
    console.error('Error deleting truck queue:', error);
    res.status(500).json({ success: false, message: 'Failed to delete truck queue' });
  }
});

export default router;
