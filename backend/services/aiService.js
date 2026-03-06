/**
 * ╔══════════════════════════════════════════════════════╗
 * ║         SmartIncident — AI Service                   ║
 * ║  Generate rekomendasi user-friendly via Claude API  ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * INSTALASI:
 *   npm install @anthropic-ai/sdk
 *   atau tanpa SDK: npm install node-fetch (sudah built-in Node 18+)
 *
 * ENV (.env):
 *   ANTHROPIC_API_KEY=sk-ant-xxxxxxx
 *
 * CARA PAKAI di controller:
 *   const aiService = require('./aiService');
 *   const result = await aiService.generateRecommendation(incident, slaData);
 */

require('dotenv').config();
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL             = 'claude-3-5-haiku-20241022'; // cepat & hemat token
const MAX_TOKENS        = 600;

// ─────────────────────────────────────────────────────────
// PROMPT BUILDER
// Bangun sistem prompt + user prompt dari data insiden
// ─────────────────────────────────────────────────────────
function buildPrompt(incident, slaData) {
  const {
    title,
    category,
    description,
    status,
    priority,
    location,
    admin_note,
    solver_note,
    created_at,
    kb_similar_cases,
    kb_summary,
  } = incident;

  const {
    sla_response_target,
    sla_resolution_target,
    response_status,
    resolution_status,
    is_overdue,
    remaining_time,
    overdue_minutes,
    overall_sla_status,
  } = slaData;

  // Format waktu
  const createdFormatted = created_at
    ? new Date(created_at).toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'tidak diketahui';

  // SLA context string
  let slaContext = '';
  if (overall_sla_status === 'met') {
    slaContext = 'SLA telah terpenuhi. Insiden diselesaikan tepat waktu.';
  } else if (overall_sla_status === 'breached') {
    slaContext = `SLA terlampaui. Keterlambatan sekitar ${overdue_minutes || 0} menit dari batas yang ditentukan.`;
  } else if (overall_sla_status === 'warning') {
    slaContext = `Insiden mendekati batas SLA. Sisa waktu: ${remaining_time}.`;
  } else {
    slaContext = `Masih dalam batas SLA. Target respons: ${sla_response_target}, target penyelesaian: ${sla_resolution_target}. Sisa waktu: ${remaining_time}.`;
  }

  // Knowledge base context
  let kbContext = 'Tidak ada kasus serupa di knowledge base.';
  if (kb_similar_cases && kb_similar_cases.length > 0) {
    const kbLines = kb_similar_cases.slice(0, 3).map((kb, i) =>
      `  Kasus ${i+1}: "${kb.solution}" (durasi: ${kb.duration_minutes ? kb.duration_minutes + ' menit' : 'tidak diketahui'})`
    ).join('\n');
    kbContext = `Ditemukan ${kb_similar_cases.length} kasus serupa:\n${kbLines}`;
    if (kb_summary?.avg_duration_minutes) {
      kbContext += `\n  Rata-rata waktu penyelesaian: ${Math.round(kb_summary.avg_duration_minutes)} menit`;
    }
  }

  const systemPrompt = `Kamu adalah asisten AI dalam sistem SmartIncident, sebuah platform pelaporan insiden internal perusahaan.

Peranmu adalah memberikan informasi dan saran kepada USER (pelapor) agar mereka memahami status laporannya dengan tenang dan jelas.

ATURAN PENTING:
- Gunakan bahasa Indonesia yang sopan, ramah, dan mudah dipahami oleh non-teknis.
- JANGAN mengambil keputusan teknis atau mengubah status insiden.
- JANGAN menyalahkan siapapun.
- Fokus pada: menjelaskan posisi laporan, menenangkan user, edukasi ringan.
- Jika ada data kasus serupa dari knowledge base, gunakan untuk memberikan estimasi dan saran yang lebih akurat.
- Respons HARUS dalam format JSON yang valid (tanpa markdown, tanpa komentar).

FORMAT OUTPUT JSON:
{
  "ringkasan": "1-2 kalimat ringkasan situasi insiden saat ini",
  "status_sla": "penjelasan singkat status SLA untuk user (1 kalimat)",
  "saran": ["saran 1 untuk user", "saran 2", "saran 3"],
  "pesan_motivasi": "pesan singkat menenangkan/menyemangati user (1 kalimat)",
  "estimasi": "estimasi kapan insiden mungkin selesai atau keterangan tidak tersedia",
  "level": "info | warning | success | urgent"
}

Level diisi berdasarkan konteks:
- "success" jika insiden sudah closed/resolved
- "urgent" jika SLA terlampaui atau prioritas high
- "warning" jika mendekati batas SLA
- "info" untuk kondisi normal`;

  const userPrompt = `Data insiden yang perlu kamu analisis:

DETAIL INSIDEN:
- Judul: ${title || '-'}
- Kategori: ${category || incident.type || '-'}
- Deskripsi: ${description || '-'}
- Lokasi: ${location || '-'}
- Prioritas: ${priority || 'medium'}
- Status saat ini: ${status || 'open'}
- Dilaporkan pada: ${createdFormatted}

INFORMASI SLA:
- ${slaContext}
- Target respons: ${sla_response_target}
- Target penyelesaian: ${sla_resolution_target}
- Status keseluruhan SLA: ${overall_sla_status}

CATATAN DARI TIM:
- Catatan admin: ${admin_note || 'Belum ada catatan dari admin'}
- Catatan solver/teknisi: ${solver_note || 'Belum ada catatan penyelesaian'}

DATA KASUS SERUPA (KNOWLEDGE BASE):
${kbContext}

Berikan rekomendasi dalam format JSON sesuai instruksi. Jika ada kasus serupa, gunakan solusinya sebagai referensi untuk saran dan estimasi.`;

  return { systemPrompt, userPrompt };
}

