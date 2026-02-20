/**
 * Incident Report Form Handler
 * Handles form submission for creating new incident reports
 */

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const titleInput = document.querySelector('input[placeholder="Misal: AC di Ruang 302 Rusak"]');
    const categorySelect = document.getElementById('kategori');
    const locationInput = document.querySelector('input[placeholder="Contoh: Gedung A, Lantai 2, Ruangan 204"]');
    const descriptionTextarea = document.querySelector('textarea[placeholder="Jelaskan detail insiden secara rinci..."]');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.querySelector('.upload-area');
    const submitBtn = document.querySelector('.kirim-btn');
    const cancelBtn = document.querySelector('.batal-btn');

    // Form validation
    function validateForm() {
        const errors = [];

        if (!titleInput.value.trim()) {
            errors.push('Judul insiden harus diisi');
        }

        if (!categorySelect.value) {
            errors.push('Kategori harus dipilih');
        }

        if (!locationInput.value.trim()) {
            errors.push('Lokasi kejadian harus diisi');
        }

        if (!descriptionTextarea.value.trim()) {
            errors.push('Deskripsi masalah harus diisi');
        }

        if (!fileInput.files || fileInput.files.length === 0) {
            errors.push('Bukti Foto wajib diunggah');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Show error messages
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

    // Show success message
    function showSuccess(message) {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
            z-index: 1000;
            max-width: 400px;
            font-weight: 600;
        `;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 2000);
    }

    // Disable submit button and show loading state
    function setSubmitLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.textContent = 'Mengirim...';
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Kirim Laporan
            `;
        }
    }

    // ✅ FIXED - Handle file selection via input or drag and drop
    function handleFileSelect(file) {
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files; // ✅ benar - file tersambung ke fileInput

            const uploadText = uploadArea.querySelector('.upload-text');
            if (uploadText) {
                uploadText.textContent = `✓ ${file.name}`;
                uploadText.style.color = '#10b981';
            }
        } else {
            showError('Hanya file gambar (PNG, JPG) atau PDF yang diizinkan');
        }
    }

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.backgroundColor = 'rgba(108, 99, 255, 0.05)';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.backgroundColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.backgroundColor = '';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const uploadText = uploadArea.querySelector('.upload-text');
            if (uploadText) {
                uploadText.textContent = `✓ ${e.target.files[0].name}`;
                uploadText.style.color = '#10b981';
            }
        }
    });

    // Submit form
    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // Validate form
        const validation = validateForm();
        if (!validation.isValid) {
            validation.errors.forEach(error => showError(error));
            return;
        }

        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            showError('Anda harus login terlebih dahulu');
            window.location.href = '../auth/login.html';
            return;
        }

        // Disable submit button and show loading state
        setSubmitLoading(true);

        try {
            // Prepare data
            const title = titleInput.value.trim();
            const category = categorySelect.value;
            const description = descriptionTextarea.value.trim();
            const location = locationInput.value.trim();
            const photo = fileInput.files[0];

            // Call API
            const result = await Incidents.createReport(title, category, description, location, photo);

            if (result.success) {
                showSuccess('Laporan insiden berhasil dibuat!');

                // Redirect to incident detail after short delay
                setTimeout(async () => {
                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch('http://localhost:3000/api/incidents', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (data.incidents && data.incidents.length > 0) {
                            window.location.href = `incident-detail.html?id=${data.incidents[0].id}`;
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    } catch {
                        window.location.href = 'dashboard.html';
                    }
                }, 1500);
            } else {
                const errorMessage = result.data?.message || result.error || 'Gagal mengirim laporan insiden';
                showError(errorMessage);
                setSubmitLoading(false);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            showError('Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.');
            setSubmitLoading(false);
        }
    });

    // Cancel button
    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // Clear form
        titleInput.value = '';
        categorySelect.value = '';
        locationInput.value = '';
        descriptionTextarea.value = '';
        fileInput.value = '';

        const uploadText = uploadArea.querySelector('.upload-text');
        if (uploadText) {
            uploadText.textContent = 'Klik untuk upload atau drag and drop';
            uploadText.style.color = '';
        }

        showSuccess('Form dibatalkan');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);
    });
});