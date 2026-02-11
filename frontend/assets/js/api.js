const API = "http://localhost:3000/api";
/**
 * Generic fetch wrapper with error handling
 */
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API}${endpoint}`, options);
        const data = await response.json();
        return { success: response.ok, status: response.status, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Authentication API calls
 */
const Auth = {
    login: async (email, password) => {
        return apiCall('/auth/login', 'POST', { email, password });
    },
    
    register: async (name, email, password) => {
        return apiCall('/auth/register', 'POST', { name, email, password });
    },
    
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

/**
 * Incident API calls
 */
const Incidents = {
    getAll: async () => {
        return apiCall('/incidents');
    },
    
    getById: async (id) => {
        return apiCall(`/incidents/${id}`);
    },
    
    create: async (title, type, priority, description, photo = null) => {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        
        formData.append('title', title);
        formData.append('type', type);
        formData.append('priority', priority);
        formData.append('description', description);
        
        if (photo) {
            formData.append('photo', photo);
        }

        try {
            const response = await fetch(`${API}/incidents/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            return { success: response.ok, status: response.status, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    update: async (id, updates) => {
        return apiCall(`/incidents/${id}`, 'PUT', updates);
    },
    
    delete: async (id) => {
        return apiCall(`/incidents/${id}`, 'DELETE');
    }
};

/**
 * Utility functions
 */
const Utils = {
    /**
     * Check if user is authenticated
     */
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    /**
     * Get stored user data
     */
    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Get stored token
     */
    getToken: () => {
        return localStorage.getItem('token');
    },

    /**
     * Format date
     */
    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Format datetime
     */
    formatDateTime: (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Redirect to login
     */
    redirectToLogin: () => {
        window.location.href = 'login.html';
    },

    /**
     * Show error message
     */
    showError: (elementId, message) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    },

    /**
     * Show success message
     */
    showSuccess: (elementId, message) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    },

    /**
     * Clear message
     */
    clearMessage: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
        }
    },

    /**
     * Show loading spinner
     */
    showLoading: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    },

    /**
     * Hide loading spinner
     */
    hideLoading: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }
};