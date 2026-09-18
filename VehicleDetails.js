// VehicleDetails.js — with auto-derived license requirements + auth/verify gates
// Availability calendar reads from public vehicleAvailability subcollection
// Contract details rendered on VehicleDetails page (owner + rules + legal + damage)

// ============================================================
// IMAGE HELPERS (handles array, string, or missing)
// ============================================================
const VEHICLE_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">' +
    '<rect fill="#F8F9FA" width="800" height="500"/>' +
    '<rect x="1" y="1" width="798" height="498" fill="none" stroke="#D4AF37" stroke-width="2" stroke-opacity="0.3"/>' +
    '<text fill="#D4AF37" font-family="Inter,sans-serif" font-size="26" font-weight="600" text-anchor="middle" x="400" y="255">No Image Available</text>' +
    '</svg>'
);

function getVehicleImages(vehicle) {
    const imgs = vehicle.images;
    if (!imgs) return [];

    if (typeof imgs === 'string') {
        return imgs.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (Array.isArray(imgs)) {
        return imgs.filter(x => typeof x === 'string' && x.trim() !== '');
    }
    return [];
}

// ============================================================
// LICENSE HELPER — delegates to LicenseRules.js
// ============================================================
function getLicenseInfo(vehicle) {
    if (typeof window.getRequiredLicense === 'function') {
        return window.getRequiredLicense(vehicle);
    }
    const req = vehicle.requiredLicense || [];
    const required = Array.isArray(req)
        ? req
        : (typeof req === 'string' ? req.split(',').map(s => s.trim()).filter(Boolean) : []);
    return { required, reason: '' };
}

// ============================================================
// 1. DOM ELEMENTS
// ============================================================
const loadingState = document.getElementById('loadingState');
const vehicleContent = document.getElementById('vehicleContent');
const notFound = document.getElementById('notFound');

const vehicleName = document.getElementById('vehicleName');
const vehicleCategory = document.getElementById('vehicleCategory');
const vehiclePrice = document.getElementById('vehiclePrice');
const vehicleYear = document.getElementById('vehicleYear');
const vehicleSeats = document.getElementById('vehicleSeats');
const vehicleTransmission = document.getElementById('vehicleTransmission');
const vehicleFuel = document.getElementById('vehicleFuel');
const vehicleLocation = document.getElementById('vehicleLocation');
const vehicleEngine = document.getElementById('vehicleEngine');
const vehicleWeight = document.getElementById('vehicleWeight');
const vehicleGvw = document.getElementById('vehicleGvw');
const vehiclePayload = document.getElementById('vehiclePayload');
const vehicleDescription = document.getElementById('vehicleDescription');
const vehicleFeatures = document.getElementById('vehicleFeatures');
const mainImage = document.getElementById('mainImage').querySelector('img');
const thumbnails = document.getElementById('thumbnails');

const engineSpec = document.getElementById('engineSpec');
const weightSpec = document.getElementById('weightSpec');
const gvwSpec = document.getElementById('gvwSpec');
const payloadSpec = document.getElementById('payloadSpec');

const licenseRequirementEl = document.getElementById('licenseRequirement');
const licenseClassesEl = document.getElementById('licenseClasses');

const favouriteBtn = document.getElementById('favouriteBtn');

// ============================================================
// 2. STATE
// ============================================================
let currentUser = null;
let currentVehicle = null;
let isFavourite = false;
let userData = null;

// ============================================================
// 3. GET VEHICLE ID
// ============================================================
function getVehicleId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// ============================================================
// 4. FETCH VEHICLE
// ============================================================
async function fetchVehicle(vehicleId) {
    try {
        const db = window.db;
        if (!db) return null;
        const docRef = db.collection('vehicles').doc(vehicleId);
        const doc = await docRef.get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        return null;
    }
}

// ============================================================
// 5. RECENTLY VIEWED (localStorage)
// ============================================================
function addRecentlyViewed(vehicleId) {
    try {
        let recent = JSON.parse(localStorage.getItem('vrent_recently_viewed') || '[]');
        recent = recent.filter(id => id !== vehicleId);
        recent.unshift(vehicleId);
        if (recent.length > 10) recent = recent.slice(0, 10);
        localStorage.setItem('vrent_recently_viewed', JSON.stringify(recent));
    } catch (e) { /* ignore */ }
}

// ============================================================
// 5b. HELPERS — mask owner name, status badge
// ============================================================
function maskName(fullName) {
    if (!fullName) return 'Owner';
    const parts = String(fullName).trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return parts[0] + ' ' + parts.slice(1).map(p => p.charAt(0).toUpperCase() + '.').join(' ');
}

function renderStatusBadge(elementId, status) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const s = (status || '').toLowerCase();
    if (s === 'active') {
        el.textContent = 'Active';
        el.className = 'status-value success';
    } else if (s === 'expired') {
        el.textContent = 'Expired';
        el.className = 'status-value danger';
    } else if (s === 'renewing') {
        el.textContent = 'Renewing';
        el.className = 'status-value warning';
    } else {
        el.textContent = 'Not specified';
        el.className = 'status-value neutral';
    }
}

