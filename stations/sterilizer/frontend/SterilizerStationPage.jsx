import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import "./SterilizerStationPage.css";
import BpvTab from "./tabs/BPV/BpvTab.jsx";
import TrendTab from "./tabs/Trend/TrendTab.jsx";
import OverviewTab from "./tabs/Overview/OverviewTab.jsx";
import AiGradingTab from "./tabs/AiGrading/AiGradingTab.jsx";
import CycleHistoryTab from "./tabs/CycleHistory/CycleHistoryTab.jsx";
import LogsheetView from "./LogsheetView.jsx";

import usePlcStore from "@core/store";
import SterilizerStationSettingsPage from "./settings/SterilizerStationSettingsPage.jsx";

const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const TagEditorModal = ({
  data,
  onClose,
  onSave,
  tagMap,
  availableTags = [],
  saving,
}) => {
  const [localTags, setLocalTags] = useState({});

  useEffect(() => {
    if (data) {
      const initial = {};

      if (data.signals && data.signals.length > 0) {
        data.signals.forEach((sig) => {
          const key = `${data.targetId}__${sig.key}`;
          initial[key] = tagMap[key] || "";
        });
      } else {
        const targets = data.subs.length > 0 ? data.subs : [data.targetId];
        targets.forEach((t) => {
          initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
          initial[`${t}__START`] = tagMap[`${t}__START`] || "";
          initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
        });

        if (data.subs.length === 0) {
          initial[`${data.targetId}__MONITOR`] =
            tagMap[`${data.targetId}__MONITOR`] || "";
        }
      }

      setLocalTags(initial);
    }
    // Hapus tagMap dari dependency agar pilihan user tidak kereplace saat polling 3 detik jalan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data) return null;

  const isGroup = data.subs.length > 0;
  const hasSignals = data.signals && data.signals.length > 0;

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: 0 }}>
      <label
        className="som-control-item-label"
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "8px",
          display: "block",
        }}
      >
        {label}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#0f172a",
          color: "#f8fafc",
          fontSize: "15px",
          fontWeight: 600,
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="">- No Tag -</option>
        {tagList.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.tag_name}
          </option>
        ))}
      </select>
    </div>
  );

  return createPortal(
    <div
      className="som-equipment-modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 10000,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className="som-equipment-control-popup som-tag-edit-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isGroup ? "min(960px, 92vw)" : "min(600px, 90vw)",
          maxHeight: "88vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "20px",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          boxShadow: "0 25px 60px -12px rgba(0,0,0,0.7), 0 0 30px rgba(59,130,246,0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#f8fafc",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              PLC Tag Configuration
            </h2>
            <span
              style={{
                fontSize: "13px",
                color: "#94a3b8",
                marginTop: "6px",
                display: "block",
                fontWeight: 500,
              }}
            >
              Hardware Mapping: <strong style={{ color: "#60a5fa" }}>{data.targetId}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#cbd5e1",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            X
          </button>
        </div>

        <div
          style={{
            padding: "28px 32px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {hasSignals ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {data.signals.map((sig) => (
                <div key={sig.key}>
                  {renderTagSelect(
                    localTags[`${data.targetId}__${sig.key}`] || "",
                    (val) =>
                      setLocalTags({
                        ...localTags,
                        [`${data.targetId}__${sig.key}`]: val,
                      }),
                    availableTags,
                    sig.label,
                  )}
                </div>
              ))}
            </div>
          ) : isGroup ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {data.subs.map((sub, index) => (
                <div
                  key={index}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "14px",
                      color: "#60a5fa",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {sub}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    {renderTagSelect(
                      localTags[`${sub}__STATUS`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__STATUS`]: val }),
                      availableTags,
                      "STATUS (READ)",
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__START`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__START`]: val }),
                      availableTags,
                      "START (WRITE)",
                    )}
                    {renderTagSelect(
                      localTags[`${sub}__STOP`] || "",
                      (val) =>
                        setLocalTags({ ...localTags, [`${sub}__STOP`]: val }),
                      availableTags,
                      "STOP (WRITE)",
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ width: "100%", margin: "0 auto" }}>
              {renderTagSelect(
                localTags[`${data.targetId}__MONITOR`] || "",
                (val) =>
                  setLocalTags({
                    ...localTags,
                    [`${data.targetId}__MONITOR`]: val,
                  }),
                availableTags,
                "MONITORING POINT (READ)",
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "20px 32px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            gap: "16px",
            justifyContent: "flex-end",
            background: "rgba(15, 23, 42, 0.6)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#cbd5e1",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            disabled={saving}
            onClick={() => onSave(localTags)}
            style={{
              padding: "12px 32px",
              borderRadius: "8px",
              border: "none",
              background: saving ? "#475569" : "#2563eb",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            {saving ? "SAVING..." : "CONFIRM MAPPING"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

function SterilizerStationPage({ user, onSelectSubmenu, configMode: propConfigMode = false }) {
  const [configMode, setConfigMode] = useState(propConfigMode);
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("sterilizer_active_tab") || "ai-grading";
  });

  useEffect(() => {
    sessionStorage.setItem("sterilizer_active_tab", activeTab);
  }, [activeTab]);

  const [showSettings, setShowSettings] = useState(false);
  const [bpvMakeup, setBpvMakeup] = useState("CLOSE");
  const [bpvBlowoff, setBpvBlowoff] = useState("OPEN");
  const [bpvMode, setBpvMode] = useState("--");
  const [bpvMakeupPos, setBpvMakeupPos] = useState(0.0);
  const [bpvBlowoffPos, setBpvBlowoffPos] = useState(100.0);
  const [recipeLine, setRecipeLine] = useState(1);
  const [editingLine, setEditingLine] = useState(null);
  const [showTrendSettings, setShowTrendSettings] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState("5H");
  const [trendOffset, setTrendOffset] = useState(0);
  const [viewMode, setViewMode] = useState("process");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    setConfigMode(propConfigMode);
  }, [propConfigMode]);



  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000 * 60); // Update every minute
    return () => clearInterval(timer);
  }, []);



  const [hoverData, setHoverData] = useState(null);
  const [tagEdit, setTagEdit] = useState(null);
  const [tagMap, setTagMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [savingTags, setSavingTags] = useState(false);
  const [realtimeData, setRealtimeData] = useState({});
  const tags = usePlcStore((state) => state.tags);
  const initSocket = usePlcStore((state) => state.initSocket);

  useEffect(() => {
    if (initSocket) initSocket();
  }, [initSocket]);

  useEffect(() => {
    let active = true;
    const fetchLive = async () => {
      try {
        const res = await fetch("/api/sterilizer/monitor/realtime", {
          headers: authHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          if (active && json.success) {
            const data = json.data || {};
            setRealtimeData(data);

            // Push ke rolling buffer setiap TREND_SAMPLE_MS hanya jika sedang di mode LIVE (trendOffset === 0)
            const now = Date.now();
            if (trendOffset === 0 && now - lastTrendSampleRef.current >= TREND_SAMPLE_MS) {
              lastTrendSampleRef.current = now;

              // Pressure buffer: CurrentPressure lline 1-4 + Pressure_BVP[1]
              const pb = pressureBufferRef.current;
              if (pb && pb.s1 && pb.s1.length > 0) {
                pb.s1.push(parseFloat(data["CurrentPressure lline 1"]) || 0);
                pb.s2.push(parseFloat(data["CurrentPressure lline 2"]) || 0);
                pb.s3.push(parseFloat(data["CurrentPressure lline 3"]) || 0);
                pb.s4.push(parseFloat(data["CurrentPressure lline 4"]) || 0);
                pb.bpv.push(parseFloat(data["Pressure_BVP[1]"] || data["Pressure BPV"]) || 0);
                ["s1", "s2", "s3", "s4", "bpv"].forEach(k => {
                  if (pb[k].length > TREND_BUFFER_SIZE) pb[k] = pb[k].slice(-TREND_BUFFER_SIZE);
                });
              }

              // Temperature buffer: Actual_Temperatur[1-4] (BPV has no physical sensor)
              const tb = tempBufferRef.current;
              if (tb && tb.s1 && tb.s1.length > 0) {
                tb.s1.push(parseFloat(data["Actual_Temperatur[1]"]) || 0);
                tb.s2.push(parseFloat(data["Actual_Temperatur[2]"]) || 0);
                tb.s3.push(parseFloat(data["Actual_Temperatur[3]"]) || 0);
                tb.s4.push(parseFloat(data["Actual_Temperatur[4]"]) || 0);
                ["s1", "s2", "s3", "s4"].forEach(k => {
                  if (tb[k] && tb[k].length > TREND_BUFFER_SIZE) tb[k] = tb[k].slice(-TREND_BUFFER_SIZE);
                });
              }

              // Update trendData untuk chart type yang aktif
              const activeBuf = trendChartTypeRef.current === "temperature" ? tempBufferRef.current : pressureBufferRef.current;
              if (activeBuf && activeBuf.s1 && activeBuf.s1.length > 0) {
                setTrendData({
                  s1: [...activeBuf.s1],
                  s2: [...activeBuf.s2],
                  s3: [...activeBuf.s3],
                  s4: [...activeBuf.s4],
                  bpv: [...activeBuf.bpv],
                  resolution: activeBuf.s1.length,
                  type: trendChartTypeRef.current,
                });
              }

              // Selalu perbarui tempTrendData agar popup modal temperature di Overview juga langsung live
              if (tb && tb.s1 && tb.s1.length > 0) {
                setTempTrendData({
                  s1: [...tb.s1],
                  s2: [...(tb.s2 || [])],
                  s3: [...(tb.s3 || [])],
                  s4: [...(tb.s4 || [])],
                  bpv: [...(tb.bpv || [])],
                  resolution: tb.s1.length,
                  type: "temperature",
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch live monitoring data", err);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const getMappedValue = useCallback((equipment, signalKey, defaultValue) => {
    const key = `${equipment}__${signalKey}`;
    const tagId = tagMap[key];
    if (!tagId || tagId === "null" || tagId === "undefined" || tagId === "none" || tagId === "") {
      return "No Tag";
    }

    const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
    if (!tagObj) return "--";

    // Check WebSocket store first, then fallback to HTTP poll realtimeData
    const liveValue = tags[tagObj.tag_name]?.value !== undefined
      ? tags[tagObj.tag_name].value
      : realtimeData[tagObj.tag_name];

    if (liveValue === undefined || liveValue === null) return "--";

    // Auto-round numeric values to max 2 decimal places (same as tags i/o display)
    const num = parseFloat(liveValue);
    if (!isNaN(num)) {
      return +(Math.round(num + "e+2") + "e-2");
    }
    return liveValue;
  }, [tagMap, availableTags, realtimeData, tags]);

  useEffect(() => {
    if (!configMode) {
      setTagEdit(null);
    }
  }, [configMode]);

  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch("/api/sterilizer/plc-config/tags", {
        headers: authHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.success) setAvailableTags(data.data || []);
    } catch (err) {
      console.error("Failed to fetch PLC tags", err);
    }
  }, []);

  useEffect(() => {
    fetchAvailableTags();
    const interval = setInterval(fetchAvailableTags, 5000);
    return () => clearInterval(interval);
  }, [fetchAvailableTags]);

  useEffect(() => {
    if (tagEdit) {
      fetchAvailableTags();
    }
  }, [tagEdit, fetchAvailableTags]);

  useEffect(() => {
    let active = true;
    const loadMappings = async () => {
      try {
        const res = await fetch(
          "/api/sterilizer/plc-config/station-mappings",
          { headers: authHeaders() },
        );

        if (!res.ok) return;

        const data = await res.json();
        if (active && data.success && Array.isArray(data.data)) {
          const restored = {};
          data.data.forEach((mapping) => {
            if (mapping.tag_id !== null && mapping.tag_id !== undefined && String(mapping.tag_id) !== "null" && String(mapping.tag_id) !== "") {
              restored[`${mapping.equipment}__${mapping.signal_key}`] = String(
                mapping.tag_id,
              );
            }
          });
          setTagMap(restored);
        }
      } catch (err) {
        console.error("Failed to load station mappings", err);
      }
    };

    loadMappings();
    const interval = setInterval(loadMappings, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleTagEditRequest = (id, subs = [], signals = null) => {
    setTagEdit({ targetId: id, subs, signals });
  };

  const handleTagSave = async (updatedTags) => {
    setSavingTags(true);

    try {
      const mappings = Object.entries(updatedTags)
        .map(([key, tagId]) => {
          const [equipment, signal_key] = key.split("__");
          return {
            station: "sterilizer",
            equipment,
            signal_key,
            tag_id: tagId ? Number(tagId) : null,
          };
        })
        .filter(
          (mapping) =>
            mapping.equipment && mapping.signal_key
        );

      if (mappings.length > 0) {
        const res = await fetch("/api/sterilizer/plc-config/station-mappings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ mappings }),
        });

        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || result.message || "Failed to save station mappings");
        }
      }

      setTagMap((prev) => ({ ...prev, ...updatedTags }));
      setTagEdit(null);
    } catch (err) {
      console.error("Failed to save tag mappings", err);
      alert("Failed to save PLC tag configuration.");
    } finally {
      setSavingTags(false);
    }
  };

  // Initial data helper
  const getInitialStep = (step) => {
    let inl = false,
      exh = false,
      con = false,
      bar = "0.0",
      mode = "OFF",
      nrm = 0,
      unf = 0,
      wet = 0;
    if (step === 1) {
      inl = true;
      exh = false;
      con = true;
      bar = "0.0";
      mode = "OFF";
      nrm = 180;
    } else if (step === 2) {
      inl = true;
      exh = false;
      con = false;
      bar = "2.3";
      mode = "HIGH";
      nrm = 1200;
    } else if (step === 3) {
      inl = false;
      exh = true;
      con = true;
      bar = "0.0";
      mode = "LOW";
      nrm = 360;
    } else if (step === 4) {
      inl = true;
      exh = false;
      con = false;
      bar = "2.5";
      mode = "HIGH";
      nrm = 720;
    } else if (step === 5) {
      inl = false;
      exh = true;
      con = true;
      bar = "0.0";
      mode = "LOW";
      nrm = 360;
    } else if (step === 6) {
      inl = true;
      exh = false;
      con = false;
      bar = "0.0";
      mode = "OFF";
      nrm = 840;
    } else if (step === 7) {
      inl = false;
      exh = false;
      con = true;
      bar = "2.7";
      mode = "LOW";
      nrm = 5;
    } else if (step === 8) {
      inl = true;
      exh = false;
      con = false;
      bar = "0.0";
      mode = "OFF";
      nrm = 480;
    } else if (step === 9) {
      inl = false;
      exh = false;
      con = true;
      bar = "2.7";
      mode = "LOW";
      nrm = 5;
    } else if (step === 10) {
      inl = true;
      exh = false;
      con = false;
      bar = "0.0";
      mode = "OFF";
      nrm = 480;
    } else if (step === 11) {
      inl = false;
      exh = true;
      con = true;
      bar = "0.0";
      mode = "LOW";
      nrm = 600;
    }
    return { step, inl, exh, con, bar, mode, nrm, unf, wet };
  };

  const initialRecipes = {
    ripe: {
      1: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      2: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      3: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      4: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
    },
    unripe: {
      1: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      2: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      3: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      4: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
    },
    overripe: {
      1: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      2: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      3: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
      4: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
    },
    1: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
    2: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
    3: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
    4: Array.from({ length: 20 }, (_, i) => getInitialStep(i + 1)),
  };

  const [recipes, setRecipes] = useState(initialRecipes);

  useEffect(() => {
    const loadRecipesFromDb = async () => {
      try {
        const token = localStorage.getItem("kip_token");
        const res = await fetch("/api/sterilizer/settings/recipes-and-params", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data && json.data.recipes) {
          setRecipes(json.data.recipes);
        }
      } catch (err) {
        console.error("Failed to load initial recipes from DB:", err);
      }
    };
    loadRecipesFromDb();
  }, []);

  const getTrendTimeRange = useCallback(() => {
    const now = Date.now();
    let durationMs = 5 * 60 * 60 * 1000;
    let stepMs = 1 * 60 * 60 * 1000;

    if (trendPeriod === "2H") {
      durationMs = 2 * 60 * 60 * 1000;
      stepMs = 1 * 60 * 60 * 1000;
    } else if (trendPeriod === "8H") {
      durationMs = 8 * 60 * 60 * 1000;
      stepMs = 1 * 60 * 60 * 1000;
    } else if (trendPeriod === "D") {
      durationMs = 24 * 60 * 60 * 1000;
      stepMs = 6 * 60 * 60 * 1000;
    }

    const end = now - (trendOffset * stepMs);
    const start = end - durationMs;
    return { start, end };
  }, [trendPeriod, trendOffset]);

  const getXAxisLabels = useCallback((period) => {
    const labels = [];
    if (period === "2H") {
      const { start } = getTrendTimeRange();
      for (let i = 0; i <= 8; i++) { // every 15 mins (8 segments for 2 hours)
        const t = new Date(start + i * 15 * 60 * 1000);
        labels.push(
          t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")
        );
      }
    } else if (period === "5H") {
      const { start } = getTrendTimeRange();
      for (let i = 0; i <= 10; i++) {
        const t = new Date(start + i * 30 * 60 * 1000);
        labels.push(
          t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")
        );
      }
    } else if (period === "8H") {
      const { start } = getTrendTimeRange();
      for (let i = 0; i <= 8; i++) {
        const t = new Date(start + i * 60 * 60 * 1000);
        labels.push(
          t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")
        );
      }
    } else if (period === "D") {
      const { start } = getTrendTimeRange();
      for (let i = 0; i <= 12; i++) { // every 2 hours
        const t = new Date(start + i * 2 * 60 * 60 * 1000);
        labels.push(
          t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")
        );
      }
    }
    return labels;
  }, [getTrendTimeRange]);

  const getResolution = useCallback((period) =>
    period === "2H" ? 7200 : period === "5H" ? 18000 : period === "8H" ? 28800 : period === "D" ? 86400 : 18000
    , []);

  // Realtime trend data initializer - hanya menggunakan nilai realtime murni dari server (tanpa data sinus buatan)
  const generateRealtimeTrendData = (type = "pressure", resolution = 60, live = realtimeData) => {
    const isTemp = type === "temperature" || type === "temp";

    // Nilai aktual realtime dari server
    const liveT1 = live?.["Actual_Temperatur[1]"] !== undefined ? parseFloat(live["Actual_Temperatur[1]"]) : 0;
    const liveT2 = live?.["Actual_Temperatur[2]"] !== undefined ? parseFloat(live["Actual_Temperatur[2]"]) : 0;
    const liveT3 = live?.["Actual_Temperatur[3]"] !== undefined ? parseFloat(live["Actual_Temperatur[3]"]) : 0;
    const liveT4 = live?.["Actual_Temperatur[4]"] !== undefined ? parseFloat(live["Actual_Temperatur[4]"]) : 0;
    const liveTBpv = 0;

    const liveP1 = live?.["CurrentPressure lline 1"] !== undefined ? parseFloat(live["CurrentPressure lline 1"]) : 0;
    const liveP2 = live?.["CurrentPressure lline 2"] !== undefined ? parseFloat(live["CurrentPressure lline 2"]) : 0;
    const liveP3 = live?.["CurrentPressure lline 3"] !== undefined ? parseFloat(live["CurrentPressure lline 3"]) : 0;
    const liveP4 = live?.["CurrentPressure lline 4"] !== undefined ? parseFloat(live["CurrentPressure lline 4"]) : 0;
    const livePBpv = (live?.["Pressure BPV"] || live?.["Pressure_BVP[1]"]) !== undefined
      ? parseFloat(live["Pressure BPV"] || live["Pressure_BVP[1]"])
      : 0;

    const fillFlat = (val) => Array.from({ length: resolution }, () => parseFloat(Number(val || 0).toFixed(2)));

    if (isTemp) {
      return {
        s1: fillFlat(liveT1),
        s2: fillFlat(liveT2),
        s3: fillFlat(liveT3),
        s4: fillFlat(liveT4),
        bpv: [],
        resolution,
        type: "temperature",
      };
    } else {
      return {
        s1: fillFlat(liveP1),
        s2: fillFlat(liveP2),
        s3: fillFlat(liveP3),
        s4: fillFlat(liveP4),
        bpv: fillFlat(livePBpv),
        resolution,
        type: "pressure",
      };
    }
  };

  // -- Historical Trend Fetch & Realtime Rolling Buffer --
  const TREND_BUFFER_SIZE = 300; // 300 titik window
  const TREND_SAMPLE_MS = 3000;

  const pressureBufferRef = useRef(null);
  const tempBufferRef = useRef(null);
  const trendChartTypeRef = useRef("pressure");
  const lastTrendSampleRef = useRef(0);

  const [isFetchingTrend, setIsFetchingTrend] = useState(false);
  const [trendChartType, setTrendChartType] = useState("pressure");
  const [trendData, setTrendData] = useState({ s1: [], s2: [], s3: [], s4: [], bpv: [], resolution: 0 });
  const [tempTrendData, setTempTrendData] = useState({ s1: [], s2: [], s3: [], s4: [], bpv: [], resolution: 0 });

  // Fetch data historis dari database (plc_tag_values) & seed buffer
  useEffect(() => {
    let active = true;
    trendChartTypeRef.current = trendChartType;

    const fetchTrendData = async (isSilent = false) => {
      try {
        if (!isSilent) setIsFetchingTrend(true);
        const { start, end } = getTrendTimeRange();
        const res = await fetch(
          `/api/sterilizer/monitor/historical?start=${start}&end=${end}&period=${trendPeriod}&type=${trendChartType}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const json = await res.json();
          if (active && json.success && json.data) {
            const hist = json.data;
            setTrendData(hist);

            // Pre-fetch data temperature untuk modal popup Overview dan instant toggle
            fetch(
              `/api/sterilizer/monitor/historical?start=${start}&end=${end}&period=${trendPeriod}&type=temperature`,
              { headers: authHeaders() }
            )
              .then((r) => r.json())
              .then((j) => {
                if (active && j.success && j.data) {
                  setTempTrendData(j.data);
                  if (!tempBufferRef.current && j.data.s1 && j.data.s1.length > 0) {
                    tempBufferRef.current = {
                      s1: [...j.data.s1],
                      s2: [...(j.data.s2 || [])],
                      s3: [...(j.data.s3 || [])],
                      s4: [...(j.data.s4 || [])],
                      bpv: [...(j.data.bpv || [])],
                    };
                  }
                }
              })
              .catch(() => {});

            // Jika di mode LIVE (trendOffset === 0), simpan data historis ke buffer rolling
            if (trendOffset === 0 && hist.s1 && hist.s1.length > 0) {
              if (trendChartType === "temperature") {
                tempBufferRef.current = {
                  s1: [...hist.s1],
                  s2: [...(hist.s2 || [])],
                  s3: [...(hist.s3 || [])],
                  s4: [...(hist.s4 || [])],
                  bpv: [...(hist.bpv || [])],
                };
              } else {
                pressureBufferRef.current = {
                  s1: [...hist.s1],
                  s2: [...(hist.s2 || [])],
                  s3: [...(hist.s3 || [])],
                  s4: [...(hist.s4 || [])],
                  bpv: [...(hist.bpv || [])],
                };
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch historical trend data", err);
      } finally {
        if (active && !isSilent) {
          setIsFetchingTrend(false);
        }
      }
    };

    fetchTrendData(false);
    let interval;
    if (trendOffset === 0) {
      interval = setInterval(() => fetchTrendData(true), 15000);
    }
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [trendPeriod, trendOffset, trendChartType, getTrendTimeRange]);

  // Instant zero-delay memory swap saat toggle antara Pressure dan Temperature
  const handleSwitchTrendType = useCallback((newType) => {
    setTrendChartType(newType);
    trendChartTypeRef.current = newType;
    if (newType === "temperature") {
      if (tempBufferRef.current && tempBufferRef.current.s1 && tempBufferRef.current.s1.length > 0) {
        setTrendData({
          ...tempBufferRef.current,
          resolution: tempBufferRef.current.s1.length,
          type: "temperature",
        });
      } else if (tempTrendData && tempTrendData.s1 && tempTrendData.s1.length > 0) {
        setTrendData({ ...tempTrendData, type: "temperature" });
      }
    } else {
      if (pressureBufferRef.current && pressureBufferRef.current.s1 && pressureBufferRef.current.s1.length > 0) {
        setTrendData({
          ...pressureBufferRef.current,
          resolution: pressureBufferRef.current.s1.length,
          type: "pressure",
        });
      }
    }
  }, [tempTrendData]);

  const handleTrendMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const plotWidth = rect.width || 1;
    const relativeX = Math.max(0, Math.min(plotWidth, x));

    const resolution = trendData?.resolution || (trendData?.s1?.length) || 60;
    const index = Math.round(
      (relativeX / plotWidth) * (resolution - 1),
    );
    const safeIndex = Math.max(0, Math.min(index, resolution - 1));

    // Calculate exact timestamp for hover point from time range
    const { start, end } = getTrendTimeRange();
    const currentPointTime = new Date(start + (safeIndex / (resolution - 1 || 1)) * (end - start));

    const dateStr = currentPointTime.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });
    const timeLabel = currentPointTime.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).replace(/\./g, ":");

    const s1Val = trendData?.s1?.[safeIndex] ?? 0;
    const s2Val = trendData?.s2?.[safeIndex] ?? 0;
    const s3Val = trendData?.s3?.[safeIndex] ?? 0;
    const s4Val = trendData?.s4?.[safeIndex] ?? 0;
    const bpvVal = trendData?.bpv?.[safeIndex] ?? 0;

    setHoverData({
      index: safeIndex,
      left: x,
      values: [s1Val, s2Val, s3Val, s4Val, bpvVal],
      timestamp: `${dateStr} | ${timeLabel}`,
    });
  };

  const handleTrendMouseLeave = () => setHoverData(null);

  const handleRecipeChange = (category, line, stepIdx, field, value) => {
    setRecipes((prev) => {
      if (typeof category === 'string' && ['ripe', 'unripe', 'overripe'].includes(category)) {
        const next = {
          ...prev,
          [category]: {
            ...prev[category],
            [line]: prev[category][line].map((s, idx) =>
              idx === stepIdx ? { ...s, [field]: value } : s,
            ),
          }
        };
        // Also keep backward compatible top-level key updated
        next[line] = next[category][line];
        return next;
      } else {
        // Fallback to old format where first arg is line number
        const actualLine = category;
        const actualStepIdx = line;
        const actualField = stepIdx;
        const actualValue = field;
        const updatedLine = prev[actualLine].map((s, idx) =>
          idx === actualStepIdx ? { ...s, [actualField]: actualValue } : s,
        );
        return {
          ...prev,
          [actualLine]: updatedLine,
          ripe: { ...prev.ripe, [actualLine]: updatedLine },
          unripe: { ...prev.unripe, [actualLine]: updatedLine },
          overripe: { ...prev.overripe, [actualLine]: updatedLine },
        };
      }
    });
  };

  const toggleStatus = (line, stepIdx, field) => {
    if (editingLine !== line) return;
    const currentVal = recipes[line]?.[stepIdx]?.[field];
    handleRecipeChange(line, stepIdx, field, !currentVal);
  };

  const condColor = "#cc5500"; // Dark Orange-Blackish
  const steamColor = "#a9dbe1ff"; // Default Light Blue Cyan

  const handleEquipmentClick = (id, subs = [], customSignals = null) => {
    if (configMode) {
      let signals = customSignals;

      if (!signals) {
        if (id === "bpv_status") {
          signals = [
            { key: "STATUS", label: "Status" },
            { key: "MAKEUP", label: "Make-up" },
            { key: "SURPLUS", label: "Surplus" },
            { key: "PRESSURE", label: "Pressure" },
          ];
        } else if (id === "bpv_control") {
          signals = [
            { key: "MODE", label: "Mode Status (Read)" },
            { key: "MODE_AUTO", label: "Mode Auto (Write)" },
            { key: "MODE_MANUAL", label: "Mode Manual (Write)" },
            { key: "MAKEUP_OPEN", label: "Make-up Open" },
            { key: "MAKEUP_CLOSE", label: "Make-up Close" },
            { key: "BLOWOFF_OPEN", label: "Blow-off Open / On" },
            { key: "BLOWOFF_CLOSE", label: "Blow-off Close / Off" },
          ];
        } else if (id === "blr_pres") {
          signals = [
            { key: "MONITOR", label: "Boiler Pressure" }
          ];
        } else if (id === "bpv_pres") {
          signals = [
            { key: "MONITOR", label: "BPV Pressure" }
          ];
        } else if (id.endsWith("_summary")) {
          signals = [
            { key: "CURRENT_STEP", label: "Current Step" },
            { key: "TOTAL_TIME", label: "Total Sterilization Time" },
            { key: "PREV_TIME", label: "Previous Sterilization Time" },
            { key: "PREV_CYCLE", label: "Previous Cycle Time" },
            { key: "SCORE", label: "Sterilizer Score" },
          ];
        } else if (id.endsWith("_status")) {
          signals = [
            { key: "STATUS", label: "Status" },
            { key: "RECIPE", label: "Recipe" },
            { key: "STEP", label: "Actual Step" },
            { key: "TOTAL_TIME", label: "Total Time" },
            { key: "DOOR_IN", label: "Door (In)" },
            { key: "DOOR_OUT", label: "Door (Out)" },
            { key: "PRESSURE", label: "Pressure" },
            { key: "TEMP", label: "Temperature" },
          ];
        } else if (id.endsWith("_valve_auto")) {
          signals = [
            { key: "MIN", label: "Min (%)" },
            { key: "MAX", label: "Max (%)" },
            { key: "SETPOINT", label: "Setpoint (Bar)" },
            { key: "P", label: "P" },
            { key: "I", label: "I" },
            { key: "D", label: "D" },
            { key: "CONTROL_RANGE_LOW", label: "Control Low (Bar)" },
          ];
        } else if (id.endsWith("_valve_manual")) {
          signals = [
            { key: "SET_VALUE", label: "Set Value (%)" },
          ];
        } else if (id.endsWith("_high_temp")) {
          signals = [
            { key: "SETPOINT", label: "High Temp (\u00B0C)" },
          ];
        }
      }

      handleTagEditRequest(id, subs, signals);
      return;
    }

    console.log(`Equipment clicked: ${id}`);
  };

  // Logic Simulations
  const st1_inlet = "0.0";
  const st1_exhaust = "CLOSE";
  const st1_cond = "OPEN";

  const st2_inlet = "0.2";
  const st2_exhaust = "CLOSE";
  const st2_cond = "CLOSE";

  const st3_inlet = "45.0";
  const st3_exhaust = "CLOSE";
  const st3_cond = "CLOSE";

  const st4_inlet = "0.1";
  const st4_exhaust = "CLOSE";
  const st4_cond = "CLOSE";

  return (
    <section className="som-sterilizer-station">
      {!showSettings && (
        <header className="som-sterilizer-station-header">
          <div className="som-header-left">
            <h2 className="som-sterilizer-station-title">Sterilizer Station</h2>
            <div className="som-station-tabs">
              <button
                className={`som-station-tab ${activeTab === "ai-grading" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("ai-grading");
                  setShowSettings(false);
                }}
              >
                AI GRADING - FFB
              </button>
              <button
                className={`som-station-tab ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("overview");
                  setShowSettings(false);
                }}
              >
                Overview
              </button>
              <button
                className={`som-station-tab ${activeTab === "line1" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("line1");
                  setShowSettings(false);
                }}
              >
                Line 1
              </button>
              <button
                className={`som-station-tab ${activeTab === "line2" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("line2");
                  setShowSettings(false);
                }}
              >
                Line 2
              </button>
              <button
                className={`som-station-tab ${activeTab === "line3" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("line3");
                  setShowSettings(false);
                }}
              >
                Line 3
              </button>
              <button
                className={`som-station-tab ${activeTab === "line4" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("line4");
                  setShowSettings(false);
                }}
              >
                Line 4
              </button>
              <button
                className={`som-station-tab ${activeTab === "trend" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("trend");
                  setShowSettings(false);
                }}
              >
                Trend
              </button>
              <button
                className={`som-station-tab ${activeTab === "bpv" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("bpv");
                  setShowSettings(false);
                }}
              >
                BPV
              </button>
              <button
                className={`som-station-tab ${activeTab === "cycle-history" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("cycle-history");
                  setShowSettings(false);
                }}
              >
                Cycle History
              </button>
            </div>
          </div>

          <div
            className="som-view-toggle-container"
            style={{ marginLeft: "auto", display: "flex", gap: "10px" }}
          >
            <button
              className={`som-view-btn ${!showSettings && viewMode === "process" ? "active" : ""}`}
              onClick={() => {
                setViewMode("process");
                setShowSettings(false);
              }}
            >
              PROCESS VIEW
            </button>
            <button
              className="som-view-btn"
              disabled
              style={{
                cursor: "not-allowed",
                opacity: 0.6,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              MAINTENANCE VIEW
              <svg
                width="10"
                height="12"
                viewBox="0 0 448 512"
                fill="currentColor"
                style={{ marginLeft: "4px" }}
              >
                <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
              </svg>
            </button>

            {onSelectSubmenu && (
              <button
                className={`som-view-btn ${showSettings ? "active" : ""}`}
                onClick={() => setShowSettings(true)}
                style={{ marginLeft: "8px" }}
              >
                SETTINGS
              </button>
            )}
          </div>
        </header>
      )}

      {showSettings ? (
        <SterilizerStationSettingsPage
          onClose={() => setShowSettings(false)}
          onSelectSubmenu={onSelectSubmenu}
          recipes={recipes}
          setRecipes={setRecipes}
          editingLine={editingLine}
          setEditingLine={setEditingLine}
          toggleStatus={toggleStatus}
          handleRecipeChange={handleRecipeChange}
          configMode={configMode}
          handleEquipmentClick={handleEquipmentClick}
          tagMap={tagMap}
          getMappedValue={getMappedValue}
        />
      ) : (
        <div className="som-sterilizer-station-main" style={{ position: 'relative' }}>

          {activeTab === "ai-grading" ? (
            <AiGradingTab
              configMode={configMode}
              availableTags={availableTags}
              tagMap={tagMap}
            />
          ) : activeTab === "trend" ? (
            <TrendTab
              trendPeriod={trendPeriod}
              setTrendPeriod={setTrendPeriod}
              showTrendSettings={showTrendSettings}
              setShowTrendSettings={setShowTrendSettings}
              currentDateTime={currentDateTime}
              handleTrendMouseMove={handleTrendMouseMove}
              handleTrendMouseLeave={handleTrendMouseLeave}
              getResolution={getResolution}
              trendData={trendData}
              isFetchingTrend={isFetchingTrend}
              hoverData={hoverData}
              getXAxisLabels={getXAxisLabels}
              getMappedValue={getMappedValue}
              trendOffset={trendOffset}
              setTrendOffset={setTrendOffset}
              getTrendTimeRange={getTrendTimeRange}
              trendChartType={trendChartType}
              setTrendChartType={handleSwitchTrendType}
              realtimeData={realtimeData}
            />
          ) : activeTab === "bpv" ? (
            <BpvTab
              viewMode={viewMode}
              bpvMakeup={bpvMakeup}
              bpvBlowoff={bpvBlowoff}
              bpvMode={bpvMode}
              bpvMakeupPos={bpvMakeupPos}
              bpvBlowoffPos={bpvBlowoffPos}
              setBpvMakeup={setBpvMakeup}
              setBpvBlowoff={setBpvBlowoff}
              setBpvMode={setBpvMode}
              setBpvMakeupPos={setBpvMakeupPos}
              setBpvBlowoffPos={setBpvBlowoffPos}
              handleEquipmentClick={handleEquipmentClick}
              getMappedValue={getMappedValue}
              configMode={configMode}
              tagMap={tagMap}
              trendData={trendData}
              tempTrendData={tempTrendData}
            />
          ) : activeTab === "cycle-history" ? (
            <CycleHistoryTab configMode={configMode} />
          ) : (
            <OverviewTab
              activeTab={activeTab}
              viewMode={viewMode}
              handleEquipmentClick={handleEquipmentClick}
              condColor={condColor}
              st1_inlet={st1_inlet}
              st1_exhaust={st1_exhaust}
              st1_cond={st1_cond}
              st2_inlet={st2_inlet}
              st2_exhaust={st2_exhaust}
              st2_cond={st2_cond}
              st3_inlet={st3_inlet}
              st3_exhaust={st3_exhaust}
              st3_cond={st3_cond}
              st4_inlet={st4_inlet}
              st4_exhaust={st4_exhaust}
              st4_cond={st4_cond}
              getMappedValue={getMappedValue}
              configMode={configMode}
              tagMap={tagMap}
              trendData={trendData}
              tempTrendData={tempTrendData}
            />
          )}


        </div>
      )}

      {tagEdit && (
        <TagEditorModal
          data={tagEdit}
          onClose={() => setTagEdit(null)}
          onSave={handleTagSave}
          tagMap={tagMap}
          availableTags={availableTags}
          saving={savingTags}
        />
      )}
    </section>
  );
}

export default SterilizerStationPage;
