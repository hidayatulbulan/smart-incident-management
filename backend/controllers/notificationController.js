const db = require("../config/database");
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

    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [id, userId]
    );

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
