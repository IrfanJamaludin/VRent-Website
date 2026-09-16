// Categories.js

// ============================================================
// 1. CATEGORY CONFIGURATION
// ============================================================
const categoryConfig = {
    'motorcycles':     { label: 'Motorcycles',      order: 1 },
    'cars':            { label: 'Cars',             order: 2 },
    '4x4':             { label: '4x4',              order: 3 },
    'trucks':          { label: 'Trucks',           order: 4 },
    'heavy-machinery': { label: 'Heavy Machinery',  order: 5 }
};

const categoryOrder = ['motorcycles', 'cars', '4x4', 'trucks', 'heavy-machinery'];

// ============================================================
// 2. BRAND LOGO MAPPING (Cloudinary)
// ------------------------------------------------------------
// Each entry is just the full Cloudinary URL. If a brand
// isn't listed here, the VR placeholder renders instead.
// ============================================================
const brandLogos = {
    // ── Motorcycles ──────────────────────────────────────────
    'yamaha':          'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444677/yamaha-gakki.svg',
    'honda':           'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444416/honda-logo-4.svg',
    'modenas':         'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444906/jxothyp57uxza2eznjb8.png',
    'kawasaki':        'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444554/kawasaki-logo.svg',
    'sym':             'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444943/apfh1kwe6pquthassqp8.png',
    'suzuki':          'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444665/suzuki-12.svg',

    // ── Cars ─────────────────────────────────────────────────
    'perodua':         'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444856/jl2ywffwhlpdchcqqp8g.png',
    'proton':          'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444793/proton-logo.svg',
    'toyota':          'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444364/toyota-7.svg',
    'mazda':           'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444614/mazda-2.svg',
    'nissan':          'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444598/nissan-6.svg',
    'chery':           'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444500/chery-3.svg',
    'byd':             'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444789/byd-auto-logo-1.svg',
    'bmw':             'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444467/bmw-7.svg',
    'mitsubishi':      'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444674/mitsubishi.svg',
    'ford':            'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444698/ford-logo-flat.svg',
    'isuzu':           'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444767/isuzu-2.svg',

    // ── Trucks ───────────────────────────────────────────────
    'hino':            'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444551/hino.svg',
    'mitsubishi-fuso': 'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444674/mitsubishi.svg', // reuses Mitsubishi logo
    'sinotruk':        'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445069/t9uukmci6zqhihf1s72c.png',
    'foton':           'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445169/zhaaf0pkvt1hr6geaokc.png',
    'scania':          'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445011/efwbt3cbsitsjujouctd.png',
    'volvo':           'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789444738/volvo.svg',

    // ── Heavy Machinery ──────────────────────────────────────
    'caterpillar':     'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445229/caterpillar-2.svg',
    'komatsu':         'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445341/akyg73qspfdou70iyeky.png',
    'hitachi':         'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445288/hitachi-2.svg',
    'sany':            'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445373/wcq9joff18d9ixvcwdxa.png',
    'kobelco':         'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445376/kobelco-logo-7.svg',
    'genie':           'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445371/p0lprrvqtivzzb7a5ggl.png',
    'jlg':             'https://res.cloudinary.com/ggxrhjdr/image/upload/v1789445379/jlg.svg'
};

// ============================================================
// 3. INLINE SVG PLACEHOLDER
// ============================================================
const BRAND_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        '<rect width="200" height="200" fill="#11141A"/>' +
        '<circle cx="100" cy="100" r="60" fill="none" stroke="#D4AF37" stroke-width="3"/>' +
        '<text x="100" y="118" fill="#D4AF37" font-family="Inter,sans-serif" ' +
            'font-size="60" font-weight="700" text-anchor="middle">VR</text>' +
    '</svg>'
);

