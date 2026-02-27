const Incident = require("../models/incidentModel");
const { analyzeIncident } = require("../services/aiRuleBased");
const { createNotificationsForMultiple } = require("../helpers/notificationHelper");
const db = require("../config/database");

exports.create = async (req, res) => {
  try {
    const { title, type, category, description, location } = req.body;
    const userId = req.user?.id;

    // Support both 'type' and 'category' field names
    const categoryValue = category || type;

    if (!title || !categoryValue || !description) {
      return res.status(400).json({ success: false, message: "Title, category/type, and description are required" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Call AI analyzer to determine priority and get recommendation
    const aiAnalysis = analyzeIncident({ title, description, type: categoryValue });

    const photo = req.file ? req.file.filename : null;
    
    // Use createWithPhoto for better field mapping
    const incident = await Incident.createWithPhoto(
      userId,
      title,
      categoryValue,
      description,
      location || "Not specified",
      photo,
      "open",
      aiAnalysis.priority || "Medium"
    );

    // Get reporter name
    const [reporterData] = await db.query(
      "SELECT name FROM users WHERE id = ?",
      [userId]
    );
    const reporterName = reporterData[0]?.name || "User";

    // Get all admin users
    const [admins] = await db.query(
      "SELECT id FROM users WHERE role = 'admin'"
    );
    const adminIds = admins.map(admin => admin.id);

    // Create notifications for all admins
    if (adminIds.length > 0) {
      await createNotificationsForMultiple(
        adminIds,
        "Laporan Baru Masuk",
        `${reporterName} melaporkan: ${title}`,
        "new_incident"
      );
    }

    res.status(201).json({
      success: true,
      message: "Incident created successfully",
      incident
    });
  } catch (error) {
    console.error("Create incident error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const incidents = await Incident.getAll();
    res.status(200).json({
      success: true,
      total: incidents.length,
      incidents
    });
  } catch (error) {
    console.error("Get all incidents error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Incident ID is required" });
    }

    const incident = await Incident.getById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    res.status(200).json({
      success: true,
      incident
    });
  } catch (error) {
    console.error("Get incident by ID error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getMyIncidents = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const incidents = await Incident.getByUserId(userId);
    res.status(200).json({
      success: true,
      total: incidents.length,
      incidents
    });
  } catch (error) {
    console.error("Get my incidents error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, message: "Incident ID and status are required" });
    }

    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const incident = await Incident.getById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    const updated = await Incident.updateStatus(id, status);
    res.status(200).json({
      success: true,
      message: "Incident status updated successfully",
      incident: updated
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, priority, description } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Incident ID is required" });
    }

    const incident = await Incident.getById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    const updates = {
      title: title || incident.title,
      type: type || incident.type,
      priority: priority || incident.priority,
      description: description || incident.description
    };

    const updated = await Incident.update(id, updates);
    res.status(200).json({
      success: true,
      message: "Incident updated successfully",
      incident: updated
    });
  } catch (error) {
    console.error("Update incident error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Incident ID is required" });
    }

    const incident = await Incident.getById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    await Incident.delete(id);
    res.status(200).json({
      success: true,
      message: "Incident deleted successfully"
    });
  } catch (error) {
    console.error("Delete incident error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await Incident.getStats();
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getLatest = async (req, res) => {
  try {
    const incidents = await Incident.getLatest(3);
    res.status(200).json({
      success: true,
      total: incidents.length,
      incidents
    });
  } catch (error) {
    console.error("Get latest incidents error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
