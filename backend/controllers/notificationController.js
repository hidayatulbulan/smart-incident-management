const db = require("../config/database");

/**
 * Get notifications for logged-in user (unread first)
 * GET /api/notifications
 * Requires: Bearer token
 * Returns: Last 20 notifications ordered by is_read ASC, created_at DESC
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const [notifications] = await db.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY is_read ASC, created_at DESC LIMIT 20",
      [userId]
    );

    res.status(200).json({
      success: true,
      total: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/**
 * Mark one notification as read
 * PUT /api/notifications/:id/read
 * Requires: Bearer token
 * Validates: Notification belongs to logged-in user
 * Returns: Updated notification
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required"
      });
    }

    // Check if notification exists and belongs to user
    const [notifications] = await db.query(
      "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    // Update notification
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    // Fetch updated notification
    const [updatedNotifications] = await db.query(
      "SELECT * FROM notifications WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification: updatedNotifications[0]
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/**
 * Mark all notifications as read for logged-in user
 * PUT /api/notifications/read-all
 * Requires: Bearer token
 * Returns: Count of updated notifications
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const [result] = await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [userId]
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