// ============================================================
// 6. RENDER VEHICLE
// ============================================================
function renderVehicle(vehicle) {
    currentVehicle = vehicle;
    loadingState.style.display = 'none';
    vehicleContent.style.display = 'block';

    addRecentlyViewed(vehicle.id);

    const fullName = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
    vehicleName.textContent = fullName || 'Unknown Vehicle';
    vehicleCategory.textContent = vehicle.category || 'Vehicle';
    vehiclePrice.textContent = `RM ${vehicle.pricePerDay || 0}`;

    vehicleYear.textContent = vehicle.year || '-';
    vehicleSeats.textContent = vehicle.seats ? `${vehicle.seats} Seats` : '-';
    vehicleTransmission.textContent = vehicle.transmission || '-';
    vehicleFuel.textContent = vehicle.fuelType || '-';
    vehicleLocation.textContent = vehicle.rentalLocation || vehicle.location || '-';

    // Engine
    if (vehicle.engineCapacity) {
        engineSpec.style.display = 'flex';
        vehicleEngine.textContent = `${vehicle.engineCapacity}`;
    } else {
        engineSpec.style.display = 'none';
    }

    // Operating Weight
    if (vehicle.operatingWeight) {
        weightSpec.style.display = 'flex';
        vehicleWeight.textContent = `${vehicle.operatingWeight}kg`;
    } else {
        weightSpec.style.display = 'none';
    }

    // GVW
    if (vehicle.gvw) {
        gvwSpec.style.display = 'flex';
        vehicleGvw.textContent = `${vehicle.gvw}kg`;
    } else {
        gvwSpec.style.display = 'none';
    }

    // Payload
    if (vehicle.payload) {
        payloadSpec.style.display = 'flex';
        vehiclePayload.textContent = `${vehicle.payload}kg`;
    } else {
        payloadSpec.style.display = 'none';
    }

    // Description
    vehicleDescription.textContent = vehicle.description || 'No description available.';

    // Features
    if (vehicle.features && vehicle.features.length > 0) {
        vehicleFeatures.innerHTML = vehicle.features
            .map(f => `<li><i class="fas fa-check-circle" style="color:#D4AF37;margin-right:8px;"></i> ${f}</li>`)
            .join('');
    } else {
        vehicleFeatures.innerHTML = '<li>No features listed</li>';
    }

    // ============================================================
    // LICENSE REQUIREMENT — auto-derived from vehicle specs
    // ============================================================
    const licenseInfo = getLicenseInfo(vehicle);
    if (licenseInfo.required.length > 0) {
        licenseRequirementEl.style.display = 'flex';
        licenseClassesEl.textContent = licenseInfo.required.join(' or ');

        const labelEl = licenseRequirementEl.querySelector('.license-label');
        if (labelEl && licenseInfo.reason) {
            labelEl.textContent = 'License Required · ' + licenseInfo.reason;
        }
    } else {
        licenseRequirementEl.style.display = 'none';
    }

    // ---- Images ----
    const realImages = getVehicleImages(vehicle);
    const allImages = realImages.length > 0 ? realImages : [VEHICLE_PLACEHOLDER];

    mainImage.src = allImages[0];
    mainImage.alt = fullName;
    mainImage.onerror = function () {
        this.src = VEHICLE_PLACEHOLDER;
    };

    // Thumbnails
    if (realImages.length > 1) {
        thumbnails.innerHTML = realImages.map((img, index) => `
            <img src="${img}" alt="Thumbnail ${index + 1}"
                 class="${index === 0 ? 'active' : ''}"
                 data-index="${index}"
                 onerror="this.style.display='none'" />
        `).join('');

        document.querySelectorAll('.thumbnails img').forEach(thumb => {
            thumb.addEventListener('click', function () {
                document.querySelectorAll('.thumbnails img').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                mainImage.src = this.src;
            });
        });
    } else {
        thumbnails.innerHTML = '';
    }

    // "View All Photos" button
    if (realImages.length > 5) {
        const viewAllBtn = document.createElement('button');
        viewAllBtn.className = 'btn-view-all-photos';
        viewAllBtn.innerHTML = `<i class="fas fa-images"></i> View All Photos (${realImages.length})`;
        viewAllBtn.addEventListener('click', function () {
            openImageGallery(realImages);
        });
        thumbnails.appendChild(viewAllBtn);
    }

    // Favourite
    checkFavouriteStatus(vehicle.id);

    // Availability Calendar
    setTimeout(() => loadAvailabilityCalendar(vehicle.id), 100);

    // Reviews
    loadReviewsPreview(vehicle.id);

    // Book Now
    setupBookNow(vehicle);

    // ✅ Contract details (owner + rules + legal + damage)
    renderContractDetails(vehicle);
}

