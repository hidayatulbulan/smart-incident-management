const Incident = require("../models/incidentModel");
const { analyzeIncident } = require("../services/aiRuleBased");
const { createNotificationsForMultiple } = require("../helpers/notificationHelper");
const db = require("../config/database");

const slaService         = require("../services/slaService");
const aiService          = require("../services/aiService");
const aiKnowledgeService = require("../services/aiKnowledge.service");

// ─────────────────────────────────────────────────────────
// HELPER: Inject KB ke incident
// ─────────────────────────────────────────────────────────
async function injectKBToIncident(incident) {
  try {
    const kbResult = await aiKnowledgeService.getRecommendation(
      incident.description,
      incident.category || incident.type
    );
    return {
      ...incident,
      kb_similar_cases: kbResult.found ? kbResult.similar_cases : [],
      kb_summary:       kbResult.found ? kbResult.summary       : null,
    };
  } catch (err) {
    console.error("[KB] injectKBToIncident error:", err.message);
    return { ...incident, kb_similar_cases: [], kb_summary: null };
  }
}

// ─────────────────────────────────────────────────────────
// CREATE INCIDENT
// FIX: Tidak menyimpan rekomendasi ke DB saat insiden dibuat.
// Rekomendasi di-generate fresh setiap kali user membuka detail
// insiden via getAIRecommendation(). Ini memastikan rekomendasi
// selalu pakai KB terbaru .
// ─────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { title, type, category, description, location } = req.body;
    const userId = req.user?.id;

    const categoryValue = category || type;

    if (!title || !categoryValue || !description) {
      return res.status(400).json({ success: false, message: "Title, category/type, and description are required" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const aiAnalysis = analyzeIncident({ title, description, type: categoryValue });
    const photo      = req.file ? req.file.filename : null;

    const incident = await Incident.createWithPhoto(
      userId, title, categoryValue, description,
      location || "Not specified", photo, "open",
      aiAnalysis.priority || "Medium"
    );

    // Set SLA
    try {
      const slaData = slaService.calculateSLA((aiAnalysis.priority || "medium").toLowerCase(), new Date());
      await db.query(
        `UPDATE incidents
         SET sla_response_min        = ?,
             sla_resolution_min      = ?,
             sla_response_deadline   = ?,
             sla_resolution_deadline = ?
         WHERE id = ?`,
        [slaData.sla_response_min, slaData.sla_resolution_min,
         slaData.sla_response_deadline, slaData.sla_resolution_deadline, incident.id]
      );
      console.log(`[SLA] Set for incident #${incident.id}`);
    } catch (slaErr) {
      console.error("[SLA] Failed to set SLA:", slaErr.message);
    }
admin 
    try {
      const [reporterData] = await db.query("SELECT name FROM users WHERE id = ?", [userId]);
      const reporterName   = reporterData[0]?.name || "User";
      const [admins]       = await db.query("SELECT id FROM users WHERE role = 'admin'");
      const adminIds       = admins.map(a => a.id);

      if (adminIds.length > 0) {
        await createNotificationsForMultiple(
          adminIds,
          "Laporan Baru Masuk",
          `${reporterName} melaporkan: ${title}`,
          "new_incident",
          incident.id
        );
      }
    } catch (notifErr) {
      console.error("[NOTIF] Failed to send notification:", notifErr.message);
    }

    res.status(201).json({ success: true, message: "Incident created successfully", incident });
  } catch (error) {
    console.error("Create incident error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const incidents = await Incident.getAll();
    res.status(200).json({ success: true, total: incidents.length, incidents });
  } catch (error) {
    console.error("Get all incidents error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Incident ID is required" });

    const incident = await Incident.getById(id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    try {
      incident.sla_status = slaService.evaluateSLA(incident);
    } catch (slaErr) {
      console.error("[SLA] evaluateSLA error:", slaErr.message);
    }

    res.status(200).json({ success: true, incident });
  } catch (error) {
    console.error("Get incident by ID error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getMyIncidents = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });

    const incidents = await Incident.getByUserId(userId);
    res.status(200).json({ success: true, total: incidents.length, incidents });
  } catch (error) {
    console.error("Get my incidents error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    if (!id || !status) return res.status(400).json({ success: false, message: "Incident ID and status are required" });

    const validStatuses = ["open", "in_progress", "closed"];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });

    const incident = await Incident.getById(id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    const updated = await Incident.updateStatus(id, status);
    res.status(200).json({ success: true, message: "Incident status updated successfully", incident: updated });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id }                                 = req.params;
    const { title, type, priority, description } = req.body;

    if (!id) return res.status(400).json({ success: false, message: "Incident ID is required" });

    const incident = await Incident.getById(id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    const updates = {
      title:       title       || incident.title,
      type:        type        || incident.type,
      priority:    priority    || incident.priority,
      description: description || incident.description,
    };

    const updated = await Incident.update(id, updates);
    res.status(200).json({ success: true, message: "Incident updated successfully", incident: updated });
  } catch (error) {
    console.error("Update incident error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id }   = req.params;
    const userId   = req.user?.id;

    if (!id)     return res.status(400).json({ success: false, message: "Incident ID is required" });
    if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });

    const incident = await Incident.getById(id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    if (incident.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki izin untuk menghapus laporan ini" });
    }

    await Incident.delete(id);
    res.status(200).json({ success: true, message: "Laporan berhasil dihapus" });
  } catch (error) {
    console.error("Delete incident error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await Incident.getStats();
    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

exports.getLatest = async (req, res) => {
  try {
    const incidents = await Incident.getLatest(3);
    res.status(200).json({ success: true, total: incidents.length, incidents });
  } catch (error) {
    console.error("Get latest incidents error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────
// RESOLVE INCIDENT
// FIX: Hapus cache rekomendasi saat selesai, 
// lalu generate rekomendasi fresh pakai KB yang sudah terupdate
// ─────────────────────────────────────────────────────────
exports.resolveIncident = async (req, res) => {
  try {
    const { id }                  = req.params;
    const { solver_note, status } = req.body;
    const now                     = new Date();
    const newStatus               = status || "closed";

    if (!id)          return res.status(400).json({ success: false, message: "Incident ID is required" });
    if (!solver_note) return res.status(400).json({ success: false, message: "Catatan penyelesaian (solver_note) wajib diisi" });

    const incident = await Incident.getById(id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

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

    const updated = await Incident.getById(id);

    // Evaluasi SLA
    try {
      const slaEval = slaService.evaluateSLA(updated);
      await db.query("UPDATE incidents SET is_overdue = ? WHERE id = ?", [slaEval.isOverdue ? 1 : 0, id]);
    } catch (slaErr) {
      console.error("[SLA] evaluateSLA error:", slaErr.message);
    }

    // KB harus sudah ada datanya saat generate rekomendasi
    let kbResult = null;
    if (newStatus === "closed") {
      try {
        const incidentForKB = await Incident.getById(id);
        kbResult = await aiKnowledgeService.processClosedIncident(incidentForKB, req.user?.id);
        console.log(`[KB] Result for #${id}:`, kbResult?.skipped ? `skipped (${kbResult.reason})` : "saved ✓");
      } catch (kbErr) {
        console.error("[KB] Failed to save to knowledge base:", kbErr.message);
      }
    }
    try {
      await db.query("UPDATE incidents SET recommendation = NULL WHERE id = ?", [id]);

      const latestIncident = await Incident.getById(id);
      const slaForAI       = slaService.prepareSLAForAI(latestIncident);
      const incidentWithKB = await injectKBToIncident(latestIncident);
      const aiResult       = await aiService.generateRecommendation(incidentWithKB, slaForAI);

      if (aiResult?.data) {
        await db.query(
          "UPDATE incidents SET recommendation = ? WHERE id = ?",
          [JSON.stringify(aiResult.data), id]
        );
        console.log(`[AI] Recommendation saved for #${id} — source: ${aiResult.source}`);
      }
    } catch (aiErr) {
      console.error("[AI] generateRecommendation error:", aiErr.message);
    }
    try {
      const statusLabel = newStatus === "closed" ? "diselesaikan" : "diperbarui";
      await createNotificationsForMultiple(
        [updated.user_id],
        "Status Laporan Diperbarui",
        `Laporan "${updated.title}" telah ${statusLabel} oleh tim teknisi.`,
        "incident_resolved",
        parseInt(id)
      );
    } catch (notifErr) {
      console.error("[NOTIF] Failed to send notification:", notifErr.message);
    }

    return res.status(200).json({
      success:  true,
      message:  "Insiden berhasil diselesaikan.",
      status:   newStatus,
      kb_saved: kbResult?.skipped === true ? false : !!kbResult,
    });

  } catch (error) {
    console.error("resolveIncident error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────
// GET AI RECOMMENDATION
// FIX: Selalu generate fresh — tidak pakai cache dari DB.
// Cache dihapus agar tidak ada rekomendasi salah yang tersimpan.
// ─────────────────────────────────────────────────────────
exports.getAIRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "Incident ID is required" });

    const incident = await Incident.getById(id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });
    await db.query("UPDATE incidents SET recommendation = NULL WHERE id = ?", [id]);

    const slaForAI       = slaService.prepareSLAForAI(incident);
    const incidentWithKB = await injectKBToIncident(incident);
    const aiResult       = await aiService.generateRecommendation(incidentWithKB, slaForAI);

    if (aiResult?.data) {
      await db.query(
        "UPDATE incidents SET recommendation = ? WHERE id = ?",
        [JSON.stringify(aiResult.data), id]
      );
      console.log(`[AI] Fresh recommendation for #${id} — source: ${aiResult.source}`);
    }

    return res.status(200).json({
      success: true,
      source:  aiResult.source,
      data:    aiResult.data
    });

  } catch (error) {
    console.error("getAIRecommendation error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  AI SUGGESTION
// Dipanggil otomatis setelah AI generate rekomendasi
// POST /api/incidents/:id/ai-suggestion
// ─────────────────────────────────────────────────────────
exports.saveAISuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!id || !content) {
      return res.status(400).json({ success: false, message: "incident_id dan content wajib diisi" });
    }

    const [result] = await db.query(
      `INSERT INTO ai_suggestions (incident_id, content) VALUES (?, ?)`,
      [id, content]
    );

    return res.status(201).json({
      success: true,
      suggestion_id: result.insertId
    });
  } catch (error) {
    console.error("saveAISuggestion error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────
// SUBMIT FEEDBACK
// POST /api/incidents/:id/feedback
// Body: { feedback, ai_suggestion_id, reason }
// feedback: 'helpful' | 'not_relevant'
// reason: 'Kategori tidak sesuai' | 'Saran tidak relevan' | dst
// ─────────────────────────────────────────────────────────
exports.submitFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, ai_suggestion_id, reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    if (!feedback || !ai_suggestion_id) {
      return res.status(400).json({ success: false, message: "feedback dan ai_suggestion_id wajib diisi" });
    }
    if (!['helpful', 'not_relevant'].includes(feedback)) {
      return res.status(400).json({ success: false, message: "feedback harus 'helpful' atau 'not_relevant'" });
    }

    const [existing] = await db.query(
      `SELECT id FROM ai_feedbacks WHERE user_id = ? AND ai_suggestion_id = ?`,
      [userId, ai_suggestion_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Anda sudah memberikan feedback untuk saran ini" });
    }
    await db.query(
      `INSERT INTO ai_feedbacks (incident_id, user_id, ai_suggestion_id, feedback, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, ai_suggestion_id, feedback, reason || null]
    );

    const column = feedback === 'helpful' ? 'helpful_count' : 'not_relevant_count';
    await db.query(
      `UPDATE ai_suggestions SET ${column} = ${column} + 1 WHERE id = ?`,
      [ai_suggestion_id]
    );

    if (feedback === 'not_relevant') {
      try {
        const incident = await require('../models/incidentModel').getById(id);
        const [admins] = await db.query("SELECT id FROM users WHERE role = 'admin'");
        const adminIds = admins.map(a => a.id);

        if (adminIds.length > 0) {
          const { createNotificationsForMultiple } = require('../helpers/notificationHelper');
          await createNotificationsForMultiple(
            adminIds,
            "Feedback AI Negatif",
            `Saran AI untuk insiden "${incident?.title}" dinilai tidak relevan${reason ? `: ${reason}` : ''}`,
            "ai_feedback_negative",
            parseInt(id)
          );
        }
      } catch (notifErr) {
        console.error("[NOTIF] feedback notification error:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: feedback === 'helpful' ? "Terima kasih atas feedback positif!" : "Feedback diterima, kami akan tingkatkan saran AI."
    });

  } catch (error) {
    console.error("submitFeedback error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};