import Router from "express";
import { dbPool } from "../config/db.js";
import { requireAuth, authorize } from "../middleware/jwtMiddleware.js";

const router = Router();
router.use(requireAuth);
const adminOnly = authorize(["developer", "admin"]);

// GET /api/maintenance/logs/:machineId/:category
router.get("/logs/:machineId/:category", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_logs WHERE machine_id=? AND work_type=? ORDER BY work_date DESC",
      [req.params.machineId, req.params.category],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// POST /api/maintenance/logs/add
router.post("/logs/add", async (req, res) => {
  const { machine_id, work_type, description, technician_name, parts_used } =
    req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO maintenance_logs (machine_id,work_type,description,technician_name,parts_used) VALUES (?,?,?,?,?)",
      [
        machine_id,
        work_type,
        description,
        technician_name,
        JSON.stringify(parts_used),
      ],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/maintenance/schedules/:machineId
router.get("/schedules/:machineId", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_schedules WHERE machine_id=? AND is_active=1",
      [req.params.machineId],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// POST /api/maintenance/schedules/update
router.post("/schedules/update", adminOnly, async (req, res) => {
  const { id, next_due_date, frequency_days } = req.body;
  try {
    await dbPool.query(
      "UPDATE maintenance_schedules SET next_due_date=?,frequency_days=? WHERE id=?",
      [next_due_date, frequency_days, id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/maintenance/inventory/:category
router.get("/inventory/:category", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_inventory WHERE category=? ORDER BY item_name",
      [req.params.category],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// GET /api/maintenance/docs/:machineId
router.get("/docs/:machineId", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_documents WHERE machine_id=? ORDER BY created_at DESC",
      [req.params.machineId],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// POST /api/maintenance/docs/add
router.post("/docs/add", adminOnly, async (req, res) => {
  const { machine_id, title, doc_type, file_url } = req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO maintenance_documents (machine_id,title,doc_type,file_url) VALUES (?,?,?,?)",
      [machine_id, title, doc_type, file_url],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/maintenance/spare-parts/:station
router.get("/spare-parts/:station", async (req, res) => {
  const [rows] = await dbPool
    .query(
      `SELECT mm.*, ms.task_name, ms.next_due_date FROM maintenance_machines mm
     LEFT JOIN maintenance_schedules ms ON mm.id = ms.machine_id
     WHERE mm.station_name=? AND mm.category='spare-part'`,
      [req.params.station],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// GET /api/maintenance/spare-parts/machines/:station
router.get("/spare-parts/machines/:station", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_machines WHERE station_name=? ORDER BY machine_name",
      [req.params.station],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// GET /api/maintenance/machinery/all — include parts per machine
router.get("/machinery/all", async (_req, res) => {
  try {
    const [machines] = await dbPool
      .query(
        `SELECT mm.*, COUNT(ml.id) as log_count
       FROM maintenance_machines mm
       LEFT JOIN maintenance_logs ml ON mm.id = ml.machine_id
       GROUP BY mm.id ORDER BY mm.station_name, mm.machine_name`,
      )
      .catch(() => [[]]);
    // Attach parts to each machine
    for (const machine of machines) {
      const [parts] = await dbPool.query(
        "SELECT id, part_name, category FROM maintenance_parts WHERE machine_id = ? ORDER BY part_name",
        [machine.id],
      );
      machine.parts = parts;
    }
    res.json({ success: true, data: machines });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Machinery CRUD
router.post("/machinery/machines/add", adminOnly, async (req, res) => {
  const { station_name, machine_name, category } = req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO maintenance_machines (station_name,machine_name,category,qr_token) VALUES (?,?,?,UUID())",
      [station_name, machine_name, category || "spare-part"],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/machinery/machines/:id", adminOnly, async (req, res) => {
  const { machine_name, category, status, last_service } = req.body;
  try {
    await dbPool.query(
      "UPDATE maintenance_machines SET machine_name=?,category=?,status=?,last_service=? WHERE id=?",
      [machine_name, category, status, last_service, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/machinery/machines/:id", adminOnly, async (req, res) => {
  try {
    await dbPool.query("DELETE FROM maintenance_machines WHERE id=?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Spare Parts (Inventory) ──
router.get("/parts", async (_req, res) => {
  const [rows] = await dbPool
    .query("SELECT * FROM maintenance_inventory ORDER BY item_name ASC")
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.post("/machinery/parts/add", adminOnly, async (req, res) => {
  const { machineId, partName } = req.body;
  if (!partName || !partName.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Part name required" });
  }
  if (!machineId) {
    return res
      .status(400)
      .json({ success: false, error: "Machine ID required" });
  }
  try {
    const [r] = await dbPool.query(
      "INSERT INTO maintenance_parts (machine_id, part_name) VALUES (?, ?)",
      [machineId, partName.trim()],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/maintenance/machinery/parts/:machineId/:partId
router.delete(
  "/machinery/parts/:machineId/:partId",
  adminOnly,
  async (req, res) => {
    try {
      await dbPool.query(
        "DELETE FROM maintenance_parts WHERE id=? AND machine_id=?",
        [req.params.partId, req.params.machineId],
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

export default router;