// ============================================================
// 6b. CONTRACT DETAILS RENDERING
// ============================================================
function renderContractDetails(vehicle) {
    // ---- Owner info (masked) ----
    const ownerInfoCard = document.getElementById('ownerInfoCard');
    const ownerNameDisplay = document.getElementById('ownerNameDisplay');
    const ownerAvatar = document.getElementById('ownerAvatar');
    const ownerVerifiedBadge = document.getElementById('ownerVerifiedBadge');

    if (ownerInfoCard && vehicle.ownerName) {
        const masked = maskName(vehicle.ownerName);
        ownerNameDisplay.textContent = masked;
        ownerAvatar.textContent = masked.charAt(0).toUpperCase();
        ownerVerifiedBadge.style.display = 'inline-flex';
        ownerInfoCard.style.display = 'flex';
    } else if (ownerInfoCard) {
        ownerInfoCard.style.display = 'none';
    }

    // ---- Rental rules chips ----
    const rulesPreview = document.getElementById('rulesPreview');
    const rulesChips = document.getElementById('rulesChips');
    const rules = Array.isArray(vehicle.rentalRules) ? vehicle.rentalRules : [];

    const ALL_RULES = [
        { value: 'Smoking Allowed',  label: 'Smoking',  negLabel: 'No Smoking' },
        { value: 'Pets Allowed',     label: 'Pets',     negLabel: 'No Pets' },
        { value: 'Off-Road Allowed', label: 'Off-Road', negLabel: 'On-Road Only' }
    ];

    if (rulesPreview && rulesChips) {
        rulesChips.innerHTML = ALL_RULES.map(r => {
            const allowed = rules.includes(r.value);
            const cls = allowed ? 'allowed' : 'restricted';
            const text = allowed ? `${r.label} Allowed` : r.negLabel;
            const icon = allowed ? 'fa-check-circle' : 'fa-ban';
            return `<span class="rule-chip ${cls}">
                <i class="fas ${icon}"></i> ${text}
            </span>`;
        }).join('');
        rulesPreview.style.display = 'block';
    }

    // ---- Legal status grid ----
    const legalGrid = document.getElementById('legalStatusGrid');
    const hasAnyLegal = vehicle.insuranceStatus
        || vehicle.roadTaxStatus
        || vehicle.fuelPolicy
        || vehicle.minRentalPeriod;

    if (legalGrid && hasAnyLegal) {
        legalGrid.style.display = 'grid';

        // Insurance
        if (vehicle.insuranceStatus) {
            document.getElementById('insuranceStatusItem').style.display = 'flex';
            renderStatusBadge('insuranceStatusValue', vehicle.insuranceStatus);
        } else {
            document.getElementById('insuranceStatusItem').style.display = 'none';
        }

        // Road tax
        if (vehicle.roadTaxStatus) {
            document.getElementById('roadTaxStatusItem').style.display = 'flex';
            renderStatusBadge('roadTaxStatusValue', vehicle.roadTaxStatus);
        } else {
            document.getElementById('roadTaxStatusItem').style.display = 'none';
        }

        // Fuel policy
        if (vehicle.fuelPolicy) {
            const fuelValue = document.getElementById('fuelPolicyValue');
            fuelValue.textContent = vehicle.fuelPolicy;
            fuelValue.className = 'status-value neutral';
            document.getElementById('fuelPolicyItem').style.display = 'flex';
        } else {
            document.getElementById('fuelPolicyItem').style.display = 'none';
        }

        // Rental period
        const rentalPeriodValue = document.getElementById('rentalPeriodValue');
        const min = vehicle.minRentalPeriod || 1;
        const max = vehicle.maxRentalPeriod || 30;
        rentalPeriodValue.textContent = `${min}–${max} days`;
        rentalPeriodValue.className = 'status-value neutral';
        document.getElementById('rentalPeriodItem').style.display = 'flex';
    } else if (legalGrid) {
        legalGrid.style.display = 'none';
    }

    // ---- Existing damage disclosure ----
    const damageBox = document.getElementById('damageDisclosure');
    const damageText = document.getElementById('damageText');
    if (damageBox && damageText) {
        if (vehicle.existingDamage && vehicle.existingDamage.trim()) {
            damageText.textContent = vehicle.existingDamage;
            damageBox.style.display = 'flex';
        } else {
            damageBox.style.display = 'none';
        }
    }
}

