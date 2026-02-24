const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

// Get all incidents (admin only)
router.get("/incidents", authenticate, authorizeAdmin, adminController.getAllIncidents);

// Update incident status and admin note (admin only)
router.put("/incidents/:id", authenticate, authorizeAdmin, adminController.updateIncident);

// Assign incident to solver (admin only)
router.put("/incidents/:id/assign", authenticate, authorizeAdmin, adminController.assignIncident);

// Get all solvers (admin only)
router.get("/solvers", authenticate, authorizeAdmin, adminController.getSolvers);

// User management endpoints (admin only)
router.get("/users", authenticate, authorizeAdmin, adminController.getUsers);
router.post("/users", authenticate, authorizeAdmin, adminController.createUser);
router.put("/users/:id", authenticate, authorizeAdmin, adminController.updateUser);
router.delete("/users/:id", authenticate, authorizeAdmin, adminController.deleteUser);

// Report endpoints (admin only)
router.get("/reports/stats", authenticate, authorizeAdmin, adminController.getReportsStats);
router.get("/reports/weekly", authenticate, authorizeAdmin, adminController.getWeeklyByCategory);
router.get("/reports/top-reporters", authenticate, authorizeAdmin, adminController.getTopReporters);
router.get("/reports/performance", authenticate, authorizeAdmin, adminController.getPerformanceMetrics);

module.exports = router;

