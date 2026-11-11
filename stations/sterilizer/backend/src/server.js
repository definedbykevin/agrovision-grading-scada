import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import monitorRoutes from "./routes/monitorRoutes.js";
import logsheetRoutes from "./routes/logsheetRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import plcConfigRoutes from "./routes/plcConfigRoutes.js";
import sterilizerAiRoutes from "./routes/sterilizerAiRoutes.js";
import { startPlcCollector } from "./plcCollector.js";

dotenv.config();

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3100;
const STATION_SLUG = process.env.STATION_SLUG || "template";

// ── Middleware ──
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Routes (Dynamic based on STATION_SLUG) ──
app.use(`/api/${STATION_SLUG}/monitor`, monitorRoutes);
app.use(`/api/${STATION_SLUG}/logsheet`, logsheetRoutes);
app.use(`/api/${STATION_SLUG}/settings`, settingsRoutes);
app.use(`/api/${STATION_SLUG}/plc-config`, plcConfigRoutes);
app.use(`/api/${STATION_SLUG}/ai`, sterilizerAiRoutes);

// ── Health ──
app.get("/health", (_req, res) => {
  res.json({ status: "ok", station: STATION_SLUG, mill: "KIP" });
});

// ── Start Server & Redis Alarm Worker ──
app.listen(PORT, "0.0.0.0", () => {
  const jwtSecretPreview =
    (process.env.JWT_SECRET || "jwt_change_me_in_production").substring(0, 8) +
    "...";
  console.log(
    `[station-${STATION_SLUG}] listening on port ${PORT} | JWT_SECRET: ${jwtSecretPreview} | REDIS_URL: ${process.env.REDIS_URL || "(default)"}`,
  );

  // Start the PLC collector (Snap7 polling + Redis pub/sub)
  startPlcCollector().catch((err) => {
    console.error(
      `[station-${STATION_SLUG}] Failed to start PLC collector:`,
      err.message,
    );
  });
});

process.on("unhandledRejection", (reason) => {
  console.error(`[station-${STATION_SLUG}] Unhandled Rejection:`, reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error(`[station-${STATION_SLUG}] Uncaught Exception:`, err?.message || err);
});
