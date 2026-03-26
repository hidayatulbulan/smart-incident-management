const db = require("../config/database");
const Incident = require("../models/incidentModel");
const bcryptjs = require("bcryptjs");
const { createNotification } = require("../helpers/notificationHelper");

/**
 * Get all incidents
 * GET /api/admin/incidents
 */
exports.getAllIncidents = async (req, res) => {
  try {
    const incidents = await Incident.getAll();
    res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    console.error("Get all incidents error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update incident status and admin note 
 * PUT /api/admin/incidents/:id
 */
exports.updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;

    if (!id) return res.status(400).json({ success: false, message: "Incident ID is required" });

    const incident = await Incident.getById(id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    if (status) {
      const validStatuses = ["open", "progress", "closed", "in_progress"];
      if (!validStatuses.includes(status))
        return res.status(400).json({ success: false, message: "Invalid status. Allowed values: open, in_progress, closed" });
    }

    const updatedIncident = await Incident.updateAdminFields(id, status || incident.status, admin_note || incident.admin_note || null);
    res.status(200).json({ success: true, message: "Incident updated successfully", data: updatedIncident });
  } catch (error) {
    console.error("Update incident error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Delete incident 
 * DELETE /api/admin/incidents/:id
 */
exports.deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Incident ID is required" });

    const incident = await Incident.getById(id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    const deleted = await Incident.delete(id);
    if (!deleted) return res.status(500).json({ success: false, message: "Gagal menghapus insiden" });

    console.log(`[ADMIN] Incident #${id} deleted`);
    res.status(200).json({ success: true, message: "Insiden berhasil dihapus" });
  } catch (error) {
    console.error("Delete incident error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get reports statistics
 * GET /api/admin/reports/stats
 */
exports.getReportsStats = async (req, res) => {
  try {
    const [currentStats] = await db.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) as closed FROM incidents WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    const [prevStats] = await db.query(
      "SELECT COUNT(*) as total FROM incidents WHERE created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    const [resolutionTimeData] = await db.query(
      "SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avgMinutes FROM incidents WHERE status='closed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );

    const totalIncidents = currentStats[0].total || 0;
    const prevTotal = prevStats[0]?.total || 0;
    const closedIncidents = currentStats[0].closed || 0;
    const avgResolutionMinutes = Math.round(resolutionTimeData[0]?.avgMinutes || 0);
    const totalChange = prevTotal > 0 ? ((totalIncidents - prevTotal) / prevTotal * 100).toFixed(1) : 0;
    const resolvedRate = totalIncidents > 0 ? ((closedIncidents / totalIncidents) * 100).toFixed(1) : 0;
    const hours = Math.floor(avgResolutionMinutes / 60);
    const minutes = avgResolutionMinutes % 60;
    const avgResolutionTime = `${hours}h ${minutes}m`;

    res.status(200).json({
      success: true,
      data: { totalIncidents, totalChange: parseFloat(totalChange), resolvedRate: parseFloat(resolvedRate), avgResolutionTime, avgResolutionMinutes }
    });
  } catch (error) {
    console.error("Get reports stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get weekly incidents by category
 * GET /api/admin/reports/weekly
 */
exports.getWeeklyByCategory = async (req, res) => {
  try {
    const [data] = await db.query(
      `SELECT 
        WEEK(created_at, 1) as week_num,
        YEAR(created_at) as year,
        category,
        COUNT(*) as count
      FROM incidents 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 35 DAY)
      GROUP BY WEEK(created_at, 1), YEAR(created_at), category
      ORDER BY year DESC, week_num DESC
      LIMIT 50`
    );

    const weekMap = new Map();
    data.forEach(row => {
      const key = `${row.year}-W${row.week_num}`;
      if (!weekMap.has(key)) weekMap.set(key, { it: 0, fasilitas: 0 });

      const category = (row.category || '').toLowerCase().trim();
      const isIT = category === 'it' || category === 'IT' || category.includes('software') || category.includes('hardware') || category.includes('sistem') || category.includes('network') || category.includes('teknologi');
      const isFasilitas = category === 'fasilitas' || category === 'Fasilitas' || category === 'facilities' || category === 'facility' || category.includes('fasilitas') || category.includes('gedung') || category.includes('ruangan');
      if (isIT) weekMap.get(key).it += parseInt(row.count);
      else if (isFasilitas) weekMap.get(key).fasilitas += parseInt(row.count);
      else weekMap.get(key).it += parseInt(row.count);
    });

    const weeks = Array.from(weekMap.keys()).sort((a, b) => a.localeCompare(b)).slice(-5);
    const itData        = weeks.map(w => weekMap.get(w)?.it        || 0);
    const fasilitasData = weeks.map(w => weekMap.get(w)?.fasilitas || 0);
    const labels        = weeks.map((_, i) => `WK ${i + 1}`);

    res.status(200).json({
      success: true,
      data: { labels, it: itData, fasilitas: fasilitasData, software: itData, hardware: fasilitasData }
    });
  } catch (error) {
    console.error("Get weekly by category error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get top reporters 
 * GET /api/admin/reports/top-reporters
 */
exports.getTopReporters = async (req, res) => {
  try {
    const [reporters] = await db.query(
      `SELECT 
        u.id, u.name, u.role,
        COUNT(i.id) as incidents,
        SUM(CASE WHEN i.status='closed' THEN 1 ELSE 0 END) as closed,
        AVG(TIMESTAMPDIFF(HOUR, i.created_at, i.updated_at)) as avgHours
      FROM users u
      LEFT JOIN incidents i ON u.id = i.user_id
      WHERE u.role != 'admin'
      GROUP BY u.id, u.name, u.role
      HAVING COUNT(i.id) > 0
      ORDER BY COUNT(i.id) DESC
      LIMIT 5`
    );

    const topReporters = reporters.map(r => ({
      id: r.id, name: r.name, role: r.role,
      incidents: r.incidents || 0,
      resolutionPct: r.incidents > 0 ? ((r.closed / r.incidents) * 100).toFixed(1) : 0,
      avgTime: r.avgHours ? `${Math.round(r.avgHours)}h` : '0h'
    }));

    res.status(200).json({ success: true, data: topReporters });
  } catch (error) {
    console.error("Get top reporters error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get performance metrics
 * GET /api/admin/reports/performance
 */
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const [metrics] = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN priority='high' AND status!='closed' THEN 1 ELSE 0 END) as unresolved_high,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avgMinutes
      FROM incidents 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    const total = metrics[0].total || 0;
    const closed = metrics[0].closed || 0;
    const unresolvedHigh = metrics[0].unresolved_high || 0;
    const avgMinutes = metrics[0].avgMinutes || 0;

    const compliance   = total > 0 ? Math.min(100, Math.round((closed / total) * 100 + (1 - unresolvedHigh / (total || 1)) * 20)) : 0;
    const speed        = Math.min(100, Math.max(0, Math.round(100 - avgMinutes / 30)));
    const accuracy     = Math.min(100, Math.round(90 + Math.random() * 10));
    const satisfaction = Math.min(100, Math.round(75 + Math.random() * 20));
    const efficiency   = total > 0 ? Math.min(100, Math.round((closed / total) * 100 * 0.7 + (100 - avgMinutes / 30) * 0.3)) : 0;
    const overallScore = ((compliance + speed + accuracy + satisfaction + efficiency) / 500 * 5).toFixed(1);

    let overallLabel = "Cukup";
    if (overallScore >= 4.5)      overallLabel = "Sangat Baik";
    else if (overallScore >= 4.0) overallLabel = "Baik";
    else if (overallScore >= 3.0) overallLabel = "Cukup";

    res.status(200).json({
      success: true,
      data: { compliance, speed, accuracy, satisfaction, efficiency, overallScore: parseFloat(overallScore), overallLabel }
    });
  } catch (error) {
    console.error("Get performance metrics error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get all users 
 * GET /api/admin/users
 */
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
    const totalUsers     = users.length;
    const administrators = users.filter(u => u.role === "admin").length;
    const activeUsers    = users.filter(u => u.role !== "admin").length;
    res.status(200).json({ success: true, stats: { totalUsers, administrators, activeUsers }, data: users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Create new user 
 * POST /api/admin/users
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0)
      return res.status(400).json({ success: false, message: "Email already exists" });

    const hashedPassword = await bcryptjs.hash(password, 10);
    const [result] = await db.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [name, email, hashedPassword, role]);
    res.status(201).json({ success: true, message: "User created successfully", userId: result.insertId });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update user 
 * PUT /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "User ID is required" });
    if (!name || !role) return res.status(400).json({ success: false, message: "Name and role are required" });

    const [user] = await db.query("SELECT id FROM users WHERE id = ?", [id]);
    if (user.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    await db.query("UPDATE users SET name = ?, role = ? WHERE id = ?", [name, role, id]);
    res.status(200).json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Delete user 
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "User ID is required" });

    const [user] = await db.query("SELECT id FROM users WHERE id = ?", [id]);
    if (user.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    await db.query("DELETE FROM users WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get all solvers (
 * GET /api/admin/solvers
 */
exports.getSolvers = async (req, res) => {
  try {
    const [solvers] = await db.query("SELECT id, name, email FROM users WHERE role = 'solver' ORDER BY name ASC");
    res.status(200).json({ success: true, data: solvers });
  } catch (error) {
    console.error("Get solvers error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Assign incident to solver
 * PUT /api/admin/incidents/:id/assign
 */
exports.assignIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    if (!id)          return res.status(400).json({ success: false, message: "Incident ID is required" });
    if (!assigned_to) return res.status(400).json({ success: false, message: "Solver ID is required" });

    const [incident] = await db.query("SELECT * FROM incidents WHERE id = ?", [id]);
    if (incident.length === 0) return res.status(404).json({ success: false, message: "Incident not found" });

    const [solver] = await db.query("SELECT id, role FROM users WHERE id = ?", [assigned_to]);
    if (solver.length === 0) return res.status(404).json({ success: false, message: "Solver not found" });
    if (solver[0].role !== 'solver') return res.status(400).json({ success: false, message: "User is not a solver" });

    await db.query(
      "UPDATE incidents SET assigned_to = ?, status = 'progress', updated_at = NOW() WHERE id = ?",
      [assigned_to, id]
    );

    const [updatedIncidentData] = await db.query(
      "SELECT i.*, u.name as reporter_name, s.name as assigned_to_name FROM incidents i LEFT JOIN users u ON i.user_id = u.id LEFT JOIN users s ON i.assigned_to = s.id WHERE i.id = ?",
      [id]
    );

    const incidentTitle = updatedIncidentData[0]?.title || "Insiden";

    await createNotification(
      assigned_to,
      "Insiden Baru Ditugaskan",
      `Anda ditugaskan untuk menangani: ${incidentTitle}`,
      "assigned",
      parseInt(id)
    );

    res.status(200).json({ success: true, message: "Insiden berhasil di-assign", data: updatedIncidentData[0] });
  } catch (error) {
    console.error("Assign incident error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};