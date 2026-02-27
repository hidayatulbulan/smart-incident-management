const db = require("../config/database");
const { createNotification } = require("../helpers/notificationHelper");

/**
 * Get incidents assigned to this solver
 * GET /api/solver/incidents
 * Requires: Bearer token with solver role
 * Returns: List of incidents assigned to this solver
 */
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

    res.status(200).json({
      success: true,
      incidents: incidents
    });
  } catch (error) {
    console.error("Get my incidents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/**
 * Get specific incident detail assigned to this solver
 * GET /api/solver/incidents/:id
 * Requires: Bearer token with solver role
 * Validates: Incident must be assigned to this solver
 * Returns: Incident details with reporter info
 */
exports.getIncidentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const solverId = req.user.id;

    // Validate incident ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Incident ID is required"
      });
    }

    const [incidents] = await db.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email
       FROM incidents i 
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ? AND i.assigned_to = ?`,
      [id, solverId]
    );

    if (incidents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Incident not found or not assigned to you"
      });
    }

    res.status(200).json({
      success: true,
      data: incidents[0]
    });
  } catch (error) {
    console.error("Get incident detail error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/**
 * Update incident status and solver note
 * PUT /api/solver/incidents/:id/status
 * Requires: Bearer token with solver role
 * Body: { status, solver_note }
 * Validates: status must be 'open', 'progress', or 'closed'
 *           incident must be assigned to this solver
 * Returns: Updated incident data
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, solver_note } = req.body;
    const solverId = req.user.id;

    // Validate required fields
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Incident ID is required"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    // Validate status value
    const validStatuses = ['open', 'progress', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: open, progress, closed"
      });
    }

    // Check if incident exists and is assigned to this solver
    const [incidents] = await db.query(
      "SELECT * FROM incidents WHERE id = ? AND assigned_to = ?",
      [id, solverId]
    );

    if (incidents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Incident not found or not assigned to you"
      });
    }

    // Update incident status and solver_note
    await db.query(
      "UPDATE incidents SET status = ?, solver_note = ?, updated_at = NOW() WHERE id = ?",
      [status, solver_note || null, id]
    );

    // Fetch updated incident
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
    
    // Create notification for incident reporter
    const statusMessage = status === 'progress' ? 'sedang ditangani' : (status === 'closed' ? 'telah diselesaikan' : status);
    await createNotification(
      reporterId,
      "Status Insiden Diperbarui",
      `Insiden "${incidentTitle}" sekarang ${statusMessage}`,
      "status_update"
    );

    res.status(200).json({
      success: true,
      message: "Status berhasil diperbarui",
      data: updatedIncident
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
