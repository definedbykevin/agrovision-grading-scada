import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * TagEditorModal — Modal popup untuk mapping tag PLC ke equipment / parameter
 */
export const TagEditorModal = ({
  data,
  onClose,
  onSave,
  tagMap = {},
  availableTags = [],
  saving = false,
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
        const targets = data.subs && data.subs.length > 0 ? data.subs : [data.targetId];
        targets.forEach((t) => {
          initial[`${t}__STATUS`] = tagMap[`${t}__STATUS`] || "";
          initial[`${t}__START`] = tagMap[`${t}__START`] || "";
          initial[`${t}__STOP`] = tagMap[`${t}__STOP`] || "";
        });
        if (!data.subs || data.subs.length === 0) {
          initial[`${data.targetId}__MONITOR`] = tagMap[`${data.targetId}__MONITOR`] || "";
        }
      }
      setLocalTags(initial);
    }
  }, [data, tagMap]);

  if (!data) return null;

  const hasSignals = data.signals && data.signals.length > 0;

  const renderTagSelect = (value, onChange, tagList, label) => (
    <div className="tag-field" style={{ marginBottom: 0 }}>
      <label
        style={{
          fontSize: "10.5px",
          fontWeight: 800,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
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
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#0f172a",
          color: "#e2e8f0",
          fontSize: "12px",
          outline: "none",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <option value="" style={{ background: "#0f172a", color: "#94a3b8" }}>— No Tag —</option>
        {tagList.map((tag) => (
          <option key={tag.id} value={tag.id} style={{ background: "#0f172a", color: "#e2e8f0" }}>
            {tag.tag_name} {tag.data_type ? `(${tag.data_type})` : ""}
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
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 10000,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "8vh",
      }}
    >
      <div
        className="som-equipment-control-popup som-tag-edit-popup"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "450px",
          maxHeight: "85vh",
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 800,
                color: "#f8fafc",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ⚙️ PLC Tag Configuration
            </h2>
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                marginTop: "3px",
                display: "block",
              }}
            >
              Target: <strong style={{ color: "#38bdf8" }}>{data.targetId}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#94a3b8",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {hasSignals ? (
            data.signals.map((sig) => (
              <div key={sig.key}>
                {renderTagSelect(
                  localTags[`${data.targetId}__${sig.key}`] || "",
                  (val) =>
                    setLocalTags({
                      ...localTags,
                      [`${data.targetId}__${sig.key}`]: val,
                    }),
                  availableTags,
                  sig.label
                )}
              </div>
            ))
          ) : (
            <div>
              {renderTagSelect(
                localTags[`${data.targetId}__MONITOR`] || "",
                (val) =>
                  setLocalTags({
                    ...localTags,
                    [`${data.targetId}__MONITOR`]: val,
                  }),
                availableTags,
                "MONITORING POINT (READ)"
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "12px",
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
              padding: "9px 22px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            }}
          >
            {saving ? "SAVING..." : "SAVE MAPPING"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * DafTagMonitorCardSVG — AgroVision Golden Card Theme
 * Menampilkan single tag monitor card di dalam kanvas SVG dengan header kuning emas AgroVision.
 */
export function DafTagMonitorCardSVG({
  x,
  y,
  title,
  parameterLabel,
  value,
  unit,
  width = 140,
  scale = 1,
  status = "normal", // 'normal' | 'running' | 'stop' | 'alarm'
  valueColor,
  onClick,
  style = {},
}) {
  const isNoTag = !value || String(value).trim().toLowerCase() === "no tag";
  const isPending = String(value).trim() === "--";
  const cardWidth = width;
  const isSingle = !parameterLabel || String(parameterLabel).trim() === "";
  const cardHeight = isSingle ? 68 : 64;

  const resolvedValueColor = isNoTag ? "#94a3b8" : (isPending ? "#64748b" : (valueColor || "#0f172a"));

  // LED color matching Sterilizer
  let dotColor = "#94a3b8";
  let dotShadow = "none";
  if (!isNoTag && !isPending) {
    if (status === "running") {
      dotColor = "#10b981";
      dotShadow = "0 0 8px rgba(16, 185, 129, 0.8)";
    } else if (status === "stop" || status === "alarm") {
      dotColor = "#ef4444";
      dotShadow = "0 0 8px rgba(239, 68, 68, 0.8)";
    } else {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0) {
        dotColor = "#10b981";
        dotShadow = "0 0 8px rgba(16, 185, 129, 0.8)";
      } else {
        dotColor = "#ef4444";
        dotShadow = "0 0 8px rgba(239, 68, 68, 0.8)";
      }
    }
  }

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(${-cardWidth / 2}, ${-cardHeight / 2})`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <foreignObject
        width={cardWidth}
        height={cardHeight + 80}
        style={{ overflow: "visible", pointerEvents: "auto" }}
      >
        <div
          className="som-daf-tag-card"
          onClick={onClick}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            userSelect: "none",
            cursor: onClick ? "pointer" : "default",
            pointerEvents: "auto",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            ...style,
          }}
        >
          {/* Header Card Kuning Emas AgroVision + LED Indicator */}
          <div
            style={{
              background: "#ffdb3b",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "2px solid #e2e8f0",
              minHeight: "24px",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "0.05em",
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                textTransform: "uppercase",
                lineHeight: "1.2",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                marginRight: "4px",
                display: "block",
              }}
            >
              {title}
            </span>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: dotColor,
                border: "1.5px solid #ffffff",
                boxShadow: dotShadow,
                flexShrink: 0,
              }}
            />
          </div>

          {/* Body Card Bersih */}
          <div
            style={{
              padding: isSingle ? "8px 12px" : "6px 12px",
              textAlign: "center",
              display: "flex",
              alignItems: "baseline",
              justifyContent: isSingle ? "center" : "space-between",
              gap: "4px",
              minHeight: isSingle ? "36px" : "28px",
              background: "#ffffff",
            }}
          >
            {parameterLabel && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                }}
              >
                {parameterLabel}
              </span>
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
              <span
                style={{
                  fontSize: isSingle ? "20px" : "15px",
                  fontWeight: isNoTag ? 800 : 950,
                  color: resolvedValueColor,
                  letterSpacing: "0.01em",
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                  fontStyle: isNoTag ? "italic" : "normal",
                  lineHeight: 1.1,
                }}
              >
                {isNoTag ? "no tag" : value}
              </span>
              {!isNoTag && unit && (
                <span
                  style={{
                    fontSize: isSingle ? "12px" : "11px",
                    fontWeight: 800,
                    color: "#94a3b8",
                    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                  }}
                >
                  {unit}
                </span>
              )}
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

function StatusPanelRow({ label, value, unit, valueColor = "#0f172a", isLast = false, isSingle = false }) {
  const isNoTag = !value || String(value).trim().toLowerCase() === "no tag";
  const isPending = String(value).trim() === "--";
  const finalColor = isNoTag ? "#94a3b8" : (isPending ? "#64748b" : (valueColor === "#f8fafc" ? "#0f172a" : valueColor));
  const hasLabel = Boolean(label && String(label).trim().length > 0);

  if (isSingle) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "baseline",
          gap: "4px",
          width: "100%",
          padding: "4px 0",
        }}
      >
        <span
          style={{
            color: finalColor,
            fontSize: "20px",
            fontWeight: isNoTag ? 800 : 950,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            letterSpacing: "0.01em",
            fontStyle: isNoTag ? "italic" : "normal",
            lineHeight: 1.1,
          }}
        >
          {isNoTag ? "no tag" : value}
        </span>
        {!isNoTag && unit && (
          <span
            style={{
              color: "#94a3b8",
              fontSize: "12px",
              fontWeight: 800,
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            }}
          >
            {unit}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: hasLabel ? "space-between" : "center",
        alignItems: "baseline",
        padding: "3px 0",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
        gap: "8px",
        width: "100%",
      }}
    >
      {hasLabel && (
        <span
          style={{
            color: "#64748b",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.02em",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
      <div style={{ textAlign: hasLabel ? "right" : "center", display: "flex", alignItems: "baseline", gap: "3px", whiteSpace: "nowrap" }}>
        <span
          style={{
            color: finalColor,
            fontSize: isNoTag ? "14px" : "15px",
            fontWeight: isNoTag ? 800 : 950,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            letterSpacing: "0.01em",
            fontStyle: isNoTag ? "italic" : "normal",
          }}
        >
          {isNoTag ? "no tag" : value}
        </span>
        {!isNoTag && unit && (
          <span
            style={{
              color: "#94a3b8",
              fontSize: "11px",
              fontWeight: 800,
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * DafStatusPanelSVG — AgroVision Golden Panel Theme
 * Menampilkan panel parameter di dalam kanvas SVG dengan header kuning emas AgroVision.
 * Identik dengan format kartu Sterilizer Station (Inter, bobot tebal, LED indicator).
 */
export function DafStatusPanelSVG({
  x,
  y,
  title = "",
  rows = [], // [{ label: "PV", value: "--", unit: "%", valueColor: "#0f172a" }]
  width = 175,
  scale = 1,
  headerBg = "#ffdb3b",
  headerColor = "#0f172a",
  onClick,
  style = {},
}) {
  const isSingle = rows.length === 1 && (!rows[0].label || String(rows[0].label).trim() === "");
  const cardHeight = isSingle ? 68 : (36 + (rows.length * 28));

  // Evaluasi status LED persis seperti di Sterilizer
  const isAllNoTag = rows.length === 0 || rows.every(r => !r.value || String(r.value).trim().toLowerCase() === "no tag");
  const isAllPending = !isAllNoTag && rows.every(r => String(r.value).trim() === "--");
  const isCardOffline = isAllNoTag || isAllPending;
  const isCardRunning = !isCardOffline && rows.some(r => {
    const s = String(r.value).trim().toLowerCase();
    if (s === "run" || s === "open" || s === "true" || s === "1") return true;
    const num = parseFloat(r.value);
    return !isNaN(num) && num > 0;
  });

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(${-width / 2}, ${-cardHeight / 2})`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <foreignObject
        width={width}
        height={cardHeight + 80}
        style={{ overflow: "visible", pointerEvents: "auto" }}
      >
        <div
          className="som-daf-status-panel-card"
          onClick={onClick}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            userSelect: "none",
            cursor: onClick ? "pointer" : "default",
            pointerEvents: "auto",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            ...style,
          }}
        >
          {/* Header Panel Kuning Emas AgroVision + LED Indicator */}
          {title && (
            <div
              style={{
                background: headerBg,
                padding: "4px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #e2e8f0",
                minHeight: "24px",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: headerColor,
                  letterSpacing: "0.05em",
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                  textTransform: "uppercase",
                  lineHeight: "1.2",
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </span>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  border: "1.5px solid #ffffff",
                  flexShrink: 0,
                  backgroundColor: isCardOffline ? "#94a3b8" : (isCardRunning ? "#10b981" : "#ef4444"),
                  boxShadow: isCardOffline ? "none" : (isCardRunning ? "0 0 8px rgba(16, 185, 129, 0.8)" : "0 0 8px rgba(239, 68, 68, 0.8)"),
                }}
              />
            </div>
          )}

          {/* Body Rows AgroVision White */}
          <div
            style={{
              padding: isSingle ? "8px 12px" : "6px 12px",
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              justifyContent: "center",
            }}
          >
            {rows.map((r, i) => (
              <StatusPanelRow
                key={i}
                label={r.label}
                value={r.value}
                unit={r.unit}
                valueColor={r.valueColor}
                isLast={i === rows.length - 1}
                isSingle={isSingle}
              />
            ))}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

/**
 * DafEquipmentIconSVG
 * Menampilkan ikon equipment (motor, valve, pump, dll) di dalam kanvas SVG.
 */
export function DafEquipmentIconSVG({
  x = 0,
  y = 0,
  icon,
  size = 100,
  width,
  height,
  scale = 1,
  rotation = 0,
  mirror = false,
  mirrorX = false,
  mirrorY = false,
  scaleX = 1,
  scaleY = 1,
  onClick,
  style = {},
  imageStyle = {},
}) {
  const w = width || size;
  const h = height || size;
  const halfW = w / 2;
  const halfH = h / 2;

  const isMirrorX = Boolean(mirror || mirrorX || scaleX < 0);
  const isMirrorY = Boolean(mirrorY || scaleY < 0);
  const finalScaleX = (isMirrorX ? -1 : 1) * Math.abs(scaleX) * scale;
  const finalScaleY = (isMirrorY ? -1 : 1) * Math.abs(scaleY) * scale;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${finalScaleX}, ${finalScaleY})`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <image
        href={icon}
        x={-halfW}
        y={-halfH}
        width={w}
        height={h}
        style={{ pointerEvents: "all", ...imageStyle }}
      />
    </g>
  );
}

export const EquipmentIconSVG = DafEquipmentIconSVG;
export default DafStatusPanelSVG;
