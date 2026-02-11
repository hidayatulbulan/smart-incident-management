const express = require("express");
const router = express.Router();
const incident = require("../controllers/incidentController");

router.post("/create", incident.create);
router.get("/", incident.getAll);
router.get("/my-incidents", incident.getMyIncidents);
router.get("/stats", incident.getStats);
router.get("/:id", incident.getById);
router.put("/:id", incident.update);
router.put("/:id/status", incident.updateStatus);
router.delete("/:id", incident.delete);

module.exports = router;
