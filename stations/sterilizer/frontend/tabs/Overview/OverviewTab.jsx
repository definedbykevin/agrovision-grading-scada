import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import "./OverviewTab.css";
import "../../settings/SterilizerStationSettingsModal.css";
import usePlcStore from "@core/store";

import SterilizerStationSettingsPage from "../../settings/SterilizerStationSettingsPage.jsx";

// Auth helper (sama seperti di PlcConfigView)
const authHeaders = () => {
  const token = localStorage.getItem("kip_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Assets
import sterilizerStationImageUrl from "../../assets/sterilizer-station.webp";
import sterilizerLineImageUrl from "../../assets/sterilizer-line.webp";
import bpvImageUrl from "../../assets/BPV-Plant-Overview.webp";
import valveActuatorSvg from "../../assets/item/valve_actuator.svg";
import valvePositionerSvg from "../../assets/item/valve_positioner.svg";
import valvePneumaticActuatorSvg from "../../assets/item/valve_pneumatic_actuator.svg";
import topOpenSvg from "../../assets/item/top-open.svg";
import topCloseSvg from "../../assets/item/top-close.svg";
import botOpenSvg from "../../assets/item/bot-open.svg";
import botCloseSvg from "../../assets/item/bot-close.svg";

import {
  IpomasMonitorCardSVG,
  EquipmentIconSVG,
  TagMonitorCardSVG,
  SterilizerStatusPanelSVG,
} from "../../components/SharedComponents.jsx";
import PressureTrendModal from "../../components/PressureTrendModal.jsx";


export const TEST_INLET_DOOR_ST1 = "CLOSE";
export const TEST_INLET_DOOR_ST2 = "CLOSE";
export const TEST_INLET_DOOR_ST3 = "CLOSE";
export const TEST_INLET_DOOR_ST4 = "CLOSE";

export const TEST_OUTLET_DOOR_ST1 = "OPEN"
export const TEST_OUTLET_DOOR_ST2 = "CLOSE";
export const TEST_OUTLET_DOOR_ST3 = "CLOSE"
export const TEST_OUTLET_DOOR_ST4 = "CLOSE";
// ==========================================

// ==========================================
// NumericKeypad for Operator Setpoint Editing
// ==========================================
function ModulateNumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    if (typeof value === "string" && !isNaN(parseFloat(value))) {
      return value;
    }
    return "0";
  });

  const handleNumber = (n) => {
    setDisplayValue((prev) => (prev === "0" ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => {
    if (!displayValue.includes(".")) setDisplayValue(displayValue + ".");
  };
  const handleBack = () => {
    setDisplayValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  };
  const handleEnter = () => {
    onConfirm(parseFloat(displayValue) || 0);
  };

  const btnStyle = {
    padding: "14px",
    fontSize: "18px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#1e293b",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={(e) => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button
            style={{
              background: "transparent",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#64748b",
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
        </div>
        <div
          style={{
            padding: "16px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
          }}
        >
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
            <button key={n} onClick={() => handleNumber(n)} style={btnStyle}>
              {n}
            </button>
          ))}
          <button onClick={handleDecimal} style={btnStyle}>
            .
          </button>
          <button onClick={() => handleNumber(0)} style={btnStyle}>
            0
          </button>
          <button
            onClick={handleBack}
            style={{ ...btnStyle, background: "#f1f5f9" }}
          >
            ⌫
          </button>
          <button
            onClick={() => setDisplayValue("0")}
            style={{
              gridColumn: "span 1",
              padding: "12px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            CLEAR
          </button>
          <button
            onClick={handleEnter}
            style={{
              gridColumn: "span 2",
              padding: "12px",
              background: "#f5be00",
              border: "none",
              color: "#0f172a",
              borderRadius: "10px",
              fontWeight: "900",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            ENTER
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SettingValveModulateSVG({
  x,
  y,
  scale = 1,
  getMappedValue,
  line = 1,
  configMode = false,
  tagMap = {},
  handleEquipmentClick,
  getDeveloperStyle,
  config
}) {
  const cardWidth = 460;
  const cardHeight = 340;

  // Equipment IDs for Tag Binding
  const autoCardId = `st${line}_valve_auto`;
  const manualCardId = `st${line}_valve_manual`;

  const [activeKeypad, setActiveKeypad] = useState(null);
  const [localOverrides, setLocalOverrides] = useState({});

  // Helper to fetch mapped tag values with fallback to alias, local overrides, and defaults
  const fetchVal = (cardId, signalKey, defaultVal) => {
    // 1. Check local optimistic override
    const overrideKey = `${cardId}__${signalKey}`;
    if (localOverrides[overrideKey] !== undefined) {
      return localOverrides[overrideKey];
    }

    if (!getMappedValue) return defaultVal;

    // 2. Try primary cardId + signalKey
    let val = getMappedValue(cardId, signalKey);
    if (
      val !== undefined &&
      val !== null &&
      String(val).trim() !== "" &&
      String(val).trim().toLowerCase() !== "no tag" &&
      String(val).trim() !== "--"
    ) {
      return val;
    }

    // 3. Fallback for Auto: check st${line}_v1_valve_auto
    if (cardId.includes("_valve_auto")) {
      val = getMappedValue(`st${line}_v1_valve_auto`, signalKey);
      if (
        val !== undefined &&
        val !== null &&
        String(val).trim() !== "" &&
        String(val).trim().toLowerCase() !== "no tag" &&
        String(val).trim() !== "--"
      ) {
        return val;
      }
      if (signalKey === "SETPOINT") {
        val =
          getMappedValue(cardId, "SP") ??
          getMappedValue(`st${line}_v1_valve_auto`, "SP");
        if (
          val !== undefined &&
          val !== null &&
          String(val).trim() !== "" &&
          String(val).trim().toLowerCase() !== "no tag" &&
          String(val).trim() !== "--"
        ) {
          return val;
        }
      }
    }

    // 4. Fallback for Manual: check st${line}_mv1_valve_manual
    if (cardId.includes("_valve_manual")) {
      val = getMappedValue(`st${line}_mv1_valve_manual`, signalKey);
      if (
        val !== undefined &&
        val !== null &&
        String(val).trim() !== "" &&
        String(val).trim().toLowerCase() !== "no tag" &&
        String(val).trim() !== "--"
      ) {
        return val;
      }
    }

    return defaultVal;
  };

  const getTagIdFor = (cId, sKey) => {
    let tId = tagMap?.[`${cId}__${sKey}`];
    if (tId) return { tagId: tId, key: `${cId}__${sKey}` };
    if (cId.includes("_valve_auto")) {
      const v1Id = `st${line}_v1_valve_auto`;
      tId = tagMap?.[`${v1Id}__${sKey}`];
      if (tId) return { tagId: tId, key: `${v1Id}__${sKey}` };
      if (sKey === "SETPOINT") {
        tId = tagMap?.[`${v1Id}__SP`] || tagMap?.[`${cId}__SP`];
        if (tId) return { tagId: tId, key: `${v1Id}__SP` };
      }
    }
    if (cId.includes("_valve_manual")) {
      const mv1Id = `st${line}_mv1_valve_manual`;
      tId = tagMap?.[`${mv1Id}__${sKey}`];
      if (tId) return { tagId: tId, key: `${mv1Id}__${sKey}` };
    }
    return { tagId: null, key: `${cId}__${sKey}` };
  };

  const autoMin = fetchVal(autoCardId, "MIN", 25);
  const autoMax = fetchVal(autoCardId, "MAX", 100);
  const autoSp = fetchVal(autoCardId, "SETPOINT", 2.6);
  const autoP = fetchVal(autoCardId, "P", "No Tag");
  const autoI = fetchVal(autoCardId, "I", "No Tag");
  const autoD = fetchVal(autoCardId, "D", "No Tag");

  const manualVal = fetchVal(manualCardId, "SET_VALUE", 100);

  const autoStyle = getDeveloperStyle ? getDeveloperStyle(autoCardId) : {};
  const manualStyle = getDeveloperStyle ? getDeveloperStyle(manualCardId) : {};

  const handleFieldClick = (cardId, signalKey, label, currentVal, unit) => {
    if (configMode) {
      if (handleEquipmentClick) handleEquipmentClick(cardId);
    } else {
      setActiveKeypad({
        label: `${label} (LINE ${line})`,
        value: currentVal,
        unit,
        cardId,
        signalKey,
      });
    }
  };

  const handleKeypadConfirm = (newVal) => {
    if (!activeKeypad) return;
    const { cardId, signalKey } = activeKeypad;

    // 1. Optimistic local update
    setLocalOverrides((prev) => ({
      ...prev,
      [`${cardId}__${signalKey}`]: newVal,
    }));

    // 2. Dispatch to PLC via WebSocket
    const { tagId, key } = getTagIdFor(cardId, signalKey);
    if (tagId) {
      usePlcStore.getState().sendCommand(tagId, newVal, key, "sterilizer");
    }

    // 3. Fallback direct HTTP write to ensure persistence & reliability
    fetch("/api/sterilizer/plc-config/write", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ tagId, value: newVal, tag_name: key }),
    }).catch((err) => {
      console.warn("[SettingValveModulate] HTTP write fallback err:", err.message);
    });

    setActiveKeypad(null);
  };

  return (
    <>
      <g transform={`translate(${x}, ${y}) scale(${scale})`}>
        <foreignObject
          x={0}
          y={0}
          width={cardWidth}
          height={cardHeight}
          style={{ overflow: "visible" }}
        >
          <div className="som-scada-modulate-wrapper">
            {/* TOP CARD: SETTING VALVE MODULATE AUTO */}
            <div
              className="som-scada-modulate-card"
              style={autoStyle}
            >
              <div
                className="som-scada-modulate-header"
                style={{ cursor: configMode ? "pointer" : "default" }}
                onClick={() => configMode && handleEquipmentClick && handleEquipmentClick(autoCardId)}
              >
                SETTING VALVE MODULATE AUTO
              </div>
              <div className="som-scada-modulate-body">
                <div className="som-scada-modulate-grid">
                  {/* Left Column: MIN & MAX */}
                  <div className="som-scada-col">
                    <div className="som-scada-field-row">
                      <span className="som-scada-label">MIN</span>
                      <div className="som-scada-input-group">
                        <div
                          className="som-scada-input-box"
                          title="Klik untuk ubah nilai MIN"
                          onClick={() => handleFieldClick(autoCardId, "MIN", "SETTING VALVE MODULATE AUTO - MIN", autoMin, "%")}
                        >
                          {autoMin}
                        </div>
                        <span className="som-scada-unit">%</span>
                      </div>
                    </div>
                    <div className="som-scada-field-row">
                      <span className="som-scada-label">MAX</span>
                      <div className="som-scada-input-group">
                        <div
                          className="som-scada-input-box"
                          title="Klik untuk ubah nilai MAX"
                          onClick={() => handleFieldClick(autoCardId, "MAX", "SETTING VALVE MODULATE AUTO - MAX", autoMax, "%")}
                        >
                          {autoMax}
                        </div>
                        <span className="som-scada-unit">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: SET POINT, P, I, D */}
                  <div className="som-scada-col">
                    <div className="som-scada-field-row">
                      <span className="som-scada-label">SET POINT</span>
                      <div className="som-scada-input-group">
                        <div
                          className="som-scada-input-box"
                          title="Klik untuk ubah nilai SET POINT"
                          onClick={() => handleFieldClick(autoCardId, "SETPOINT", "SETTING VALVE MODULATE AUTO - SET POINT", autoSp, "Bar")}
                        >
                          {autoSp}
                        </div>
                        <span className="som-scada-unit">Bar</span>
                      </div>
                    </div>
                    <div className="som-scada-field-row">
                      <span className="som-scada-label">P</span>
                      <div className="som-scada-input-group">
                        <div
                          className="som-scada-input-box no-unit"
                          title="Klik untuk ubah nilai P"
                          onClick={() => handleFieldClick(autoCardId, "P", "SETTING VALVE MODULATE AUTO - P", autoP, "")}
                        >
                          {autoP}
                        </div>
                        <span className="som-scada-unit-placeholder" />
                      </div>
                    </div>
                    <div className="som-scada-field-row">
                      <span className="som-scada-label">I</span>
                      <div className="som-scada-input-group">
                        <div
                          className="som-scada-input-box no-unit"
                          title="Klik untuk ubah nilai I"
                          onClick={() => handleFieldClick(autoCardId, "I", "SETTING VALVE MODULATE AUTO - I", autoI, "")}
                        >
                          {autoI}
                        </div>
                        <span className="som-scada-unit-placeholder" />
                      </div>
                    </div>
                    <div className="som-scada-field-row">
                      <span className="som-scada-label">D</span>
                      <div className="som-scada-input-group">
                        <div
                          className="som-scada-input-box no-unit"
                          title="Klik untuk ubah nilai D"
                          onClick={() => handleFieldClick(autoCardId, "D", "SETTING VALVE MODULATE AUTO - D", autoD, "")}
                        >
                          {autoD}
                        </div>
                        <span className="som-scada-unit-placeholder" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM CARD: SETTING VALVE MODULATE MANUAL */}
            <div
              className="som-scada-modulate-card"
              style={manualStyle}
            >
              <div
                className="som-scada-modulate-header"
                style={{ cursor: configMode ? "pointer" : "default" }}
                onClick={() => configMode && handleEquipmentClick && handleEquipmentClick(manualCardId)}
              >
                SETTING VALVE MODULATE MANUAL
              </div>
              <div className="som-scada-modulate-body">
                <div className="som-scada-manual-row">
                  <span className="som-scada-label">SET VALUE</span>
                  <div className="som-scada-input-group">
                    <div
                      className="som-scada-input-box"
                      title="Klik untuk ubah nilai SET VALUE"
                      onClick={() => handleFieldClick(manualCardId, "SET_VALUE", "SETTING VALVE MODULATE MANUAL - SET VALUE", manualVal, "%")}
                    >
                      {manualVal}
                    </div>
                    <span className="som-scada-unit">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </foreignObject>
      </g>

      {/* Numeric Keypad for editing & writing values */}
      {activeKeypad && (
        <ModulateNumericKeypad
          label={activeKeypad.label}
          value={activeKeypad.value}
          unit={activeKeypad.unit || ""}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleKeypadConfirm}
        />
      )}
    </>
  );
}

const formatDoorStatus = (rawVal) => {
  if (rawVal === undefined || rawVal === null) return "--";
  if (rawVal === "No Tag" || String(rawVal).trim().toLowerCase() === "no tag") return "No Tag";
  if (rawVal === "--") return "--";
  if (typeof rawVal === "boolean") {
    return rawVal ? "CLOSE" : "OPEN";
  }
  const str = String(rawVal).toLowerCase().trim();
  if (str === "no tag") return "No Tag";
  if (str === "--") return "--";
  if (str === "true" || str === "1") return "CLOSE";
  if (str === "false" || str === "0") return "OPEN";
  if (str === "open" || str === "close") return str.toUpperCase();
  return "CLOSE";
};

const formatValveStatus = (rawVal) => {
  if (rawVal === undefined || rawVal === null) return "--";
  if (rawVal === "No Tag" || String(rawVal).trim().toLowerCase() === "no tag") return "No Tag";
  if (rawVal === "--") return "--";
  if (typeof rawVal === "boolean") {
    return rawVal ? "OPEN" : "CLOSE";
  }
  const str = String(rawVal).toLowerCase().trim();
  if (str === "no tag") return "No Tag";
  if (str === "--") return "--";
  if (str === "true" || str === "1" || str === "open") return "OPEN";
  if (str === "false" || str === "0" || str === "close") return "CLOSE";
  const num = parseFloat(rawVal);
  if (!isNaN(num)) {
    return num > 0 ? "OPEN" : "CLOSE";
  }
  return "CLOSE";
};

// 24 Manual Actuators - Ubah x, y, dan size untuk masing-masing valve di bawah ini:
const MANUAL_VALVES = [
  { id: "valve_exhaust_steam_st1", x: -246, y: 60, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_inlet_steam_1_st1", x: -274, y: 287, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_inlet_steam_2_st1", x: -272, y: 485, size: 92, rotation: 270, icon: valvePositionerSvg },
  { id: "valve_flashing_st1", x: -268, y: 688, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_condensate_1_st1", x: 228, y: 926, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_condensate_2_st1", x: 228, y: 1016, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_d_cond_st1", x: 144, y: 800, size: 50, rotation: 180, icon: valvePneumaticActuatorSvg },

  { id: "valve_exhaust_steam_st2", x: 399, y: 60, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_inlet_steam_1_st2", x: 370, y: 287, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_inlet_steam_2_st2", x: 375, y: 485, size: 92, rotation: 270, icon: valvePositionerSvg },
  { id: "valve_flashing_st2", x: 375, y: 688, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_condensate_1_st2", x: 860, y: 923, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_condensate_2_st2", x: 860, y: 1016, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_d_cond_st2", x: 783, y: 800, size: 50, rotation: 180, icon: valvePneumaticActuatorSvg },

  { id: "valve_exhaust_steam_st3", x: 1076, y: 60, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_inlet_steam_1_st3", x: 1052, y: 287, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_inlet_steam_2_st3", x: 1057, y: 485, size: 92, rotation: 270, icon: valvePositionerSvg },
  { id: "valve_flashing_st3", x: 1052, y: 688, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_condensate_1_st3", x: 1550, y: 923, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_condensate_2_st3", x: 1550, y: 1016, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_d_cond_st3", x: 1468, y: 800, size: 50, rotation: 180, icon: valvePneumaticActuatorSvg },

  { id: "valve_exhaust_steam_st4", x: 1745, y: 60, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_inlet_steam_1_st4", x: 1720, y: 287, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_inlet_steam_2_st4", x: 1725, y: 485, size: 92, rotation: 270, icon: valvePositionerSvg },
  { id: "valve_flashing_st4", x: 1720, y: 688, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_condensate_1_st4", x: 2218, y: 923, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_condensate_2_st4", x: 2218, y: 1016, size: 50, rotation: 90, icon: valvePneumaticActuatorSvg },
  { id: "valve_d_cond_st4", x: 2135, y: 800, size: 50, rotation: 180, icon: valvePneumaticActuatorSvg },
];

// Konfigurasi Top Open dan Top Close Doors - Ubah x, y, size, dan rotation di sini
const TOP_DOORS = [
  // Top Open
  { id: "top_open_1", src: topOpenSvg, x: -135, y: -17, size: 173, rotation: 0 },
  { id: "top_open_2", src: topOpenSvg, x: 510, y: -17, size: 173, rotation: 0 },
  { id: "top_open_3", src: topOpenSvg, x: 1193, y: -17, size: 173, rotation: 0 },
  { id: "top_open_4", src: topOpenSvg, x: 1860, y: -17, size: 173, rotation: 0 },

  // Top Close
  { id: "top_close_1", src: topCloseSvg, x: -112, y: 15, size: 150, rotation: 0 },
  { id: "top_close_2", src: topCloseSvg, x: 528, y: 15, size: 150, rotation: 0 },
  { id: "top_close_3", src: topCloseSvg, x: 1210, y: 15, size: 150, rotation: 0 },
  { id: "top_close_4", src: topCloseSvg, x: 1880, y: 15, size: 150, rotation: 0 },
];

// Konfigurasi Bot Open dan Bot Close Doors - Ubah x, y, size, dan rotation di sini
const BOT_DOORS = [
  // Bot Open
  { id: "bot_open_1", src: botOpenSvg, x: 122, y: 580, size: 190, rotation: 0 },
  { id: "bot_open_2", src: botOpenSvg, x: 768, y: 589, size: 190, rotation: 0 },
  { id: "bot_open_3", src: botOpenSvg, x: 1444, y: 582, size: 190, rotation: 0 },
  { id: "bot_open_4", src: botOpenSvg, x: 2115, y: 589, size: 190, rotation: 0 },

  // Bot Close
  { id: "bot_close_1", src: botCloseSvg, x: 127, y: 609, size: 150, rotation: 0 },
  { id: "bot_close_2", src: botCloseSvg, x: 767, y: 609, size: 150, rotation: 0 },
  { id: "bot_close_3", src: botCloseSvg, x: 1447, y: 609, size: 150, rotation: 0 },
  { id: "bot_close_4", src: botCloseSvg, x: 2115, y: 609, size: 150, rotation: 0 },
];



// Konfigurasi Tag Monitor Cards (seperti INLET STEAM, dll) - ubah x, y, title, value, status di sini
// status: "grey" | "green" | "red" | "yellow" | "blue"
const TAG_MONITOR_CARDS = [
  { id: "bpv_pressure", x: -400, y: 30, title: "BPV PRESSURE", defaultVal: "no tag", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "boiler_pressure", x: -400, y: 110, title: "BOILER PRESSURE", defaultVal: "no tag", unit: "Bar", status: "grey", width: 150, valueColor: "#ef4444" },
  { id: "card_inlet_door_st1", x: -25, y: 220, title: "INLET DOOR ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_door_st2", x: 620, y: 220, title: "INLET DOOR ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_door_st3", x: 1300, y: 220, title: "INLET DOOR ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_door_st4", x: 1980, y: 220, title: "INLET DOOR ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  { id: "card_inlet_steam_1_st1", x: -250, y: 200, title: "INLET STEAM 1 ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_steam_2_st1", x: -250, y: 420, title: "INLET STEAM 2 ST1", defaultVal: "no tag", unit: "%", status: "grey", width: 150 },
  { id: "card_flashing_st1", x: -250, y: 610, title: "FLASHING ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  { id: "card_inlet_steam_1_st2", x: 400, y: 200, title: "INLET STEAM 1 ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_steam_2_st2", x: 400, y: 420, title: "INLET STEAM 2 ST2", defaultVal: "no tag", unit: "%", status: "grey", width: 150 },
  { id: "card_flashing_st2", x: 400, y: 610, title: "FLASHING STEAM ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  { id: "card_inlet_steam_1_st3", x: 1070, y: 200, title: "INLET STEAM 1 ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_steam_2_st3", x: 1070, y: 420, title: "INLET STEAM 2 ST3", defaultVal: "no tag", unit: "%", status: "grey", width: 150 },
  { id: "card_flashing_st3", x: 1070, y: 610, title: "FLASHING ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  { id: "card_inlet_steam_1_st4", x: 1740, y: 200, title: "INLET STEAM 1 ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_inlet_steam_2_st4", x: 1740, y: 420, title: "INLET STEAM 2 ST4", defaultVal: "no tag", unit: "%", status: "grey", width: 150 },
  { id: "card_flashing_st4", x: 1740, y: 610, title: "FLASHING ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  // Overview Cards (Pressure & Temperature)
  { id: "overview_pressure_1", x: -20, y: 370, title: "PRESSURE 1", defaultVal: "0.0", unit: "Bar", status: "grey", width: 180, valueColor: "#ef4444" },
  { id: "overview_temp_1", x: -20, y: 520, title: "TEMPERATURE 1", defaultVal: "0.0", unit: "°C", status: "grey", width: 180, valueColor: "#ef4444" },

  { id: "overview_pressure_2", x: 620, y: 370, title: "PRESSURE 2", defaultVal: "0.0", unit: "Bar", status: "grey", width: 180, valueColor: "#ef4444" },
  { id: "overview_temp_2", x: 620, y: 520, title: "TEMPERATURE 2", defaultVal: "0.0", unit: "°C", status: "grey", width: 180, valueColor: "#ef4444" },

  { id: "overview_pressure_3", x: 1300, y: 370, title: "PRESSURE 3", defaultVal: "0.0", unit: "Bar", status: "grey", width: 180, valueColor: "#ef4444" },
  { id: "overview_temp_3", x: 1300, y: 520, title: "TEMPERATURE 3", defaultVal: "0.0", unit: "°C", status: "grey", width: 180, valueColor: "#ef4444" },

  { id: "overview_pressure_4", x: 1950, y: 370, title: "PRESSURE 4", defaultVal: "0.0", unit: "Bar", status: "grey", width: 180, valueColor: "#ef4444" },
  { id: "overview_temp_4", x: 1950, y: 520, title: "TEMPERATURE 4", defaultVal: "0.0", unit: "°C", status: "grey", width: 180, valueColor: "#ef4444" },

  { id: "card_outlet_door_st1", x: 200, y: 580, title: "OUTLET DOOR ST1", defaultVal: TEST_OUTLET_DOOR_ST1, unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st2", x: 850, y: 580, title: "OUTLET DOOR ST2", defaultVal: TEST_OUTLET_DOOR_ST2, unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st3", x: 1540, y: 580, title: "OUTLET DOOR ST3", defaultVal: TEST_OUTLET_DOOR_ST3, unit: "", status: "grey", width: 150 },
  { id: "card_outlet_door_st4", x: 2220, y: 580, title: "OUTLET DOOR ST4", defaultVal: TEST_OUTLET_DOOR_ST4, unit: "", status: "grey", width: 150 },
  { id: "card_exhaust_steam_st1", x: -240, y: -10, title: "EXHAUST STEAM ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_exhaust_steam_st2", x: 400, y: -30, title: "EXHAUST STEAM ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_exhaust_steam_st3", x: 1080, y: -30, title: "EXHAUST STEAM ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_exhaust_steam_st4", x: 1750, y: -30, title: "EXHAUST STEAM ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_relief_condensate_st1", x: 320, y: 900, title: "RELIEF CONDENSATE VALVE ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_condensate_1_st1", x: 320, y: 990, title: "CONDENSATE ST1", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_relief_condensate_st2", x: 960, y: 900, title: "RELIEF CONDENSATE VALVE ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_condensate_1_st2", x: 960, y: 990, title: "CONDENSATE ST2", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_relief_condensate_st3", x: 1645, y: 900, title: "RELIEF CONDENSATE VALVE ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_condensate_1_st3", x: 1645, y: 990, title: "CONDENSATE ST3", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_relief_condensate_st4", x: 2320, y: 900, title: "RELIEF CONDENSATE VALVE ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },
  { id: "card_condensate_1_st4", x: 2320, y: 990, title: "CONDENSATE ST4", defaultVal: "no tag", unit: "", status: "grey", width: 150 },

  // D. CONDENSATE Door Cards
  { id: "d_cond_st1", x: 300, y: 800, title: "D. COND ST1", defaultVal: "OPEN", unit: "", status: "grey", width: 160, scale: 1 },
  { id: "d_cond_st2", x: 950, y: 800, title: "D. COND ST2", defaultVal: "CLOSE", unit: "", status: "grey", width: 160, scale: 1 },
  { id: "d_cond_st3", x: 1630, y: 800, title: "D. COND ST3", defaultVal: "OPEN", unit: "", status: "grey", width: 160, scale: 1 },
  { id: "d_cond_st4", x: 2300, y: 800, title: "D. COND ST4", defaultVal: "OPEN", unit: "", status: "grey", width: 160, scale: 1 },
];


/**
 * Custom hook for hover effects and sound
 */
function useAmpHover() {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const [popupPos, setPopupPos] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.top,
        right: rect.right,
        left: rect.left,
        bottom: rect.bottom,
      });
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setPopupPos(null);
    }, 150);
  };

  const handlePopupMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handlePopupMouseLeave = () => {
    setIsHovered(false);
    setPopupPos(null);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return {
    cardRef,
    isHovered,
    popupPos,
    handleMouseEnter,
    handleMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  };
}

/**
 * Trend Popup component (Portaled)
 */
function StatusGraphPopup({
  position,
  equipmentName,
  type = "Pressure",
  value = 0,
  unit = "Bar",
  onMouseEnter,
  onMouseLeave,
}) {
  const popupRef = useRef(null);
  const [style, setStyle] = useState({ opacity: 0, pointerEvents: "none" });

  useEffect(() => {
    if (!position || !popupRef.current) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 450;
    const popupHeight = 400;
    const padding = 20;

    let left = position.right + 15;
    let top = position.top - 10;

    if (left + popupWidth > viewportWidth - padding) {
      left = position.left - popupWidth - 15;
    }
    if (top + popupHeight > viewportHeight - padding) {
      top = viewportHeight - popupHeight - padding;
    }
    if (top < padding) top = padding;
    if (left < padding) left = padding;

    setStyle({
      top: `${top}px`,
      left: `${left}px`,
      opacity: 1,
      pointerEvents: "auto",
    });
  }, [position]);

  const width = 400;
  const height = 200;
  const plotLeft = 40;
  const plotRight = 360;
  const plotTop = 20;
  const plotBottom = 160;

  const points = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const x = plotLeft + ((plotRight - plotLeft) * i) / 19;
      const yVal = Math.max(0, value);
      const maxRange = type === "Pressure" ? 5 : 200;
      const t = yVal / maxRange;
      const y = plotBottom - t * (plotBottom - plotTop);
      return { x, y };
    });
  }, [value, type]);

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return createPortal(
    <div
      ref={popupRef}
      className="som-amp-popup"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="som-amp-popup-header">
        <div className="som-amp-popup-title">{type} Trend</div>
        <div className="som-amp-popup-subtitle">
          <span>{equipmentName}</span>
          <span>
            Current: {value.toFixed(2)} {unit}
          </span>
        </div>
      </div>
      <div className="som-amp-popup-body">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="som-amp-graph-svg"
        >
          <defs>
            <linearGradient
              id="trendGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ffdb3b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffdb3b" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotRight - plotLeft}
            height={plotBottom - plotTop}
            fill="rgba(248, 250, 252, 0.5)"
            rx="4"
          />
          <line
            x1={plotLeft}
            y1={plotBottom}
            x2={plotRight}
            y2={plotBottom}
            stroke="#e2e8f0"
          />
          <line
            x1={plotLeft}
            y1={plotTop}
            x2={plotLeft}
            y2={plotBottom}
            stroke="#e2e8f0"
          />
          <polygon
            className="som-amp-graph-area"
            points={`${plotLeft},${plotBottom} ${polyPoints} ${plotRight},${plotBottom}`}
            style={{ fill: "url(#trendGradient)" }}
          />
          <polyline
            className="som-amp-graph-line-main"
            points={polyPoints}
            fill="none"
            stroke="#d4ac0d"
            strokeWidth="2"
          />
          {points.map((p, idx) => (
            <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="#d4ac0d" />
          ))}
        </svg>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Reusable Valve SVG Component
 */
const ValveSVG = ({
  x,
  y,
  id,
  type = "actuator",
  status,
  opening,
  label,
  onClick,
  size = 50,
  labelYOffset,
  labelXOffset,
  labelWidth = 60,
  style,
}) => {
  const isNoTag = status.toUpperCase() === "NO TAG";
  const isOpen =
    !isNoTag && (status.toLowerCase() === "open" || (opening !== undefined && opening > 0));
  const icon = type === "positioner" ? valvePositionerSvg : valveActuatorSvg;
  const statusClass = isNoTag ? "valve-off" : isOpen ? "valve-on" : "valve-off";

  const offset = size / 2;
  // Jika labelYOffset tidak diisi, otomatis ditaruh di bawah ikon
  const ly = labelYOffset !== undefined ? labelYOffset : offset - 78;
  const lx = labelXOffset !== undefined ? labelXOffset : offset - 10;

  return (
    <g
      id={id}
      className={`svg-equipment valve-group ${statusClass}`}
      onClick={() => onClick(id)}
      style={style}
    >
      <image
        href={icon}
        x={x - offset}
        y={y - offset}
        width={size}
        height={size}
      />
      <foreignObject x={x + lx} y={y + ly} width={labelWidth} height="45">
        <div
          className="som-sterilizer-mini-card compact"
          style={{
            border: "none",
            background: "transparent",
            boxShadow: "none",
          }}
        >
          <span className="som-mini-label" style={{ textAlign: "center" }}>
            {label}
          </span>
          <span
            className={`som-mini-value ${isNoTag ? "" : isOpen ? "som-mini-value--open" : "som-mini-value--closed"}`}
            style={{
              textAlign: "center",
              color: isNoTag ? "#94a3b8" : undefined,
              fontStyle: isNoTag ? "italic" : "normal",
            }}
          >
            {status}
          </span>
        </div>
      </foreignObject>
    </g>
  );
};

/**
 * Reusable Sensor SVG Component
 */
const SensorCardSVG = ({
  x,
  y,
  id,
  label,
  value,
  unit,
  equipmentName,
  trendType,
  onClick,
  size = 90,
  style,
}) => {
  const {
    cardRef,
    isHovered,
    popupPos,
    handleMouseEnter,
    handleMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  } = useAmpHover();

  const isNoTag = value === "No Tag";
  const isActive = !isNoTag && (parseFloat(value) > 0 || String(value).toLowerCase() === "ripe");

  return (
    <g
      id={id}
      className="svg-equipment sensor-group"
      onClick={() => onClick(id)}
      style={style}
    >
      <foreignObject
        x={x - 150}
        y={y - 35}
        width="300"
        height="70"
        style={{ overflow: "visible" }}
      >
        <div
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
        >
          <div
            ref={cardRef}
            className="som-motor-mini-card"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: "pointer" }}
          >
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{equipmentName}</span>
              <div
                className={`som-status-indicator ${isNoTag ? "" : isActive ? "running" : "stop"}`}
                style={isNoTag ? { background: '#94a3b8', boxShadow: 'none', animation: 'none' } : {}}
              ></div>
            </div>
            <div
              className="som-motor-mini-body"
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "baseline",
                gap: "5px",
              }}
            >
              {isNoTag ? (
                <span
                  className="som-motor-mini-value"
                  style={{
                    fontSize: "20px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  no tag
                </span>
              ) : (
                <>
                  <span
                    className="som-motor-mini-value"
                    style={{ fontSize: "20px" }}
                  >
                    {value}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#94a3b8",
                    }}
                  >
                    {unit}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </foreignObject>
      {!isNoTag && isHovered && popupPos && (
        <StatusGraphPopup
          position={popupPos}
          equipmentName={equipmentName}
          type={trendType}
          value={parseFloat(value) || 0}
          unit={unit}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}
    </g>
  );
};

/**
 * Reusable Door SVG Component
 */
const DoorCardSVG = ({ x, y, id, label, status, onClick, size = 90, style }) => {
  const s = status.toLowerCase();
  const isNoTag = s === "no tag";
  const isOpen = !isNoTag && (s === "open" || s === "unlock");

  return (
    <g id={id} className="svg-equipment door-group" onClick={() => onClick(id)} style={style}>
      <foreignObject
        x={x - 150}
        y={y - 30}
        width="300"
        height="60"
        style={{ overflow: "visible" }}
      >
        <div
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
        >
          <div className="som-motor-mini-card">
            <div className="som-motor-mini-header">
              <span className="som-motor-mini-label">{label}</span>
              <div
                className={`som-status-indicator ${isNoTag ? "" : isOpen ? "running" : "stop"}`}
                style={isNoTag ? { background: '#94a3b8', boxShadow: 'none', animation: 'none' } : {}}
              ></div>
            </div>
            <div
              className="som-motor-mini-body"
              style={{ justifyContent: "center", alignItems: "center" }}
            >
              <span
                className={`som-motor-mini-value`}
                style={{
                  color: isNoTag ? "#94a3b8" : isOpen ? "#10b981" : "#ef4444",
                  fontStyle: isNoTag ? "italic" : "normal",
                }}
              >
                {status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

/**
 * Reusable Flow Animation Component (Liquid Neon Flow)
 * Matched with AgroVision - 2 layers only (glow + aura)
 */
const SteamFlowSVG = ({ d, active, color = "#38bdf8", thickness = 8 }) => {
  if (!active) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={d}
        style={{
          stroke: color,
          strokeWidth: thickness + 6,
          filter: "blur(4px)",
          animation: "flow-pulse-opacity 2s ease-in-out infinite",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
      <path
        d={d}
        style={{
          stroke: color,
          strokeWidth: thickness,
          animation: "flow-pulse-opacity 2s ease-in-out infinite",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
    </g>
  );
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
  }, [data, tagMap]);

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
        <option value="">— No Tag —</option>
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
              ⚙️ PLC Tag Configuration
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
            ✕
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

export const LiquidFlowSVG = ({
  d,
  isRunning,
  color = "#f59e0b",
  thickness = 8,
}) => {
  if (!isRunning) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={d}
        style={{
          stroke: color,
          strokeWidth: thickness + 6,
          filter: "blur(4px)",
          animation: "flow-pulse-opacity 2s ease-in-out infinite",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
      <path
        d={d}
        style={{
          stroke: color,
          strokeWidth: thickness,
          animation: "flow-pulse-opacity 2s ease-in-out infinite",
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
    </g>
  );
};

const LiquidSteamFlowSVG = ({ d, active, mode = "flowing", color = "#38bdf8", thickness = 8 }) => {
  if (!active) return null;
  return (
    <g className={`liquid-flow--${mode}`} style={{ pointerEvents: "none" }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        className="liquid-flow-glow"
        style={{ strokeWidth: thickness + 6 }}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        className="liquid-flow-aura"
        style={{ strokeWidth: thickness }}
      />
    </g>
  );
};

/**
 * Reusable Maintenance SVG Component (AGROVISION HUD Style)
 */
const MaintenanceCardSVG = ({
  x,
  y,
  id,
  label,
  params = [],
  onClick,
  width = 300,
  style,
}) => (
  <g
    id={id}
    className="svg-equipment motor-group maintenance-card-group"
    onClick={() => onClick && onClick(id)}
    style={style}
  >
    <foreignObject
      x={x - width / 2}
      y={y - 40}
      width={width}
      height="120"
      style={{ overflow: "visible" }}
    >
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div className="som-motor-mini-card maintenance-card">
          <div className="som-motor-mini-header">
            <div className="som-motor-mini-label">{label}</div>
            <div className="som-maintenance-mini-icon">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
          </div>
          <div className="som-motor-mini-body">
            {params.map((p, idx) => (
              <div key={idx} className="som-motor-param-row">
                <span className="som-motor-param-label">{p.label}</span>
                <span className="som-motor-mini-value" data-unit={p.unit}>
                  {p.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </foreignObject>
  </g>
);

/**
 * Title/Label component
 */
// Definisikan filter ini di dalam SVG parent kamu (sekali saja)

// Component nya
const StationLabelSVG = ({ x, y, label }) => (
  <text
    x={x}
    y={y}
    className="som-line-badge-svg"
    textAnchor="middle"
    dominantBaseline="middle"
    filter="url(#yellow-glow)"
    style={{
      pointerEvents: "none",
      fill: "#000000ff",
      fontWeight: "900",
      fontSize: "24px",
      textTransform: "uppercase",
      opacity: 100,
    }}
  >
    {label}
  </text>
);

/**
 * Summary Table Component
 */
const SummaryTableSVG = ({ x, y, id, title, data, onClick, style }) => (
  <foreignObject x={x} y={y} width="320" height="180">
    <div
      className="som-dig-card"
      id={id}
      onClick={() => onClick && onClick(id)}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <div className="som-dig-card-header" style={{ textAlign: "center" }}>
        {title}
      </div>
      <div className="som-dig-card-body">
        {data.map((row, i) => (
          <div key={i} className="som-dig-row">
            <span className="som-dig-label" style={{ fontSize: "11px" }}>
              {row.label}
            </span>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "4px" }}
            >
              <span className="som-dig-value" style={{ fontSize: "15px" }}>
                {row.value}
              </span>
              <span className="som-dig-unit" style={{ fontSize: "11px" }}>
                {row.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </foreignObject>
);

const SettingsCardSVG = ({
  x,
  y,
  titleAuto,
  titleManual,
  dataAuto,
  dataManual,
  width = 580,
}) => (
  <foreignObject x={x} y={y} width={width} height="500">
    <div className="som-minimal-card">
      <div className="som-minimal-header">{titleAuto}</div>
      <div className="som-minimal-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {dataAuto.map((row, i) => (
            <div
              key={i}
              className="som-minimal-row"
              style={{ borderBottom: "none" }}
            >
              <span className="som-minimal-label">{row.label}</span>
              <div>
                <span
                  className="som-minimal-value"
                  style={{ color: "#d4ac0d" }}
                >
                  {row.value}
                </span>
                <span className="som-minimal-unit">{row.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="som-minimal-divider" />
        <div className="som-minimal-section-title">{titleManual}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {dataManual.map((row, i) => (
            <div
              key={i}
              className="som-minimal-row"
              style={{ borderBottom: "none" }}
            >
              <span className="som-minimal-label">{row.label}</span>
              <div>
                <span
                  className="som-minimal-value"
                  style={{ color: "#d4ac0d" }}
                >
                  {row.value}
                </span>
                <span className="som-minimal-unit">{row.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </foreignObject>
);

const StatusTableCardSVG = ({
  x,
  y,
  id,
  title,
  data,
  width = 450,
  onClick,
  style,
}) => (
  <foreignObject x={x} y={y} width={width} height="650">
    <div
      className="som-minimal-card"
      id={id}
      onClick={() => onClick && onClick(id)}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
    >
      <div className="som-minimal-header">{title}</div>
      <div className="som-minimal-body">
        {data.map((row, i) => (
          <div key={i} className="som-minimal-row">
            <span className="som-minimal-label">{row.label}</span>
            <div>
              <span
                className="som-minimal-value"
                style={{ color: row.isHighlight ? "#d4ac0d" : "#0f172a" }}
              >
                {row.value}
              </span>
              {row.unit && <span className="som-minimal-unit">{row.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  </foreignObject>
);

/** Custom AgroVision Valve Modern Card */
const ValveModernCardSVG = ({
  x,
  y,
  scale = 1,
  title = "",
  command = "CLOSE",
  position = "0.0",
  onClick,
}) => {
  const isOpen = command === "OPEN";
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-100, -65)`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <foreignObject width="200" height="130" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "12px",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                COMMAND
              </span>
              <div
                style={{
                  padding: "2px 10px",
                  borderRadius: "4px",
                  background: isOpen ? "#f1fdf3" : "#fef2f2",
                  border: `1px solid ${isOpen ? "#1FE921" : "#EF4444"}`,
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: isOpen ? "#1FE921" : "#EF4444",
                    fontWeight: "900",
                  }}
                >
                  {command}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "5px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "2px",
                }}
              >
                POSITION
              </span>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "24px",
                  background: "#f1f5f9",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    width: `${position}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, #ffdb3b, #d4ac0d)`,
                    transition: "width 0.15s ease",
                  }}
                ></div>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "950",
                    color: "#0f172a",
                  }}
                >
                  {position}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

/** Custom AgroVision BPV Status Card */
const BpvModernStatusCardSVG = ({
  x,
  y,
  scale = 1,
  status = "EMERGENCY",
  makeup = "OPEN",
  surplus = "OPEN",
  pressure = "0.0",
  onClick,
}) => {
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-160, -90)`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <foreignObject width="320" height="180" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "15px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "8px",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            BACK PRESSURE VESSEL
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                STATUS
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: status === "EMERGENCY" ? "#EF4444" : "#1FE921",
                  fontWeight: "950",
                }}
              >
                {status}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                MAKE-UP
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: makeup === "OPEN" ? "#1FE921" : "#64748b",
                  fontWeight: "950",
                }}
              >
                {makeup}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                SURPLUS
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: surplus === "OPEN" ? "#1FE921" : "#64748b",
                  fontWeight: "950",
                }}
              >
                {surplus}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: "800",
                }}
              >
                PRESSURE
              </span>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "4px" }}
              >
                <span
                  style={{
                    fontSize: "22px",
                    color: "#d4ac0d",
                    fontWeight: "950",
                  }}
                >
                  {pressure}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: "bold",
                  }}
                >
                  BAR
                </span>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

/** Custom AgroVision Atmosphere Label */
const AtmosphereLabelSVG = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <path
      d="M -25,-18 L 25,-18 M 15,-25 L 25,-18 L 15,-11"
      stroke="rgba(255,255,255,0.8)"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text
      x="0"
      y="0"
      textAnchor="middle"
      dominantBaseline="middle"
      style={{
        fill: "rgba(255,255,255,0.8)",
        fontWeight: "900",
        fontSize: "15px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      To Atmosfer
    </text>
  </g>
);

/** Custom AgroVision BPV Control Switch Panel */
const BpvControlSwitchPanelSVG = ({
  x,
  y,
  scale = 1,
  mode = "MANUAL",
  makeup = "CLOSE",
  blowoff = "OPEN",
  onModeToggle,
  onMakeupToggle,
  onBlowoffToggle,
}) => {
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale}) translate(-180, -75)`}
      className="bpv-modern-control-group"
    >
      <foreignObject width="360" height="150" style={{ overflow: "visible" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "950",
              color: "#0f172a",
              borderBottom: "2px solid #ffdb3b",
              paddingBottom: "10px",
              marginBottom: "15px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            CONTROL PANEL
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            {/* MODE SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                MODE
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onModeToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: mode === "AUTO" ? "#ffdb3b" : "transparent",
                    color: "#0f172a",
                  }}
                >
                  AUTO
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: mode === "MANUAL" ? "#fbbf24" : "transparent",
                    color: "#0f172a",
                  }}
                >
                  MAN
                </div>
              </div>
            </div>

            {/* MAKE-UP SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                MAKE-UP
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onMakeupToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: makeup === "OPEN" ? "#1FE921" : "transparent",
                    color: makeup === "OPEN" ? "#fff" : "#64748b",
                  }}
                >
                  OPEN
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: makeup === "CLOSE" ? "#EF4444" : "transparent",
                    color: makeup === "CLOSE" ? "#fff" : "#64748b",
                  }}
                >
                  CLOSE
                </div>
              </div>
            </div>

            {/* BLOW-OFF SECTION */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "6px",
                }}
              >
                BLOW-OFF
              </span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onBlowoffToggle();
                }}
                style={{
                  display: "flex",
                  background: "#f8fafc",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: blowoff === "OPEN" ? "#1FE921" : "transparent",
                    color: blowoff === "OPEN" ? "#fff" : "#64748b",
                  }}
                >
                  OPEN
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "950",
                    padding: "6px 0",
                    borderRadius: "6px",
                    background: blowoff === "CLOSE" ? "#EF4444" : "transparent",
                    color: blowoff === "CLOSE" ? "#fff" : "#64748b",
                  }}
                >
                  CLOSE
                </div>
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};


export const CrosshairOverlay = ({ coords }) => {
  return (
    <g pointerEvents="none">
      <line x1={coords.x} y1="-5000" x2={coords.x} y2="5000" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <line x1="-5000" y1={coords.y} x2="5000" y2={coords.y} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <rect x={coords.x + 10} y={coords.y + 10} width="80" height="24" fill="rgba(0,0,0,0.7)" rx="4" />
      <text x={coords.x + 16} y={coords.y + 26} fill="#fff" fontSize="12px" fontWeight="bold">
        {coords.x}, {coords.y}
      </text>
    </g>
  );
};

export default function OverviewTab({
  activeTab,
  viewMode,
  handleEquipmentClick,
  condColor,
  st1_inlet, st1_exhaust, st1_cond,
  st2_inlet, st2_exhaust, st2_cond,
  st3_inlet, st3_exhaust, st3_cond,
  st4_inlet, st4_exhaust, st4_cond,
  getMappedValue,
  configMode = false,
  tagMap = {},
  trendData = null,
  tempTrendData = null,
}) {
  const svgRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [pressureTrendModal, setPressureTrendModal] = useState(null);
  const hoverCloseTimerRef = useRef(null);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback((delay = 250) => {
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = setTimeout(() => {
      setPressureTrendModal(null);
    }, delay);
  }, [clearHoverCloseTimer]);

  const openPressureTrend = useCallback((lineNum, title, customVal = null, anchorPos = null, type = "pressure") => {
    const isTemp = type === "temperature" || String(title).toLowerCase().includes("temp");
    if (configMode) {
      handleEquipmentClick && handleEquipmentClick(`st${lineNum}_${isTemp ? "temp" : "pressure"}_card`);
      return;
    }
    clearHoverCloseTimer();

    const lineKey = String(lineNum).toLowerCase().includes("bpv") || String(lineNum).toLowerCase().includes("blr") ? "bpv" : `s${lineNum}`;
    let rawVal = customVal;
    if (rawVal === null || rawVal === undefined || rawVal === "No Tag" || rawVal === "no tag") {
      if (getMappedValue) {
        rawVal = getMappedValue(`overview_${isTemp ? "temp" : "pressure"}_${lineNum}`, "MONITOR", "0.0");
      }
    }
    if (rawVal === null || rawVal === undefined || String(rawVal).toLowerCase() === "no tag") {
      rawVal = "0.0";
    }
    const num = parseFloat(rawVal);
    const formattedVal = !isNaN(num) ? (isTemp ? num.toFixed(1) : num.toFixed(2)) : String(rawVal);

    setPressureTrendModal((prev) => {
      const targetType = isTemp ? "temperature" : "pressure";
      if (prev && prev.lineKey === lineKey && prev.type === targetType) {
        return {
          ...prev,
          currentValue: formattedVal,
          anchorPos: anchorPos || prev.anchorPos,
        };
      }
      return {
        isOpen: true,
        title: title || `ST${lineNum} ${isTemp ? "Temperature" : "Pressure"}`,
        lineKey: lineKey,
        currentValue: formattedVal,
        unit: isTemp ? "°C" : "Bar",
        type: targetType,
        anchorPos: anchorPos,
      };
    });
  }, [configMode, handleEquipmentClick, getMappedValue, clearHoverCloseTimer]);

  const lv = (eq, sig, def) => getMappedValue(eq, sig, def);

  const getSmartValveValue = useCallback((valveId, fallbackTestVar) => {
    if (getMappedValue) {
      let targetId = valveId.replace("valve_", "card_");

      // Fix D.Cond naming
      if (targetId.startsWith("card_d_cond_")) {
        targetId = targetId.replace("card_d_cond_", "d_cond_");
      }

      // Fix Condensate and Relief Condensate naming mismatch
      if (targetId.includes("card_condensate_1_")) {
        // valve_condensate_1 corresponds to RELIEF CONDENSATE card
        targetId = targetId.replace("card_condensate_1_", "card_relief_condensate_");
      } else if (targetId.includes("card_condensate_2_")) {
        // valve_condensate_2 corresponds to CONDENSATE 1 card
        targetId = targetId.replace("card_condensate_2_", "card_condensate_1_");
      }

      // Try reading from MONITOR first (for card mappings)
      let mapped = getMappedValue(targetId, "MONITOR", "No Tag");
      if (String(mapped).trim().toLowerCase() === "no tag" || mapped === undefined || mapped === null || String(mapped).trim() === "") {
        // Fallback to STATUS
        mapped = getMappedValue(targetId, "STATUS", "No Tag");
      }

      if (mapped !== undefined && mapped !== null && String(mapped).trim().toLowerCase() !== "no tag") {
        return mapped;
      }
    }
    return fallbackTestVar;
  }, [getMappedValue]);

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

  return (
    <div className="som-sterilizer-station-layout">
      <div className="som-sterilizer-station-flow-card">
        <div className="som-sterilizer-station-flow-body">
          <svg
            ref={svgRef}
            viewBox="-450 -120 2850 1150"
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
                  values="0.0638 0.2146 0.0216 0 0
                          0.2551 0.8582 0.0867 0 0
                          0.0425 0.1430 0.0144 0 0
                          0 0 0 1 0"/>
              </filter>
              <filter
                id="neon-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite
                  in="SourceGraphic"
                  in2="blur"
                  operator="over"
                />
              </filter>
            </defs>

            {/* ==========================================
                                    LAYER 1: BACKGROUND
                                   ========================================== */}
            {activeTab === "overview" ? (
              <image
                href={sterilizerStationImageUrl}
                width="2650"
                x="-355"
                y="-40"
              />
            ) : (
              <image
                href={sterilizerLineImageUrl}
                width="2650"
                x="35"
                y="-30"
                style={{ mixBlendMode: "multiply" }}
              />
            )}

            {/* ==========================================
                                    LAYER 2: PROCESS FLOWS (PIPES & FLOW ANIMATIONS)
                                   ========================================== */}
            <g className="som-steam-flows">
            </g>

            {/* ==========================================
                                    STATION ELEMENTS (ADJUST POSITIONS INDIVIDUALLY BELOW)
                                   ========================================== */}

            {/* --- UNIFIED LINE VIEW (For Line 1, 2, 3, 4) --- */}
            {(activeTab === "line1" ||
              activeTab === "line2" ||
              activeTab === "line3" ||
              activeTab === "line4") &&
              (() => {
                const n =
                  activeTab === "line1"
                    ? 1
                    : activeTab === "line2"
                      ? 2
                      : activeTab === "line3"
                        ? 3
                        : 4;
                const inlet =
                  n === 1
                    ? st1_inlet
                    : n === 2
                      ? st2_inlet
                      : n === 3
                        ? st3_inlet
                        : st4_inlet;
                const exhaust =
                  n === 1
                    ? st1_exhaust
                    : n === 2
                      ? st2_exhaust
                      : n === 3
                        ? st3_exhaust
                        : st4_exhaust;
                const cond =
                  n === 1
                    ? st1_cond
                    : n === 2
                      ? st2_cond
                      : n === 3
                        ? st3_cond
                        : st4_cond;

                const actualInlet = getMappedValue
                  ? getMappedValue("st" + n + "_inlet_steam", "MONITOR", inlet)
                  : inlet;
                const actualExhaust = getMappedValue
                  ? getMappedValue("st" + n + "_exhaust", "MONITOR", exhaust)
                  : exhaust;
                const actualCond = getMappedValue
                  ? getMappedValue("st" + n + "_condensate", "MONITOR", cond)
                  : cond;

                // Konfigurasi Status Valve untuk Individual Line View
                const dCondTag = `d_cond_st${n}`;
                let dCondDisplayLine = "No Tag";
                if (getMappedValue) {
                  const mapped = getMappedValue(dCondTag, "STATUS", "No Tag");
                  dCondDisplayLine = formatDoorStatus(mapped);
                }

                const reliefCondensateTag = `relief_condensate_valve_st${n}`;
                let reliefCondensateDisplayLine = "No Tag";
                if (getMappedValue) {
                  const mapped = getMappedValue(reliefCondensateTag, "STATUS", "No Tag");
                  reliefCondensateDisplayLine = formatValveStatus(mapped);
                }

                const condensateTag = `condensate_valve_st${n}`;
                let CondensateDisplayLine = "No Tag";
                if (getMappedValue) {
                  const mapped = getMappedValue(condensateTag, "STATUS", "No Tag");
                  CondensateDisplayLine = formatValveStatus(mapped);
                }

                // Konfigurasi Status Pintu (Inlet & Outlet) untuk Line View
                let topDoorLineStatus = "No Tag";
                let botDoorLineStatus = "No Tag";

                if (getMappedValue) {
                  let mappedTop = getMappedValue(`card_inlet_door_st${n}`, "MONITOR", "No Tag");
                  if (String(mappedTop).trim().toLowerCase() === "no tag" || mappedTop === undefined || mappedTop === null) {
                    mappedTop = getMappedValue(`top_door_st${n}`, "STATUS", "No Tag");
                  }
                  topDoorLineStatus = formatDoorStatus(mappedTop);

                  let mappedBot = getMappedValue(`card_outlet_door_st${n}`, "MONITOR", "No Tag");
                  if (String(mappedBot).trim().toLowerCase() === "no tag" || mappedBot === undefined || mappedBot === null) {
                    mappedBot = getMappedValue(`bot_door_st${n}`, "STATUS", "No Tag");
                  }
                  botDoorLineStatus = formatDoorStatus(mappedBot);
                }

                // Local coordinates centered in the wide 2470 canvas (around x=1100)
                return (
                  <g>
                    {/* PROCESS FLOWS FOR LINE VIEW (Synced with Overview) */}
                    <g className="som-line-flows">
                    </g>

                    {/* Render Tag Monitor Cards khusus untuk tab LINE 1 */}
                    {n === 1 && (
                      <g id="line1_equipment_blocks">
                        {/* // INLET DOOR ST1 */}
                        <TagMonitorCardSVG
                          x={380}
                          y={240}
                          title="INLET DOOR ST1"
                          value={
                            (() => {
                              const rawVal = getMappedValue ? getMappedValue("card_inlet_door_st1", "MONITOR", "no tag") : "no tag";
                              return formatDoorStatus(rawVal);
                            })()
                          }
                          unit=""
                          status="grey"
                          width={150}
                          onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_door_st1")}
                          style={getDeveloperStyle("card_inlet_door_st1")}
                        />

                        {/* // EXHAUST STEAM ST1 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_exhaust_steam_st1", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_exhaust_steam_st1">
                              <LiquidSteamFlowSVG d="M 265,146 L 265,95 Q 265,70 240,70 L 170,70" active={true} mode={isOpen ? "flowing" : "standby"} color="#38bdf8" thickness={8} />
                              {isOpen && (
                                <LiquidSteamFlowSVG d="M 120,70 L -9,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                              )}
                              <EquipmentIconSVG
                                key="valve_exhaust_steam_st1"
                                x={145}
                                y={50}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={40}
                                y={20}
                                title="EXHAUST STEAM ST1"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_exhaust_steam_st1")}
                                style={getDeveloperStyle("card_exhaust_steam_st1")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END EXHAUST STEAM ST1 */}

                        {/* // INLET STEAM 1 ST1 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_inlet_steam_1_st1", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_inlet_steam_1_st1">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 28,220 L 38,221 Q 48,222 48,232 L 48,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 53,301 L 106,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 147,302 L 512,303" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 28,220 L 38,221 Q 48,222 48,232 L 48,301" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 53,301 L 106,301" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_inlet_steam_1_st1"
                                x={125}
                                y={275}
                                icon={valvePneumaticActuatorSvg}
                                size={100}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={200}
                                title="INLET STEAM 1 ST1"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_steam_1_st1")}
                                style={getDeveloperStyle("card_inlet_steam_1_st1")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END INLET STEAM 1 ST1 */}

                        {/* // INLET STEAM 2 ST1 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_inlet_steam_2_st1", "MONITOR", "0") : "0";
                          const tagStr = String(rawTagVal).trim().toLowerCase();
                          let isOpen = false;
                          let displayVal = "0";

                          if (rawTagVal === true || tagStr === "true" || tagStr === "open" || tagStr === "1") {
                            isOpen = true;
                            displayVal = "100";
                          } else if (rawTagVal === false || tagStr === "false" || tagStr === "close" || tagStr === "0") {
                            isOpen = false;
                            displayVal = "0";
                          } else {
                            const numericVal = parseFloat(tagStr);
                            if (!isNaN(numericVal)) {
                              isOpen = numericVal > 0;
                              displayVal = String(Math.round(numericVal));
                            } else {
                              isOpen = false;
                              displayVal = String(rawTagVal);
                            }
                          }
                          return (
                            <g id="block_inlet_steam_2_st1">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 48,301 L 47,514" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 51,514 L 103,514" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 146,515 L 160,515 Q 174,514 174,500 L 175,472 Q 175,453 194,453 L 194,453 Q 213,452 232,452 L 515,453" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 145,514 L 160,512 Q 174,510 174,525 L 173,559 Q 173,573 187,576 L 187,576 Q 201,578 215,578 L 341,578 Q 366,578 387,591 L 540,686" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 48,301 L 47,514" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 51,514 L 103,514" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_inlet_steam_2_st1"
                                x={125}
                                y={488}
                                icon={valvePositionerSvg}
                                size={100}
                                rotation={270}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={415}
                                title="INLET STEAM 2 ST1"
                                value={displayVal}
                                unit="%"
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_steam_2_st1")}
                                style={getDeveloperStyle("card_inlet_steam_2_st1")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END INLET STEAM 2 ST1 */}

                        {/* // FLASHING ST1 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_flashing_st1", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_flashing_st1">
                              <LiquidSteamFlowSVG
                                d="M 47,514 L 46,656 Q 46,671 50,686 L 50,686 Q 54,700 69,701 L 70,703"
                                active={true}
                                mode={isOpen ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={8}
                              />
                              {isOpen && (
                                <LiquidSteamFlowSVG
                                  d="M 146,703 L 332,700 Q 357,700 379,712"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={8}
                                />
                              )}
                              <EquipmentIconSVG
                                key="valve_flashing_st1"
                                x={125}
                                y={675}
                                icon={valvePneumaticActuatorSvg}
                                size={100}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={610}
                                title="FLASHING ST1"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_flashing_st1")}
                                style={getDeveloperStyle("card_flashing_st1")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END FLASHING ST1 */}

                        {/* // OUTLET ST1 */}
                        <TagMonitorCardSVG
                          x={740}
                          y={695}
                          title="OUTLET DOOR ST1"
                          value={getMappedValue ? formatDoorStatus(getMappedValue("card_outlet_door_st1", "MONITOR", "no tag")) : "no tag"}
                          unit=""
                          status="grey"
                          width={150}
                          onClick={() => handleEquipmentClick && handleEquipmentClick("card_outlet_door_st1")}
                          style={getDeveloperStyle("card_outlet_door_st1")}
                        />

                        {/* // D.CONDENSATE ST1 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("d_cond_st1", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_d_cond_st1">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 524,729 L 524,1012" active={true} mode="liquid" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 524,729 L 524,783" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_d_cond_st1"
                                x={550}
                                y={800}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={180}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={700}
                                y={800}
                                title="D. COND ST1"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("d_cond_st1")}
                                style={getDeveloperStyle("d_cond_st1")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END D.CONDENSATE ST1 */}

                        {/* // RELIEF CONDENSATE ST1 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_relief_condensate_st1", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_condensate_1_st1">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 544,1024 L 544,965 Q 544,953 554,946 L 554,946 Q 563,939 575,939 L 601,939" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 641,939 L 761,939" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 544,1024 L 544,965 Q 544,953 554,946 L 554,946 Q 563,939 575,939 L 601,939" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_condensate_1_st1"
                                x={620}
                                y={914}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={725}
                                y={900}
                                title="RELIEF CONDENSATE VALVE ST1"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_relief_condensate_st1")}
                                style={getDeveloperStyle("card_relief_condensate_st1")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END RELIEF CONDENSATE ST1 */}

                        {/* // CONDENSATE ST1 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_condensate_1_st1", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_condensate_2_st1">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 359,1012 L 365,1022 Q 370,1031 381,1031 L 402,1032" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 505,1030 L 523,1031 Q 541,1031 559,1031 L 599,1030" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 644,1031 L 776,1030" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 359,1012 L 365,1022 Q 370,1031 381,1031 L 402,1032" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 505,1030 L 523,1031 Q 541,1031 559,1031 L 599,1030" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_condensate_2_st1"
                                x={620}
                                y={1005}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={725}
                                y={995}
                                title="CONDENSATE ST1"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_condensate_1_st1")}
                                style={getDeveloperStyle("card_condensate_1_st1")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END CONDENSATE ST1 */}

                        {/* PRESSURE & TEMP CARDS FOR LINE 1 */}
                        <TagMonitorCardSVG
                          x={380}
                          y={380}
                          title="PRESSURE ST1"
                          value={getMappedValue ? String(getMappedValue("overview_pressure_1", "MONITOR", "No Tag")) : "No Tag"}
                          unit="Bar"
                          status="grey"
                          width={150}
                          valueColor="#ef4444"
                          onClick={() => {
                            if (configMode) {
                              handleEquipmentClick && handleEquipmentClick("st1_pressure_card");
                            } else {
                              openPressureTrend("1", "ST1 Pressure", getMappedValue ? getMappedValue("overview_pressure_1", "MONITOR", "0.0") : "0.0");
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!configMode) {
                              const rect = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
                              openPressureTrend("1", "ST1 Pressure", getMappedValue ? getMappedValue("overview_pressure_1", "MONITOR", "0.0") : "0.0", rect);
                            }
                          }}
                          onMouseLeave={() => {
                            if (!configMode) {
                              scheduleHoverClose(250);
                            }
                          }}
                          style={getDeveloperStyle("st1_pressure_card")}
                        />
                        <TagMonitorCardSVG
                          x={380}
                          y={520}
                          title="TEMPERATURE ST1"
                          value={getMappedValue ? String(getMappedValue("overview_temp_1", "MONITOR", "No Tag")) : "No Tag"}
                          unit="°C"
                          status="grey"
                          width={150}
                          valueColor="#ef4444"
                          onClick={() => {
                            if (configMode) {
                              handleEquipmentClick && handleEquipmentClick("st1_temp_card");
                            } else {
                              openPressureTrend("1", "ST1 Temperature", getMappedValue ? getMappedValue("overview_temp_1", "MONITOR", "0.0") : "0.0", null, "temperature");
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!configMode) {
                              const rect = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
                              openPressureTrend("1", "ST1 Temperature", getMappedValue ? getMappedValue("overview_temp_1", "MONITOR", "0.0") : "0.0", rect, "temperature");
                            }
                          }}
                          onMouseLeave={() => {
                            if (!configMode) {
                              scheduleHoverClose(250);
                            }
                          }}
                          style={getDeveloperStyle("st1_temp_card")}
                        />

                        {/* VALVE MODULATE SETTINGS (LINE 1 ONLY) */}
                        <SettingValveModulateSVG
                          x={800}
                          y={120}
                          scale={1}
                          getMappedValue={getMappedValue}
                          line={1}
                          configMode={configMode}
                          tagMap={tagMap}
                          handleEquipmentClick={handleEquipmentClick}
                          getDeveloperStyle={getDeveloperStyle}
                        />
                      </g>
                    )}

                    {/* Render Tag Monitor Cards khusus untuk tab LINE 2 */}
                    {n === 2 && (
                      <g id="line2_equipment_blocks">
                        {/* // INLET DOOR ST2 */}
                        <TagMonitorCardSVG
                          x={380}
                          y={240}
                          title="INLET DOOR ST2"
                          value={
                            (() => {
                              const rawVal = getMappedValue ? getMappedValue("card_inlet_door_st2", "MONITOR", "no tag") : "no tag";
                              return formatDoorStatus(rawVal);
                            })()
                          }
                          unit=""
                          status="grey"
                          width={150}
                          onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_door_st2")}
                          style={getDeveloperStyle("card_inlet_door_st2")}
                        />

                        {/* // EXHAUST STEAM ST2 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_exhaust_steam_st2", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_exhaust_steam_st2">
                              <LiquidSteamFlowSVG d="M 265,146 L 265,95 Q 265,70 240,70 L 170,70" active={true} mode={isOpen ? "flowing" : "standby"} color="#38bdf8" thickness={8} />
                              {isOpen && (
                                <LiquidSteamFlowSVG d="M 120,70 L -9,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                              )}
                              <EquipmentIconSVG
                                key="valve_exhaust_steam_st2"
                                x={145}
                                y={50}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={40}
                                y={20}
                                title="EXHAUST STEAM ST2"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_exhaust_steam_st2")}
                                style={getDeveloperStyle("card_exhaust_steam_st2")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END EXHAUST STEAM ST2 */}

                        {/* // INLET STEAM 1 ST2 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_inlet_steam_1_st2", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_inlet_steam_1_st2">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 28,220 L 38,221 Q 48,222 48,232 L 48,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 53,301 L 106,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 147,302 L 512,303" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 28,220 L 38,221 Q 48,222 48,232 L 48,301" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 53,301 L 106,301" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_inlet_steam_1_st2"
                                x={125}
                                y={275}
                                icon={valvePneumaticActuatorSvg}
                                size={100}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={200}
                                title="INLET STEAM 1 ST2"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_steam_1_st2")}
                                style={getDeveloperStyle("card_inlet_steam_1_st2")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END INLET STEAM 1 ST2 */}

                        {/* // INLET STEAM 2 ST2 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_inlet_steam_2_st2", "MONITOR", "0") : "0";
                          const tagStr = String(rawTagVal).trim().toLowerCase();
                          let isOpen = false;
                          let displayVal = "0";

                          if (rawTagVal === true || tagStr === "true" || tagStr === "open" || tagStr === "1") {
                            isOpen = true;
                            displayVal = "100";
                          } else if (rawTagVal === false || tagStr === "false" || tagStr === "close" || tagStr === "0") {
                            isOpen = false;
                            displayVal = "0";
                          } else {
                            const numericVal = parseFloat(tagStr);
                            if (!isNaN(numericVal)) {
                              isOpen = numericVal > 0;
                              displayVal = String(Math.round(numericVal));
                            } else {
                              isOpen = false;
                              displayVal = String(rawTagVal);
                            }
                          }
                          return (
                            <g id="block_inlet_steam_2_st2">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 48,301 L 47,514" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 51,514 L 103,514" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 146,515 L 160,515 Q 174,514 174,500 L 175,472 Q 175,453 194,453 L 194,453 Q 213,452 232,452 L 515,453" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 145,514 L 160,512 Q 174,510 174,525 L 173,559 Q 173,573 187,576 L 187,576 Q 201,578 215,578 L 341,578 Q 366,578 387,591 L 540,686" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 48,301 L 47,514" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 51,514 L 103,514" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_inlet_steam_2_st2"
                                x={125}
                                y={488}
                                icon={valvePositionerSvg}
                                size={100}
                                rotation={270}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={415}
                                title="INLET STEAM 2 ST2"
                                value={displayVal}
                                unit="%"
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_steam_2_st2")}
                                style={getDeveloperStyle("card_inlet_steam_2_st2")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END INLET STEAM 2 ST2 */}

                        {/* // FLASHING ST2 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_flashing_st2", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_flashing_st2">
                              <LiquidSteamFlowSVG
                                d="M 47,514 L 46,656 Q 46,671 50,686 L 50,686 Q 54,700 69,701 L 70,703"
                                active={true}
                                mode={isOpen ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={8}
                              />
                              {isOpen && (
                                <LiquidSteamFlowSVG
                                  d="M 146,703 L 332,700 Q 357,700 379,712"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={8}
                                />
                              )}
                              <EquipmentIconSVG
                                key="valve_flashing_st2"
                                x={125}
                                y={675}
                                icon={valvePneumaticActuatorSvg}
                                size={100}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={610}
                                title="FLASHING ST2"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_flashing_st2")}
                                style={getDeveloperStyle("card_flashing_st2")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END FLASHING ST2 */}

                        {/* // OUTLET ST2 */}
                        <TagMonitorCardSVG
                          x={710}
                          y={695}
                          title="OUTLET DOOR ST2"
                          value={getMappedValue ? formatDoorStatus(getMappedValue("card_outlet_door_st2", "MONITOR", "no tag")) : "no tag"}
                          unit=""
                          status="grey"
                          width={150}
                          onClick={() => handleEquipmentClick && handleEquipmentClick("card_outlet_door_st2")}
                          style={getDeveloperStyle("card_outlet_door_st2")}
                        />

                        {/* // D.CONDENSATE ST2 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("d_cond_st2", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_d_cond_st2">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 524,729 L 524,1012" active={true} mode="liquid" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 524,729 L 524,783" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_d_cond_st2"
                                x={550}
                                y={800}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={180}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={700}
                                y={800}
                                title="D. COND ST2"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("d_cond_st2")}
                                style={getDeveloperStyle("d_cond_st2")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END D.CONDENSATE ST2 */}

                        {/* // RELIEF CONDENSATE ST2 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_relief_condensate_st2", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_condensate_1_st2">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 544,1024 L 544,965 Q 544,953 554,946 L 554,946 Q 563,939 575,939 L 601,939" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 641,939 L 761,939" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 544,1024 L 544,965 Q 544,953 554,946 L 554,946 Q 563,939 575,939 L 601,939" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_condensate_1_st2"
                                x={620}
                                y={914}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={725}
                                y={900}
                                title="RELIEF CONDENSATE VALVE ST2"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_relief_condensate_st2")}
                                style={getDeveloperStyle("card_relief_condensate_st2")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END RELIEF CONDENSATE ST2 */}

                        {/* // CONDENSATE ST2 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_condensate_1_st2", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_condensate_2_st2">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 359,1012 L 365,1022 Q 370,1031 381,1031 L 402,1032" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 505,1030 L 523,1031 Q 541,1031 559,1031 L 599,1030" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 644,1031 L 776,1030" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 359,1012 L 365,1022 Q 370,1031 381,1031 L 402,1032" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 505,1030 L 523,1031 Q 541,1031 559,1031 L 599,1030" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_condensate_2_st2"
                                x={620}
                                y={1005}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={725}
                                y={995}
                                title="CONDENSATE ST2"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_condensate_1_st2")}
                                style={getDeveloperStyle("card_condensate_1_st2")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END CONDENSATE ST2 */}

                        {/* PRESSURE & TEMP CARDS FOR LINE 2 */}
                        <TagMonitorCardSVG
                          x={380}
                          y={380}
                          title="PRESSURE ST2"
                          value={getMappedValue ? String(getMappedValue("overview_pressure_2", "MONITOR", "No Tag")) : "No Tag"}
                          unit="Bar"
                          status="grey"
                          width={150}
                          valueColor="#ef4444"
                          onClick={() => {
                            if (configMode) {
                              handleEquipmentClick && handleEquipmentClick("st2_pressure_card");
                            } else {
                              openPressureTrend("2", "ST2 Pressure", getMappedValue ? getMappedValue("overview_pressure_2", "MONITOR", "0.0") : "0.0");
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!configMode) {
                              const rect = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
                              openPressureTrend("2", "ST2 Pressure", getMappedValue ? getMappedValue("overview_pressure_2", "MONITOR", "0.0") : "0.0", rect);
                            }
                          }}
                          onMouseLeave={() => {
                            if (!configMode) {
                              scheduleHoverClose(250);
                            }
                          }}
                          style={getDeveloperStyle("st2_pressure_card")}
                        />
                        <TagMonitorCardSVG
                          x={380}
                          y={520}
                          title="TEMPERATURE ST2"
                          value={getMappedValue ? String(getMappedValue("overview_temp_2", "MONITOR", "No Tag")) : "No Tag"}
                          unit="°C"
                          status="grey"
                          width={150}
                          valueColor="#ef4444"
                          onClick={() => handleEquipmentClick && handleEquipmentClick("st2_temp_card")}
                          style={getDeveloperStyle("st2_temp_card")}
                        />

                        {/* VALVE MODULATE SETTINGS (LINE 2 ONLY) */}
                        <SettingValveModulateSVG
                          x={800}
                          y={120}
                          scale={1}
                          getMappedValue={getMappedValue}
                          line={2}
                          configMode={configMode}
                          tagMap={tagMap}
                          handleEquipmentClick={handleEquipmentClick}
                          getDeveloperStyle={getDeveloperStyle}
                        />
                      </g>
                    )}

                    {/* Render Tag Monitor Cards khusus untuk tab LINE 3 */}
                    {n === 3 && (
                      <g id="line3_equipment_blocks">
                        {/* // INLET DOOR ST3 */}
                        <TagMonitorCardSVG
                          x={380}
                          y={240}
                          title="INLET DOOR ST3"
                          value={
                            (() => {
                              const rawVal = getMappedValue ? getMappedValue("card_inlet_door_st3", "MONITOR", "no tag") : "no tag";
                              return formatDoorStatus(rawVal);
                            })()
                          }
                          unit=""
                          status="grey"
                          width={150}
                          onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_door_st3")}
                          style={getDeveloperStyle("card_inlet_door_st3")}
                        />

                        {/* // EXHAUST STEAM ST3 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_exhaust_steam_st3", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_exhaust_steam_st3">
                              <LiquidSteamFlowSVG d="M 265,146 L 265,95 Q 265,70 240,70 L 170,70" active={true} mode={isOpen ? "flowing" : "standby"} color="#38bdf8" thickness={8} />
                              {isOpen && (
                                <LiquidSteamFlowSVG d="M 120,70 L -9,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                              )}
                              <EquipmentIconSVG
                                key="valve_exhaust_steam_st3"
                                x={145}
                                y={50}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={40}
                                y={20}
                                title="EXHAUST STEAM ST3"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_exhaust_steam_st3")}
                                style={getDeveloperStyle("card_exhaust_steam_st3")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END EXHAUST STEAM ST3 */}

                        {/* // INLET STEAM 1 ST3 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_inlet_steam_1_st3", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_inlet_steam_1_st3">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 28,220 L 38,221 Q 48,222 48,232 L 48,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 53,301 L 106,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 147,302 L 512,303" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 28,220 L 38,221 Q 48,222 48,232 L 48,301" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 53,301 L 106,301" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_inlet_steam_1_st3"
                                x={125}
                                y={275}
                                icon={valvePneumaticActuatorSvg}
                                size={100}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={200}
                                title="INLET STEAM 1 ST3"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_steam_1_st3")}
                                style={getDeveloperStyle("card_inlet_steam_1_st3")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END INLET STEAM 1 ST3 */}

                        {/* // INLET STEAM 2 ST3 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_inlet_steam_2_st3", "MONITOR", "0") : "0";
                          const tagStr = String(rawTagVal).trim().toLowerCase();
                          let isOpen = false;
                          let displayVal = "0";

                          if (rawTagVal === true || tagStr === "true" || tagStr === "open" || tagStr === "1") {
                            isOpen = true;
                            displayVal = "100";
                          } else if (rawTagVal === false || tagStr === "false" || tagStr === "close" || tagStr === "0") {
                            isOpen = false;
                            displayVal = "0";
                          } else {
                            const numericVal = parseFloat(tagStr);
                            if (!isNaN(numericVal)) {
                              isOpen = numericVal > 0;
                              displayVal = String(Math.round(numericVal));
                            } else {
                              isOpen = false;
                              displayVal = String(rawTagVal);
                            }
                          }
                          return (
                            <g id="block_inlet_steam_2_st3">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 48,301 L 47,514" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 51,514 L 103,514" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 146,515 L 160,515 Q 174,514 174,500 L 175,472 Q 175,453 194,453 L 194,453 Q 213,452 232,452 L 515,453" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 145,514 L 160,512 Q 174,510 174,525 L 173,559 Q 173,573 187,576 L 187,576 Q 201,578 215,578 L 341,578 Q 366,578 387,591 L 540,686" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 48,301 L 47,514" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 51,514 L 103,514" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_inlet_steam_2_st3"
                                x={125}
                                y={488}
                                icon={valvePositionerSvg}
                                size={100}
                                rotation={270}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={415}
                                title="INLET STEAM 2 ST3"
                                value={displayVal}
                                unit="%"
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_steam_2_st3")}
                                style={getDeveloperStyle("card_inlet_steam_2_st3")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END INLET STEAM 2 ST3 */}

                        {/* // FLASHING ST3 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_flashing_st3", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_flashing_st3">
                              <LiquidSteamFlowSVG
                                d="M 47,514 L 46,656 Q 46,671 50,686 L 50,686 Q 54,700 69,701 L 70,703"
                                active={true}
                                mode={isOpen ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={8}
                              />
                              {isOpen && (
                                <LiquidSteamFlowSVG
                                  d="M 146,703 L 332,700 Q 357,700 379,712"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={8}
                                />
                              )}
                              <EquipmentIconSVG
                                key="valve_flashing_st3"
                                x={125}
                                y={675}
                                icon={valvePneumaticActuatorSvg}
                                size={100}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={610}
                                title="FLASHING ST3"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_flashing_st3")}
                                style={getDeveloperStyle("card_flashing_st3")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END FLASHING ST3 */}

                        {/* // OUTLET ST3 */}
                        <TagMonitorCardSVG
                          x={710}
                          y={695}
                          title="OUTLET DOOR ST3"
                          value={getMappedValue ? formatDoorStatus(getMappedValue("card_outlet_door_st3", "MONITOR", "no tag")) : "no tag"}
                          unit=""
                          status="grey"
                          width={150}
                          onClick={() => handleEquipmentClick && handleEquipmentClick("card_outlet_door_st3")}
                          style={getDeveloperStyle("card_outlet_door_st3")}
                        />

                        {/* // D.CONDENSATE ST3 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("d_cond_st3", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_d_cond_st3">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 524,729 L 524,1012" active={true} mode="liquid" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 524,729 L 524,783" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_d_cond_st3"
                                x={550}
                                y={800}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={180}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={700}
                                y={800}
                                title="D. COND ST3"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("d_cond_st3")}
                                style={getDeveloperStyle("d_cond_st3")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END D.CONDENSATE ST3 */}

                        {/* // RELIEF CONDENSATE ST3 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_relief_condensate_st3", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_condensate_1_st3">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 544,1024 L 544,965 Q 544,953 554,946 L 554,946 Q 563,939 575,939 L 601,939" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 641,939 L 761,939" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 544,1024 L 544,965 Q 544,953 554,946 L 554,946 Q 563,939 575,939 L 601,939" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_condensate_1_st3"
                                x={620}
                                y={914}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={725}
                                y={900}
                                title="RELIEF CONDENSATE VALVE ST3"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_relief_condensate_st3")}
                                style={getDeveloperStyle("card_relief_condensate_st3")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END RELIEF CONDENSATE ST3 */}

                        {/* // CONDENSATE ST3 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_condensate_1_st3", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_condensate_2_st3">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 359,1012 L 365,1022 Q 370,1031 381,1031 L 402,1032" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 505,1030 L 523,1031 Q 541,1031 559,1031 L 599,1030" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 644,1031 L 776,1030" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 359,1012 L 365,1022 Q 370,1031 381,1031 L 402,1032" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 505,1030 L 523,1031 Q 541,1031 559,1031 L 599,1030" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_condensate_2_st3"
                                x={620}
                                y={1005}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={725}
                                y={995}
                                title="CONDENSATE ST3"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_condensate_1_st3")}
                                style={getDeveloperStyle("card_condensate_1_st3")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END CONDENSATE ST3 */}

                        {/* PRESSURE & TEMP CARDS FOR LINE 3 */}
                        <TagMonitorCardSVG
                          x={380}
                          y={380}
                          title="PRESSURE ST3"
                          value={getMappedValue ? String(getMappedValue("overview_pressure_3", "MONITOR", "No Tag")) : "No Tag"}
                          unit="Bar"
                          status="grey"
                          width={150}
                          valueColor="#ef4444"
                          onClick={() => {
                            if (configMode) {
                              handleEquipmentClick && handleEquipmentClick("st3_pressure_card");
                            } else {
                              openPressureTrend("3", "ST3 Pressure", getMappedValue ? getMappedValue("overview_pressure_3", "MONITOR", "0.0") : "0.0");
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!configMode) {
                              const rect = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
                              openPressureTrend("3", "ST3 Pressure", getMappedValue ? getMappedValue("overview_pressure_3", "MONITOR", "0.0") : "0.0", rect);
                            }
                          }}
                          onMouseLeave={() => {
                            if (!configMode) {
                              scheduleHoverClose(250);
                            }
                          }}
                          style={getDeveloperStyle("st3_pressure_card")}
                        />
                        <TagMonitorCardSVG
                          x={380}
                          y={520}
                          title="TEMPERATURE ST3"
                          value={getMappedValue ? String(getMappedValue("overview_temp_3", "MONITOR", "No Tag")) : "No Tag"}
                          unit="°C"
                          status="grey"
                          width={150}
                          valueColor="#ef4444"
                          onClick={() => handleEquipmentClick && handleEquipmentClick("st3_temp_card")}
                          style={getDeveloperStyle("st3_temp_card")}
                        />

                        {/* VALVE MODULATE SETTINGS (LINE 3 ONLY) */}
                        <SettingValveModulateSVG
                          x={800}
                          y={120}
                          scale={1}
                          getMappedValue={getMappedValue}
                          line={3}
                          configMode={configMode}
                          tagMap={tagMap}
                          handleEquipmentClick={handleEquipmentClick}
                          getDeveloperStyle={getDeveloperStyle}
                        />
                      </g>
                    )}

                    {/* Render Tag Monitor Cards khusus untuk tab LINE 4 */}
                    {n === 4 && (
                      <g id="line4_equipment_blocks">
                        {/* // INLET DOOR ST4 */}
                        <TagMonitorCardSVG
                          x={380}
                          y={240}
                          title="INLET DOOR ST4"
                          value={
                            (() => {
                              const rawVal = getMappedValue ? getMappedValue("card_inlet_door_st4", "MONITOR", "no tag") : "no tag";
                              return formatDoorStatus(rawVal);
                            })()
                          }
                          unit=""
                          status="grey"
                          width={150}
                          onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_door_st4")}
                          style={getDeveloperStyle("card_inlet_door_st4")}
                        />

                        {/* // EXHAUST STEAM ST4 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_exhaust_steam_st4", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_exhaust_steam_st4">
                              <LiquidSteamFlowSVG d="M 265,146 L 265,95 Q 265,70 240,70 L 170,70" active={true} mode={isOpen ? "flowing" : "standby"} color="#38bdf8" thickness={8} />
                              {isOpen && (
                                <LiquidSteamFlowSVG d="M 120,70 L -9,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                              )}
                              <EquipmentIconSVG
                                key="valve_exhaust_steam_st4"
                                x={145}
                                y={50}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={40}
                                y={20}
                                title="EXHAUST STEAM ST4"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_exhaust_steam_st4")}
                                style={getDeveloperStyle("card_exhaust_steam_st4")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END EXHAUST STEAM ST4 */}

                        {/* // INLET STEAM 1 ST4 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_inlet_steam_1_st4", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_inlet_steam_1_st4">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 28,220 L 38,221 Q 48,222 48,232 L 48,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 53,301 L 106,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 147,302 L 512,303" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 28,220 L 38,221 Q 48,222 48,232 L 48,301" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 53,301 L 106,301" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_inlet_steam_1_st4"
                                x={125}
                                y={275}
                                icon={valvePneumaticActuatorSvg}
                                size={100}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={200}
                                title="INLET STEAM 1 ST4"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_steam_1_st4")}
                                style={getDeveloperStyle("card_inlet_steam_1_st4")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END INLET STEAM 1 ST4 */}

                        {/* // INLET STEAM 2 ST4 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_inlet_steam_2_st4", "MONITOR", "0") : "0";
                          const tagStr = String(rawTagVal).trim().toLowerCase();
                          let isOpen = false;
                          let displayVal = "0";

                          if (rawTagVal === true || tagStr === "true" || tagStr === "open" || tagStr === "1") {
                            isOpen = true;
                            displayVal = "100";
                          } else if (rawTagVal === false || tagStr === "false" || tagStr === "close" || tagStr === "0") {
                            isOpen = false;
                            displayVal = "0";
                          } else {
                            const numericVal = parseFloat(tagStr);
                            if (!isNaN(numericVal)) {
                              isOpen = numericVal > 0;
                              displayVal = String(Math.round(numericVal));
                            } else {
                              isOpen = false;
                              displayVal = String(rawTagVal);
                            }
                          }
                          return (
                            <g id="block_inlet_steam_2_st4">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 48,301 L 47,514" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 51,514 L 103,514" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 146,515 L 160,515 Q 174,514 174,500 L 175,472 Q 175,453 194,453 L 194,453 Q 213,452 232,452 L 515,453" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 145,514 L 160,512 Q 174,510 174,525 L 173,559 Q 173,573 187,576 L 187,576 Q 201,578 215,578 L 341,578 Q 366,578 387,591 L 540,686" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 48,301 L 47,514" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 51,514 L 103,514" active={true} mode="standby" color="#38bdf8" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_inlet_steam_2_st4"
                                x={125}
                                y={488}
                                icon={valvePositionerSvg}
                                size={100}
                                rotation={270}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={415}
                                title="INLET STEAM 2 ST4"
                                value={displayVal}
                                unit="%"
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_inlet_steam_2_st4")}
                                style={getDeveloperStyle("card_inlet_steam_2_st4")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END INLET STEAM 2 ST4 */}

                        {/* // FLASHING ST4 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_flashing_st4", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_flashing_st4">
                              <LiquidSteamFlowSVG
                                d="M 47,514 L 46,656 Q 46,671 50,686 L 50,686 Q 54,700 69,701 L 70,703"
                                active={true}
                                mode={isOpen ? "flowing" : "standby"}
                                color="#38bdf8"
                                thickness={8}
                              />
                              {isOpen && (
                                <LiquidSteamFlowSVG
                                  d="M 146,703 L 332,700 Q 357,700 379,712"
                                  active={true}
                                  mode="flowing"
                                  color="#38bdf8"
                                  thickness={8}
                                />
                              )}
                              <EquipmentIconSVG
                                key="valve_flashing_st4"
                                x={125}
                                y={675}
                                icon={valvePneumaticActuatorSvg}
                                size={100}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={140}
                                y={610}
                                title="FLASHING ST4"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_flashing_st4")}
                                style={getDeveloperStyle("card_flashing_st4")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END FLASHING ST4 */}

                        {/* // OUTLET ST4 */}
                        <TagMonitorCardSVG
                          x={710}
                          y={695}
                          title="OUTLET DOOR ST4"
                          value={getMappedValue ? formatDoorStatus(getMappedValue("card_outlet_door_st4", "MONITOR", "no tag")) : "no tag"}
                          unit=""
                          status="grey"
                          width={150}
                          onClick={() => handleEquipmentClick && handleEquipmentClick("card_outlet_door_st4")}
                          style={getDeveloperStyle("card_outlet_door_st4")}
                        />

                        {/* // D.CONDENSATE ST4 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("d_cond_st4", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_d_cond_st4">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 524,729 L 524,1012" active={true} mode="liquid" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 524,729 L 524,783" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_d_cond_st4"
                                x={550}
                                y={800}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={180}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={700}
                                y={800}
                                title="D. COND ST4"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("d_cond_st4")}
                                style={getDeveloperStyle("d_cond_st4")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END D.CONDENSATE ST4 */}

                        {/* // RELIEF CONDENSATE ST4 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_relief_condensate_st4", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_condensate_1_st4">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 544,1024 L 544,965 Q 544,953 554,946 L 554,946 Q 563,939 575,939 L 601,939" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 641,939 L 761,939" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 544,1024 L 544,965 Q 544,953 554,946 L 554,946 Q 563,939 575,939 L 601,939" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_condensate_1_st4"
                                x={620}
                                y={914}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={725}
                                y={900}
                                title="RELIEF CONDENSATE VALVE ST4"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_relief_condensate_st4")}
                                style={getDeveloperStyle("card_relief_condensate_st4")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END RELIEF CONDENSATE ST4 */}

                        {/* // CONDENSATE ST4 (FLOW + VALVE + CARD) */}
                        {(() => {
                          const rawTagVal = getMappedValue ? getMappedValue("card_condensate_1_st4", "MONITOR", "0") : "0";
                          const tagVal = String(rawTagVal);
                          const numericVal = parseFloat(tagVal);
                          const isOpen = !isNaN(numericVal) ? numericVal > 0 : (tagVal === "OPEN" || tagVal === "true" || tagVal === "1");
                          return (
                            <g id="block_condensate_2_st4">
                              {isOpen ? (
                                <>
                                  <LiquidSteamFlowSVG d="M 359,1012 L 365,1022 Q 370,1031 381,1031 L 402,1032" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 505,1030 L 523,1031 Q 541,1031 559,1031 L 599,1030" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 644,1031 L 776,1030" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                                </>
                              ) : (
                                <>
                                  <LiquidSteamFlowSVG d="M 359,1012 L 365,1022 Q 370,1031 381,1031 L 402,1032" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                  <LiquidSteamFlowSVG d="M 505,1030 L 523,1031 Q 541,1031 559,1031 L 599,1030" active={true} mode="standby" color="#f59e0b" thickness={8} />
                                </>
                              )}
                              <EquipmentIconSVG
                                key="valve_condensate_2_st4"
                                x={620}
                                y={1005}
                                icon={valvePneumaticActuatorSvg}
                                size={90}
                                rotation={90}
                                isRunning={isOpen}
                              />
                              <TagMonitorCardSVG
                                x={725}
                                y={995}
                                title="CONDENSATE ST4"
                                value={formatValveStatus(rawTagVal)}
                                unit=""
                                status={isOpen ? "green" : "red"}
                                width={150}
                                onClick={() => handleEquipmentClick && handleEquipmentClick("card_condensate_1_st4")}
                                style={getDeveloperStyle("card_condensate_1_st4")}
                              />
                            </g>
                          );
                        })()}
                        {/* // END CONDENSATE ST4 */}

                        {/* PRESSURE & TEMP CARDS FOR LINE 4 */}
                        <TagMonitorCardSVG
                          x={380}
                          y={380}
                          title="PRESSURE ST4"
                          value={getMappedValue ? String(getMappedValue("overview_pressure_4", "MONITOR", "No Tag")) : "No Tag"}
                          unit="Bar"
                          status="grey"
                          width={150}
                          valueColor="#ef4444"
                          onClick={() => {
                            if (configMode) {
                              handleEquipmentClick && handleEquipmentClick("st4_pressure_card");
                            } else {
                              openPressureTrend("4", "ST4 Pressure", getMappedValue ? getMappedValue("overview_pressure_4", "MONITOR", "0.0") : "0.0");
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!configMode) {
                              const rect = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
                              openPressureTrend("4", "ST4 Pressure", getMappedValue ? getMappedValue("overview_pressure_4", "MONITOR", "0.0") : "0.0", rect);
                            }
                          }}
                          onMouseLeave={() => {
                            if (!configMode) {
                              scheduleHoverClose(250);
                            }
                          }}
                          style={getDeveloperStyle("st4_pressure_card")}
                        />
                        <TagMonitorCardSVG
                          x={380}
                          y={520}
                          title="TEMPERATURE ST4"
                          value={getMappedValue ? String(getMappedValue("overview_temp_4", "MONITOR", "No Tag")) : "No Tag"}
                          unit="°C"
                          status="grey"
                          width={150}
                          valueColor="#ef4444"
                          onClick={() => handleEquipmentClick && handleEquipmentClick("st4_temp_card")}
                          style={getDeveloperStyle("st4_temp_card")}
                        />

                        {/* VALVE MODULATE SETTINGS (LINE 4 ONLY) */}
                        <SettingValveModulateSVG
                          x={800}
                          y={120}
                          scale={1}
                          getMappedValue={getMappedValue}
                          line={4}
                          configMode={configMode}
                          tagMap={tagMap}
                          handleEquipmentClick={handleEquipmentClick}
                          getDeveloperStyle={getDeveloperStyle}
                        />
                      </g>
                    )}

                    {/* GAMBAR PINTU (INLET & OUTLET) UNTUK INDIVIDUAL LINE VIEW */}
                    <image
                      href={topDoorLineStatus === "OPEN" ? topOpenSvg : topCloseSvg}
                      x={265} /* <--- POSISI X PINTU ATAS */
                      y={10} /* <--- POSISI Y PINTU ATAS */
                      width="165" /* <--- UKURAN PINTU ATAS */
                    />
                    <image
                      href={botDoorLineStatus === "OPEN" ? botOpenSvg : botCloseSvg}
                      x={505} /* <--- POSISI X PINTU BAWAH */
                      y={601} /* <--- POSISI Y PINTU BAWAH */
                      width="160" /* <--- UKURAN PINTU BAWAH */
                    />

                  </g>
                );
              })()}

            <defs>
              <filter
                id="yellow-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="4"
                  floodColor="#ffdb3b"
                  floodOpacity="1"
                />
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="8"
                  floodColor="#ffdb3b"
                  floodOpacity="0.6"
                />
              </filter>
              <filter id="tint-red" color-interpolation-filters="sRGB">
                <feColorMatrix type="matrix"
                  values="0.244 0.822 0.083 0 0
                          0     0     0     0 0
                          0     0     0     0 0
                          0     0     0     1 0"/>
              </filter>
              <filter id="tint-green" color-interpolation-filters="sRGB">
                <feColorMatrix type="matrix"
                  values="0.0638 0.2146 0.0216 0 0
                          0.2551 0.8582 0.0867 0 0
                          0.0425 0.1430 0.0144 0 0
                          0 0 0 1 0"/>
              </filter>
            </defs>

            {activeTab === "overview" && (
              <>
                {/* Condensate 2 ST1 */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_condensate_2_st1", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M -32,1003 L -28,1014 Q -24,1025 -12,1026 L 17,1028" active={true} mode="standby" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 118,1027 L 203,1027" active={true} mode="standby" color="#f59e0b" thickness={10} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M -32,1003 L -28,1014 Q -24,1025 -12,1026 L 17,1028" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 118,1027 L 203,1027" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 253,1027 L 360,1027" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}

                {/* Condensate 1 ST1 */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_condensate_1_st1", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 152,1019 L 152,965 Q 157,940 182,936 L 203,936" active={true} mode="standby" color="#f59e0b" thickness={10} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 152,1019 L 152,965 Q 157,940 182,936 L 203,936" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 253,936 L 339,936" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}

                {/* Condensate 2 ST2 */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_condensate_2_st2", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 609,999 L 611,1012 Q 613,1024 626,1025 L 652,1026" active={true} mode="standby" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 758,1028 L 843,1028" active={true} mode="standby" color="#f59e0b" thickness={10} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 609,999 L 611,1012 Q 613,1024 626,1025 L 652,1026" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 758,1028 L 843,1028" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 893,1028 L 1000,1028" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}

                {/* Condensate 1 ST2 */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_condensate_1_st2", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 793,1018 L 793,970 Q 793,965 797,952 L 797,952 Q 804,939 818,938 L 843,936" active={true} mode="standby" color="#f59e0b" thickness={10} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 793,1018 L 793,970 Q 793,965 797,952 L 797,952 Q 804,939 818,938 L 843,936" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 893,936 L 1000,936" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Condensate 2 ST3 */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_condensate_2_st3", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1289,1004 L 1295,1015 Q 1300,1025 1312,1026 L 1336,1028" active={true} mode="standby" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 1441,1027 L 1525,1027" active={true} mode="standby" color="#f59e0b" thickness={10} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1289,1004 L 1295,1015 Q 1300,1025 1312,1026 L 1336,1028" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 1441,1027 L 1525,1027" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 1575,1027 L 1669,1027" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Condensate 1 ST3 */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_condensate_1_st3", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 1474,1020 L 1476,964 Q 1477,939 1502,936 L 1525,936" active={true} mode="standby" color="#f59e0b" thickness={10} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1474,1020 L 1476,964 Q 1477,939 1502,936 L 1525,936" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 1575,936 L 1664,936" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Condensate 2 ST4 */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_condensate_2_st4", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1961,1007 L 1964,1016 Q 1970,1028 1984,1027 L 1999,1026" active={true} mode="standby" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 2110,1027 L 2193,1027" active={true} mode="standby" color="#f59e0b" thickness={10} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1961,1007 L 1964,1016 Q 1970,1028 1984,1027 L 1999,1026" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 2110,1027 L 2193,1027" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                            <LiquidSteamFlowSVG d="M 2243,1027 L 2330,1027" active={true} mode="flowing" color="#f59e0b" thickness={10} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Condensate 1 ST4 */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_condensate_1_st4", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 2143,1018 L 2144,968 Q 2144,939 2173,937 L 2193,937" active={true} mode="standby" color="#f59e0b" thickness={8} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 2143,1018 L 2144,968 Q 2144,939 2173,937 L 2193,937" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                            <LiquidSteamFlowSVG d="M 2243,937 L 2330,937" active={true} mode="flowing" color="#f59e0b" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}

                {/* D.Cond ST1 - Orange Flow */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_d_cond_st1", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 134,731 L 134,783" active={true} mode="standby" color="#f59e0b" thickness={8} />
                        )}
                        {isOpen && (
                          <LiquidSteamFlowSVG d="M 134,731 L 134,1012" active={true} mode="liquid" color="#f59e0b" thickness={8} />
                        )}
                      </>
                    );
                  })()
                )}
                {/* D.Cond ST2 - Orange Flow */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_d_cond_st2", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 773,725 L 773,783" active={true} mode="standby" color="#f59e0b" thickness={8} />
                        )}
                        {isOpen && (
                          <LiquidSteamFlowSVG d="M 773,725 L 773,1012" active={true} mode="liquid" color="#f59e0b" thickness={8} />
                        )}
                      </>
                    );
                  })()
                )}

                {/* D.Cond ST3 - Orange Flow */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_d_cond_st3", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 1457,722 L 1457,786" active={true} mode="standby" color="#f59e0b" thickness={8} />
                        )}
                        {isOpen && (
                          <LiquidSteamFlowSVG d="M 1457,722 L 1457,1012" active={true} mode="liquid" color="#f59e0b" thickness={8} />
                        )}
                      </>
                    );
                  })()
                )}


                {/* D.Cond ST4 - Orange Flow */}
                {(true || parseFloat(lv('flow_1784099909352', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_d_cond_st4", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 2125,728 L 2125,785" active={true} mode="standby" color="#f59e0b" thickness={8} />
                        )}
                        {isOpen && (
                          <LiquidSteamFlowSVG d="M 2125,728 L 2125,1012" active={true} mode="liquid" color="#f59e0b" thickness={8} />
                        )}
                      </>
                    );
                  })()
                )}



                {(false || parseFloat(lv('flow_1784207451668', 'FLOW', '0')) > 0) && (
                  <g className="liquid-flow--flowing" style={{ pointerEvents: "none" }}>
                    <path
                      d="M 2241,1027 L 2329,1026"
                      fill="none"
                      stroke="#f59e0b"
                      className="liquid-flow-glow"
                    />
                    <path
                      d="M 2241,1027 L 2329,1026"
                      fill="none"
                      stroke="#f59e0b"
                      className="liquid-flow-aura"
                    />
                  </g>
                )}

                {(false || parseFloat(lv('flow_1784207451668', 'FLOW', '0')) > 0) && (
                  <g className="liquid-flow--flowing" style={{ pointerEvents: "none" }}>
                    <path
                      d="M 2235,936 L 2324,935"
                      fill="none"
                      stroke="#f59e0b"
                      className="liquid-flow-glow"
                    />
                    <path
                      d="M 2235,936 L 2324,935"
                      fill="none"
                      stroke="#f59e0b"
                      className="liquid-flow-aura"
                    />
                  </g>
                )}

                {/* Inlet Steam 2 ST1 - Valve 3 combined path */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_inlet_steam_2_st1", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M -342,299 L -344,512" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -336,511 L -291,511" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M -342,299 L -344,512" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -336,511 L -291,511" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -242,511 L -229,511 Q -217,510 -217,497 L -216,467 Q -216,454 -204,450 L -185,450 M -217,508 L -217,557 Q -217,569 -205,572 L -193,574 M -167,448 L 123,449 M -169,575 L -82,572 Q -29,570 16,598 L 144,679" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Flashing Steam ST1 - Valve 4 combined path */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_flashing_st1", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M -344,512 L -344,669 Q -344,697 -330,698" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -330,698 L -285,698" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M -344,512 L -344,669 Q -344,697 -330,698" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -330,698 L -285,698" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -245,698 L -188,698 M -175,697 L -56,697 Q -30,697 -8,710 L 14,723" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* M -338,511 digabung ke Valve 4 */}
                {/* Inlet Steam 1 ST1 - Valve 2 combined path */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_inlet_steam_1_st1", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M -357,216 L -350,217 Q -343,217 -343,224 L -342,299" active={true} mode="standby" color="#38bdf8" thickness={8} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M -357,216 L -350,217 Q -343,217 -343,224 L -342,299" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -335,297 L -291,297" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -245,298 L -187,298 M -175,300 L 129,300" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M -335,297 L -291,297" active={true} mode="standby" color="#38bdf8" thickness={8} />
                        )}
                      </>
                    );
                  })()
                )}
                {/* M -245,298 digabung ke Valve 2 */}
                {/* M -242,511 & M -217,508 digabung ke Valve 4 */}
                {/* Path 2 digabung ke Valve 4 */}
                {/* M -175,300 digabung ke Valve 2 */}
                {/* M -167,448 & M -169,575 digabung ke Valve 4 */}
                {/* Exhaust ST1 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_exhaust_steam_st1", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M -126,146 L -126,95 Q -126,70 -151,70 L -221,70" active={true} mode="standby" color="#38bdf8" thickness={8} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M -126,146 L -126,95 Q -126,70 -151,70 L -221,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M -271,70 L -400,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Exhaust ST2 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_exhaust_steam_st2", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 514,146 L 514,95 Q 514,70 489,70 L 419,70" active={true} mode="standby" color="#38bdf8" thickness={8} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 514,146 L 514,95 Q 514,70 489,70 L 419,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 369,70 L 220,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Flashing ST2 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_flashing_st2", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 295,512 L 295,668 Q 295,695 322,697" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 322,697 L 358,699" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 295,512 L 295,668 Q 295,695 322,697" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 322,697 L 358,699" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 400,698 L 578,696 Q 609,696 636,712 L 662,727" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Inlet 1 ST2 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_inlet_steam_1_st2", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 285,224 L 285,212 Q 298,208 298,215 L 298,299" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 307,297 L 352,297" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 285,224 L 285,212 Q 298,208 298,215 L 298,299" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 307,297 L 352,297" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 400,300 L 762,300" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Inlet 2 ST2 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_inlet_steam_2_st2", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 298,299 L 295,512" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 300,511 L 352,510" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 298,299 L 295,512" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 300,511 L 352,510" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 399,509 L 412,509 Q 425,509 424,496 L 423,479 Q 420,448 451,448 L 765,450 M 425,506 L 422,542 Q 419,577 455,576 L 585,573 Q 608,573 628,584 L 628,584 Q 648,595 667,607 L 797,686" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* M 400,300 digabung ke Valve 9 */}
                {/* M 399,509 digabung ke Valve 10 */}
                {/* M 425,506 digabung ke Valve 10 */}
                {/* M 400,698 digabung ke Valve 11 */}
                {/* Exhaust ST3 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_exhaust_steam_st3", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 1196,146 L 1196,95 Q 1196,70 1171,70 L 1101,70" active={true} mode="standby" color="#38bdf8" thickness={8} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1196,146 L 1196,95 Q 1196,70 1171,70 L 1101,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1051,70 L 900,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Flashing ST3 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_flashing_st3", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 979,520 L 978,666 Q 978,695 1007,698" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1007,698 L 1035,700" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 979,520 L 978,666 Q 978,695 1007,698" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1007,698 L 1035,700" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1083,698 L 1265,697 Q 1295,697 1320,714 L 1345,730" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Inlet 1 ST3 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_inlet_steam_1_st3", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 967,217 L 974,218 Q 980,218 980,225 L 979,299" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 979,299 L 1036,297" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 967,217 L 974,218 Q 980,218 980,225 L 979,299" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 979,299 L 1036,297" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1078,297 L 1445,301" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* M 1078,297 digabung ke Valve 16 */}
                {/* Inlet 2 ST3 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_inlet_steam_2_st3", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 979,299 L 979,520" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 979,510 L 1042,510" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 979,299 L 979,520" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 979,510 L 1042,510" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1081,510 L 1094,511 Q 1106,511 1106,498 L 1106,479 Q 1105,447 1137,447 L 1447,449 M 1105,511 L 1105,545 Q 1105,578 1138,577 L 1283,574 Q 1300,574 1313,585 L 1313,585 Q 1326,596 1341,605 L 1468,678" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Extensions merged into Valve 17 */}
                {/* M 1083,698 digabung ke Valve 18 */}
                {/* Flashing ST4 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_flashing_st4", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1644,511 L 1644,668 Q 1644,696 1672,698" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1672,698 L 1700,700" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1644,511 L 1644,668 Q 1644,696 1672,698" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1672,698 L 1700,700" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1743,696 L 1936,697 Q 1962,697 1985,710 L 2007,723" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* M 1748,298 digabung ke Valve 23 */}
                {/* Inlet 1 ST4 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_inlet_steam_1_st4", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1631,214 L 1639,213 Q 1647,212 1647,220 L 1646,298" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1651,298 L 1702,298" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1631,214 L 1639,213 Q 1647,212 1647,220 L 1646,298" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1651,298 L 1702,298" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1748,298 L 2112,298" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* M 1751,509 & M 1773,506 digabung ke Valve 24 */}
                {/* Inlet 2 ST4 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_inlet_steam_2_st4", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1646,298 L 1644,511" active={true} mode="standby" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1653,511 L 1705,511" active={true} mode="standby" color="#38bdf8" thickness={8} />
                          </>
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1646,298 L 1644,511" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1653,511 L 1705,511" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1751,509 L 1763,511 Q 1774,512 1773,500 L 1773,480 Q 1771,448 1803,448 L 2117,448 M 1773,506 L 1772,541 Q 1771,576 1806,576 L 1936,574 Q 1966,574 1991,592 L 1991,592 Q 2015,609 2041,624 L 2134,679" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}
                {/* Static paths merged into Valve 23, 24, 25 blocks above */}
                {/* Exhaust ST4 */}
                {(true || parseFloat(lv('flow_1784166398324', 'FLOW', '0')) > 0) && (
                  (() => {
                    const valveVal = getSmartValveValue("valve_exhaust_steam_st4", "0");
                    const isOpen = formatValveStatus(valveVal) === "OPEN";
                    return (
                      <>
                        {!isOpen && (
                          <LiquidSteamFlowSVG d="M 1864,146 L 1864,95 Q 1864,70 1839,70 L 1770,70" active={true} mode="standby" color="#38bdf8" thickness={8} />
                        )}
                        {isOpen && (
                          <>
                            <LiquidSteamFlowSVG d="M 1864,146 L 1864,95 Q 1864,70 1839,70 L 1770,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                            <LiquidSteamFlowSVG d="M 1720,70 L 1550,70" active={true} mode="flowing" color="#38bdf8" thickness={8} />
                          </>
                        )}
                      </>
                    );
                  })()
                )}




                {/* ==========================================
                                    LAYER: TOP OPEN / CLOSE DOORS
                   ========================================== */}
                {activeTab === "overview" && (
                  <>
                    {TOP_DOORS.map((door) => {
                      // Ambil state pintu saat ini
                      let manualState = "CLOSE";
                      let tagId = "";
                      if (door.id.includes("_1")) { manualState = formatDoorStatus(TEST_INLET_DOOR_ST1); tagId = "card_inlet_door_st1"; }
                      if (door.id.includes("_2")) { manualState = formatDoorStatus(TEST_INLET_DOOR_ST2); tagId = "card_inlet_door_st2"; }
                      if (door.id.includes("_3")) { manualState = formatDoorStatus(TEST_INLET_DOOR_ST3); tagId = "card_inlet_door_st3"; }
                      if (door.id.includes("_4")) { manualState = formatDoorStatus(TEST_INLET_DOOR_ST4); tagId = "card_inlet_door_st4"; }

                      let doorState = manualState;
                      if (getMappedValue) {
                        const mapped = getMappedValue(tagId, "MONITOR", manualState);
                        if (String(mapped).trim().toLowerCase() !== "no tag" && mapped !== undefined && mapped !== null) {
                          doorState = formatDoorStatus(mapped);
                        }
                      }

                      const isDoorOpen = doorState === "OPEN";
                      const isDoorOpenSvg = door.id.includes("top_open");

                      // Jangan render SVG yang salah state
                      if ((isDoorOpen && !isDoorOpenSvg) || (!isDoorOpen && isDoorOpenSvg)) {
                        return null;
                      }

                      return (
                        <image
                          key={door.id}
                          href={door.src}
                          x={door.x}
                          y={door.y}
                          width={door.size}
                          height={door.size}
                          transform={`rotate(${door.rotation} ${door.x + door.size / 2} ${door.y + door.size / 2})`}
                        />
                      );
                    })}

                    {BOT_DOORS.map((door) => {
                      // Ambil state pintu saat ini
                      let manualState = "CLOSE";
                      let tagId = "";
                      if (door.id.includes("_1")) { manualState = formatDoorStatus(TEST_OUTLET_DOOR_ST1); tagId = "card_outlet_door_st1"; }
                      if (door.id.includes("_2")) { manualState = formatDoorStatus(TEST_OUTLET_DOOR_ST2); tagId = "card_outlet_door_st2"; }
                      if (door.id.includes("_3")) { manualState = formatDoorStatus(TEST_OUTLET_DOOR_ST3); tagId = "card_outlet_door_st3"; }
                      if (door.id.includes("_4")) { manualState = formatDoorStatus(TEST_OUTLET_DOOR_ST4); tagId = "card_outlet_door_st4"; }

                      let doorState = manualState;
                      if (getMappedValue) {
                        const mapped = getMappedValue(tagId, "MONITOR", manualState);
                        if (String(mapped).trim().toLowerCase() !== "no tag" && mapped !== undefined && mapped !== null) {
                          doorState = formatDoorStatus(mapped);
                        }
                      }

                      const isDoorOpen = doorState === "OPEN";
                      const isDoorOpenSvg = door.id.includes("bot_open");

                      // Jangan render SVG yang salah state
                      if ((isDoorOpen && !isDoorOpenSvg) || (!isDoorOpen && isDoorOpenSvg)) {
                        return null;
                      }

                      return (
                        <image
                          key={door.id}
                          href={door.src}
                          x={door.x}
                          y={door.y}
                          width={door.size}
                          height={door.size}
                          transform={`rotate(${door.rotation} ${door.x + door.size / 2} ${door.y + door.size / 2})`}
                        />
                      );
                    })}
                  </>
                )}

                {/* ==========================================
                                    LAYER: TAG MONITOR CARDS (seperti INLET STEAM)
                   ========================================== */}
                {activeTab === "overview" && TAG_MONITOR_CARDS.map((card) => {
                  if (activeTab !== "overview") return null;
                  return (
                    <TagMonitorCardSVG
                      key={card.id}
                      x={card.x}
                      y={card.y}
                      title={card.title}
                      value={
                        (() => {
                          if (!getMappedValue) return "No Tag";
                          const mapped = getMappedValue(card.id, "MONITOR", "No Tag");
                          if (String(mapped).trim().toLowerCase() === "no tag" || mapped === undefined || mapped === null) {
                            return "No Tag";
                          }

                          // If card is inlet steam 2 (analog percentage value or boolean valve status)
                          if (card.id.includes("inlet_steam_2")) {
                            const strVal = String(mapped).trim().toLowerCase();
                            if (mapped === true || strVal === "true" || strVal === "open" || strVal === "1") {
                              return "100";
                            }
                            if (mapped === false || strVal === "false" || strVal === "close" || strVal === "0") {
                              return "0";
                            }
                            const num = parseFloat(mapped);
                            return !isNaN(num) ? String(Math.round(num)) : String(mapped);
                          }

                          // If card is pressure or temp (analog/numeric values), keep raw value
                          if (card.id.includes("pressure") || card.id.includes("temp")) {
                            return String(mapped);
                          }

                          // For door cards (inlet door, outlet door) -> use formatDoorStatus (limit switch: 1=CLOSE, 0=OPEN)
                          if (card.id.startsWith("card_inlet_door_st") || card.id.startsWith("card_outlet_door_st")) {
                            return formatDoorStatus(mapped);
                          }

                          // Translate boolean/discrete valve statuses to OPEN / CLOSE (valves: 1=OPEN, 0=CLOSE)
                          return formatValveStatus(mapped);
                        })()
                      }
                      unit={
                        (() => {
                          if (!getMappedValue) return card.unit;
                          const mapped = getMappedValue(card.id, "MONITOR", "No Tag");
                          if (String(mapped).trim().toLowerCase() === "no tag" || mapped === undefined || mapped === null || mapped === "--") return "";
                          return card.unit;
                        })()
                      }
                      valueColor={card.valueColor}
                      status={card.status}
                      width={card.width}
                      scale={card.scale || 1}
                      onClick={() => {
                        if (configMode) {
                          handleEquipmentClick && handleEquipmentClick(card.id);
                        } else if (card.id.includes("pressure") || card.id.includes("pres") || card.id.includes("temp")) {
                          let lineNum = "1";
                          if (card.id.includes("2")) lineNum = "2";
                          else if (card.id.includes("3")) lineNum = "3";
                          else if (card.id.includes("4")) lineNum = "4";
                          else if (card.id.includes("bpv") || card.id.includes("blr")) lineNum = "BPV";
                          const isTemp = card.id.includes("temp");
                          const mapped = getMappedValue ? getMappedValue(card.id, "MONITOR", "0.0") : "0.0";
                          openPressureTrend(lineNum, `${card.title.toUpperCase().includes("BPV") ? "BPV" : "ST" + lineNum} ${isTemp ? "Temperature" : "Pressure"}`, mapped, null, isTemp ? "temperature" : "pressure");
                        } else {
                          handleEquipmentClick && handleEquipmentClick(card.id);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!configMode && (card.id.includes("pressure") || card.id.includes("pres") || card.id.includes("temp"))) {
                          let lineNum = "1";
                          if (card.id.includes("2")) lineNum = "2";
                          else if (card.id.includes("3")) lineNum = "3";
                          else if (card.id.includes("4")) lineNum = "4";
                          else if (card.id.includes("bpv") || card.id.includes("blr")) lineNum = "BPV";
                          const isTemp = card.id.includes("temp");
                          const mapped = getMappedValue ? getMappedValue(card.id, "MONITOR", "0.0") : "0.0";
                          const rect = e?.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
                          openPressureTrend(lineNum, `${card.title.toUpperCase().includes("BPV") ? "BPV" : "ST" + lineNum} ${isTemp ? "Temperature" : "Pressure"}`, mapped, rect, isTemp ? "temperature" : "pressure");
                        }
                      }}
                      onMouseLeave={() => {
                        if (!configMode && (card.id.includes("pressure") || card.id.includes("pres") || card.id.includes("temp"))) {
                          scheduleHoverClose(250);
                        }
                      }}
                      style={getDeveloperStyle(card.id)}
                    />
                  );
                })}

                {/* Render 24 Manual Valves */}
                {activeTab === "overview" && MANUAL_VALVES.map((valve) => {
                  let valveVal = getSmartValveValue(valve.id, "0");
                  const isOpen = formatValveStatus(valveVal) === "OPEN";
                  return (
                    <EquipmentIconSVG
                      key={valve.id}
                      x={valve.x}
                      y={valve.y}
                      icon={valve.icon || valvePneumaticActuatorSvg}
                      size={valve.size}
                      rotation={valve.rotation}
                      isRunning={isOpen}
                    />
                  );
                })}

                {/* STATUS PANELS FOR ALL 4 STERILIZERS IN OVERVIEW */}
                {activeTab === "overview" && [1, 2, 3, 4].map((n) => {
                  const xPos = n === 1 ? 160 : n === 2 ? 810 : n === 3 ? 1490 : 2150;
                  const purgeSafetyY = 827; // <--- UBAH POSISI Y DI SINI (Contoh: 110 untuk di atas, 690 untuk di bawah)

                  // Konfigurasi D.CONDENSATE  (PLC & Manual)
                  const dCondTag = `d_cond_st${n}`; // Nama tag PLC
                  const dCondManual = "CLOSE"; // <--- UBAH NILAI MANUAL DI SINI ("OPEN" atau "CLOSE") jika tidak ada tag PLC

                  let dCondDisplay = dCondManual;
                  if (getMappedValue) {
                    const mapped = getMappedValue(dCondTag, "STATUS", dCondManual);
                    if (String(mapped).trim().toLowerCase() !== "no tag" && mapped !== undefined && mapped !== null) {
                      dCondDisplay = formatDoorStatus(mapped);
                    }
                  }

                  // Konfigurasi Relief Condensate Valve (PLC & Manual)
                  const reliefCondensateTag = `relief_condensate_valve_st${n}`; // Nama tag PLC
                  const reliefCondensateManual = "CLOSE";

                  let reliefCondensateDisplay = reliefCondensateManual;
                  if (getMappedValue) {
                    const mapped = getMappedValue(reliefCondensateTag, "STATUS", reliefCondensateManual);
                    if (String(mapped).trim().toLowerCase() !== "no tag" && mapped !== undefined && mapped !== null) {
                      reliefCondensateDisplay = formatValveStatus(mapped);
                    }
                  }

                  // Konfigurasi Condensate Valve (PLC & Manual)
                  const condensateTag = `condensate_valve_st${n}`; // Nama tag PLC
                  const condensateManual = "CLOSE";

                  let CondensateDisplay = condensateManual;
                  if (getMappedValue) {
                    const mapped = getMappedValue(condensateTag, "STATUS", condensateManual);
                    if (String(mapped).trim().toLowerCase() !== "no tag" && mapped !== undefined && mapped !== null) {
                      CondensateDisplay = formatValveStatus(mapped);
                    }
                  }

                  return (
                    <g key={`st${n}_overview_group`}>

                      <SterilizerStatusPanelSVG
                        key={`st${n}_status`}
                        x={xPos}
                        y={10}
                        title={`STERILIZER ${n}`}
                        status={
                          (() => {
                            if (!getMappedValue) return "No Tag";
                            const raw = getMappedValue(`st${n}_status`, "STATUS", "No Tag");
                            if (String(raw).trim().toLowerCase() === "no tag" || raw === undefined || raw === null || String(raw).trim() === "--") {
                              return "No Tag";
                            }
                            const sRaw = String(raw).trim();
                            if (sRaw === "0") return "EMERGENCY";
                            if (sRaw === "1") return "RUN";
                            if (sRaw === "2") return "STOP";
                            return sRaw;
                          })()
                        }
                        recipe={
                          (() => {
                            if (!getMappedValue) return "No Tag";
                            const raw = getMappedValue(`st${n}_status`, "RECIPE", "No Tag");
                            if (String(raw).trim().toLowerCase() === "no tag" || raw === undefined || raw === null || String(raw).trim() === "--") {
                              return "No Tag";
                            }
                            const sRaw = String(raw).trim();
                            if (sRaw === "0") return "KOSONG";
                            if (sRaw === "1") return "NORMAL";
                            if (sRaw === "2") return "UNFRESH";
                            if (sRaw === "3") return "WET";
                            return sRaw;
                          })()
                        }
                        actualStep={getMappedValue ? String(getMappedValue(`st${n}_status`, "STEP", "No Tag")) : "No Tag"}
                        totalTime={getMappedValue ? String(getMappedValue(`st${n}_status`, "TOTAL_TIME", "No Tag")) : "No Tag"}
                        doorIn={formatDoorStatus(getMappedValue ? getMappedValue(`st${n}_status`, "DOOR_IN", "No Tag") : "No Tag")}
                        doorOut={formatDoorStatus(getMappedValue ? getMappedValue(`st${n}_status`, "DOOR_OUT", "No Tag") : "No Tag")}
                        pressure={getMappedValue ? String(getMappedValue(`st${n}_status`, "PRESSURE", "No Tag")) : "No Tag"}
                        temp={getMappedValue ? String(getMappedValue(`st${n}_status`, "TEMP", "No Tag")) : "No Tag"}
                        scale={0.95}
                        onClick={() => handleEquipmentClick && handleEquipmentClick(`st${n}_status`)}
                        style={getDeveloperStyle(`st${n}_status`)}
                      />


                    </g>
                  );
                })}
              </>
            )}

          </svg>
        </div>
      </div>




      {(() => {
        if (!pressureTrendModal) return null;
        const isTemp = pressureTrendModal.type === "temperature";
        const lineKey = pressureTrendModal.lineKey;
        const lineNum = String(lineKey).replace("s", "");
        let liveVal = pressureTrendModal.currentValue;
        if (getMappedValue) {
          const raw = lineKey === "bpv"
            ? getMappedValue(isTemp ? "overview_temp_bpv" : "overview_pressure_bpv", "MONITOR", pressureTrendModal.currentValue)
            : getMappedValue(`overview_${isTemp ? "temp" : "pressure"}_${lineNum}`, "MONITOR", pressureTrendModal.currentValue);
          const num = parseFloat(raw);
          if (!isNaN(num)) {
            liveVal = isTemp ? num.toFixed(1) : num.toFixed(2);
          }
        }
        return (
          <PressureTrendModal
            isOpen={!!pressureTrendModal}
            onClose={() => setPressureTrendModal(null)}
            title={pressureTrendModal.title}
            lineKey={pressureTrendModal.lineKey}
            currentValue={liveVal}
            unit={pressureTrendModal.unit || (pressureTrendModal.type === "temperature" ? "°C" : "Bar")}
            type={pressureTrendModal.type || "pressure"}
            anchorPos={pressureTrendModal.anchorPos}
            cachedTrendData={
              pressureTrendModal?.type === "temperature"
                ? (tempTrendData ? (tempTrendData[pressureTrendModal.lineKey] || tempTrendData.s1) : null)
                : (trendData ? (trendData[pressureTrendModal.lineKey] || trendData.s1) : null)
            }
            onMouseEnter={clearHoverCloseTimer}
            onMouseLeave={() => scheduleHoverClose(250)}
          />
        );
      })()}
    </div >
  );
}

