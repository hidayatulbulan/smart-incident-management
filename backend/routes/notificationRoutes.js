const express = require("express");
const router = express.Router();
const notification = require("../controllers/notificationController");
const { authenticate } = require("../middleware/auth");


router.get("/", authenticate, notification.getNotifications);
router.put("/:id/read", authenticate, notification.markAsRead);
router.put("/read-all", authenticate, notification.markAllAsRead);

module.exports = router;
