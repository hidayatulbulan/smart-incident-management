const Incident = require("../models/incidentModel");
const { analyzeIncident } = require("../services/aiRuleBased");
const { createNotificationsForMultiple } = require("../helpers/notificationHelper");
const db = require("../config/database");

// ── NEW: SLA & AI Services ──────────────────────────
const slaService = require("../services/slaService");
const aiService  = require("../services/aiService");
const aiKnowledgeService = require("../services/aiKnowledge.service");
// ───────────────────────────────────────────────────

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

    // ── NEW: Hitung & simpan SLA setelah insiden dibuat ──
    try {
      const slaData = slaService.calculateSLA((aiAnalysis.priority || "medium").toLowerCase(), new Date());
      await db.query(
        `UPDATE incidents
         SET sla_response_min        = ?,
             sla_resolution_min      = ?,
             sla_response_deadline   = ?,
             sla_resolution_deadline = ?
         WHERE id = ?`,
        [
          slaData.sla_response_min,
          slaData.sla_resolution_min,
          slaData.sla_response_deadline,
          slaData.sla_resolution_deadline,
          incident.id,
        ]
      );
      console.log(`[SLA] Set for incident #${incident.id} — priority: ${aiAnalysis.priority}, response: ${slaData.sla_response_min}min, resolution: ${slaData.sla_resolution_min}min`);
    } catch (slaErr) {
      // SLA error tidak gagalkan response utama
      console.error("[SLA] Failed to set SLA:", slaErr.message);
    }
    // ── Generate AI recommendation + KB saat laporan pertama dibuat ──
