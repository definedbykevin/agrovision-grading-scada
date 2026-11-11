import { Router } from 'express';
import { dbPool } from '../config/db.js';

const router = Router();

/**
 * GET /api/weighbridge/transactions/throughput/daily
 * Calculates today's aggregated Netto weight (in MT) grouped by commodity
 * Joins weighbridge_transactions with agrovision_security.truck_queues
 */
router.get('/throughput/daily', async (req, res) => {
  try {
    // Calculate 07:00 AM operational day shift window
    const now = new Date();
    const startTime = new Date(now);
    if (now.getHours() < 7) {
      startTime.setDate(startTime.getDate() - 1);
    }
    startTime.setHours(7, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setMilliseconds(-1); // 06:59:59.999 H+1

    const startTimeStr = startTime.toISOString().replace('T', ' ').substring(0, 19);
    const endTimeStr = endTime.toISOString().replace('T', ' ').substring(0, 19);

    // Left Join with Security truck_queues database to fetch commodity classification code
    const [rows] = await dbPool.query(
      `SELECT 
        COALESCE(sq.classification_code, SUBSTRING(wt.queue_code, 1, 1)) AS commodity_code,
        COALESCE(SUM(wt.net_weight), 0) / 1000.0 AS total_mt,
        COUNT(wt.id) AS total_trucks
       FROM weighbridge_transactions wt
       LEFT JOIN agrovision_security.truck_queues sq 
              ON (wt.queue_id = sq.id OR wt.queue_code = sq.queue_code)
       WHERE wt.status = 'COMPLETED'
         AND COALESCE(wt.weigh_out_at, wt.created_at) >= ?
         AND COALESCE(wt.weigh_out_at, wt.created_at) <= ?
       GROUP BY commodity_code`,
      [startTimeStr, endTimeStr]
    );

    // Initialize summary map
    const summaryMap = {
      ffb_received: 0,   // Codes 'U' (FFB UMUM) & 'M' (FFB MITRA)
      cpo_dispatch: 0,   // Code 'C' (CRUDE PALM OIL)
      pk_dispatch: 0,    // Code 'K' (PALM KERNEL)
      pks_dispatch: 0    // Code 'S' (PALM KERNEL SHELL)
    };

    rows.forEach(r => {
      const code = (r.commodity_code || '').toUpperCase();
      const mt = parseFloat(r.total_mt) || 0;

      if (code === 'U' || code === 'M') {
        summaryMap.ffb_received += mt;
      } else if (code === 'C') {
        summaryMap.cpo_dispatch += mt;
      } else if (code === 'K') {
        summaryMap.pk_dispatch += mt;
      } else if (code === 'S') {
        summaryMap.pks_dispatch += mt;
      }
    });

    res.json({
      success: true,
      data: {
        ffbReceived: Math.round(summaryMap.ffb_received * 100) / 100,
        cpoDispatch: Math.round(summaryMap.cpo_dispatch * 100) / 100,
        pkDispatch: Math.round(summaryMap.pk_dispatch * 100) / 100,
        pksDispatch: Math.round(summaryMap.pks_dispatch * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching daily throughput:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate daily throughput' });
  }
});

/**
 * GET /api/weighbridge/transactions/scales/status
 * Fetches current active Weigh-In & latest Weigh-Out transactions for Scale 1 & Scale 2
 * Joins with Security truck_queues to fetch license plate dynamically
 */
router.get('/scales/status', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT 
        wt.*,
        COALESCE(sq.license_plate, sq.plate_number) AS live_license_plate,
        COALESCE(sq.classification_code, SUBSTRING(wt.queue_code, 1, 1)) AS classification_code
       FROM weighbridge_transactions wt
       LEFT JOIN agrovision_security.truck_queues sq 
              ON (wt.queue_id = sq.id OR wt.queue_code = sq.queue_code)
       ORDER BY wt.created_at DESC LIMIT 20`
    );

    const scale1In = rows.find(r => r.scale_in_id === 'SCALE_1' && r.status === 'WEIGH_IN');
    const scale1Out = rows.find(r => r.scale_out_id === 'SCALE_1' && r.status === 'COMPLETED');
    const scale2In = rows.find(r => r.scale_in_id === 'SCALE_2' && r.status === 'WEIGH_IN');
    const scale2Out = rows.find(r => r.scale_out_id === 'SCALE_2' && r.status === 'COMPLETED');

    res.json({
      success: true,
      data: {
        scale1: {
          inTruck: scale1In ? (scale1In.live_license_plate || scale1In.queue_code) : '-',
          inClass: scale1In ? (scale1In.classification_code || 'U').toUpperCase() : null,
          inWeight: scale1In ? parseFloat(scale1In.gross_weight) : 0,
          outTruck: scale1Out ? (scale1Out.live_license_plate || scale1Out.queue_code) : '-',
          outClass: scale1Out ? (scale1Out.classification_code || 'U').toUpperCase() : null,
          outWeight: scale1Out ? parseFloat(scale1Out.net_weight) : 0
        },
        scale2: {
          inTruck: scale2In ? (scale2In.live_license_plate || scale2In.queue_code) : '-',
          inClass: scale2In ? (scale2In.classification_code || 'U').toUpperCase() : null,
          inWeight: scale2In ? parseFloat(scale2In.gross_weight) : 0,
          outTruck: scale2Out ? (scale2Out.live_license_plate || scale2Out.queue_code) : '-',
          outClass: scale2Out ? (scale2Out.classification_code || 'U').toUpperCase() : null,
          outWeight: scale2Out ? parseFloat(scale2Out.net_weight) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching scales status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scales status' });
  }
});

/**
 * POST /api/weighbridge/transactions/sync
 * External Weighbridge App Synchronization Endpoint
 */
router.post('/sync', async (req, res) => {
  try {
    const {
      queue_id,
      queue_code,
      scale_in_id,
      scale_out_id,
      gross_weight,
      tare_weight,
      status
    } = req.body;

    if (!queue_code) {
      return res.status(400).json({ success: false, message: 'queue_code is required' });
    }

    const [result] = await dbPool.query(
      `INSERT INTO weighbridge_transactions 
        (queue_id, queue_code, scale_in_id, scale_out_id, gross_weight, tare_weight, status, weigh_out_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE 
        gross_weight = VALUES(gross_weight),
        tare_weight = VALUES(tare_weight),
        status = VALUES(status),
        weigh_out_at = CURRENT_TIMESTAMP`,
      [
        queue_id || null,
        queue_code,
        scale_in_id || 'SCALE_1',
        scale_out_id || 'SCALE_2',
        parseFloat(gross_weight) || 0,
        parseFloat(tare_weight) || 0,
        status || 'COMPLETED'
      ]
    );

    res.json({ success: true, message: 'Transaction synced successfully', id: result.insertId });
  } catch (error) {
    console.error('Error syncing transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to sync transaction: ' + error.message });
  }
});

export default router;
