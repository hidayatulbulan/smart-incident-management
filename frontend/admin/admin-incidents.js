/**
 * Admin Incidents List Handler
 * Fetches and displays all incident reports for admin users
 */

/**
 * Format date from ISO format to DD-MM-YYYY
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDateDDMMYYYY(dateString) {
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

/**
 * Get first letter of a name for avatar
 * @param {string} name - Full name
 * @returns {string} First letter in uppercase
 */
function getAvatarInitial(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}

/**
 * Generate a color based on a string (deterministic)
 * @param {string} str - Input string
 * @returns {string} Hex color code
 */
function getColorFromString(str) {
    const colors = [
        '#ffd89b', // Orange
        '#a8edea', // Cyan
        '#f093fb', // Pink
        '#667eea', // Purple
        '#4facfe', // Blue
        '#43e97b', // Green
        '#fa709a', // Red-pink
        '#fee140', // Yellow
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        z-index: 1000;
        max-width: 400px;
        font-weight: 600;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}

/**
 * Show success message to user
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #22c55e;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
        z-index: 1000;
        max-width: 400px;
        font-weight: 600;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

/**
 * Show loading message
 */
function showLoading() {
    const tbody = document.querySelector('.incidents-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #667eea;"></i>
                    <p style="margin-top: 10px; color: #999;">Memuat data insiden...</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Show empty state message
 */
function showEmptyState() {
    const tbody = document.querySelector('.incidents-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 40px; color: #ddd; margin-bottom: 10px;"></i>
                    <p style="color: #999; font-size: 14px;">Belum ada laporan insiden</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Render incidents into the table
 * @param {Array} incidents - Array of incident objects
 */
function renderIncidents(incidents) {
    const tbody = document.querySelector('.incidents-table tbody');
    
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    // Store incidents for modal access
    allIncidentsData = incidents;

    // Clear existing rows
    tbody.innerHTML = '';

    // Check if incidents array is empty
    if (!incidents || incidents.length === 0) {
        showEmptyState();
        return;
    }

    // Render each incident
    incidents.forEach((incident, index) => {
        const row = document.createElement('tr');
        
        // Get reporter name
        const reporterName = incident.reporter_name || 'Unknown';
        const userInitial = getAvatarInitial(reporterName);
        const avatarColor = getColorFromString(incident.id?.toString() || '');
        
        // Format date
        const formattedDate = formatDateDDMMYYYY(incident.created_at);
        
        // Determine status badge class
        let statusClass = 'status-open';
        if (incident.status?.toLowerCase() === 'progress') statusClass = 'status-progress';
        else if (incident.status?.toLowerCase() === 'closed') statusClass = 'status-closed';
        
        // Determine priority badge class dynamically
        const priorityClass = 'priority-' + (incident.priority || 'medium').toLowerCase();
        
        // Build row HTML
        row.innerHTML = `
            <td>#${String(incident.id).padStart(3, '0')}</td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar-small" style="background: ${avatarColor};">${userInitial}</div>
                    <span>${escapeHtml(reporterName)}</span>
                </div>
            </td>
            <td>${escapeHtml(incident.title || '-')}</td>
            <td>${escapeHtml(incident.category || '-')}</td>
            <td><span class="priority-badge ${priorityClass}">${escapeHtml(incident.priority || 'Medium')}</span></td>
            <td>
                <select class="status-select ${statusClass}" onchange="updateStatus(${incident.id}, this.value)">
                    <option value="open" ${incident.status?.toLowerCase() === 'open' ? 'selected' : ''}>Open</option>
                    <option value="in_progress" ${incident.status?.toLowerCase() === 'progress' ? 'selected' : ''}>Progress</option>
                    <option value="closed" ${incident.status?.toLowerCase() === 'closed' ? 'selected' : ''}>Closed</option>
                </select>
            </td>
            <td>${formattedDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" title="View incident" onclick="viewIncident(${incident.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" title="Edit incident" onclick="editIncident(${incident.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete incident" onclick="deleteIncident(${incident.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Store incidents for modal access
 */
let allIncidentsData = [];

/**
 * Get incident by ID from allIncidentsData
 */
function getIncidentById(id) {
    return allIncidentsData.find(inc => inc.id === parseInt(id));
}

/**
 * Open incident detail modal
 */
function openIncidentModal(id, isReadOnly = false) {
    const incident = getIncidentById(id);
    if (!incident) {
        showError('Incident not found');
        return;
    }

    const modal = document.getElementById('incidentModal');
    if (!modal) {
        createIncidentModal();
    }

    const modalContent = document.getElementById('incidentModalContent');
    const statusSelect = document.getElementById('modalStatusSelect');
    const adminNotetextarea = document.getElementById('modalAdminNote');
    const saveBtn = document.getElementById('modalSaveBtn');
    const formFields = document.querySelectorAll('.modal-form-group input:not([type="hidden"]), .modal-form-group textarea');

    // Set all fields
    document.getElementById('modalIncidentId').value = incident.id;
    document.getElementById('modalTitle').value = incident.title || '';
    document.getElementById('modalCategory').value = incident.category || '';
    document.getElementById('modalLocation').value = incident.location || '';
    document.getElementById('modalDescription').value = incident.description || '';
    document.getElementById('modalPriority').value = incident.priority || '';
    statusSelect.value = incident.status?.toLowerCase() || 'open';
    adminNotetextarea.value = incident.admin_note || '';

    // Set photo
    const photoImg = document.getElementById('modalPhoto');
    if (incident.photo) {
        photoImg.src = `http://localhost:3000/uploads/${incident.photo}`;
        photoImg.style.display = 'block';
    } else {
        photoImg.style.display = 'none';
    }

    const noPhotoText = document.getElementById('modalNoPhoto');
    if (!incident.photo) {
        noPhotoText.style.display = 'block';
    } else {
        noPhotoText.style.display = 'none';
    }

    // Handle read-only mode
    if (isReadOnly) {
        document.getElementById('modalTitle').textContent = `Incident #${incident.id}`;
        formFields.forEach(field => field.disabled = true);
        statusSelect.disabled = true;
        adminNotetextarea.disabled = true;
        saveBtn.style.display = 'none';
        document.querySelector('.modal-header h2').textContent = 'View Incident';
    } else {
        document.querySelector('.modal-header h2').textContent = 'Edit Incident';
        formFields.forEach(field => field.disabled = false);
        statusSelect.disabled = false;
        adminNotetextarea.disabled = false;
        saveBtn.style.display = 'block';
    }

    // Show modal
    document.getElementById('incidentModal').style.display = 'flex';
}

/**
 * Create incident detail modal
 */
function createIncidentModal() {
    if (document.getElementById('incidentModal')) return;

    const modal = document.createElement('div');
    modal.id = 'incidentModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 2000;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div class="modal-box" style="
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
            <div class="modal-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
                position: sticky;
                top: 0;
                background: white;
            ">
                <h2 style="font-size: 18px; font-weight: 700; color: #1a1a2e;">Edit Incident</h2>
                <button onclick="closeIncidentModal()" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #9ca3af;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body" style="padding: 20px;">
                <input type="hidden" id="modalIncidentId">

                <!-- Photo Section -->
                <div style="margin-bottom: 20px; text-align: center;">
                    <h3 style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #6b7280;">INCIDENT PHOTO</h3>
                    <img id="modalPhoto" style="
                        max-width: 100%;
                        max-height: 300px;
                        border-radius: 8px;
                        display: none;
                    ">
                    <div id="modalNoPhoto" style="
                        background: #f3f4f6;
                        padding: 40px;
                        border-radius: 8px;
                        color: #9ca3af;
                        font-size: 13px;
                    ">No photo available</div>
                </div>

                <!-- Form Fields -->
                <div class="modal-form-group" style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 5px; text-transform: uppercase;">Title</label>
                    <input type="text" id="modalTitle" readonly style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 13px;
                        background: #f9fafb;
                    ">
                </div>

                <div class="modal-form-group" style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 5px; text-transform: uppercase;">Category</label>
                    <input type="text" id="modalCategory" readonly style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 13px;
                        background: #f9fafb;
                    ">
                </div>

                <div class="modal-form-group" style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 5px; text-transform: uppercase;">Location</label>
                    <input type="text" id="modalLocation" readonly style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 13px;
                        background: #f9fafb;
                    ">
                </div>

                <div class="modal-form-group" style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 5px; text-transform: uppercase;">Description</label>
                    <textarea id="modalDescription" readonly style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 13px;
                        min-height: 80px;
                        resize: vertical;
                        background: #f9fafb;
                        font-family: inherit;
                    "></textarea>
                </div>

                <div class="modal-form-group" style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 5px; text-transform: uppercase;">Priority</label>
                    <input type="text" id="modalPriority" readonly style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 13px;
                        background: #f9fafb;
                    ">
                </div>

                <div class="modal-form-group" style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 5px; text-transform: uppercase;">Status</label>
                    <select id="modalStatusSelect" style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 13px;
                        cursor: pointer;
                    ">
                        <option value="open">Open</option>
                        <option value="progress">Progress</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>

                <div class="modal-form-group" style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 11px; font-weight: 600; color: #9ca3af; margin-bottom: 5px; text-transform: uppercase;">Admin Note</label>
                    <textarea id="modalAdminNote" style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 13px;
                        min-height: 80px;
                        resize: vertical;
                        font-family: inherit;
                    "></textarea>
                </div>
            </div>

            <div class="modal-footer" style="
                padding: 15px 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                sticky;
                bottom: 0;
                background: white;
            ">
                <button onclick="closeIncidentModal()" style="
                    padding: 8px 16px;
                    border: 1px solid #e5e7eb;
                    background: white;
                    color: #374151;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                ">Cancel</button>
                <button id="modalSaveBtn" onclick="saveIncidentChanges()" style="
                    padding: 8px 16px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                ">Save Changes</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeIncidentModal();
        }
    });
}

/**
 * Close incident modal
 */
function closeIncidentModal() {
    const modal = document.getElementById('incidentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Save incident changes
 */
async function saveIncidentChanges() {
    const incidentId = document.getElementById('modalIncidentId').value;
    const status = document.getElementById('modalStatusSelect').value;
    const adminNote = document.getElementById('modalAdminNote').value;
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`http://localhost:3000/api/admin/incidents/${incidentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, admin_note: adminNote })
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message || 'Failed to update incident');

        showSuccess(`Incident #${incidentId} updated successfully`);
        closeIncidentModal();
        fetchIncidents();
    } catch (error) {
        showError('Error saving incident: ' + error.message);
    }
}

/**
 * Edit incident - opens modal
 */
function editIncident(id) {
    openIncidentModal(id, false);
}

/**
 * View incident - opens read-only modal
 */
function viewIncident(id) {
    openIncidentModal(id, true);
}

/**
 * Delete incident
 */
function deleteIncident(id) {
    if (confirm(`Are you sure you want to delete incident #${id}?`)) {
        alert(`Delete incident #${id} functionality coming soon`);
    }
}

/**
 * Update incident status
 * @param {number} id - Incident ID
 * @param {string} newStatus - New status value
 */
async function updateStatus(id, newStatus) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:3000/api/admin/incidents/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message || 'Gagal update status');
        showSuccess(`Status incident #${id} berhasil diubah`);
        fetchIncidents();
    } catch (error) {
        showError('Gagal mengubah status incident: ' + error.message);
    }
}

/**
 * Fetch all incidents from API
 */
async function fetchIncidents() {
    // Check if token exists
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Anda harus login terlebih dahulu');
        window.location.href = '../auth/login.html';
        return;
    }

    try {
        showLoading();

        // Fetch incidents from API
        const response = await fetch('http://localhost:3000/api/admin/incidents', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        // Handle response status
        if (response.status === 401) {
            alert('Unauthorized');
            window.location.href = '../auth/login.html';
            return;
        }

        if (response.status === 403) {
            showError('Access denied');
            return;
        }

        if (response.status === 500) {
            showError('Gagal memuat data insiden');
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse JSON response
        const data = await response.json();

        // Check if response is successful
        if (data.success && Array.isArray(data.data)) {
            renderIncidents(data.data);
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Error fetching incidents:', error);
        showError('Gagal memuat data insiden');
        showEmptyState();
    }
}

/**
 * Initialize page on load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Fetch incidents when page loads
    fetchIncidents();
    
    // Add logout event listener
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            window.location.href = '../auth/login.html';
        });
    }
});
