const API_BASE = (
  location.hostname.includes('github.io')
    ? 'https://latinfy.onrender.com'
    : ''
);

let conversionCount = 0;
let currentAd = null;
let currentFile = null;
let adModalShown = false;

// DOM Elements
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const charCount = document.getElementById('charCount');
const resultCharCount = document.getElementById('resultCharCount');
const conversionCounter = document.getElementById('conversionCounter');

// Buttons
const detectBtn = document.getElementById('detectBtn');
const toCyrillicBtn = document.getElementById('toCyrillicBtn');
const toLatinBtn = document.getElementById('toLatinBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');

// File upload elements
const fileUploadArea = document.getElementById('fileUploadArea');
const docxFileInput = document.getElementById('docxFile');
const browseBtn = document.getElementById('browseBtn');
const selectedFileInfo = document.getElementById('selectedFileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFileBtn');
const convertDocxBtn = document.getElementById('convertDocxBtn');
const conversionResult = document.getElementById('conversionResult');
const resultMessage = document.getElementById('resultMessage');
const downloadBtn = document.getElementById('downloadBtn');
const convertAnotherBtn = document.getElementById('convertAnotherBtn');
const docxDirection = document.getElementById('docxDirection');

// Advertisement elements
const adModal = document.getElementById('adModal');
const closeAdBtn = document.getElementById('closeAd');
const adLink = document.getElementById('adLink');
const adImage = document.getElementById('adImage');
const adTitle = document.getElementById('adTitle');

// ======================
// TEXT CONVERSION
// ======================

// Update character count
inputText.addEventListener('input', function() {
    const count = this.value.length;
    charCount.textContent = count;
});

// Detect alphabet
detectBtn.addEventListener('click', async function() {
    const text = inputText.value.trim();
    if (!text) {
        showNotification('Matn kiriting', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/convert-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                text: text
            })
        });

        if (!response.ok) {
            throw new Error('Server xatosi');
        }

        const data = await response.json();
        let message = '';
        
        if (data.direction === 'latin_to_cyrillic') {
            message = '📝 Matn Lotin alifbosida. Kirillga o\'tkazish mumkin.';
        } else if (data.direction === 'cyrillic_to_latin') {
            message = '📝 Matn Kirill alifbosida. Lotinga o\'tkazish mumkin.';
        } else {
            message = '📝 Alifbo aniqlanmadi.';
        }
        
        showNotification(message, 'info');
    } catch (error) {
        showNotification('Xatolik yuz berdi', 'error');
        console.error(error);
    }
});

// Convert to Cyrillic
toCyrillicBtn.addEventListener('click', async function() {
    await convertText('latin_to_cyrillic');
});

// Convert to Latin
toLatinBtn.addEventListener('click', async function() {
    await convertText('cyrillic_to_latin');
});

