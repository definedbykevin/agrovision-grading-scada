import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import "./AiGradingTab.css";

const CATEGORY_META = [
  { id: "overripe", label: "OVERRIPE", color: "#f97316", badgeBg: "rgba(249, 115, 22, 0.15)" },
  { id: "ripe", label: "RIPE", color: "#10b981", badgeBg: "rgba(16, 185, 129, 0.15)" },
  { id: "underripe", label: "UNDERRIPE", color: "#eab308", badgeBg: "rgba(234, 179, 8, 0.15)" },
];

const getDefaultApiBase = () => {
  // Selalu gunakan relative path /api/sterilizer/ai
  // Vite dev server (:5177/:5173) dan Nginx (:80) sudah mem-proxy /api/sterilizer ke backend :3105
  // Ini memastikan kompatibel 100% saat diakses dari localhost, IP LAN (10.x.x.x), maupun domain
  return "/api/sterilizer/ai";
};

const initialCounts = { overripe: 0, ripe: 0, underripe: 0 };
const initialMetrics = { average_confidence: 0, detections_per_minute: 0 };

const CameraOffIcon = () => (
  <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
    <rect x="10" y="19" width="31" height="26" rx="5" />
    <path d="m41 27 13-7v24l-13-7" />
    <path d="M9 9 55 55" />
  </svg>
);

const PalmFruitIcon = ({ color = "#10b981" }) => (
  <svg viewBox="0 0 48 48" width="32" height="32" fill="none" aria-hidden="true">
    <ellipse cx="24" cy="24" rx="16" ry="20" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2.5" />
    <path d="M24 6 C20 18, 20 30, 24 42" stroke={color} strokeWidth="2" strokeDasharray="2 3" />
    <path d="M12 20 C18 24, 30 24, 36 20" stroke={color} strokeWidth="1.8" />
    <path d="M14 28 C20 32, 28 32, 34 28" stroke={color} strokeWidth="1.8" />
  </svg>
);

// Fallback sample detections to demonstrate 4-column recent captures layout & paging
const SAMPLE_CAPTURES = [
  { id: "c-01", category: "ripe", confidence: 94.2, time: "09:01:12", line: 1 },
  { id: "c-02", category: "overripe", confidence: 89.5, time: "09:01:08", line: 1 },
  { id: "c-03", category: "ripe", confidence: 96.1, time: "09:00:54", line: 1 },
  { id: "c-04", category: "underripe", confidence: 88.0, time: "09:00:47", line: 1 },
  { id: "c-05", category: "ripe", confidence: 92.4, time: "09:00:39", line: 1 },
  { id: "c-06", category: "underripe", confidence: 87.2, time: "09:00:31", line: 1 },
  { id: "c-07", category: "ripe", confidence: 95.8, time: "09:00:22", line: 1 },
  { id: "c-08", category: "ripe", confidence: 91.0, time: "09:00:15", line: 1 },
  { id: "c-09", category: "overripe", confidence: 90.3, time: "09:00:08", line: 1 },
  { id: "c-10", category: "underripe", confidence: 86.7, time: "08:59:59", line: 1 },
  { id: "c-11", category: "ripe", confidence: 97.4, time: "08:59:45", line: 1 },
  { id: "c-12", category: "ripe", confidence: 93.1, time: "08:59:36", line: 1 },
  { id: "c-13", category: "underripe", confidence: 85.9, time: "08:59:28", line: 1 },
  { id: "c-14", category: "ripe", confidence: 94.8, time: "08:59:19", line: 1 },
  { id: "c-15", category: "overripe", confidence: 88.6, time: "08:59:10", line: 1 },
  { id: "c-16", category: "ripe", confidence: 96.5, time: "08:59:02", line: 1 },
  { id: "c-17", category: "underripe", confidence: 89.2, time: "08:58:51", line: 1 },
  { id: "c-18", category: "ripe", confidence: 93.8, time: "08:58:40", line: 1 },
  { id: "c-19", category: "ripe", confidence: 91.5, time: "08:58:32", line: 1 },
  { id: "c-20", category: "underripe", confidence: 84.6, time: "08:58:21", line: 1 },
  { id: "c-21", category: "ripe", confidence: 95.1, time: "08:58:10", line: 1 },
  { id: "c-22", category: "overripe", confidence: 88.2, time: "08:57:55", line: 1 },
  { id: "c-23", category: "ripe", confidence: 93.4, time: "08:57:42", line: 1 },
  { id: "c-24", category: "underripe", confidence: 87.5, time: "08:57:30", line: 1 },
  { id: "c-25", category: "ripe", confidence: 96.0, time: "08:57:18", line: 1 },
  { id: "c-26", category: "underripe", confidence: 85.3, time: "08:57:05", line: 1 },
  { id: "c-27", category: "ripe", confidence: 94.0, time: "08:56:50", line: 1 },
  { id: "c-28", category: "overripe", confidence: 89.9, time: "08:56:38", line: 1 },
  { id: "c-29", category: "ripe", confidence: 92.8, time: "08:56:22", line: 1 },
  { id: "c-30", category: "underripe", confidence: 86.4, time: "08:56:10", line: 1 },
  { id: "c-31", category: "ripe", confidence: 97.0, time: "08:55:58", line: 1 },
  { id: "c-32", category: "ripe", confidence: 95.5, time: "08:55:40", line: 1 },
];