try {
  const freshIncident = await Incident.getById(incident.id);
  const slaForAI = slaService.prepareSLAForAI(freshIncident);

  // Cari kasus serupa dari knowledge base
  const kbResult = await aiKnowledgeService.getRecommendation(
    freshIncident.description,
    freshIncident.category || freshIncident.type
  );

  // Inject KB ke dalam data incident sebelum dikirim ke AI
  const incidentWithKB = {
    ...freshIncident,
    kb_similar_cases: kbResult.found ? kbResult.similar_cases : [],
    kb_summary: kbResult.found ? kbResult.summary : null,
  };

  const aiResult = await aiService.generateRecommendation(incidentWithKB, slaForAI);
  if (aiResult?.data) {
    await db.query(
      "UPDATE incidents SET recommendation = ? WHERE id = ?",
      [JSON.stringify(aiResult.data), incident.id]
    );
    console.log(`[AI] Initial recommendation saved for incident #${incident.id} (KB: ${kbResult.found ? kbResult.summary?.total_cases + ' cases' : 'none'})`);
  }
} catch (aiErr) {
  console.error("[AI] Failed to generate initial recommendation:", aiErr.message);
}
// ─────────────────────────────────────────────────────────────
   

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

    // ── NEW: Evaluasi SLA real-time & parse rekomendasi AI ──
    try {
      incident.sla_status = slaService.evaluateSLA(incident);
      incident.recommendation_parsed = aiService.parseStoredRecommendation(incident.recommendation);
    } catch (slaErr) {
      console.error("[SLA/AI] evaluateSLA error:", slaErr.message);
    }
    // ────────────────────────────────────────────────────────

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

    const validStatuses = ["open", "in_progress", "closed"];
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
    const userId = req.user?.id;

    if (!id) {
      return res.status(400).json({ success: false, message: "Incident ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const incident = await Incident.getById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // Verify ownership - only the report owner can delete
    if (incident.user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Anda tidak memiliki izin untuk menghapus laporan ini" 
      });
    }

    await Incident.delete(id);
    res.status(200).json({
      success: true,
      message: "Laporan berhasil dihapus"
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

// ════════════════════════════════════════════════════════
// NEW: resolveIncident
// Solver/admin isi catatan → trigger AI recommendation
// Route: PUT /api/incidents/:id/resolve
// ════════════════════════════════════════════════════════
exports.resolveIncident = async (req, res) => {
  try {
    const { id }                  = req.params;
    const { solver_note, status } = req.body;
    const now                     = new Date();
    const newStatus               = status || "closed";

    if (!id) {
      return res.status(400).json({ success: false, message: "Incident ID is required" });
    }
    if (!solver_note) {
      return res.status(400).json({ success: false, message: "Catatan penyelesaian (solver_note) wajib diisi" });
    }

    // Ambil incident
    const incident = await Incident.getById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // Update: status, solver_note, resolved_at, responded_at
    const resolvedAt = newStatus === "closed" ? now : null;
    await db.query(
      `UPDATE incidents
       SET solver_note  = ?,
           status       = ?,
           resolved_at  = ?,
           responded_at = COALESCE(responded_at, ?)
       WHERE id = ?`,
      [solver_note, newStatus, resolvedAt, now, id]
    );

    // Ambil data terbaru setelah update
    const updated = await Incident.getById(id);

    // Evaluasi SLA & update is_overdue
    try {
      const slaEval = slaService.evaluateSLA(updated);
      await db.query(
        "UPDATE incidents SET is_overdue = ? WHERE id = ?",
        [slaEval.isOverdue ? 1 : 0, id]
      );
      console.log(`[SLA] is_overdue updated for incident #${id}: ${slaEval.isOverdue}`);
    } catch (slaErr) {
      console.error("[SLA] evaluateSLA error:", slaErr.message);
    }

    // Generate AI recommendation
    let aiResult = null;
    try {
      const slaForAI = slaService.prepareSLAForAI(updated);
      aiResult       = await aiService.generateRecommendation(updated, slaForAI);

      if (aiResult?.data) {
        await db.query(
          "UPDATE incidents SET recommendation = ? WHERE id = ?",
          [JSON.stringify(aiResult.data), id]
        );
        console.log(`[AI] Recommendation saved for incident #${id} — source: ${aiResult.source}`);
      }
    } catch (aiErr) {
      console.error("[AI] generateRecommendation error:", aiErr.message);
    }

    // Notifikasi ke user pelapor
    try {
      const statusLabel = newStatus === "closed" ? "diselesaikan" : "diperbarui";
      await createNotificationsForMultiple(
        [updated.user_id],
        "Status Laporan Diperbarui",
        `Laporan "${updated.title}" telah ${statusLabel} oleh tim teknisi.`,
        "incident_resolved"
      );
    } catch (notifErr) {
      console.error("[NOTIF] Failed to send notification:", notifErr.message);
    }

    // ── NEW: Simpan ke Knowledge Base jika status "closed" ──
    let kbResult = null;
    if (newStatus === "closed") {
      try {
        // Ambil data incident terbaru dengan is_overdue
        const incidentForKB = await Incident.getById(id);
        // Kirim juga solver ID (req.user.id)
        const solverId = req.user?.id;
        kbResult = await aiKnowledgeService.processClosedIncident(incidentForKB, solverId);
        console.log(`[KB] Knowledge Base result for #${id}:`, kbResult?.skipped ? 'skipped' : 'saved');
      } catch (kbErr) {
        console.error("[KB] Failed to save to knowledge base:", kbErr.message);
        // Jangan gagalkan response utama
      }
    }
    // ─────────────────────────────────────────────────────

    return res.status(200).json({
      success:        true,
      message:        "Insiden berhasil diselesaikan. Rekomendasi AI telah dibuat.",
      status:         newStatus,
      ai_source:      aiResult?.source || "none",
      recommendation: aiResult?.data   || null,
      kb_saved:       kbResult?.skipped === true ? false : !!kbResult,
    });

  } catch (error) {
    console.error("resolveIncident error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// ════════════════════════════════════════════════════════
// getAIRecommendation
// User/admin ambil rekomendasi AI (cached atau generate baru)
// Route: POST /api/incidents/:id/recommend
// ════════════════════════════════════════════════════════
exports.getAIRecommendation = async (req, res) => {
  try {
    const { id }   = req.params;
    const forceNew = req.query.refresh === "1";

    if (!id) {
      return res.status(400).json({ success: false, message: "Incident ID is required" });
    }

    const incident = await Incident.getById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    // Return cache jika ada dan tidak diminta refresh
    if (incident.recommendation && !forceNew) {
      const cached = aiService.parseStoredRecommendation(incident.recommendation);
      if (cached) {
        return res.status(200).json({ success: true, source: "cached", data: cached });
      }
    }

    // Generate baru
    const slaForAI = slaService.prepareSLAForAI(incident);
    const aiResult = await aiService.generateRecommendation(incident, slaForAI);

    // Simpan ke DB
    if (aiResult?.data) {
      await db.query(
        "UPDATE incidents SET recommendation = ? WHERE id = ?",
        [JSON.stringify(aiResult.data), id]
      );
    }

    return res.status(200).json({
      success: true,
      source:  aiResult.source,
      data:    aiResult.data,
    });

  } catch (error) {
    console.error("getAIRecommendation error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};