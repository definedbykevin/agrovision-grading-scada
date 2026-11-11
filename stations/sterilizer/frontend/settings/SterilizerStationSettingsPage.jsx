import React, { useState, Fragment, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx-js-style";
import usePlcStore from "@core/store";
import "./SterilizerStationSettingsModal.css";
import "../SterilizerStationPage.css";
import "../tabs/Recipe/RecipeTab.css";

// ==========================================
// ValBox Component (Memoized outside to prevent unmounting on live data ticks)
// ==========================================
const ValBox = memo(function ValBox({ value, unit, decimals = 1, onClick, style }) {
  const isNum = typeof value === 'number' && !isNaN(value);
  const displayVal = value === null || value === undefined || (typeof value === 'number' && isNaN(value)) ? "-- --" : (isNum ? value.toFixed(decimals) : value);
  return (
    <div className={`som-val-box ${onClick ? 'som-val-box--editable' : ''}`} onClick={onClick} style={style}>
      {displayVal}
      {unit && isNum && <span className="som-val-unit">{unit}</span>}
    </div>
  );
});

// ==========================================
// Default Values for Steps (matching the provided image)
// ==========================================
const defaultRecipesValues = [
  { step: 1, unf: 300, nrm: 300, wet: 450, inl1: false, inl2: false, dinl: false, con: true, rcon: false, dcon: false, exh: true, bar: "0.00", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 2, unf: 1200, nrm: 1200, wet: 1200, inl1: true, inl2: true, dinl: true, con: false, rcon: false, dcon: false, exh: false, bar: "2.20", mode: "HIGH", doorIn: "Close", doorOut: "Close" },
  { step: 3, unf: 300, nrm: 300, wet: 300, inl1: false, inl2: false, dinl: false, con: true, rcon: false, dcon: false, exh: false, bar: "1.00", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 4, unf: 900, nrm: 900, wet: 900, inl1: true, inl2: true, dinl: true, con: false, rcon: false, dcon: false, exh: false, bar: "2.40", mode: "HIGH", doorIn: "Close", doorOut: "Close" },
  { step: 5, unf: 300, nrm: 300, wet: 300, inl1: false, inl2: false, dinl: false, con: true, rcon: false, dcon: false, exh: false, bar: "1.00", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 6, unf: 600, nrm: 600, wet: 600, inl1: true, inl2: true, dinl: true, con: false, rcon: false, dcon: false, exh: false, bar: "2.80", mode: "HIGH", doorIn: "Close", doorOut: "Close" },
  { step: 7, unf: 300, nrm: 300, wet: 300, inl1: true, inl2: true, dinl: true, con: false, rcon: false, dcon: false, exh: false, bar: "2.80", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 8, unf: 30, nrm: 30, wet: 30, inl1: true, inl2: true, dinl: true, con: false, rcon: true, dcon: true, exh: false, bar: "2.60", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 9, unf: 600, nrm: 600, wet: 600, inl1: true, inl2: true, dinl: true, con: false, rcon: false, dcon: false, exh: false, bar: "2.80", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 10, unf: 30, nrm: 30, wet: 30, inl1: true, inl2: false, dinl: false, con: false, rcon: true, dcon: true, exh: false, bar: "2.60", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 11, unf: 600, nrm: 600, wet: 600, inl1: true, inl2: true, dinl: true, con: false, rcon: false, dcon: false, exh: false, bar: "2.80", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 12, unf: 30, nrm: 30, wet: 30, inl1: true, inl2: false, dinl: false, con: false, rcon: true, dcon: true, exh: false, bar: "2.60", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 13, unf: 600, nrm: 900, wet: 1200, inl1: true, inl2: true, dinl: true, con: false, rcon: false, dcon: false, exh: false, bar: "2.80", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 14, unf: 300, nrm: 300, wet: 300, inl1: false, inl2: false, dinl: false, con: true, rcon: true, dcon: true, exh: false, bar: "2.00", mode: "LOW", doorIn: "Close", doorOut: "Close" },
  { step: 15, unf: 300, nrm: 300, wet: 300, inl1: false, inl2: false, dinl: false, con: true, rcon: true, dcon: true, exh: true, bar: "0.01", mode: "OFF", doorIn: "Close", doorOut: "Close" },
  { step: 16, unf: 1200, nrm: 1200, wet: 1200, inl1: false, inl2: false, dinl: false, con: false, rcon: false, dcon: false, exh: false, bar: "", mode: "OFF", doorIn: "Open", doorOut: "Open" }
];

const STEP_FUNCTIONS = [
  "Deaeration",
  "1st Peak Up",
  "1st Peak Down",
  "2nd Peak Up",
  "2nd Peak Down",
  "3rd Peak Up",
  "Holding",
  "1st Intermitten Blow",
  "Holding",
  "2nd Intermitten Blow",
  "Holding",
  "3rd Intermitten Blow",
  "Holding",
  "Blow-down",
  "Exhaust"
];

const defaultBpvSettings = [
  { pressure: 3.20, makeup: "-", surplus: "100" },
  { pressure: 3.10, makeup: "-", surplus: "0" },
  { pressure: 3.00, makeup: "0", surplus: "-" },
  { pressure: 2.90, makeup: "25", surplus: "-" },
  { pressure: 2.80, makeup: "50", surplus: "-" },
  { pressure: 2.70, makeup: "75", surplus: "-" },
  { pressure: 2.60, makeup: "100", surplus: "-" }
];

function SterilizerStationSettingsPage({
  onSelectSubmenu,
  onClose,
  recipes,
  setRecipes,
  handleRecipeChange,
  configMode = false,
  handleEquipmentClick,
  tagMap = {},
  getMappedValue,
}) {
  const getDeveloperStyle = (id, signalKey) => {
    if (!configMode) return {};
    const hasTag = tagMap && tagMap[`${id}__${signalKey}`];
    return {
      outline: hasTag ? "1.5px solid #3b82f6" : "2px solid #ef4444",
      boxShadow: hasTag ? "0 0 6px rgba(59, 130, 246, 0.5)" : "0 0 8px rgba(239, 68, 68, 0.6)",
      backgroundColor: hasTag ? "transparent" : "rgba(239, 68, 68, 0.15)",
      cursor: "pointer",
      position: "relative",
    };
  };
  const [selectedLine, setSelectedLine] = useState(1);
  const [selectedScoreLine, setSelectedScoreLine] = useState(1);
  const [copySourceLine, setCopySourceLine] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [pendingEdits, setPendingEdits] = useState({}); // key: "line_step_field" → numeric edits (bar) committed to DB on Save
  const [pendingScoreEdits, setPendingScoreEdits] = useState({}); // key: row.param → user-edited target value
  const [draftEdits, setDraftEdits] = useState({}); // key: "line_step_field" → valve/mode/door user-toggled but NOT yet saved
  const [selectedCategory, setSelectedCategory] = useState("ripe"); // "ripe" | "unripe" | "overripe"

  // Merge parent recipe state with realistic default settings to populate Unfresh/Wet timers and door override states
  const [localRecipes, setLocalRecipes] = useState(() => {
    const oldFormat = recipes && recipes[1] !== undefined;
    const initialRipe = oldFormat ? recipes : (recipes.ripe || {});
    const initialUnripe = oldFormat ? recipes : (recipes.unripe || {});
    const initialOverripe = oldFormat ? recipes : (recipes.overripe || {});

    const merged = {
      ripe: JSON.parse(JSON.stringify(initialRipe)),
      unripe: JSON.parse(JSON.stringify(initialUnripe)),
      overripe: JSON.parse(JSON.stringify(initialOverripe)),
    };

    const categories = ["ripe", "unripe", "overripe"];
    categories.forEach((cat) => {
      for (let line = 1; line <= 4; line++) {
        if (!merged[cat][line]) merged[cat][line] = [];
        while (merged[cat][line].length < 20) {
          merged[cat][line].push({ step: merged[cat][line].length + 1 });
        }
        for (let i = 0; i < merged[cat][line].length; i++) {
          const def = defaultRecipesValues[i];
          const stepObj = merged[cat][line][i];
          if (stepObj) {
            if (def) {
              if (stepObj.unf === undefined || stepObj.unf === 0) stepObj.unf = def.unf;
              if (stepObj.nrm === undefined || stepObj.nrm === 0) stepObj.nrm = def.nrm;
              if (stepObj.wet === undefined || stepObj.wet === 0) stepObj.wet = def.wet;
              if (stepObj.inl === undefined) stepObj.inl = def.inl;
              if (stepObj.con === undefined) stepObj.con = def.con;
              if (stepObj.exh === undefined) stepObj.exh = def.exh;
              if (stepObj.bar === undefined || stepObj.bar === "0.0") stepObj.bar = def.bar;
              if (stepObj.mode === undefined || stepObj.mode === "OFF") stepObj.mode = def.mode;
              if (stepObj.doorIn === undefined) stepObj.doorIn = def.doorIn;
              if (stepObj.doorOut === undefined) stepObj.doorOut = def.doorOut;
            } else {
              if (stepObj.unf === undefined) stepObj.unf = 0;
              if (stepObj.nrm === undefined) stepObj.nrm = 0;
              if (stepObj.wet === undefined) stepObj.wet = 0;
              if (stepObj.inl === undefined) stepObj.inl = false;
              if (stepObj.con === undefined) stepObj.con = false;
              if (stepObj.exh === undefined) stepObj.exh = false;
              if (stepObj.bar === undefined) stepObj.bar = "0.0";
              if (stepObj.mode === undefined) stepObj.mode = "OFF";
              if (stepObj.doorIn === undefined) stepObj.doorIn = "Close";
              if (stepObj.doorOut === undefined) stepObj.doorOut = "Close";
            }
          }
        }
      }
    });
    return merged;
  });

  // Card 2 State: Design Capacity & Scoring
  const [designCapacity, setDesignCapacity] = useState(50);
  const [numberSterilizer, setNumberSterilizer] = useState(2); // Match spreadsheet default
  const [millDesignCapacity, setMillDesignCapacity] = useState(45.0);
  const [actualThroughput, setActualThroughput] = useState(48.32);
  const [sterilScore, setSterilScore] = useState(89);
  const [leadTimeScore, setLeadTimeScore] = useState(133);
  const [throughputScore, setThroughputScore] = useState(107);
  const [overLimitTime, setOverLimitTime] = useState(300);
  const [overLimitScore, setOverLimitScore] = useState(300);

  const [scoreLogics, setScoreLogics] = useState([
    { step: 1, function: "Deaeration", target: 100, actual: 90, unit: "°C", decimals: 0, param: "deaeration_temp" },
    { step: 2, function: "1st Peak Up", target: 2.50, actual: 2.00, unit: "bar", decimals: 2, param: "peak1_press" },
    { step: 4, function: "2nd Peak Up", target: 2.50, actual: 2.30, unit: "bar", decimals: 2, param: "peak2_press" },
    { step: 6, function: "3rd Peak Up", target: 2.80, actual: 2.40, unit: "bar", decimals: 2, param: "peak3_press" },
    { step: 7, function: "Holding", target: 2.80, actual: 2.70, unit: "bar", decimals: 2, param: "holding_press" },
    { step: 8, function: "1st Intermitten Blow", target: 140, actual: 138, unit: "°C", decimals: 0, param: "blow1_temp" },
    { step: 9, function: "Holding", target: 2.80, actual: 2.65, unit: "bar", decimals: 2, param: "holding2_press" },
    { step: 10, function: "2nd Intermitten Blow", target: 140, actual: 139, unit: "°C", decimals: 0, param: "blow2_temp" },
    { step: 11, function: "Holding", target: 2.80, actual: 2.50, unit: "bar", decimals: 2, param: "holding3_press" },
    { step: 12, function: "3rd Intermitten Blow", target: 140, actual: 140, unit: "°C", decimals: 0, param: "blow3_temp" },
    { step: 13, function: "Holding", target: 2.80, actual: 2.80, unit: "bar", decimals: 2, param: "holding4_press" },
    { step: 14, function: "Blow-down", target: 120, actual: 150, unit: "s", decimals: 0, param: "blowdown_time" },
    { step: 15, function: "Exhaust", target: 180, actual: 265, unit: "s", decimals: 0, param: "exhaust_time" },
    { step: "FFB", function: "FFB loading in/out", target: 1200, actual: 900, unit: "s", decimals: 0, param: "ffb_loading" },
    { step: "T_Ster", function: "Target Sterilization Time", target: 6690, actual: 6550, unit: "s", decimals: 0, param: "target_ster_time" },
    { step: "T_Cyc", function: "Target Cycle Time", target: 7890, actual: 7450, unit: "s", decimals: 0, param: "target_cyc_time" },
    { step: "Tput", function: "Throughput", target: 22.81, actual: 24.16, unit: "mt/hr", decimals: 2, param: "throughput_rate" }
  ]);

  const calculateScore = (target, actual, stepKey) => {
    if (target === "No Tag" || target === "--" || actual === "No Tag" || actual === "--") return "-";
    const t = Number(target);
    const a = Number(actual);
    if (isNaN(t) || isNaN(a)) return "-";
    if (t === 0 && a === 0) return 100;
    if (t <= 0 || a <= 0) return 0;
    if (stepKey === 12 || stepKey === 13) {
      const val = (1 - (a - t) / t) * 100;
      return Math.max(0, Math.min(100, Math.round(val)));
    }
    if (stepKey === "FFB" || stepKey === "T_Ster" || stepKey === "T_Cyc") {
      return Math.round((t / a) * 100);
    }
    if (a > t) return 100;
    return Math.round((a / t) * 100);
  };

  // Card 3 State: Control Logics
  const [safetyDoor, setSafetyDoor] = useState(0.03);
  const [autoBlowdown, setAutoBlowdown] = useState(2.75);
  const [holdingPressure, setHoldingPressure] = useState(2.70);
  const [startToStepCycle, setStartToStepCycle] = useState(7);
  const [safetyPressure, setSafetyPressure] = useState(2.80);

  const [sequencingOnStep, setSequencingOnStep] = useState(1);
  const [sequencingStopStep, setSequencingStopStep] = useState(13);

  const [tempHoldingStepStart, setTempHoldingStepStart] = useState(7);
  const [tempHoldingStepStop, setTempHoldingStepStop] = useState(11);
  const [tempIdle, setTempIdle] = useState(140.0);
  const [tempLow, setTempLow] = useState(138.0);
  const [timeOpenCon, setTimeOpenCon] = useState(3);
  const [timeCloseCon, setTimeCloseCon] = useState(10);
  const [highTemp, setHighTemp] = useState(140.0);

  const [mainSteam, setMainSteam] = useState(18.0);

  const [bpvSettings, setBpvSettings] = useState(defaultBpvSettings);
  const [bpvMakeupHigh, setBpvMakeupHigh] = useState(3.00);
  const [bpvMakeupLow, setBpvMakeupLow] = useState(2.50);
  const [bpvMakeupPosition, setBpvMakeupPosition] = useState(100);
  const [bpvMakeupLimitHigh, setBpvMakeupLimitHigh] = useState(80);
  const [bpvMakeupLimitLow, setBpvMakeupLimitLow] = useState(0);

  const [bpvSurplusHigh, setBpvSurplusHigh] = useState(3.30);
  const [bpvSurplusLow, setBpvSurplusLow] = useState(3.10);
  const [bpvSurplusPosition, setBpvSurplusPosition] = useState(0);
  const [bpvSurplusLimitHigh, setBpvSurplusLimitHigh] = useState(50);
  const [bpvSurplusLimitLow, setBpvSurplusLimitLow] = useState(0);
  const [initialVals, setInitialVals] = useState({});
  const tags = usePlcStore((state) => state.tags);
  const scoreLogicsRef = useRef([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [initialRecipes, setInitialRecipes] = useState(null);
  const [initialScoreLogics, setInitialScoreLogics] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem("kip_token");
        const res = await fetch("/api/sterilizer/settings/recipes-and-params", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          const { recipes: dbRecipes, parameters: dbParams } = json.data;

          // Apply mappedValues from PLC tags to recipes (run even if recipe_settings DB is empty)
          const mappedValues = json.data.mappedValues || [];
          const getMapVal = (eq, sig) => {
            const row = mappedValues.find(m => m.equipment === eq && m.signal_key === sig);
            return row ? row.value : undefined;
          };

          if (dbRecipes) {
            // Load from DB only — live PLC values are shown in real-time via getLiveRecipeVal() at render time
            setLocalRecipes(dbRecipes);
            setInitialRecipes(JSON.parse(JSON.stringify(dbRecipes)));
          } else if (mappedValues.length > 0) {
            // recipe_settings DB is empty, but we still have PLC mappings — apply them to localRecipes
            // Compute the updated recipes explicitly so we can set initialRecipes to the same snapshot
            setLocalRecipes(prev => {
              const next = JSON.parse(JSON.stringify(prev));
              ["ripe", "unripe", "overripe"].forEach(cat => {
                for (let line = 1; line <= 4; line++) {
                  if (!next[cat] || !next[cat][line]) continue;
                  next[cat][line] = next[cat][line].map(stepObj => {
                    const stepNum = stepObj.step;
                    const checkMap = (eq, sig) => {
                      const val = getMapVal(eq, sig);
                      return val !== undefined ? val : null;
                    };
                    const barVal = checkMap(`recipe_line_${line}_step_${stepNum}_press`, "SETPOINT");
                    const nrmVal = checkMap(`recipe_line_${line}_step_${stepNum}_nrm`, "DURATION");
                    const unfVal = checkMap(`recipe_line_${line}_step_${stepNum}_unf`, "DURATION");
                    const wetVal = checkMap(`recipe_line_${line}_step_${stepNum}_wet`, "DURATION");
                    const updated = { ...stepObj };
                    if (barVal !== null) updated.bar = Number(barVal);
                    if (nrmVal !== null) updated.nrm = Number(nrmVal);
                    if (unfVal !== null) updated.unf = Number(unfVal);
                    if (wetVal !== null) updated.wet = Number(wetVal);

                    const valveFields = [
                      { field: "inl1", eq: `recipe_line_${line}_step_${stepNum}_inl1` },
                      { field: "inl2", eq: `recipe_line_${line}_step_${stepNum}_inl2` },
                      { field: "dinl", eq: `recipe_line_${line}_step_${stepNum}_dinl` },
                      { field: "con", eq: `recipe_line_${line}_step_${stepNum}_con` },
                      { field: "rcon", eq: `recipe_line_${line}_step_${stepNum}_rcon` },
                      { field: "dcon", eq: `recipe_line_${line}_step_${stepNum}_dcon` },
                      { field: "exh", eq: `recipe_line_${line}_step_${stepNum}_exh` },
                    ];
                    valveFields.forEach(({ field, eq: veq }) => {
                      const rawVal = checkMap(veq, "VALVE");
                      if (rawVal !== null) {
                        let boolVal = Number(rawVal) > 0;
                        if (field === "exh" && Number(stepNum) === 13) {
                          boolVal = !boolVal;
                        }
                        updated[field] = boolVal;
                      }
                    });

                    const modeRaw = checkMap(`recipe_line_${line}_step_${stepNum}_mode`, "VALVE_MODE");
                    if (modeRaw !== null) {
                      const modeNum = Number(modeRaw);
                      if (modeNum === 1 || String(modeRaw).toUpperCase() === "HIGH" || String(modeRaw).toUpperCase() === "ABOVE") updated.mode = "HIGH";
                      else if (modeNum === 2 || String(modeRaw).toUpperCase() === "LOW" || String(modeRaw).toUpperCase() === "BELOW") updated.mode = "LOW";
                      else updated.mode = "OFF";
                    }
                    return updated;
                  });
                }
              });
              // Also update initialRecipes to the same snapshot so real-time sync guard works
              setInitialRecipes(JSON.parse(JSON.stringify(next)));
              return next;
            });
          }

          if (dbParams) {
            const mappedValues = json.data.mappedValues || [];
            const getMapVal = (eq, sig) => {
              const row = mappedValues.find(m => m.equipment === eq && m.signal_key === sig);
              if (!row || row.value === null || row.value === undefined || row.value === "No Tag" || row.value === "--") return undefined;
              const n = Number(row.value);
              return !isNaN(n) ? n : undefined;
            };

            const tempInit = {};

            const initParam = (dbKey, eq, sig, setter) => {
              let finalVal = dbParams[dbKey];
              if (finalVal === undefined || finalVal === null || finalVal === "null" || finalVal === "NaN" || finalVal === "") {
                const liveVal = getMapVal(eq, sig);
                finalVal = liveVal !== undefined ? liveVal : null;
              } else {
                const parsed = Number(finalVal);
                finalVal = !isNaN(parsed) ? parsed : null;
              }
              setter(finalVal);
              tempInit[dbKey] = finalVal;
            };

            initParam("designCapacity", "settings_capacity_design_capacity", "DESIGN_CAPACITY", setDesignCapacity);
            initParam("numberSterilizer", "settings_capacity_number_sterilizer", "NUMBER_STERILIZER", setNumberSterilizer);
            initParam("millDesignCapacity", "settings_capacity_mill_design_capacity", "MILL_DESIGN_CAPACITY", setMillDesignCapacity);
            initParam("actualThroughput", "settings_capacity_actual_throughput", "ACTUAL_THROUGHPUT", setActualThroughput);
            initParam("sterilScore", "settings_score_perf_steril", "SCORE", setSterilScore);
            initParam("leadTimeScore", "settings_score_perf_lead_time", "SCORE", setLeadTimeScore);
            initParam("throughputScore", "settings_score_perf_throughput", "SCORE", setThroughputScore);
            initParam("overLimitTime", "settings_tolerance_over_limit_time", "TIME", setOverLimitTime);
            initParam("overLimitScore", "settings_tolerance_over_limit_score", "SCORE", setOverLimitScore);
            initParam("safetyDoor", "settings_logic_safety_door", "SETPOINT", setSafetyDoor);
            initParam("autoBlowdown", "settings_logic_auto_blowdown", "SETPOINT", setAutoBlowdown);
            initParam("holdingPressure", "settings_logic_holding_pressure", "SETPOINT", setHoldingPressure);
            initParam("startToStepCycle", "settings_logic_start_to_step_cycle", "STEP", setStartToStepCycle);
            initParam("safetyPressure", "settings_logic_safety_pressure", "SETPOINT", setSafetyPressure);

            initParam("sequencingOnStep", "settings_logic_sequencing_on_step", "STEP", setSequencingOnStep);
            initParam("sequencingStopStep", "settings_logic_sequencing_stop_step", "STEP", setSequencingStopStep);

            initParam("tempHoldingStepStart", "settings_logic_temp_holding_step_start", "STEP", setTempHoldingStepStart);
            initParam("tempHoldingStepStop", "settings_logic_temp_holding_step_stop", "STEP", setTempHoldingStepStop);
            initParam("tempIdle", "settings_logic_temp_idle", "SETPOINT", setTempIdle);
            initParam("tempLow", "settings_logic_temp_low", "SETPOINT", setTempLow);
            initParam("timeOpenCon", "settings_logic_time_open_con", "TIME", setTimeOpenCon);
            initParam("timeCloseCon", "settings_logic_time_close_con", "TIME", setTimeCloseCon);
            initParam("highTemp", "settings_logic_high_temp", "SETPOINT", setHighTemp);

            initParam("mainSteam", "settings_logic_main_steam", "SETPOINT", setMainSteam);

            initParam("bpvMakeupHigh", "settings_bpv_makeup_high", "SETPOINT", setBpvMakeupHigh);
            initParam("bpvMakeupLow", "settings_bpv_makeup_low", "SETPOINT", setBpvMakeupLow);
            initParam("bpvMakeupPosition", "settings_bpv_makeup_position", "POSITION", setBpvMakeupPosition);
            initParam("bpvMakeupLimitHigh", "settings_bpv_makeup_limit_high", "SETPOINT", setBpvMakeupLimitHigh);
            initParam("bpvMakeupLimitLow", "settings_bpv_makeup_limit_low", "SETPOINT", setBpvMakeupLimitLow);

            initParam("bpvSurplusHigh", "settings_bpv_surplus_high", "SETPOINT", setBpvSurplusHigh);
            initParam("bpvSurplusLow", "settings_bpv_surplus_low", "SETPOINT", setBpvSurplusLow);
            initParam("bpvSurplusPosition", "settings_bpv_surplus_position", "POSITION", setBpvSurplusPosition);
            initParam("bpvSurplusLimitHigh", "settings_bpv_surplus_limit_high", "SETPOINT", setBpvSurplusLimitHigh);
            initParam("bpvSurplusLimitLow", "settings_bpv_surplus_limit_low", "SETPOINT", setBpvSurplusLimitLow);

            setInitialVals(tempInit);

            if (dbParams.scoreLogics !== undefined) {
              const logics = [...dbParams.scoreLogics];
              logics.forEach(row => {
                // TARGET: read from DB only (user sets this, writes to PLC)
                // Do NOT override with PLC tag value — PLC may lag behind the saved value.

                // ACTUAL: read from PLC only (PLC feeds this back, read-only)
                const liveAct = getMapVal(`settings_score_logic_${row.param}_actual`, "ACTUAL");
                if (liveAct !== undefined) {
                  row.actual = liveAct;
                }
              });
              setScoreLogics(logics);
              setInitialScoreLogics(JSON.parse(JSON.stringify(logics)));
            }
            if (dbParams.bpvSettings !== undefined) {
              const bSettings = [...dbParams.bpvSettings];
              bSettings.forEach((row, i) => {
                const checkMap = (eq, sig) => {
                  const val = getMapVal(eq, sig);
                  return val !== undefined ? val : null;
                };
                row.pressure = checkMap(`settings_bpv_settings_row_${i}_pressure`, "PRESSURE");
                row.makeup = checkMap(`settings_bpv_settings_row_${i}_makeup`, "VALVE");
                row.surplus = checkMap(`settings_bpv_settings_row_${i}_surplus`, "VALVE");
              });
              setBpvSettings(bSettings);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load settings from DB:", err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const token = localStorage.getItem("kip_token");
        const res = await fetch("/api/sterilizer/plc-config/tags", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) setAvailableTags(data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch PLC tags", err);
      }
    };
    fetchAvailableTags();
  }, []);

  useEffect(() => {
    if (!availableTags.length) return;

    const getMapLiveVal = (eq, sig) => {
      if (getMappedValue) {
        const val = getMappedValue(eq, sig);
        if (val !== "No Tag" && val !== "--" && val !== undefined && val !== null) {
          return val;
        }
      }
      const key = `${eq}__${sig}`;
      const tagId = tagMap[key];
      if (!tagId) return undefined;
      const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
      if (!tagObj) return undefined;
      const live = tags[tagObj.tag_name];
      const result = live !== undefined ? Number(live.value) : undefined;
      return result;
    };

    // 1. Sync single parameters
    const paramsList = [
      { key: "designCapacity", eq: "settings_capacity_design_capacity", sig: "DESIGN_CAPACITY", val: designCapacity, set: setDesignCapacity },
      { key: "numberSterilizer", eq: "settings_capacity_number_sterilizer", sig: "NUMBER_STERILIZER", val: numberSterilizer, set: setNumberSterilizer },
      { key: "millDesignCapacity", eq: "settings_capacity_mill_design_capacity", sig: "MILL_DESIGN_CAPACITY", val: millDesignCapacity, set: setMillDesignCapacity },
      { key: "actualThroughput", eq: "settings_capacity_actual_throughput", sig: "ACTUAL_THROUGHPUT", val: actualThroughput, set: setActualThroughput },
      { key: "sterilScore", eq: "settings_score_perf_steril", sig: "SCORE", val: sterilScore, set: setSterilScore },
      { key: "leadTimeScore", eq: "settings_score_perf_lead_time", sig: "SCORE", val: leadTimeScore, set: setLeadTimeScore },
      { key: "throughputScore", eq: "settings_score_perf_throughput", sig: "SCORE", val: throughputScore, set: setThroughputScore },
      { key: "overLimitTime", eq: "settings_tolerance_over_limit_time", sig: "TIME", val: overLimitTime, set: setOverLimitTime },
      { key: "safetyDoor", eq: "settings_logic_safety_door", sig: "SETPOINT", val: safetyDoor, set: setSafetyDoor },
      { key: "autoBlowdown", eq: "settings_logic_auto_blowdown", sig: "SETPOINT", val: autoBlowdown, set: setAutoBlowdown },
      { key: "holdingPressure", eq: "settings_logic_holding_pressure", sig: "SETPOINT", val: holdingPressure, set: setHoldingPressure },
      { key: "startToStepCycle", eq: "settings_logic_start_to_step_cycle", sig: "STEP", val: startToStepCycle, set: setStartToStepCycle },
      { key: "safetyPressure", eq: "settings_logic_safety_pressure", sig: "SETPOINT", val: safetyPressure, set: setSafetyPressure },
      { key: "sequencingOnStep", eq: "settings_logic_sequencing_on_step", sig: "STEP", val: sequencingOnStep, set: setSequencingOnStep },
      { key: "sequencingStopStep", eq: "settings_logic_sequencing_stop_step", sig: "STEP", val: sequencingStopStep, set: setSequencingStopStep },
      { key: "tempHoldingStepStart", eq: "settings_logic_temp_holding_step_start", sig: "STEP", val: tempHoldingStepStart, set: setTempHoldingStepStart },
      { key: "tempHoldingStepStop", eq: "settings_logic_temp_holding_step_stop", sig: "STEP", val: tempHoldingStepStop, set: setTempHoldingStepStop },
      { key: "tempIdle", eq: "settings_logic_temp_idle", sig: "SETPOINT", val: tempIdle, set: setTempIdle },
      { key: "tempLow", eq: "settings_logic_temp_low", sig: "SETPOINT", val: tempLow, set: setTempLow },
      { key: "timeOpenCon", eq: "settings_logic_time_open_con", sig: "TIME", val: timeOpenCon, set: setTimeOpenCon },
      { key: "timeCloseCon", eq: "settings_logic_time_close_con", sig: "TIME", val: timeCloseCon, set: setTimeCloseCon },
      { key: "highTemp", eq: "settings_logic_high_temp", sig: "SETPOINT", val: highTemp, set: setHighTemp },
      { key: "mainSteam", eq: "settings_logic_main_steam", sig: "SETPOINT", val: mainSteam, set: setMainSteam },
      { key: "bpvMakeupHigh", eq: "settings_bpv_makeup_high", sig: "SETPOINT", val: bpvMakeupHigh, set: setBpvMakeupHigh },
      { key: "bpvMakeupLow", eq: "settings_bpv_makeup_low", sig: "SETPOINT", val: bpvMakeupLow, set: setBpvMakeupLow },
      { key: "bpvMakeupPosition", eq: "settings_bpv_makeup_position", sig: "POSITION", val: bpvMakeupPosition, set: setBpvMakeupPosition },
      { key: "bpvMakeupLimitHigh", eq: "settings_bpv_makeup_limit_high", sig: "SETPOINT", val: bpvMakeupLimitHigh, set: setBpvMakeupLimitHigh },
      { key: "bpvMakeupLimitLow", eq: "settings_bpv_makeup_limit_low", sig: "SETPOINT", val: bpvMakeupLimitLow, set: setBpvMakeupLimitLow },
      { key: "bpvSurplusHigh", eq: "settings_bpv_surplus_high", sig: "SETPOINT", val: bpvSurplusHigh, set: setBpvSurplusHigh },
      { key: "bpvSurplusLow", eq: "settings_bpv_surplus_low", sig: "SETPOINT", val: bpvSurplusLow, set: setBpvSurplusLow },
      { key: "bpvSurplusPosition", eq: "settings_bpv_surplus_position", sig: "POSITION", val: bpvSurplusPosition, set: setBpvSurplusPosition },
      { key: "bpvSurplusLimitHigh", eq: "settings_bpv_surplus_limit_high", sig: "SETPOINT", val: bpvSurplusLimitHigh, set: setBpvSurplusLimitHigh },
      { key: "bpvSurplusLimitLow", eq: "settings_bpv_surplus_limit_low", sig: "SETPOINT", val: bpvSurplusLimitLow, set: setBpvSurplusLimitLow },
    ];

    let initialValsUpdated = false;
    const nextInitVals = { ...initialVals };

    paramsList.forEach(({ key, eq, sig, val, set }) => {
      const liveVal = getMapLiveVal(eq, sig);
      if (liveVal !== undefined && liveVal !== null) {
        if (val === initialVals[key]) {
          if (val !== liveVal) {
            set(liveVal);
            nextInitVals[key] = liveVal;
            initialValsUpdated = true;
          }
        }
      }
    });

    if (initialValsUpdated) {
      setInitialVals(nextInitVals);
    }

    // 2. Sync recipes — always run even if initialRecipes is null (PLC drives the values)
    let recipesChanged = false;
    const nextRecipes = { ...localRecipes };
    const nextInitRecipes = initialRecipes ? JSON.parse(JSON.stringify(initialRecipes)) : JSON.parse(JSON.stringify(localRecipes));

    ["ripe", "unripe", "overripe"].forEach((cat) => {
      if (!nextRecipes[cat]) return;
      for (let line = 1; line <= 4; line++) {
        if (!nextRecipes[cat][line]) continue;
        nextRecipes[cat][line] = nextRecipes[cat][line].map((stepObj) => {
          const stepNum = stepObj.step;
          const checkAndSync = (eq, sig, currentVal, field) => {
            const live = getMapLiveVal(eq, sig);
            if (live !== undefined && live !== null) {
              // Always update from PLC live value when a tag is mapped
              let isDifferent = false;
              if (field === "bar") {
                isDifferent = parseFloat(currentVal) !== parseFloat(live);
              } else if (field === "nrm" || field === "unf" || field === "wet") {
                isDifferent = parseInt(currentVal) !== parseInt(live);
              } else {
                isDifferent = currentVal !== live;
              }
              if (isDifferent) {
                recipesChanged = true;
                const nextInitStep = nextInitRecipes?.[cat]?.[line]?.find((s) => s.step === stepNum);
                if (nextInitStep) nextInitStep[field] = live;
                return live;
              }
            }
            return currentVal;
          };

          // NOTE: bar (pressure) is NOT synced here — it is displayed real-time via getLiveRecipeVal()
          // at render time. localRecipes.bar holds the DB/user-intended value for SAVE only.
          const bar = stepObj.bar;
          const nrm = checkAndSync(`recipe_line_${line}_step_${stepNum}_nrm`, "DURATION", stepObj.nrm, "nrm");
          const unf = checkAndSync(`recipe_line_${line}_step_${stepNum}_unf`, "DURATION", stepObj.unf, "unf");
          const wet = checkAndSync(`recipe_line_${line}_step_${stepNum}_wet`, "DURATION", stepObj.wet, "wet");

          // Sync valve fields: tag 0 = CLOSE (false), tag >= 1 = OPEN (true), or "OPEN"/"CLOSE"
          const syncValve = (eq, sig, currentVal, field) => {
            // Guard: if user has a draft or pending edit for this valve on this line/step, do NOT overwrite it
            const pendingKey = `${line}_${stepNum}_${field}`;
            if (draftEdits[pendingKey] !== undefined || pendingEdits[pendingKey] !== undefined) {
              return currentVal;
            }

            const live = getMapLiveVal(eq, sig);
            if (live !== undefined && live !== null) {
              let liveBool = live === true || live === "true" || live === 1 || live === "1" || live === "OPEN";
              if (field === "exh" && Number(stepNum) === 13) {
                liveBool = !liveBool;
              }
              const initStep = initialRecipes?.[cat]?.[line]?.find((s) => s.step === stepNum);
              const initVal = initStep ? initStep[field] : null;
              if (currentVal === initVal && currentVal !== liveBool) {
                recipesChanged = true;
                const nextInitStep = nextInitRecipes?.[cat]?.[line]?.find((s) => s.step === stepNum);
                if (nextInitStep) nextInitStep[field] = liveBool;
                return liveBool;
              }
            }
            return currentVal;
          };

          const inl1 = syncValve(`recipe_line_${line}_step_${stepNum}_inl1`, "VALVE", stepObj.inl1, "inl1");
          const inl2 = syncValve(`recipe_line_${line}_step_${stepNum}_inl2`, "VALVE", stepObj.inl2, "inl2");
          const dinl = syncValve(`recipe_line_${line}_step_${stepNum}_dinl`, "VALVE", stepObj.dinl, "dinl");
          const con = syncValve(`recipe_line_${line}_step_${stepNum}_con`, "VALVE", stepObj.con, "con");
          const rcon = syncValve(`recipe_line_${line}_step_${stepNum}_rcon`, "VALVE", stepObj.rcon, "rcon");
          const dcon = syncValve(`recipe_line_${line}_step_${stepNum}_dcon`, "VALVE", stepObj.dcon, "dcon");
          const exh = syncValve(`recipe_line_${line}_step_${stepNum}_exh`, "VALVE", stepObj.exh, "exh");

          // Sync mode / Jumper field: tag 0=OFF, 1=Below, 2=Above, or matching string names
          const syncMode = (eq, sig, currentVal, field) => {
            const pendingKey = `${line}_${stepNum}_${field}`;
            if (draftEdits[pendingKey] !== undefined || pendingEdits[pendingKey] !== undefined) {
              return currentVal;
            }

            const live = getMapLiveVal(eq, sig);
            if (live !== undefined && live !== null) {
              let liveMode = "OFF";
              if (live === 1 || live === "1" || String(live).toUpperCase() === "HIGH" || String(live).toUpperCase() === "ABOVE") liveMode = "HIGH";
              else if (live === 2 || live === "2" || String(live).toUpperCase() === "LOW" || String(live).toUpperCase() === "BELOW") liveMode = "LOW";
              const initStep = initialRecipes?.[cat]?.[line]?.find((s) => s.step === stepNum);
              const initVal = initStep ? initStep[field] : null;
              if (currentVal === initVal && currentVal !== liveMode) {
                recipesChanged = true;
                const nextInitStep = nextInitRecipes?.[cat]?.[line]?.find((s) => s.step === stepNum);
                if (nextInitStep) nextInitStep[field] = liveMode;
                return liveMode;
              }
            }
            return currentVal;
          };

          const mode = syncMode(`recipe_line_${line}_step_${stepNum}_mode`, "VALVE_MODE", stepObj.mode, "mode");

          const syncDoor = (eq, sig, currentVal, field) => {
            const pendingKey = `${line}_${stepNum}_${field}`;
            if (draftEdits[pendingKey] !== undefined || pendingEdits[pendingKey] !== undefined) {
              return currentVal;
            }

            const live = getMapLiveVal(eq, sig);
            if (live !== undefined && live !== null) {
              const liveBool = live === true || live === "true" || live === 1 || live === "1" || live === "OPEN" || String(live).toUpperCase() === "OPEN";
              const liveStr = liveBool ? "Open" : "Close";
              const initStep = initialRecipes?.[cat]?.[line]?.find((s) => s.step === stepNum);
              const initVal = initStep ? initStep[field] : null;
              if (currentVal === initVal && currentVal !== liveStr) {
                recipesChanged = true;
                const nextInitStep = nextInitRecipes?.[cat]?.[line]?.find((s) => s.step === stepNum);
                if (nextInitStep) nextInitStep[field] = liveStr;
                return liveStr;
              }
            }
            return currentVal;
          };

          const doorIn = syncDoor(`recipe_line_${line}_step_${stepNum}_doorIn`, "VALVE", stepObj.doorIn, "doorIn");
          const doorOut = syncDoor(`recipe_line_${line}_step_${stepNum}_doorOut`, "VALVE", stepObj.doorOut, "doorOut");

          return { ...stepObj, bar, nrm, unf, wet, inl1, inl2, dinl, con, rcon, dcon, exh, mode, doorIn, doorOut };
        });
      }
    });

    if (recipesChanged) {
      setLocalRecipes(nextRecipes);
      setInitialRecipes(nextInitRecipes);
    }

  }, [tags, availableTags, tagMap, initialVals, localRecipes, initialRecipes, getMappedValue, pendingEdits, draftEdits]);

  // ─── Dedicated live sync for scoreLogics ACTUAL (read-only from PLC) ───
  useEffect(() => {
    scoreLogicsRef.current = scoreLogics;
  });

  useEffect(() => {
    const currentLogics = scoreLogicsRef.current;
    if (!currentLogics || currentLogics.length === 0) return;

    const resolvePlcVal = (eq, sig) => {
      if (getMappedValue) {
        const val = getMappedValue(eq, sig);
        if (val === "No Tag" || val === "--") return val;
        if (val !== "No Tag" && val !== "--" && val !== undefined && val !== null) {
          const num = Number(val);
          if (!isNaN(num)) return num;
        }
      }
      const key = `${eq}__${sig}`;
      const tagId = tagMap?.[key];
      if (tagId && availableTags?.length) {
        const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
        if (tagObj && tags?.[tagObj.tag_name]?.value !== undefined && tags[tagObj.tag_name]?.value !== null) {
          const num = Number(tags[tagObj.tag_name].value);
          if (!isNaN(num)) return num;
        }
        if (tagObj) return "--";
      }
      return "No Tag";
    };

    let changed = false;
    const next = currentLogics.map((row) => {
      let newActual = row.actual;

      // Sync ACTUAL from PLC (if mapped)
      const liveActual = resolvePlcVal(`settings_score_logic_${row.param}_actual`, "ACTUAL");
      if (liveActual !== null && liveActual !== "No Tag" && liveActual !== row.actual) {
        newActual = liveActual;
        changed = true;
      }

      if (newActual !== row.actual) {
        return { ...row, actual: newActual };
      }
      return row;
    });

    if (changed) {
      setScoreLogics(next);
    }
  }, [tags, tagMap, availableTags, getMappedValue]);

  // Handlers
  const handleBackToOverview = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (onSelectSubmenu) {
      onSelectSubmenu("Sterilizer Station", "Station View");
    }
  };

  const handleCopySettings = () => {
    if (copySourceLine === selectedLine) return;
    setLocalRecipes((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const categories = ["ripe", "unripe", "overripe"];
      categories.forEach((cat) => {
        if (!next[cat]) next[cat] = {};
        if (next[cat][copySourceLine]) {
          next[cat][selectedLine] = JSON.parse(JSON.stringify(next[cat][copySourceLine]));
        }
      });
      return next;
    });
    alert(`Recipe configurations for Ripe, Unripe, and Overripe copied from Line ${copySourceLine} to Line ${selectedLine}!`);
  };
  const updateStepField = (idx, field, val) => {
    const step = localRecipes[selectedCategory]?.[selectedLine]?.[idx];
    const stepNum = step?.step ?? (idx + 1);
    // Store pending edit so display shows user's value (not live PLC) before SAVE
    if (field === 'bar' || field === 'nrm' || field === 'unf' || field === 'wet') {
      const pendingKey = `${selectedLine}_${stepNum}_${field}`;
      setPendingEdits((prev) => ({ ...prev, [pendingKey]: Number(val) }));
    }
    setLocalRecipes((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[selectedCategory]) next[selectedCategory] = {};
      if (!next[selectedCategory][selectedLine]) next[selectedCategory][selectedLine] = [];
      next[selectedCategory][selectedLine][idx][field] = val;
      return next;
    });

    if (field === 'doorIn' || field === 'doorOut' || field === 'mode') {
      const equipmentKey = `recipe_line_${selectedLine}_step_${stepNum}_${field}`;
      const signalKey = "VALVE_MODE";
      const key = `${equipmentKey}__${signalKey}`;
      const tagId = tagMap[key];
      if (tagId) {
        let sendVal = val;
        if (val === "Open") sendVal = 1;
        else if (val === "Close") sendVal = 0;
        else if (val === "OFF") sendVal = 0;
        else if (val === "HIGH" || val === "Above" || val === 1 || val === "1") sendVal = 1;
        else if (val === "LOW" || val === "Below" || val === 2 || val === "2") sendVal = 2;
        usePlcStore.getState().sendCommand(tagId, sendVal, key, "sterilizer");
      }
    }
  };
  const cycleModeField = (idx) => {
    const step = localRecipes[selectedCategory]?.[selectedLine]?.[idx];
    const stepNum = step?.step ?? (idx + 1);

    const currentLive = getLiveRecipeVal(selectedLine, stepNum, "mode");
    const currentValue = currentLive !== null ? currentLive : (step?.mode || "OFF");

    let nextValue;
    if (currentValue === "OFF" || currentValue === 0 || currentValue === "0") nextValue = "HIGH";
    else if (currentValue === "HIGH" || currentValue === "Above" || currentValue === 1 || currentValue === "1") nextValue = "LOW";
    else nextValue = "OFF";

    // Write to draftEdits (visual preview only — NOT saved until Save is clicked)
    const draftKey = `${selectedLine}_${stepNum}_mode`;
    setDraftEdits((prev) => ({ ...prev, [draftKey]: nextValue }));
  };

  const cycleDoorField = (idx, field) => {
    const step = localRecipes[selectedCategory]?.[selectedLine]?.[idx];
    const stepNum = step?.step ?? (idx + 1);

    const currentLive = getLiveRecipeVal(selectedLine, stepNum, field);
    const currentValue = currentLive !== null ? currentLive : (step?.[field] || "Close");

    const nextValue = currentValue === "Close" ? "Open" : "Close";

    // Write to draftEdits (visual preview only — NOT saved until Save is clicked)
    const draftKey = `${selectedLine}_${stepNum}_${field}`;
    setDraftEdits((prev) => ({ ...prev, [draftKey]: nextValue }));
  };

  const toggleField = (idx, field) => {
    const step = localRecipes[selectedCategory]?.[selectedLine]?.[idx];
    const stepNum = step?.step ?? (idx + 1);

    // Fetch the current displayed value (live PLC or draft edit) and toggle it
    const currentLive = getLiveRecipeVal(selectedLine, stepNum, field);
    const currentValue = currentLive !== null ? currentLive : !!(step?.[field]);
    const toggledValue = !currentValue;

    // Write to draftEdits (visual preview only — NOT sent to PLC or DB until Save is clicked)
    const draftKey = `${selectedLine}_${stepNum}_${field}`;
    setDraftEdits((prev) => ({ ...prev, [draftKey]: toggledValue }));
  };

  const updateBpvRow = (idx, field, val) => {
    setBpvSettings((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleKeypadConfirm = (val) => {
    if (!activeKeypad) return;
    const kp = activeKeypad;

    if (kp.section === 'recipe') {
      updateStepField(kp.stepIdx, kp.param, val);
    } else if (kp.section === 'scoreLogic') {
      const newVal = Number(val);
      const row = scoreLogics[kp.idx];
      if (row) {
        setPendingScoreEdits((prev) => ({ ...prev, [row.param]: newVal }));
        setScoreLogics((prev) => {
          const next = [...prev];
          next[kp.idx] = { ...next[kp.idx], target: newVal };
          return next;
        });
        setInitialScoreLogics((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next[kp.idx] = { ...next[kp.idx], target: newVal };
          return next;
        });
      }
    } else if (kp.section === 'capacity') {
      const sendToPlc = (plcVal, equipmentKey, signalKey) => {
        const key = `${equipmentKey}__${signalKey}`;
        const tagId = tagMap[key];
        if (tagId) {
          usePlcStore.getState().sendCommand(tagId, Number(plcVal), key, "sterilizer");
        } else {
          console.warn(`[WARN] tagId not found in tagMap for key: ${key}`);
        }
      };

      if (kp.param === 'designCapacity') {
        setDesignCapacity(Number(val));
        sendToPlc(val, "settings_capacity_design_capacity", "DESIGN_CAPACITY");
      }
      if (kp.param === 'numberSterilizer') {
        setNumberSterilizer(Number(val));
        sendToPlc(val, "settings_capacity_number_sterilizer", "NUMBER_STERILIZER");
      }
      if (kp.param === 'millDesignCapacity') {
        setMillDesignCapacity(Number(val));
        sendToPlc(val, "settings_capacity_mill_design_capacity", "MILL_DESIGN_CAPACITY");
      }
      if (kp.param === 'overLimitTime') {
        setOverLimitTime(Number(val));
        sendToPlc(val, "settings_tolerance_over_limit_time", "TIME");
      }
      if (kp.param === 'overLimitScore') {
        setOverLimitScore(Number(val));
        sendToPlc(val, "settings_tolerance_over_limit_score", "SCORE");
      }
    } else if (kp.section === 'controlLogics') {
      if (kp.param === 'safetyDoor') setSafetyDoor(val);
      if (kp.param === 'autoBlowdown') setAutoBlowdown(val);
      if (kp.param === 'holdingPressure') setHoldingPressure(val);
      if (kp.param === 'startToStepCycle') setStartToStepCycle(val);
      if (kp.param === 'safetyPressure') setSafetyPressure(val);
    } else if (kp.section === 'sequencing') {
      if (kp.param === 'sequencingOnStep') setSequencingOnStep(val);
      if (kp.param === 'sequencingStopStep') setSequencingStopStep(val);
    } else if (kp.section === 'tempOverriding') {
      if (kp.param === 'tempHoldingStepStart') setTempHoldingStepStart(val);
      if (kp.param === 'tempHoldingStepStop') setTempHoldingStepStop(val);
      if (kp.param === 'tempIdle') setTempIdle(val);
      if (kp.param === 'tempLow') setTempLow(val);
      if (kp.param === 'timeOpenCon') setTimeOpenCon(val);
      if (kp.param === 'timeCloseCon') setTimeCloseCon(val);
      if (kp.param === 'highTemp') setHighTemp(val);
    } else if (kp.section === 'mainSteam') {
      if (kp.param === 'mainSteam') setMainSteam(val);
    } else if (kp.section === 'bpvValves') {
      if (kp.param === 'makeupHigh') setBpvMakeupHigh(val);
      if (kp.param === 'makeupLow') setBpvMakeupLow(val);
      if (kp.param === 'makeupPosition') setBpvMakeupPosition(val);
      if (kp.param === 'makeupLimitHigh') setBpvMakeupLimitHigh(val);
      if (kp.param === 'makeupLimitLow') setBpvMakeupLimitLow(val);
      if (kp.param === 'surplusHigh') setBpvSurplusHigh(val);
      if (kp.param === 'surplusLow') setBpvSurplusLow(val);
      if (kp.param === 'surplusPosition') setBpvSurplusPosition(val);
      if (kp.param === 'surplusLimitHigh') setBpvSurplusLimitHigh(val);
      if (kp.param === 'surplusLimitLow') setBpvSurplusLimitLow(val);
    }

    setActiveKeypad(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parameters = {
        designCapacity,
        numberSterilizer,
        millDesignCapacity,
        actualThroughput,
        overLimitTime,
        overLimitScore,
        scoreLogics,
        safetyDoor,
        autoBlowdown,
        holdingPressure,
        startToStepCycle,
        safetyPressure,
        sequencingOnStep,
        sequencingStopStep,
        tempHoldingStepStart,
        tempHoldingStepStop,
        tempIdle,
        tempLow,
        timeOpenCon,
        timeCloseCon,
        highTemp,
        mainSteam,
        bpvSettings,
        bpvMakeupHigh,
        bpvMakeupLow,
        bpvMakeupPosition,
        bpvMakeupLimitHigh,
        bpvMakeupLimitLow,
        bpvSurplusHigh,
        bpvSurplusLow,
        bpvSurplusPosition,
        bpvSurplusLimitHigh,
        bpvSurplusLimitLow,
      };

      const token = localStorage.getItem("kip_token");

      // Build the final recipes payload, injecting both pendingEdits (numeric) and
      // draftEdits (valve/mode/door toggles) to guarantee the user's latest inputs are saved
      const recipesPayload = JSON.parse(JSON.stringify(localRecipes));

      const applyEditsToPayload = (edits) => {
        Object.entries(edits).forEach(([key, val]) => {
          // key format: "line_stepNum_field" e.g. "1_3_bar" or "1_3_con"
          const parts = key.split("_");
          if (parts.length === 3) {
            const line = parseInt(parts[0]);
            const stepNum = parseInt(parts[1]);
            const field = parts[2];
            ["ripe", "unripe", "overripe"].forEach((cat) => {
              const stepArr = recipesPayload[cat]?.[line];
              if (stepArr) {
                const step = stepArr.find((s) => s.step === stepNum);
                if (step) step[field] = val;
              }
            });
          }
        });
      };

      applyEditsToPayload(pendingEdits);
      applyEditsToPayload(draftEdits);

      const editedKeys = [...Object.keys(pendingEdits), ...Object.keys(draftEdits)];

      const res = await fetch("/api/sterilizer/settings/recipes-and-params", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipes: recipesPayload,
          parameters,
          activeCategory: selectedCategory,
          editedKeys
        })
      });

      if (!res.ok) {
        throw new Error("Failed to save settings. Server returned status: " + res.status);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to save settings to database.");
      }

      // Propagate edits back to parent component at once
      if (setRecipes) {
        setRecipes(localRecipes);
      }

      const sendPlc = (val, dbKey, equipmentKey, signalKey) => {
        if (val === null || val === undefined) return;
        if (val === initialVals[dbKey]) return;

        const key = `${equipmentKey}__${signalKey}`;
        const tagId = tagMap[key];
        if (tagId) {
          usePlcStore.getState().sendCommand(tagId, val, key, "sterilizer");
        }
      };

      sendPlc(designCapacity, "designCapacity", "settings_capacity_design_capacity", "DESIGN_CAPACITY");
      sendPlc(numberSterilizer, "numberSterilizer", "settings_capacity_number_sterilizer", "NUMBER_STERILIZER");
      sendPlc(millDesignCapacity, "millDesignCapacity", "settings_capacity_mill_design_capacity", "MILL_DESIGN_CAPACITY");
      sendPlc(overLimitTime, "overLimitTime", "settings_tolerance_over_limit_time", "TIME");
      sendPlc(overLimitScore, "overLimitScore", "settings_tolerance_over_limit_score", "SCORE");
      sendPlc(safetyDoor, "safetyDoor", "settings_logic_safety_door", "SETPOINT");
      sendPlc(autoBlowdown, "autoBlowdown", "settings_logic_auto_blowdown", "SETPOINT");
      sendPlc(holdingPressure, "holdingPressure", "settings_logic_holding_pressure", "SETPOINT");
      sendPlc(startToStepCycle, "startToStepCycle", "settings_logic_start_to_step_cycle", "STEP");
      sendPlc(safetyPressure, "safetyPressure", "settings_logic_safety_pressure", "SETPOINT");

      sendPlc(sequencingOnStep, "sequencingOnStep", "settings_logic_sequencing_on_step", "STEP");
      sendPlc(sequencingStopStep, "sequencingStopStep", "settings_logic_sequencing_stop_step", "STEP");

      sendPlc(tempHoldingStepStart, "tempHoldingStepStart", "settings_logic_temp_holding_step_start", "STEP");
      sendPlc(tempHoldingStepStop, "tempHoldingStepStop", "settings_logic_temp_holding_step_stop", "STEP");
      sendPlc(tempIdle, "tempIdle", "settings_logic_temp_idle", "SETPOINT");
      sendPlc(tempLow, "tempLow", "settings_logic_temp_low", "SETPOINT");
      sendPlc(timeOpenCon, "timeOpenCon", "settings_logic_time_open_con", "TIME");
      sendPlc(timeCloseCon, "timeCloseCon", "settings_logic_time_close_con", "TIME");
      sendPlc(highTemp, "highTemp", "settings_logic_high_temp", "SETPOINT");

      sendPlc(mainSteam, "mainSteam", "settings_logic_main_steam", "SETPOINT");

      sendPlc(bpvMakeupHigh, "bpvMakeupHigh", "settings_bpv_makeup_high", "SETPOINT");
      sendPlc(bpvMakeupLow, "bpvMakeupLow", "settings_bpv_makeup_low", "SETPOINT");
      sendPlc(bpvMakeupPosition, "bpvMakeupPosition", "settings_bpv_makeup_position", "POSITION");
      sendPlc(bpvMakeupLimitHigh, "bpvMakeupLimitHigh", "settings_bpv_makeup_limit_high", "SETPOINT");
      sendPlc(bpvMakeupLimitLow, "bpvMakeupLimitLow", "settings_bpv_makeup_limit_low", "SETPOINT");

      sendPlc(bpvSurplusHigh, "bpvSurplusHigh", "settings_bpv_surplus_high", "SETPOINT");
      sendPlc(bpvSurplusLow, "bpvSurplusLow", "settings_bpv_surplus_low", "SETPOINT");
      sendPlc(bpvSurplusPosition, "bpvSurplusPosition", "settings_bpv_surplus_position", "POSITION");
      sendPlc(bpvSurplusLimitHigh, "bpvSurplusLimitHigh", "settings_bpv_surplus_limit_high", "SETPOINT");
      sendPlc(bpvSurplusLimitLow, "bpvSurplusLimitLow", "settings_bpv_surplus_limit_low", "SETPOINT");

      const finalScoreLogics = scoreLogics.map((row) => {
        const targetVal = pendingScoreEdits[row.param] !== undefined ? pendingScoreEdits[row.param] : row.target;
        return { ...row, target: targetVal };
      });

      finalScoreLogics.forEach((row) => {
        const key = `settings_score_logic_${row.param}_target__TARGET`;
        const tagId = tagMap[key];
        if (tagId) {
          usePlcStore.getState().sendCommand(tagId, Number(row.target), key, "sterilizer");
        }
      });

      // Dispatch PLC write commands for all edited recipe steps (pendingEdits & draftEdits)
      const allEdits = { ...pendingEdits, ...draftEdits };
      Object.entries(allEdits).forEach(([editKey, editVal]) => {
        const parts = editKey.split("_");
        if (parts.length === 3) {
          const line = parts[0];
          const stepNum = parts[1];
          const field = parts[2];

          let sig = "SETPOINT";
          let sendVal = editVal;

          if (field === "bar") {
            sig = "SETPOINT";
            sendVal = Number(editVal);
          } else if (field === "nrm" || field === "unf" || field === "wet") {
            sig = "DURATION";
            sendVal = Number(editVal);
          } else if (field === "mode") {
            sig = "VALVE_MODE";
            const upper = String(editVal).toUpperCase();
            sendVal = (upper === "HIGH" || upper === "ABOVE" || editVal === 1 || editVal === "1") ? 1 : (upper === "LOW" || upper === "BELOW" || editVal === 2 || editVal === "2") ? 2 : 0;
          } else if (["inl1", "inl2", "dinl", "con", "rcon", "dcon", "exh", "doorIn", "doorOut"].includes(field)) {
            sig = "VALVE";
            const isLogicalOpen = (editVal === true || editVal === 1 || editVal === "1" || editVal === "Open" || String(editVal).toUpperCase() === "OPEN");
            if (field === "exh" && Number(stepNum) === 13) {
              sendVal = isLogicalOpen ? 0 : 1;
            } else {
              sendVal = isLogicalOpen ? 1 : 0;
            }
          }

          const eqKey = `recipe_line_${line}_step_${stepNum}_${field === "bar" ? "press" : field}`;
          const mapKey = `${eqKey}__${sig}`;
          const tagId = tagMap[mapKey];
          if (tagId) {
            usePlcStore.getState().sendCommand(tagId, sendVal, mapKey, "sterilizer");
          }
        }
      });

      // Update local & initial recipes state with the exact payload saved
      setLocalRecipes(recipesPayload);
      setInitialRecipes(JSON.parse(JSON.stringify(recipesPayload)));
      setScoreLogics(finalScoreLogics);
      setInitialScoreLogics(JSON.parse(JSON.stringify(finalScoreLogics)));

      // Clear pending & draft edits — PLC & DB now hold the new values
      setPendingEdits({});
      setPendingScoreEdits({});
      setDraftEdits({});
      alert("Settings saved successfully to database and PLC!");
      handleBackToOverview();
    } catch (err) {
      console.error(err);
      alert("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefault = () => {
    if (window.confirm("Are you sure you want to restore default settings?")) {
      setLocalRecipes(() => {
        const restored = { ripe: {}, unripe: {}, overripe: {} };
        const categories = ["ripe", "unripe", "overripe"];
        categories.forEach((cat) => {
          for (let line = 1; line <= 4; line++) {
            restored[cat][line] = Array.from({ length: 20 }, (_, i) => {
              const stepNum = i + 1;
              if (i < 16) {
                const def = defaultRecipesValues[i];
                return {
                  step: stepNum,
                  unf: def.unf,
                  nrm: def.nrm,
                  wet: def.wet,
                  inl1: def.inl1,
                  inl2: def.inl2,
                  dinl: def.dinl,
                  con: def.con,
                  rcon: def.rcon,
                  dcon: def.dcon,
                  exh: def.exh,
                  bar: def.bar,
                  mode: def.mode,
                  doorIn: def.doorIn,
                  doorOut: def.doorOut
                };
              } else {
                return {
                  step: stepNum,
                  unf: 0,
                  nrm: 0,
                  wet: 0,
                  inl1: false,
                  inl2: false,
                  dinl: false,
                  con: false,
                  rcon: false,
                  dcon: false,
                  exh: false,
                  bar: "",
                  mode: "OFF",
                  doorIn: "Close",
                  doorOut: "Close"
                };
              }
            });
          }
        });
        return restored;
      });
      setDesignCapacity(50);
      setNumberSterilizer(2);
      setMillDesignCapacity(45.0);
      setActualThroughput(48.32);
      setSterilScore(89);
      setLeadTimeScore(133);
      setThroughputScore(107);
      setOverLimitTime(300);
      setOverLimitScore(300);
      setScoreLogics([
        { step: 1, function: "Deaeration", target: 100, actual: 90, unit: "°C", decimals: 0, param: "deaeration_temp" },
        { step: 2, function: "1st Peak Up", target: 2.50, actual: 2.00, unit: "bar", decimals: 2, param: "peak1_press" },
        { step: 4, function: "2nd Peak Up", target: 2.50, actual: 2.30, unit: "bar", decimals: 2, param: "peak2_press" },
        { step: 6, function: "3rd Peak Up", target: 2.80, actual: 2.40, unit: "bar", decimals: 2, param: "peak3_press" },
        { step: 7, function: "Holding", target: 2.80, actual: 2.70, unit: "bar", decimals: 2, param: "holding_press" },
        { step: 8, function: "1st Intermitten Blow", target: 140, actual: 138, unit: "°C", decimals: 0, param: "blow1_temp" },
        { step: 9, function: "Holding", target: 2.80, actual: 2.65, unit: "bar", decimals: 2, param: "holding2_press" },
        { step: 10, function: "2nd Intermitten Blow", target: 140, actual: 139, unit: "°C", decimals: 0, param: "blow2_temp" },
        { step: 11, function: "Holding", target: 2.80, actual: 2.50, unit: "bar", decimals: 2, param: "holding3_press" },
        { step: 12, function: "3rd Intermitten Blow", target: 140, actual: 140, unit: "°C", decimals: 0, param: "blow3_temp" },
        { step: 13, function: "Holding", target: 2.80, actual: 2.80, unit: "bar", decimals: 2, param: "holding4_press" },
        { step: 14, function: "Blow-down", target: 120, actual: 150, unit: "s", decimals: 0, param: "blowdown_time" },
        { step: 15, function: "Exhaust", target: 180, actual: 265, unit: "s", decimals: 0, param: "exhaust_time" },
        { step: "FFB", function: "FFB loading in/out", target: 1200, actual: 900, unit: "s", decimals: 0, param: "ffb_loading" },
        { step: "T_Ster", function: "Target Sterilization Time", target: 6690, actual: 6550, unit: "s", decimals: 0, param: "target_ster_time" },
        { step: "T_Cyc", function: "Target Cycle Time", target: 7890, actual: 7450, unit: "s", decimals: 0, param: "target_cyc_time" },
        { step: "Tput", function: "Throughput", target: 22.81, actual: 24.16, unit: "mt/hr", decimals: 2, param: "throughput_rate" }
      ]);
      setSafetyDoor(0.03);
      setAutoBlowdown(2.75);
      setHoldingPressure(2.70);
      setStartToStepCycle(7);
      setSafetyPressure(2.80);
      setSequencingOnStep(1);
      setSequencingStopStep(13);
      setTempHoldingStepStart(7);
      setTempHoldingStepStop(11);
      setTempIdle(140.0);
      setTempLow(138.0);
      setTimeOpenCon(3);
      setTimeCloseCon(10);
      setHighTemp(140.0);
      setMainSteam(18.0);
      setBpvSettings(defaultBpvSettings);
      setBpvMakeupHigh(3.00);
      setBpvMakeupLow(2.50);
      setBpvMakeupPosition(100);
      setBpvMakeupLimitHigh(80);
      setBpvMakeupLimitLow(0);
      setBpvSurplusHigh(3.30);
      setBpvSurplusLow(3.10);
      setBpvSurplusPosition(0);
      setBpvSurplusLimitHigh(50);
      setBpvSurplusLimitLow(0);
    }
  };

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    const generateSheetForCategory = (category) => {
      const grid = [];
      const ensureRow = (r) => {
        while (grid.length <= r) {
          grid.push(Array(25).fill(""));
        }
      };

      const writeBlock = (startRow, startCol, data) => {
        data.forEach((row, rIdx) => {
          const curRow = startRow + rIdx;
          ensureRow(curRow);
          row.forEach((val, cIdx) => {
            grid[curRow][startCol + cIdx] = val !== undefined && val !== null ? val : "";
          });
        });
      };

      // Write Section Header Banners
      ensureRow(0);
      grid[0][0] = "STERILIZER CONTROL LOGICS";
      grid[0][11] = "STERILIZER SCORE LOGICS";
      grid[0][17] = "CONTROL LOGICS";

      // -------------------------------------------------------------
      // SECTION 1: STERILIZER CONTROL LOGICS
      // -------------------------------------------------------------
      const lineSteps = localRecipes[category]?.[selectedLine] || [];
      const recipeData = [
        ["RECIPE STEPS"],
        ["Step", "Function", "Inlet 1", "Inlet 2", "D. Inlet", "Cond.", "R.Cond.", "D.Cond.", "Exh.", "Pressure Setpoint (bar)", "Valve Mode"],
        ...lineSteps.map((step) => [
          step.step,
          "MODULATE",
          step.inl1 ? "OPEN" : "CLOSE",
          step.inl2 ? "OPEN" : "CLOSE",
          step.dinl ? "OPEN" : "CLOSE",
          step.con ? "OPEN" : "CLOSE",
          step.rcon ? "OPEN" : "CLOSE",
          step.dcon ? "OPEN" : "CLOSE",
          step.exh ? "OPEN" : "CLOSE",
          step.bar || "0.00",
          step.mode || "OFF",
          step.nrm || 0,
          step.unf || 0,
          step.wet || 0,
        ])
      ];
      writeBlock(2, 0, recipeData);

      // -------------------------------------------------------------
      // SECTION 2: STERILIZER SCORE LOGICS
      // -------------------------------------------------------------
      const stepScoreLogics = scoreLogics.filter(row => typeof row.step === "number");
      const globalPerformanceMetrics = scoreLogics.filter(row => typeof row.step !== "number");

      const stepScoreData = [
        ["STEP SCORE LOGICS"],
        ["Step", "Function", "Target Setpoint", "Actual Value", "Score (%)"],
        ...stepScoreLogics.map((row) => {
          const liveTarget = getLiveScoreLogicVal(row, "target");
          const liveActual = getLiveScoreLogicVal(row, "actual");
          const liveScore = getLiveScoreLogicVal(row, "score");
          return [
            row.step,
            row.function,
            `${liveTarget}${row.unit || ""}`,
            `${liveActual}${row.unit || ""}`,
            typeof liveScore === "number" ? `${liveScore}%` : liveScore
          ];
        })
      ];
      writeBlock(2, 11, stepScoreData);

      const globalPerfData = [
        ["GLOBAL PERFORMANCE METRICS"],
        ["Metric", "Function", "Target Setpoint", "Actual Value", "Score (%)"],
        ...globalPerformanceMetrics.map((row) => {
          const liveTarget = getLiveScoreLogicVal(row, "target");
          const liveActual = getLiveScoreLogicVal(row, "actual");
          const liveScore = getLiveScoreLogicVal(row, "score");
          return [
            row.step,
            row.function,
            `${liveTarget}${row.unit || ""}`,
            `${liveActual}${row.unit || ""}`,
            typeof liveScore === "number" ? `${liveScore}%` : liveScore
          ];
        })
      ];
      writeBlock(19, 11, globalPerfData);

      const capacityData = [
        ["CAPACITY SETTINGS"],
        ["Parameter", "Value", "Unit"],
        ["Sterilizer Design Cap.", designCapacity, "ton"],
        ["No. of Sterilizer", numberSterilizer, "unit"],
        ["Mill Design Cap.", millDesignCapacity, "mt/hr"],
        ["Actual Throughput", actualThroughput, "mt/hr"]
      ];
      writeBlock(27, 11, capacityData);

      const scorePerfData = [
        ["SCORE PERFORMANCE"],
        ["Parameter", "Score"],
        ["Sterilization Score", `${sterilScore}%`],
        ["Lead time Score", `${leadTimeScore}%`],
        ["Throughput Score", `${throughputScore}%`]
      ];
      writeBlock(35, 11, scorePerfData);

      const tolerancesData = [
        ["OVER LIMIT TOLERANCES"],
        ["Parameter", "Value", "Unit"],
        ["Over Limit (Time)", overLimitTime, "s"],
        ["Over Limit (Score)", overLimitScore, "s"]
      ];
      writeBlock(42, 11, tolerancesData);

      // -------------------------------------------------------------
      // SECTION 3: CONTROL LOGICS
      // -------------------------------------------------------------
      const safetyData = [
        ["CONTROL LOGICS (SAFETY)"],
        ["Parameter", "Value", "Unit"],
        ["Safety Door", safetyDoor, "bar"],
        ["Auto Blowdown", autoBlowdown, "bar"],
        ["Holding Pressure", holdingPressure, "bar"],
        ["Start to Step Cycle", startToStepCycle, "step"],
        ["Safety Pressure", safetyPressure, "bar"]
      ];
      writeBlock(2, 17, safetyData);

      const sequencingData = [
        ["STERILIZER SEQUENCING"],
        ["Parameter", "Value", "Unit"],
        ["On Step", sequencingOnStep, "step"],
        ["Stop - Step", sequencingStopStep, "step"]
      ];
      writeBlock(10, 17, sequencingData);

      const tempOverrideData = [
        ["TEMPERATURE OVERRIDING"],
        ["Parameter", "Value", "Unit"],
        ["Holding Step Start", tempHoldingStepStart, "step"],
        ["Holding Step Stop", tempHoldingStepStop, "step"],
        ["Temp Idle", tempIdle, "°C"],
        ["Temp Low", tempLow, "°C"],
        ["Time Open CON", timeOpenCon, "s"],
        ["Time Close CON", timeCloseCon, "s"],
        ["High Temp", highTemp, "°C"]
      ];
      writeBlock(16, 17, tempOverrideData);

      const mainSteamData = [
        ["MAIN STEAM"],
        ["Parameter", "Value", "Unit"],
        ["Main Steam", mainSteam, "bar"]
      ];
      writeBlock(27, 17, mainSteamData);

      const bpvData = [
        ["BPV SETTINGS"],
        ["BPV Pressure (bar)", "Make-up Valve (%)", "Surplus Valve (%)"],
        ...bpvSettings.map((row) => [
          row.pressure,
          row.makeup,
          row.surplus
        ])
      ];
      writeBlock(32, 17, bpvData);

      // Create Worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(grid);

      // Apply Luxury styling via xlsx-js-style
      const isTableTitleCell = (R, C) => {
        if (R === 2 && C >= 0 && C <= 9) return true;
        if (R === 2 && C >= 11 && C <= 15) return true;
        if (R === 19 && C >= 11 && C <= 15) return true;
        if (R === 27 && C >= 11 && C <= 13) return true;
        if (R === 35 && C >= 11 && C <= 12) return true;
        if (R === 42 && C >= 11 && C <= 13) return true;
        if (R === 2 && C >= 17 && C <= 18) return true;
        if (R === 7 && C >= 17 && C <= 19) return true;
        if (R === 13 && C >= 17 && C <= 19) return true;
        if (R === 19 && C >= 17 && C <= 19) return true;
        if (R === 27 && C >= 17 && C <= 19) return true;
        if (R === 37 && C >= 17 && C <= 19) return true;
        if (R === 42 && C >= 17 && C <= 19) return true;
        return false;
      };

      const isColumnHeaderCell = (R, C) => {
        if (R === 3 && C >= 0 && C <= 9) return true;
        if (R === 3 && C >= 11 && C <= 15) return true;
        if (R === 20 && C >= 11 && C <= 15) return true;
        if (R === 28 && C >= 11 && C <= 13) return true;
        if (R === 36 && C >= 11 && C <= 12) return true;
        if (R === 43 && C >= 11 && C <= 13) return true;
        if (R === 3 && C >= 17 && C <= 18) return true;
        if (R === 8 && C >= 17 && C <= 19) return true;
        if (R === 14 && C >= 17 && C <= 19) return true;
        if (R === 20 && C >= 17 && C <= 19) return true;
        if (R === 28 && C >= 17 && C <= 19) return true;
        if (R === 38 && C >= 17 && C <= 19) return true;
        if (R === 43 && C >= 17 && C <= 19) return true;
        return false;
      };

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          let cell = worksheet[cellRef];

          // Ensure styling spans empty cells in banners/titles
          if (!cell) {
            if (R === 0 && ((C >= 0 && C <= 9) || (C >= 11 && C <= 15) || (C >= 17 && C <= 21))) {
              worksheet[cellRef] = { v: "", t: "s" };
              cell = worksheet[cellRef];
            } else if (isTableTitleCell(R, C)) {
              worksheet[cellRef] = { v: "", t: "s" };
              cell = worksheet[cellRef];
            } else {
              continue;
            }
          }

          cell.s = {
            font: { name: "Arial", size: 10, color: { rgb: "000000" } },
            alignment: { vertical: "center" },
            border: {}
          };

          // Standard borders for cells with values
          if (cell.v !== "") {
            cell.s.border = {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            };
          }

          // Section Banners styling (Row 0)
          if (R === 0) {
            cell.s.font = { name: "Arial", size: 11, bold: true, color: { rgb: "FFFFFF" } };
            cell.s.fill = { fgColor: { rgb: "C5A059" } }; // Darker AgroVision Gold
            cell.s.alignment.horizontal = "left";
            continue;
          }

          // Table Title cells styling
          if (isTableTitleCell(R, C)) {
            cell.s.font = { name: "Arial", size: 10, bold: true, color: { rgb: "4A3C20" } };
            cell.s.fill = { fgColor: { rgb: "FFF9E6" } }; // Soft light yellow tint
            cell.s.alignment.horizontal = "left";
            cell.s.border = {
              top: { style: "medium", color: { rgb: "C5A059" } },
              bottom: { style: "thin", color: { rgb: "C5A059" } }
            };
            continue;
          }

          // Column Header cells styling
          if (isColumnHeaderCell(R, C)) {
            cell.s.font = { name: "Arial", size: 10, bold: true, color: { rgb: "000000" } };
            cell.s.fill = { fgColor: { rgb: "F9E79F" } }; // Gold yellow header
            cell.s.alignment.horizontal = "center";
            cell.s.border = {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "medium", color: { rgb: "C5A059" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            };
            continue;
          }

          // Alignments: Numbers center-aligned, text left-aligned
          if (cell.v !== "") {
            let alignCenter = false;
            if (typeof cell.v === "number") {
              alignCenter = true;
            } else if (typeof cell.v === "string") {
              const trimmed = cell.v.trim();
              if (/^-?\d+(\.\d+)?(%| bar| s|Â°C| step| ton| unit| mt\/hr)?$/.test(trimmed)) {
                alignCenter = true;
              } else if (trimmed === "OPEN" || trimmed === "CLOSE" || trimmed === "OFF" || trimmed === "Below" || trimmed === "Above" || trimmed === "MODULATE") {
                alignCenter = true;
              }
            }
            cell.s.alignment.horizontal = alignCenter ? "center" : "left";
          }
        }
      }

      // Set custom column widths to prevent truncation
      worksheet['!cols'] = [
        { wch: 8 },  // A: Step
        { wch: 12 }, // B: Function
        { wch: 10 }, // C: Inlet 1
        { wch: 10 }, // D: Inlet 2
        { wch: 10 }, // E: D. Inlet
        { wch: 10 }, // F: Cond.
        { wch: 10 }, // G: R.Cond.
        { wch: 10 }, // H: D.Cond.
        { wch: 10 }, // I: Exh.
        { wch: 22 }, // F: Pressure Setpoint (bar)
        { wch: 12 }, // G: Valve Mode
        { wch: 18 }, // H: Normal Duration (s)
        { wch: 18 }, // I: Unfresh Duration (s)
        { wch: 18 }, // J: Wet Duration (s)
        { wch: 4 },  // K: Spacer
        { wch: 8 },  // L: Metric/Step
        { wch: 25 }, // M: Function
        { wch: 18 }, // N: Target Setpoint
        { wch: 18 }, // O: Actual Value
        { wch: 12 }, // P: Score (%)
        { wch: 4 },  // Q: Spacer
        { wch: 38 }, // R: Parameter
        { wch: 15 }, // S: Value
        { wch: 22 }  // T: Unit/Action
      ];

      return worksheet;
    };

    const wsRipe = generateSheetForCategory("ripe");
    const wsUnripe = generateSheetForCategory("unripe");
    const wsOverripe = generateSheetForCategory("overripe");

    XLSX.utils.book_append_sheet(workbook, wsRipe, "Ripe");
    XLSX.utils.book_append_sheet(workbook, wsUnripe, "Unripe");
    XLSX.utils.book_append_sheet(workbook, wsOverripe, "Overripe");

    XLSX.writeFile(workbook, `sterilizer_setting_line_${selectedLine}.xlsx`);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input value so uploading the same file again triggers onChange
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetsToParse = ["Ripe", "Unripe", "Overripe"];
        const hasMultiSheets = sheetsToParse.some(name => workbook.SheetNames.includes(name));

        const primarySheetName = workbook.SheetNames.includes("Ripe") ? "Ripe" : workbook.SheetNames[0];
        const primaryWorksheet = workbook.Sheets[primarySheetName];
        if (!primaryWorksheet) {
          alert("Empty Excel file!");
          return;
        }

        const primaryGrid = XLSX.utils.sheet_to_json(primaryWorksheet, { header: 1 });

        // Validate template structure on the primary sheet
        const header1 = primaryGrid[0]?.[0];
        const header2 = primaryGrid[0]?.[11];
        const header3 = primaryGrid[0]?.[17];

        if (
          header1 !== "STERILIZER CONTROL LOGICS" ||
          header2 !== "STERILIZER SCORE LOGICS" ||
          header3 !== "CONTROL LOGICS"
        ) {
          alert("Invalid Excel template file. Please use the exported Excel file layout.");
          return;
        }

        // Helper to parse numbers safely
        const parseNum = (val, fallback = 0) => {
          if (val === undefined || val === null || val === "") return fallback;
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
          return isNaN(num) ? fallback : num;
        };

        // Helper to parse valve status (Boolean)
        const parseValve = (val) => {
          if (!val) return false;
          const str = String(val).trim().toUpperCase();
          return str === "OPEN" || str === "TRUE" || str === "1";
        };

        // Helper to get raw cell value
        const getCell = (gridRef, r, c) => {
          return gridRef[r]?.[c] !== undefined ? gridRef[r][c] : "";
        };

        const parseSingleGrid = (gridRef) => {
          const importedRecipeSteps = [];
          for (let stepIdx = 0; stepIdx < 20; stepIdx++) {
            const r = 4 + stepIdx;
            const stepNum = parseNum(getCell(gridRef, r, 0), stepIdx + 1);
            const valInl1 = parseValve(getCell(gridRef, r, 2));
            const valInl2 = parseValve(getCell(gridRef, r, 3));
            const valDinl = parseValve(getCell(gridRef, r, 4));
            const valCon = parseValve(getCell(gridRef, r, 5));
            const valRcon = parseValve(getCell(gridRef, r, 6));
            const valDcon = parseValve(getCell(gridRef, r, 7));
            const valExh = parseValve(getCell(gridRef, r, 8));
            const pressSetpoint = getCell(gridRef, r, 9) ? String(getCell(gridRef, r, 5)).trim() : "0.00";
            const valveMode = getCell(gridRef, r, 6) ? String(getCell(gridRef, r, 6)).trim().toUpperCase() : "OFF";
            const durNormal = parseNum(getCell(gridRef, r, 7), 0);
            const durUnfresh = parseNum(getCell(gridRef, r, 8), 0);
            const durWet = parseNum(getCell(gridRef, r, 9), 0);

            importedRecipeSteps.push({
              step: stepNum,
              inl1: valInl1,
              inl2: valInl2,
              dinl: valDinl,
              con: valCon,
              rcon: valRcon,
              dcon: valDcon,
              exh: valExh,
              bar: pressSetpoint,
              mode: valveMode,
              nrm: durNormal,
              unf: durUnfresh,
              wet: durWet
            });
          }
          return importedRecipeSteps;
        };

        // Parse recipes for all sheets
        let parsedRecipes = {};
        if (hasMultiSheets) {
          sheetsToParse.forEach(sheetName => {
            const lowerCat = sheetName.toLowerCase();
            if (workbook.SheetNames.includes(sheetName)) {
              const ws = workbook.Sheets[sheetName];
              const gridRef = XLSX.utils.sheet_to_json(ws, { header: 1 });
              parsedRecipes[lowerCat] = parseSingleGrid(gridRef);
            }
          });
        } else {
          // Old format: parse single sheet into the active selected category
          parsedRecipes[selectedCategory] = parseSingleGrid(primaryGrid);
        }

        // -------------------------------------------------------------
        // SECTION 2: SCORE LOGICS & CAPACITIES (Columns L-P)
        // -------------------------------------------------------------
        const newScoreLogics = [...scoreLogics];

        // Find indices in scoreLogics list that correspond to numeric steps
        const stepScoreIndices = [];
        scoreLogics.forEach((row, idx) => {
          if (typeof row.step === "number") stepScoreIndices.push(idx);
        });

        // Parse Step Score Logics from Excel (rows 4 to 16)
        stepScoreIndices.forEach((scoreIdx, arrayIdx) => {
          const r = 4 + arrayIdx;
          const targetVal = parseNum(getCell(primaryGrid, r, 13), newScoreLogics[scoreIdx].target);
          const actualVal = parseNum(getCell(primaryGrid, r, 14), newScoreLogics[scoreIdx].actual);
          newScoreLogics[scoreIdx] = {
            ...newScoreLogics[scoreIdx],
            target: targetVal,
            actual: actualVal
          };
        });

        // Global Performance Metrics (rows 21 to 24)
        const globalIndices = [];
        scoreLogics.forEach((row, idx) => {
          if (typeof row.step !== "number") globalIndices.push(idx);
        });

        globalIndices.forEach((scoreIdx, arrayIdx) => {
          const r = 21 + arrayIdx;
          const targetVal = parseNum(getCell(primaryGrid, r, 13), newScoreLogics[scoreIdx].target);
          const actualVal = parseNum(getCell(primaryGrid, r, 14), newScoreLogics[scoreIdx].actual);
          newScoreLogics[scoreIdx] = {
            ...newScoreLogics[scoreIdx],
            target: targetVal,
            actual: actualVal
          };
        });

        // Capacity Settings (rows 29 to 32)
        const designCapVal = parseNum(getCell(primaryGrid, 29, 12), designCapacity);
        const numberSterilizerVal = parseNum(getCell(primaryGrid, 30, 12), numberSterilizer);
        const millDesignCapVal = parseNum(getCell(primaryGrid, 31, 12), millDesignCapacity);
        const actualThroughputVal = parseNum(getCell(primaryGrid, 32, 12), actualThroughput);

        // Over Limit Tolerances (rows 44 to 45)
        const overLimitTimeVal = parseNum(getCell(primaryGrid, 44, 12), overLimitTime);
        const overLimitScoreVal = parseNum(getCell(primaryGrid, 45, 12), overLimitScore);

        // -------------------------------------------------------------
        // SECTION 3: CONTROL LOGICS (Columns R-V)
        // -------------------------------------------------------------
        const safetyDoorVal = parseNum(getCell(primaryGrid, 4, 18), safetyDoor);
        const autoBlowdownVal = parseNum(getCell(primaryGrid, 5, 18), autoBlowdown);
        const holdingPressureVal = parseNum(getCell(primaryGrid, 6, 18), holdingPressure);
        const startToStepCycleVal = parseNum(getCell(primaryGrid, 7, 18), startToStepCycle);
        const safetyPressureVal = parseNum(getCell(primaryGrid, 8, 18), safetyPressure);

        const sequencingOnStepVal = parseNum(getCell(primaryGrid, 12, 18), sequencingOnStep);
        const sequencingStopStepVal = parseNum(getCell(primaryGrid, 13, 18), sequencingStopStep);

        const tempHoldingStartVal = parseNum(getCell(primaryGrid, 18, 18), tempHoldingStepStart);
        const tempHoldingStopVal = parseNum(getCell(primaryGrid, 19, 18), tempHoldingStepStop);
        const tempIdleVal = parseNum(getCell(primaryGrid, 20, 18), tempIdle);
        const tempLowVal = parseNum(getCell(primaryGrid, 21, 18), tempLow);
        const timeOpenConVal = parseNum(getCell(primaryGrid, 22, 18), timeOpenCon);
        const timeCloseConVal = parseNum(getCell(primaryGrid, 23, 18), timeCloseCon);
        const highTempVal = parseNum(getCell(primaryGrid, 24, 18), highTemp);

        const mainSteamVal = parseNum(getCell(primaryGrid, 29, 18), mainSteam);

        // BPV Settings (rows 34 to 39)
        const newBpvSettings = bpvSettings.map((row, idx) => {
          const r = 34 + idx;
          const makeupVal = getCell(primaryGrid, r, 18) !== undefined && getCell(primaryGrid, r, 18) !== "-" ? String(getCell(primaryGrid, r, 18)).trim() : "-";
          const surplusVal = getCell(primaryGrid, r, 19) !== undefined && getCell(primaryGrid, r, 19) !== "-" ? String(getCell(primaryGrid, r, 19)).trim() : "-";
          return {
            ...row,
            makeup: makeupVal,
            surplus: surplusVal
          };
        });

        // -------------------------------------------------------------
        // APPLY STATE UPDATES
        // -------------------------------------------------------------
        setLocalRecipes(prev => {
          const next = { ...prev };
          Object.keys(parsedRecipes).forEach(cat => {
            next[cat] = {
              ...(next[cat] || {}),
              [selectedLine]: parsedRecipes[cat]
            };
          });
          return next;
        });

        setScoreLogics(newScoreLogics);
        setDesignCapacity(designCapVal);
        setNumberSterilizer(numberSterilizerVal);
        setMillDesignCapacity(millDesignCapVal);
        setActualThroughput(actualThroughputVal);
        setOverLimitTime(overLimitTimeVal);
        setOverLimitScore(overLimitScoreVal);

        setSafetyDoor(safetyDoorVal);
        setAutoBlowdown(autoBlowdownVal);
        setHoldingPressure(holdingPressureVal);
        setStartToStepCycle(startToStepCycleVal);
        setSafetyPressure(safetyPressureVal);
        setSequencingOnStep(sequencingOnStepVal);
        setSequencingStopStep(sequencingStopStepVal);
        setTempHoldingStepStart(tempHoldingStartVal);
        setTempHoldingStepStop(tempHoldingStopVal);
        setTempIdle(tempIdleVal);
        setTempLow(tempLowVal);
        setTimeOpenCon(timeOpenConVal);
        setTimeCloseCon(timeCloseConVal);
        setHighTemp(highTempVal);
        setMainSteam(mainSteamVal);
        setBpvSettings(newBpvSettings);

        let msg = `Excel Parsed:\n`;
        if (hasMultiSheets) {
          msg += `- Multi-sheets detected: Ripe, Unripe, Overripe updated successfully.\n`;
        } else {
          msg += `- Single sheet detected: ${selectedCategory.toUpperCase()} updated successfully.\n`;
        }
        msg += `- Design Capacity: ${designCapVal}\n` +
          `Settings imported successfully!`;
        alert(msg);
      } catch (err) {
        console.error(err);
        alert("Failed to parse Excel settings file. Check console for details.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const getLiveSettingVal = (dbKey, localVal, eq, sig) => {
    const isLocalValid = localVal !== undefined && localVal !== null && !isNaN(localVal);
    const isInitValid = initialVals[dbKey] !== undefined && initialVals[dbKey] !== null && !isNaN(initialVals[dbKey]);
    if (isLocalValid && isInitValid && localVal !== initialVals[dbKey]) return localVal;
    if (getMappedValue) {
      const val = getMappedValue(eq, sig);
      if (val === "No Tag" || val === "--") return val;
      if (val !== undefined && val !== null) {
        const num = Number(val);
        if (!isNaN(num)) return num;
      }
    }
    const key = `${eq}__${sig}`;
    const tagId = tagMap?.[key];
    if (tagId && availableTags?.length) {
      const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
      if (tagObj && tags?.[tagObj.tag_name]?.value !== undefined && tags[tagObj.tag_name]?.value !== null) {
        const num = Number(tags[tagObj.tag_name].value);
        if (!isNaN(num)) return num;
      }
      if (tagObj) return "--";
    }
    return isLocalValid ? localVal : "No Tag";
  };

  // Real-time live value resolver — called at render time so always fresh from PLC
  // Priority: pendingEdits (user typed new value) → getMappedValue (live PLC) → direct tags lookup → null
  const getLiveRecipeVal = (line, stepNum, field) => {
    const isValve = ['inl1', 'inl2', 'dinl', 'con', 'rcon', 'dcon', 'exh'].includes(field);
    const isMode = field === 'mode';
    const isDoor = field === 'doorIn' || field === 'doorOut';
    if (field !== 'bar' && field !== 'nrm' && field !== 'unf' && field !== 'wet' && !isValve && !isMode && !isDoor) return null;

    // 1. User has a draft edit (valve toggled but not yet saved) — show that first
    const pendingKey = `${line}_${stepNum}_${field}`;
    if (draftEdits[pendingKey] !== undefined) {
      return draftEdits[pendingKey];
    }
    // 2. User has a committed numeric edit (bar/pressure) — show that
    if (pendingEdits[pendingKey] !== undefined) {
      return pendingEdits[pendingKey];
    }

    const mapModeValue = (val) => {
      if (val === 1 || val === "1" || String(val).toUpperCase() === "HIGH" || String(val).toUpperCase() === "ABOVE") return "HIGH";
      if (val === 2 || val === "2" || String(val).toUpperCase() === "LOW" || String(val).toUpperCase() === "BELOW") return "LOW";
      return "OFF";
    };

    // 2. Live PLC value via getMappedValue
    const eq = `recipe_line_${line}_step_${stepNum}_${field === 'bar' ? 'press' : field}`;
    let sig = 'SETPOINT';
    if (isValve || isDoor) sig = 'VALVE';
    if (isMode) sig = 'VALVE_MODE';
    if (field === 'nrm' || field === 'unf' || field === 'wet') sig = 'DURATION';

    if (getMappedValue) {
      const val = getMappedValue(eq, sig);
      if (val === 'No Tag' || val === '--') {
        if (field === 'bar' || field === 'nrm' || field === 'unf' || field === 'wet') return val;
      }
      if (val !== 'No Tag' && val !== '--' && val !== undefined && val !== null) {
        if (isValve) {
          let bVal = val === true || val === 'true' || val === 1 || val === '1' || val === 'OPEN';
          if (field === 'exh' && Number(stepNum) === 13) {
            bVal = !bVal;
          }
          return bVal;
        }
        if (isDoor) {
          const v = val === true || val === 'true' || val === 1 || val === '1' || val === 'OPEN' || String(val).toUpperCase() === 'OPEN';
          return v ? "Open" : "Close";
        }
        if (isMode) {
          return mapModeValue(val);
        }
        return Number(val);
      }
    }
    // 3. Fallback: direct tags store lookup
    const key = `${eq}__${sig}`;
    const tagId = tagMap[key];
    if (tagId) {
      const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
      if (tagObj) {
        const live = tags[tagObj.tag_name];
        if (live !== undefined && live !== null) {
          const liveVal = live.value;
          if (isValve) {
            let bVal = liveVal === true || liveVal === 'true' || liveVal === 1 || liveVal === '1' || liveVal === 'OPEN';
            if (field === 'exh' && Number(stepNum) === 13) {
              bVal = !bVal;
            }
            return bVal;
          }
          if (isDoor) {
            const v = liveVal === true || liveVal === 'true' || liveVal === 1 || liveVal === '1' || liveVal === 'OPEN' || String(liveVal).toUpperCase() === 'OPEN';
            return v ? "Open" : "Close";
          }
          if (isMode) {
            return mapModeValue(liveVal);
          }
          return Number(liveVal);
        } else {
          if (field === 'bar' || field === 'nrm' || field === 'unf' || field === 'wet') return "--";
        }
      }
    }

    if (field === 'bar' || field === 'nrm' || field === 'unf' || field === 'wet') {
      return "No Tag";
    }

    return null;
  };

  // Helper calculation formulas for display (Totals calculated dynamically using live PLC values)
  const totals = getTotals(localRecipes[selectedCategory] || {}, selectedLine, getLiveRecipeVal);
  const formatSec = (num) => num.toLocaleString("en-US");

  const currentLineSteps = localRecipes[selectedCategory]?.[selectedLine] || [];

  // Real-time live value resolver for Sterilizer Score Logics (Target, Actual, Score)
  const getLiveScoreLogicVal = (row, field) => {
    const isTarget = field === "target";
    const isScore = field === "score";

    // 1. TARGET: Always returns user's pending edit or stored target (no PLC tag mapping)
    if (isTarget) {
      if (pendingScoreEdits[row.param] !== undefined) {
        return pendingScoreEdits[row.param];
      }
      return row.target;
    }

    // 2. SCORE: Mathematically calculated based on Target vs Actual (no PLC tag mapping)
    if (isScore) {
      const curTarget = pendingScoreEdits[row.param] !== undefined ? pendingScoreEdits[row.param] : row.target;
      const curActual = getLiveScoreLogicVal(row, "actual");
      return calculateScore(curTarget, curActual, row.step);
    }

    // 3. ACTUAL: Read live from PLC tag mapping for the selected line (Line 1, 2, 3, 4)
    const eqLine = `settings_score_logic_st${selectedScoreLine}_${row.param}_actual`;
    const eqGlobal = `settings_score_logic_${row.param}_actual`;
    const sig = "ACTUAL";

    const resolveKey = (eq) => {
      if (getMappedValue) {
        const val = getMappedValue(eq, sig);
        if (val !== "No Tag" && val !== "--" && val !== undefined && val !== null) {
          const num = Number(val);
          if (!isNaN(num)) return num;
          return val;
        }
        if (val === "No Tag") return "No Tag";
      }

      const key = `${eq}__${sig}`;
      const tagId = tagMap?.[key];
      if (tagId && availableTags?.length) {
        const tagObj = availableTags.find((t) => String(t.id) === String(tagId));
        if (tagObj) {
          if (tags?.[tagObj.tag_name]?.value !== undefined && tags[tagObj.tag_name]?.value !== null) {
            const num = Number(tags[tagObj.tag_name].value);
            if (!isNaN(num)) return num;
            return tags[tagObj.tag_name].value;
          } else {
            return "--";
          }
        }
      }
      return "No Tag";
    };

    const lineVal = resolveKey(eqLine);
    if (lineVal !== "No Tag" && lineVal !== "--") return lineVal;

    // Fallback to legacy Line 1 mapping if not explicitly mapped on st1
    if (selectedScoreLine === 1 || lineVal === "No Tag") {
      const globalVal = resolveKey(eqGlobal);
      if (globalVal !== "No Tag") return globalVal;
    }

    return lineVal;
  };

  // Helper to render each valve cell (INL1, INL2, etc.) using live PLC / draft / local values
  const renderValveCell = (step, idx, field, label) => {
    const live = getLiveRecipeVal(selectedLine, step.step, field);
    const isOpen = live !== null ? live : !!(step[field]);
    const draftKey = `${selectedLine}_${step.step}_${field}`;
    const hasDraft = draftEdits[draftKey] !== undefined;

    return (
      <td
        onClick={
          configMode
            ? () => handleEquipmentClick(
              `recipe_line_${selectedLine}_step_${step.step}_${field}`,
              [],
              [{ key: "VALVE", label: `Line ${selectedLine} Step ${step.step} ${label}` }]
            )
            : () => toggleField(idx, field)
        }
      >
        <div
          className={`som-rect-status ${isOpen ? "open" : "close"} som-editable`}
          style={{
            ...getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_${field}`, "VALVE"),
            ...(hasDraft ? {
              outline: "2px dashed #f59e0b",
              outlineOffset: "1px",
              opacity: 0.85,
            } : {})
          }}
          title={hasDraft ? "Unsaved change — click Save to commit" : undefined}
        >
          {isOpen ? "OPEN" : "CLOSE"}{hasDraft ? " *" : ""}
        </div>
      </td>
    );
  };


  return (
    <section className="som-sterilizer-station">
      {/* Header section */}
      <header className="som-sterilizer-station-header">
        <div className="som-header-left">
          <h2 className="som-sterilizer-station-title">Sterilizer Station</h2>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button className="som-view-btn" onClick={handleBackToOverview}>
            PROCESS VIEW
          </button>
          <button className="som-view-btn" disabled style={{ cursor: "not-allowed", opacity: 0.6, display: "flex", alignItems: "center", gap: "4px" }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: "4px" }}>
              <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
            </svg>
          </button>
          <button className="som-view-btn active" style={{ marginLeft: "8px" }}>
            ⚙️ SETTINGS
          </button>
        </div>
      </header>

      {/* Main Settings Panel */}
      <div className="som-ster-page">
        {/* Content columns */}
        <div className="som-settings-columns-container">
          {/* Column 1: Card 1 - Recipe / Sterilizer Control Logics */}
          <div className="som-settings-col som-col-1">
            <div className="som-settings-card som-recipe-card">
              <div className="som-settings-card-header" style={{ justifyContent: "space-between" }}>
                <span>STERILIZER CONTROL LOGICS</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", textTransform: "none" }}>
                  <span style={{ fontSize: "8.5px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      padding: "1px 6px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      fontSize: "9.5px",
                      fontWeight: "700",
                      outline: "none",
                      backgroundColor: "#ffffff",
                      cursor: "pointer",
                      height: "18px",
                      color: "#0f172a"
                    }}
                  >
                    <option value="ripe">Ripe</option>
                    <option value="unripe">Unripe</option>
                    <option value="overripe">Overripe</option>
                  </select>
                </div>
              </div>
              <div className="som-settings-card-body">
                <div className="som-recipe-dense-table som-table-wrapper">
                  <table className="som-ultra-table">
                    <thead>
                      <tr>
                        <th rowSpan="2">STEP</th>
                        <th rowSpan="2" title="Inlet 1">INLET 1</th>
                        <th rowSpan="2" title="Inlet 2">INLET 2</th>
                        <th rowSpan="2" title="D. Inlet">FLASHING</th>
                        <th rowSpan="2" title="Exhaust">EXHAUST</th>
                        <th rowSpan="2" title="D. Condensate">D.COND</th>
                        <th rowSpan="2" title="Condensate">CONDENSATE</th>
                        <th rowSpan="2" title="R. Condensate">RELIEF CONDENSATE</th>
                        <th colSpan="2">PRESSURE OVERRIDE (BAR)</th>
                        <th rowSpan="2">NORMAL</th>
                        <th rowSpan="2">UNFRESH</th>
                        <th rowSpan="2">WET</th>
                      </tr>
                      <tr>
                        <th>BAR</th>
                        <th>MODE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLineSteps.map((step, idx) => (
                        <tr key={step.step || idx}>
                          <td className="som-n" style={{ fontWeight: "700" }}>{step.step}</td>
                          {renderValveCell(step, idx, "inl1", "Inlet 1 Valve")}
                          {renderValveCell(step, idx, "inl2", "Inlet 2 Valve")}
                          {renderValveCell(step, idx, "dinl", "D. Inlet Valve")}
                          {renderValveCell(step, idx, "exh", "Exhaust Valve")}
                          {renderValveCell(step, idx, "dcon", "D. Condensate Valve")}
                          {renderValveCell(step, idx, "con", "Condensate Valve")}
                          {renderValveCell(step, idx, "rcon", "R. Condensate Valve")}
                          <td>
                            <ValBox
                              value={(() => { const live = getLiveRecipeVal(selectedLine, step.step, "bar"); return live !== null ? live : step.bar; })()}
                              decimals={2}
                              onClick={
                                configMode
                                  ? () => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_press`,
                                    [],
                                    [{ key: "SETPOINT", label: `Line ${selectedLine} Step ${step.step} Press Setpoint` }]
                                  )
                                  : () => setActiveKeypad({
                                    section: "recipe",
                                    stepIdx: idx,
                                    param: "bar",
                                    label: `Step ${step.step} PRESSURE OVERRIDE`
                                  })
                              }
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_press`, "SETPOINT")}
                            />
                          </td>
                          <td>
                            {(() => {
                              const liveModeRaw = getLiveRecipeVal(selectedLine, step.step, "mode");
                              const displayMode = liveModeRaw !== null ? liveModeRaw : (step.mode || "OFF");
                              const modeText = (displayMode === "HIGH" || displayMode === "Above" || displayMode === 1 || displayMode === "1") 
                                ? "HIGH" 
                                : (displayMode === "LOW" || displayMode === "Below" || displayMode === 2 || displayMode === "2") 
                                  ? "LOW" 
                                  : "OFF";

                              const getModeStyle = () => {
                                if (modeText === "HIGH") {
                                  return { border: "1px solid #ef4444", color: "#991b1b", background: "#fee2e2" };
                                }
                                if (modeText === "LOW") {
                                  return { border: "1px solid #3b82f6", color: "#1e40af", background: "#dbeafe" };
                                }
                                return { border: "1px solid #cbd5e1", color: "#64748b", background: "#f8fafc" };
                              };

                              return configMode ? (
                                <div
                                  className="som-rect-val"
                                  style={{
                                    ...getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_mode`, "VALVE_MODE"),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "850",
                                    fontSize: "8.5px",
                                    height: "18px",
                                  }}
                                  onClick={() => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_mode`,
                                    [],
                                    [{ key: "VALVE_MODE", label: `Line ${selectedLine} Step ${step.step} Valve Mode` }]
                                  )}
                                >
                                  {modeText}
                                </div>
                              ) : (
                                <div
                                  className="som-rect-status som-editable"
                                  style={{
                                    ...getModeStyle(),
                                    cursor: "pointer",
                                    width: "90%",
                                    margin: "0 auto",
                                    textAlign: "center",
                                    padding: "1px 0",
                                    fontSize: "8.5px",
                                    boxSizing: "border-box",
                                    borderRadius: "2px",
                                    height: "18px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "800",
                                  }}
                                  onClick={() => cycleModeField(idx)}
                                >
                                  {modeText}
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <ValBox
                              value={(() => { const live = getLiveRecipeVal(selectedLine, step.step, "nrm"); return live !== null ? live : step.nrm; })()}
                              decimals={0}
                              onClick={
                                configMode
                                  ? () => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_nrm`,
                                    [],
                                    [{ key: "DURATION", label: `Line ${selectedLine} Step ${step.step} Normal Time` }]
                                  )
                                  : () => setActiveKeypad({
                                    section: "recipe",
                                    stepIdx: idx,
                                    param: "nrm",
                                    label: `Step ${step.step} NORMAL Time`
                                  })
                              }
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_nrm`, "DURATION")}
                            />
                          </td>
                          <td>
                            <ValBox
                              value={(() => { const live = getLiveRecipeVal(selectedLine, step.step, "unf"); return live !== null ? live : step.unf; })()}
                              decimals={0}
                              onClick={
                                configMode
                                  ? () => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_unf`,
                                    [],
                                    [{ key: "DURATION", label: `Line ${selectedLine} Step ${step.step} Unfresh Time` }]
                                  )
                                  : () => setActiveKeypad({
                                    section: "recipe",
                                    stepIdx: idx,
                                    param: "unf",
                                    label: `Step ${step.step} UNFRESH Time`
                                  })
                              }
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_unf`, "DURATION")}
                            />
                          </td>
                          <td>
                            <ValBox
                              value={(() => { const live = getLiveRecipeVal(selectedLine, step.step, "wet"); return live !== null ? live : step.wet; })()}
                              decimals={0}
                              onClick={
                                configMode
                                  ? () => handleEquipmentClick(
                                    `recipe_line_${selectedLine}_step_${step.step}_wet`,
                                    [],
                                    [{ key: "DURATION", label: `Line ${selectedLine} Step ${step.step} Wet Time` }]
                                  )
                                  : () => setActiveKeypad({
                                    section: "recipe",
                                    stepIdx: idx,
                                    param: "wet",
                                    label: `Step ${step.step} WET Time`
                                  })
                              }
                              style={getDeveloperStyle(`recipe_line_${selectedLine}_step_${step.step}_wet`, "DURATION")}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Totals Section */}
                <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 0 6px 6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    TOTAL STERILIZATION TIME (SECONDS)
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #fcd34d', borderRadius: '4px', padding: '8px 25px', minWidth: '80px', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#f59e0b', marginBottom: '2px' }}>{totals?.unfCycle || 0}</span>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b' }}>(UNFRESH)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #fcd34d', borderRadius: '4px', padding: '8px 25px', minWidth: '80px', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#f59e0b', marginBottom: '2px' }}>{totals?.nrmCycle || 0}</span>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b' }}>(NORMAL)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #fcd34d', borderRadius: '4px', padding: '8px 25px', minWidth: '80px', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#f59e0b', marginBottom: '2px' }}>{totals?.wetCycle || 0}</span>
                      <span style={{ fontSize: '9px', fontWeight: '700', color: '#64748b' }}>(WET)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Card 2 - Score Logics */}
          <div className="som-settings-col som-col-2">
            <div className="som-settings-card som-capacity-card">
              <div className="som-settings-card-header">
                <span>STERILIZER SCORE LOGICS</span>
              </div>
              <div className="som-settings-card-body som-score-card-body">
                <div className="som-score-table-panel som-table-wrapper">
                  <table className="som-score-logics-table">
                    <thead>
                      <tr>
                        <th rowSpan="2" style={{ textTransform: 'uppercase' }}>Step</th>
                        <th rowSpan="2" style={{ textTransform: 'uppercase' }}>Function</th>
                        <th rowSpan="2" style={{ textTransform: 'uppercase' }}>Target</th>
                        <th colSpan="2" style={{ padding: '4px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {[1, 2, 3, 4].map((ln) => (
                              <button
                                key={ln}
                                onClick={() => setSelectedScoreLine(ln)}
                                style={{
                                  padding: '4px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  backgroundColor: selectedScoreLine === ln ? '#3b82f6' : 'transparent',
                                  color: selectedScoreLine === ln ? '#ffffff' : '#64748b',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                Line {ln}
                              </button>
                            ))}
                          </div>
                        </th>
                      </tr>
                      <tr>
                        <th style={{ textTransform: 'uppercase' }}>Actual</th>
                        <th style={{ textTransform: 'uppercase' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreLogics.map((row, idx) => {
                        const isFfbStart = row.step === "FFB";
                        const liveTarget = getLiveScoreLogicVal(row, "target");
                        const liveActual = getLiveScoreLogicVal(row, "actual");
                        const liveScore = getLiveScoreLogicVal(row, "score");

                        return (
                          <Fragment key={row.param || idx}>
                            {isFfbStart && (
                              <tr className="som-table-divider-row">
                                <td colSpan="5">GLOBAL PERFORMANCE METRICS</td>
                              </tr>
                            )}
                            <tr className={typeof row.step !== "number" ? "som-global-metric-row" : ""}>
                              <td className="som-n">{row.step}</td>
                              <td className="som-func-name">{row.function}</td>
                              <td>
                                <ValBox
                                  value={liveTarget}
                                  decimals={row.decimals}
                                  unit={row.unit}
                                  onClick={() => setActiveKeypad({
                                    section: "scoreLogic",
                                    idx: idx,
                                    param: "target",
                                    label: `Target ${row.function}`,
                                    unit: row.unit
                                  })}
                                  style={{
                                    border: '1.5px solid #fcd34d',
                                    borderRadius: '3px',
                                    backgroundColor: '#ffffff',
                                    fontWeight: '800',
                                    width: '100%',
                                    maxWidth: '85px',
                                    whiteSpace: 'nowrap',
                                    margin: '0 auto',
                                    padding: '2px 0',
                                    cursor: 'pointer'
                                  }}
                                />
                              </td>
                              <td>
                                <ValBox
                                  value={liveActual}
                                  decimals={row.decimals}
                                  unit={row.unit}
                                  onClick={
                                    configMode
                                      ? () => handleEquipmentClick(
                                        `settings_score_logic_st${selectedScoreLine}_${row.param}_actual`,
                                        [],
                                        [{ key: "ACTUAL", label: `Line ${selectedScoreLine} ${row.function} Actual Value` }]
                                      )
                                      : null
                                  }
                                  style={{
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: '3px',
                                    backgroundColor: '#f8fafc',
                                    fontWeight: '700',
                                    width: '100%',
                                    maxWidth: '85px',
                                    whiteSpace: 'nowrap',
                                    margin: '0 auto',
                                    padding: '2px 0',
                                    ...getDeveloperStyle(`settings_score_logic_st${selectedScoreLine}_${row.param}_actual`, "ACTUAL")
                                  }}
                                />
                              </td>
                              <td className="som-score-cell">
                                <ValBox
                                  value={liveScore}
                                  decimals={0}
                                  unit="%"
                                  onClick={null}
                                  style={{
                                    border: '1.5px solid #fdba74',
                                    borderRadius: '3px',
                                    backgroundColor: '#fff7ed',
                                    fontWeight: '800',
                                    color: '#ea580c',
                                    width: '100%',
                                    maxWidth: '85px',
                                    whiteSpace: 'nowrap',
                                    margin: '0 auto',
                                    padding: '2px 0'
                                  }}
                                />
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom settings panels side-by-side */}
                <div className="som-score-bottom-panels">
                  {/* Capacity Settings Group */}
                  <div className="som-score-group-box">
                    <h4 className="som-score-group-title">Capacity Settings</h4>
                    <div className="som-capacity-row">
                      <span className="som-capacity-label">Sterilizer Design Cap.</span>
                      <ValBox
                        value={getLiveSettingVal('designCapacity', designCapacity, 'settings_capacity_design_capacity', 'DESIGN_CAPACITY')}
                        decimals={0}
                        unit="ton"
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_capacity_design_capacity",
                              [],
                              [{ key: "DESIGN_CAPACITY", label: "Sterilizer Design Capacity" }]
                            )
                            : () => setActiveKeypad({
                              section: "capacity",
                              param: "designCapacity",
                              label: "Sterilizer Design Capacity",
                              unit: "ton"
                            })
                        }
                        style={{ ...getDeveloperStyle("settings_capacity_design_capacity", "DESIGN_CAPACITY"), border: '1.5px solid #fcd34d' }}
                      />
                    </div>
                    <div className="som-capacity-row">
                      <span className="som-capacity-label">No. of Sterilizer</span>
                      <ValBox
                        value={getLiveSettingVal('numberSterilizer', numberSterilizer, 'settings_capacity_number_sterilizer', 'NUMBER_STERILIZER')}
                        decimals={0}
                        unit="unit"
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_capacity_number_sterilizer",
                              [],
                              [{ key: "NUMBER_STERILIZER", label: "Number of Sterilizers" }]
                            )
                            : () => setActiveKeypad({
                              section: "capacity",
                              param: "numberSterilizer",
                              label: "Number of Sterilizer",
                              unit: "unit"
                            })
                        }
                        style={{ ...getDeveloperStyle("settings_capacity_number_sterilizer", "NUMBER_STERILIZER"), border: '1.5px solid #fcd34d' }}
                      />
                    </div>
                    <div className="som-capacity-row">
                      <span className="som-capacity-label">Mill Design Cap.</span>
                      <ValBox
                        value={getLiveSettingVal('millDesignCapacity', millDesignCapacity, 'settings_capacity_mill_design_capacity', 'MILL_DESIGN_CAPACITY')}
                        decimals={1}
                        unit="mt/hr"
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_capacity_mill_design_capacity",
                              [],
                              [{ key: "MILL_DESIGN_CAPACITY", label: "Mill Design Capacity" }]
                            )
                            : () => setActiveKeypad({
                              section: "capacity",
                              param: "millDesignCapacity",
                              label: "Mill Design Capacity",
                              unit: "mt/hr"
                            })
                        }
                        style={{ ...getDeveloperStyle("settings_capacity_mill_design_capacity", "MILL_DESIGN_CAPACITY"), border: '1.5px solid #fcd34d' }}
                      />
                    </div>
                    <div className="som-capacity-row actual-row">
                      <span className="som-capacity-label font-bold">Actual Throughput</span>
                      <ValBox
                        value={getLiveSettingVal('actualThroughput', actualThroughput, 'settings_capacity_actual_throughput', 'ACTUAL_THROUGHPUT')}
                        decimals={0}
                        unit="mt/hr"
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_capacity_actual_throughput",
                              [],
                              [{ key: "ACTUAL_THROUGHPUT", label: "Actual Throughput" }]
                            )
                            : null
                        }
                        style={{ ...getDeveloperStyle("settings_capacity_actual_throughput", "ACTUAL_THROUGHPUT"), border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc' }}
                      />
                    </div>
                  </div>

                  {/* Score Telemetry Panel */}
                  <div className="som-score-panel-card">
                    <h4 className="som-score-group-title">Score Performance</h4>
                    <div className="som-score-row">
                      <span className="som-score-label">Sterilization Score</span>
                      <span
                        className={configMode ? "som-score-val som-val-box--editable" : "som-score-val"}
                        style={{ ...getDeveloperStyle("settings_score_perf_steril", "SCORE"), border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '2px 8px', borderRadius: '4px' }}
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_score_perf_steril",
                              [],
                              [{ key: "SCORE", label: "Sterilization Score" }]
                            )
                            : null
                        }
                      >
                        {(() => {
                          const val = getLiveSettingVal('sterilScore', sterilScore, 'settings_score_perf_steril', 'SCORE');
                          return (val === "No Tag" || val === "--") ? val : `${val}%`;
                        })()}
                      </span>
                    </div>
                    <div className="som-score-row">
                      <span className="som-score-label">Lead time Score</span>
                      <span
                        className={configMode ? "som-score-val som-val-box--editable" : "som-score-val"}
                        style={{ ...getDeveloperStyle("settings_score_perf_lead_time", "SCORE"), border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '2px 8px', borderRadius: '4px' }}
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_score_perf_lead_time",
                              [],
                              [{ key: "SCORE", label: "Lead Time Score" }]
                            )
                            : null
                        }
                      >
                        {(() => {
                          const val = getLiveSettingVal('leadTimeScore', leadTimeScore, 'settings_score_perf_lead_time', 'SCORE');
                          return (val === "No Tag" || val === "--") ? val : `${val}%`;
                        })()}
                      </span>
                    </div>
                    <div className="som-score-row">
                      <span className="som-score-label">Throughput Score</span>
                      <span
                        className={configMode ? "som-score-val som-val-box--editable" : "som-score-val"}
                        style={{ ...getDeveloperStyle("settings_score_perf_throughput", "SCORE"), border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '2px 8px', borderRadius: '4px' }}
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_score_perf_throughput",
                              [],
                              [{ key: "SCORE", label: "Throughput Score" }]
                            )
                            : null
                        }
                      >
                        {(() => {
                          const val = getLiveSettingVal('throughputScore', throughputScore, 'settings_score_perf_throughput', 'SCORE');
                          return (val === "No Tag" || val === "--") ? val : `${val}%`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Over Limit Tolerances Group */}
                  <div className="som-score-group-box">
                    <h4 className="som-score-group-title">Over Limit Tolerances</h4>
                    <div className="som-capacity-row">
                      <span className="som-capacity-label">Over Limit (Time)</span>
                      <ValBox
                        value={getLiveSettingVal('overLimitTime', overLimitTime, 'settings_tolerance_over_limit_time', 'TIME')}
                        decimals={0}
                        unit="s"
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_tolerance_over_limit_time",
                              [],
                              [{ key: "TIME", label: "Over Limit Tolerance (Time)" }]
                            )
                            : () => setActiveKeypad({
                              section: "capacity",
                              param: "overLimitTime",
                              label: "Over Limit Tolerance (Time)",
                              unit: "s"
                            })
                        }
                        style={{ ...getDeveloperStyle("settings_tolerance_over_limit_time", "TIME"), border: '1.5px solid #fcd34d' }}
                      />
                    </div>
                    <div className="som-capacity-row">
                      <span className="som-capacity-label">Over Limit (Score)</span>
                      <ValBox
                        value={getLiveSettingVal('overLimitScore', overLimitScore, 'settings_tolerance_over_limit_score', 'SCORE')}
                        decimals={0}
                        unit="s"
                        onClick={
                          configMode
                            ? () => handleEquipmentClick(
                              "settings_tolerance_over_limit_score",
                              [],
                              [{ key: "SCORE", label: "Over Limit Tolerance (Score)" }]
                            )
                            : () => setActiveKeypad({
                              section: "capacity",
                              param: "overLimitScore",
                              label: "Over Limit Tolerance (Score)",
                              unit: "s"
                            })
                        }
                        style={{ ...getDeveloperStyle("settings_tolerance_over_limit_score", "SCORE"), border: '1.5px solid #fcd34d' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Card 3 - Control Logics */}
          <div className="som-settings-col som-col-3">
            <div className="som-settings-card som-logic-card">
              <div className="som-settings-card-header">
                <span>CONTROL LOGICS</span>
              </div>
              <div className="som-settings-card-body som-logic-body">
                <div className="som-control-logics-layout">
                  {/* CONTROL LOGICS TOP PANEL */}
                  <div className="som-logic-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between', paddingRight: '12px' }}>
                          <span className="som-logic-label">Safety Door</span>
                          <ValBox
                            value={getLiveSettingVal('safetyDoor', safetyDoor, 'settings_logic_safety_door', 'SETPOINT')}
                            decimals={2}
                            unit="bar"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_safety_door", [], [{ key: "SETPOINT", label: "Safety Door" }]) : () => setActiveKeypad({ section: "controlLogics", param: "safetyDoor", label: "Safety Door", unit: "bar" })}
                            style={{ ...getDeveloperStyle("settings_logic_safety_door", "SETPOINT"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between', paddingRight: '12px' }}>
                          <span className="som-logic-label">Auto Blowdown</span>
                          <ValBox
                            value={getLiveSettingVal('autoBlowdown', autoBlowdown, 'settings_logic_auto_blowdown', 'SETPOINT')}
                            decimals={2}
                            unit="bar"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_auto_blowdown", [], [{ key: "SETPOINT", label: "Auto Blowdown" }]) : () => setActiveKeypad({ section: "controlLogics", param: "autoBlowdown", label: "Auto Blowdown", unit: "bar" })}
                            style={{ ...getDeveloperStyle("settings_logic_auto_blowdown", "SETPOINT"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, paddingLeft: '12px' }}>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                          <span className="som-logic-label">Holding Pressure</span>
                          <ValBox
                            value={getLiveSettingVal('holdingPressure', holdingPressure, 'settings_logic_holding_pressure', 'SETPOINT')}
                            decimals={2}
                            unit="bar"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_holding_pressure", [], [{ key: "SETPOINT", label: "Holding Pressure" }]) : () => setActiveKeypad({ section: "controlLogics", param: "holdingPressure", label: "Holding Pressure", unit: "bar" })}
                            style={{ ...getDeveloperStyle("settings_logic_holding_pressure", "SETPOINT"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                          <span className="som-logic-label">Start to Step Cycle</span>
                          <ValBox
                            value={getLiveSettingVal('startToStepCycle', startToStepCycle, 'settings_logic_start_to_step_cycle', 'STEP')}
                            decimals={0}
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_start_to_step_cycle", [], [{ key: "STEP", label: "Start to Step Cycle" }]) : () => setActiveKeypad({ section: "controlLogics", param: "startToStepCycle", label: "Start to Step Cycle" })}
                            style={{ ...getDeveloperStyle("settings_logic_start_to_step_cycle", "STEP"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                          <span className="som-logic-label">Safety Pressure</span>
                          <ValBox
                            value={getLiveSettingVal('safetyPressure', safetyPressure, 'settings_logic_safety_pressure', 'SETPOINT')}
                            decimals={1}
                            unit="bar"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_safety_pressure", [], [{ key: "SETPOINT", label: "Safety Pressure" }]) : () => setActiveKeypad({ section: "controlLogics", param: "safetyPressure", label: "Safety Pressure", unit: "bar" })}
                            style={{ ...getDeveloperStyle("settings_logic_safety_pressure", "SETPOINT"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STERILIZER SEQUENCING */}
                  <div className="som-logic-section" style={{ marginTop: '4px' }}>
                    <h4 className="som-logic-section-title" style={{ color: '#ea580c', textTransform: 'uppercase' }}>Sterilizer Sequencing</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="som-logic-row" style={{ flex: 1, paddingRight: '12px', justifyContent: 'flex-start', gap: '40px' }}>
                        <span className="som-logic-label">On Step</span>
                        <ValBox
                          value={getLiveSettingVal('sequencingOnStep', sequencingOnStep, 'settings_logic_sequencing_on_step', 'STEP')}
                          decimals={0}
                          onClick={configMode ? () => handleEquipmentClick("settings_logic_sequencing_on_step", [], [{ key: "STEP", label: "Sequencing On Step" }]) : () => setActiveKeypad({ section: "sequencing", param: "sequencingOnStep", label: "Sequencing On Step" })}
                          style={{ ...getDeveloperStyle("settings_logic_sequencing_on_step", "STEP"), border: '1.5px solid #fcd34d' }}
                        />
                      </div>
                      <div className="som-logic-row" style={{ flex: 1, paddingLeft: '12px', justifyContent: 'flex-start', gap: '20px' }}>
                        <span className="som-logic-label">Stop - Step</span>
                        <ValBox
                          value={getLiveSettingVal('sequencingStopStep', sequencingStopStep, 'settings_logic_sequencing_stop_step', 'STEP')}
                          decimals={0}
                          onClick={configMode ? () => handleEquipmentClick("settings_logic_sequencing_stop_step", [], [{ key: "STEP", label: "Sequencing Stop Step" }]) : () => setActiveKeypad({ section: "sequencing", param: "sequencingStopStep", label: "Sequencing Stop Step" })}
                          style={{ ...getDeveloperStyle("settings_logic_sequencing_stop_step", "STEP"), border: '1.5px solid #fcd34d' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* TEMPERATURE OVERRIDING */}
                  <div className="som-logic-section" style={{ marginTop: '4px' }}>
                    <h4 className="som-logic-section-title" style={{ color: '#ea580c', textTransform: 'uppercase' }}>Temperature Overriding</h4>

                    {/* Row 1: Holding Step */}
                    <div className="som-logic-row" style={{ justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
                      <span className="som-logic-label">Holding Step</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ValBox
                          value={getLiveSettingVal('tempHoldingStepStart', tempHoldingStepStart, 'settings_logic_temp_holding_step_start', 'STEP')}
                          decimals={0}
                          onClick={configMode ? () => handleEquipmentClick("settings_logic_temp_holding_step_start", [], [{ key: "STEP", label: "Temp Holding Step Start" }]) : () => setActiveKeypad({ section: "tempOverriding", param: "tempHoldingStepStart", label: "Temp Holding Step Start" })}
                          style={{ ...getDeveloperStyle("settings_logic_temp_holding_step_start", "STEP"), border: '1.5px solid #fcd34d' }}
                        />
                        <span style={{ fontWeight: '800', color: '#64748b' }}>-</span>
                        <ValBox
                          value={getLiveSettingVal('tempHoldingStepStop', tempHoldingStepStop, 'settings_logic_temp_holding_step_stop', 'STEP')}
                          decimals={0}
                          onClick={configMode ? () => handleEquipmentClick("settings_logic_temp_holding_step_stop", [], [{ key: "STEP", label: "Temp Holding Step Stop" }]) : () => setActiveKeypad({ section: "tempOverriding", param: "tempHoldingStepStop", label: "Temp Holding Step Stop" })}
                          style={{ ...getDeveloperStyle("settings_logic_temp_holding_step_stop", "STEP"), border: '1.5px solid #fcd34d' }}
                        />
                      </div>
                    </div>

                    {/* Row 2: Temp Idle/Low & Time CON */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, paddingRight: '12px' }}>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                          <span className="som-logic-label">Temp Idle</span>
                          <ValBox
                            value={getLiveSettingVal('tempIdle', tempIdle, 'settings_logic_temp_idle', 'SETPOINT')}
                            decimals={1}
                            unit="°C"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_temp_idle", [], [{ key: "SETPOINT", label: "Temp Idle" }]) : () => setActiveKeypad({ section: "tempOverriding", param: "tempIdle", label: "Temp Idle", unit: "°C" })}
                            style={{ ...getDeveloperStyle("settings_logic_temp_idle", "SETPOINT"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                          <span className="som-logic-label">Temp Low</span>
                          <ValBox
                            value={getLiveSettingVal('tempLow', tempLow, 'settings_logic_temp_low', 'SETPOINT')}
                            decimals={1}
                            unit="°C"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_temp_low", [], [{ key: "SETPOINT", label: "Temp Low" }]) : () => setActiveKeypad({ section: "tempOverriding", param: "tempLow", label: "Temp Low", unit: "°C" })}
                            style={{ ...getDeveloperStyle("settings_logic_temp_low", "SETPOINT"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                      </div>

                      <div style={{ width: '1px', backgroundColor: '#cbd5e1', alignSelf: 'stretch' }}></div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, paddingLeft: '12px' }}>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                          <span className="som-logic-label">Time Open CON</span>
                          <ValBox
                            value={getLiveSettingVal('timeOpenCon', timeOpenCon, 'settings_logic_time_open_con', 'TIME')}
                            decimals={0}
                            unit="s"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_time_open_con", [], [{ key: "TIME", label: "Time Open CON" }]) : () => setActiveKeypad({ section: "tempOverriding", param: "timeOpenCon", label: "Time Open CON", unit: "s" })}
                            style={{ ...getDeveloperStyle("settings_logic_time_open_con", "TIME"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                        <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                          <span className="som-logic-label">Time Close CON</span>
                          <ValBox
                            value={getLiveSettingVal('timeCloseCon', timeCloseCon, 'settings_logic_time_close_con', 'TIME')}
                            decimals={0}
                            unit="s"
                            onClick={configMode ? () => handleEquipmentClick("settings_logic_time_close_con", [], [{ key: "TIME", label: "Time Close CON" }]) : () => setActiveKeypad({ section: "tempOverriding", param: "timeCloseCon", label: "Time Close CON", unit: "s" })}
                            style={{ ...getDeveloperStyle("settings_logic_time_close_con", "TIME"), border: '1.5px solid #fcd34d' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: High Temp */}
                    <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                      <span className="som-logic-label">High Temp</span>
                      <ValBox
                        value={getLiveSettingVal('highTemp', highTemp, 'settings_logic_high_temp', 'SETPOINT')}
                        decimals={1}
                        unit="°C"
                        onClick={configMode ? () => handleEquipmentClick("settings_logic_high_temp", [], [{ key: "SETPOINT", label: "High Temp" }]) : () => setActiveKeypad({ section: "tempOverriding", param: "highTemp", label: "High Temp", unit: "°C" })}
                        style={{ ...getDeveloperStyle("settings_logic_high_temp", "SETPOINT"), border: '1.5px solid #fcd34d' }}
                      />
                    </div>
                  </div>

                  {/* MAIN STEAM OVERRIDING */}
                  <div className="som-logic-section" style={{ marginTop: '4px' }}>
                    <h4 className="som-logic-section-title" style={{ color: '#ea580c', textTransform: 'uppercase' }}>Main Steam Overriding</h4>
                    <div className="som-logic-row" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="som-logic-label">Main Steam &lt;</span>
                        <ValBox
                          value={getLiveSettingVal('mainSteam', mainSteam, 'settings_logic_main_steam', 'SETPOINT')}
                          decimals={1}
                          unit="bar"
                          onClick={configMode ? () => handleEquipmentClick("settings_logic_main_steam", [], [{ key: "SETPOINT", label: "Main Steam <" }]) : () => setActiveKeypad({ section: "mainSteam", param: "mainSteam", label: "Main Steam <", unit: "bar" })}
                          style={{ ...getDeveloperStyle("settings_logic_main_steam", "SETPOINT"), border: '1.5px solid #fcd34d' }}
                        />
                      </div>
                      <span className="som-logic-result-label" style={{ fontWeight: '800', color: '#1e293b' }}>➔ Make-up Valve CLOSE</span>
                    </div>
                  </div>

                  {/* BPV SETTINGS */}
                  <div className="som-logic-section" style={{ marginTop: '4px' }}>
                    <h4 className="som-logic-section-title" style={{ color: '#ea580c', textTransform: 'uppercase' }}>BPV Settings</h4>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {/* Make-up Valve Position */}
                      <div style={{ flex: 1, border: '1px solid #cbd5e1', padding: '0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: '800', color: '#475569', padding: '4px 0', borderBottom: '1px solid #cbd5e1' }}>MAKE-UP VALVE POSITION</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '3px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center', width: '45%' }}>HIGH SET</td>
                              <td style={{ padding: '2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                                <ValBox value={getLiveSettingVal('bpvMakeupHigh', bpvMakeupHigh, 'settings_bpv_makeup_high', 'SETPOINT')} decimals={2} unit="Bar" onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_high", [], [{ key: "SETPOINT", label: "Make-up High Set" }]) : () => setActiveKeypad({ section: "bpvValves", param: "makeupHigh", label: "Make-up High Set", unit: "bar" })} style={{ ...getDeveloperStyle("settings_bpv_makeup_high", "SETPOINT"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center' }}>LOW SET</td>
                              <td style={{ padding: '2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                                <ValBox value={getLiveSettingVal('bpvMakeupLow', bpvMakeupLow, 'settings_bpv_makeup_low', 'SETPOINT')} decimals={2} unit="Bar" onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_low", [], [{ key: "SETPOINT", label: "Make-up Low Set" }]) : () => setActiveKeypad({ section: "bpvValves", param: "makeupLow", label: "Make-up Low Set", unit: "bar" })} style={{ ...getDeveloperStyle("settings_bpv_makeup_low", "SETPOINT"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center' }}>POSITION</td>
                              <td style={{ padding: '2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                                <ValBox value={getLiveSettingVal('bpvMakeupPosition', bpvMakeupPosition, 'settings_bpv_makeup_position', 'POSITION')} decimals={0} unit="%" onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_position", [], [{ key: "POSITION", label: "Make-up Position" }]) : () => setActiveKeypad({ section: "bpvValves", param: "makeupPosition", label: "Make-up Position", unit: "%" })} style={{ ...getDeveloperStyle("settings_bpv_makeup_position", "POSITION"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Limit High</td>
                              <td style={{ padding: '2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                                <ValBox value={getLiveSettingVal('bpvMakeupLimitHigh', bpvMakeupLimitHigh, 'settings_bpv_makeup_limit_high', 'SETPOINT')} decimals={0} unit="%" onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_limit_high", [], [{ key: "SETPOINT", label: "Make-up Limit High" }]) : () => setActiveKeypad({ section: "bpvValves", param: "makeupLimitHigh", label: "Make-up Limit High", unit: "%" })} style={{ ...getDeveloperStyle("settings_bpv_makeup_limit_high", "SETPOINT"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 8px', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Limit Low</td>
                              <td style={{ padding: '2px 4px' }}>
                                <ValBox value={getLiveSettingVal('bpvMakeupLimitLow', bpvMakeupLimitLow, 'settings_bpv_makeup_limit_low', 'SETPOINT')} decimals={0} unit="%" onClick={configMode ? () => handleEquipmentClick("settings_bpv_makeup_limit_low", [], [{ key: "SETPOINT", label: "Make-up Limit Low" }]) : () => setActiveKeypad({ section: "bpvValves", param: "makeupLimitLow", label: "Make-up Limit Low", unit: "%" })} style={{ ...getDeveloperStyle("settings_bpv_makeup_limit_low", "SETPOINT"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Surplus Valve Position */}
                      <div style={{ flex: 1, border: '1px solid #cbd5e1', padding: '0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: '800', color: '#475569', padding: '4px 0', borderBottom: '1px solid #cbd5e1' }}>SURPLUS VALVE POSITION</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '3px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center', width: '45%' }}>HIGH SET</td>
                              <td style={{ padding: '2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                                <ValBox value={getLiveSettingVal('bpvSurplusHigh', bpvSurplusHigh, 'settings_bpv_surplus_high', 'SETPOINT')} decimals={2} unit="Bar" onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_high", [], [{ key: "SETPOINT", label: "Surplus High Set" }]) : () => setActiveKeypad({ section: "bpvValves", param: "surplusHigh", label: "Surplus High Set", unit: "bar" })} style={{ ...getDeveloperStyle("settings_bpv_surplus_high", "SETPOINT"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center' }}>LOW SET</td>
                              <td style={{ padding: '2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                                <ValBox value={getLiveSettingVal('bpvSurplusLow', bpvSurplusLow, 'settings_bpv_surplus_low', 'SETPOINT')} decimals={2} unit="Bar" onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_low", [], [{ key: "SETPOINT", label: "Surplus Low Set" }]) : () => setActiveKeypad({ section: "bpvValves", param: "surplusLow", label: "Surplus Low Set", unit: "bar" })} style={{ ...getDeveloperStyle("settings_bpv_surplus_low", "SETPOINT"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center' }}>POSITION</td>
                              <td style={{ padding: '2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                                <ValBox value={getLiveSettingVal('bpvSurplusPosition', bpvSurplusPosition, 'settings_bpv_surplus_position', 'POSITION')} decimals={0} unit="%" onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_position", [], [{ key: "POSITION", label: "Surplus Position" }]) : () => setActiveKeypad({ section: "bpvValves", param: "surplusPosition", label: "Surplus Position", unit: "%" })} style={{ ...getDeveloperStyle("settings_bpv_surplus_position", "POSITION"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Limit High</td>
                              <td style={{ padding: '2px 4px', borderBottom: '1px solid #e2e8f0' }}>
                                <ValBox value={getLiveSettingVal('bpvSurplusLimitHigh', bpvSurplusLimitHigh, 'settings_bpv_surplus_limit_high', 'SETPOINT')} decimals={0} unit="%" onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_limit_high", [], [{ key: "SETPOINT", label: "Surplus Limit High" }]) : () => setActiveKeypad({ section: "bpvValves", param: "surplusLimitHigh", label: "Surplus Limit High", unit: "%" })} style={{ ...getDeveloperStyle("settings_bpv_surplus_limit_high", "SETPOINT"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 8px', borderRight: '1px solid #cbd5e1', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Limit Low</td>
                              <td style={{ padding: '2px 4px' }}>
                                <ValBox value={getLiveSettingVal('bpvSurplusLimitLow', bpvSurplusLimitLow, 'settings_bpv_surplus_limit_low', 'SETPOINT')} decimals={0} unit="%" onClick={configMode ? () => handleEquipmentClick("settings_bpv_surplus_limit_low", [], [{ key: "SETPOINT", label: "Surplus Limit Low" }]) : () => setActiveKeypad({ section: "bpvValves", param: "surplusLimitLow", label: "Surplus Limit Low", unit: "%" })} style={{ ...getDeveloperStyle("settings_bpv_surplus_limit_low", "SETPOINT"), width: '100%', border: '1.5px solid #fcd34d', height: '16px' }} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions matching bottom row in image */}
        <footer className="som-settings-footer-actions">
          <div className="som-footer-left-group">
            <button className="som-footer-btn som-btn-save-settings" onClick={handleSave} disabled={isSaving}>
              <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
                <path d="M433.9 129.9l-83.9-83.9A47.9 47.9 0 0 0 316.1 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V195.9c0-12.7-5.1-25-14.1-34zM224 416c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm96-304.8V192H128V111.2h192z" />
              </svg>
              {isSaving ? "Saving..." : "Save Setting"}
            </button>
            <button className="som-footer-btn som-btn-cancel-settings" onClick={handleBackToOverview}>
              <svg width="14" height="14" viewBox="0 0 352 512" fill="currentColor">
                <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z" />
              </svg>
              Cancel
            </button>
            <button className="som-footer-btn som-btn-restore-settings" onClick={handleRestoreDefault}>
              <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor">
                <path d="M485.5 285.5c-4.7-4.7-12.3-4.7-17 0L450 304c-35.3-35.3-84-56-138-56-106 0-192 86-192 192s86 192 192 192c82.3 0 152.9-52 179.9-125 2.7-7.4-1.1-15.5-8.5-18.2s-15.5 1.1-18.2 8.5C439 462.6 378.8 504 312 504c-88.4 0-160-71.6-160-160s71.6-160 160-160c45.1 0 85.8 18.7 115.3 48.7l-24.8 24.8c-4.7 4.7-4.7 12.3 0 17 4.7 4.7 12.3 4.7 17 0l46-46c4.7-4.7 4.7-12.3 0-17z" />
              </svg>
              Restore Default
            </button>
          </div>
          <div className="som-footer-right-group">
            <button className="som-footer-btn som-btn-export-settings" onClick={handleExport}>
              <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
                <path d="M384 128h-80V48c0-8.8-7.2-16-16-16h-128c-8.8 0-16 7.2-16 16v80H64c-35.3 0-64 28.7-64 64v224c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V192c0-35.3-28.7-64-64-64zm-144 240v64c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-64h-64c-8.8 0-16-7.2-16-16v-32c0-8.8 7.2-16 16-16h64v-64c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v64h64c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16h-64z" />
              </svg>
              Export Setting
            </button>
            <label className="som-footer-btn som-btn-import-settings" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
                <path d="M384 384H64v-80c0-8.8-7.2-16-16-16H16c-8.8 0-16 7.2-16 16v96c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64v-96c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v80zm-136-192V64c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v128h-64c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h224c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16h-64z" />
              </svg>
              Import Setting
              <input type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleImport} />
            </label>
          </div>
        </footer>
      </div>
      {/* Numeric Keypad */}
      {activeKeypad && (
        <NumericKeypad
          value={(() => {
            const kp = activeKeypad;
            if (kp.section === 'recipe') {
              const stepNum = currentLineSteps[kp.stepIdx]?.step;
              const live = getLiveRecipeVal(selectedLine, stepNum, kp.param);
              return live !== null ? live : currentLineSteps[kp.stepIdx][kp.param];
            }
            if (kp.section === 'scoreLogic') return getLiveScoreLogicVal(scoreLogics[kp.idx], "target");
            if (kp.section === 'capacity') {
              if (kp.param === 'designCapacity') return designCapacity;
              if (kp.param === 'numberSterilizer') return numberSterilizer;
              if (kp.param === 'millDesignCapacity') return millDesignCapacity;
              if (kp.param === 'overLimitTime') return overLimitTime;
              if (kp.param === 'overLimitScore') return overLimitScore;
            }
            if (kp.section === 'controlLogics') {
              if (kp.param === 'safetyDoor') return safetyDoor;
              if (kp.param === 'autoBlowdown') return autoBlowdown;
              if (kp.param === 'holdingPressure') return holdingPressure;
              if (kp.param === 'startToStepCycle') return startToStepCycle;
              if (kp.param === 'safetyPressure') return safetyPressure;
            }
            if (kp.section === 'sequencing') {
              if (kp.param === 'sequencingOnStep') return sequencingOnStep;
              if (kp.param === 'sequencingStopStep') return sequencingStopStep;
            }
            if (kp.section === 'tempOverriding') {
              if (kp.param === 'tempHoldingStepStart') return tempHoldingStepStart;
              if (kp.param === 'tempHoldingStepStop') return tempHoldingStepStop;
              if (kp.param === 'tempIdle') return tempIdle;
              if (kp.param === 'tempLow') return tempLow;
              if (kp.param === 'timeOpenCon') return timeOpenCon;
              if (kp.param === 'timeCloseCon') return timeCloseCon;
              if (kp.param === 'highTemp') return highTemp;
            }
            if (kp.section === 'mainSteam') {
              if (kp.param === 'mainSteam') return mainSteam;
            }
            if (kp.section === 'bpvValves') {
              if (kp.param === 'makeupHigh') return bpvMakeupHigh;
              if (kp.param === 'makeupLow') return bpvMakeupLow;
              if (kp.param === 'makeupPosition') return bpvMakeupPosition;
              if (kp.param === 'makeupLimitHigh') return bpvMakeupLimitHigh;
              if (kp.param === 'makeupLimitLow') return bpvMakeupLimitLow;
              if (kp.param === 'surplusHigh') return bpvSurplusHigh;
              if (kp.param === 'surplusLow') return bpvSurplusLow;
              if (kp.param === 'surplusPosition') return bpvSurplusPosition;
              if (kp.param === 'surplusLimitHigh') return bpvSurplusLimitHigh;
              if (kp.param === 'surplusLimitLow') return bpvSurplusLimitLow;
            }
            return 0;
          })()}
          label={activeKeypad.label}
          unit={activeKeypad.unit || ''}
          onClose={() => setActiveKeypad(null)}
          onConfirm={handleKeypadConfirm}
        />
      )}
    </section>
  );
}

// ==========================================
// NumericKeypad Component
// ==========================================
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return '0';
  });

  const handleNumber = (n) => {
    setDisplayValue(prev => (prev === '0' ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => { if (!displayValue.includes('.')) setDisplayValue(displayValue + '.'); };
  const handleBack = () => setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  const handleEnter = () => onConfirm(parseFloat(displayValue) || 0);

  const btnStyle = { padding: '14px', fontSize: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
            <button key={n} onClick={() => handleNumber(n)} style={btnStyle}>{n}</button>
          ))}
          <button onClick={handleDecimal} style={btnStyle}>.</button>
          <button onClick={() => handleNumber(0)} style={btnStyle}>0</button>
          <button onClick={handleBack} style={{ ...btnStyle, background: '#f1f5f9' }}>⌫</button>
          <button onClick={() => setDisplayValue('0')} style={{ gridColumn: 'span 1', padding: '12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
          <button onClick={handleEnter} style={{ gridColumn: 'span 2', padding: '12px', background: '#F59E0B', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>ENTER</button>
        </div>
      </div>
    </div>,
    document.body
  );
}


// Calculations helper
function getTotals(localRecipes, lineNum, getLiveRecipeVal) {
  const lineSteps = localRecipes[lineNum] || [];
  let unfSter = 0, nrmSter = 0, wetSter = 0;
  let unfCycle = 0, nrmCycle = 0, wetCycle = 0;

  lineSteps.forEach((s, idx) => {
    const getVal = (field) => {
      if (getLiveRecipeVal) {
        const live = getLiveRecipeVal(lineNum, s.step, field);
        if (live !== null && live !== "No Tag" && live !== "--" && !isNaN(Number(live))) {
          return Number(live);
        }
      }
      return 0;
    };

    const unf = getVal("unf");
    const nrm = getVal("nrm");
    const wet = getVal("wet");

    unfCycle += unf;
    nrmCycle += nrm;
    wetCycle += wet;

    if (idx < lineSteps.length - 1) {
      unfSter += unf;
      nrmSter += nrm;
      wetSter += wet;
    }
  });

  return {
    unfSter, nrmSter, wetSter,
    unfCycle, nrmCycle, wetCycle,
    steril: { unf: unfSter, nrm: nrmSter, wet: wetSter },
    cycle: { unf: unfCycle, nrm: nrmCycle, wet: wetCycle }
  };
}

export default SterilizerStationSettingsPage;
