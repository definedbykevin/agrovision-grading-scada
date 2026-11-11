/**
 * PLC Collector untuk Station DAF / OSR
 *
 * Service ini MANDIRI — membaca device & tag dari database agrovision_daf,
 * polling PLC via Snap7 / OPC UA, update liveDataCache langsung, dan publish ke Redis kip:plc:data.
 */

import { createClient } from "redis";
import { pool } from "./config/db.js";
import { Snap7ClientWrapper } from "./snap7Client.js";
import { OpcUaClientWrapper } from "./opcuaClient.js";
import { liveDataCache } from "./routes/monitorRoutes.js";

// ═══════════════════════════════════════════════════════
// KONFIGURASI
// ═══════════════════════════════════════════════════════
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "100");
const REFRESH_CONFIG_INTERVAL_MS = 30000;
const MAX_BACKOFF_MS = 60000;
const STATION_SLUG = process.env.STATION_SLUG || "daf-osr";
const TAG_PREFIX = process.env.TAG_PREFIX || "DAF_";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || "kip:plc:data";
const COMMAND_CHANNEL = process.env.COMMAND_CHANNEL || "kip:plc:command";

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let clients = new Map(); // key: deviceId
const lastTagValues = new Map(); // key: "deviceId:tagId"
const reconnectState = new Map(); // key: deviceId
const deviceStatusCache = new Map(); // key: deviceId → "CONNECTED"|"DISCONNECTED"

// ── Event Logging State ──
const lastEventLogTimes = new Map(); // key: tagName → last log timestamp
const EVENT_LOG_INTERVAL_MS = 1000; // Debounce: minimal 1 detik antar log
const EVENT_HEARTBEAT_MS = 300000; // Heartbeat: log tiap 5 menit meskipun tidak berubah
const deviceHeartbeat = new Map(); // key: deviceId → last heartbeat timestamp

// Redis
let redisPublisher = null;
let redisSubscriber = null;
let redisConnected = false;

// Thresholds (dari DB sendiri)
let thresholds = {};
const alarmStates = {};

// ═══════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════
export async function startPlcCollector() {
  console.log(`[plcCollector-${STATION_SLUG}] Starting...`);

  // 1. Connect Redis
  await connectRedis();

  // 2. Load thresholds
  await loadThresholds();
  setInterval(loadThresholds, 30000);

  // 3. Load configuration (devices + tags)
  await refreshConfiguration();

  console.log(
    `[plcCollector-${STATION_SLUG}] Started (poll every ${POLL_INTERVAL_MS}ms)`,
  );

  // 4. Start polling loop
  const runPollLoop = async () => {
    const start = Date.now();
    await pollAllDevices();
    const elapsed = Date.now() - start;
    const delay = Math.max(10, POLL_INTERVAL_MS - elapsed);
    setTimeout(runPollLoop, delay);
  };
  runPollLoop();

  // 5. Refresh config periodically
  setInterval(refreshConfiguration, REFRESH_CONFIG_INTERVAL_MS);
}

