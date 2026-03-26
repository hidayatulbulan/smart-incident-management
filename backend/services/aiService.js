/**
 * ╔══════════════════════════════════════════════════════╗
 * ║         SmartIncident — AI Service         ║
 * ║  Sistem Rekomendasi 3 Lapis:                         ║
 * ║  Lapis 1 → KB teknisi (kasus serupa yang RELEVAN)    ║
 * ║  Lapis 2 → Hardcode self-fix per kategori/keyword    ║
 * ║  Lapis 3 → Saran generik (fallback terakhir)         ║
 * ╚══════════════════════════════════════════════════════╝
 */

const HIGH_PRIORITY_KEYWORDS = [
  'monitor', 'wifi', 'printer', 'internet', 'laptop', 'proyektor',
  'komputer', 'tinta', 'lampu', 'listrik', 'email', 'aplikasi',
  'mouse', 'keyboard', 'dispenser', 'server', 'jaringan', 'kabel',
  'ac', 'pc', 'hp', 'usb', 'lan'
];

const BLACKLIST_SARAN = [
  'dinyatakan selesai', 'masalah selesai', 'sudah fix', 'oke', 'aman',
  'berhasil diperbaiki', 'sudah diperbaiki', 'tiket ditutup', 'solved',
  'tidak ada catatan', 'selesai.', 'done', 'siap'
];

// ─────────────────────────────────────────────────────────
// FIX: Kata-kata sudut pandang teknisi → diganti ke user
// ─────────────────────────────────────────────────────────
const TECHNICIAN_TO_USER_MAP = [
  // Pola "teknisi [kata kerja]" → "Anda bisa [kata kerja]"
  { pattern: /\bteknisi\s+(me\w+|meng\w+|mem\w+)/gi, replacement: 'Anda bisa $1' },
  { pattern: /\bteknisi\s+(\w+)/gi,                   replacement: 'Anda bisa $1' },
  // Pola "dilakukan pengecekan" → "lakukan pengecekan"
  { pattern: /\bdilakukan\s+/gi,   replacement: 'lakukan ' },
  { pattern: /\bdiperiksa\b/gi,    replacement: 'periksa' },
  { pattern: /\bdimatikan\b/gi,    replacement: 'matikan' },
  { pattern: /\bdinyalakan\b/gi,   replacement: 'nyalakan' },
  { pattern: /\bdibersihkan\b/gi,  replacement: 'bersihkan' },
  { pattern: /\bdicabut\b/gi,      replacement: 'cabut' },
  { pattern: /\bdipasang\b/gi,     replacement: 'pasang' },
  { pattern: /\bdirestart\b/gi,    replacement: 'restart' },
  // Pola "oleh teknisi" → hapus
  { pattern: /\s*oleh\s+teknisi\b/gi, replacement: '' },
  // Pola "tim teknisi" → "tim"
  { pattern: /\btim\s+teknisi\b/gi, replacement: 'tim' },
];

/**
 * Ubah kalimat dari sudut pandang teknisi ke sudut pandang user
 */
