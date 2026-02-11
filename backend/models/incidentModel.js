const db = require("../config/database");
const { promisify } = require("util");

const query = promisify(db.query).bind(db);

class Incident {
  static async create(userId, title, type, priority, description, photo = null, recommendation = null) {
    try {
      const result = await query(
        "INSERT INTO incidents (user_id, title, type, priority, description, photo, recommendation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [userId, title, type, priority, description, photo, recommendation, "open"]
      );
      return {
        id: result.insertId,
        userId,
        title,
        type,
        priority,
        description,
        photo,
        recommendation,
        status: "open"
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const results = await query(
        "SELECT i.*, u.name as reporter_name FROM incidents i LEFT JOIN users u ON i.user_id = u.id ORDER BY i.created_at DESC"
      );
      return results;
    } catch (error) {
      throw error;
    }
  }

  static async getById(incidentId) {
    try {
      const results = await query(
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
      const results = await query(
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
      await query("UPDATE incidents SET status = ? WHERE id = ?", [status, incidentId]);
      return { id: incidentId, status };
    } catch (error) {
      throw error;
    }
  }

  static async update(incidentId, updates) {
    try {
      const { title, type, priority, description } = updates;
      await query(
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
      const result = await query("DELETE FROM incidents WHERE id = ?", [incidentId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const results = await query(
        "SELECT status, COUNT(*) as count FROM incidents GROUP BY status"
      );
      return results;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Incident;
