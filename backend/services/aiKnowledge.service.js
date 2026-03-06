/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║       SmartIncident — AI Knowledge Base Service         ║
 * ║  Simpan data insiden closed ke knowledge_base           ║
 * ╚══════════════════════════════════════════════════════════╝
 * 
 * Fungsi:
 * - saveToKnowledgeBase: simpan ke tabel knowledge_base
 * - isIncidentInKnowledgeBase: cek duplikat
 * - processClosedIncident: fungsi utama dipanggil dari controller
 * 
 * Tidak menggunakan NLP atau ML - hanya rule-based learning
 */

const db = require("../config/database");

// ─────────────────────────────────────────────────────────
// isIncidentInKnowledgeBase: Cek apakah sudah ada (prevent double)
// ─────────────────────────────────────────────────────────
async function isIncidentInKnowledgeBase(incidentId) {
  try {
    const [rows] = await db.query(
      "SELECT id FROM knowledge_base WHERE incident_id = ?",
      [incidentId]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('[KB] Error checking duplicate:', error.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// normalizeCategory: Normalisasi format kategori
// ─────────────────────────────────────────────────────────
function normalizeCategory(category) {
  if (!category) return 'IT';
  
  const cat = category.toLowerCase().trim();
  
  // Mapping kategori
  if (cat === 'it' || cat === 'teknologi' || cat === 'technology') return 'IT';
  if (cat === 'facilities' || cat === 'fasilitas' || cat === 'facility') return 'Fasilitas';
  
  return 'IT'; // default
}

// ─────────────────────────────────────────────────────────
// saveToKnowledgeBase: Simpan ke tabel knowledge_base
// ─────────────────────────────────────────────────────────
async function saveToKnowledgeBase(incident, solverId) {
  try {
    const {
      id: incidentId,
      category,
      type,
      description,
      solver_note,
      is_overdue
    } = incident;
    
    // Validasi data wajib
    if (!incidentId || !description) {
      console.log('[KB] Skip: missing required fields');
      return null;
    }
    
    // Normalisasi kategori
    const rawCategory = category || type || 'IT';
    const kbCategory = normalizeCategory(rawCategory);
    
    // Problem = description, Solution = solver_note
    const problem  = description || '';
    const solution = solver_note || 'Tidak ada catatan penyelesaian';

    // Result = kalimat pertama dari solver_note (ringkasan singkat)
    const result = solver_note
      ? solver_note.split('.')[0].trim()
      : 'Selesai';

    // Hitung duration_minutes dari created_at sampai resolved_at
    let duration_minutes = null;
    if (incident.created_at && incident.resolved_at) {
      const start = new Date(incident.created_at);
      const end   = new Date(incident.resolved_at);
      duration_minutes = Math.round((end - start) / 60000);
    }

    // Ekstrak keywords dari title + description
    const keywordSource = `${incident.title || ''} ${description || ''}`;
    const keywords = keywordSource
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 8)
      .join(',') || null;
    
    // Handle is_overdue
    let overdue = 0;
    if (is_overdue !== undefined && is_overdue !== null) {
      overdue = (is_overdue === 1 || is_overdue === true) ? 1 : 0;
    }
    
    // INSERT ke knowledge_base
    const [insertResult] = await db.query(
      `INSERT INTO knowledge_base 
       (incident_id, category, problem, solution, result, duration_minutes, keywords, created_by, is_overdue, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        incidentId,
        kbCategory,
        problem,
        solution,
        result,
        duration_minutes,
        keywords,
        solverId || null,
        overdue
      ]
    );
    
    console.log(`[KB] Saved incident #${incidentId} to knowledge_base (ID: ${insertResult.insertId})`);
    
    return {
      id: insertResult.insertId,
      incident_id: incidentId,
      category: kbCategory
    };
    
  } catch (error) {
    console.error('[KB] Error saving:', error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────
// processClosedIncident: Fungsi utama (dipanggil dari controller)
// Hanya jalankan jika status = "closed"
// ─────────────────────────────────────────────────────────
async function processClosedIncident(incident, solverId = null) {
  try {
    const incidentId = incident.id;
    
    // Validasi input
    if (!incidentId) {
      console.log('[KB] Skip: no incident ID');
      return { skipped: true, reason: 'no_incident_id' };
    }
    
    // CEK: Apakah sudah ada di knowledge_base? (prevent double insert)
    const exists = await isIncidentInKnowledgeBase(incidentId);
    if (exists) {
      console.log(`[KB] Skip: incident #${incidentId} already in knowledge_base`);
      return { skipped: true, reason: 'already_exists' };
    }
    
    // SIMPAN ke knowledge_base
    const result = await saveToKnowledgeBase(incident, solverId);
    
    return result;
    
  } catch (error) {
    console.error('[KB] processClosedIncident error:', error.message);
    // Jangan throw error agar tidak ganggu flow utama
    return { error: error.message };
  }
}

// ─────────────────────────────────────────────────────────
// getAllKnowledgeBase: Ambil semua data knowledge base
// ─────────────────────────────────────────────────────────
async function getAllKnowledgeBase(limit = 50, offset = 0) {
  try {
    const [rows] = await db.query(
      `SELECT * FROM knowledge_base ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  } catch (error) {
    console.error('[KB] Error getting KB:', error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────
// searchKnowledgeBase: Cari berdasarkan keyword
// ─────────────────────────────────────────────────────────
async function searchKnowledgeBase(keyword, category = null) {
  try {
    let query = `
      SELECT * FROM knowledge_base 
      WHERE (problem LIKE ? OR solution LIKE ?)
    `;
    const params = [`%${keyword}%`, `%${keyword}%`];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 20';
    
    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    console.error('[KB] Error searching KB:', error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────
// getRecommendation: Cari kasus serupa dari knowledge base
// Berdasarkan category dan keyword dari description incident
// ─────────────────────────────────────────────────────────
async function getRecommendation(description, category) {
  try {
    // Validasi input
    if (!description) {
      return {
        found: false,
        message: "Tidak ditemukan solusi serupa di knowledge base.",
        similar_cases: []
      };
    }

    // Normalisasi kategori
    const kbCategory = normalizeCategory(category);
    
    // Ekstrak kata kunci dari description
    const keywords = description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);

    let similarCases = [];
    
    if (keywords.length > 0) {
      const keywordConditions = keywords.map(() => '(problem LIKE ? OR keywords LIKE ?)').join(' OR ');
      
      const query = `
        SELECT 
          id,
          incident_id,
          category,
          problem,
          solution,
          result,
          duration_minutes,
          keywords,
          created_at,
          is_overdue,
          MATCH(problem, keywords) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
        FROM knowledge_base
        WHERE category = ? 
          AND (${keywordConditions})
        ORDER BY relevance DESC, created_at DESC
        LIMIT 5
      `;
      
      const params = [
        keywords.join(' '),
        kbCategory,
        ...keywords.flatMap(k => [`%${k}%`, `%${k}%`])
      ];
      
      const [rows] = await db.query(query, params);
      similarCases = rows;
    }

    // Fallback: Jika tidak ada hasil dari keyword, cari berdasarkan kategori saja
    if (similarCases.length === 0) {
      const [fallbackRows] = await db.query(
        `SELECT * FROM knowledge_base 
         WHERE category = ? 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [kbCategory]
      );
      similarCases = fallbackRows;
    }

    if (similarCases.length === 0) {
      return {
        found: false,
        message: "Tidak ditemukan solusi serupa di knowledge base.",
        similar_cases: []
      };
    }

    const formattedCases = similarCases.map(item => ({
      id: item.id,
      incident_id: item.incident_id,
      problem: item.problem,
      solution: item.solution,
      result: item.result,
      duration_minutes: item.duration_minutes,
      keywords: item.keywords,
      created_at: item.created_at,
      is_overdue: item.is_overdue === 1
    }));

    const avgDuration = similarCases.length > 0
      ? Math.round(similarCases.reduce((sum, item) => sum + (item.duration_minutes || 0), 0) / similarCases.length)
      : null;

    return {
      found: true,
      message: `Ditemukan ${similarCases.length} kasus serupa dari knowledge base.`,
      similar_cases: formattedCases,
      summary: {
        total_cases: similarCases.length,
        avg_duration_minutes: avgDuration,
        category: kbCategory
      }
    };

  } catch (error) {
    console.error('[KB] Error getRecommendation:', error.message);
    return {
      found: false,
      message: "Terjadi kesalahan saat mencari rekomendasi.",
      similar_cases: [],
      error: error.message
    };
  }
}

module.exports = {
  isIncidentInKnowledgeBase,
  saveToKnowledgeBase,
  processClosedIncident,
  getAllKnowledgeBase,
  searchKnowledgeBase,
  getRecommendation
};