// ─────────────────────────────────────────────────────────
// HTTP CALL ke Anthropic API (tanpa external dependency)
// ─────────────────────────────────────────────────────────
function callClaudeAPI(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Claude API error: ${parsed.error.message}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse Claude API response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────
// PARSE response JSON dari Claude
// Robust parsing — handle jika ada backtick/markdown
// ─────────────────────────────────────────────────────────
function parseAIResponse(rawText) {
  try {
    // Bersihkan backtick markdown jika ada
    let cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // Cari JSON object
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }

    return JSON.parse(cleaned);
  } catch (e) {
    // Fallback jika parsing gagal
    return {
      ringkasan:       rawText.substring(0, 200),
      status_sla:      'Informasi SLA tidak dapat ditampilkan saat ini.',
      saran:           ['Silakan hubungi admin untuk informasi lebih lanjut.'],
      pesan_motivasi:  'Tim kami sedang bekerja keras menangani insiden Anda.',
      estimasi:        'Tidak tersedia',
      level:           'info',
    };
  }
}

// ─────────────────────────────────────────────────────────
// FALLBACK: Jika API key tidak ada atau error, generate
// rekomendasi berbasis rule sederhana + knowledge base
// ─────────────────────────────────────────────────────────
function generateFallbackRecommendation(incident, slaData) {
  const status    = (incident.status || 'open').toLowerCase();
  const priority  = (incident.priority || 'medium').toLowerCase();
  const slaStatus = slaData.overall_sla_status;

  // Data dari knowledge base (jika ada)
  const kbCases   = incident.kb_similar_cases || [];
  const kbSummary = incident.kb_summary || null;
  const hasKB     = kbCases.length > 0;

  let level    = 'info';
  let ringkasan = '';
  let statusSla = '';
  let pesan     = '';
  let estimasi  = '';
  const saran   = [];

  if (status === 'closed' || status === 'resolved') {
    level     = 'success';
    ringkasan = 'Insiden Anda telah berhasil diselesaikan oleh tim teknisi.';
    statusSla = slaData.is_overdue
      ? 'Insiden diselesaikan melewati batas SLA.'
      : 'SLA terpenuhi — insiden diselesaikan tepat waktu.';
    pesan     = 'Terima kasih atas laporan Anda. Semoga aktivitas Anda kembali berjalan lancar! 🎉';
    estimasi  = 'Sudah selesai';
    saran.push(
      'Pastikan masalah benar-benar teratasi. Jika muncul kembali, buat laporan baru.',
      'Anda dapat memberikan feedback melalui halaman riwayat laporan.',
    );

  } else if (slaStatus === 'breached') {
    level     = 'urgent';
    ringkasan = 'Laporan Anda telah melewati batas waktu SLA yang ditentukan. Tim kami sedang mengupayakan penanganan secepatnya.';
    statusSla = `SLA terlampaui ${slaData.overdue_minutes || 0} menit dari batas yang ditetapkan.`;
    pesan     = 'Kami mohon maaf atas keterlambatan ini. Tim sedang memprioritaskan laporan Anda.';
    estimasi  = 'Sedang diupayakan sesegera mungkin';
    saran.push(
      'Jika belum ada tindakan, Anda dapat menghubungi admin langsung.',
      'Pantau status laporan secara berkala di halaman ini.',
      'Dokumentasikan dampak insiden jika diperlukan untuk evaluasi.',
    );

  } else if (slaStatus === 'warning') {
    level     = 'warning';
    ringkasan = 'Laporan Anda sedang dalam proses penanganan dan mendekati batas waktu SLA.';
    statusSla = `Mendekati batas SLA. Sisa waktu: ${slaData.remaining_time}.`;
    pesan     = 'Tim sedang bekerja. Harap bersabar, insiden Anda sedang diprioritaskan.';
    estimasi  = `Sekitar ${slaData.remaining_time} lagi`;
    saran.push(
      'Pastikan informasi pada laporan sudah lengkap agar proses lebih cepat.',
      'Jika ada perkembangan penting, tambahkan komentar pada laporan.',
    );

  } else {
    level     = priority === 'high' ? 'warning' : 'info';
    ringkasan = 'Laporan Anda telah diterima dan sedang dalam antrian penanganan oleh tim teknis.';
    statusSla = `Masih dalam batas SLA. Target penyelesaian: ${slaData.sla_resolution_target}.`;
    pesan     = 'Laporan Anda sudah tercatat. Tim kami akan segera menindaklanjuti.';
    estimasi  = `Dalam ${slaData.sla_resolution_target}`;
    saran.push(
      'Tetap pantau status laporan melalui halaman ini.',
      'Pastikan Anda dapat dihubungi jika tim memerlukan informasi tambahan.',
      'Jangan lupa lampirkan foto atau detail tambahan jika ada.',
    );

    // ── Tambahkan info dari knowledge base jika ada ──
    if (hasKB) {
      const topCase = kbCases[0];

      // Tambahkan saran dari solusi kasus serupa
      if (topCase.solution) {
        const shortSolution = topCase.solution.length > 120
          ? topCase.solution.substring(0, 120) + '...'
          : topCase.solution;
        saran.push(`💡 Berdasarkan kasus serupa sebelumnya: ${shortSolution}`);
      }

      // Update estimasi berdasarkan rata-rata durasi KB
      if (kbSummary?.avg_duration_minutes && kbSummary.avg_duration_minutes > 0) {
        const avgHours = Math.round(kbSummary.avg_duration_minutes / 60);
        const avgMins  = kbSummary.avg_duration_minutes % 60;
        const durasiStr = avgHours > 0
          ? `${avgHours} jam${avgMins > 0 ? ` ${avgMins} menit` : ''}`
          : `${kbSummary.avg_duration_minutes} menit`;
        estimasi = `Sekitar ${durasiStr} (berdasarkan ${kbSummary.total_cases} kasus serupa)`;
      }

      // Update ringkasan jika ada KB
      ringkasan = `Laporan Anda telah diterima. Berdasarkan ${kbCases.length} kasus serupa di sistem kami, tim teknis sudah familiar dengan masalah ini.`;
    }
  }

  return { ringkasan, status_sla: statusSla, saran, pesan_motivasi: pesan, estimasi, level };
}

