/**
 * SMART Incident Management - Incident Report Form
 * Handles form validation and API submission for new incident reports
 * Production-ready, vanilla JavaScript, no framework
 */

const API_BASE = "http://localhost:3000/api";

/**
 * Initialize form on page load
 */
document.addEventListener("DOMContentLoaded", function () {
  initReportPage();
});

/**
 * Main initialization
 */
function initReportPage() {
  // Step 1: Check authentication
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  // Step 2: Update user info
  updateUserInfo();

  // Step 3: Setup form handlers
  setupFormHandlers();

  // Step 4: Load latest incidents
  loadLatestIncidents();
}

/**
 * Get JWT token from localStorage
 * @returns {string|null} JWT token or null
 */
function getToken() {
  return localStorage.getItem("token") || null;
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  window.location.href = "../auth/login.html";
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
  const form = document.querySelector(".form-panel");
  if (!form) return;

  // Find submit button
  const submitBtn = form.querySelector(".kirim-btn");
  if (submitBtn) {
    submitBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleFormSubmit();
    });
  }

  // Allow form submission with Enter key
  const inputs = form.querySelectorAll("input, textarea, select");
  inputs.forEach(input => {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        handleFormSubmit();
      }
    });
  });
}

/**
 * Handle form submission
 */
async function handleFormSubmit() {
  // Step 1: Get form data
  const formData = getFormData();
  if (!formData) return;

  // Step 2: Validate form data
  const validation = validateFormData(formData);
  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  // Step 3: Show loading state
  const submitBtn = document.querySelector(".kirim-btn");
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span style="display: flex; align-items: center; gap: 8px; justify-content: center;"><span style="animation: spin 1s linear infinite;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></span>Mengirim...</span>';

  // Step 4: Submit form
  const success = await submitForm(formData);

  // Step 5: Restore button state
  submitBtn.disabled = false;
  submitBtn.innerHTML = originalText;

  // Step 6: Handle response
  if (success) {
    alert("✓ Laporan insiden berhasil dikirim. Anda akan dialihkan ke dashboard.");
    redirectToDashboard();
  }
}

/**
 * Get form data from DOM
 * @returns {Object|null} Form data object or null
 */
function getFormData() {
  // Get input elements by ID
  const titleInput = document.getElementById("judulInsiden");
  const categorySelect = document.getElementById("kategori");
  const locationInput = document.getElementById("lokasiKejadian");
  const descriptionTextarea = document.getElementById("deskripsiMasalah");
  const fileInput = document.getElementById("fileInput");

  // Validate elements exist
  if (!titleInput || !categorySelect || !locationInput || !descriptionTextarea) {
    showError("Form inputs tidak lengkap di halaman");
    return null;
  }

  return {
    title: titleInput.value.trim(),
    type: categorySelect.value.trim(),
    location: locationInput.value.trim(),
    description: descriptionTextarea.value.trim(),
    photo: fileInput && fileInput.files[0] ? fileInput.files[0] : null
  };
}

/**
 * Validate form data
 * @param {Object} formData Form data object
 * @returns {Object} Validation result {valid: boolean, message: string}
 */
function validateFormData(formData) {
  // Validate title
  if (!formData.title) {
    return {
      valid: false,
      message: "⚠️ Judul Insiden wajib diisi"
    };
  }
  if (formData.title.length < 5) {
    return {
      valid: false,
      message: "⚠️ Judul Insiden minimal 5 karakter"
    };
  }
  if (formData.title.length > 200) {
    return {
      valid: false,
      message: "⚠️ Judul Insiden maksimal 200 karakter"
    };
  }

  // Validate category
  if (!formData.type) {
    return {
      valid: false,
      message: "⚠️ Kategori wajib dipilih"
    };
  }

  // Validate location
  if (!formData.location) {
    return {
      valid: false,
      message: "⚠️ Lokasi Kejadian wajib diisi"
    };
  }
  if (formData.location.length < 3) {
    return {
      valid: false,
      message: "⚠️ Lokasi Kejadian minimal 3 karakter"
    };
  }

  // Validate description
  if (!formData.description) {
    return {
      valid: false,
      message: "⚠️ Deskripsi Masalah wajib diisi"
    };
  }
  if (formData.description.length < 10) {
    return {
      valid: false,
      message: "⚠️ Deskripsi Masalah minimal 10 karakter"
    };
  }
  if (formData.description.length > 2000) {
    return {
      valid: false,
      message: "⚠️ Deskripsi Masalah maksimal 2000 karakter"
    };
  }

  // Validate photo
  if (!formData.photo) {
    return {
      valid: false,
      message: "⚠️ Bukti Foto wajib diunggah"
    };
  }

  // Validate photo size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (formData.photo.size > maxSize) {
    return {
      valid: false,
      message: "⚠️ Ukuran foto maksimal 5MB"
    };
  }

  // Validate photo type
  const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  if (!validTypes.includes(formData.photo.type)) {
    return {
      valid: false,
      message: "⚠️ Format foto harus PNG, JPG, atau PDF"
    };
  }

  return { valid: true, message: "" };
}

/**
 * Submit form data to API
 * @param {Object} formData Form data object
 * @returns {Promise<boolean>} Success status
 */
