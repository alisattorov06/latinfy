const API_BASE = (
    location.hostname.includes('github.io')
        ? 'https://latinfy.onrender.com'
        : ''
);

const urlParams = new URLSearchParams(window.location.search);
const adminToken = urlParams.get('token');

// State variables
let currentTab = 'ads';
let adsData = [];

// DOM Elements for tabs
const showAdsTab = document.getElementById('showAdsTab');
const showStatsTab = document.getElementById('showStatsTab');
const showAddTab = document.getElementById('showAddTab');

const adsTab = document.getElementById('adsTab');
const statsTab = document.getElementById('statsTab');
const addTab = document.getElementById('addTab');

// Ads list elements
const adsTableBody = document.getElementById('adsTableBody');
const noAdsMessage = document.getElementById('noAdsMessage');
const refreshAds = document.getElementById('refreshAds');

// Stats elements
const totalAds = document.getElementById('totalAds');
const activeAds = document.getElementById('activeAds');
const totalConversions = document.getElementById('totalConversions');
const recentActivity = document.getElementById('recentActivity');

// Add ad form elements
const addAdForm = document.getElementById('addAdForm');
const adImageInput = document.getElementById('adImageInput');
const browseImageBtn = document.getElementById('browseImageBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const adTitleInput = document.getElementById('adTitleInput');
const adUrlInput = document.getElementById('adUrlInput');
const adDelayInput = document.getElementById('adDelayInput');
const delayValue = document.getElementById('delayValue');
const adActiveInput = document.getElementById('adActiveInput');
const cancelAdd = document.getElementById('cancelAdd');

// ======================
// TAB MANAGEMENT
// ======================

// Initialize tabs
showAdsTab.addEventListener('click', () => switchTab('ads'));
showStatsTab.addEventListener('click', () => switchTab('stats'));
showAddTab.addEventListener('click', () => switchTab('add'));

function switchTab(tabName) {
    // Update tab buttons
    showAdsTab.className = 'w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 transition';
    showStatsTab.className = 'w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 transition';
    showAddTab.className = 'w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 transition';

    // Hide all tabs
    adsTab.classList.add('hidden');
    statsTab.classList.add('hidden');
    addTab.classList.add('hidden');

    // Show selected tab and update button
    switch (tabName) {
        case 'ads':
            showAdsTab.className = 'w-full text-left px-4 py-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium';
            adsTab.classList.remove('hidden');
            loadAds();
            break;
        case 'stats':
            showStatsTab.className = 'w-full text-left px-4 py-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium';
            statsTab.classList.remove('hidden');
            loadStats();
            break;
        case 'add':
            showAddTab.className = 'w-full text-left px-4 py-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium';
            addTab.classList.remove('hidden');
            resetAddForm();
            break;
    }

    currentTab = tabName;
}

// ======================
// ADS MANAGEMENT
// ======================

// Load all ads
async function loadAds() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/ads?token=${adminToken}`);

        if (response.status === 403) {
            showNotification('Admin token noto\'g\'ri yoki muddati o\'tgan', 'error');
            setTimeout(() => window.location.href = '/admin', 2000);
            return;
        }

        if (!response.ok) {
            throw new Error('Server xatosi');
        }

        const data = await response.json();
        adsData = data.ads;
        renderAdsTable();

    } catch (error) {
        showNotification('Reklamalarni yuklash xatosi', 'error');
        console.error(error);
    }
}

// Render ads table
function renderAdsTable() {
    if (!adsData || adsData.length === 0) {
        adsTableBody.innerHTML = '';
        noAdsMessage.classList.remove('hidden');
        return;
    }

    noAdsMessage.classList.add('hidden');

    const rows = adsData.map(ad => `
          <tr class="hover:bg-gray-50 transition">
              <td class="px-6 py-4 whitespace-nowrap">
                  <img src="${ad.image_path}" alt="Reklama" 
                       class="ad-image-preview w-32 rounded-md shadow">
              </td>
              <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">${escapeHtml(ad.title_text)}</div>
                  <div class="text-sm text-gray-500">
                      ID: ${ad.id} • ${new Date(ad.created_at).toLocaleDateString('uz-UZ')}
                  </div>
              </td>
              <td class="px-6 py-4">
                  <a href="${ad.redirect_url}" target="_blank" 
                     class="text-blue-600 hover:text-blue-800 break-all text-sm">
                      ${escapeHtml(ad.redirect_url.substring(0, 40))}${ad.redirect_url.length > 40 ? '...' : ''}
                  </a>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      ${ad.display_delay_seconds}s
                  </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-3 py-1 rounded-full text-sm font-medium ${ad.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      ${ad.active ? 'Faol' : 'Nofaol'}
                  </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                      <button onclick="toggleAd(${ad.id})" 
                              class="px-3 py-1 ${ad.active ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'} rounded transition">
                          ${ad.active ? 'O\'chirish' : 'Yoqish'}
                      </button>
                      <button onclick="deleteAd(${ad.id})" 
                              class="px-3 py-1 bg-red-100 text-red-800 hover:bg-red-200 rounded transition">
                          O'chirish
                      </button>
                  </div>
              </td>
          </tr>
      `).join('');

    adsTableBody.innerHTML = rows;
}

// Toggle ad status
window.toggleAd = async function (adId) {
    if (!confirm('Reklama holatini o\'zgartirishni tasdiqlaysizmi?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/ads/${adId}/toggle?token=${adminToken}`, {
            method: 'PUT'
        });

        if (!response.ok) {
            throw new Error('Server xatosi');
        }

        const data = await response.json();
        showNotification('Reklama holati o\'zgartirildi', 'success');
        loadAds(); // Reload ads

    } catch (error) {
        showNotification('Reklama holatini o\'zgartirish xatosi', 'error');
        console.error(error);
    }
};

