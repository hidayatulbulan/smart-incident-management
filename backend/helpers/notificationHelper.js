const db = require("../config/database");

async function createNotification(userId, title, message, type = 'info', incidentId = null) {
  try {
    if (incidentId) {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type, incident_id) VALUES (?, ?, ?, ?, ?)",
        [userId, title, message, type, incidentId]
      );
    } else {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [userId, title, message, type]
      );
    }
    return true;
  } catch (error) {
    console.error("Create notification error:", error);
    return false;
  }
}

async function createNotificationsForMultiple(userIds, title, message, type = 'info', incidentId = null) {
  try {
    for (const userId of userIds) {
      await createNotification(userId, title, message, type, incidentId);
    }
    return true;
  } catch (error) {
    console.error("Create multiple notifications error:", error);
    return false;
  }
}

module.exports = { createNotification, createNotificationsForMultiple };