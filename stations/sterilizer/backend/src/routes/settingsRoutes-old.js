import { Router } from 'express';
import { dbPool, dbPoolPlc } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';
import { writeTagDirect } from '../plcCollector.js';

const router = Router();

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
        [req.user.userId, req.user.username, `Updated threshold for parameter ${parameter_key} in Sterilizer`, req.ip, req.headers['user-agent']]
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
    const [mappedValues] = await dbPool.query(`
      SELECT m.equipment, m.signal_key, l.value 
      FROM station_tag_mappings m 
      JOIN plc_tag_latest l ON m.tag_id = l.tag_id
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
router.post('/recipes-and-params', authorize(['developer', 'admin']), async (req, res) => {
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

                const newBar = step.bar || '0.00';
                const newMode = step.mode || 'OFF';
                const newNrm = step.nrm || 0;
                const newUnf = step.unf || 0;
                const newWet = step.wet || 0;
                const newDoorIn = step.doorIn || 'Close';
                const newDoorOut = step.doorOut || 'Close';

                insertValues.push([
                   cat, line, step.step, newUnf, newNrm, newWet, newInl, newCon, newExh, newBar, newMode, newDoorIn, newDoorOut,
                   stepInl1, stepInl2, stepDinl, stepRcon, stepDcon
                ]);

                // Key for DB diff check
                const key = `${cat}_${line}_${step.step}`;
                const oldR = oldRecipesMap[key];
                if (!oldR) {
                  changes.push(`Added Recipe ${cat.toUpperCase()} L${line} S${step.step}`);
                } else {
                  let stepChanges = [];
                  if (oldR.nrm != newNrm) stepChanges.push(`NRM ${oldR.nrm}->${newNrm}`);
                  if (oldR.unf != newUnf) stepChanges.push(`UNF ${oldR.unf}->${newUnf}`);
                  if (oldR.wet != newWet) stepChanges.push(`WET ${oldR.wet}->${newWet}`);
                  if (oldR.bar != newBar) stepChanges.push(`BAR ${oldR.bar}->${newBar}`);
                  if (oldR.con != newCon) stepChanges.push(`CON ${oldR.con}->${newCon}`);
                  if (oldR.inl != newInl) stepChanges.push(`INL ${oldR.inl}->${newInl}`);
                  if (oldR.exh != newExh) stepChanges.push(`EXH ${oldR.exh}->${newExh}`);
                  if (stepChanges.length > 0) changes.push(`Recipe ${cat.toUpperCase()} L${line} S${step.step} (${stepChanges.join(', ')})`);
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
                  if (rawLive !== undefined) {
                    if (signal === 'VALVE') {
                      const liveBool = rawLive === true || rawLive === 'true' || rawLive === 1 || rawLive === '1' || rawLive === 'OPEN';
                      const newBool = newVal === true || newVal === 'true' || newVal === 1 || newVal === '1' || newVal === 'OPEN';
                      shouldWrite = liveBool !== newBool;
                    } else if (signal === 'VALVE_MODE') {
                      let liveMode = 0;
                      if (rawLive === 1 || rawLive === '1' || rawLive === 'Below') liveMode = 1;
                      else if (rawLive === 2 || rawLive === '2' || rawLive === 'Above') liveMode = 2;

                      let newMode = 0;
                      if (newVal === 1 || newVal === '1' || newVal === 'Below') newMode = 1;
                      else if (newVal === 2 || newVal === '2' || newVal === 'Above') newMode = 2;

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
                    if (signal === 'VALVE') plcVal = (newVal === true || newVal === 1 || String(newVal).toUpperCase() === 'OPEN') ? 1 : 0;
                    else if (signal === 'VALVE_MODE') plcVal = (newVal === 'Below' || newVal === 1) ? 1 : (newVal === 'Above' || newVal === 2) ? 2 : 0;
                    else plcVal = Number(newVal);
                    
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
        const newStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        insertParams.push([key, newStr]);
        
        // Diff
        const oldStr = oldParamsMap[key];
        if (oldStr !== newStr) {
          changes.push(`${key} (${oldStr || 'none'} -> ${newStr})`);
        }
      });

      if (insertParams.length > 0) {
        await connection.query(`
          INSERT INTO station_parameters (param_key, param_value)
          VALUES ?
          ON DUPLICATE KEY UPDATE param_value = VALUES(param_value)
        `, [insertParams]);
      }

      // Write scoreLogics TARGET values directly to PLC (same path as recipe writes)
      if (parameters && parameters.scoreLogics && Array.isArray(parameters.scoreLogics)) {
        const [scoreTagMappings] = await dbPoolPlc.query(
          "SELECT equipment, signal_key, tag_id FROM station_tag_mappings WHERE station = 'sterilizer' AND tag_id IS NOT NULL"
        );
        const scoreTagMap = {};
        scoreTagMappings.forEach(row => {
          scoreTagMap[`${row.equipment}__${row.signal_key}`] = row.tag_id;
        });

        for (const row of parameters.scoreLogics) {
          if (row.param === undefined || row.target === undefined) continue;
          const mapKey = `settings_score_logic_${row.param}_target__TARGET`;
          const tagId = scoreTagMap[mapKey];
          if (!tagId) continue;
          try {
            console.log(`[Settings-POST] Writing scoreLogic TARGET: ${row.param} = ${row.target} (tag ${tagId})`);
            await writeTagDirect(tagId, Number(row.target));
          } catch (err) {
            console.warn(`[Settings-POST] scoreLogic write warning for ${row.param}:`, err.message);
            plcErrors.push(`ScoreLogic ${row.param}: ${err.message}`);
          }
        }
      }
    }

    await connection.commit();
    
    // Log activity
    if (req.user && req.user.userRole !== 'developer') {
      let desc = changes.length > 0 ? changes.join(' | ') : 'Saved settings without changes';
      if (desc.length > 1000) desc = desc.substring(0, 997) + '...';
      
      await dbPool.query(
        "INSERT INTO agrovision_auth.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, desc, req.ip, req.headers['user-agent']]
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
