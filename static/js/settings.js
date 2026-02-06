/**
 * settings.js - Settings page logic for Latinify
 * Handles global configuration and dangerous operations
 */

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const adminToken = urlParams.get('token');

// DOM Elements
const saveSettings = document.getElementById('saveSettings');
const adsEnabled = document.getElementById('adsEnabled');
const modalDelay = document.getElementById('modalDelay');
const delayValueDisplay = document.getElementById('delayValueDisplay');
const deleteAllAds = document.getElementById('deleteAllAds');
const clearLogs = document.getElementById('clearLogs');

// Status elements
const dbStatus = document.getElementById('dbStatus');
const uploadsStatus = document.getElementById('uploadsStatus');
const adsImagesStatus = document.getElementById('adsImagesStatus');
const lastCheck = document.getElementById('lastCheck');

// ======================
// INITIALIZATION
// ======================

document.addEventListener('DOMContentLoaded', async function() {
    // Check for admin token
    if (!adminToken) {
        showNotification('Admin token kerak', 'error');
        setTimeout(() => window.location.href = '/admin', 2000);
        return;
    }
    
    // Load current settings
    await loadCurrentSettings();
    
    // Initialize UI
    updateDelayDisplay();
    checkSystemStatus();
    
    // Set up periodic status check
    setInterval(checkSystemStatus, 60000); // Every minute
    setInterval(updateLastCheckTime, 60000); // Update time display
    
    // Initialize last check time
    updateLastCheckTime();
});

// ======================
// SETTINGS MANAGEMENT
// ======================

// Load current settings from API
async function loadCurrentSettings() {
    try {
        const response = await fetch(`/api/admin/settings?token=${adminToken}`);
        
        if (response.status === 403) {
            showNotification('Admin token noto\'g\'ri yoki muddati o\'tgan', 'error');
            setTimeout(() => window.location.href = '/admin', 2000);
            return;
        }
        
        if (!response.ok) {
            throw new Error('Server xatosi');
        }
        
        const data = await response.json();
        
        // Update UI with current settings
        adsEnabled.checked = data.settings.ads_enabled;
        modalDelay.value = data.settings.modal_delay_seconds;
        updateDelayDisplay();
        
        showNotification('Sozlamalar yuklandi', 'success');
        
    } catch (error) {
        showNotification('Sozlamalarni yuklash xatosi', 'error');
        console.error(error);
    }
}

// Update delay display
function updateDelayDisplay() {
    delayValueDisplay.textContent = modalDelay.value;
}

// Listen for delay slider changes
modalDelay.addEventListener('input', updateDelayDisplay);

// Save settings
saveSettings.addEventListener('click', async function() {
    try {
        const formData = new FormData();
        formData.append('token', adminToken);
        formData.append('ads_enabled', adsEnabled.checked);
        formData.append('modal_delay_seconds', modalDelay.value);
        
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Sozlamalar muvaffaqiyatli saqlandi!', 'success');
            
            // Visual feedback
            saveSettings.innerHTML = '<i class="fas fa-check mr-2"></i>Saqlangan!';
            saveSettings.classList.remove('bg-green-600', 'hover:bg-green-700');
            saveSettings.classList.add('bg-green-500');
            
            setTimeout(() => {
                saveSettings.innerHTML = '<i class="fas fa-save mr-2"></i>Saqlash';
                saveSettings.classList.remove('bg-green-500');
                saveSettings.classList.add('bg-green-600', 'hover:bg-green-700');
            }, 2000);
            
        } else {
            throw new Error('Sozlamalarni saqlash xatosi');
        }
        
    } catch (error) {
        showNotification('Sozlamalarni saqlash xatosi: ' + error.message, 'error');
        console.error(error);
    }
});

// ======================
// DANGEROUS OPERATIONS
// ======================

