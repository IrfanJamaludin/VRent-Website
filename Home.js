// Home.js - Vehicle discovery & smart recommendations

// ============================================================
// 1. CONSTANTS
// ============================================================
const PLACEHOLDER_IMG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'>" +
        "<rect fill='#F8F9FA' width='400' height='250'/>" +
        "<text x='50%' y='50%' fill='#D4AF37' font-family='Inter,sans-serif' font-size='16' text-anchor='middle' dominant-baseline='middle'>No Image</text>" +
        "</svg>"
    );

const MAX_RECENTLY_VIEWED = 10;
const RECENTLY_VIEWED_KEY = 'vrent_recently_viewed';
const AVAILABLE_STATUSES = ['approved', 'confirmed', 'active'];
const BOOKING_VALID_STATUSES = ['approved', 'confirmed', 'active', 'completed'];

// ============================================================
// 2. AUTH (cached)
// ============================================================
let currentUser = null;
let currentUserData = null;
let _authPromise = null;

function waitForAuth() {
    if (_authPromise) return _authPromise;
    _authPromise = new Promise((resolve) => {
        if (!window.auth) { resolve(null); return; }
        const unsub = window.auth.onAuthStateChanged(async (user) => {
            unsub();
            if (user) {
                currentUser = user;
                try {
                    const doc = await window.db.collection('users').doc(user.uid).get();
                    if (doc.exists) {
                        currentUserData = doc.data();
                    } else {
                        // Fallback — create minimal profile doc
                        const newData = {
                            email: user.email || '',
                            username: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            role: 'user',
                            recentlyViewed: []
                        };
                        await window.db.collection('users').doc(user.uid).set(newData);
                        currentUserData = newData;
                    }
                } catch (e) {
                    console.error('User doc error:', e);
                }
                resolve(user);
            } else {
                currentUser = null;
                currentUserData = null;
                resolve(null);
            }
        });
    });
    return _authPromise;
}

// ============================================================
// 3. RECENTLY VIEWED (localStorage-first, Firestore-synced)
// ============================================================
function getRecentlyViewedLocal() {
    try {
        const data = localStorage.getItem(RECENTLY_VIEWED_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}

function setRecentlyViewedLocal(ids) {
    try {
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids.slice(0, MAX_RECENTLY_VIEWED)));
    } catch (e) {}
}

async function getRecentlyViewed() {
    const localIds = getRecentlyViewedLocal();
    const user = await waitForAuth();
    let firestoreIds = [];

    if (user) {
        try {
            // Try server first, fall back to cache if offline
            let doc;
            try {
                doc = await window.db.collection('users').doc(user.uid).get({ source: 'server' });
            } catch (serverErr) {
                doc = await window.db.collection('users').doc(user.uid).get({ source: 'cache' });
            }
            if (doc && doc.exists) {
                firestoreIds = doc.data().recentlyViewed || [];
            }
        } catch (e) {
            // Silent — local storage is the fallback
        }
    }

    // Merge: local first (most recent), then firestore entries not already in list
    const merged = [...localIds];
    for (const id of firestoreIds) {
        if (!merged.includes(id)) merged.push(id);
    }
    return merged.slice(0, MAX_RECENTLY_VIEWED);
}

async function addRecentlyViewed(vehicleId) {
    // 1. Sync localStorage — immediate
    let recent = getRecentlyViewedLocal();
    recent = recent.filter(id => id !== vehicleId);
    recent.unshift(vehicleId);
    if (recent.length > MAX_RECENTLY_VIEWED) recent = recent.slice(0, MAX_RECENTLY_VIEWED);
    setRecentlyViewedLocal(recent);

    // 2. Fire-and-forget Firestore sync
    const user = await waitForAuth();
    if (!user) return;
    try {
        await window.db.collection('users').doc(user.uid).set(
            { recentlyViewed: recent },
            { merge: true }
        );
    } catch (e) {
        // Silent — localStorage already saved
    }
}

// ============================================================
// 4. VEHICLE CLICK — navigate immediately, save in background
// ============================================================
window.handleVehicleClick = function (vehicleId) {
    if (!vehicleId) return;
    // Save in background — do NOT await
    addRecentlyViewed(vehicleId).catch(() => {});
    // Navigate immediately — instant feedback
    window.location.href = `VehicleDetails.html?id=${vehicleId}`;
};

