const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/auth");
const adminController = require("../controllers/adminController");
const db = require("../config/database");


router.get("/incidents", authenticate, authorizeAdmin, adminController.getAllIncidents);
router.put("/incidents/:id", authenticate, authorizeAdmin, adminController.updateIncident);
router.put("/incidents/:id/assign", authenticate, authorizeAdmin, adminController.assignIncident);
router.get("/solvers", authenticate, authorizeAdmin, adminController.getSolvers);
router.get("/users", authenticate, authorizeAdmin, adminController.getUsers);
router.post("/users", authenticate, authorizeAdmin, adminController.createUser);
router.put("/users/:id", authenticate, authorizeAdmin, adminController.updateUser);
router.delete("/users/:id", authenticate, authorizeAdmin, adminController.deleteUser);
router.get("/reports/stats", authenticate, authorizeAdmin, adminController.getReportsStats);
router.get("/reports/weekly", authenticate, authorizeAdmin, adminController.getWeeklyByCategory);
router.get("/reports/top-reporters", authenticate, authorizeAdmin, adminController.getTopReporters);
router.get("/reports/performance", authenticate, authorizeAdmin, adminController.getPerformanceMetrics);


router.get("/ai-feedback/stats", authenticate, authorizeAdmin, async (req, res) => {
  try {

    const [[totals]] = await db.query(`
      SELECT
        SUM(feedback = 'helpful')      AS helpful_count,
        SUM(feedback = 'not_relevant') AS not_relevant_count
      FROM ai_feedbacks
    `);

    const [reasons] = await db.query(`
      SELECT reason, COUNT(*) AS count
      FROM ai_feedbacks
      WHERE feedback = 'not_relevant'
        AND reason IS NOT NULL
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        helpful_count:      parseInt(totals.helpful_count)      || 0,
        not_relevant_count: parseInt(totals.not_relevant_count) || 0,
        top_reasons: reasons
      }
    });
  } catch (err) {
    console.error("[AI Feedback Stats]", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;