/**
 * Authentication Utility Functions
 * Provides helper functions for authentication and role-based access control
 * Works with JWT tokens stored in localStorage
 */

/**
 * Checks if user is authenticated
 * @returns {boolean} True if token exists, false otherwise
 */
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
}

/**
 * Gets the current user from localStorage
 * @returns {Object|null} User object or null if not found
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

/**
 * Gets the authentication token
 * @returns {string|null} JWT token or null if not found
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Checks if current user is an admin
 * @returns {boolean} True if user is admin, false otherwise
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

/**
 * Checks if current user has a specific role
 * @param {string} role - Role to check
 * @returns {boolean} True if user has the role, false otherwise
 */
function hasRole(role) {
    const user = getCurrentUser();
    return user && user.role === role;
}

/**
 * Redirects to login if not authenticated
 * Uses correct relative path based on calling page location
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '../auth/login.html';
    }
}

/**
 * Protects admin pages: redirects to login if not authenticated,
 * redirects to user dashboard if not admin
 */
function requireAdmin() {
    if (!isAuthenticated()) {
        window.location.href = '../auth/login.html';
        return;
    }
    
    if (!isAdmin()) {
        // Clear stored data and redirect to user dashboard
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../user/dashboard.html';
    }
}

/**
 * Redirects to appropriate page based on user role
 * @param {string} adminPage - URL to redirect admin users to (default: '../admin/dashboard.html')
 * @param {string} userPage - URL to redirect regular users to (default: '../user/dashboard.html')
 */
function redirectByRole(adminPage = '../admin/dashboard.html', userPage = '../user/dashboard.html') {
    const user = getCurrentUser();
    
    if (user && user.role === 'admin') {
        window.location.href = adminPage;
    } else {
        window.location.href = userPage;
    }
}

/**
 * Clears authentication data from localStorage
 */
function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

/**
 * Logs out user: clears auth data and redirects to login page
 */
function logout() {
    clearAuth();
window.location.href = '../auth/login.html';
}