// Main conversion function
async function convertText(direction) {
    const text = inputText.value.trim();
    if (!text) {
        showNotification('Matn kiriting', 'warning');
        return;
    }

    // Show loading
    outputText.innerHTML = `
        <div class="flex items-center justify-center h-32">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Konvertatsiya jarayonida...</span>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/api/convert-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                text: text
            })
        });

        if (!response.ok) {
            throw new Error('Server xatosi');
        }

        const data = await response.json();
        
        // Display result
        outputText.innerHTML = `
            <div class="space-y-4">
                <div>
                    <p class="text-sm text-gray-500 mb-1">Asl matn:</p>
                    <p class="text-gray-700 bg-gray-100 p-3 rounded">${escapeHtml(data.original)}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500 mb-1">Konvertatsiya natijasi:</p>
                    <p class="text-gray-800 bg-blue-50 p-3 rounded font-medium">${escapeHtml(data.converted)}</p>
                </div>
                <div class="text-sm text-gray-500">
                    <i class="fas fa-info-circle mr-1"></i>
                    ${data.direction === 'latin_to_cyrillic' ? 'Lotin → Kirill' : 'Kirill → Lotin'}
                </div>
            </div>
        `;

        // Update counters
        resultCharCount.textContent = data.converted.length;
        incrementConversionCount();
        
        // Show success notification
        showNotification('Matn muvaffaqiyatli konvert qilindi!', 'success');
    } catch (error) {
        outputText.innerHTML = `
            <div class="text-center text-red-600 p-4">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Konvertatsiya xatosi: ${error.message}</p>
            </div>
        `;
        showNotification('Xatolik yuz berdi', 'error');
        console.error(error);
    }
}

// Copy to clipboard
copyBtn.addEventListener('click', function() {
    const resultText = outputText.innerText;
    if (!resultText || resultText.includes('Natija shu yerda')) {
        showNotification('Nusxa olish uchun matn yo\'q', 'warning');
        return;
    }

    // Extract just the converted text (simplified)
    const textToCopy = outputText.querySelector('p.text-gray-800')?.innerText || resultText;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        showNotification('Natija nusxalandi!', 'success');
    }).catch(err => {
        showNotification('Nusxa olish xatosi', 'error');
        console.error(err);
    });
});

// Clear all
clearBtn.addEventListener('click', function() {
    inputText.value = '';
    outputText.innerHTML = '<p class="text-gray-500 italic">Natija shu yerda ko\'rinadi...</p>';
    charCount.textContent = '0';
    resultCharCount.textContent = '0';
    showNotification('Barcha maydonlar tozalandi', 'info');
});

// ======================
// FILE UPLOAD & CONVERSION
// ======================

// File selection
browseBtn.addEventListener('click', function() {
    docxFileInput.click();
});

// Drag and drop
fileUploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.style.borderColor = '#667eea';
    this.style.backgroundColor = '#f7fafc';
});

fileUploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    this.style.borderColor = '#cbd5e0';
    this.style.backgroundColor = 'transparent';
});

fileUploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    this.style.borderColor = '#cbd5e0';
    this.style.backgroundColor = 'transparent';
    
    if (e.dataTransfer.files.length) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

// File input change
docxFileInput.addEventListener('change', function(e) {
    if (this.files.length) {
        handleFileSelect(this.files[0]);
    }
});

// Handle file selection
function handleFileSelect(file) {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.docx')) {
        showNotification('Faqat .docx fayllarni yuklash mumkin', 'error');
        return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Fayl hajmi 5MB dan oshmasligi kerak', 'error');
        return;
    }

    currentFile = file;
    
    // Update UI
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    selectedFileInfo.classList.remove('hidden');
    convertDocxBtn.disabled = false;
    convertDocxBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i><span>Faylni konvert qilish</span>';
    
    showNotification('Fayl muvaffaqiyatli yuklandi', 'success');
}

// Remove file
removeFileBtn.addEventListener('click', function() {
    currentFile = null;
    docxFileInput.value = '';
    selectedFileInfo.classList.add('hidden');
    convertDocxBtn.disabled = true;
});

// Convert DOCX file
convertDocxBtn.addEventListener('click', async function() {
    if (!currentFile) {
        showNotification('Fayl tanlang', 'warning');
        return;
    }

    // Show loading
    convertDocxBtn.disabled = true;
    convertDocxBtn.innerHTML = `
        <div class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Konvertatsiya jarayonida...
        </div>
    `;

    try {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('direction', docxDirection.value);

        const response = await fetch(`${API_BASE}/api/upload-docx`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Konvertatsiya xatosi');
        }

        // Show success
        resultMessage.textContent = data.message;
        conversionResult.classList.remove('hidden');
        
        // Set download link
        downloadBtn.href = `${API_BASE}/api/download/${data.file_id}`;
        downloadBtn.download = data.filename;
        
        incrementConversionCount();
        showNotification('DOCX fayl muvaffaqiyatli konvert qilindi!', 'success');
        
    } catch (error) {
        showNotification('Konvertatsiya xatosi: ' + error.message, 'error');
        console.error(error);
    } finally {
        // Reset button
        convertDocxBtn.disabled = false;
        convertDocxBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i><span>Faylni konvert qilish</span>';
    }
});

// Convert another file
convertAnotherBtn.addEventListener('click', function() {
    currentFile = null;
    docxFileInput.value = '';
    selectedFileInfo.classList.add('hidden');
    conversionResult.classList.add('hidden');
    convertDocxBtn.disabled = true;
});

// ======================
// ADVERTISEMENT SYSTEM
// ======================

// Check for ads on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Load conversion count from localStorage
    const savedCount = localStorage.getItem('latinify_conversion_count');
    if (savedCount) {
        conversionCount = parseInt(savedCount);
        updateConversionCounter();
    }
    
    // Check ads after delay
    setTimeout(checkForAds, 1000);
});

// Check for available ads
async function checkForAds() {
    if (adModalShown) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/get-ad`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.ad) {
            currentAd = data.ad;
            
            // Show ad after specified delay
            setTimeout(() => {
                showAdModal(currentAd);
            }, currentAd.delay_seconds * 1000);
        }
    } catch (error) {
        console.error('Ad check error:', error);
    }
}

// Show advertisement modal (FIXED)
function showAdModal(ad) {
    if (adModalShown || !ad) return;

    // 🔒 Image URL'ni xavfsiz aniqlash
    const img = ad.image_url || ad.image_path;

    if (!img) {
        console.warn('Ad image not found', ad);
        return;
    }

    // 🔑 To‘liq URL qilib beramiz
    adImage.src = img.startsWith('http')
        ? img
        : location.origin + img;

    adImage.alt = ad.title || 'Reklama';
    adTitle.textContent = ad.title || '';

    if (ad.redirect_url) {
        adLink.href = ad.redirect_url;
    } else {
        adLink.removeAttribute('href');
    }

    adModal.style.display = 'block';
    adModalShown = true;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close ad modal
closeAdBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    adModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    adModalShown = false;
});

// Close modal when clicking outside
adModal.addEventListener('click', function (e) {
    if (e.target === adModal) {
        adModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        adModalShown = false;
    }
});


// ======================
// UTILITY FUNCTIONS
// ======================

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white max-w-sm transform transition-all duration-300 ${
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

// Increment conversion count
function incrementConversionCount() {
    conversionCount++;
    localStorage.setItem('latinify_conversion_count', conversionCount.toString());
    updateConversionCounter();
}

// Update conversion counter display
function updateConversionCounter() {
    conversionCounter.innerHTML = `
        <i class="fas fa-sync-alt mr-1"></i> Konvertatsiyalar: ${conversionCount}
    `;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize tooltips
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'absolute z-50 px-2 py-1 text-sm text-white bg-gray-800 rounded shadow-lg';
            tooltip.textContent = this.dataset.tooltip;
            tooltip.style.top = (this.getBoundingClientRect().top - 35) + 'px';
            tooltip.style.left = (this.getBoundingClientRect().left + this.offsetWidth / 2) + 'px';
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.id = 'tooltip-' + Date.now();
            
            document.body.appendChild(tooltip);
            
            this.addEventListener('mouseleave', function() {
                document.getElementById(tooltip.id)?.remove();
            });
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initTooltips();

});



