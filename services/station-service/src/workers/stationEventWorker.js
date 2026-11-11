import { createClient } from "redis";

const lastValues = new Map();
const lastLoggedTimes = new Map();
const lastSeverities = new Map();
const MIN_LOG_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 300000;
let thresholdCache = { data: {}, lastFetch: 0 };

// Redis publisher untuk event alarm ke alarm-service
const ALARM_EVENT_CHANNEL = "kip:alarm:events";

export class StationEventWorker {
  static async getThresholds(dbPool) {
    const now = Date.now();
    if (
      now - thresholdCache.lastFetch < 60000 &&
      Object.keys(thresholdCache.data).length > 0
    )
      return thresholdCache.data;
    try {
      const [rows] = await dbPool.query(
        "SELECT station, parameter_key, warning_val, danger_val, unit FROM threshold_settings",
      );
      const data = {};
      rows.forEach((r) => {
        const s = r.station.toUpperCase();
        if (!data[s]) data[s] = {};
        data[s][r.parameter_key] = {
          warning: r.warning_val,
          danger: r.danger_val,
          unit: r.unit,
        };
      });
      thresholdCache = { data, lastFetch: now };
      return data;
    } catch {
      return thresholdCache.data;
    }
  }

  static async processBatch(tags, timestamp, dbPool) {
    if (!tags?.length) return;
    const thresholds = await this.getThresholds(dbPool);
    const rows = [];
    const now = timestamp ? new Date(timestamp).getTime() : Date.now();

    // Setup Redis publisher untuk alert events
    let redisPub = null;

    for (const t of tags) {
      const { tag, value } = t;
      if (!tag) continue;
      const lastLog = lastLoggedTimes.get(tag) || 0;
      const oldVal = lastValues.get(tag);
      const oldSev = lastSeverities.get(tag) || "INFO";

      // Evaluate threshold
      const num = parseFloat(value);
      let severity = "INFO";
      let stationName = "Unknown";
      let matchedThreshold = null;

      if (!isNaN(num)) {
        const upperTag = tag.toUpperCase();
        for (const [stationKey, params] of Object.entries(thresholds)) {
          const prefix = stationKey.replace(/[^A-Z]/g, "").substring(0, 5);
          if (
            upperTag.startsWith(prefix) ||
            upperTag.startsWith(stationKey.replace(/\s/g, "_").substring(0, 6))
          ) {
            stationName = stationKey.replace(/_/g, " ");
            // Find matching parameter key
            const paramKey = upperTag.replace(/^[^_]+_/, "").toLowerCase();
            matchedThreshold = params[paramKey] || Object.values(params)[0];
            if (matchedThreshold) {
              if (num >= matchedThreshold.danger) severity = "ALARM";
              else if (num >= matchedThreshold.warning) severity = "WARNING";
            }
            break;
          }
        }
      }

      let shouldLog = severity !== oldSev;
      if (!shouldLog) {
        const changed =
          oldVal !== undefined && String(oldVal) !== String(value);
        const heartbeat = now - lastLog >= HEARTBEAT_INTERVAL_MS;
        shouldLog =
          (changed && now - lastLog >= MIN_LOG_INTERVAL_MS) || heartbeat;
      }

      if (!shouldLog) continue;
      lastValues.set(tag, value);
      lastLoggedTimes.set(tag, now);
      lastSeverities.set(tag, severity);

      rows.push([
        stationName,
        tag,
        oldVal !== undefined ? String(oldVal) : null,
        String(value),
        "GOOD",
        severity,
        "PLC_RELAY",
        new Date(now),
      ]);

      // Publish event ke alarm-service via Redis channel kip:alarm:events
      if (
        severity !== oldSev &&
        (severity === "ALARM" || severity === "WARNING")
      ) {
        try {
          if (!redisPub) {
            redisPub = createClient({
              url: process.env.REDIS_URL || "redis://localhost:6379",
            });
            await redisPub.connect();
          }
          await redisPub.publish(
            ALARM_EVENT_CHANNEL,
            JSON.stringify({
              station: stationName,
              tag,
              value: num,
              severity,
              threshold:
                severity === "ALARM"
                  ? matchedThreshold?.danger
                  : matchedThreshold?.warning,
              unit: matchedThreshold?.unit || "",
              timestamp: new Date(now).toISOString(),
            }),
          );
        } catch (err) {
          console.error(
            "[StationWorker] Failed to publish alarm event:",
            err.message,
          );
        }
      }
    }

    if (rows.length > 0) {
      dbPool
        .query(
          "INSERT INTO station_event_logs (station_name,tag_name,old_value,new_value,quality,severity,source,timestamp) VALUES ?",
          [rows],
        )
        .catch((err) => {
          if (err.code !== "ER_NO_SUCH_TABLE")
            console.error("[StationWorker]", err.message);
        });
    }
  }
}