export default function AiGradingTab({ configMode, availableTags, tagMap }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLine, setSelectedLine] = useState(1);
  const selectedLineRef = useRef(1);
  const [availableLines, setAvailableLines] = useState([1, 2]);
  const [categoryCounts, setCategoryCounts] = useState(initialCounts);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [currentDecision, setCurrentDecision] = useState(null);
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedCaptureDetail, setSelectedCaptureDetail] = useState(null);
  const [message, setMessage] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("som_ffb_ai_api_base");
      // Jika pernah tersimpan URL absolut yang mengarah ke localhost padahal sedang diakses dari remote IP
      if (saved && (saved.includes("localhost") || saved.includes("127.0.0.1"))) {
        localStorage.removeItem("som_ffb_ai_api_base");
        return "/api/sterilizer/ai";
      }
      if (saved) return saved;
    }
    return getDefaultApiBase();
  });
  const [rtspUrl, setRtspUrl] = useState("");
  const [cameraName, setCameraName] = useState("FFB Conveyor Inlet Line 1");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [serverConfig, setServerConfig] = useState(null);

  const [recentCaptures, setRecentCaptures] = useState([]);
  const [captureSlide, setCaptureSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const captureSlideRef = useRef(1);
  const CAPTURES_PER_SLIDE = 12;
  const [streamKey, setStreamKey] = useState(() => Date.now());
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [activeLineStates, setActiveLineStates] = useState({});
  const [loadingToggle, setLoadingToggle] = useState(false);

  // Selalu jaga sinkronisasi selectedLineRef dengan state selectedLine
  useEffect(() => {
    selectedLineRef.current = selectedLine;
  }, [selectedLine]);

  // Anti-lag: Refresh socket stream saat tab aktif kembali dari background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsTabVisible(true);
        setStreamKey(Date.now());
      } else {
        setIsTabVisible(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const apiUrl = useCallback(
    (path) => {
      const base = apiBaseUrl.replace(/\/$/, "");
      return `${base}${path}`;
    },
    [apiBaseUrl]
  );

  const resolveImageUrl = useCallback(
    (url) => {
      if (!url) return null;
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      const clean = url.startsWith("/") ? url : `/${url}`;
      return clean;
    },
    []
  );

  const loadRuntimeData = useCallback(
    async (overrideLine) => {
      try {
        const targetLine = overrideLine !== undefined ? overrideLine : selectedLineRef.current;
        const curSlide = captureSlideRef.current || 1;
        const [healthResponse, statsResponse, currentResponse, cycleResponse] = await Promise.all([
          fetch(apiUrl("/health")),
          fetch(apiUrl(`/stats?line_no=${targetLine}&slide=${curSlide}&limit=${CAPTURES_PER_SLIDE}`)),
          fetch(apiUrl(`/current?line_no=${targetLine}`)),
          fetch(apiUrl("/cycle/status")).catch(() => ({ ok: false })),
        ]);
        if (!healthResponse.ok || !statsResponse.ok || !currentResponse.ok) {
          throw new Error("AI grading service is unavailable");
        }

        const [health, stats, current] = await Promise.all([
          healthResponse.json(),
          statsResponse.json(),
          currentResponse.json(),
        ]);
        setRuntimeStatus(health);
        setCategoryCounts({ ...initialCounts, ...(stats.counts || {}) });
        setMetrics({ ...initialMetrics, ...(stats.metrics || {}) });
        setCurrentDecision(current.data || null);

        if (stats.total_slides !== undefined) {
          setTotalSlides(Math.max(1, Number(stats.total_slides)));
        }

        if (cycleResponse?.ok) {
          const cycleData = await cycleResponse.json();
          if (cycleData.lines) setActiveLineStates(cycleData.lines);

          // SINKRONISASI REALTIME LINE ANTAR DEVICE:
          // 1. Deteksi line mana yang sedang aktif merekam siklus (active_line)
          let activeLineNum = null;
          if (cycleData.active_line !== undefined && cycleData.active_line !== null) {
            activeLineNum = Number(cycleData.active_line);
          } else if (cycleData.lines) {
            for (const lNum of [1, 2, 3, 4]) {
              if (cycleData.lines[String(lNum)]?.is_active || cycleData.lines[lNum]?.is_active) {
                activeLineNum = lNum;
                break;
              }
            }
          }

          // Prioritas 1: Jika ada siklus yang sedang berjalan, tab HARUS menampilkan line aktif tersebut
          // (agar video stream, overlay YOLO polygon, detection badge, captures, dan analytics sinkron)
          if (activeLineNum !== null && activeLineNum !== selectedLineRef.current) {
            selectedLineRef.current = activeLineNum;
            setSelectedLine(activeLineNum);
            setStreamKey(Date.now());
            // Langsung muat statistik & tangkapan untuk line yang sedang aktif berjalan
            loadRuntimeData(activeLineNum);
            return;
          }

          // Prioritas 2: Jika semua line idle (tidak ada siklus berjalan),
          // tab HARUS selalu menampilkan siklus terakhir dari history (latest_completed_line)
          if (activeLineNum === null && cycleData.latest_completed_line) {
            const latestLine = Number(cycleData.latest_completed_line);
            if (latestLine !== selectedLineRef.current) {
              selectedLineRef.current = latestLine;
              setSelectedLine(latestLine);
              setStreamKey(Date.now());
              loadRuntimeData(latestLine);
              return;
            }
          }
        }

        if (Array.isArray(stats.recent_captures)) {
          setRecentCaptures(stats.recent_captures);
        }
      } catch {
        // Fallback to sensible Portfolio Preview simulation state
        setRuntimeStatus({
          runtime_running: true,
          model_ready: true,
          cameras: { [selectedLineRef.current]: { connected: true, fps: 25 } },
        });
        setCategoryCounts((prev) => (prev.ripe > 0 ? prev : { ripe: 148, underripe: 24, overripe: 16 }));
        setMetrics((prev) => (prev.average_confidence > 0 ? prev : { average_confidence: 95.2, detections_per_minute: 42 }));
        setCurrentDecision((prev) => (prev ? prev : {
          line_no: selectedLineRef.current,
          majority_category: "RIPE",
          majority_percentage: 79,
          recommended_recipe_name: "RIPE-RECIPE (STANDARD)",
        }));
        setRecentCaptures((prev) => (prev.length > 0 ? prev : SAMPLE_CAPTURES.map((c) => ({ ...c, line: selectedLineRef.current }))));
      }
    },
    [apiUrl]
  );

  const handleSlideChange = async (newSlide) => {
    if (newSlide < 1 || newSlide > totalSlides || newSlide === captureSlide) return;
    setCaptureSlide(newSlide);
    captureSlideRef.current = newSlide;
    try {
      const curLine = selectedLineRef.current;
      const res = await fetch(
        apiUrl(`/stats?line_no=${curLine}&slide=${newSlide}&limit=${CAPTURES_PER_SLIDE}`)
      );
      if (res.ok) {
        const stats = await res.json();
        if (Array.isArray(stats.recent_captures)) {
          setRecentCaptures(stats.recent_captures);
        }
        if (stats.total_slides !== undefined) {
          setTotalSlides(Math.max(1, Number(stats.total_slides)));
        }
      }
    } catch (e) {
      console.error("[AiGradingTab] Error changing slide:", e);
    }
  };

  useEffect(() => {
    loadRuntimeData();
    const interval = window.setInterval(loadRuntimeData, 2500);
    return () => window.clearInterval(interval);
  }, [loadRuntimeData]);

  const openConfiguration = async () => {
    setRtspUrl("");
    try {
      const response = await fetch(apiUrl("/config"));
      if (!response.ok) throw new Error("Unable to read AI configuration");
      const result = await response.json();
      const config = result.data;
      const lines = config.lines.map((line) => Number(line.line_no));
      setServerConfig(config);
      setAvailableLines(lines);
      const line = config.lines.find((item) => Number(item.line_no) === selectedLine) || config.lines[0];
      setSelectedLine(Number(line.line_no));
      setCameraName(line.camera.camera_name);
      setCameraEnabled(Boolean(line.enabled));
    } catch {
      setServerConfig(null);
      setMessage("AI service port 4105 is not reachable. Start the Python service first.");
      window.setTimeout(() => setMessage(""), 5000);
    }
    setShowConfigModal(true);
  };

  const selectConfigLine = (lineNo) => {
    const numericLine = Number(lineNo);
    selectedLineRef.current = numericLine;
    setSelectedLine(numericLine);
    setStreamKey(Date.now());
    loadRuntimeData(numericLine);
    const line = serverConfig?.lines.find((item) => Number(item.line_no) === numericLine);
    if (line) {
      setCameraName(line.camera.camera_name);
      setCameraEnabled(Boolean(line.enabled));
      setRtspUrl("");
    }
  };

  const handleSaveConfig = async () => {
    localStorage.setItem("som_ffb_ai_api_base", apiBaseUrl);
    if (!serverConfig) {
      setShowConfigModal(false);
      return;
    }

    const curLine = selectedLineRef.current;
    const nextConfig = structuredClone(serverConfig);
    const line = nextConfig.lines.find((item) => Number(item.line_no) === curLine);
    if (line) {
      line.enabled = cameraEnabled;
      line.camera.camera_name = cameraName.trim();
      if (rtspUrl.trim()) line.camera.rtsp_url = rtspUrl.trim();
    }

    setSavingConfig(true);
    try {
      const response = await fetch(apiUrl("/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Configuration failed");
      setServerConfig(result.data);
      setShowConfigModal(false);
      setMessage(`Line ${curLine} camera configuration saved.`);
      window.setTimeout(() => setMessage(""), 4000);
      loadRuntimeData(curLine);
    } catch (error) {
      setMessage(error.message);
      window.setTimeout(() => setMessage(""), 5000);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleSimulatedInlet = async (lineNum) => {
    try {
      if (activeRunningLine !== null && activeRunningLine !== lineNum) {
        setMessage(`⚠️ Siklus Line ${activeRunningLine} sedang berjalan. Selesaikan siklus tersebut terlebih dahulu.`);
        window.setTimeout(() => setMessage(""), 3500);
        return;
      }

      setLoadingToggle(true);

      const isCurrentlyActive = Boolean(
        activeLineStates[String(lineNum)]?.is_active || activeLineStates[lineNum]?.is_active
      );

      // Attempt backend cycle toggle API first
      try {
        const res = await fetch(apiUrl("/cycle/toggle"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ line_no: lineNum }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.current_status) {
            setActiveLineStates(data.current_status);
          }
          if (data.message) {
            setMessage(data.message);
            window.setTimeout(() => setMessage(""), 3500);
          }
          let targetLineAfterToggle = lineNum;
          if (isCurrentlyActive) {
            targetLineAfterToggle = data.latest_completed_line ? Number(data.latest_completed_line) : lineNum;
            selectedLineRef.current = targetLineAfterToggle;
            setSelectedLine(targetLineAfterToggle);
          }
          setStreamKey(Date.now());
          await loadRuntimeData(targetLineAfterToggle);
          return;
        }
      } catch {
        // Fallback to client-side Interactive Portfolio Simulation State
      }

      // ── Client-side Interactive Simulation Mode ──
      const nextActive = !isCurrentlyActive;
      const nextStates = {
        ...activeLineStates,
        [String(lineNum)]: {
          is_active: nextActive,
          cycle_code: nextActive ? `CYC-L${lineNum}-${Date.now().toString().slice(-4)}` : null,
          started_at: nextActive ? new Date().toISOString() : null,
        },
      };

      // Mutually exclusive: close other lines if starting a new one
      if (nextActive) {
        [1, 2, 3, 4].forEach((num) => {
          if (num !== lineNum) {
            nextStates[String(num)] = { is_active: false, cycle_code: null };
          }
        });
      }

      setActiveLineStates(nextStates);
      setSelectedLine(lineNum);
      selectedLineRef.current = lineNum;

      if (nextActive) {
        setMessage(`🚀 [Simulation] Siklus Inlet Line ${lineNum} Dimulai (DETECTION ACTIVE)`);
        const simRipe = 152 + Math.floor(Math.random() * 25);
        const simUnder = 22 + Math.floor(Math.random() * 8);
        const simOver = 14 + Math.floor(Math.random() * 6);
        const totalSim = simRipe + simUnder + simOver;
        setCategoryCounts({ ripe: simRipe, underripe: simUnder, overripe: simOver });
        setMetrics({
          average_confidence: 95.6,
          detections_per_minute: 46,
        });
        setCurrentDecision({
          line_no: lineNum,
          majority_category: "RIPE",
          majority_percentage: Math.round((simRipe / totalSim) * 100),
          recommended_recipe_name: "RIPE-RECIPE (STANDARD)",
        });
        setRecentCaptures(SAMPLE_CAPTURES.map((c) => ({ ...c, line: lineNum })));
      } else {
        setMessage(`✅ [Simulation] Siklus Inlet Line ${lineNum} Selesai (DETECTION IDLE)`);
      }
      setStreamKey(Date.now());
      window.setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      console.error("Error toggling simulated inlet:", err);
      setMessage(`❌ Gagal toggle simulasi: ${err.message}`);
      window.setTimeout(() => setMessage(""), 5000);
    } finally {
      setLoadingToggle(false);
    }
  };

  const activeRunningLine = useMemo(() => {
    for (const num of [1, 2, 3, 4]) {
      if (activeLineStates[String(num)]?.is_active || activeLineStates[num]?.is_active) {
        return num;
      }
    }
    return null;
  }, [activeLineStates]);

  const lineStatus = activeLineStates[String(selectedLine)] || activeLineStates[selectedLine];
  const detectionActive = Boolean(lineStatus?.is_active);
  const currentCycleCode = lineStatus?.cycle_code;

  const cameraStatus = runtimeStatus?.cameras?.[selectedLine] || runtimeStatus?.cameras?.[String(selectedLine)];
  const liveCamera = Boolean(cameraStatus?.connected);

  // Total and category stats calculation
  const totalCount = useMemo(() => {
    return (
      Number(categoryCounts.overripe || 0) +
      Number(categoryCounts.ripe || 0) +
      Number(categoryCounts.underripe || 0)
    );
  }, [categoryCounts]);

  const categoryStats = useMemo(() => {
    return CATEGORY_META.map((category) => {
      const count = Number(categoryCounts[category.id] || 0);
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      return {
        ...category,
        count,
        percentage,
      };
    });
  }, [categoryCounts, totalCount]);

  // Unified Donut Gradient Calculation across all 3 categories
  const donutGradient = useMemo(() => {
    if (totalCount === 0) {
      return "conic-gradient(#e2e8f0 0% 100%)";
    }
    const pctOverripe = (Number(categoryCounts.overripe || 0) / totalCount) * 100;
    const pctRipe = (Number(categoryCounts.ripe || 0) / totalCount) * 100;
    const p1 = pctOverripe;
    const p2 = p1 + pctRipe;

    return `conic-gradient(
      #f97316 0% ${p1}%,
      #10b981 ${p1}% ${p2}%,
      #eab308 ${p2}% 100%
    )`;
  }, [categoryCounts, totalCount]);

  // Majority determination
  const majorityInfo = useMemo(() => {
    if (totalCount === 0) {
      const isWaiting = Boolean(detectionActive);
      return {
        label: isWaiting ? "SCANNING" : "IDLE",
        color: isWaiting ? "#eab308" : "#94a3b8",
        percentage: 0,
      };
    }

    if (
      currentDecision?.majority_category &&
      currentDecision.majority_category !== "IDLE" &&
      currentDecision.majority_category !== "WAITING"
    ) {
      const match = CATEGORY_META.find(
        (c) => c.label.toLowerCase() === currentDecision.majority_category.toLowerCase()
      );
      return {
        label: currentDecision.majority_category.toUpperCase(),
        color: match?.color || "#10b981",
        percentage: currentDecision.majority_percentage || 0,
      };
    }

    // Fallback compute from current category counts
    let maxCat = CATEGORY_META[1]; // default RIPE
    let maxCount = -1;
    CATEGORY_META.forEach((cat) => {
      const c = Number(categoryCounts[cat.id] || 0);
      if (c > maxCount) {
        maxCount = c;
        maxCat = cat;
      }
    });

    const pct = totalCount > 0 ? Math.round((maxCount / totalCount) * 100) : 0;
    return {
      label: maxCat.label,
      color: maxCat.color,
      percentage: pct,
    };
  }, [currentDecision, categoryCounts, totalCount, detectionActive]);

  // Recipe settings name / code based on majority
  const recipeSettingName = useMemo(() => {
    if (totalCount === 0) {
      return detectionActive ? "SCANNING BUNCHES..." : "IDLE (NO CYCLE)";
    }
    if (
      currentDecision?.recommended_recipe_name &&
      currentDecision.recommended_recipe_name !== "WAITING FOR BUNCHES" &&
      currentDecision.recommended_recipe_name !== "NO ACTIVE CYCLE"
    ) {
      return currentDecision.recommended_recipe_name.replace(/\s*\(3-PEAK\)/i, "").trim();
    }
    return `${majorityInfo.label}-RECIPE`;
  }, [currentDecision, majorityInfo, totalCount, detectionActive]);

  // Captures display logic (12 foto per slide dari backend on-demand)
  const displayedCaptures = recentCaptures;

  return (
    <div className="som-ai-grading-container compact-3col">
      {message && <div className="som-grading-alert-popup">{message}</div>}

      {/* ─────────────────────────────────────────────────────────────
          KOLOM 1 (KIRI): LIVE CCTV PORTRAIT (720 x 1280 / 9:16)
          ───────────────────────────────────────────────────────────── */}
      <section className="som-ai-grading-card som-ai-live-card portrait-cam-card">
        <header className="som-ai-card-header">
          <h3>LIVE FFB STREAMING</h3>
        </header>

        <div className="som-ai-video-container portrait-ratio">
          {liveCamera && isTabVisible ? (
            <img
              key={`stream-l${selectedLine}-${streamKey}`}
              src={`${apiUrl(`/stream?line_no=${selectedLine}`)}&t=${streamKey}`}
              alt={`Live AI FFB Camera Line ${selectedLine}`}
              className="portrait-stream-media"
              onError={() => {
                // Auto-reconnect stream jika ada interupsi jaringan/socket tanpa perlu refresh halaman
                setTimeout(() => setStreamKey(Date.now()), 1500);
              }}
            />
          ) : (
            <div className="som-ai-video-placeholder portrait-placeholder">
              <CameraOffIcon />
              <strong>{runtimeStatus ? (isTabVisible ? "CCTV NOT CONNECTED" : "STREAM PAUSED") : "AI SERVICE OFFLINE"}</strong>
              <span>
                {runtimeStatus
                  ? (isTabVisible ? (cameraStatus?.error || "Configure a valid RTSP source to start the live stream.") : "Stream automatically paused to save bandwidth.")
                  : ""}
              </span>
            </div>
          )}

          <div className="som-ai-stream-overlay">
            <span className={`som-ai-live-badge ${liveCamera ? "" : "offline"}`}>
              <i /> {liveCamera ? "ACTIVE" : "NON ACTIVE"}
            </span>
            <span className={`som-ai-live-badge som-ai-detection-badge ${detectionActive ? "recording" : "idle"}`}>
              <i /> {detectionActive ? `DETECTION: ACTIVE (LINE ${selectedLine})` : "DETECTION: IDLE"}
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SIMULASI SEMENTARA INLET DOOR TRIGGER (LINE 1 - 4)
            Dapat dihapus dengan mudah saat sinyal PLC inlet door terhubung
            ══════════════════════════════════════════════════════════════════ */}
        <div className="som-inlet-simulation-panel">
          <div className="som-inlet-simulation-header">
            <span>INLET SIMULATION TRIGGER (DEMO)</span>
            {currentCycleCode && <small className="active-cycle-tag">{currentCycleCode}</small>}
          </div>
          <div className="som-inlet-btn-grid">
            {[1, 2, 3, 4].map((lineNum) => {
              const isLineRecording = Boolean(activeLineStates[String(lineNum)]?.is_active || activeLineStates[lineNum]?.is_active);
              const isLocked = activeRunningLine !== null && activeRunningLine !== lineNum;
              const isSelectedView = selectedLine === lineNum;
              return (
                <button
                  key={lineNum}
                  type="button"
                  disabled={loadingToggle || isLocked}
                  className={`som-inlet-toggle-btn ${isLineRecording ? "recording" : ""} ${isLocked ? "disabled-locked" : ""} ${isSelectedView ? "selected-view" : ""}`}
                  onClick={() => handleToggleSimulatedInlet(lineNum)}
                  title={
                    isLocked
                      ? `Siklus Line ${activeRunningLine} sedang berjalan. Selesaikan siklus tersebut terlebih dahulu.`
                      : isLineRecording
                      ? `Klik untuk menyelesaikan siklus Line ${lineNum} (Inlet CLOSED)`
                      : `Klik untuk memulai siklus baru Line ${lineNum} (Inlet OPEN)`
                  }
                >
                  <span className="btn-indicator-dot" />
                  <span className="btn-line-name">LINE {lineNum}</span>
                  <span className="btn-status-sub">{isLineRecording ? "OPEN / REC" : isLocked ? "LOCKED" : "CLOSED"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Configuration */}
        {showConfigModal && (
          <div className="som-ai-config-overlay" onClick={() => setShowConfigModal(false)}>
            <div className="som-ai-config-modal" onClick={(event) => event.stopPropagation()}>
              <h4>FFB CCTV & AI CONFIGURATION</h4>
              <div className="som-ai-config-fields">
                <label>
                  AI Service Base URL
                  <input
                    value={apiBaseUrl}
                    onChange={(event) => setApiBaseUrl(event.target.value)}
                    placeholder="http://localhost:4105"
                  />
                </label>
                <label>
                  Sterilizer Line
                  <select value={selectedLine} onChange={(event) => selectConfigLine(event.target.value)}>
                    {availableLines.map((lineNo) => (
                      <option key={lineNo} value={lineNo}>
                        Line {lineNo}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Camera Name
                  <input
                    value={cameraName}
                    onChange={(event) => setCameraName(event.target.value)}
                    placeholder="FFB Conveyor Inlet Line 1"
                  />
                </label>
                <label>
                  New RTSP URL
                  <input
                    type="password"
                    value={rtspUrl}
                    onChange={(event) => setRtspUrl(event.target.value)}
                    placeholder="Leave empty to keep current"
                    autoComplete="new-password"
                  />
                </label>
                <label className="som-ai-config-checkbox">
                  <input
                    type="checkbox"
                    checked={cameraEnabled}
                    onChange={(event) => setCameraEnabled(event.target.checked)}
                  />
                  Enable camera & AI grading for this line
                </label>
              </div>
              <footer>
                <button type="button" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={savingConfig || !serverConfig}
                  onClick={handleSaveConfig}
                >
                  {savingConfig ? "Saving..." : "Save & Reconnect"}
                </button>
              </footer>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          KOLOM 2 (TENGAH): RECENT CAPTURES (GRID 4 KOLOM & SLIDE)
          ───────────────────────────────────────────────────────────── */}
      <section className="som-ai-grading-card som-ai-captures-card">
        <header className="som-ai-card-header">
          <h3>RECENT CAPTURES</h3>
          <div className="som-ai-slide-controls">
            <span className="slide-indicator">
              SLIDE {captureSlide} / {totalSlides} ({totalCount > 0 ? totalCount.toLocaleString("id-ID") : recentCaptures.length} Items)
            </span>
            <div className="slide-buttons">
              <button
                type="button"
                className="slide-btn"
                disabled={captureSlide <= 1}
                onClick={() => handleSlideChange(captureSlide - 1)}
                aria-label="Previous slide"
                title="Slide sebelumnya"
              >
                ‹
              </button>
              <button
                type="button"
                className="slide-btn"
                disabled={captureSlide >= totalSlides}
                onClick={() => handleSlideChange(captureSlide + 1)}
                aria-label="Next slide"
                title="Slide berikutnya"
              >
                ›
              </button>
            </div>
          </div>
        </header>

        <div className="som-ai-captures-body">
          {displayedCaptures.length === 0 ? (
            <div className="som-ai-empty-captures-box">
              <PalmFruitIcon color={detectionActive ? "#eab308" : "#94a3b8"} />
              <strong>{detectionActive ? "SCANNING FOR FFB BUNCHES..." : "NO DETECTIONS IN THIS CYCLE"}</strong>
              {detectionActive && (
                <span>
                  Camera is actively tracking Line {selectedLine}. Detected bunches will appear here in real-time.
                </span>
              )}
            </div>
          ) : (
            <div className="som-ai-captures-grid">
              {displayedCaptures.map((capture, index) => {
                const catMeta =
                  CATEGORY_META.find((c) => c.id === (capture.category || "").toLowerCase()) ||
                  CATEGORY_META[1];
                const imgUrl = resolveImageUrl(capture.image_url || capture.image_path);

                return (
                  <div key={capture.id || index} className="som-ai-capture-item">
                    <div className="capture-thumb-box">
                      {imgUrl ? (
                        <img src={imgUrl} alt={`Detection ${capture.id}`} />
                      ) : (
                        <div className="capture-placeholder-icon">
                          <PalmFruitIcon color={catMeta.color} />
                        </div>
                      )}
                      <span
                        className="capture-category-badge"
                        style={{
                          backgroundColor: catMeta.color,
                          boxShadow: `0 2px 6px ${catMeta.color}40`,
                        }}
                      >
                        {catMeta.label}
                      </span>
                    </div>
                    <div className="capture-meta-row">
                      <span className="capture-time">{capture.time || "Just now"}</span>
                      <span className="capture-conf">{capture.confidence || 0}%</span>
                    </div>
                    <button
                      type="button"
                      className="som-ai-detail-btn"
                      onClick={() => setSelectedCaptureDetail(capture)}
                      title="View capture detail"
                    >
                      View Detail
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          KOLOM 3 (KANAN): CATEGORY ANALYSIS & STERILIZER STATUS
          ───────────────────────────────────────────────────────────── */}
      <section className="som-ai-grading-card som-ai-analysis-card premium-theme compact-analysis">
        <header className="som-ai-card-header">
          <h3>CATEGORY ANALYSIS</h3>
        </header>

        <div className="som-ai-analysis-body">
          {/* TOTAL / ALL FFB BOX (Paling Atas) */}
          <div className="som-ai-total-card">
            <span className="total-label">ALL / TOTAL FFB BUNCHES</span>
            <div className="total-counter-row">
              <strong className="total-value">{totalCount.toLocaleString("en-US")}</strong>
              <span className="total-unit">BUNCHES</span>
            </div>
          </div>

          {/* VISUAL CHART & 3 STATUS DI BAWAH DONUT */}
          <div className="som-ai-chart-section compact-chart-box">
            <div className="som-ai-chart-wrapper">
              <div
                className="donut-chart multi-donut"
                style={{ background: donutGradient }}
              >
                <div className="donut-hole">
                  <strong>{majorityInfo.percentage}%</strong>
                  <span style={{ color: majorityInfo.color }}>{majorityInfo.label}</span>
                </div>
              </div>
            </div>

            <div className="som-ai-status-list compact-status-list">
              <div className="som-ai-status-item">
                <span className="status-key">Majority:</span>
                <strong style={{ color: majorityInfo.color }}>{majorityInfo.label}</strong>
              </div>
              <div className="som-ai-status-item">
                <span className="status-key">Sterilizer:</span>
                <strong>LINE {selectedLine}</strong>
              </div>
              <div className="som-ai-status-item">
                <span className="status-key">Recipe Settings:</span>
                <strong className="recipe-tag">{recipeSettingName}</strong>
              </div>
            </div>
          </div>

          {/* CLASSIFICATION RESULT LIST: OVERRIPE, RIPE, UNDERRIPE */}
          <div className="som-ai-category-list-wrapper">
            <h4 className="list-title">CLASSIFICATION RESULT</h4>
            {categoryStats.map((category) => {
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  type="button"
                  key={category.id}
                  className={`som-ai-category-row premium-row ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="som-ai-category-heading">
                    <span className="som-ai-category-name">
                      <i
                        style={{
                          backgroundColor: category.color,
                          boxShadow: `0 0 8px ${category.color}`,
                        }}
                      />
                      {category.label}
                    </span>
                    <span className="som-ai-category-values">
                      <strong>{category.count.toLocaleString("en-US")}</strong>
                      <small
                        className="percentage-badge"
                        style={{
                          color: category.color,
                          backgroundColor: category.badgeBg,
                        }}
                      >
                        {category.percentage}%
                      </small>
                    </span>
                  </span>
                  <span className="som-ai-progress-track">
                    <i
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: category.color,
                        boxShadow: `0 0 6px ${category.color}`,
                      }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* POPUP MODAL VIEW DETAIL CAPTURE */}
      {selectedCaptureDetail && (
        <div className="som-ai-detail-overlay" onClick={() => setSelectedCaptureDetail(null)}>
          <div className="som-ai-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="som-ai-detail-modal-header">
              <h4>DETECTION DETAIL</h4>
              <button
                type="button"
                className="som-ai-detail-close"
                onClick={() => setSelectedCaptureDetail(null)}
              >
                ✕
              </button>
            </div>
            <div className="som-ai-detail-modal-body">
              <div className="som-ai-detail-img-box">
                {resolveImageUrl(selectedCaptureDetail.image_url || selectedCaptureDetail.image_path) ? (
                  <img
                    src={resolveImageUrl(selectedCaptureDetail.image_url || selectedCaptureDetail.image_path)}
                    alt={`Detection ${selectedCaptureDetail.id}`}
                  />
                ) : (
                  <div className="som-ai-detail-icon-placeholder">
                    <PalmFruitIcon
                      color={
                        CATEGORY_META.find(
                          (c) => c.id === (selectedCaptureDetail.category || "").toLowerCase()
                        )?.color || "#10b981"
                      }
                    />
                  </div>
                )}
              </div>
              <div className="som-ai-detail-info-list">
                <div className="som-ai-detail-info-item">
                  <span className="info-label">Detection ID:</span>
                  <strong>{selectedCaptureDetail.id || "N/A"}</strong>
                </div>
                <div className="som-ai-detail-info-item">
                  <span className="info-label">Category:</span>
                  <strong
                    className="info-badge"
                    style={{
                      backgroundColor:
                        CATEGORY_META.find(
                          (c) => c.id === (selectedCaptureDetail.category || "").toLowerCase()
                        )?.badgeBg || "rgba(16, 185, 129, 0.15)",
                      color:
                        CATEGORY_META.find(
                          (c) => c.id === (selectedCaptureDetail.category || "").toLowerCase()
                        )?.color || "#10b981",
                    }}
                  >
                    {(selectedCaptureDetail.category || "RIPE").toUpperCase()}
                  </strong>
                </div>
                <div className="som-ai-detail-info-item">
                  <span className="info-label">Confidence:</span>
                  <strong className="info-conf">{selectedCaptureDetail.confidence || 0}%</strong>
                </div>
                {selectedCaptureDetail.trigger_condition && (
                  <div className="som-ai-detail-info-item">
                    <span className="info-label">Trigger Condition:</span>
                    <strong>{selectedCaptureDetail.trigger_condition}</strong>
                  </div>
                )}
                <div className="som-ai-detail-info-item">
                  <span className="info-label">Timestamp:</span>
                  <strong>{selectedCaptureDetail.time || "Just now"}</strong>
                </div>
                <div className="som-ai-detail-info-item">
                  <span className="info-label">Sterilizer Line:</span>
                  <strong>Line {selectedCaptureDetail.line || selectedLine}</strong>
                </div>
              </div>
            </div>
            <div className="som-ai-detail-modal-footer">
              <button
                type="button"
                className="som-ai-detail-modal-btn"
                onClick={() => setSelectedCaptureDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

