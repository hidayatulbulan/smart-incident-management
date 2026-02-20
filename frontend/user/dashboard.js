/**
 * SMART Incident Management - User Dashboard
 * Handles authentication, data fetching, and UI population
 */

const API_BASE = "http://localhost:3000/api";

/**
 * Initialize dashboard on page load
 */
document.addEventListener("DOMContentLoaded", function () {
  // 1. Check authentication
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  // 2. Set up logout handler
  setupLogout();

  // 3. Fetch and populate dashboard data
  loadDashboardData(token);

  // 4. Setup table row click handlers (will be added after table is populated)
});

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
 * Setup logout button handler
 */
function setupLogout() {
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      redirectToLogin();
    });
  }
}

/**
 * Load dashboard data from API
 * @param {string} token JWT token
 */
async function loadDashboardData(token) {
  try {
    const response = await fetch(`${API_BASE}/incidents`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    // Handle unauthorized
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.incidents) {
      // Update UI with incident data
      populateDashboard(data.incidents);
      loadUserInfo();
    } else {
      throw new Error(data.message || "Invalid response format");
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
    alert(`Failed to load incidents: ${error.message}`);
    // Optionally redirect to login if there's an auth error
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      redirectToLogin();
    }
  }
}

/**
 * Populate dashboard UI with incident data
 * @param {Array} incidents Array of incident objects
 */
function populateDashboard(incidents) {
  // Calculate stats
  const total = incidents.length;
  const openCount = incidents.filter(i => i.status === "open").length;
  const inProgressCount = incidents.filter(i => i.status === "in_progress").length;
  const closedCount = incidents.filter(i => i.status === "closed").length;

  // Update stat cards
  updateStatCard(0, total); // Total Reports
  updateStatCard(1, openCount); // Open Incidents
  updateStatCard(2, inProgressCount); // In Progress
  updateStatCard(3, closedCount); // Closed

  // Populate incidents table
  populateIncidentsTable(incidents);
}

/**
 * Update stat card value
 * @param {number} index Card index (0-3)
 * @param {number} value New value
 */
function updateStatCard(index, value) {
  const statCards = document.querySelectorAll(".stat-card");
  if (statCards[index]) {
    const statVal = statCards[index].querySelector(".stat-val");
    if (statVal) {
      // Get the SVG (it's the first child)
      const svg = statVal.querySelector("svg");
      statVal.textContent = value;
      if (svg) {
        statVal.insertAdjacentElement("afterbegin", svg);
      }
    }
  }
}

/**
 * Populate incidents table with data
 * @param {Array} incidents Array of incident objects
 */
function populateIncidentsTable(incidents) {
  const tbody = document.querySelector("table tbody");
  if (!tbody) return;

  // Clear existing rows
  tbody.innerHTML = "";

  // Add incident rows
  incidents.forEach(incident => {
    const row = createIncidentRow(incident);
    tbody.appendChild(row);
  });

  // Setup row click handlers
  setupTableRowClicks();
}

/**
 * Create a table row element for an incident
 * @param {Object} incident Incident object
 * @returns {HTMLElement} Table row element
 */
function createIncidentRow(incident) {
  const row = document.createElement("tr");
  row.dataset.incidentId = incident.id;

  // Support both 'type' and 'category' field names
  const category = incident.type || incident.category || "N/A";
  
  // Determine priority badge style
  const priorityClass = getPriorityClass(incident.priority);
  const priorityBadge = `<span class="badge ${priorityClass}">${capitalizeFirst(incident.priority)}</span>`;

  // Determine status style
  const statusClass = getStatusClass(incident.status);
  const statusSpan = `<span class="${statusClass}">${formatStatus(incident.status)}</span>`;

  // Format date
  const reportedDate = formatDate(incident.created_at);

  row.innerHTML = `
    <td>${escapeHtml(incident.title)}</td>
    <td>${escapeHtml(category)}</td>
    <td>${priorityBadge}</td>
    <td>${statusSpan}</td>
    <td>${reportedDate}</td>
  `;

  return row;
}

/**
 * Get priority badge CSS class
 * @param {string} priority Priority level
 * @returns {string} CSS class name
 */
function getPriorityClass(priority) {
  if (!priority) return "badge-low";
  const priorityLower = priority.toLowerCase();
  if (priorityLower === "high") return "badge-high";
  if (priorityLower === "medium") return "badge-medium";
  return "badge-low";
}

/**
 * Get status CSS class
 * @param {string} status Status value
 * @returns {string} CSS class name
 */
function getStatusClass(status) {
  if (!status) return "status-open";
  const statusLower = status.toLowerCase().replace(/_/g, "");
  if (statusLower === "open") return "status-open";
  if (statusLower === "inprogress") return "status-inprogress";
  return "status-closed";
}

/**
 * Format status text for display
 * @param {string} status Status value
 * @returns {string} Formatted status text
 */
function formatStatus(status) {
  if (!status) return "Open";
  const statusLower = status.toLowerCase();
  if (statusLower === "in_progress") return "In Progress";
  if (statusLower === "inprogress") return "In Progress";
  if (statusLower === "open") return "Open";
  if (statusLower === "closed") return "Closed";
  return capitalizeFirst(status);
}

/**
 * Format date to readable format
 * @param {string} dateString ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch (e) {
    return dateString;
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

/**
 * Setup click handlers for table rows
 */
function setupTableRowClicks() {
  const rows = document.querySelectorAll("table tbody tr");
  rows.forEach(row => {
    row.addEventListener("click", function () {
      const incidentId = this.dataset.incidentId;
      if (incidentId) {
        window.location.href = `incident-detail.html?id=${encodeURIComponent(incidentId)}`;
      }
    });
  });
}

/**
 * Load and display user information
 */
function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem("user")) || {};

  // Update greeting with user's first name
  const greetingEl = document.querySelector(".topbar-greeting");
  if (greetingEl && user.name) {
    const firstName = user.name.split(" ")[0];
    greetingEl.textContent = `Hi, ${firstName} 👋`;
  }

  // Update user avatar initial
  const avatarEl = document.querySelector(".user-avatar");
  if (avatarEl && user.name) {
    avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }

  // Update user name in top right
  const userNameEl = document.querySelector(".user-name");
  if (userNameEl && user.name) {
    userNameEl.textContent = user.name;
  }
}