function reframeToUser(text) {
  let result = text;
  for (const { pattern, replacement } of TECHNICIAN_TO_USER_MAP) {
    result = result.replace(pattern, replacement);
  }
  // Pastikan huruf pertama kapital
  result = result.trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ─────────────────────────────────────────────────────────
// LAPIS 2: SELF-FIX MAP
// ─────────────────────────────────────────────────────────
const SELF_FIX_MAP = {
  IT: {
    monitor: [
      "Periksa kabel HDMI/VGA — cabut dan pasang kembali dengan kencang ke port monitor.",
      "Pastikan monitor menyala (lampu indikator hijau/biru) dan tidak dalam mode standby.",
      "Tekan Win+P lalu pilih 'Duplicate' atau 'Extend' untuk reset output layar.",
    ],
    printer: [
      "Matikan printer, cabut kabel power, tunggu 30 detik, lalu nyalakan kembali.",
      "Periksa apakah ada kertas macet — buka semua penutup dan tarik kertas perlahan.",
      "Buka 'Devices and Printers', klik kanan printer Anda, lalu batalkan semua antrian cetak.",
    ],
    internet: [
      "Matikan WiFi di perangkat Anda, tunggu 10 detik, lalu nyalakan kembali.",
      "Coba sambungkan ke hotspot ponsel untuk cek apakah masalah di jaringan kantor.",
      "Restart browser dan bersihkan cache (Ctrl+Shift+Delete).",
    ],
    wifi: [
      "Matikan WiFi di perangkat Anda, tunggu 10 detik, lalu nyalakan kembali.",
      "Lupakan (forget) jaringan WiFi kantor lalu sambungkan ulang dengan password yang benar.",
      "Pindah lebih dekat ke access point WiFi — cek apakah sinyal membaik.",
    ],
    laptop: [
      "Restart laptop Anda sebagai langkah pertama untuk mengatasi masalah umum.",
      "Pastikan charger terpasang dan lampu indikator charging menyala.",
      "Catat pesan error yang muncul agar teknisi bisa mendiagnosa lebih cepat.",
    ],
    lambat: [
      "Restart komputer/laptop Anda — ini sering langsung menyelesaikan masalah performa.",
      "Buka Task Manager (Ctrl+Alt+Delete) dan tutup aplikasi yang memakan banyak CPU/memori.",
      "Hindari membuka banyak tab dan aplikasi sekaligus saat menunggu teknisi.",
    ],
    hang: [
      "Tekan Ctrl+Alt+Delete → Task Manager → tutup aplikasi yang 'Not Responding'.",
      "Jika layar benar-benar beku, tahan tombol power 5 detik untuk restart paksa.",
      "Setelah restart, buka satu aplikasi dulu untuk memastikan tidak hang kembali.",
    ],
    mati: [
      "Pastikan kabel power terpasang dengan benar ke komputer dan stopkontak.",
      "Coba tekan tombol power sekali dan tunggu 30 detik sebelum mencoba lagi.",
      "Jika laptop, colokkan charger — baterai mungkin habis total.",
    ],
    email: [
      "Refresh inbox (F5) dan pastikan koneksi internet stabil.",
      "Logout dari aplikasi email lalu login kembali untuk me-reset sesi.",
      "Cek folder 'Outbox' jika ada email tertahan yang tidak terkirim.",
    ],
    keyboard: [
      "Cabut kabel keyboard (atau matikan Bluetooth), tunggu 10 detik, sambungkan kembali.",
      "Coba keyboard di komputer lain untuk memastikan apakah kerusakan di keyboard atau PC.",
      "Restart komputer — driver keyboard kadang perlu di-reload ulang.",
    ],
    mouse: [
      "Cabut dan pasang kembali kabel mouse atau receiver USB-nya.",
      "Coba gunakan port USB yang berbeda — port tertentu kadang bermasalah.",
      "Bersihkan sensor mouse bagian bawah dari debu menggunakan kain kering.",
    ],
    proyektor: [
      "Tekan Win+P dan pilih 'Duplicate' untuk menampilkan layar ke proyektor.",
      "Pastikan kabel HDMI/VGA terpasang kencang di kedua ujungnya.",
      "Matikan proyektor, tunggu 1 menit agar lampu dingin, lalu nyalakan kembali.",
    ],
  },
  Fasilitas: {
    ac: [
      "Matikan AC dari remote/panel dinding, tunggu 5 menit, lalu nyalakan kembali.",
      "Pastikan semua pintu dan jendela ruangan tertutup agar AC bekerja efektif.",
      "Cek baterai remote AC; ganti jika layar remote redup atau mati.",
    ],
    lampu: [
      "Coba nyala-matikan saklar lampu beberapa kali secara perlahan.",
      "Periksa panel listrik (MCB) di area Anda — pastikan tidak ada yang posisi trip/off.",
      "Gunakan pencahayaan alternatif atau pindah ke area lain sambil menunggu teknisi.",
    ],
    bocor: [
      "Pindahkan peralatan elektronik dan dokumen penting dari area bocor segera.",
      "Letakkan wadah/ember untuk menampung tetesan agar lantai tidak licin.",
      "Foto titik kebocoran untuk membantu teknisi menemukan sumber masalah.",
    ],
    dispenser: [
      "Pastikan galon terpasang dengan benar dan tidak ada kebocoran di leher galon.",
      "Cek apakah kran dispenser (panas/dingin) tidak tersangkut atau macet.",
      "Cabut kabel dispenser 5 menit lalu pasang kembali untuk reset sistem pemanas.",
    ],
    listrik: [
      "Periksa panel MCB di ruangan Anda — reset jika ada yang posisi trip.",
      "Hindari mencolok banyak perangkat ke satu stop kontak sekaligus.",
      "Segera menjauh dan laporkan jika ada percikan api atau bau terbakar.",
    ],
  },
};

// ─────────────────────────────────────────────────────────
// LAPIS 3: SARAN GENERIK (fallback)
// ─────────────────────────────────────────────────────────
const GENERIC_SELF_FIX = {
  IT: [
    "Restart perangkat Anda terlebih dahulu — ini menyelesaikan banyak masalah umum.",
    "Catat pesan error yang muncul agar teknisi dapat mendiagnosa lebih cepat.",
    "Gunakan perangkat cadangan jika tersedia untuk kebutuhan mendesak.",
  ],
  Fasilitas: [
    "Foto kondisi fasilitas yang rusak untuk dokumentasi tim perbaikan.",
    "Gunakan fasilitas alternatif di area lain sementara menunggu teknisi.",
    "Segera menjauh jika ada kabel listrik terbuka atau bau terbakar.",
  ],
  default: [
    "Dokumentasikan masalah dengan foto agar penanganan lebih cepat.",
    "Pastikan nomor kontak Anda aktif agar teknisi dapat berkoordinasi.",
    "Pantau status laporan Anda secara berkala di halaman Dashboard.",
  ],
};

// ─────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────

function normalizeCategory(category) {
  const raw = (category || 'IT').toLowerCase().trim();
  if (['fasilitas', 'facilities', 'facility'].includes(raw)) return 'Fasilitas';
  return 'IT';
}

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => {
      if (w.length >= 4) return true;
      if (w.length >= 2 && HIGH_PRIORITY_KEYWORDS.includes(w)) return true;
      return false;
    });
}

