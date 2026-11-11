import { useState, useEffect, useCallback } from "react";

/**
 * TagBindingPanel — Panel untuk mapping card monitoring ke PLC tag.
 * Muncul saat Ctrl+X aktif (binding mode).
 */
const STORAGE_KEY = "kernel_plant_tag_bindings";

// Daftar monitoring points yang bisa di-binding untuk Kernel Plant
const MONITOR_POINTS = [
  // FIBER CYCLONE
  { id: "fc_press_1_amp", label: "Press 1 Ampere", defaultUnit: "A" },
  { id: "fc_press_2_amp", label: "Press 2 Ampere", defaultUnit: "A" },
  { id: "fc_winnowing_fan", label: "FC Winnowing Fan VFD", defaultUnit: "Hz" },
  { id: "fc_air_lock", label: "FC Air Lock VFD", defaultUnit: "Hz" },
  { id: "fc_vacuum", label: "FC Vacuum Pressure", defaultUnit: "mmWC" },
  
  // LTDS
  { id: "ltds1_fan", label: "LTDS 1 Fan VFD", defaultUnit: "Hz" },
  { id: "ltds1_air_lock", label: "LTDS 1 Air Lock VFD", defaultUnit: "Hz" },
  { id: "ltds1_vacuum", label: "LTDS 1 Vacuum Pressure", defaultUnit: "mmWC" },
  { id: "ltds2_fan", label: "LTDS 2 Fan VFD", defaultUnit: "Hz" },
  { id: "ltds2_air_lock", label: "LTDS 2 Air Lock VFD", defaultUnit: "Hz" },
  { id: "ltds2_vacuum", label: "LTDS 2 Vacuum Pressure", defaultUnit: "mmWC" },

  // SILO
  { id: "silo1_heater", label: "Silo 1 Heater Temp", defaultUnit: "°C" },
  { id: "silo1_fan", label: "Silo 1 Fan VFD", defaultUnit: "Hz" },
  { id: "silo1_level", label: "Silo 1 Level", defaultUnit: "%" },
  { id: "silo2_heater", label: "Silo 2 Heater Temp", defaultUnit: "°C" },
  { id: "silo2_fan", label: "Silo 2 Fan VFD", defaultUnit: "Hz" },
  { id: "silo2_level", label: "Silo 2 Level", defaultUnit: "%" },

  // CLAYBATH
  { id: "claybath_vfd", label: "Claybath VFD", defaultUnit: "Hz" },
  { id: "claybath_pump", label: "Claybath Pump VFD", defaultUnit: "Hz" },
  { id: "claybath_sg", label: "Claybath Specific Gravity", defaultUnit: "SG" },
];

// Load bindings dari localStorage
function loadBindings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Simpan bindings ke localStorage
function saveBindings(bindings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export default function TagBindingPanel({
  tags = [],
  liveValues = {},
  onClose,
}) {
  const [bindings, setBindings] = useState(loadBindings);
  const [search, setSearch] = useState("");

  const filteredTags = tags.filter((t) =>
    t.tag_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleBind = useCallback((pointId, tagName) => {
    setBindings((prev) => {
      const next = { ...prev, [pointId]: tagName };
      saveBindings(next);
      return next;
    });
  }, []);

  const handleUnbind = useCallback((pointId) => {
    setBindings((prev) => {
      const next = { ...prev };
      delete next[pointId];
      saveBindings(next);
      return next;
    });
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "400px",
        height: "100vh",
        background: "#0f172a",
        color: "#fff",
        zIndex: 9999,
        boxShadow: "-8px 0 30px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, sans-serif",
        fontSize: "13px",
        borderLeft: "2px solid #334155",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#1e293b",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
            🔗 TAG BINDING
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94a3b8" }}>
            Hubungkan card monitoring ke PLC tag
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "1px solid #475569",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          CLOSE
        </button>
      </div>

      {/* Search Tags */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #1e293b" }}>
        <input
          placeholder="Cari tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#fff",
            fontSize: "12px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* List Monitoring Points */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
        {MONITOR_POINTS.map((point) => {
          const boundTag = bindings[point.id];
          const liveValue = boundTag ? liveValues[boundTag] : null;

          return (
            <div
              key={point.id}
              style={{
                padding: "10px 12px",
                marginBottom: "6px",
                borderRadius: "8px",
                background: "#1e293b",
                border: boundTag ? "1px solid #3b82f6" : "1px solid #334155",
              }}
            >
              {/* Point Label */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "12px" }}>
                  {point.label}
                </span>
                {boundTag && liveValue !== null && (
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#22c55e",
                    }}
                  >
                    {typeof liveValue === "number"
                      ? liveValue.toFixed(1)
                      : String(liveValue)}{" "}
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                      {point.defaultUnit}
                    </span>
                  </span>
                )}
              </div>

              {/* Tag Selector */}
              <div style={{ display: "flex", gap: "6px" }}>
                <select
                  value={boundTag || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBind(point.id, e.target.value);
                    } else {
                      handleUnbind(point.id);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: "4px",
                    border: "1px solid #334155",
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  <option value="">— Select Tag —</option>
                  {filteredTags.map((t) => (
                    <option key={t.id} value={t.tag_name}>
                      {t.tag_name}
                    </option>
                  ))}
                </select>

                {boundTag && (
                  <button
                    onClick={() => handleUnbind(point.id)}
                    title="Unbind"
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      border: "1px solid #ef4444",
                      background: "transparent",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid #334155",
          fontSize: "11px",
          color: "#64748b",
          textAlign: "center",
        }}
      >
        Bindings tersimpan otomatis di localStorage
      </div>
    </div>
  );
}

// Utility untuk membaca bindings
export function getTagBindings() {
  return loadBindings();
}
