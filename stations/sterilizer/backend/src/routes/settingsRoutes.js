import { Router } from 'express';
import { dbPool, dbPoolPlc } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';
import { writeTagDirect } from '../plcCollector.js';

const router = Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

// Auto-create settings tables if they don't exist
async function initDb() {
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS recipe_settings (
        category VARCHAR(50) NOT NULL,
        line_number INT NOT NULL,
        step_number INT NOT NULL,
        unf INT DEFAULT 0,
        nrm INT DEFAULT 0,
        wet INT DEFAULT 0,
        inl SMALLINT DEFAULT 0,
        con SMALLINT DEFAULT 0,
        exh SMALLINT DEFAULT 0,
        bar VARCHAR(20) DEFAULT '0.00',
        mode VARCHAR(20) DEFAULT 'OFF',
        door_in VARCHAR(20) DEFAULT 'Close',
        door_out VARCHAR(20) DEFAULT 'Close',
        inl1 SMALLINT DEFAULT 0,
        inl2 SMALLINT DEFAULT 0,
        dinl SMALLINT DEFAULT 0,
        rcon SMALLINT DEFAULT 0,
        dcon SMALLINT DEFAULT 0,
        PRIMARY KEY (category, line_number, step_number)
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS station_parameters (
        param_key VARCHAR(100) PRIMARY KEY,
        param_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[station-settings] Database tables recipe_settings and station_parameters checked/created.');
  } catch (err) {
    console.error('[station-settings] Failed to create settings tables:', err.message);
  }
}
initDb();

router.use(requireAuth);

// GET /api/{station}/settings/thresholds
router.get('/thresholds', async (_req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM threshold_settings ORDER BY parameter_key ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/thresholds (Upsert single threshold)
router.post('/thresholds', authorize(['developer', 'admin']), async (req, res) => {
  const { parameter_key, lower_val, warning_val, danger_val, unit } = req.body;
  try {
    await dbPool.query(
      `INSERT INTO threshold_settings (parameter_key, lower_val, warning_val, danger_val, unit)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE lower_val=?, warning_val=?, danger_val=?, unit=?`,
      [parameter_key, lower_val, warning_val, danger_val, unit, lower_val, warning_val, danger_val, unit]
    );
    
    // Log activity
    if (req.user && req.user.userRole !== 'developer') {
      await dbPool.query(
        "INSERT INTO agrovision_auth.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, `Updated threshold for parameter ${parameter_key} in Sterilizer`, getClientIp(req), req.headers['user-agent']]
      ).catch((err) => console.error('[SettingLog] Error:', err));
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/settings/recipes-and-params
router.get('/recipes-and-params', async (_req, res) => {
  try {
    const [recipeRows] = await dbPool.query('SELECT * FROM recipe_settings ORDER BY category, line_number, step_number');
    const [paramRows] = await dbPool.query('SELECT * FROM station_parameters');
    
    // Fetch live PLC values for mapped settings
    const [mappedValues] = await dbPoolPlc.query(`
      SELECT m.equipment, m.signal_key, l.value 
      FROM station_tag_mappings m 
      JOIN plc_tag_latest l ON m.tag_id = l.tag_id
      WHERE m.station = 'sterilizer'
    `);

    const recipes = {
      ripe: { 1: [], 2: [], 3: [], 4: [] },
      unripe: { 1: [], 2: [], 3: [], 4: [] },
      overripe: { 1: [], 2: [], 3: [], 4: [] }
    };

    recipeRows.forEach(row => {
      const cat = row.category;
      const line = row.line_number;
      if (recipes[cat] && recipes[cat][line]) {
        recipes[cat][line].push({
          step: row.step_number,
          unf: row.unf,
          nrm: row.nrm,
          wet: row.wet,
          inl: row.inl === 1,
          inl1: row.inl1 === 1,
          inl2: row.inl2 === 1,
          dinl: row.dinl === 1,
          con: row.con === 1,
          rcon: row.rcon === 1,
          dcon: row.dcon === 1,
          exh: row.exh === 1,
          bar: row.bar,
          mode: row.mode,
          doorIn: row.door_in,
          doorOut: row.door_out
        });
      }
    });

    const parameters = {};
    paramRows.forEach(row => {
      try {
        parameters[row.param_key] = JSON.parse(row.param_value);
      } catch {
        parameters[row.param_key] = row.param_value;
      }
    });

    res.json({
      success: true,
      data: {
        recipes: recipeRows.length > 0 ? recipes : null,
        parameters: paramRows.length > 0 ? parameters : null,
        mappedValues: mappedValues.length > 0 ? mappedValues : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/recipes-and-params
router.post('/recipes-and-params', authorize(['developer', 'admin', 'general_manager', 'mill_manager', 'supervisor', 'operator']), async (req, res) => {
  const { recipes, parameters, activeCategory, editedKeys } = req.body;
  console.log('[Settings-POST] Received request with activeCategory:', activeCategory, 'editedKeys:', editedKeys);
  const connection = await dbPool.getConnection();
  try {
    // 1. Fetch old data to compute diffs
    const [oldRecipeRows] = await connection.query('SELECT * FROM recipe_settings');
    const oldRecipesMap = {};
    oldRecipeRows.forEach(r => oldRecipesMap[`${r.category}_${r.line_number}_${r.step_number}`] = r);

    const [oldParamRows] = await connection.query('SELECT param_key, param_value FROM station_parameters');
    const oldParamsMap = {};
    oldParamRows.forEach(r => oldParamsMap[r.param_key] = r.param_value);

    let changes = [];
    const plcErrors = [];

    await connection.beginTransaction();

    if (recipes) {
      // 2. Fetch PLC tag mappings to enable direct write
      const [mappingRows] = await dbPoolPlc.query(
        "SELECT equipment, signal_key, tag_id FROM station_tag_mappings WHERE station = 'sterilizer' AND tag_id IS NOT NULL"
      );
      const mappings = {};
      mappingRows.forEach((row) => {
        mappings[`${row.equipment}__${row.signal_key}`] = row.tag_id;
      });

      // 3. Fetch current live PLC tag values to compare against new inputs
      const [liveTagRows] = await dbPoolPlc.query(
        `SELECT m.equipment, m.signal_key, l.value 
         FROM station_tag_mappings m 
         JOIN plc_tag_latest l ON m.tag_id = l.tag_id
         WHERE m.station = 'sterilizer'`
      );
      const livePlcMap = {};
      liveTagRows.forEach(row => {
        livePlcMap[`${row.equipment}__${row.signal_key}`] = row.value;
      });

      const categories = ['ripe', 'unripe', 'overripe'];
      const insertValues = [];
      const writeTasks = [];

      console.log('[Settings-POST] Recipe Payload mappings in DB:', mappings);
      console.log('[Settings-POST] Category loop starting. Received recipes keys:', Object.keys(recipes));

      categories.forEach(cat => {
        const catRecipes = recipes[cat];
        if (catRecipes) {
          for (let line = 1; line <= 4; line++) {
            const steps = catRecipes[line];
            if (Array.isArray(steps)) {
              steps.forEach(step => {
                // Map the 7 frontend valves to the 3 basic DB columns
                const stepInl1 = step.inl1 ? 1 : 0;
                const stepInl2 = step.inl2 ? 1 : 0;
                const stepDinl = step.dinl ? 1 : 0;
                const stepCon = step.con ? 1 : 0;
                const stepRcon = step.rcon ? 1 : 0;
                const stepDcon = step.dcon ? 1 : 0;
                const stepExh = step.exh ? 1 : 0;

                const newInl = (stepInl1 || stepInl2 || stepDinl) ? 1 : 0;
                const newCon = (stepCon || stepRcon || stepDcon) ? 1 : 0;
                const newExh = stepExh;

                const newBar = String(step.bar !== undefined && step.bar !== null ? step.bar : '0.00');
                const newMode = String(step.mode || 'OFF');
                const newNrm = Number(step.nrm) || 0;
                const newUnf = Number(step.unf) || 0;
                const newWet = Number(step.wet) || 0;
                const newDoorIn = String(step.doorIn || 'Close');
                const newDoorOut = String(step.doorOut || 'Close');

                insertValues.push([
                   cat, line, step.step, newUnf, newNrm, newWet, newInl, newCon, newExh, newBar, newMode, newDoorIn, newDoorOut,
                   stepInl1, stepInl2, stepDinl, stepRcon, stepDcon
                ]);

                // Key for DB diff check
                const key = `${cat}_${line}_${step.step}`;
                const oldR = oldRecipesMap[key];
                const catLabel = cat === 'ripe' ? 'NORMAL' : cat === 'unripe' ? 'UNRIPE' : 'OVERRIPE';

                // ONLY record diffs for the category that is currently active in the UI
                if (cat === activeCategory) {
                  const isExplicitlyEdited = (fieldName) => {
                    if (Array.isArray(editedKeys) && editedKeys.length > 0 && fieldName) {
                      return editedKeys.includes(`${line}_${step.step}_${fieldName}`);
                    }
                    return true;
                  };

                  if (!oldR) {
                    if (isExplicitlyEdited()) {
                      changes.push(`Added Recipe ${catLabel} Line ${line} Step ${step.step}`);
                    }
                  } else {
                    let stepChanges = [];
                    if (isExplicitlyEdited('nrm') && parseFloat(oldR.nrm || 0) !== parseFloat(newNrm || 0)) stepChanges.push(`NRM ${oldR.nrm}->${newNrm}`);
                    if (isExplicitlyEdited('unf') && parseFloat(oldR.unf || 0) !== parseFloat(newUnf || 0)) stepChanges.push(`UNF ${oldR.unf}->${newUnf}`);
                    if (isExplicitlyEdited('wet') && parseFloat(oldR.wet || 0) !== parseFloat(newWet || 0)) stepChanges.push(`WET ${oldR.wet}->${newWet}`);
                    if (isExplicitlyEdited('bar') && parseFloat(oldR.bar || 0) !== parseFloat(newBar || 0)) stepChanges.push(`BAR ${oldR.bar}->${newBar}`);
                    if (isExplicitlyEdited('con') && Number(oldR.con || 0) !== Number(newCon || 0)) stepChanges.push(`CON ${oldR.con}->${newCon}`);
                    if (isExplicitlyEdited('inl') && Number(oldR.inl || 0) !== Number(newInl || 0)) stepChanges.push(`INL ${oldR.inl}->${newInl}`);
                    if (isExplicitlyEdited('exh') && Number(oldR.exh || 0) !== Number(newExh || 0)) stepChanges.push(`EXH ${oldR.exh}->${newExh}`);

                    if (stepChanges.length > 0) changes.push(`Recipe ${catLabel} Line ${line} Step ${step.step} (${stepChanges.join(', ')})`);
                  }
                }

                // Compile PLC Write Tasks by comparing incoming fields against live PLC values
                const eq = `recipe_line_${line}_step_${step.step}`;
                
                const checkAndQueueWrite = (fieldEq, signal, newVal, fieldName) => {
                  const mapKey = `${fieldEq}__${signal}`;
                  let tagId = mappings[mapKey];
                  // If specific valve cell is not mapped yet, fallback to tag 631 (TES_SETTINGS2) for testing/demo
                  if (!tagId && signal === 'VALVE') {
                    tagId = 631;
                  }
                  if (!tagId) return; // No mapping, skip

                  // Strict filter: If editedKeys was provided by frontend, ONLY queue write if this specific line_step_field was edited by the user!
                  if (Array.isArray(editedKeys) && editedKeys.length > 0 && fieldName) {
                    const pendingKey = `${line}_${step.step}_${fieldName}`;
                    if (!editedKeys.includes(pendingKey)) {
                      return; // User did NOT touch this field, skip sending write to PLC!
                    }
                  }

                  const rawLive = livePlcMap[mapKey];
                  let shouldWrite = false;
                  const isInvertedExh13 = signal === 'VALVE' && fieldName === 'exh' && Number(step.step) === 13;

                  if (rawLive !== undefined) {
                    if (signal === 'VALVE') {
                      let liveBool = rawLive === true || rawLive === 'true' || rawLive === 1 || rawLive === '1' || rawLive === 'OPEN';
                      if (isInvertedExh13) {
                        liveBool = !liveBool;
                      }
                      const newBool = newVal === true || newVal === 'true' || newVal === 1 || newVal === '1' || newVal === 'OPEN';
                      shouldWrite = liveBool !== newBool;
                    } else if (signal === 'VALVE_MODE') {
                      let liveMode = 0;
                      if (rawLive === 1 || rawLive === '1' || String(rawLive).toUpperCase() === 'HIGH' || rawLive === 'Above') liveMode = 1;
                      else if (rawLive === 2 || rawLive === '2' || String(rawLive).toUpperCase() === 'LOW' || rawLive === 'Below') liveMode = 2;

                      let newMode = 0;
                      if (newVal === 1 || newVal === '1' || String(newVal).toUpperCase() === 'HIGH' || newVal === 'Above') newMode = 1;
                      else if (newVal === 2 || newVal === '2' || String(newVal).toUpperCase() === 'LOW' || newVal === 'Below') newMode = 2;

                      shouldWrite = liveMode !== newMode;
                    } else {
                      shouldWrite = Number(rawLive) !== Number(newVal);
                    }
                  } else {
                    // If tagId exists or fallback, write since user explicitly edited it
                    shouldWrite = true;
                  }

                  if (shouldWrite) {
                    let plcVal = newVal;
                    if (signal === 'VALVE') {
                      const isLogicalOpen = (newVal === true || newVal === 1 || String(newVal).toUpperCase() === 'OPEN');
                      if (isInvertedExh13) {
                        plcVal = isLogicalOpen ? 0 : 1;
                      } else {
                        plcVal = isLogicalOpen ? 1 : 0;
                      }
                    } else if (signal === 'VALVE_MODE') {
                      const upper = String(newVal).toUpperCase();
                      plcVal = (upper === 'HIGH' || upper === 'ABOVE' || newVal === 1 || newVal === '1') ? 1 : (upper === 'LOW' || upper === 'BELOW' || newVal === 2 || newVal === '2') ? 2 : 0;
                    } else {
                      plcVal = Number(newVal);
                    }
                    
                    writeTasks.push({ tagId, val: plcVal });
                  }
                };

                // Only queue writes to PLC for the active category being edited in the frontend UI
                if (cat === activeCategory) {
                  // Queue writes ONLY for explicitly edited settings
                  checkAndQueueWrite(`${eq}_press`, 'SETPOINT', newBar, 'bar');
                  checkAndQueueWrite(`${eq}_nrm`, 'DURATION', newNrm, 'nrm');
                  checkAndQueueWrite(`${eq}_unf`, 'DURATION', newUnf, 'unf');
                  checkAndQueueWrite(`${eq}_wet`, 'DURATION', newWet, 'wet');
                  checkAndQueueWrite(`${eq}_mode`, 'VALVE_MODE', newMode, 'mode');

                  checkAndQueueWrite(`${eq}_inl1`, 'VALVE', stepInl1, 'inl1');
                  checkAndQueueWrite(`${eq}_inl2`, 'VALVE', stepInl2, 'inl2');
                  checkAndQueueWrite(`${eq}_dinl`, 'VALVE', stepDinl, 'dinl');
                  checkAndQueueWrite(`${eq}_con`, 'VALVE', stepCon, 'con');
                  checkAndQueueWrite(`${eq}_rcon`, 'VALVE', stepRcon, 'rcon');
                  checkAndQueueWrite(`${eq}_dcon`, 'VALVE', stepDcon, 'dcon');
                  checkAndQueueWrite(`${eq}_exh`, 'VALVE', stepExh, 'exh');
                  
                  const newDoorInVal = newDoorIn === 'Open' ? 1 : 0;
                  const newDoorOutVal = newDoorOut === 'Open' ? 1 : 0;
                  checkAndQueueWrite(`${eq}_doorIn`, 'VALVE', newDoorInVal, 'doorIn');
                  checkAndQueueWrite(`${eq}_doorOut`, 'VALVE', newDoorOutVal, 'doorOut');
                }
              });
            }
          }
        }
      });

      console.log('[Settings-POST] Write tasks generated:', writeTasks);

      // Execute PLC Writes (graceful fallback if PLC is offline/disconnected)
      for (const task of writeTasks) {
        try {
          console.log(`[Settings-POST] Calling writeTagDirect for tag ${task.tagId} with value ${task.val}`);
          await writeTagDirect(task.tagId, task.val);
        } catch (err) {
          console.warn(`[Settings-POST] writeTagDirect warning for tag ${task.tagId}:`, err.message);
          plcErrors.push(`Tag ${task.tagId}: ${err.message}`);
        }
      }

      if (insertValues.length > 0) {
        await connection.query(`
          INSERT INTO recipe_settings (category, line_number, step_number, unf, nrm, wet, inl, con, exh, bar, mode, door_in, door_out, inl1, inl2, dinl, rcon, dcon)
          VALUES ?
          ON DUPLICATE KEY UPDATE
            unf = VALUES(unf),
            nrm = VALUES(nrm),
            wet = VALUES(wet),
            inl = VALUES(inl),
            con = VALUES(con),
            exh = VALUES(exh),
            bar = VALUES(bar),
            mode = VALUES(mode),
            door_in = VALUES(door_in),
            door_out = VALUES(door_out),
            inl1 = VALUES(inl1),
            inl2 = VALUES(inl2),
            dinl = VALUES(dinl),
            rcon = VALUES(rcon),
            dcon = VALUES(dcon)
        `, [insertValues]);
      }
    }

    if (parameters && typeof parameters === 'object') {
      const insertParams = [];
      Object.entries(parameters).forEach(([key, val]) => {
        let valToSave = val;
        // Strip live telemetry 'actual' from scoreLogics
        if (key === 'scoreLogics' && Array.isArray(val)) {
          valToSave = val.map(item => {
            if (item && typeof item === 'object') {
              const { actual, ...rest } = item;
              return rest;
            }
            return item;
          });
        }

        const newStr = typeof valToSave === 'object' ? JSON.stringify(valToSave) : String(valToSave !== undefined && valToSave !== null ? valToSave : '');
        insertParams.push([key, newStr]);
        
        // Strict diff check
        const oldStr = oldParamsMap[key];
        let isDifferent = false;
        let diffDetail = '';

        if (oldStr === undefined || oldStr === null) {
          isDifferent = true;
          diffDetail = `(set to ${newStr.length > 40 ? newStr.substring(0, 37) + '...' : newStr})`;
        } else if (oldStr !== newStr) {
          const oldNum = Number(oldStr);
          const newNum = Number(newStr);
          if (!isNaN(oldNum) && !isNaN(newNum) && typeof valToSave !== 'object') {
            if (oldNum !== newNum) {
              isDifferent = true;
              diffDetail = `(${oldNum}->${newNum})`;
            }
          } else if (key === 'scoreLogics' || typeof valToSave === 'object') {
            try {
              const oldParsed = typeof oldStr === 'string' ? JSON.parse(oldStr) : oldStr;
              const oldClean = Array.isArray(oldParsed) 
                ? oldParsed.map(item => item && typeof item === 'object' ? (({ actual, ...rest }) => rest)(item) : item)
                : oldParsed;
              
              const cleanOldStr = JSON.stringify(oldClean);
              const cleanNewStr = JSON.stringify(valToSave);

              if (cleanOldStr !== cleanNewStr) {
                isDifferent = true;
                diffDetail = 'updated';
              }
            } catch {
              if (String(oldStr).trim() !== newStr.trim()) {
                isDifferent = true;
                diffDetail = 'updated';
              }
            }
          } else {
            if (String(oldStr).trim() !== newStr.trim()) {
              isDifferent = true;
              diffDetail = `(${oldStr}->${newStr})`;
            }
          }
        }

        if (isDifferent) {
          changes.push(`Param ${key} ${diffDetail}`);
        }
      });

      if (insertParams.length > 0) {
        await connection.query(`
          INSERT INTO station_parameters (param_key, param_value)
          VALUES ?
          ON DUPLICATE KEY UPDATE param_value = VALUES(param_value)
        `, [insertParams]);
      }

      // Fetch PLC tag mappings to execute writes
      const [allTagMappings] = await dbPoolPlc.query(
        "SELECT equipment, signal_key, tag_id FROM station_tag_mappings WHERE station = 'sterilizer' AND tag_id IS NOT NULL"
      );
      const allTagMap = {};
      allTagMappings.forEach(row => {
        allTagMap[`${row.equipment}__${row.signal_key}`] = row.tag_id;
      });

      // 1. Write scoreLogics TARGET values directly to PLC (only for modified rows)
      let oldScoreLogicsMap = {};
      if (oldParamsMap.scoreLogics) {
        try {
          const parsedOld = typeof oldParamsMap.scoreLogics === 'string' ? JSON.parse(oldParamsMap.scoreLogics) : oldParamsMap.scoreLogics;
          if (Array.isArray(parsedOld)) {
            parsedOld.forEach(r => {
              if (r.param !== undefined && r.target !== undefined) {
                oldScoreLogicsMap[r.param] = Number(r.target);
              }
            });
          }
        } catch {}
      }

      if (parameters && parameters.scoreLogics && Array.isArray(parameters.scoreLogics)) {
        for (const row of parameters.scoreLogics) {
          if (row.param === undefined || row.target === undefined) continue;

          // Diff check: ONLY write to PLC if target value was actually modified
          const oldTarget = oldScoreLogicsMap[row.param];
          const newTarget = Number(row.target);
          if (oldTarget !== undefined && oldTarget === newTarget) {
            continue; // Unchanged, skip PLC write
          }

          const mapKey = `settings_score_logic_${row.param}_target__TARGET`;
          const tagId = allTagMap[mapKey];
          if (!tagId) continue;
          try {
            console.log(`[Settings-POST] Writing changed scoreLogic TARGET: ${row.param} = ${row.target} (tag ${tagId})`);
            await writeTagDirect(tagId, newTarget);
          } catch (err) {
            console.warn(`[Settings-POST] scoreLogic write warning for ${row.param}:`, err.message);
            plcErrors.push(`ScoreLogic ${row.param}: ${err.message}`);
          }
        }
      }

      // 2. Write standard settings (Control Logics, BPV Settings, Capacity) directly to PLC (only for modified values)
      const paramToEqMap = {
        designCapacity: "settings_capacity_design_capacity",
        numberSterilizer: "settings_capacity_number_sterilizer",
        millDesignCapacity: "settings_capacity_mill_design_capacity",
        overLimitTime: "settings_tolerance_over_limit_time",
        overLimitScore: "settings_tolerance_over_limit_score",
        safetyDoor: "settings_logic_safety_door",
        holdingPressure: "settings_logic_holding_pressure",
        autoBlowdown: "settings_logic_auto_blowdown",
        startToStepCycle: "settings_logic_start_to_step_cycle",
        safetyPressure: "settings_logic_safety_pressure",
        sequencingOnStep: "settings_logic_sequencing_on_step",
        sequencingStopStep: "settings_logic_sequencing_stop_step",
        tempHoldingStepStart: "settings_logic_temp_holding_step_start",
        tempHoldingStepStop: "settings_logic_temp_holding_step_stop",
        tempIdle: "settings_logic_temp_idle",
        tempLow: "settings_logic_temp_low",
        timeOpenCon: "settings_logic_time_open_con",
        timeCloseCon: "settings_logic_time_close_con",
        highTemp: "settings_logic_high_temp",
        mainSteam: "settings_logic_main_steam",
        bpvMakeupHigh: "settings_bpv_makeup_high",
        bpvMakeupLow: "settings_bpv_makeup_low",
        bpvMakeupPosition: "settings_bpv_makeup_position",
        bpvMakeupLimitHigh: "settings_bpv_makeup_limit_high",
        bpvMakeupLimitLow: "settings_bpv_makeup_limit_low",
        bpvSurplusHigh: "settings_bpv_surplus_high",
        bpvSurplusLow: "settings_bpv_surplus_low",
        bpvSurplusPosition: "settings_bpv_surplus_position",
        bpvSurplusLimitHigh: "settings_bpv_surplus_limit_high",
        bpvSurplusLimitLow: "settings_bpv_surplus_limit_low"
      };

      const paramToSigMap = {
        designCapacity: "DESIGN_CAPACITY",
        numberSterilizer: "NUMBER_STERILIZER",
        millDesignCapacity: "MILL_DESIGN_CAPACITY",
        overLimitTime: "TIME",
        overLimitScore: "SCORE",
        safetyDoor: "SETPOINT",
        holdingPressure: "SETPOINT",
        autoBlowdown: "SETPOINT",
        startToStepCycle: "STEP",
        safetyPressure: "SETPOINT",
        sequencingOnStep: "STEP",
        sequencingStopStep: "STEP",
        tempHoldingStepStart: "STEP",
        tempHoldingStepStop: "STEP",
        tempIdle: "SETPOINT",
        tempLow: "SETPOINT",
        timeOpenCon: "TIME",
        timeCloseCon: "TIME",
        highTemp: "SETPOINT",
        mainSteam: "SETPOINT",
        bpvMakeupHigh: "SETPOINT",
        bpvMakeupLow: "SETPOINT",
        bpvMakeupPosition: "POSITION",
        bpvMakeupLimitHigh: "SETPOINT",
        bpvMakeupLimitLow: "SETPOINT",
        bpvSurplusHigh: "SETPOINT",
        bpvSurplusLow: "SETPOINT",
        bpvSurplusPosition: "POSITION",
        bpvSurplusLimitHigh: "SETPOINT",
        bpvSurplusLimitLow: "SETPOINT"
      };

      for (const [key, val] of Object.entries(parameters)) {
        if (paramToEqMap[key] && val !== null && val !== undefined) {
          // Diff check: ONLY write to PLC if value was actually modified
          const oldVal = oldParamsMap[key];
          if (oldVal !== undefined && String(oldVal).trim() === String(val).trim()) {
            continue; // Unchanged parameter, skip PLC write
          }

          const sig = paramToSigMap[key] || (key.includes('Position') ? 'POSITION' : 'SETPOINT');
          const mapKey = `${paramToEqMap[key]}__${sig}`;
          const tagId = allTagMap[mapKey];
          if (tagId) {
            try {
              console.log(`[Settings-POST] Writing changed parameter ${key}: ${oldVal} -> ${val} (tag ${tagId}, mapKey ${mapKey})`);
              await writeTagDirect(tagId, Number(val));
            } catch (err) {
              console.warn(`[Settings-POST] parameter write warning for ${key}:`, err.message);
              plcErrors.push(`Parameter ${key}: ${err.message}`);
            }
          }
        }
      }
    }

    await connection.commit();
    
    // Log activity (for all non-dev user accounts)
    const isDev = (req.user?.username || '').toLowerCase() === 'dev' || (req.user?.userRole || '').toLowerCase() === 'developer';
    if (req.user && !isDev && changes.length > 0) {
      let desc = changes.join(' | ');
      if (desc.length > 1000) desc = desc.substring(0, 997) + '...';
      
      await dbPool.query(
        "INSERT INTO activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, desc, getClientIp(req), req.headers['user-agent']]
      ).catch((err) => console.error('[SettingLog] Error:', err));
    }
    
    res.json({ 
      success: true,
      plcWarnings: plcErrors.length > 0 ? plcErrors : undefined
    });
  } catch (err) {
    console.error('Settings save error:', err);
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

export default router;