// ============================================================
// 7. FAVOURITE FUNCTIONALITY
// ============================================================
async function checkFavouriteStatus(vehicleId) {
    if (!favouriteBtn) return;
    if (!currentUser) {
        favouriteBtn.style.display = 'none';
        return;
    }
    try {
        const doc = await window.db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            const favourites = data.favourites || [];
            isFavourite = favourites.includes(vehicleId);
            updateFavouriteUI();
        }
    } catch (err) {
        console.error('Error checking favourites:', err);
    }
}

function updateFavouriteUI() {
    if (!favouriteBtn) return;
    if (isFavourite) {
        favouriteBtn.innerHTML = '<i class="fas fa-heart" style="color:#ef4444;"></i>';
        favouriteBtn.title = 'Remove from favourites';
    } else {
        favouriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favouriteBtn.title = 'Add to favourites';
    }
}

if (favouriteBtn) {
    favouriteBtn.addEventListener('click', async function () {
        if (!currentUser) {
            if (typeof window.showAuthGate === 'function') window.showAuthGate();
            return;
        }
        try {
            const db = window.db;
            const uid = currentUser.uid;
            const docRef = db.collection('users').doc(uid);
            const doc = await docRef.get();
            let favourites = doc.exists ? (doc.data().favourites || []) : [];

            if (isFavourite) {
                favourites = favourites.filter(id => id !== currentVehicle.id);
                isFavourite = false;
            } else {
                favourites.push(currentVehicle.id);
                isFavourite = true;
            }
            await docRef.set({ favourites }, { merge: true });
            updateFavouriteUI();
            toast(isFavourite ? 'Added to favourites' : 'Removed from favourites', 'success');
        } catch (err) {
            console.error('Error toggling favourite:', err);
            alert('Could not update favourites. Please try again.');
        }
    });
}

