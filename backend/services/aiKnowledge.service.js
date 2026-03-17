/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           SmartIncident — AI Knowledge Service                       ║
 * ║  Dipanggil controller via:                                           ║
 * ║    getRecommendation(description, category)                          ║
 * ║    processClosedIncident(incident, userId)                           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const db = require("../config/database");

// ─────────────────────────────────────────────────────────
// NOUN SPESIFIK — bobot tinggi, menentukan relevansi topik
// ─────────────────────────────────────────────────────────
const HIGH_PRIORITY_KEYWORDS = [
  // IT
  'monitor', 'wifi', 'printer', 'internet', 'laptop', 'proyektor',
  'komputer', 'tinta', 'email', 'aplikasi', 'mouse', 'keyboard',
  'server', 'jaringan', 'kabel', 'router', 'switch', 'driver',
  // Fasilitas
  'dispenser', 'lampu', 'listrik', 'toilet', 'pintu', 'engsel',
  'galon', 'keran', 'saluran', 'kursi', 'meja', 'kipas',
  // Kata pendek spesifik — whole-word match
  'ac', 'pc', 'hp', 'usb', 'lan', 'mcb'
];

// ─────────────────────────────────────────────────────────
// NOISE WORDS — kata umum yang muncul di SEMUA kasus
// Tidak boleh dipakai untuk menentukan relevansi
// ─────────────────────────────────────────────────────────
const NOISE_WORDS = new Set([
  'mengeluarkan', 'mengalir', 'menyalakan', 'mematikan', 'membuka',
  'menutup', 'menghubungkan', 'menggunakan', 'melakukan', 'ditemukan',
  'dilakukan', 'digunakan', 'terhubung', 'terisi', 'bekerja', 'berjalan',
  'rusak', 'mati', 'hidup', 'lambat', 'cepat', 'panas', 'dingin',
  'berisik', 'normal', 'bagus', 'baru', 'lama',
  'tidak', 'bisa', 'dapat', 'sudah', 'masih', 'saat', 'yang',
  'dari', 'dengan', 'untuk', 'pada', 'akan', 'juga', 'lagi',
  'saja', 'atau', 'dan', 'ini', 'itu', 'ada', 'jika', 'agar',
  'karena', 'namun', 'tetapi', 'sehingga', 'seperti', 'serta',
  'ruang', 'lantai', 'area', 'bagian', 'unit', 'kantor', 'staf',
  'karyawan', 'petugas', 'teknisi', 'sistem', 'proses', 'catatan',
  'penyelesaian', 'solver', 'setelah', 'sebelum', 'pengecekan'
]);

// ─────────────────────────────────────────────────────────
// TOKENISASI — membuang noise, mendukung kata pendek prioritas
// ─────────────────────────────────────────────────────────
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => {
      if (!w || w.length < 2) return false;
      if (NOISE_WORDS.has(w)) return false;
      if (w.length >= 4) return true;
      if (HIGH_PRIORITY_KEYWORDS.includes(w)) return true;
      return false;
    });
}

// ─────────────────────────────────────────────────────────
// DEDUPLICATION KEYWORD
// Menghapus duplikat, membuang typo/noise, dan membatasi jumlah
// ─────────────────────────────────────────────────────────
function deduplicateKeywords(keywords, maxCount = 10) {
  if (!keywords) return null;

  const seen = new Set();
  const result = [];

  const list = keywords
    .split(/[,\s]+/)
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length >= 2);

  for (const kw of list) {
    if (seen.has(kw)) continue;      
    if (NOISE_WORDS.has(kw)) continue; 
    seen.add(kw);
    result.push(kw);
    if (result.length >= maxCount) break;
  }

  return result.length > 0 ? result.join(',') : null;
}

// ─────────────────────────────────────────────────────────
// SCORING KB
// - Match di kolom `keywords` KB = bobot x2 (paling kuat)
// - Match di kolom `problem` KB = bobot x1
// - Noun spesifik = bobot 10, kata biasa = bobot 1
// ─────────────────────────────────────────────────────────
function scoreKBCase(kb, tokens) {
  if (!tokens || tokens.length === 0) return 0;

  const kbProblem  = (kb.problem  || '').toLowerCase();
  const kbKeywords = (kb.keywords || '').toLowerCase();

  const kbKeywordList = kbKeywords
    .split(/[,\s]+/)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  let score = 0;

  tokens.forEach(token => {
    const isShort    = token.length <= 3;
    const isPriority = HIGH_PRIORITY_KEYWORDS.includes(token);
    const weight     = isPriority ? 10 : 1;

    // Cek kolom keywords KB 
    const matchedKeyword = kbKeywordList.some(kw =>
      isShort ? kw === token : (kw.includes(token) || token.includes(kw))
    );

    if (matchedKeyword) {
      score += weight * 2;
      return;
    }

    // Cek kolom problem KB
    const matchedProblem = isShort
      ? new RegExp(`\\b${token}\\b`).test(kbProblem)
      : kbProblem.includes(token);

    if (matchedProblem) {
      score += weight;
    }
  });

  return score;
}

