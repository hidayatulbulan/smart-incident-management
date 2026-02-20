const db = require("../config/database");

class User {
  static async findByEmail(email) {
    try {
      const [results] = await db.query("SELECT id, name, email, password, role FROM users WHERE email = ?", [email]);
      return results[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [results] = await db.query("SELECT id, name, email, role FROM users WHERE id = ?", [id]);
      return results[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async create(name, email, hashedPassword) {
    try {
      const [result] = await db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hashedPassword]
      );
      return {
        id: result.insertId,
        name,
        email
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAllUsers() {
    try {
      const [results] = await db.query("SELECT id, name, email, role FROM users");
      return results;
    } catch (error) {
      throw error;
    }
  }

  static async updatePassword(id, hashedPassword) {
    try {
      await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id]);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
