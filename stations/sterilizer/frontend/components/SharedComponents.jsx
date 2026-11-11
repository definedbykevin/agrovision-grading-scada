import React from "react";

/**
 * CylinderDoorSVG — Crossfade animasi antara state open & close
 * Props:
 *   topX, topY, topSize : posisi & ukuran pintu atas (tengah gambar)
 *   botX, botY, botSize : posisi & ukuran pintu bawah (tengah gambar)
 *   topState   : "open" | "close"
 *   botState   : "open" | "close"
 *   topOpenSrc, topCloseSrc, botOpenSrc, botCloseSrc : URL aset SVG
 */
export function CylinderDoorSVG({
  topX = 0,  topY = 0,  topSize = 200,
  botX = 0,  botY = 100, botSize = 200,
  topState = "close",
  botState = "close",
  topOpenSrc,
  topCloseSrc,
  botOpenSrc,
  botCloseSrc,
}) {
  const transitionStyle = "opacity 0.15s ease-out";

  const topOpenOpacity  = topState === "open"  ? 1 : 0;
  const topCloseOpacity = topState === "close" ? 1 : 0;
  const botOpenOpacity  = botState === "open"  ? 1 : 0;
  const botCloseOpacity = botState === "close" ? 1 : 0;

  const topHalf = topSize / 2;
  const botHalf = botSize / 2;

  return (
    <g>
      {/* TOP DOOR */}
      <image
        href={topCloseSrc}
        x={topX - topHalf} y={topY - topHalf}
        width={topSize} height={topSize}
        style={{ opacity: topCloseOpacity, transition: transitionStyle }}
      />
      <image
        href={topOpenSrc}
        x={topX - topHalf} y={topY - topHalf}
        width={topSize} height={topSize}
        style={{ opacity: topOpenOpacity, transition: transitionStyle }}
      />

      {/* BOTTOM DOOR */}
      <image
        href={botCloseSrc}
        x={botX - botHalf} y={botY - botHalf}
        width={botSize} height={botSize}
        style={{ opacity: botCloseOpacity, transition: transitionStyle }}
      />
      <image
        href={botOpenSrc}
        x={botX - botHalf} y={botY - botHalf}
        width={botSize} height={botSize}
        style={{ opacity: botOpenOpacity, transition: transitionStyle }}
      />
    </g>
  );
}

export function EquipmentIconSVG({
  x,
  y,
  icon,
  size = 120,
  rotation = 0,
  isRunning = false,
  onClick,
  style,
}) {
  const half = size / 2;
  const filterStyle = isRunning ? "url(#tint-green)" : "url(#tint-red)";
  return (
    <g 
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <image 
        href={icon} 
        x={-half} 
        y={-half} 
        width={size} 
        height={size} 
        style={{ filter: filterStyle }} // TERAPKAN FILTER WARNA DI SINI
      />
    </g>
  );
}

export function IpomasMonitorCardSVG({
  x,
  y,
  id,
  title,
  singleValue,
  singleUnit,
  width = 160,
  scale = 1,
  onClick,
  style = {},
}) {
  const cardWidth = width;
  const cardHeight = 64;
  const isNoTag = !singleValue || String(singleValue).trim().toLowerCase() === "no tag" || String(singleValue).trim() === "--";

  const formatDisplayValue = (val) => {
    if (val === null || val === undefined || val === "") return "no tag";
    const str = String(val).trim();
    if (str.toLowerCase() === "no tag" || str === "--") return str;
    const num = Number(str);
    if (!isNaN(num)) {
      return num.toFixed(2);
    }
    return str;
  };

  const displayVal = isNoTag ? singleValue : formatDisplayValue(singleValue);

  return (
    <g
      id={id}
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      <foreignObject
        x={-cardWidth / 2}
        y={-cardHeight / 2}
        width={cardWidth}
        height={cardHeight}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(id); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(id); }}
          style={{
            background: "rgba(255,255,255,0.96)",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
            padding: "6px 10px",
            textAlign: "center",
            color: "#0f172a",
            cursor: onClick ? "pointer" : "default",
            pointerEvents: "auto",
            ...style
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              marginBottom: "4px",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1, color: isNoTag ? "#94a3b8" : "#0f172a", fontStyle: isNoTag ? "italic" : "normal" }}>
            {displayVal}
            {singleUnit && !isNoTag && (
              <span style={{ fontSize: "11px", marginLeft: "4px", opacity: 0.7 }}>
                {singleUnit}
              </span>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

export function TagMonitorCardSVG({
  x,
  y,
  title = "INLET STEAM",
  parameterLabel = "",
  value = "no tag",
  unit = "",
  status = "grey", // "grey", "green", "red", "yellow", "blue"
  width = 150,
  scale = 1,
  valueColor = "#0f172a",
  onClick,
  onMouseEnter,
  onMouseLeave,
  style = {},
}) {
  const cardWidth = width;
  const cardHeight = 62;
  const isNoTag = !value || String(value).trim().toLowerCase() === "no tag" || String(value).trim() === "--";
  const isInletSteam2 = String(title || "").toUpperCase().includes("INLET STEAM 2");
  const effectiveUnit = (isInletSteam2 && !unit) ? "%" : unit;

  const formatDisplayValue = (val) => {
    if (val === null || val === undefined || val === "") return "no tag";
    const str = String(val).trim();
    if (str.toLowerCase() === "no tag" || str === "--") return str;
    const num = Number(str);
    if (!isNaN(num)) {
      if (effectiveUnit === "%" || isInletSteam2) {
        return Math.round(num).toString();
      }
      // Formatting dengan 2 angka di belakang koma (2 decimal places)
      return num.toFixed(2);
    }
    return str;
  };

  const displayVal = isNoTag ? value : formatDisplayValue(value);

  // Status dot color
  let dotColor = "#94a3b8"; // grey
  if (status === "green") dotColor = "#22c55e";
  else if (status === "red") dotColor = "#ef4444";
  else if (status === "yellow") dotColor = "#eab308";
  else if (status === "blue") dotColor = "#3b82f6";

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      <foreignObject
        x={-cardWidth / 2}
        y={-cardHeight / 2}
        width={cardWidth}
        height={cardHeight}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(e); }}
          onPointerDown={(e) => { e.stopPropagation(); }}
          onMouseEnter={(e) => { onMouseEnter && onMouseEnter(e); }}
          onMouseLeave={(e) => { onMouseLeave && onMouseLeave(e); }}
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            cursor: onClick ? "pointer" : "default",
            pointerEvents: "auto",
            ...style
          }}
        >
          {/* Header Kuning */}
          <div
            style={{
              background: "#facc15",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #eab308",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {title}
            </span>
            {/* Status Dot */}
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: dotColor,
                border: "2px solid #ffffff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }}
            />
          </div>

          {/* Body */}
          <div
            style={{
              padding: "6px 8px",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              minHeight: "32px",
            }}
          >
            {parameterLabel && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                {parameterLabel}:
              </span>
            )}
            <span
              style={{
                fontSize: "14px",
                fontWeight: 900,
                fontStyle: isNoTag ? "italic" : "normal",
                color: isNoTag ? "#94a3b8" : valueColor,
                letterSpacing: "0.02em",
              }}
            >
              {displayVal}
              {effectiveUnit && !isNoTag && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    fontStyle: "normal",
                    marginLeft: "3px",
                    opacity: 0.8,
                  }}
                >
                  {effectiveUnit}
                </span>
              )}
            </span>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

