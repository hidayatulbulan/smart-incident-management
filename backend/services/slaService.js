/**
 * ╔══════════════════════════════════════════════════════╗
 * ║           SmartIncident — SLA Service                ║
 * ║  Hitung & simpan SLA saat insiden dibuat/diupdate   ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * CARA PAKAI di incidentController.js:
 *   const slaService = require('./slaService');
 *
 * Field DB yang diisi:
 *   sla_response_min, sla_resolution_min
 *   sla_response_deadline, sla_resolution_deadline
 *   is_overdue, responded_at, resolved_at
 */

// ─────────────────────────────────────────────────────────
// KONFIGURASI SLA PER PRIORITY (dalam menit)
// Ubah angka ini sesuai kebijakan internal perusahaan
// ─────────────────────────────────────────────────────────
const SLA_CONFIG = {
  high: {
    response_min:   15,   // 15 menit
    resolution_min: 60,   // 1 jam
  },
  medium: {
    response_min:   30,   // 30 menit
    resolution_min: 180,  // 3 jam
  },
  low: {
    response_min:   60,   // 1 jam
    resolution_min: 480,  // 8 jam
  },
};

// Fallback jika priority tidak dikenal
const SLA_DEFAULT = {
  response_min:   480,
  resolution_min: 2880,
};

// ─────────────────────────────────────────────────────────
// HELPER: tambah menit ke Date
// ─────────────────────────────────────────────────────────
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ─────────────────────────────────────────────────────────
// HELPER: format menit → string manusiawi
// contoh: 90 → "1 jam 30 menit"
// ─────────────────────────────────────────────────────────
function formatMinutes(minutes) {
  if (!minutes && minutes !== 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} menit`;
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} menit`;
}

// ─────────────────────────────────────────────────────────
// CORE: Hitung SLA saat insiden DIBUAT (POST /incidents)
// Mengembalikan object siap di-INSERT ke DB
// ─────────────────────────────────────────────────────────
function calculateSLA(priority, createdAt = new Date()) {
  const p      = (priority || 'medium').toLowerCase();
  const config = SLA_CONFIG[p] || SLA_DEFAULT;

  const responseDeadline    = addMinutes(createdAt, config.response_min);
  const resolutionDeadline  = addMinutes(createdAt, config.resolution_min);

  return {
    sla_response_min:      config.response_min,
    sla_resolution_min:    config.resolution_min,
    sla_response_deadline: responseDeadline,
    sla_resolution_deadline: resolutionDeadline,
    is_overdue: 0,
  };
}

