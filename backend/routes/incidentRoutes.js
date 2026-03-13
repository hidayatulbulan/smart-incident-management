const express = require("express");
const router = express.Router();
const incident = require("../controllers/incidentController");
const { uploadIncidentPhoto } = require("../middleware/multer");
const { authenticate } = require("../middleware/auth");
const db = require("../config/database");

// ============================================================
// PUBLIC ENDPOINT — landing page
// GET /api/incidents/public-stats
// ============================================================
router.get("/public-stats", async (req, res) => {
  try {
    // Total & breakdown by status
    const [statusRows] = await db.query(
      "SELECT status, COUNT(*) as count FROM incidents GROUP BY status"
    );

    // Breakdown by priority
    const [priorityRows] = await db.query(
      "SELECT LOWER(priority) as priority, COUNT(*) as count FROM incidents GROUP BY priority"
    );

    // Hitung total
    const statusMap = {};
    statusRows.forEach(r => { statusMap[r.status] = parseInt(r.count) || 0; });
    const open       = statusMap['open']        || 0;
    const inProgress = statusMap['in_progress'] || 0;
    const closed     = statusMap['closed']      || 0;
    const total      = open + inProgress + closed;

    // Priority map
    const priorityMap = { low: 0, medium: 0, high: 0 };
    priorityRows.forEach(r => {
      const p = (r.priority || '').toLowerCase();
      if (priorityMap[p] !== undefined) priorityMap[p] = parseInt(r.count) || 0;
    });

    res.json({
      success: true,
      total,
      open,
      in_progress: inProgress,
      closed,
      resolved_pct: total > 0 ? Math.round((closed / total) * 100) : 0,
      priority: priorityMap
    });
  } catch (err) {
    console.error("[public-stats] error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============================================================
// PROTECTED ROUTES —  authenticate
// ============================================================

// Create new incident with photo (POST /api/incidents)
router.post("/", authenticate, uploadIncidentPhoto.single("photo"), incident.create);

// Get user's own incidents (GET /api/incidents)
router.get("/", authenticate, incident.getMyIncidents);

// Additional routes
router.post("/create", authenticate, incident.create);
router.get("/all", authenticate, incident.getAll);
router.get("/my-incidents", authenticate, incident.getMyIncidents);
router.get("/stats", authenticate, incident.getStats);
router.get("/latest", authenticate, incident.getLatest);
router.get("/:id", authenticate, incident.getById);
router.put("/:id", authenticate, incident.update);
router.put("/:id/status", authenticate, incident.updateStatus);
router.delete("/:id", authenticate, incident.delete);
router.put("/:id/resolve", authenticate, incident.resolveIncident);
router.post("/:id/recommend", authenticate, incident.getAIRecommendation);

module.exports = router;