function filterRelevantKBCases(kbCases, description) {
  if (!kbCases || kbCases.length === 0) return [];

  const tokens = tokenize(description);
  if (tokens.length === 0) return [];

  const scored = kbCases.map(kb => {
    const kbText = [
      kb.problem  || '',
      kb.keywords || '',
      kb.solution || '',
    ].join(' ').toLowerCase();

    let score = 0;
    tokens.forEach(token => {
      const isShort = token.length <= 3;
      const matched = isShort
        ? new RegExp(`\\b${token}\\b`).test(kbText)
        : kbText.includes(token);

      if (matched) {
        score += HIGH_PRIORITY_KEYWORDS.includes(token) ? 5 : 1;
      }
    });

    return { ...kb, _score: score };
  });

  return scored
    .filter(kb => kb._score >= 3)
    .sort((a, b) => b._score - a._score);
}

// ─────────────────────────────────────────────────────────
// FIX UTAMA: extractSelfFixFromKB — tambah reframeToUser()
// ─────────────────────────────────────────────────────────
function extractSelfFixFromKB(kbCases) {
  if (!kbCases || kbCases.length === 0) return null;

  const USER_ACTION_KEYWORDS = [
    'restart', 'matikan', 'nyalakan', 'cabut', 'pasang', 'cek',
    'periksa', 'coba', 'tekan', 'klik', 'ganti', 'bersihkan', 'pindahkan'
  ];
  const selfFixSaran = [];

  for (const kbCase of kbCases.slice(0, 3)) {
    if (selfFixSaran.length >= 3) break;

    // Ambil dari solution DAN result KB
    const textSources = [kbCase.solution || '', kbCase.result || ''].join('. ');
    const kalimat = textSources
      .split(/[.\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    for (const k of kalimat) {
      if (selfFixSaran.length >= 3) break;
      const kLower = k.toLowerCase();

      // Skip kalimat yang ada di blacklist
      if (BLACKLIST_SARAN.some(black => kLower.includes(black))) continue;

      // Ubah sudut pandang teknisi → user SEBELUM cek action keyword
      const reframed = reframeToUser(k);
      const reframedLower = reframed.toLowerCase();

      // Hanya ambil kalimat yang mengandung kata aksi untuk user
      if (USER_ACTION_KEYWORDS.some(kw => reframedLower.includes(kw))) {
        selfFixSaran.push(reframed);
      }
    }
  }

  return selfFixSaran.length > 0 ? selfFixSaran : null;
}

// ─────────────────────────────────────────────────────────
// CORE: getSelfFixSuggestions
// ─────────────────────────────────────────────────────────
function getSelfFixSuggestions(description, category, kbCases = []) {
  const cat  = normalizeCategory(category);
  const desc = (description || '').toLowerCase();

  // LAPIS 1: Dari KB teknisi (kasus selesai yang relevan)
  if (kbCases.length > 0) {
    const relevantCases = filterRelevantKBCases(kbCases, description);
    if (relevantCases.length > 0) {
      const kbSaran = extractSelfFixFromKB(relevantCases);
      if (kbSaran && kbSaran.length >= 2) return kbSaran;
    }
  }

  // LAPIS 2: Keyword map
  const categoryMap    = SELF_FIX_MAP[cat] || SELF_FIX_MAP['IT'];
  const sortedKeywords = Object.keys(categoryMap).sort((a, b) => b.length - a.length);

  for (const keyword of sortedKeywords) {
    const isShort = keyword.length <= 3;
    const matched = isShort
      ? new RegExp(`\\b${keyword}\\b`).test(desc)
      : desc.includes(keyword);

    if (matched) return categoryMap[keyword];
  }

  // LAPIS 3: Fallback generik
  return (GENERIC_SELF_FIX[cat] || GENERIC_SELF_FIX['default']).slice(0, 3);
}

// ─────────────────────────────────────────────────────────
// MAIN: generateRecommendation
// ─────────────────────────────────────────────────────────
async function generateRecommendation(incident, slaData) {
  try {
    const status   = (incident.status   || 'open').toLowerCase();
    const priority = (incident.priority || 'medium').toLowerCase();
    const slaStatus = slaData.overall_sla_status;
    const category  = normalizeCategory(incident.category || incident.type || 'IT');

    const kbCases         = incident.kb_similar_cases || [];
    const relevantKBCases = filterRelevantKBCases(kbCases, incident.description);
    const hasKB           = relevantKBCases.length > 0;

    const saran = getSelfFixSuggestions(incident.description, category, kbCases);

    let level     = 'info';
    let ringkasan = '';
    let statusSla = '';
    let estimasi  = '';
    let pesan     = 'Laporan Anda sudah tercatat. Tim kami akan segera menindaklanjuti.';

    if (status === 'closed' || status === 'resolved') {
      level     = 'success';
      ringkasan = 'Insiden Anda telah berhasil diselesaikan oleh tim teknisi.';
      statusSla = slaData.is_overdue
        ? 'Diselesaikan melewati batas SLA.'
        : 'SLA terpenuhi tepat waktu. ✓';
      pesan    = 'Semoga aktivitas Anda kembali lancar! 🎉';
      estimasi = 'Sudah selesai';

    } else if (slaStatus === 'breached') {
      level     = 'urgent';
      ringkasan = 'Laporan Anda melewati batas SLA. Tim sedang memprioritaskan penanganan.';
      statusSla = `Terlambat ${slaData.overdue_minutes || 0} menit dari target.`;
      pesan     = 'Kami mohon maaf atas keterlambatan ini, tim sedang menangani secepatnya.';

    } else {
      level     = priority === 'high' ? 'warning' : 'info';
      ringkasan = hasKB
        ? `Tim teknis sudah menangani ${relevantKBCases.length} kasus serupa — kemungkinan besar solusinya sudah diketahui.`
        : 'Laporan Anda telah diterima dan masuk antrian tim teknis.';
      statusSla = `Target penyelesaian: ${slaData.sla_resolution_target}`;
      estimasi  = hasKB
        ? `Estimasi: < 1 jam berdasarkan histori kasus serupa`
        : `Mengikuti antrian SLA`;
    }

    return {
      success: true,
      source:  hasKB ? 'kb+local' : 'local',
      data: {
        ringkasan,
        status_sla:     statusSla,
        saran:          saran.slice(0, 3),
        pesan_motivasi: pesan,
        estimasi,
        level,
        kb_match_count: relevantKBCases.length,
      }
    };

  } catch (error) {
    console.error("[aiService] generateRecommendation error:", error.message);
    return { success: false, error: error.message };
  }
}

function parseStoredRecommendation(raw) {
  try {
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

module.exports = {
  generateRecommendation,
  getSelfFixSuggestions,
  parseStoredRecommendation,
  filterRelevantKBCases,
  normalizeCategory,
};