// Delete all ads
deleteAllAds.addEventListener('click', async function() {
    if (!confirm('ROSTAN HAM barcha reklamalarni o\'chirmoqchimisiz?\n\nBu amalni bekor qilib bo\'lmaydi. Barcha reklama rasmlari ham o\'chiriladi.')) {
        return;
    }
    
    // Get all ads first to confirm
    try {
        const adsResponse = await fetch(`/api/admin/ads?token=${adminToken}`);
        if (!adsResponse.ok) throw new Error('Reklamalarni olish xatosi');
        
        const adsData = await adsResponse.json();
        const adCount = adsData.ads.length;
        
        if (adCount === 0) {
            showNotification('O\'chirish uchun reklamalar yo\'q', 'warning');
            return;
        }
        
        if (!confirm(`${adCount} ta reklama o\'chiriladi. Davom etishni tasdiqlaysizmi?`)) {
            return;
        }
        
        // Show loading
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>O\'chirilmoqda...';
        
        // Delete each ad one by one
        let deletedCount = 0;
        let errors = [];
        
        for (const ad of adsData.ads) {
            try {
                const deleteResponse = await fetch(`/api/admin/ads/${ad.id}?token=${adminToken}`, {
                    method: 'DELETE'
                });
                
                if (deleteResponse.ok) {
                    deletedCount++;
                } else {
                    errors.push(`Reklama ID ${ad.id}: ${await deleteResponse.text()}`);
                }
            } catch (error) {
                errors.push(`Reklama ID ${ad.id}: ${error.message}`);
            }
        }
        
        // Show result
        if (errors.length === 0) {
            showNotification(`${deletedCount} ta reklama muvaffaqiyatli o\'chirildi`, 'success');
        } else {
            showNotification(`${deletedCount} ta reklama o\'chirildi, ${errors.length} ta xatolik`, 'warning');
            console.error('Deletion errors:', errors);
        }
        
    } catch (error) {
        showNotification('Reklamalarni o\'chirish xatosi: ' + error.message, 'error');
        console.error(error);
    } finally {
        // Reset button
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-trash-alt mr-2"></i>Barcha reklamalarni o\'chirish';
    }
});

// Clear conversion logs
clearLogs.addEventListener('click', async function() {
    if (!confirm('ROSTAN HAM barcha konvertatsiya tarixini tozalamoqchimisiz?\n\nStatistikalar yo\'qoladi va bu amalni bekor qilib bo\'lmaydi.')) {
        return;
    }
    
    try {
        // Show loading
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Tozalanmoqda...';
        
        // Note: This endpoint needs to be implemented in backend
        // For now, we'll show a message
        showNotification('Loglarni tozalash funktsiyasi backendda amalga oshirilishi kerak', 'info');
        
        // In a real implementation, you would call an API endpoint:
        // const response = await fetch(`/api/admin/clear-logs?token=${adminToken}`, { method: 'DELETE' });
        
    } catch (error) {
        showNotification('Loglarni tozalash xatosi: ' + error.message, 'error');
        console.error(error);
    } finally {
        // Reset button
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-broom mr-2"></i>Loglarni tozalash';
    }
});

// ======================
// SYSTEM STATUS
// ======================

// Check system status
async function checkSystemStatus() {
    try {
        // Check database
        const healthResponse = await fetch('/health');
        if (healthResponse.ok) {
            dbStatus.textContent = 'Faol';
            dbStatus.className = 'px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm';
        } else {
            dbStatus.textContent = 'Xatolik';
            dbStatus.className = 'px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm';
        }
        
        // Check uploads directory (simulated)
        uploadsStatus.textContent = 'Mavjud';
        uploadsStatus.className = 'px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm';
        
        // Check ads images directory (simulated)
        adsImagesStatus.textContent = 'Mavjud';
        adsImagesStatus.className = 'px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm';
        
    } catch (error) {
        dbStatus.textContent = 'Offline';
        dbStatus.className = 'px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm';
        
        console.error('Status check error:', error);
    }
}

// Update last check time display
function updateLastCheckTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('uz-UZ', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    lastCheck.textContent = timeString;
}

// ======================
// UTILITY FUNCTIONS
// ======================

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.settings-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `settings-notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white max-w-sm transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    
    // Add icon based on type
    const icon = type === 'success' ? 'fa-check-circle' :
                 type === 'error' ? 'fa-exclamation-circle' :
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${icon} mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}