export function SterilizerStatusPanelSVG({
  x,
  y,
  title = "STERILIZER 1",
  status = "RUN",
  recipe = "NORMAL",
  actualStep = "Step 0",
  totalTime = "0",
  doorIn = "CLOSE",
  doorOut = "CLOSE",
  pressure = "0.0",
  temp = "0.0",
  width = 220,
  scale = 1,
  onClick,
  style = {},
}) {
  const cardHeight = 270;

  const Row = ({ label, value, unit, valueColor = "#0f172a" }) => {
    const isNoTag = !value || String(value).trim().toLowerCase() === "no tag" || String(value).trim() === "--";
    const formatDisplayValue = (val) => {
      if (val === null || val === undefined || val === "") return "no tag";
      const str = String(val).trim();
      if (str.toLowerCase() === "no tag" || str === "--") return str;
      const num = Number(str);
      if (!isNaN(num)) {
        return num.toFixed(2);
      }
      return str;
    };
    const displayVal = isNoTag ? value : (unit === "Bar" || unit === "°C" || unit === "bar" ? formatDisplayValue(value) : value);
    const finalColor = isNoTag ? "#94a3b8" : valueColor;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
        <span style={{ color: "#475569", fontSize: "12px", fontWeight: 700 }}>{label}</span>
        <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span style={{ color: finalColor, fontSize: "12px", fontWeight: 900, fontStyle: isNoTag ? "italic" : "normal" }}>{displayVal}</span>
          {unit && !isNoTag && <span style={{ color: "#475569", fontSize: "11px", fontWeight: 700 }}>{unit}</span>}
        </div>
      </div>
    );
  };

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      <foreignObject
        x={-width / 2}
        y={-cardHeight / 2}
        width={width}
        height={cardHeight}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            fontFamily: "'Inter', sans-serif",
            cursor: onClick ? "pointer" : "default",
            pointerEvents: "auto",
            ...style
          }}
        >
          {/* Header AgroVision (Kuning) */}
          <div style={{
            background: "#facc15",
            padding: "6px 8px",
            textAlign: "center",
            borderBottom: "1px solid #eab308",
          }}>
            <span style={{
              fontSize: "12px",
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
              {title}
            </span>
          </div>
          
          {/* Body */}
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <Row
              label="STATUS"
              value={status}
              valueColor={
                status === "EMERGENCY"
                  ? "#ef4444"
                  : status === "RUN"
                  ? "#16a34a"
                  : status === "STOP"
                  ? "#64748b"
                  : "#0f172a"
              }
            />
            <Row label="RECIPE" value={recipe} />
            <Row label="ACTUAL STEP" value={actualStep} valueColor="#ef4444" />
            <Row label="TOTAL TIME" value={totalTime} unit="min" valueColor="#ef4444" />
            <Row label="DOOR (IN)" value={doorIn} />
            <Row label="DOOR (OUT)" value={doorOut} />
            <Row label="PRESSURE" value={pressure} unit="Bar" valueColor="#ef4444" />
            <Row label="TEMP" value={temp} unit="°C" valueColor="#ef4444" />
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
