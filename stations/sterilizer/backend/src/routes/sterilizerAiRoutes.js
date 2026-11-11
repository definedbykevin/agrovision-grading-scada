import express from "express";
import http from "http";

const router = express.Router();
const AI_BACKEND_HOST = process.env.AI_BACKEND_HOST || "127.0.0.1";
const AI_BACKEND_PORT = parseInt(process.env.AI_BACKEND_PORT || "4105", 10);

/**
 * Helper to proxy HTTP JSON / CRUD requests to Python AI Service
 */
function forwardJsonRequest(method, targetPath, req, res) {
  const queryStr = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const options = {
    hostname: AI_BACKEND_HOST,
    port: AI_BACKEND_PORT,
    path: `${targetPath}${queryStr}`,
    method: method,
    headers: {
      ...req.headers,
      host: `${AI_BACKEND_HOST}:${AI_BACKEND_PORT}`,
    },
  };

  // Remove content-length header if body is empty
  if (!req.body || Object.keys(req.body).length === 0) {
    delete options.headers["content-length"];
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[Sterilizer AI Proxy Error] ${method} ${targetPath}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: "Unable to reach Sterilizer AI service (port 4105)",
        error: err.message,
      });
    }
  });

  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }

  proxyReq.end();
}

/**
 * 📹 LIVE MJPEG STREAM PROXY:
 * GET /api/sterilizer/ai/stream
 */
router.get("/stream", (req, res) => {
  const queryStr = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const upstreamPath = `/api/sterilizer-ai/stream${queryStr}`;

  const options = {
    hostname: AI_BACKEND_HOST,
    port: AI_BACKEND_PORT,
    path: upstreamPath,
    method: "GET",
    headers: {
      "Connection": "keep-alive",
    },
  };

  const proxyReq = http.request(options, (upstreamRes) => {
    // Pass MJPEG headers (Content-Type: multipart/x-mixed-replace; boundary=frame)
    // dan instruksikan Nginx / Cloudflare untuk TIDAK membuffering stream
    res.writeHead(upstreamRes.statusCode, {
      ...upstreamRes.headers,
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    upstreamRes.pipe(res);

    upstreamRes.on("error", (err) => {
      console.error("[Sterilizer AI Stream Error]:", err.message);
      if (!res.headersSent) {
        res.status(502).send("Stream forwarding error");
      }
    });
  });

  proxyReq.on("error", (err) => {
    console.error("[Sterilizer AI Stream Proxy Connection Error]:", err.message);
    if (!res.headersSent) {
      res.status(502).send("Cannot connect to AI stream service");
    }
  });

  req.on("close", () => {
    proxyReq.destroy();
  });

  proxyReq.end();
});

/**
 * 🩺 HEALTH CHECK:
 * GET /api/sterilizer/ai/health
 */
router.get("/health", (req, res) => {
  forwardJsonRequest("GET", "/api/sterilizer-ai/health", req, res);
});

/**
 * 📊 TELEMETRY STATS:
 * GET /api/sterilizer/ai/stats
 */
router.get("/stats", (req, res) => {
  forwardJsonRequest("GET", "/api/sterilizer-ai/stats", req, res);
});

/**
 * 🎯 CURRENT DECISION:
 * GET /api/sterilizer/ai/current
 */
router.get("/current", (req, res) => {
  forwardJsonRequest("GET", "/api/sterilizer-ai/current", req, res);
});

/**
 * ⚙️ CAMERAS CRUD (Used by Dev Ctrl+X Modal):
 * GET /api/sterilizer/ai/cameras
 * PUT /api/sterilizer/ai/cameras/:id
 */
router.get("/cameras", (req, res) => {
  forwardJsonRequest("GET", "/cameras", req, res);
});

router.put("/cameras/:id", (req, res) => {
  forwardJsonRequest("PUT", `/cameras/${req.params.id}`, req, res);
});

/**
 * 🔄 CYCLE MANAGEMENT & INLET SIMULATION:
 * GET /api/sterilizer/ai/cycle/status
 * POST /api/sterilizer/ai/cycle/toggle
 */
router.get("/cycle/status", (req, res) => {
  forwardJsonRequest("GET", "/api/sterilizer-ai/cycle/status", req, res);
});

router.post("/cycle/toggle", (req, res) => {
  forwardJsonRequest("POST", "/api/sterilizer-ai/cycle/toggle", req, res);
});

/**
 * 📸 CAPTURE SERVING:
 * GET /api/sterilizer/ai/captures/*
 */
router.get("/captures/*", (req, res) => {
  const subPath = req.params[0] || "";
  forwardJsonRequest("GET", `/api/sterilizer-ai/captures/${subPath}`, req, res);
});

router.get("/detections/raw", (req, res) => {
  forwardJsonRequest("GET", "/api/sterilizer-ai/detections/raw", req, res);
});

router.get("/cycles/summaries", (req, res) => {
  forwardJsonRequest("GET", "/api/sterilizer-ai/cycles/summaries", req, res);
});

export default router;
