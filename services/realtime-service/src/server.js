import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dbPool } from "./config/db.js";
import plcRoutes from "./routes/plcRoutes.js";
import plcConfigRoutes from "./routes/plcConfigRoutes.js";

dotenv.config();

// ═══════════════════════════════════════════════════════
// DYNAMIC STATION REGISTRY — loaded from agrovision_config
// ═══════════════════════════════════════════════════════
let STATIONS = [];
let PREFIX_MAP = [];
let DB_MAP = []; // maps slug → real db_name

async function loadStationRegistry() {
  let pool = dbPool;
  try {
    const [rows] = await pool.query(
      `SELECT slug, title, db_name, tag_prefixes
       FROM agrovision_config.station_registry
       WHERE is_active = 1
       ORDER BY sort_order`,
    );
    STATIONS = rows.map((r) => r.db_name);
    PREFIX_MAP = rows.map((r) => ({
      slug: r.slug,
      prefixes: typeof r.tag_prefixes === 'string' ? JSON.parse(r.tag_prefixes || "[]") : (r.tag_prefixes || []),
    }));
    DB_MAP = rows.map((r) => ({ slug: r.slug, dbName: r.db_name }));
    console.log(
      `[realtime-service] Loaded ${STATIONS.length} active stations from registry`,
    );
  } catch (err) {
    try {
      const mysql = await import("mysql2/promise");
      const configPool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "kip_backend",
        password: process.env.DB_PASSWORD || "",
        database: "agrovision_config",
        waitForConnections: true,
        connectionLimit: 2,
      });
      const [rows] = await configPool.query(
        "SELECT slug, title, db_name, tag_prefixes FROM station_registry WHERE is_active = 1 ORDER BY sort_order",
      );
      STATIONS = rows.map((r) => r.db_name);
      PREFIX_MAP = rows.map((r) => ({
        slug: r.slug,
        prefixes: typeof r.tag_prefixes === 'string' ? JSON.parse(r.tag_prefixes || "[]") : (r.tag_prefixes || []),
      }));
      DB_MAP = rows.map((r) => ({ slug: r.slug, dbName: r.db_name }));
      await configPool.end();
      console.log(
        `[realtime-service] Loaded ${STATIONS.length} active stations (via config pool)`,
      );
    } catch (err2) {
      console.error(
        "[realtime-service] Failed to load station registry (all attempts):",
        err2.message,
      );
    }
  }
}

const PORT = process.env.PORT || 3002;
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || "kip:plc:data";

const app = express();
const httpServer = createServer(app);

// ── Middleware ──
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Socket.IO ──
const io = new Server(httpServer, {
  cors: { origin: corsOrigins, methods: ["GET", "POST"], credentials: true },
});

// ── Redis Subscriber with Auto-Reconnect & In-Memory Tag Snapshot ──
let redisSubscriber = null;
let isRedisSubscribed = false;
const latestTagsCache = new Map();

async function startRedisSubscriber() {
  try {
    if (redisSubscriber && redisSubscriber.isOpen) {
      try { await redisSubscriber.quit(); } catch {}
    }

    redisSubscriber = createClient({ 
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 200, 3000)
      }
    });

    redisSubscriber.on("connect", () => {
      console.log("[realtime-service] Redis socket connected");
    });

    redisSubscriber.on("ready", () => {
      console.log("[realtime-service] Redis subscriber READY");
    });

    redisSubscriber.on("error", (err) => {
      console.error("[realtime-service] Redis error:", err.message);
    });

    await redisSubscriber.connect();

    await redisSubscriber.subscribe(REDIS_CHANNEL, (message) => {
      try {
        const payload = JSON.parse(message);
        if (Array.isArray(payload.tags)) {
          for (const t of payload.tags) {
            latestTagsCache.set(t.tag, {
              id: t.id || null,
              tag: t.tag,
              value: t.value,
            });
          }
        }
        io.emit("plc:batch", payload);
      } catch (e) {}
    });

    isRedisSubscribed = true;
    console.log(`[realtime-service] ✅ Successfully subscribed to Redis channel: ${REDIS_CHANNEL}`);
  } catch (err) {
    isRedisSubscribed = false;
    console.error(`[realtime-service] Redis connection failed, retrying in 2s: ${err.message}`);
    setTimeout(startRedisSubscriber, 2000);
  }
}

startRedisSubscriber();

// ── Persistent Redis Publisher for high-speed writes ──
const redisPublisher = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 200, 3000)
  }
});
redisPublisher.on("error", (err) => console.warn("[realtime-service] Redis publisher error:", err.message));
redisPublisher.connect().catch((err) => console.error("[realtime-service] Redis publisher connect error:", err.message));

function resolveStationSlug(tagName) {
  if (!tagName) return "sterilizer";
  const tn = String(tagName).toUpperCase();
  if (tn.startsWith("STERI_") || tn.includes("STERILIZER")) return "sterilizer";
  if (tn.startsWith("THRESH_") || tn.includes("THRESHING")) return "threshing";
  if (tn.startsWith("PRESS_") || tn.includes("PRESS")) return "press";
  if (tn.startsWith("KERNEL_") || tn.includes("KERNEL")) return "kernel-plant";
  if (tn.startsWith("BOILER_") || tn.includes("BOILER")) return "boiler-house";
  if (tn.startsWith("ENGINE_") || tn.includes("ENGINE")) return "engine-room";
  return "sterilizer";
}

// ── Socket.IO connection handler ──
io.on("connection", (socket) => {
  console.log(`[realtime-service] Frontend connected: ${socket.id}`);

  // Send instant in-memory snapshot on connect (0ms latency)
  if (latestTagsCache.size > 0) {
    socket.emit("plc:batch", {
      deviceId: null,
      timestamp: Date.now(),
      tags: Array.from(latestTagsCache.values()),
      source: "MEMORY_SNAPSHOT",
    });
  }

  // Frontend → PLC command
  socket.on("plc:write", async ({ tagId, value, tagName, stationSlug }) => {
    try {
      const resolvedSlug =
        stationSlug || resolveStationSlug(tagName) || "sterilizer";

      console.log(`[realtime-service] 📤 plc:write → slug=${resolvedSlug} tagId=${tagId} value=${value}`);

      if (!redisPublisher.isOpen) {
        await redisPublisher.connect();
      }

      // Publish command to Redis → station collector will pick it up and write to PLC
      await redisPublisher.publish(
        "kip:plc:command",
        JSON.stringify({
          tagId,
          value,
          stationSlug: resolvedSlug,
        }),
      );

      socket.emit("plc:command:ack", { success: true, tagId });
    } catch (err) {
      console.error("[realtime-service] plc:write error:", err.message);
      socket.emit("plc:command:ack", { success: false, error: err.message, tagId });
    }
  });

  socket.on("disconnect", () =>
    console.log(`[realtime-service] Frontend disconnected: ${socket.id}`),
  );
});

// ── REST Routes ──
app.use("/api/plc", plcRoutes);
app.use("/api/plc-config", plcConfigRoutes);

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "realtime-service", mill: "KIP" }),
);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[realtime-service] listening on port ${PORT} (Socket.IO + REST)`,
  );
});
