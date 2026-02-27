const express = require("express");
const router = express.Router();
const notification = require("../controllers/notificationController");
const { authenticate } = require("../middleware/auth");

// Get notifications for logged-in user (GET /api/notifications)
router.get("/", authenticate, notification.getNotifications);

// Mark one notification as read (PUT /api/notifications/:id/read)
router.put("/:id/read", authenticate, notification.markAsRead);

// Mark all notifications as read (PUT /api/notifications/read-all)
router.put("/read-all", authenticate, notification.markAllAsRead);

module.exports = router;