// ═══════════════════════════════════════════════════════
// BROWSE HELPER
// ═══════════════════════════════════════════════════════
export function getOpcUaClient(deviceId) {
  for (const [, entry] of clients.entries()) {
    if (String(entry.device.id) === String(deviceId)) {
      if (entry.protocol === 'OPC_UA' && entry.client.connected) {
        return entry.client;
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// REDIS
// ═══════════════════════════════════════════════════════
async function connectRedis() {
  try {
    redisPublisher = createClient({ url: REDIS_URL });
    redisSubscriber = createClient({ url: REDIS_URL });

    redisPublisher.on("connect", () => {
      redisConnected = true;
      console.log(`[plcCollector-${STATION_SLUG}] Redis publisher CONNECTED`);
    });
    redisPublisher.on("error", (err) => {
      redisConnected = false;
      console.error(
        `[plcCollector-${STATION_SLUG}] Redis publisher error: ${err.message}`,
      );
    });
    redisSubscriber.on("error", (err) => {
      console.error(
        `[plcCollector-${STATION_SLUG}] Redis subscriber error: ${err.message}`,
      );
    });

    await redisPublisher.connect();
    await redisSubscriber.connect();

    // Subscribe ke command channel untuk write ke PLC
    await redisSubscriber.subscribe(COMMAND_CHANNEL, handleCommand);
    console.log(
      `[plcCollector-${STATION_SLUG}] Subscribed to ${COMMAND_CHANNEL}`,
    );
  } catch (err) {
    console.warn(
      `[plcCollector-${STATION_SLUG}] Redis not available, running without Redis: ${err.message}`,
    );
  }
}

async function handleCommand(message) {
  let cmd;
  try {
    cmd = JSON.parse(message);
    if (cmd.stationSlug && cmd.stationSlug !== STATION_SLUG) return;

    let entry = null;
    let tag = null;

    for (const [, clientEntry] of clients.entries()) {
      const foundTag = clientEntry.tags.find((t) => String(t.id) === String(cmd.tagId));
      if (foundTag) {
        entry = clientEntry;
        tag = foundTag;
        break;
      }
    }

    if (!entry || !tag) {
      console.warn(
        `[plcCollector-${STATION_SLUG}] Command for unknown tag: ${cmd.tagId}`,
      );
      return;
    }

    let val =
      tag.data_type === "BOOL"
        ? String(cmd.value) === "1" || String(cmd.value) === "true"
        : Number(cmd.value);

    console.log(
      `[plcCollector-${STATION_SLUG}] Write: ${tag.tag_name} → ${val}`,
    );
    await entry.client.writeTag(tag, val);

    // Update command status di DB
    if (cmd.cmdId) {
      await pool.query(
        "UPDATE plc_commands SET status = 'DONE', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [cmd.cmdId],
      );
    }
  } catch (err) {
    console.error(
      `[plcCollector-${STATION_SLUG}] Command failed: ${err.message}`,
    );
    if (cmd?.cmdId) {
      pool
        .query(
          "UPDATE plc_commands SET status = 'ERROR', error_message = $1 WHERE id = $2",
          [err.message, cmd.cmdId],
        )
        .catch(() => { });
    }
  }
}

// ═══════════════════════════════════════════════════════
// THRESHOLDS
// ═══════════════════════════════════════════════════════
async function loadThresholds() {
  try {
    const { rows } = await pool.query("SELECT * FROM threshold_settings");
    const temp = {};
    rows.forEach((r) => {
      temp[r.parameter_key] = {
        warning: r.warning_val,
        danger: r.danger_val,
        unit: r.unit,
      };
    });
    thresholds = temp;
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE" || err.code === "42P01") {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS threshold_settings (
          id SERIAL PRIMARY KEY,
          parameter_key VARCHAR(100) NOT NULL UNIQUE,
          lower_val DOUBLE PRECISION DEFAULT 0,
          warning_val DOUBLE PRECISION DEFAULT 50,
          danger_val DOUBLE PRECISION DEFAULT 80,
          unit VARCHAR(20) DEFAULT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log(
        `[plcCollector-${STATION_SLUG}] Auto-created threshold_settings table`,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════
// CONFIG: Baca device & tag dari DATABASE SENDIRI
// ═══════════════════════════════════════════════════════
async function refreshConfiguration() {
  try {
    const { rows: devices } = await pool.query(
      "SELECT * FROM plc_devices WHERE enabled = true",
    );
    const activeKeys = new Set();

    for (const device of devices) {
      const clientKey = String(device.id);
      activeKeys.add(clientKey);

      const { rows: tags } = await pool.query(
        "SELECT * FROM plc_tags WHERE plc_id = $1 AND enabled = true",
        [device.id],
      );

      if (!clients.has(clientKey)) {
        console.log(
          `[plcCollector-${STATION_SLUG}] Initializing: ${device.name} (${device.ip_address}) - Protocol: ${device.protocol || 'SNAP7'}`,
        );
        let wrapper;
        if (device.protocol === 'OPC_UA') {
          wrapper = new OpcUaClientWrapper(device);
        } else {
          wrapper = new Snap7ClientWrapper(device);
        }

        clients.set(clientKey, {
          device,
          client: wrapper,
          tags: [],
          protocol: device.protocol || 'SNAP7'
        });
      }

      const entry = clients.get(clientKey);
      entry.device = device;
      entry.tags = tags;

      if (!deviceStatusCache.has(clientKey)) {
        deviceStatusCache.set(clientKey, device.status || "DISCONNECTED");
      }
    }

    // Hapus client yang sudah tidak aktif
    for (const key of clients.keys()) {
      if (!activeKeys.has(key)) {
        console.log(`[plcCollector-${STATION_SLUG}] Removing device: ${key}`);
        const entry = clients.get(key);
        entry.client.disconnect();
        clients.delete(key);
        reconnectState.delete(key);
      }
    }
  } catch (err) {
    console.error(
      `[plcCollector-${STATION_SLUG}] Config refresh failed: ${err.message}`,
    );
  }
}

// ═══════════════════════════════════════════════════════
// CONNECTION
// ═══════════════════════════════════════════════════════
async function connectWithBackoff(entry, clientKey) {
  const state = reconnectState.get(clientKey) || {
    attempts: 0,
    nextRetryAt: 0,
  };

  if (Date.now() < state.nextRetryAt) return false;

  try {
    await entry.client.connect();
    console.log(
      `[plcCollector-${STATION_SLUG}] ✅ PLC ${entry.device.name} connected!`,
    );
    return true;
  } catch (e) {
    state.attempts++;
    const delay = Math.min(1000 * Math.pow(2, state.attempts), MAX_BACKOFF_MS);
    state.nextRetryAt = Date.now() + delay;
    reconnectState.set(clientKey, state);

    if (state.attempts <= 3 || state.attempts % 10 === 0) {
      console.warn(
        `[plcCollector-${STATION_SLUG}] PLC ${entry.device.name} connect failed (#${state.attempts}), retry in ${delay / 1000}s`,
      );
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// POLLING
// ═══════════════════════════════════════════════════════
async function pollAllDevices() {
  const promises = [];
  for (const [clientKey, entry] of clients) {
    promises.push(pollDevice(clientKey, entry));
  }
  await Promise.allSettled(promises);
}

async function pollDevice(clientKey, entry) {
  const { device, client, tags } = entry;

  if (!client.connected) {
    const ok = await connectWithBackoff(entry, clientKey);
    if (!ok) {
      const prevStatus = deviceStatusCache.get(clientKey);
      if (prevStatus !== "DISCONNECTED") {
        deviceStatusCache.set(clientKey, "DISCONNECTED");
        pool
          .query(
            "UPDATE plc_devices SET status = 'DISCONNECTED' WHERE id = $1",
            [device.id],
          )
          .catch(() => { });
      }
      return;
    }

    if (entry.protocol === 'OPC_UA' && ok) {
      try {
        await client.subscribeTags(tags, (tagId, newValue) => {
          handleOpcUaValueChanged(clientKey, entry, tagId, newValue);
        });
      } catch (e) {
        console.error(`[plcCollector-${STATION_SLUG}] OPC UA Subscribe Error:`, e.message);
      }
    }
  }

  const connStatus = deviceStatusCache.get(clientKey);
  if (connStatus !== "CONNECTED") {
    deviceStatusCache.set(clientKey, "CONNECTED");
    pool
      .query(
        "UPDATE plc_devices SET status = 'CONNECTED', last_seen_at = CURRENT_TIMESTAMP WHERE id = $1",
        [device.id],
      )
      .catch(() => { });
  }

  if (!tags.length) return;

  if (entry.protocol === 'OPC_UA') {
    const lastBeat = deviceHeartbeat.get(clientKey) || 0;
    if (Date.now() - lastBeat > 30000) {
      deviceHeartbeat.set(clientKey, Date.now());
      pool
        .query("UPDATE plc_devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1", [
          device.id,
        ])
        .catch(() => { });
    }
    return;
  }

  try {
    const results = await client.readMultipleTags(tags);

    const state = reconnectState.get(clientKey);
    if (state && state.attempts > 0) {
      state.attempts = 0;
      state.nextRetryAt = 0;
      reconnectState.set(clientKey, state);
    }

    const batchPayload = [];
    const changedValues = [];

    for (const tag of tags) {
      const value = results.get(tag.id);
      if (value === undefined) continue;

      const sVal = String(value);
      const valToSave =
        tag.data_type === "BOOL"
          ? sVal === "true" || sVal === "1"
            ? "1"
            : "0"
          : sVal;

      const numericValue =
        tag.data_type === "BOOL"
          ? valToSave === "1"
            ? 1
            : 0
          : parseFloat(valToSave) || 0;

      batchPayload.push({
        id: tag.id,
        tag: tag.tag_name,
        value: numericValue,
      });

      const oldValue = liveDataCache[tag.tag_name];
      liveDataCache[tag.tag_name] = value;

      checkThreshold(tag.tag_name, value, oldValue);

      if (hasValueChanged(clientKey, tag.id, tag.data_type, valToSave)) {
        changedValues.push([tag.id, valToSave]);
        updateLastValue(clientKey, tag.id, valToSave);

        const lastLogTime = lastEventLogTimes.get(tag.tag_name) || 0;
        const nowMs = Date.now();
        if (nowMs - lastLogTime >= EVENT_LOG_INTERVAL_MS) {
          lastEventLogTimes.set(tag.tag_name, nowMs);
          pool
            .query(
              `INSERT INTO station_event_logs (tag_name, old_value, new_value, severity, source, timestamp)
               VALUES ($1, $2, $3, 'INFO', 'PLC', CURRENT_TIMESTAMP)`,
              [tag.tag_name, oldValue !== undefined ? String(oldValue) : null, valToSave]
            )
            .catch(() => { });
        }
      } else {
        const lastLogTime = lastEventLogTimes.get(tag.tag_name) || 0;
        const nowMs = Date.now();
        if (nowMs - lastLogTime >= EVENT_HEARTBEAT_MS) {
          lastEventLogTimes.set(tag.tag_name, nowMs);
          pool
            .query(
              `INSERT INTO station_event_logs (tag_name, old_value, new_value, severity, source, timestamp)
               VALUES ($1, $2, $3, 'INFO', 'HEARTBEAT', CURRENT_TIMESTAMP)`,
              [tag.tag_name, valToSave, valToSave]
            )
            .catch(() => { });
        }
      }
    }

    if (redisConnected && batchPayload.length > 0) {
      redisPublisher
        .publish(
          REDIS_CHANNEL,
          JSON.stringify({
            deviceId: device.id,
            ip: device.ip_address,
            timestamp: Date.now(),
            tags: batchPayload,
            stationSlug: STATION_SLUG,
          }),
        )
        .catch(() => { });
    }

    try {
      if (changedValues.length > 0) {
        const valPlaceholders = [];
        const valParams = [];
        changedValues.forEach(([tId, v], idx) => {
          valPlaceholders.push(`($${idx * 2 + 1}, $${idx * 2 + 2})`);
          valParams.push(tId, v);
        });

        await pool.query(
          `INSERT INTO plc_tag_values (tag_id, value) VALUES ${valPlaceholders.join(", ")}`,
          valParams,
        );
        await pool.query(
          `INSERT INTO plc_tag_latest (tag_id, value) VALUES ${valPlaceholders.join(", ")} ON CONFLICT (tag_id) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          valParams,
        );
      }
    } catch (dbErr) {
      console.error(`[plcCollector-${STATION_SLUG}] DB Insert Error:`, dbErr.message);
    }

    const prevStatus = deviceStatusCache.get(clientKey);
    if (prevStatus !== "CONNECTED") {
      deviceStatusCache.set(clientKey, "CONNECTED");
      pool
        .query(
          "UPDATE plc_devices SET status = 'CONNECTED', last_seen_at = CURRENT_TIMESTAMP WHERE id = $1",
          [device.id],
        )
        .catch(() => { });
    }

    const lastBeat = deviceHeartbeat.get(clientKey) || 0;
    if (Date.now() - lastBeat > 30000) {
      deviceHeartbeat.set(clientKey, Date.now());
      pool
        .query("UPDATE plc_devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1", [
          device.id,
        ])
        .catch(() => { });
    }
  } catch (e) {
    if (client.isNetworkError(e.message)) {
      client.disconnect();
      const prevStatus = deviceStatusCache.get(clientKey);
      if (prevStatus !== "DISCONNECTED") {
        deviceStatusCache.set(clientKey, "DISCONNECTED");
        pool
          .query(
            "UPDATE plc_devices SET status = 'DISCONNECTED' WHERE id = $1",
            [device.id],
          )
          .catch(() => { });
      }
    }
  }
}

function handleOpcUaValueChanged(clientKey, entry, tagId, newValue) {
  const { device, tags } = entry;
  const tag = tags.find(t => t.id === tagId);
  if (!tag) return;

  const sVal = String(newValue);
  const valToSave =
    tag.data_type === "BOOL"
      ? sVal === "true" || sVal === "1"
        ? "1"
        : "0"
      : sVal;

  const numericValue =
    tag.data_type === "BOOL"
      ? valToSave === "1"
        ? 1
        : 0
      : parseFloat(valToSave) || 0;

  const batchPayload = [{
    id: tag.id,
    tag: tag.tag_name,
    value: numericValue,
  }];

  const oldValue = liveDataCache[tag.tag_name];
  liveDataCache[tag.tag_name] = newValue;

  checkThreshold(tag.tag_name, newValue, oldValue);

  if (hasValueChanged(clientKey, tag.id, tag.data_type, valToSave)) {
    updateLastValue(clientKey, tag.id, valToSave);

    const lastLogTime = lastEventLogTimes.get(tag.tag_name) || 0;
    const nowMs = Date.now();
    if (nowMs - lastLogTime >= EVENT_LOG_INTERVAL_MS) {
      lastEventLogTimes.set(tag.tag_name, nowMs);
      pool
        .query(
          `INSERT INTO station_event_logs (tag_name, old_value, new_value, severity, source, timestamp)
           VALUES ($1, $2, $3, 'INFO', 'PLC', CURRENT_TIMESTAMP)`,
          [tag.tag_name, oldValue !== undefined ? String(oldValue) : null, valToSave]
        )
        .catch(() => { });
    }

    pool.query(`INSERT INTO plc_tag_values (tag_id, value) VALUES ($1, $2)`, [tag.id, valToSave]).catch(() => { });
    pool.query(`INSERT INTO plc_tag_latest (tag_id, value) VALUES ($1, $2) ON CONFLICT (tag_id) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`, [tag.id, valToSave]).catch(() => { });
  }

  if (redisConnected && batchPayload.length > 0) {
    redisPublisher
      .publish(
        REDIS_CHANNEL,
        JSON.stringify({
          deviceId: device.id,
          ip: device.ip_address,
          timestamp: Date.now(),
          tags: batchPayload,
          stationSlug: STATION_SLUG,
        }),
      )
      .catch(() => { });
  }
}

function hasValueChanged(clientKey, tagId, dataType, newValue) {
  const key = `${clientKey}:${tagId}`;
  if (!lastTagValues.has(key)) return true;
  const last = lastTagValues.get(key);

  if (dataType === "REAL") {
    const diff = Math.abs(parseFloat(last) - parseFloat(newValue));
    return diff > 0.05;
  }
  return last !== newValue;
}

function updateLastValue(clientKey, tagId, value) {
  lastTagValues.set(`${clientKey}:${tagId}`, value);
}

function checkThreshold(tagName, currentVal, prevVal) {
  const thresh = thresholds[tagName];
  if (!thresh) return;

  const val = parseFloat(currentVal);
  if (isNaN(val)) return;

  let state = "NORMAL";
  if (thresh.danger !== null && val >= thresh.danger) {
    state = "DANGER";
  } else if (thresh.warning !== null && val >= thresh.warning) {
    state = "WARNING";
  }

  const prevState = alarmStates[tagName] || "NORMAL";
  if (state !== prevState) {
    alarmStates[tagName] = state;
    if (state !== "NORMAL") {
      console.warn(
        `[plcCollector-${STATION_SLUG}] ⚠️ ALARM ${tagName}: ${val} (state: ${state})`,
      );
    }
  }
}
