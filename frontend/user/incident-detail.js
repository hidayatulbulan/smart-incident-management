/**
 * SMART Incident Management - Incident Detail Page
 * Fetches and displays single incident details from API
 * Production-ready, vanilla JavaScript, no framework
 */

const API_BASE = "http://localhost:3000/api";

const STATUS_MAPPING = {
  "open": "Open",
  "progress": "On Progress",
  "closed": "Closed"
};

const STATUS_BADGE_CLASS = {
  "open": "blue",
  "progress": "orange",
  "closed": "green"
};

document.addEventListener("DOMContentLoaded", function () {
  initPage();
});

async function initPage() {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  const incidentId = getIncidentIdFromUrl();
  if (!incidentId) {
    showError("ID Insiden tidak ditemukan di URL");
    hideLoading();
    return;
  }

  await fetchAndRenderIncident(incidentId, token);
}

function getToken() {
  return localStorage.getItem("token") || null;
}

function getIncidentIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  return id && id.trim() ? id.trim() : null;
}

function redirectToLogin() {
  window.location.href = "../auth/login.html";
}

async function fetchAndRenderIncident(incidentId, token) {
  try {
    const response = await fetch(`${API_BASE}/incidents/${encodeURIComponent(incidentId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      redirectToLogin();
      return;
    }

    if (response.status === 404) {
      showError("Laporan tidak ditemukan (404)");
      hideLoading();
      return;
    }

    if (!response.ok) {
      showError(`Terjadi kesalahan (HTTP ${response.status})`);
      hideLoading();
      return;
    }

    const data = await response.json();

    if (!data.success || !data.incident) {
      showError(data.message || "Format respons tidak valid");
      hideLoading();
      return;
    }

    const incident = data.incident;
    renderIncidentData(incident);
    renderTimeline(incident);
    updateUserInfo();

    hideLoading();
    showContent();
  } catch (error) {
    console.error("Error fetching incident:", error);
    showError(`Terjadi kesalahan saat mengambil data: ${error.message}`);
    hideLoading();
  }
}

function renderIncidentData(incident) {
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.textContent = `Detail Laporan: ${escapeHtml(incident.title || "N/A")}`;
  }

  const statusBadge = document.getElementById("statusBadge");
  if (statusBadge) {
    const statusText = formatStatus(incident.status);
    const badgeClass = STATUS_BADGE_CLASS[incident.status?.toLowerCase()] || "gray";
    statusBadge.textContent = statusText;
    statusBadge.className = `status-badge ${badgeClass}`;
  }

  updateMetaField("idValue", `#INC-${formatIncidentId(incident.id)}`);
  updateMetaField("categoryValue", incident.type || incident.category || "-");

  const locationValue = document.getElementById("locationValue");
  if (locationValue) {
    locationValue.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      ${escapeHtml(incident.location || "-")}
    `;
  }

  const dateValue = document.getElementById("dateValue");
  if (dateValue) {
    const formattedDate = formatDate(incident.created_at);
    dateValue.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      ${formattedDate}
    `;
  }

  const descriptionValue = document.getElementById("descriptionValue");
  if (descriptionValue) {
    descriptionValue.textContent = incident.description || "Tidak ada deskripsi";
  }

  renderPhotos(incident);

  const aiSuggestion = document.getElementById("aiSuggestion");
  if (aiSuggestion) {
    aiSuggestion.textContent = incident.recommendation || incident.suggestion || "Tidak ada rekomendasi AI untuk laporan ini.";
  }

  // Add solver note to right panel if status is closed and solver_note exists
  const normalizedStatus = incident.status?.toLowerCase().replace("_", "") || "open";
  if (incident.solver_note && normalizedStatus === "closed") {
    const aiCard = document.querySelector(".ai-card");
    if (aiCard) {
      const solverNoteHtml = `
        <div style="
          background: #f1f8e9;
          border-radius: 14px;
          padding: 18px 20px;
          border: 1px solid #c8e6c9;
          box-shadow: 0 4px 18px rgba(108,99,255,0.08);
          margin-bottom: 16px;
        ">
          <div style="display:flex;align-items:center;gap:7px;font-size:14px;font-weight:800;color:#2e7d52;margin-bottom:10px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
            Catatan Penyelesaian
          </div>
          <div style="font-size:13px;font-weight:600;color:#2e7d52;line-height:1.6;border-left:4px solid #4dc4a8;padding-left:12px;">
            ${escapeHtml(incident.solver_note)}
          </div>
        </div>
      `;
      aiCard.insertAdjacentHTML("beforebegin", solverNoteHtml);
    }
  }
}

function updateMetaField(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

function formatIncidentId(id) {
  if (!id) return "0000";
  return String(id).padStart(4, "0");
}

function formatStatus(status) {
  if (!status) return "Tidak diketahui";
  const statusLower = status.toLowerCase();
  return STATUS_MAPPING[statusLower] || capitalizeFirst(status);
}

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    };
    return date.toLocaleDateString("id-ID", options);
  } catch (e) {
    return dateString;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderPhotos(incident) {
  const photoGrid = document.getElementById("photoGrid");
  if (!photoGrid) return;

  photoGrid.innerHTML = "";

  const photos = getPhotoList(incident);
  if (!photos || photos.length === 0) {
    photoGrid.innerHTML = '<div style="padding: 20px; color: #999; text-align: center;">Tidak ada foto bukti</div>';
    return;
  }

  photos.forEach(photo => {
    if (photo) {
      const fotoItem = document.createElement("div");
      fotoItem.className = "foto-item";

      const photoUrl = buildPhotoUrl(photo);
      console.log("Photo URL:", photoUrl); // untuk debug

      fotoItem.innerHTML = `
        <img 
          src="${photoUrl}" 
          alt="Foto bukti"
          style="width:100%;height:100%;object-fit:cover;display:block;"
          onerror="this.parentElement.innerHTML='<div style=\\"padding:20px;color:#999;text-align:center;\\">Gagal memuat foto</div>'"
        >
      `;

      photoGrid.appendChild(fotoItem);
    }
  });
}

function getPhotoList(incident) {
  if (!incident) return [];

  if (incident.photos) {
    if (typeof incident.photos === "string") {
      try {
        return JSON.parse(incident.photos);
      } catch (e) {
        return [incident.photos];
      }
    }
    if (Array.isArray(incident.photos)) {
      return incident.photos;
    }
  }

  if (incident.photo) {
    return [incident.photo];
  }

  return [];
}

/**
 * FIXED - Build full photo URL
 */
function buildPhotoUrl(photoPath) {
  if (!photoPath) return "";

  // Jika sudah full URL
  if (photoPath.startsWith("http")) {
    return photoPath;
  }

  // Path yang benar sesuai folder uploads/incidents
  return `http://localhost:3000/uploads/incidents/${photoPath}`;
}

function renderTimeline(incident) {
  const timelineContainer = document.getElementById("timelineContainer");
  if (!timelineContainer) return;

  timelineContainer.innerHTML = "";

  const statuses = ["open", "in_progress", "closed"];
  const statusLabels = {
    "open": { text: "Dilaporkan", note: "Laporan diterima oleh sistem" },
    "in_progress": { text: "Diproses", note: "Teknisi ditugaskan ke lokasi" },
    "closed": { text: "Selesai", note: "Laporan telah diselesaikan" }
  };

  statuses.forEach((status, index) => {
    let dotClass = "idle";
    let icon = "";
    const normalizedIncidentStatus = incident.status?.toLowerCase().replace("_", "") || "open";
    const normalizedStatus = status.replace("_", "");

    if (normalizedStatus === normalizedIncidentStatus) {
      dotClass = "active";
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" fill="#fff"/></svg>';
    } else if (isStatusCompleted(incident.status, status)) {
      dotClass = "done";
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    }

    const isLast = index === statuses.length - 1;
    const timelineHtml = `
      <div class="tl-item">
        <div class="tl-left">
          <div class="tl-dot ${dotClass}">${icon}</div>
          ${!isLast ? '<div class="tl-line"></div>' : ""}
        </div>
        <div class="tl-body">
          <div class="tl-step${dotClass === "idle" ? " muted" : ""}">
            ${statusLabels[status].text}
          </div>
          ${dotClass !== "idle" ? `<div class="tl-time">${formatDate(incident.created_at)}</div>` : ""}
          <div class="tl-note">${statusLabels[status].note}</div>
        </div>
      </div>
    `;

    timelineContainer.insertAdjacentHTML("beforeend", timelineHtml);
  });

  // Add solver note timeline item if incident is closed and solver_note exists
  const normalizedStatus = incident.status?.toLowerCase().replace("_", "") || "open";
  if (normalizedStatus === "closed" && incident.solver_note) {
    const solverNoteTimelineHtml = `
      <div class="tl-item">
        <div class="tl-left">
          <div class="tl-dot done">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="tl-body">
          <div class="tl-step">Diselesaikan</div>
          <div class="tl-note">${escapeHtml(incident.solver_note)}</div>
        </div>
      </div>
    `;
    timelineContainer.insertAdjacentHTML("beforeend", solverNoteTimelineHtml);
  }
}

function isStatusCompleted(currentStatus, checkStatus) {
  const statusOrder = {
    "open": 0,
    "in_progress": 1,
    "inprogress": 1,
    "closed": 2
  };

  const normalizedCurrent = (currentStatus?.toLowerCase().replace("_", "")) || "open";
  const normalizedCheck = checkStatus.replace("_", "");

  const currentIndex = statusOrder[normalizedCurrent] ?? 0;
  const checkIndex = statusOrder[normalizedCheck] ?? 0;

  return currentIndex > checkIndex;
}

function showError(message) {
  const errorContainer = document.getElementById("errorContainer");
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="error-message">
        <strong>⚠️ Kesalahan</strong>
        ${escapeHtml(message)}
      </div>
    `;
    errorContainer.classList.remove("hidden");
  }
}

function hideLoading() {
  const loadingState = document.getElementById("loadingState");
  if (loadingState) {
    loadingState.classList.add("hidden");
  }
}

function showContent() {
  const contentState = document.getElementById("contentState");
  if (contentState) {
    contentState.classList.remove("hidden");
  }
}

function updateUserInfo() {
  const user = JSON.parse(localStorage.getItem("user")) || {};

  const userAva = document.querySelector(".user-ava");
  if (userAva && user.name) {
    userAva.textContent = user.name.charAt(0).toUpperCase();
  }

  const userNameSm = document.querySelector(".user-name-sm");
  if (userNameSm && user.name) {
    userNameSm.textContent = user.name;
  }

  const userRole = document.querySelector(".user-role");
  if (userRole && user.role) {
    userRole.textContent = capitalizeFirst(user.role);
  }
}