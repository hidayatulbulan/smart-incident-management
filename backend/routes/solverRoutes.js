const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const solverController = require("../controllers/solverController");

/**
 * Solver authorization middleware
 * Checks if user has 'solver' role
 */
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

// Get all incidents assigned to this solver
router.get("/incidents", authenticate, authorizeSolver, solverController.getMyIncidents);

// Get specific incident detail
router.get("/incidents/:id", authenticate, authorizeSolver, solverController.getIncidentDetail);

// Update incident status and solver note
router.put("/incidents/:id/status", authenticate, authorizeSolver, solverController.updateStatus);

module.exports = router;
