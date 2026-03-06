const express = require("express");
const router = express.Router();
const incident = require("../controllers/incidentController");
const { uploadIncidentPhoto } = require("../middleware/multer");
const { authenticate } = require("../middleware/auth");

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
router.put("/:id/resolve",    authenticate, incident.resolveIncident);
router.post("/:id/recommend", authenticate, incident.getAIRecommendation);

module.exports = router;