// ============================================================
// 5. VEHICLE DATA FETCHERS
// ============================================================
async function fetchVehiclesByCategory(category, limit = 6) {
    try {
        if (!window.db) return [];
        let query = window.db.collection('vehicles')
            .where('approvalStatus', '==', 'Approved')
            .where('availability', '==', 'Available');
        if (category) query = query.where('category', '==', category);
        const snapshot = await query.limit(limit).get();
        const vehicles = [];
        snapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
        return vehicles;
    } catch (e) {
        console.error('fetchVehiclesByCategory:', e);
        return [];
    }
}

async function getBestDeals(limit = 6) {
    try {
        if (!window.db) return [];
        const snapshot = await window.db.collection('vehicles')
            .where('approvalStatus', '==', 'Approved')
            .where('availability', '==', 'Available')
            .get();
        const vehicles = [];
        snapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));
        if (vehicles.length === 0) return [];

        // Group by category, score by discount vs category average
        const byCategory = {};
        vehicles.forEach(v => {
            const cat = v.category || 'other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(v);
        });

        const scored = [];
        for (const [cat, list] of Object.entries(byCategory)) {
            const prices = list.map(v => v.pricePerDay || 0).filter(p => p > 0);
            if (prices.length === 0) continue;
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            list.forEach(v => {
                const price = v.pricePerDay || 0;
                if (price <= 0) return;
                const discount = ((avg - price) / avg) * 100;
                scored.push({ ...v, _discount: discount, _category: cat });
            });
        }
        scored.sort((a, b) => b._discount - a._discount);

        // Pick one best deal per category first (diversity)
        const seen = new Set();
        const diverse = [];
        for (const v of scored) {
            if (!seen.has(v._category)) {
                seen.add(v._category);
                diverse.push(v);
            }
            if (diverse.length >= limit) break;
        }
        // Top up if we still need more
        if (diverse.length < limit) {
            for (const v of scored) {
                if (!diverse.some(d => d.id === v.id)) {
                    diverse.push(v);
                    if (diverse.length >= limit) break;
                }
            }
        }
        return diverse;
    } catch (e) {
        console.error('getBestDeals:', e);
        return [];
    }
}

async function getPersonalizedRecommendations(limit = 6) {
    if (!currentUser || !currentUserData) return [];
    try {
        const snapshot = await window.db.collection('bookings')
            .where('renterId', '==', currentUser.uid)
            .get();

        const categoryCount = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            if (!BOOKING_VALID_STATUSES.includes(status)) return;
            const category = data.vehicleCategory || data.category;
            if (category) categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        let topCategory = null, maxCount = 0;
        for (const [cat, count] of Object.entries(categoryCount)) {
            if (count > maxCount) { maxCount = count; topCategory = cat; }
        }
        if (!topCategory) return [];
        return await fetchVehiclesByCategory(topCategory, limit);
    } catch (e) {
        return [];
    }
}

// ============================================================
// 6. HELPERS
// ============================================================
function getVehicleImage(vehicle) {
    if (vehicle.images && vehicle.images.length > 0 && vehicle.images[0]) {
        return vehicle.images[0];
    }
    return PLACEHOLDER_IMG;
}

function getVehicleName(vehicle) {
    return `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';
}

function getVehicleLocation(vehicle) {
    return vehicle.rentalLocation || vehicle.location || 'Malaysia';
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================
// 7. RENDER VEHICLE CARDS
//    Click handling done once via delegation at init — NOT here.
// ============================================================
function renderVehicleCards(containerId, vehicles, title = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isRecentlyViewed = title === 'Recently Viewed';

    // Empty state
    if (!vehicles || vehicles.length === 0) {
        let message = 'No vehicles available right now.';
        let icon = 'fa-car';
        let ctaLink = '', ctaText = '';

        if (isRecentlyViewed) {
            if (!currentUser) {
                message = 'Log in to see your recently viewed vehicles.';
                icon = 'fa-sign-in-alt';
                ctaLink = 'LogIn.html';
                ctaText = 'Log In →';
            } else {
                message = "You haven't viewed any vehicles yet.";
                icon = 'fa-eye-slash';
                ctaLink = 'Vehicles.html';
                ctaText = 'Browse Vehicles →';
            }
        }

        container.innerHTML = `
            <div class="smart-empty-state">
                <i class="fas ${icon}"></i>
                <p>${escapeHtml(message)}</p>
                ${ctaLink ? `<a href="${ctaLink}" class="smart-empty-cta">${ctaText}</a>` : ''}
            </div>
        `;
        return;
    }

    // Section header
    let html = '';
    if (title) {
        const icons = {
            'For You': 'fa-wand-magic-sparkles',
            'Best Deals': 'fa-tags',
            'Recently Viewed': 'fa-history'
        };
        const icon = icons[title] || 'fa-star';
        html += `
            <div class="section-header">
                <h3><i class="fas ${icon}" style="color:#D4AF37;"></i> ${escapeHtml(title)}</h3>
            </div>
        `;
    }

    // Cards
    html += `<div class="smart-vehicle-grid-horizontal">`;
    vehicles.forEach(vehicle => {
        const img = getVehicleImage(vehicle);
        const name = getVehicleName(vehicle);
        const price = vehicle.pricePerDay || 0;
        const category = vehicle.category || 'N/A';
        const location = getVehicleLocation(vehicle);
        const seats = vehicle.seats || 'N/A';
        const discountBadge = (vehicle._discount && vehicle._discount > 0)
            ? `<span class="smart-vehicle-discount-badge">${vehicle._discount.toFixed(0)}% below avg</span>`
            : '';

        html += `
            <div class="smart-vehicle-card" data-id="${vehicle.id}" role="button" tabindex="0">
                <div class="smart-vehicle-image" style="background-image:url('${escapeHtml(img)}');">
                    <span class="smart-vehicle-price-badge">RM ${price} <small>/ day</small></span>
                    ${discountBadge}
                </div>
                <div class="smart-vehicle-info">
                    <h4>${escapeHtml(name)}</h4>
                    <div class="smart-vehicle-meta">
                        <span><i class="fas fa-tag"></i> ${escapeHtml(category)}</span>
                        <span><i class="fas fa-map-pin"></i> ${escapeHtml(location)}</span>
                        <span><i class="fas fa-users"></i> ${escapeHtml(seats)} seats</span>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;

    container.innerHTML = html;
}

