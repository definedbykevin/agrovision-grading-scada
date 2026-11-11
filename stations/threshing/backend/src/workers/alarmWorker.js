import { createClient } from 'redis';
import { dbPool } from '../config/db.js';
import { liveDataCache } from '../routes/monitorRoutes.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://:REDIS_PASSWORD@localhost:6379';
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || 'kip:plc:data';
const TAG_PREFIX = process.env.TAG_PREFIX || 'TEMPLATE_';

export async function startAlarmWorker() {
  const subscriber = createClient({ url: REDIS_URL });

  subscriber.on('error', (err) => {
    console.error(`[${TAG_PREFIX} worker] Redis connection error:`, err.message || err.toString() || err);
  });

  await subscriber.connect();
  console.log(`[${TAG_PREFIX} worker] Redis subscriber connected to ${REDIS_CHANNEL}`);

  // Fetch threshold configurations from DB
  let thresholds = {};
  const loadThresholds = async () => {
    try {
      const [rows] = await dbPool.query('SELECT * FROM threshold_settings');
      const temp = {};
      rows.forEach(r => {
        temp[r.parameter_key] = {
          warning: r.warning_val,
          danger: r.danger_val,
          unit: r.unit
        };
      });
      thresholds = temp;
    } catch (err) {
      console.error(`[${TAG_PREFIX} worker] Failed to load thresholds:`, err.message);
    }
  };

  await loadThresholds();
  // Reload thresholds every 30 seconds to capture changes from settings UI
  setInterval(loadThresholds, 30000);

  // Keep track of last alarm state to prevent spamming logs
  const alarmStates = {};

  await subscriber.subscribe(REDIS_CHANNEL, async (message) => {
    try {
      const data = JSON.parse(message); // e.g. { STERI_temp: 75.4, THRESH_speed: 120 }

      for (const [tag, val] of Object.entries(data)) {
        // Filter: only process tags starting with the prefix (e.g. STERI_)
        if (tag.startsWith(TAG_PREFIX)) {
          const numVal = parseFloat(val);
          liveDataCache[tag] = val; // Update local realtime cache for monitorRoute

          // Check thresholds
          const thresh = thresholds[tag];
          if (thresh && !isNaN(numVal)) {
            let severity = 'INFO';
            if (numVal >= thresh.danger) {
              severity = 'ALARM';
            } else if (numVal >= thresh.warning) {
              severity = 'WARNING';
            }

            const lastState = alarmStates[tag] || 'INFO';

            // Only log and create alert when state changes (e.g. INFO -> WARNING, WARNING -> ALARM, ALARM -> INFO)
            if (severity !== lastState) {
              alarmStates[tag] = severity;
              console.log(`[${TAG_PREFIX} worker] Tag ${tag} changed state from ${lastState} to ${severity} (Value: ${numVal})`);

              // Save to station_event_logs
              await dbPool.query(
                `INSERT INTO station_event_logs (tag_name, old_value, new_value, severity, source)
                 VALUES (?, ?, ?, ?, 'PLC')`,
                [tag, String(liveDataCache[tag] || ''), String(numVal), severity]
              ).catch(err => {
                console.error(`[${TAG_PREFIX} worker] Failed to write event log:`, err.message);
              });
            }
          }
        }
      }
    } catch (err) {
      console.error(`[${TAG_PREFIX} worker] Error processing message:`, err.message);
    }
  });
}
