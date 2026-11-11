import React, { useRef } from "react";
import "./BpvTab.css";
import bpvImageUrl from "../../assets/BPV-Plant-Overview.webp";
import valvePositionerSvg from "../../assets/item/valve_positioner.svg";
import { EquipmentIconSVG, IpomasMonitorCardSVG } from "../../components/SharedComponents.jsx";

export const SteamFlowSVG = ({ d, active, isRunning, mode = "flowing", color = "#a9dbe1ff", thickness = 8, className = "" }) => {
  const isActive = active || isRunning;
  if (!isActive) return null;

  let modeClass = "liquid-flow--flowing";
  if (mode === "standby") modeClass = "liquid-flow--standby";
  if (mode === "liquid") modeClass = "liquid-flow--liquid";

  const isSolid = mode === "liquid" || mode === "standby";

  return (
    <g className={`${modeClass} ${className}`}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={thickness + 6}
        className="liquid-flow-glow"
        pointerEvents="none"
        style={isSolid ? { strokeDasharray: "none" } : {}}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        className="liquid-flow-aura"
        pointerEvents="none"
        style={isSolid ? { strokeDasharray: "none" } : {}}
      />
    </g>
  );
};

export const ValveModernCardSVG = ({ x, y, scale = 1, title = "", position = "0.0", onClick, style = {} }) => {
  const isNoTag = position === undefined || position === null || position === "" || String(position).trim().toLowerCase() === "no tag";
  const isOffline = String(position).trim() === "--";

  const numPos = parseFloat(position);
  const validNum = !isNaN(numPos) ? Math.min(100, Math.max(0, numPos)) : 0;

  let displayPos = "No Tag";
  if (isOffline) {
    displayPos = "--";
  } else if (!isNoTag && !isNaN(numPos)) {
    displayPos = `${Number.isInteger(numPos) ? numPos : numPos.toFixed(1)}%`;
  } else if (!isNoTag) {
    displayPos = String(position);
  }

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-100, -50)`}>
      <foreignObject width="200" height="100" style={{ overflow: "visible", pointerEvents: "none" }}>
        <div 
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          style={{ 
            background: "#ffffff", 
            border: "1px solid #e2e8f0", 
            borderRadius: "14px", 
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)", 
            padding: "10px 14px 14px 14px", 
            fontFamily: "'Inter', sans-serif", 
            display: "flex", 
            flexDirection: "column", 
            gap: "6px", 
            cursor: "pointer", 
            pointerEvents: "auto", 
            boxSizing: "border-box",
            ...style 
          }}>
          
          <div style={{ textAlign: "center", fontSize: "13px", fontWeight: "950", color: "#0f172a", borderBottom: "2.5px solid #ffdb3b", paddingBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
            {title}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "2px" }}>
            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>POSITION</span>
            <div style={{ position: "relative", width: "100%", height: "24px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <div 
                style={{ 
                  width: isNoTag || isOffline ? "0%" : `${validNum}%`, 
                  height: "100%", 
                  background: "linear-gradient(90deg, #ffdb3b, #d4ac0d)", 
                  transition: "width 0.15s ease" 
                }} 
              />
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "950", color: isNoTag ? "#64748b" : "#0f172a" }}>
                {displayPos}
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const BpvModernStatusCardSVG = ({ x, y, scale = 1, status = "STOP", makeup = "OPEN", surplus = "OPEN", pressure = "0.0", onClick, style = {} }) => {
  let displayStatus = status;
  const s = String(status).trim().toLowerCase();
  if (s === "0") displayStatus = "STOP";
  else if (s === "1") displayStatus = "AUTO";
  else if (s === "2") displayStatus = "MANUAL";
  else if (s === "--") displayStatus = "--";
  else if (s === "no tag") displayStatus = "No Tag";

  const getStatusColor = (val) => {
    if (val === "No Tag" || val === "--") return "#0f172a";
    return "#0f172a";
  };
  const getValveColor = (val) => {
    if (val === "No Tag" || val === "--") return "#64748b";
    return "#0f172a";
  };
  const getPressureColor = (val) => {
    if (val === "No Tag" || val === "--") return "#0f172a";
    return "#0f172a";
  };

  const formatValveStatus = (rawVal) => {
    if (rawVal === undefined || rawVal === null || rawVal === "" || String(rawVal).trim().toLowerCase() === "no tag") {
      return "No Tag";
    }
    if (String(rawVal).trim() === "--") return "--";
    const str = String(rawVal).trim().toLowerCase();
    if (str === "true" || str === "1" || str === "open") return "OPEN";
    if (str === "false" || str === "0" || str === "close") return "CLOSE";
    return String(rawVal);
  };

  const displayMakeup = formatValveStatus(makeup);
  const displaySurplus = formatValveStatus(surplus);

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-160, -90)`}>
      <foreignObject width="320" height="180" style={{ overflow: "visible", pointerEvents: "none" }}>
        <div 
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: "16px", fontFamily: "'Inter', sans-serif", cursor: "pointer", pointerEvents: "auto", ...style }}>
          <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "950", color: "#0f172a", borderBottom: "2px solid #ffdb3b", paddingBottom: "8px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>BACK PRESSURE VESSEL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>STATUS</span>
              <span style={{ fontSize: "14px", color: getStatusColor(displayStatus), fontWeight: "950" }}>{displayStatus}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>MAKE-UP</span>
              <span style={{ fontSize: "14px", color: getValveColor(displayMakeup), fontWeight: "950" }}>{displayMakeup}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>SURPLUS</span>
              <span style={{ fontSize: "14px", color: getValveColor(displaySurplus), fontWeight: "950" }}>{displaySurplus}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>PRESSURE</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ fontSize: "22px", color: getPressureColor(pressure), fontWeight: "950" }}>{pressure}</span>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>BAR</span>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const AtmosphereLabelSVG = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <path d="M -25,-18 L 25,-18 M 15,-25 L 25,-18 L 15,-11" stroke="rgba(255,255,255,0.8)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" style={{ fill: "rgba(255,255,255,0.8)", fontWeight: "900", fontSize: "15px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'Inter', sans-serif" }}>To Atmosfer</text>
  </g>
);