function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    el.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: #11141A; color: #fff;
        padding: 12px 24px; border-radius: 12px;
        border-left: 4px solid ${type === 'success' ? '#22c55e' : '#D4AF37'};
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// ============================================================
// 8. AVAILABILITY CALENDAR
// Public read — uses vehicleAvailability/{vehicleId}/ranges
// ============================================================
async function loadAvailabilityCalendar(vehicleId) {
    const container = document.getElementById('availabilityCalendar');
    if (!container) return;

    container.innerHTML = `<div class="loading-spinner" style="padding:20px 0;">
        <i class="fas fa-spinner fa-spin"></i>
        <p style="font-size:0.85rem;">Loading availability...</p>
    </div>`;

    let bookedRanges = [];

    try {
        const snapshot = await window.db
            .collection('vehicleAvailability')
            .doc(vehicleId)
            .collection('ranges')
            .get();

        snapshot.forEach(doc => {
            const r = doc.data();
            if (r.from && r.to) {
                bookedRanges.push({
                    from: r.from,
                    to: r.to,
                    status: r.status || 'Pending'
                });
            }
        });

    } catch (error) {
        console.warn('Availability subcollection not accessible, showing default:', error.message);
        bookedRanges = [];
    }

    const bookedDates = new Set();
    bookedRanges.forEach(r => {
        const start = new Date(r.from);
        const end = new Date(r.to);
        if (isNaN(start) || isNaN(end)) return;
        const current = new Date(start);
        while (current <= end) {
            bookedDates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let html = `<div class="calendar-grid">`;
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        html += `<div class="calendar-day header">${day}</div>`;
    });

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const isBooked = bookedDates.has(dateStr);
        const isToday = dateStr === todayStr;

        html += `
            <div class="calendar-day ${isBooked ? 'booked' : 'available'} ${isToday ? 'today' : ''}"
                 title="${dateStr} ${isBooked ? 'Booked' : 'Available'}">
                ${date.getDate()}
            </div>
        `;
    }

    html += `</div>`;
    html += `
        <div class="calendar-legend">
            <span class="legend-item"><span class="legend-color available"></span> Available</span>
            <span class="legend-item"><span class="legend-color booked"></span> Booked</span>
            <span class="legend-item"><span class="legend-color today"></span> Today</span>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================================
// 9. REVIEWS PREVIEW (only shows Approved reviews)
// ============================================================
async function loadReviewsPreview(vehicleId) {
    const container = document.getElementById('reviewsPreview');
    if (!container) return;

    try {
        let snapshot;
        try {
            snapshot = await window.db.collection('reviews')
                .where('vehicleId', '==', vehicleId)
                .where('status', '==', 'Approved')
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
        } catch (indexError) {
            if (indexError.code === 'failed-precondition' || (indexError.message || '').includes('index')) {
                snapshot = await window.db.collection('reviews')
                    .where('vehicleId', '==', vehicleId)
                    .where('status', '==', 'Approved')
                    .limit(5)
                    .get();
            } else {
                throw indexError;
            }
        }

        const reviews = [];
        snapshot.forEach(doc => {
            reviews.push({ id: doc.id, ...doc.data() });
        });

        const countSnapshot = await window.db.collection('reviews')
            .where('vehicleId', '==', vehicleId)
            .where('status', '==', 'Approved')
            .get();
        const totalReviews = countSnapshot.size;

        if (reviews.length === 0) {
            container.innerHTML = `
                <div class="review-preview-empty">
                    <i class="fas fa-star" style="opacity:0.3;font-size:1.5rem;display:block;margin-bottom:8px;"></i>
                    No reviews yet. Be the first to review this vehicle!
                </div>
                <a href="Reviews.html?vehicleId=${vehicleId}" class="btn-view-all-reviews">
                    <i class="fas fa-pen"></i> Write a Review
                </a>
            `;
            return;
        }

        let totalRating = 0;
        reviews.forEach(r => totalRating += r.rating || 0);
        const avgRating = (totalRating / reviews.length).toFixed(1);
        const stars = '⭐'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));

        let html = `
            <div class="review-rating-summary">
                <span class="avg-rating">${avgRating}</span>
                <div>
                    <div class="avg-stars">${stars}</div>
                    <span class="review-count">${totalReviews} review${totalReviews > 1 ? 's' : ''}</span>
                </div>
            </div>
        `;

        reviews.slice(0, 3).forEach(review => {
            const reviewStars = '⭐'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));
            const date = review.createdAt
                ? new Date(review.createdAt.seconds * 1000).toLocaleDateString('en-MY')
                : 'N/A';
            const name = review.renterName || 'Anonymous';
            html += `
                <div class="review-preview-card">
                    <div class="review-header">
                        <span class="reviewer">${name}</span>
                        <span class="review-date">${date}</span>
                    </div>
                    <div class="review-stars">${reviewStars}</div>
                    <div class="review-text">${review.text || 'No review text.'}</div>
                </div>
            `;
        });

        html += `
            <a href="Reviews.html?vehicleId=${vehicleId}" class="btn-view-all-reviews" style="margin-top:8px;">
                <i class="fas fa-arrow-right"></i> View All ${totalReviews} Reviews
            </a>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = `
            <p style="color:var(--text-muted);font-size:0.85rem;">Could not load reviews.</p>
            <a href="Reviews.html?vehicleId=${vehicleId}" class="btn-view-all-reviews">
                <i class="fas fa-arrow-right"></i> View Reviews
            </a>
        `;
    }
}