// ─────────────────────────────────────────────────────────
// CORE: Evaluasi status SLA saat ini (untuk GET /incidents/:id)
// Mengembalikan object status lengkap untuk frontend & AI
// ─────────────────────────────────────────────────────────
function evaluateSLA(incident) {
  const now = new Date();

  const {
    status,
    priority,
    created_at,
    sla_response_min,
    sla_resolution_min,
    sla_response_deadline,
    sla_resolution_deadline,
    responded_at,
    resolved_at,
    is_overdue,
  } = incident;

  const responseDeadline   = sla_response_deadline   ? new Date(sla_response_deadline)   : null;
  const resolutionDeadline = sla_resolution_deadline ? new Date(sla_resolution_deadline) : null;
  const respondedAt        = responded_at  ? new Date(responded_at)  : null;
  const resolvedAt         = resolved_at   ? new Date(resolved_at)   : null;
  const createdAt          = created_at    ? new Date(created_at)    : null;

  // ── Status response SLA ──────────────────────────────
  let responseStatus = 'pending'; // pending | met | breached
  let responseOverdueMin = null;

  if (respondedAt && responseDeadline) {
    responseStatus     = respondedAt <= responseDeadline ? 'met' : 'breached';
    responseOverdueMin = respondedAt > responseDeadline
      ? Math.floor((respondedAt - responseDeadline) / 60000)
      : null;
  } else if (!respondedAt && responseDeadline) {
    if (now > responseDeadline) {
      responseStatus     = 'breached';
      responseOverdueMin = Math.floor((now - responseDeadline) / 60000);
    } else {
      // masih dalam SLA — hitung sisa waktu
      const remaining = Math.floor((responseDeadline - now) / 60000);
      responseStatus  = remaining <= 30 ? 'warning' : 'on_track'; // ⚠️ <30 menit
    }
  }

  // ── Status resolution SLA ────────────────────────────
  let resolutionStatus = 'pending';
  let resolutionOverdueMin = null;
  let resolutionRemainingMin = null;

  if (resolvedAt && resolutionDeadline) {
    resolutionStatus     = resolvedAt <= resolutionDeadline ? 'met' : 'breached';
    resolutionOverdueMin = resolvedAt > resolutionDeadline
      ? Math.floor((resolvedAt - resolutionDeadline) / 60000)
      : null;
  } else if (!resolvedAt && resolutionDeadline) {
    if (now > resolutionDeadline) {
      resolutionStatus     = 'breached';
      resolutionOverdueMin = Math.floor((now - resolutionDeadline) / 60000);
    } else {
      resolutionRemainingMin = Math.floor((resolutionDeadline - now) / 60000);
      resolutionStatus       = resolutionRemainingMin <= 60 ? 'warning' : 'on_track';
    }
  }

  // ── Overall SLA ──────────────────────────────────────
  const isOverdue = (
    responseStatus   === 'breached' ||
    resolutionStatus === 'breached'
  );

  // ── Persentase waktu terpakai (untuk progress bar) ──
  let resolutionPercent = 0;
  if (createdAt && resolutionDeadline) {
    const totalMs   = resolutionDeadline - createdAt;
    const usedMs    = Math.min(now - createdAt, totalMs);
    resolutionPercent = Math.min(100, Math.floor((usedMs / totalMs) * 100));
  }

  // ── Label manusiawi ──────────────────────────────────
  const STATUS_LABEL = {
    on_track: { label: 'Dalam SLA',         color: '#22c55e', icon: '✅' },
    warning:  { label: 'Mendekati Batas',   color: '#f59e0b', icon: '⚠️' },
    breached: { label: 'Melewati Batas SLA',color: '#e63946', icon: '❌' },
    met:      { label: 'SLA Terpenuhi',     color: '#22c55e', icon: '✅' },
    pending:  { label: 'Menunggu',          color: '#b0b5c0', icon: '⏳' },
  };

  return {
    // Meta
    priority,
    sla_response_min,
    sla_resolution_min,

    // Response SLA
    response: {
      deadline:    responseDeadline,
      respondedAt: respondedAt,
      status:      responseStatus,
      overdueMin:  responseOverdueMin,
      label:       STATUS_LABEL[responseStatus] || STATUS_LABEL.pending,
      humanSla:    formatMinutes(sla_response_min),
    },

    // Resolution SLA
    resolution: {
      deadline:      resolutionDeadline,
      resolvedAt:    resolvedAt,
      status:        resolutionStatus,
      overdueMin:    resolutionOverdueMin,
      remainingMin:  resolutionRemainingMin,
      percent:       resolutionPercent,
      label:         STATUS_LABEL[resolutionStatus] || STATUS_LABEL.pending,
      humanSla:      formatMinutes(sla_resolution_min),
      humanRemaining: resolutionRemainingMin !== null
        ? formatMinutes(resolutionRemainingMin)
        : null,
    },

    // Overall
    isOverdue,
    overallStatus: isOverdue ? 'breached'
      : (resolutionStatus === 'warning' || responseStatus === 'warning') ? 'warning'
      : (resolutionStatus === 'met')     ? 'met'
      : 'on_track',
  };
}

// ─────────────────────────────────────────────────────────
// CORE: Update is_overdue di DB (jalankan via cron/scheduler)
// Gunakan ini di setInterval atau node-cron
// ─────────────────────────────────────────────────────────
async function checkAndUpdateOverdue(db) {
  try {
    const now = new Date();

    // Update is_overdue = 1 untuk insiden yang melewati deadline & belum closed
    const sql = `
      UPDATE incidents
      SET is_overdue = 1
      WHERE status NOT IN ('closed', 'resolved')
        AND is_overdue = 0
        AND (
          (sla_resolution_deadline IS NOT NULL AND sla_resolution_deadline < ?)
          OR
          (responded_at IS NULL AND sla_response_deadline IS NOT NULL AND sla_response_deadline < ?)
        )
    `;

    const [result] = await db.execute(sql, [now, now]);
    if (result.affectedRows > 0) {
      console.log(`[SLA] Updated ${result.affectedRows} overdue incident(s) at ${now.toISOString()}`);
    }
    return result.affectedRows;
  } catch (err) {
    console.error('[SLA] checkAndUpdateOverdue error:', err.message);
    return 0;
  }
}

// ─────────────────────────────────────────────────────────
// HELPER: Siapkan data SLA untuk dikirim ke AI
// ─────────────────────────────────────────────────────────
function prepareSLAForAI(incident) {
  const sla = evaluateSLA(incident);

  return {
    priority:             incident.priority,
    sla_response_target:  sla.response.humanSla,
    sla_resolution_target: sla.resolution.humanSla,
    response_status:      sla.response.status,
    resolution_status:    sla.resolution.status,
    is_overdue:           sla.isOverdue,
    remaining_time:       sla.resolution.humanRemaining || 'tidak tersedia',
    overdue_minutes:      sla.resolution.overdueMin,
    overall_sla_status:   sla.overallStatus,
  };
}

module.exports = {
  calculateSLA,
  evaluateSLA,
  checkAndUpdateOverdue,
  prepareSLAForAI,
  formatMinutes,
  SLA_CONFIG,
};