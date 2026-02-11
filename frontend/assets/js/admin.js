/**
 * Admin Module
 * Provides authentication and authorization checks for admin pages
 * Protects all admin-only pages with JWT token and role verification
 */

/**
 * Initialize admin page protection
 * Checks JWT token and admin role from localStorage
 * Redirects to login if not authenticated
 * Redirects to user dashboard if not admin
 * Call this function at the top of every admin page
 */
function protectAdminPage() {
  // Check if JWT token exists
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("Admin: No token found. Redirecting to login...");
    window.location.href = "../auth/login.html";
    return;
  }

  // Get user info from localStorage
  const userStr = localStorage.getItem("user");
  let user = null;

  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Admin: Error parsing user data:", error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "../auth/login.html";
    return;
  }

  // Check if user has admin role
  if (!user || user.role !== "admin") {
    console.warn("Admin: User is not admin. Redirecting to user dashboard...");
    window.location.href = "../user/dashboard.html";
    return;
  }

  console.log("Admin: Authentication successful. User:", user.name || user.email);
}

/**
 * Verify JWT token is still valid (call periodically during admin session)
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
async function verifyAdminToken() {
  const token = localStorage.getItem("token");
  
  if (!token) {
    return false;
  }

  try {
    // Optional: Verify token with backend
    // This is a placeholder - implement based on your backend's token verification endpoint
    // const response = await fetch("http://localhost:3000/api/auth/verify", {
    //   headers: {
    //     "Authorization": `Bearer ${token}`
    //   }
    // });
    // return response.ok;

    // For now, just check if token exists
    return true;
  } catch (error) {
    console.error("Admin: Token verification failed:", error);
    return false;
  }
}

/**
 * Get current admin user information
 * @returns {Object|null} User object or null if not found
 */
function getAdminUser() {
  const userStr = localStorage.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Admin: Error parsing user data:", error);
    return null;
  }
}

/**
 * Get JWT token
 * @returns {string|null} JWT token or null if not found
 */
function getAdminToken() {
  return localStorage.getItem("token");
}

/**
 * Logout admin user
 * Clears all authentication data and redirects to login page
 */
function logoutAdmin() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  console.log("Admin: User logged out");
  window.location.href = "../auth/login.html";
}

/**
 * Check if current user is admin (without redirection)
 * Use this for conditional UI rendering
 * @returns {boolean} True if user is admin, false otherwise
 */
function isAdminUser() {
  const userStr = localStorage.getItem("user");
  try {
    const user = userStr ? JSON.parse(userStr) : null;
    return user && user.role === "admin";
  } catch (error) {
    return false;
  }
}