// ─────────────────────────────────────────────────────────
// MAIN: Generate Recommendation
// Exported function — dipanggil dari controller
// ─────────────────────────────────────────────────────────
async function generateRecommendation(incident, slaData) {
  // Jika tidak ada API key → pakai fallback
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('[AI] No API key found, using fallback recommendation.');
    return {
      success: true,
      source:  'fallback',
      data:    generateFallbackRecommendation(incident, slaData),
    };
  }

  try {
    const { systemPrompt, userPrompt } = buildPrompt(incident, slaData);

    console.log(`[AI] Generating recommendation for incident #${incident.id}...`);
    const response = await callClaudeAPI(systemPrompt, userPrompt);

    // Ambil text dari response
    const rawText = response?.content?.[0]?.text || '';
    if (!rawText) throw new Error('Empty response from Claude API');

    const parsed = parseAIResponse(rawText);

    // Simpan ke DB (field `recommendation` sebagai JSON string)
    const recommendationJSON = JSON.stringify(parsed);

    console.log(`[AI] Recommendation generated for incident #${incident.id}`);

    return {
      success:             true,
      source:              'claude',
      data:                parsed,
      recommendation_json: recommendationJSON,
    };
  } catch (err) {
    console.error(`[AI] Error generating recommendation: ${err.message}`);
    // Fallback jika API error
    const fallback = generateFallbackRecommendation(incident, slaData);
    return {
      success: false,
      source:  'fallback',
      error:   err.message,
      data:    fallback,
    };
  }
}

// ─────────────────────────────────────────────────────────
// HELPER: Parse recommendation JSON dari DB
// ─────────────────────────────────────────────────────────
function parseStoredRecommendation(jsonString) {
  if (!jsonString) return null;
  try {
    if (typeof jsonString === 'object') return jsonString;
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

module.exports = {
  generateRecommendation,
  parseStoredRecommendation,
  generateFallbackRecommendation,
};