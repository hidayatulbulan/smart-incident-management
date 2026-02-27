const db = require("../config/database");

/**
 * Create a notification for a user
 * @param {number} userId - The user ID to create notification for
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, new_incident, assigned, status_update, etc.)
 */
async function createNotification(userId, title, message, type = 'info') {
  try {
    await db.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
      [userId, title, message, type]
    );
    return true;
  } catch (error) {
    console.error("Create notification error:", error);
    return false;
  }
}

/**
 * Create notifications for multiple users
 * @param {array} userIds - Array of user IDs
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
async function createNotificationsForMultiple(userIds, title, message, type = 'info') {
  try {
    for (const userId of userIds) {
      await createNotification(userId, title, message, type);
    }
    return true;
  } catch (error) {
    console.error("Create multiple notifications error:", error);
    return false;
  }
}

module.exports = { createNotification, createNotificationsForMultiple };
