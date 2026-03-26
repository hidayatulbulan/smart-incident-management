const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const solverController = require("../controllers/solverController");
const incidentController = require("../controllers/incidentController");

const authorizeSolver = (req, res, next) => {
  try {
    if (!req.user || req.user.role?.toLowerCase() !== "solver") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Solver role required"
      });
    }
    next();
  } catch (error) {
    console.error("Solver authorization error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

router.get("/incidents", authenticate, authorizeSolver, solverController.getMyIncidents);
router.get("/incidents/latest", authenticate, authorizeSolver, solverController.getLatestIncidents);
router.get("/incidents/:id", authenticate, authorizeSolver, solverController.getIncidentDetail);
router.put("/incidents/:id/status", authenticate, authorizeSolver, solverController.updateStatus);
router.put("/incidents/:id/resolve", authenticate, authorizeSolver, incidentController.resolveIncident);

module.exports = router;
