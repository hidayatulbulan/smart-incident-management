const express = require("express");
const router = express.Router();
const incident = require("../controllers/incidentController");
const { uploadIncidentPhoto } = require("../middleware/multer");
const { authenticate } = require("../middleware/auth");
const db = require("../config/database");


router.get("/public-stats", async (req, res) => {
  try {
    const [statusRows] = await db.query(
      "SELECT status, COUNT(*) as count FROM incidents GROUP BY status"
    );
    const [priorityRows] = await db.query(
      "SELECT LOWER(priority) as priority, COUNT(*) as count FROM incidents GROUP BY priority"
    );

    const statusMap = {};
    statusRows.forEach(r => { statusMap[r.status] = parseInt(r.count) || 0; });
    const open       = statusMap['open']        || 0;
    const inProgress = statusMap['in_progress'] || 0;
    const closed     = statusMap['closed']      || 0;
    const total      = open + inProgress + closed;

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
// GET /api/incidents/:id/feedback-summary
router.get('/:id/feedback-summary', authenticate, async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        SUM(feedback = 'helpful')      AS helpful,
        SUM(feedback = 'not_relevant') AS not_relevant
      FROM ai_feedbacks
      WHERE incident_id = ?
    `, [req.params.id]);

    const [reasons] = await db.query(`
      SELECT reason, COUNT(*) AS count
      FROM ai_feedbacks
      WHERE incident_id = ? AND feedback = 'not_relevant' AND reason IS NOT NULL
      GROUP BY reason ORDER BY count DESC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        helpful:      parseInt(totals.helpful)      || 0,
        not_relevant: parseInt(totals.not_relevant) || 0,
        reasons
      }
    });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// PROTECTED ROUTES — authenticate
// ============================================================

router.post("/", authenticate, uploadIncidentPhoto.single("photo"), incident.create);
router.get("/", authenticate, incident.getMyIncidents);

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
router.post("/:id/ai-suggestion", authenticate, incident.saveAISuggestion);
router.post("/:id/feedback", authenticate, incident.submitFeedback);

module.exports = router;