async function submitForm(formData) {
  const token = getToken();
  if (!token) {
    showError("Token autentikasi tidak ditemukan. Silakan login kembali.");
    redirectToLogin();
    return false;
  }

  try {
    // Create FormData for multipart/form-data
    const body = new FormData();
    body.append("title", formData.title);
    body.append("type", formData.type);
    body.append("description", formData.description);
    
    // location might be used, add it if backend accepts it
    body.append("location", formData.location);
    
    // Add photo file
    if (formData.photo) {
      body.append("photo", formData.photo);
    }

    // Send request
    const response = await fetch(`${API_BASE}/incidents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
        // DO NOT set Content-Type header - browser will set it with boundary
      },
      body: body
    });

    // Handle 401 unauthorized
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      showError("Sesi Anda telah berakhir. Silakan login kembali.");
      setTimeout(redirectToLogin, 1500);
      return false;
    }

    // Parse response
    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      const errorMessage = data.message || `Terjadi kesalahan (HTTP ${response.status})`;
      showError(errorMessage);
      return false;
    }

    // Check API success flag
    if (!data.success) {
      const errorMessage = data.message || "Gagal mengirim laporan";
      showError(errorMessage);
      return false;
    }

    // Success
    return true;
  } catch (error) {
    console.error("Error submitting form:", error);
    showError(`Terjadi kesalahan jaringan: ${error.message}`);
    return false;
  }
}

/**
 * Display error message
 * @param {string} message Error message
 */
function showError(message) {
  // Try to show alert
  alert(message);

  // Also log to console
  console.error(message);
}

/**
 * Redirect to dashboard
 */
function redirectToDashboard() {
  window.location.href = "dashboard.html";
}

/**
 * Update user information in sidebar
 */
function updateUserInfo() {
  const user = JSON.parse(localStorage.getItem("user")) || {};

  // Update user avatar
  const userAva = document.querySelector(".user-ava");
  if (userAva && user.name) {
    userAva.textContent = user.name.charAt(0).toUpperCase();
  }

  // Update user name
  const userNameSm = document.querySelector(".user-name-sm");
  if (userNameSm && user.name) {
    userNameSm.textContent = user.name;
  }

  // Update user role
  const userRole = document.querySelector(".user-role");
  if (userRole && user.role) {
    userRole.textContent = capitalizeFirst(user.role);
  }
}

/**
 * Capitalize first letter of string
 * @param {string} str Input string
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert timestamp to relative time (e.g., "2 jam lalu")
 * @param {string} timestamp ISO timestamp string
 * @returns {string} Relative time string in Indonesian
 */
function getRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'jam' : 'jam'} lalu`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'hari' : 'hari'} lalu`;
  
  return date.toLocaleDateString('id-ID');
}

/**
 * Get dot color based on incident status
 * @param {string} status Incident status
 * @returns {string} CSS class for dot color
 */
function getStatusDotColor(status) {
  const statusLower = (status || "").toLowerCase();
  
  if (statusLower === "closed" || statusLower === "resolved") return "green";
  if (statusLower === "in_progress" || statusLower === "in progress") return "yellow";
  if (statusLower === "open") return "yellow";
  
  return "yellow"; // default
}

/**
 * Format status text for display
 * @param {string} status Incident status
 * @returns {string} Formatted status text
 */
function formatStatus(status) {
  const statusLower = (status || "").toLowerCase();
  
  switch (statusLower) {
    case "closed":
      return "CLOSED";
    case "resolved":
      return "RESOLVED";
    case "in_progress":
    case "in progress":
      return "IN PROGRESS";
    case "open":
      return "OPEN";
    default:
      return status.toUpperCase();
  }
}

/**
 * Load and render latest incidents
 */
async function loadLatestIncidents() {
  try {
    const token = getToken();
    if (!token) return;

    const response = await fetch(`${API_BASE}/incidents/latest`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error("Failed to fetch latest incidents:", response.status);
      renderNoIncidents();
      return;
    }

    const data = await response.json();
    
    if (data.success && data.incidents && data.incidents.length > 0) {
      renderLatestIncidents(data.incidents);
    } else {
      renderNoIncidents();
    }
  } catch (error) {
    console.error("Error loading latest incidents:", error);
    renderNoIncidents();
  }
}

/**
 * Render latest incidents into the recent-list
 * @param {Array} incidents Array of incident objects
 */
function renderLatestIncidents(incidents) {
  const recentList = document.querySelector(".recent-list");
  if (!recentList) {
    console.warn("recent-list element not found");
    return;
  }

  // Clear existing items
  recentList.innerHTML = "";

  // Create and append incident items
  incidents.forEach(incident => {
    const dotColor = getStatusDotColor(incident.status);
    const statusText = formatStatus(incident.status);
    const relativeTime = getRelativeTime(incident.created_at);
    
    const itemHTML = `
      <div class="recent-item">
        <div class="recent-dot ${dotColor}"></div>
        <div class="recent-info">
          <div class="recent-name">${escapeHtml(incident.title)}</div>
          <div class="recent-meta">${statusText} • ${relativeTime.toUpperCase()}</div>
        </div>
      </div>
    `;

    recentList.insertAdjacentHTML("beforeend", itemHTML);
  });
}

/**
 * Render "Belum ada laporan" message
 */
function renderNoIncidents() {
  const recentList = document.querySelector(".recent-list");
  if (!recentList) {
    console.warn("recent-list element not found");
    return;
  }

  recentList.innerHTML = `
    <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px; font-weight: 600;">
      Belum ada laporan
    </div>
  `;
}

/**
 * Escape HTML special characters
 * @param {string} text Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