// ============================================================
// 10. IMAGE GALLERY LIGHTBOX
// ============================================================
function openImageGallery(images) {
    if (!images || images.length === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'gallery-lightbox';
    overlay.innerHTML = `
        <div class="gallery-content">
            <button class="gallery-close"><i class="fas fa-times"></i></button>
            <div class="gallery-main">
                <img src="${images[0]}" alt="Gallery image" id="galleryMainImage" />
            </div>
            <div class="gallery-thumbnails">
                ${images.map((img, index) => `
                    <img src="${img}" alt="Image ${index + 1}"
                         class="${index === 0 ? 'active' : ''}"
                         data-index="${index}" />
                `).join('')}
            </div>
            <button class="gallery-nav gallery-prev"><i class="fas fa-chevron-left"></i></button>
            <button class="gallery-nav gallery-next"><i class="fas fa-chevron-right"></i></button>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    let currentIndex = 0;
    const galleryMain = document.getElementById('galleryMainImage');
    const galleryThumbnails = overlay.querySelectorAll('.gallery-thumbnails img');

    function updateGallery(index) {
        currentIndex = index;
        galleryMain.src = images[index];
        galleryThumbnails.forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }

    galleryThumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => updateGallery(index));
    });

    overlay.querySelector('.gallery-prev').addEventListener('click', () => {
        updateGallery((currentIndex - 1 + images.length) % images.length);
    });
    overlay.querySelector('.gallery-next').addEventListener('click', () => {
        updateGallery((currentIndex + 1) % images.length);
    });

    overlay.querySelector('.gallery-close').addEventListener('click', () => {
        overlay.remove();
        document.body.style.overflow = '';
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            document.body.style.overflow = '';
        }
    });

    document.addEventListener('keydown', function handler(e) {
        if (!document.querySelector('.gallery-lightbox')) {
            document.removeEventListener('keydown', handler);
            return;
        }
        if (e.key === 'Escape') {
            overlay.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handler);
        } else if (e.key === 'ArrowLeft') {
            updateGallery((currentIndex - 1 + images.length) % images.length);
        } else if (e.key === 'ArrowRight') {
            updateGallery((currentIndex + 1) % images.length);
        }
    });
}

// ============================================================
// 11. SHOW NOT FOUND
// ============================================================
function showNotFound() {
    loadingState.style.display = 'none';
    notFound.style.display = 'block';
}

// ============================================================
// 12. BOOK NOW — login + verification + license gates
// ============================================================
function setupBookNow(vehicle) {
    const oldBtn = document.getElementById('bookNowBtn');
    if (!oldBtn) return;

    oldBtn.replaceWith(oldBtn.cloneNode(true));
    const bookBtn = document.getElementById('bookNowBtn');

    bookBtn.addEventListener('click', async function () {
        // ---- Gate 1: must be signed in ----
        if (!currentUser) {
            if (typeof window.showAuthGate === 'function') window.showAuthGate();
            return;
        }

        const btn = this;
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking…';

        try {
            // ---- Gate 2: must be verified ----
            const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
            const data = userDoc.exists ? userDoc.data() : {};

            const status = data.verificationStatus || 'Not Submitted';
            const classes = Array.isArray(data.licenseClasses)
                ? data.licenseClasses
                : (data.licenseClasses
                    ? String(data.licenseClasses).split(',').map(s => s.trim()).filter(Boolean)
                    : []);

            if (status !== 'Approved' || classes.length === 0) {
                if (typeof window.showVerifyGate === 'function') window.showVerifyGate();
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                return;
            }

            // ---- Gate 3: licence class match (auto-derived) ----
            const licenseInfo = getLicenseInfo(vehicle);
            const required = licenseInfo.required;

            if (required.length > 0) {
                const hasRequired = required.some(cls => classes.includes(cls));
                if (!hasRequired) {
                    alert(
                        'Your verified licence does not match this vehicle.\n\n' +
                        `Vehicle requires: ${required.join(' or ')}\n` +
                        `Your verified licence: ${classes.join(', ')}\n\n` +
                        'Please verify a matching licence class on your Dashboard.'
                    );
                    btn.disabled = false;
                    btn.innerHTML = originalHTML;
                    return;
                }
            }

            // ---- All checks passed → proceed to Booking ----
            window.location.href = `Booking.html?id=${vehicle.id}`;

        } catch (err) {
            console.error('Eligibility check failed:', err);
            alert('Could not check verification status. Please try again.');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    });
}

// ============================================================
// 13. AUTH STATE LISTENER
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    if (!window.auth) return;

    window.auth.onAuthStateChanged(async function (user) {
        if (user) {
            currentUser = user;
            try {
                const doc = await window.db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    userData = doc.data();
                    currentUser.licenseClasses = userData.licenseClasses || [];
                    currentUser.verificationStatus = userData.verificationStatus || 'Pending';
                } else {
                    currentUser.licenseClasses = [];
                    currentUser.verificationStatus = 'Not Submitted';
                }
            } catch (err) {
                console.error('Error loading user data:', err);
                currentUser.licenseClasses = [];
                currentUser.verificationStatus = 'Not Submitted';
            }
            if (currentVehicle) {
                checkFavouriteStatus(currentVehicle.id);
            }
        } else {
            currentUser = null;
            userData = null;
            if (favouriteBtn) favouriteBtn.style.display = 'none';
        }
    });
});

// ============================================================
// 14. INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
    await new Promise(resolve => setTimeout(resolve, 500));
    const vehicleId = getVehicleId();
    if (!vehicleId) { showNotFound(); return; }
    const vehicle = await fetchVehicle(vehicleId);
    if (!vehicle) { showNotFound(); return; }
    renderVehicle(vehicle);
});