// ============================================================
// 8. POPULAR VEHICLES
// ============================================================
async function loadPopularVehicles() {
    const grid = document.getElementById('popularVehiclesGrid');
    if (!grid) return;

    try {
        if (!window.db) {
            grid.innerHTML = '<p class="empty-msg">Could not load vehicles.</p>';
            return;
        }
        const snapshot = await window.db.collection('vehicles')
            .where('approvalStatus', '==', 'Approved')
            .where('availability', '==', 'Available')
            .limit(6)
            .get();

        if (snapshot.empty) {
            grid.innerHTML = '<p class="empty-msg">No vehicles available yet.</p>';
            return;
        }

        const vehicles = [];
        snapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

        grid.innerHTML = vehicles.map(vehicle => {
            const img = getVehicleImage(vehicle);
            const name = getVehicleName(vehicle);
            const price = vehicle.pricePerDay || 0;
            const seats = vehicle.seats || 'N/A';
            const transmission = vehicle.transmission || 'N/A';
            const fuel = vehicle.fuelType || 'N/A';

            return `
                <div class="vehicle-card" data-id="${vehicle.id}" role="button" tabindex="0">
                    <img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" loading="lazy" />
                    <div class="vehicle-info">
                        <h3>${escapeHtml(name)}</h3>
                        <div class="vehicle-specs">
                            <span><i class="fas fa-users"></i> ${escapeHtml(seats)} Seats</span>
                            <span><i class="fas fa-cog"></i> ${escapeHtml(transmission)}</span>
                            <span><i class="fas fa-gas-pump"></i> ${escapeHtml(fuel)}</span>
                        </div>
                        <div class="vehicle-price">
                            <span class="price">RM ${price} <span class="per-day">/ day</span></span>
                            <a href="VehicleDetails.html?id=${vehicle.id}" class="btn-view" data-id="${vehicle.id}">
                                View <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Popular vehicles error:', error);
        grid.innerHTML = '<p class="empty-msg">Could not load vehicles.</p>';
    }
}

// ============================================================
// 9. SMART SECTIONS
// ============================================================
async function loadSmartSections() {
    const user = await waitForAuth();

    // ---- 1. Recently Viewed ----
    const recentIds = await getRecentlyViewed();
    const recentSection = document.getElementById('recentlyViewedSection');

    if (recentIds.length > 0) {
        // Batch-read all recently viewed docs
        const docs = await Promise.all(
            recentIds.slice(0, 6).map(id =>
                window.db.collection('vehicles').doc(id).get().catch(() => null)
            )
        );
        const vehicles = [];
        docs.forEach(doc => {
            if (!doc || !doc.exists) return;
            const data = doc.data();
            if (data.approvalStatus !== 'Approved') return;
            if (data.availability !== 'Available') return;
            vehicles.push({ id: doc.id, ...data });
        });

        if (vehicles.length > 0) {
            if (recentSection) recentSection.style.display = 'block';
            renderVehicleCards('recentlyViewedContainer', vehicles, 'Recently Viewed');
        } else {
            if (recentSection) recentSection.style.display = 'none';
        }
    } else {
        if (recentSection) recentSection.style.display = 'none';
    }

    // ---- 2. For You ----
    const forYouSection = document.getElementById('forYouSection');
    if (user && currentUserData) {
        const personal = await getPersonalizedRecommendations(6);
        if (personal.length > 0) {
            if (forYouSection) forYouSection.style.display = 'block';
            renderVehicleCards('forYouContainer', personal, 'For You');
        } else {
            if (forYouSection) forYouSection.style.display = 'none';
        }
    } else {
        if (forYouSection) forYouSection.style.display = 'none';
    }

    // ---- 3. Best Deals ----
    const deals = await getBestDeals(6);
    const dealsSection = document.getElementById('bestDealsSection');
    if (deals.length > 0) {
        if (dealsSection) dealsSection.style.display = 'block';
        renderVehicleCards('bestDealsContainer', deals, 'Best Deals');
    } else {
        if (dealsSection) dealsSection.style.display = 'none';
    }
}

// ============================================================
// 10. HERO SEARCH
// ============================================================
function setupHeroSearch() {
    const form = document.getElementById('searchForm');
    if (!form) return;

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    // Sync endDate.min when startDate changes
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', () => {
            if (startDateInput.value) {
                endDateInput.min = startDateInput.value;
                if (endDateInput.value && endDateInput.value < startDateInput.value) {
                    endDateInput.value = startDateInput.value;
                }
            }
        });
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const startDate = startDateInput?.value || '';
        const endDate = endDateInput?.value || '';

        // Validate date range
        if (startDate && endDate && endDate < startDate) {
            alert('End date must be on or after the start date.');
            return;
        }

        const startTime = document.getElementById('startTime')?.value || '';
        const endTime = document.getElementById('endTime')?.value || '';
        const location = document.getElementById('location')?.value || '';

        let url = 'Vehicles.html?';
        const params = [];
        if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
        if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
        if (startTime) params.push(`startTime=${encodeURIComponent(startTime)}`);
        if (endTime) params.push(`endTime=${encodeURIComponent(endTime)}`);
        if (location) params.push(`location=${encodeURIComponent(location)}`);

        window.location.href = params.length ? url + params.join('&') : 'Vehicles.html';
    });
}

// ============================================================
// 11. RECOMMENDATION FORM
// ============================================================
function setupRecommendationForm() {
    const form = document.getElementById('recommendationForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const budget = document.getElementById('budget').value;
        const passengers = document.getElementById('passengers').value;
        const purpose = document.getElementById('purpose').value;
        const duration = document.getElementById('duration').value;

        if (!budget || !passengers || !purpose || !duration) {
            alert('Please fill in all fields.');
            return;
        }

        let url = 'Vehicles.html?';
        const params = [
            `price=${encodeURIComponent(budget)}`,
            `seats=${encodeURIComponent(passengers)}`,
            `purpose=${encodeURIComponent(purpose)}`,
            `duration=${encodeURIComponent(duration)}`
        ];
        window.location.href = url + params.join('&');
    });
}

// ============================================================
// 12. DELEGATED CLICK HANDLING (bound once, not per-render)
// ============================================================
function setupVehicleCardClicks() {
    document.body.addEventListener('click', function (e) {
        // Ignore clicks on the "View" link — it has its own navigation
        if (e.target.closest('.btn-view')) return;

        const card = e.target.closest('.smart-vehicle-card, .vehicle-card');
        if (!card) return;

        const id = card.dataset.id;
        if (!id) return;

        e.preventDefault();
        window.handleVehicleClick(id);
    });

    // Keyboard support (Enter/Space on focused card)
    document.body.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.smart-vehicle-card, .vehicle-card');
        if (!card) return;
        const id = card.dataset.id;
        if (!id) return;
        e.preventDefault();
        window.handleVehicleClick(id);
    });
}

// ============================================================
// 13. SMOOTH SCROLL FOR #ANCHOR LINKS
// ============================================================
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId.length <= 1) return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ============================================================
// 14. INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
    // Set default dates (today → tomorrow)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const toISO = d => d.toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput) {
        startDateInput.value = toISO(today);
        startDateInput.min = toISO(today);
    }
    if (endDateInput) {
        endDateInput.value = toISO(tomorrow);
        endDateInput.min = toISO(tomorrow);
    }

    // Wire up all interactions
    setupHeroSearch();
    setupRecommendationForm();
    setupVehicleCardClicks();
    setupSmoothScroll();

    // Load content
    await Promise.all([
        loadPopularVehicles(),
        loadSmartSections()
    ]);
});