export const BpvControlSwitchPanelSVG = ({
  x,
  y,
  scale = 1,
  mode = "--",
  modeAuto = "AUTO",
  modeManual = "MANUAL",
  makeupOpen = "CLOSE",
  makeupClose = "CLOSE",
  blowoffOpen = "OPEN",
  blowoffClose = "OPEN",
  onModeAuto,
  onModeManual,
  onMakeupOpen,
  onMakeupClose,
  onBlowoffOpen,
  onBlowoffClose,
  onClick,
  style = {}
}) => {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) translate(-180, -75)`} className="bpv-modern-control-group">
      <foreignObject width="360" height="150" style={{ overflow: "visible", pointerEvents: "none" }}>
        <div 
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
          style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", padding: "15px", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", cursor: "pointer", pointerEvents: "auto", ...style }}>
          <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "950", color: "#0f172a", borderBottom: "2px solid #ffdb3b", paddingBottom: "10px", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "1px" }}>CONTROL PANEL</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", marginBottom: "6px", textTransform: "uppercase" }}>
                {mode === "AUTO" ? "AUTO" : (mode === "MANUAL" || mode === "MAN") ? "MANUAL" : "MODE"}
              </span>
              <div style={{ display: "flex", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%", position: "relative", overflow: "hidden" }}>
                {modeAuto !== "No Tag" && modeManual !== "No Tag" && (mode === "AUTO" || mode === "MANUAL" || mode === "MAN") && (
                  <div style={{
                    position: "absolute",
                    top: "3px",
                    bottom: "3px",
                    left: mode === "AUTO" ? "3px" : "calc(50% + 1.5px)",
                    width: "calc(50% - 4.5px)",
                    background: mode === "AUTO" ? "#ffdb3b" : "#fbbf24",
                    borderRadius: "6px",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    zIndex: 1
                  }} />
                )}
                {modeAuto === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onModeAuto && onModeAuto(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", zIndex: 2, color: "#0f172a", position: "relative", cursor: "pointer" }}>AUTO</div>
                )}
                {modeManual === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onModeManual && onModeManual(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", zIndex: 2, color: "#0f172a", position: "relative", cursor: "pointer" }}>MAN</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", marginBottom: "6px" }}>MAKE-UP</span>
              <div style={{ display: "flex", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%" }}>
                {makeupOpen === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onMakeupOpen && onMakeupOpen(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", borderRadius: "6px", background: "#1FE921", color: "#fff", cursor: "pointer" }}>OPEN</div>
                )}
                {makeupClose === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onMakeupClose && onMakeupClose(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", borderRadius: "6px", background: "#EF4444", color: "#fff", cursor: "pointer" }}>CLOSE</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100px" }}>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", marginBottom: "6px" }}>BLOW-OFF</span>
              <div style={{ display: "flex", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%" }}>
                {blowoffOpen === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onBlowoffOpen && onBlowoffOpen(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", borderRadius: "6px", background: "#1FE921", color: "#fff", cursor: "pointer" }}>ON</div>
                )}
                {blowoffClose === "No Tag" ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", height: "22px", fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>No Tag</div>
                ) : (
                  <div onClick={(e) => { e.stopPropagation(); onBlowoffClose && onBlowoffClose(); }} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "950", padding: "6px 0", borderRadius: "6px", background: "#EF4444", color: "#fff", cursor: "pointer" }}>OFF</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export default function BpvTab({
  viewMode,
  bpvMakeup,
  bpvBlowoff,
  bpvMode,
  bpvMakeupPos,
  bpvBlowoffPos,
  setBpvMakeup,
  setBpvBlowoff,
  setBpvMode,
  setBpvMakeupPos,
  setBpvBlowoffPos,
  handleEquipmentClick,
  getMappedValue,
  configMode = false,
  tagMap = {},
}) {
  const svgRef = useRef(null);

  const checkMapping = (id) => {
    return tagMap && Object.keys(tagMap).some(key => key.startsWith(`${id}__`) && tagMap[key] && tagMap[key] !== "null" && tagMap[key] !== "undefined" && tagMap[key] !== "");
  };

  const getDeveloperStyle = (id) => {
    if (!configMode) return {};
    const hasMapping = checkMapping(id);
    return {
      outline: hasMapping ? "2px solid #3b82f6" : "2px dashed #ef4444",
      boxShadow: hasMapping ? "0 0 8px rgba(59, 130, 246, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasMapping ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
    };
  };

  let displayMakeupPos = getMappedValue ? getMappedValue("bpv_makeup_valve", "MONITOR", "No Tag") : "No Tag";
  const currentMakeupPos = parseFloat(displayMakeupPos) || 0;

  let displayBlowoffPos = getMappedValue ? getMappedValue("bpv_blowoff_valve", "MONITOR", "No Tag") : "No Tag";
  const currentBlowoffPos = parseFloat(displayBlowoffPos) || 0;

  return (
    <div className="som-sterilizer-station-layout">
      <div className="som-sterilizer-station-flow-card">
        <div className="som-sterilizer-station-flow-body">
          <svg
            ref={svgRef}
            viewBox="-400 10 2920 1260"
            className="station-svg-canvas"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="tint-red" color-interpolation-filters="sRGB">
                <feColorMatrix type="matrix"
                  values="0.244 0.822 0.083 0 0
                          0     0     0     0 0
                          0     0     0     0 0
                          0     0     0     1 0"/>
              </filter>
              <filter id="tint-green" color-interpolation-filters="sRGB">
                <feColorMatrix type="matrix"
                  values="0      0      0      0 0
                          0.2445 0.8225 0.0830 0 0
                          0      0      0      0 0
                          0     0     0     1 0"/>
              </filter>
            </defs>
            <image href={bpvImageUrl} width="2600" x="-230" />

            {viewMode === "maintenance" && (
              <foreignObject x="650" y="20" width="600" height="60" style={{ overflow: "visible" }}>
                <div className="som-diagnostic-banner">TECHNICAL DIAGNOSTIC ACTIVE</div>
              </foreignObject>
            )}



            {/* BPV Flow Pipe Paths */}
            <g className="bpv-pipe-flows">
              {/* Dynamic Make-Up Valve Flow Logic */}
              {currentMakeupPos > 0.5 ? (
                /* Flowing Mode when Make-Up Valve OPEN (> 0) */
                <SteamFlowSVG
                  d="M -227,654 L -205,657 Q -183,660 -183,682 L -186,919 Q -186,928 -181,935 L -181,935 Q -176,942 -168,944 L -166,944 Q -157,946 -147,946 L 670,944 Q 695,944 695,919 L 694,680 Q 694,655 719,655 L 1008,653 Q 1019,653 1028,660 L 1029,661 Q 1037,667 1037,677 L 1036,686"
                  active={true}
                  mode="flowing"
                  color="#38bdf8"
                  thickness={14}
                />
              ) : (
                /* Standby Pulsing Mode when Make-Up Valve CLOSED (= 0) */
                <SteamFlowSVG
                  d="M -225,656 L -204,659 Q -183,662 -183,683 L -187,906 Q -187,918 -184,930 L -184,930 Q -181,942 -169,945 L -168,945 Q -156,948 -143,948 L 384,945"
                  active={true}
                  mode="liquid"
                  className="pulsing-flow-anim"
                  color="#38bdf8"
                  thickness={18}
                />
              )}
              {/* Flow 1 */}
              <SteamFlowSVG
                d="M 1106,715 L 1108,534 Q 1108,522 1096,522 L -204,519 Q -216,519 -216,507 L -217,10"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 2 */}
              <SteamFlowSVG
                d="M 1196,714 L 1194,504 Q 1194,492 1182,492 L -169,492 Q -181,492 -181,480 L -181,11"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 3 */}
              <SteamFlowSVG
                d="M 1282,714 L 1285,464 Q 1285,449 1270,449 L -119,446 Q -134,446 -134,431 L -136,11"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 4 */}
              <SteamFlowSVG
                d="M 1373,719 L 1373,430 Q 1373,417 1360,417 L -86,410 Q -99,410 -99,397 L -104,14"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 5 */}
              <SteamFlowSVG
                d="M 1459,714 L 1461,394 Q 1461,381 1448,381 L -42,378 Q -55,378 -55,365 L -59,10"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 6 */}
              <SteamFlowSVG
                d="M 2365,424 L 1691,424 Q 1678,424 1668,432 L 1667,433 Q 1657,440 1653,452 L 1653,452 Q 1649,463 1649,475 L 1649,670"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={20}
              />
              {/* Flow 7 */}
              <SteamFlowSVG
                d="M 1767,718 L 1766,532 Q 1766,520 1770,509 L 1770,506 Q 1774,495 1786,494 L 1793,494 Q 1805,493 1817,493 L 2363,496"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 8 */}
              <SteamFlowSVG
                d="M 1856,719 L 1856,550 Q 1856,536 1870,536 L 2367,533"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={15}
              />
              {/* Flow 9 */}
              <SteamFlowSVG
                d="M 1959,671 L 1961,625 Q 1961,610 1966,596 L 1966,596 Q 1971,582 1986,581 L 1987,581 Q 2003,579 2019,579 L 2367,577"
                active={true}
                mode="flowing"
                color="#38bdf8"
                thickness={20}
              />
              {/* Dynamic Blow-Off Valve Flow Logic (Hanya flowing jika OPEN > 0) */}
              {currentBlowoffPos > 0.5 && (
                <SteamFlowSVG
                  d="M 2073,775 L 2072,664 Q 2072,639 2097,639 L 2365,638"
                  active={true}
                  mode="flowing"
                  color="#38bdf8"
                  thickness={12}
                />
              )}
            </g>

            {/* Group to shift all overlay elements to match background image offset (+140px) */}
            <g transform="translate(110, 0)">

              <EquipmentIconSVG x={310} y={893} icon={valvePositionerSvg} isRunning={currentMakeupPos > 0.5} size={190} rotation={270} />
              <ValveModernCardSVG 
                x={310} 
                y={1080} 
                scale={1.4} 
                title="MAKE-UP VALVE" 
                position={displayMakeupPos} 
                onClick={() => handleEquipmentClick && handleEquipmentClick("bpv_makeup_valve")} 
                style={getDeveloperStyle && getDeveloperStyle("bpv_makeup_valve")} 
              />

              <EquipmentIconSVG x={1989} y={760} icon={valvePositionerSvg} isRunning={currentBlowoffPos > 0.5} size={100} rotation={0} />
              <ValveModernCardSVG 
                x={2160} 
                y={740} 
                scale={1.1} 
                title="BLOW-OFF VALVE" 
                position={displayBlowoffPos} 
                onClick={() => handleEquipmentClick && handleEquipmentClick("bpv_blowoff_valve")} 
                style={getDeveloperStyle && getDeveloperStyle("bpv_blowoff_valve")} 
              />

              <AtmosphereLabelSVG x={2170} y={210} />

              <IpomasMonitorCardSVG x={-180} y={700} id="blr_pres" title="BOILER PRESSURE" singleValue={getMappedValue ? getMappedValue("blr_pres", "MONITOR", "--") : "--"} singleUnit="Bar" width={140} scale={1.2} onClick={handleEquipmentClick} style={getDeveloperStyle("blr_pres")} />
              <IpomasMonitorCardSVG x={1400} y={1000} id="bpv_pres" title="PRESSURE BPV" singleValue={getMappedValue ? getMappedValue("bpv_pres", "MONITOR", "--") : "--"} singleUnit="BAR" width={200} scale={1.4} onClick={handleEquipmentClick} style={getDeveloperStyle("bpv_pres")} />

              <BpvModernStatusCardSVG
                x={200}
                y={180}
                scale={1.4}
                status={getMappedValue ? getMappedValue("bpv_status", "STATUS", "--") : "--"}
                makeup={getMappedValue ? getMappedValue("bpv_status", "MAKEUP", "--") : "--"}
                surplus={getMappedValue ? getMappedValue("bpv_status", "SURPLUS", "--") : "--"}
                pressure={getMappedValue ? getMappedValue("bpv_status", "PRESSURE", "--") : "--"}
                onClick={() => handleEquipmentClick && handleEquipmentClick("bpv_status")}
                style={getDeveloperStyle("bpv_status")}
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