// Delete ad
window.deleteAd = async function (adId) {
    if (!confirm('Reklamani o\'chirishni tasdiqlaysizmi? Bu amalni bekor qilib bo\'lmaydi.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/ads/${adId}?token=${adminToken}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Server xatosi');
        }

        showNotification('Reklama muvaffaqiyatli o\'chirildi', 'success');
        loadAds(); // Reload ads

    } catch (error) {
        showNotification('Reklamani o\'chirish xatosi', 'error');
        console.error(error);
    }
};

// Refresh ads list
refreshAds.addEventListener('click', loadAds);

// ======================
// STATISTICS
// ======================

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/stats?token=${adminToken}`);

        if (!response.ok) {
            throw new Error('Server xatosi');
        }

        const data = await response.json();

        // Update stats cards
        totalAds.textContent = data.stats.total_ads;
        activeAds.textContent = data.stats.active_ads;
        totalConversions.textContent = data.stats.total_conversions;

        // Update recent activity
        renderRecentActivity(data.recent_conversions);

    } catch (error) {
        showNotification('Statistika yuklash xatosi', 'error');
        console.error(error);
    }
}

// Render recent activity
function renderRecentActivity(conversions) {
    if (!conversions || conversions.length === 0) {
        recentActivity.innerHTML = `
              <tr>
                  <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                      <i class="fas fa-history text-3xl mb-3 text-gray-300"></i>
                      <p>Hozircha faollik yo'q</p>
                  </td>
              </tr>
          `;
        return;
    }

    const rows = conversions.map(conv => `
          <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-3 py-1 rounded-full text-sm font-medium ${conv.type === 'text' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                      ${conv.type === 'text' ? 'Matn' : 'DOCX'}
                  </span>
              </td>
              <td class="px-6 py-4">
                  <div class="text-sm text-gray-900">${escapeHtml(conv.filename || 'Matn konvertatsiyasi')}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${new Date(conv.timestamp).toLocaleString('uz-UZ')}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${conv.ip || 'Noma\'lum'}
              </td>
          </tr>
      `).join('');

    recentActivity.innerHTML = rows;
}

// ======================
// ADD NEW ADVERTISEMENT
// ======================

// Image upload handling
browseImageBtn.addEventListener('click', () => adImageInput.click());

adImageInput.addEventListener('change', function (e) {
    if (this.files && this.files[0]) {
        const file = this.files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('Faqat rasm fayllarini tanlash mumkin', 'error');
            this.value = '';
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Rasm hajmi 2MB dan oshmasligi kerak', 'error');
            this.value = '';
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function (e) {
            previewImage.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Update delay value display
adDelayInput.addEventListener('input', function () {
    delayValue.textContent = this.value + 's';
});

// Form submission
addAdForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Validate form
    if (!adImageInput.files || !adImageInput.files[0]) {
        showNotification('Rasmni tanlang', 'error');
        return;
    }

    if (!adTitleInput.value.trim()) {
        showNotification('Sarlavha matnini kiriting', 'error');
        return;
    }

    if (!adUrlInput.value.trim()) {
        showNotification('Havolani kiriting', 'error');
        return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('token', adminToken);
    formData.append('title_text', adTitleInput.value.trim());
    formData.append('redirect_url', adUrlInput.value.trim());
    formData.append('display_delay_seconds', adDelayInput.value);
    formData.append('active', adActiveInput.checked);
    formData.append('image', adImageInput.files[0]);

    // Submit
    try {
        const response = await fetch(
            `${API_BASE}/api/admin/ads/create?token=${adminToken}`,
            {
                method: 'POST',
                body: formData
            }
        );


        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const data = await response.json();

        if (data.success) {
            showNotification('Reklama muvaffaqiyatli qo\'shildi!', 'success');
            resetAddForm();
            switchTab('ads'); // Go back to ads list
        } else {
            throw new Error('Reklama qo\'shish xatosi');
        }

    } catch (error) {
        showNotification('Reklama qo\'shish xatosi: ' + error.message, 'error');
        console.error(error);
    }
});

// Cancel add
cancelAdd.addEventListener('click', function () {
    if (confirm('Formani tozalashni istaysizmi?')) {
        resetAddForm();
        switchTab('ads');
    }
});

// Reset add form
function resetAddForm() {
    addAdForm.reset();
    adImageInput.value = '';
    imagePreview.classList.add('hidden');
    delayValue.textContent = '5s';
    adDelayInput.value = 5;
}

// ======================
// UTILITY FUNCTIONS
// ======================

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.admin-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white max-w-sm transform transition-all duration-300 ${type === 'success' ? 'bg-green-500' :
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Check for admin token
    if (!adminToken) {
        showNotification('Admin token kerak', 'error');
        setTimeout(() => window.location.href = '/admin', 2000);
        return;
    }

    // Load initial data
    loadAds();

    // Set up periodic refresh for stats tab
    setInterval(() => {
        if (currentTab === 'stats') {
            loadStats();
        }
    }, 30000); // Every 30 seconds

});

