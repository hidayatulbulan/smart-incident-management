const db = require("../config/database");
const { createNotification } = require("../helpers/notificationHelper");

exports.getMyIncidents = async (req, res) => {
  try {
    const solverId = req.user.id;
    const [incidents] = await db.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email
       FROM incidents i 
       LEFT JOIN users u ON i.user_id = u.id 
       WHERE i.assigned_to = ? 
       ORDER BY i.created_at DESC`,
      [solverId]
    );
    res.status(200).json({ success: true, incidents });
  } catch (error) {
    console.error("Get my incidents error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getLatestIncidents = async (req, res) => {
  try {
    const solverId = req.user.id;
    const [incidents] = await db.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email
       FROM incidents i 
       LEFT JOIN users u ON i.user_id = u.id 
       WHERE i.assigned_to = ? 
       AND LOWER(i.status) = 'open'
       ORDER BY i.created_at DESC
       LIMIT 5`,
      [solverId]
    );
    res.status(200).json({ success: true, incidents });
  } catch (error) {
    console.error("Get latest incidents error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getIncidentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const solverId = req.user.id;

    if (!id) {
      return res.status(400).json({ success: false, message: "Incident ID is required" });
    }

    const [incidents] = await db.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email
       FROM incidents i 
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ? AND i.assigned_to = ?`,
      [id, solverId]
    );

    if (incidents.length === 0) {
      return res.status(404).json({ success: false, message: "Incident not found or not assigned to you" });
    }

    res.status(200).json({ success: true, data: incidents[0] });
  } catch (error) {
    console.error("Get incident detail error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, solver_note } = req.body;
    const solverId = req.user.id;

    if (!id) {
      return res.status(400).json({ success: false, message: "Incident ID is required" });
    }
    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const validStatuses = ['open', 'progress', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Allowed values: open, progress, closed" });
    }

    const [incidents] = await db.query(
      "SELECT * FROM incidents WHERE id = ? AND assigned_to = ?",
      [id, solverId]
    );

    if (incidents.length === 0) {
      return res.status(404).json({ success: false, message: "Incident not found or not assigned to you" });
    }

    await db.query(
      "UPDATE incidents SET status = ?, solver_note = ?, updated_at = NOW() WHERE id = ?",
      [status, solver_note || null, id]
    );

    const [updatedIncidents] = await db.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email
       FROM incidents i 
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [id]
    );

    const updatedIncident = updatedIncidents[0];
    const reporterId = updatedIncident.user_id;
    const incidentTitle = updatedIncident.title || "Insiden";

    const statusMessage = status === 'progress' ? 'sedang ditangani' : (status === 'closed' ? 'telah diselesaikan' : status);

    
    await createNotification(
      reporterId,
      "Status Insiden Diperbarui",
      `Insiden "${incidentTitle}" sekarang ${statusMessage}`,
      "status_update",
      parseInt(id)
    );

    res.status(200).json({ success: true, message: "Status berhasil diperbarui", data: updatedIncident });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};