// ============================================================
// 4. HELPERS
// ============================================================
function formatBrandName(brand) {
    return brand.split('-').map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function getBrandLogo(brand) {
    return brandLogos[brand] || BRAND_PLACEHOLDER;
}

// ============================================================
// 5. USER GREETING & QUICK ACTIONS
// ============================================================
let currentUser = null;
let currentUserData = null;

async function getUser() {
    const greeting = document.getElementById('userGreeting');
    const actions  = document.getElementById('quickActions');

    if (!greeting && !actions) return null;

    return new Promise(function (resolve) {
        if (!window.auth) return resolve(null);

        const unsubscribe = window.auth.onAuthStateChanged(async function (user) {
            unsubscribe();
            if (!user) return resolve(null);

            currentUser = user;
            try {
                const doc = await window.db.collection('users').doc(user.uid).get();
                if (doc.exists) currentUserData = doc.data();
            } catch (err) {
                // Silent fail
            }
            resolve(currentUser);
        });
    });
}

function updateUserGreeting() {
    const greeting = document.getElementById('userGreeting');
    const actions  = document.getElementById('quickActions');

    const isLoggedIn = currentUser && currentUserData;

    if (greeting) {
        if (isLoggedIn) {
            const username = currentUserData.username || currentUserData.firstName || 'User';
            greeting.innerHTML = 'Welcome back, <strong>' + username + '</strong>! 👋';
            greeting.style.display = 'block';
        } else {
            greeting.innerHTML = '';
            greeting.style.display = 'none';
        }
    }

    if (actions) {
        actions.style.display = isLoggedIn ? 'flex' : 'none';
    }
}

// ============================================================
// 6. LOAD CATEGORIES
// ============================================================
async function loadCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    try {
        const db = window.db;
        if (!db) {
            container.innerHTML = '<p class="error">Firebase not initialized.</p>';
            return;
        }

        const snapshot = await db.collection('vehicles').get();

        if (snapshot.empty) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<i class="fas fa-car"></i>' +
                    '<p>No vehicles found. Please add vehicles to the database.</p>' +
                '</div>';
            return;
        }

        const categoryGroups = {};
        categoryOrder.forEach(function (cat) {
            categoryGroups[cat] = {
                label: categoryConfig[cat] ? categoryConfig[cat].label : cat,
                brands: new Set()
            };
        });

        snapshot.forEach(function (doc) {
            const vehicle  = doc.data();
            const category = vehicle.category;
            if (category && categoryGroups[category]) {
                const brand = (vehicle.brand || 'unknown').toLowerCase();
                categoryGroups[category].brands.add(brand);
            }
        });

        let html = '';
        let hasContent = false;

        categoryOrder.forEach(function (cat) {
            const group  = categoryGroups[cat];
            const brands = Array.from(group.brands).sort();
            if (brands.length === 0) return;

            hasContent = true;

            html += '<div class="category-section" id="' + cat + '">';
            html +=   '<h2 class="category-title">' + group.label + '</h2>';
            html +=   '<div class="brand-grid">';

            brands.forEach(function (brand) {
                const logoUrl     = getBrandLogo(brand);
                const displayName = formatBrandName(brand);

                const href = 'Vehicles.html?brand=' + encodeURIComponent(brand) +
                             '&category=' + encodeURIComponent(cat);

                html +=
                    '<a href="' + href + '" class="brand-card" data-brand="' + brand + '">' +
                        '<div class="brand-logo">' +
                            '<img ' +
                                'src="' + logoUrl + '" ' +
                                'data-fallback="' + BRAND_PLACEHOLDER + '" ' +
                                'alt="' + displayName + '" ' +
                                'loading="lazy" ' +
                                'decoding="async" ' +
                            '/>' +
                        '</div>' +
                        '<span class="brand-name">' + displayName + '</span>' +
                    '</a>';
            });

            html +=   '</div>';
            html += '</div>';
        });

        if (!hasContent) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<i class="fas fa-tags"></i>' +
                    '<p>No categories available.</p>' +
                '</div>';
            return;
        }

        container.innerHTML = html;

        // Swap broken images for the placeholder (capture phase —
        // image error events do not bubble).
        if (!container.dataset.errorHandlerAttached) {
            container.dataset.errorHandlerAttached = 'true';
            container.addEventListener('error', function (e) {
                const img = e.target;
                if (!img || img.tagName !== 'IMG') return;
                if (img.dataset.fallbackApplied) return;
                img.dataset.fallbackApplied = 'true';
                img.src = img.dataset.fallback;
            }, true);
        }

        scrollToHashIfPresent();

    } catch (error) {
        container.innerHTML =
            '<p class="error">Error loading categories: ' +
            (error && error.message ? error.message : 'Unknown error') +
            '</p>';
    }
}

// ============================================================
// 7. SEARCH (redirects to Vehicles.html)
// ============================================================
function setupCategoriesSearch() {
    const form = document.getElementById('categoriesSearch');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = document.getElementById('categorySearchInput');
        const query = input ? input.value.trim() : '';

        if (query) {
            window.location.href = 'Vehicles.html?search=' + encodeURIComponent(query);
        } else {
            window.location.href = 'Vehicles.html';
        }
    });
}

// ============================================================
// 8. HASH SCROLL (sticky-header aware, mobile-friendly)
// ============================================================
function getStickyHeaderOffset() {
    const header = document.querySelector('.header');
    if (!header) return 0;
    return header.offsetHeight + 12;
}

function scrollToHashIfPresent() {
    const hash = window.location.hash.replace('#', '');
    if (!hash || !categoryConfig[hash]) return;

    setTimeout(function () {
        const section = document.getElementById(hash);
        if (!section) return;

        const offset = getStickyHeaderOffset();
        const top    = section.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({ top: top, behavior: 'smooth' });
    }, 300);
}

function handleHashChange() {
    scrollToHashIfPresent();
}

// ============================================================
// 9. INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
    await getUser();
    updateUserGreeting();

    await loadCategories();
    setupCategoriesSearch();

    window.addEventListener('hashchange', handleHashChange);
});