function normalizeCategory(category) {
  const raw = (category || '').toLowerCase().trim();
  if (['fasilitas', 'facilities', 'facility'].includes(raw)) return 'Fasilitas';
  return 'IT';
}

// ─────────────────────────────────────────────────────────
// FUNGSI UTAMA: getRecommendation(description, category)
// ─────────────────────────────────────────────────────────
async function getRecommendation(description, category) {
  try {
    const cat    = normalizeCategory(category);
    const tokens = tokenize(description);

    console.log(`[KB] Tokens: [${tokens.join(', ')}] | Kategori: ${cat}`);

    if (tokens.length === 0) {
      return { found: false, similar_cases: [], summary: null };
    }

    const [rows] = await db.query(
      `SELECT id, incident_id, category, problem, solution, result,
              duration_minutes, keywords, created_at
       FROM knowledge_base
       WHERE solution IS NOT NULL AND solution != ''
         AND (category = ? OR category IS NULL OR category = '')
       ORDER BY created_at DESC
       LIMIT 100`,
      [cat]
    );

    if (!rows || rows.length === 0) {
      return { found: false, similar_cases: [], summary: null };
    }

    const scored = rows
      .map(kb => {
        const s = scoreKBCase(kb, tokens);
        console.log(`[KB] id=${kb.id} "${(kb.problem||'').substring(0,40)}" score=${s}`);
        return { ...kb, _score: s };
      })
      .filter(kb => kb._score >= 10)
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);

    if (scored.length === 0) {
      console.log(`[KB] Tidak ada kasus relevan (threshold >= 10)`);
      return { found: false, similar_cases: [], summary: null };
    }

    const top     = scored[0];
    const summary = `Ditemukan ${scored.length} kasus serupa. `
      + `Kasus terdekat: "${(top.problem||'').substring(0, 80)}" `
      + (top.duration_minutes ? `— selesai dalam ${top.duration_minutes} menit.` : '');

    console.log(`[KB] Top match: id=${top.id} score=${top._score}`);
    return { found: true, similar_cases: scored, summary };

  } catch (error) {
    console.error("[aiKnowledge] getRecommendation error:", error.message);
    return { found: false, similar_cases: [], summary: null };
  }
}

// ─────────────────────────────────────────────────────────
// FUNGSI: processClosedIncident(incident, userId)
// ─────────────────────────────────────────────────────────
async function processClosedIncident(incident, userId) {
  try {
    if (!incident?.id) return { skipped: true, reason: 'invalid incident' };

    if (!incident.solver_note || incident.solver_note.trim().length < 10) {
      return { skipped: true, reason: 'solver_note too short' };
    }

    const [existing] = await db.query(
      'SELECT id FROM knowledge_base WHERE incident_id = ?',
      [incident.id]
    );
    if (existing?.length > 0) {
      return { skipped: true, reason: 'already in KB', kb_id: existing[0].id };
    }

    let durationMinutes = null;
    if (incident.created_at && incident.resolved_at) {
      const start = new Date(incident.created_at);
      const end   = new Date(incident.resolved_at);
      durationMinutes = Math.round((end - start) / 60000);
    }

    // Keywords: ambil noun spesifik dari title + description,
    // lalu deduplikasi agar tidak ada kata ganda
    const rawKeywords = tokenize(`${incident.title || ''} ${incident.description || ''}`)
      .filter(w => HIGH_PRIORITY_KEYWORDS.includes(w) || w.length >= 5)
      .join(',');

    const autoKeywords = deduplicateKeywords(rawKeywords, 10);

    const cat = normalizeCategory(incident.category || incident.type);

    await db.query(
      `INSERT INTO knowledge_base
         (incident_id, category, problem, solution, result,
          duration_minutes, keywords, is_overdue, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incident.id,
        cat,
        incident.description || incident.title,
        incident.solver_note,
        incident.result || null,
        durationMinutes,
        autoKeywords || null,
        incident.is_overdue ? 1 : 0,
        userId || null,
      ]
    );

    console.log(`[KB] #${incident.id} disimpan — keywords: ${autoKeywords}`);
    return { skipped: false, saved: true };

  } catch (error) {
    console.error("[aiKnowledge] processClosedIncident error:", error.message);
    return { skipped: true, reason: error.message };
  }
}

module.exports = {
  getRecommendation,
  processClosedIncident,
  normalizeCategory,
  tokenize,
  deduplicateKeywords,
};