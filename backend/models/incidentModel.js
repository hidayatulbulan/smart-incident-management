const db = require("../config/database");

class Incident {
  static async create(userId, title, type, priority, description, photo = null, recommendation = null) {
    try {
      const [result] = await db.query(
        "INSERT INTO incidents (user_id, title, type, priority, description, photo, recommendation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, title, type, priority, description, photo, recommendation, "open"]
      );
      return {
        id: result.insertId,
        userId, title, type, priority, description, photo, recommendation, status: "open"
      };
    } catch (error) {
      throw error;
    }
  }

  static async createWithPhoto(userId, title, category, description, location, photo, status = "open", priority = "Medium") {
    try {
      const [result] = await db.query(
        "INSERT INTO incidents (user_id, title, category, description, location, photo, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [userId, title, category, description, location, photo, status, priority]
      );
      return {
        id: result.insertId,
        user_id: userId, title, category, description, location, photo, status, priority,
        created_at: new Date(), updated_at: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const [results] = await db.query(
        "SELECT i.*, u.name as reporter_name FROM incidents i LEFT JOIN users u ON i.user_id = u.id ORDER BY i.created_at DESC"
      );
      return results;
    } catch (error) {
      throw error;
    }
  }

  static async getById(incidentId) {
    try {
      const [results] = await db.query(
        "SELECT i.*, u.name as reporter_name FROM incidents i LEFT JOIN users u ON i.user_id = u.id WHERE i.id = ?",
        [incidentId]
      );
      return results[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async getByUserId(userId) {
    try {
      const [results] = await db.query(
        "SELECT * FROM incidents WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
      );
      return results;
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(incidentId, status) {
    try {
      await db.query("UPDATE incidents SET status = ? WHERE id = ?", [status, incidentId]);
      return { id: incidentId, status };
    } catch (error) {
      throw error;
    }
  }

  static async updateAdminFields(incidentId, status, adminNote) {
    try {
      await db.query(
        "UPDATE incidents SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?",
        [status, adminNote, incidentId]
      );
      return await this.getById(incidentId);
    } catch (error) {
      throw error;
    }
  }

  static async update(incidentId, updates) {
    try {
      const { title, type, priority, description } = updates;
      await db.query(
        "UPDATE incidents SET title = ?, type = ?, priority = ?, description = ? WHERE id = ?",
        [title, type, priority, description, incidentId]
      );
      return await this.getById(incidentId);
    } catch (error) {
      throw error;
    }
  }

  static async delete(incidentId) {
    try {
      const [result] = await db.query("DELETE FROM incidents WHERE id = ?", [incidentId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const [results] = await db.query(
        "SELECT status, COUNT(*) as count FROM incidents GROUP BY status"
      );
      return results;
    } catch (error) {
      throw error;
    }
  }

  static async getLatest(limit = 3) {
    try {
      const [results] = await db.query(
        "SELECT title, status, created_at FROM incidents ORDER BY created_at DESC LIMIT ?",
        [limit]
      );
      return results;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Incident;