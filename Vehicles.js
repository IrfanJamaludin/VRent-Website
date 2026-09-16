// Vehicles.js - Browse, filter, search vehicles (dynamic filters per category)

// ============================================================
// LICENSE HELPER — delegates to LicenseRules.js
// ============================================================
function getLicenseInfo(vehicle) {
    if (typeof window.getRequiredLicense === 'function') {
        return window.getRequiredLicense(vehicle);
    }
    // Fallback if LicenseRules.js not loaded (legacy support)
    const req = vehicle.requiredLicense || [];
    const required = Array.isArray(req)
        ? req
        : (typeof req === 'string'
            ? req.split(',').map(s => s.trim()).filter(Boolean)
            : []);
    return { required, reason: '' };
}

// ============================================================
// SHARED CONSTANTS
// ============================================================
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">' +
    '<rect fill="#F8F9FA" width="400" height="250"/>' +
    '<rect x="1" y="1" width="398" height="248" fill="none" stroke="#D4AF37" stroke-width="2" stroke-opacity="0.3"/>' +
    '<text fill="#D4AF37" font-family="Inter,sans-serif" font-size="16" font-weight="600" text-anchor="middle" x="200" y="130">No Image</text>' +
    '</svg>'
);

// ============================================================
// DYNAMIC FILTER DATA (brands + seats per category)
// ============================================================
const BRANDS_BY_CATEGORY = {
    'motorcycles':      ['Yamaha', 'Honda', 'Modenas', 'Kawasaki', 'SYM', 'Suzuki'],
    'cars':             ['Perodua', 'Proton', 'Toyota', 'Honda', 'Mazda', 'Nissan', 'Chery', 'BYD', 'BMW'],
    '4x4':              ['Toyota', 'Mitsubishi', 'Suzuki', 'Ford'],
    'trucks':           ['Isuzu', 'Hino', 'Scania', 'Volvo'],
    'heavy-machinery':  ['Caterpillar', 'Komatsu', 'Hitachi', 'SANY', 'Kobelco', 'Genie', 'JLG']
};

const SEATS_BY_CATEGORY = {
    'motorcycles':      [{ value: '1-2', label: '1 - 2 Seats' }],
    'cars':             [
                            { value: '3-4', label: '3 - 4 Seats' },
                            { value: '5-7', label: '5 - 7 Seats' }
                        ],
    '4x4':              [
                            { value: '5-7', label: '5 - 7 Seats' },
                            { value: '8+',  label: '8+ Seats' }
                        ],
    'trucks':           [
                            { value: '1-2', label: '1 - 2 Seats (Single Cab)' },
                            { value: '3-4', label: '3 - 4 Seats (Double Cab)' }
                        ],
    'heavy-machinery':  [{ value: '1-2', label: '1 - 2 Seats (Operator)' }]
};

const ALL_BRANDS = Array.from(new Set(Object.values(BRANDS_BY_CATEGORY).flat())).sort();

const ALL_SEATS = [
    { value: '1-2', label: '1 - 2 Seats' },
    { value: '3-4', label: '3 - 4 Seats' },
    { value: '5-7', label: '5 - 7 Seats' },
    { value: '8+',  label: '8+ Seats' }
];

const LOCATION_OPTIONS = [
    'Selangor', 'Kuala Lumpur', 'Johor', 'Penang', 'Perak', 'Pahang',
    'Kedah', 'Kelantan', 'Terengganu', 'Melaka', 'Negeri Sembilan',
    'Perlis', 'Labuan', 'Putrajaya'
];

// ============================================================
// STATE
// ============================================================
let allVehicles = [];
let filteredVehicles = [];
let selectedCategories = new Set();
let searchQuery = '';

let filters = {
    brand: 'all',
    price: 'all',
    transmission: 'all',
    fuel: 'all',
    seats: 'all',
    location: 'all',
    startDate: null,
    endDate: null,
    purpose: null,
    minRentalPeriod: null
};

// ============================================================
// DOM ELEMENTS
// ============================================================
const vehicleGrid = document.getElementById('vehicleGrid');
const noResults = document.getElementById('noResults');
const loadingSpinner = document.querySelector('.loading-spinner');
const filterAllBtn = document.getElementById('filterAll');

const categoryButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const filterBrand = document.getElementById('filterBrand');
const filterLocation = document.getElementById('filterLocation');
const filterPrice = document.getElementById('filterPrice');
const filterTransmission = document.getElementById('filterTransmission');
const filterFuel = document.getElementById('filterFuel');
const filterSeats = document.getElementById('filterSeats');
const resetFiltersBtn = document.getElementById('resetFilters');

// ============================================================
// DYNAMIC DROPDOWN POPULATION
// ============================================================
function populateBrandFilter() {
    if (!filterBrand) return;
    const previousValue = filterBrand.value;

    let brands;
    if (selectedCategories.size === 0) {
        brands = ALL_BRANDS;
    } else {
        const set = new Set();
        selectedCategories.forEach(cat => {
            (BRANDS_BY_CATEGORY[cat] || []).forEach(b => set.add(b));
        });
        brands = [...set].sort();
    }

    filterBrand.innerHTML = '<option value="all">All Brands</option>';
    brands.forEach(brand => {
        const opt = document.createElement('option');
        opt.value = brand.toLowerCase();
        opt.textContent = brand;
        filterBrand.appendChild(opt);
    });

    const stillValid = Array.from(filterBrand.options).some(o => o.value === previousValue);
    filterBrand.value = stillValid ? previousValue : 'all';
    filters.brand = filterBrand.value;
}

function populateSeatsFilter() {
    if (!filterSeats) return;
    const previousValue = filterSeats.value;

    let seats;
    if (selectedCategories.size === 0) {
        seats = ALL_SEATS;
    } else {
        const seen = new Set();
        const merged = [];
        selectedCategories.forEach(cat => {
            (SEATS_BY_CATEGORY[cat] || []).forEach(s => {
                if (!seen.has(s.value)) {
                    seen.add(s.value);
                    merged.push(s);
                }
            });
        });
        merged.sort((a, b) => parseInt(a.value) - parseInt(b.value));
        seats = merged;
    }

    filterSeats.innerHTML = '<option value="all">All Seats</option>';
    seats.forEach(({ value, label }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        filterSeats.appendChild(opt);
    });

    const stillValid = Array.from(filterSeats.options).some(o => o.value === previousValue);
    filterSeats.value = stillValid ? previousValue : 'all';
    filters.seats = filterSeats.value;
}

// ============================================================
// FETCH VEHICLES
// ============================================================
async function fetchVehicles() {
    try {
        const db = window.db;
        if (!db) return [];

        const snapshot = await db.collection('vehicles')
            .where('availability', '==', 'Available')
            .get();

        if (snapshot.empty) return [];

        let vehicles = [];
        snapshot.forEach(doc => vehicles.push({ id: doc.id, ...doc.data() }));

        // Date-range availability filter
        if (filters.startDate && filters.endDate) {
            const bookedIds = await fetchBookedVehicleIds(filters.startDate, filters.endDate);
            vehicles = vehicles.filter(v => !bookedIds.has(v.id));
        }

        return vehicles;
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        return [];
    }
}

async function fetchBookedVehicleIds(startDate, endDate) {
    try {
        const snapshot = await window.db.collection('bookings')
            .where('pickupDate', '<=', endDate)
            .get();
        const bookedIds = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            const status = data.status || 'Pending';
            if (status !== 'Rejected' && status !== 'Completed') {
                const returnDate = data.returnDate;
                if (returnDate && returnDate >= startDate && data.vehicleId) {
                    bookedIds.add(data.vehicleId);
                }
            }
        });
        return bookedIds;
    } catch (error) {
        console.warn('Booked IDs error:', error);
        return new Set();
    }
}

// ============================================================
// FILTER VEHICLES
// ============================================================
function filterVehicles() {
    let result = [...allVehicles];

    // 1. Location
    if (filters.location !== 'all') {
        const locLower = filters.location.toLowerCase();
        result = result.filter(v => {
            const vLoc = (v.rentalLocation || v.location || '').toLowerCase();
            return vLoc === locLower;
        });
    }

    // 2. Purpose → Category
    if (filters.purpose) {
        const purposeMap = {
            'Travel':     ['cars', 'motorcycles'],
            'Business':   ['cars', 'trucks', 'heavy-machinery'],
            'Adventure':  ['4x4', 'motorcycles'],
            'Family':     ['cars', '4x4'],
            'Work':       ['trucks', 'heavy-machinery', '4x4']
        };
        const allowed = purposeMap[filters.purpose] || [];
        if (allowed.length > 0) {
            result = result.filter(v => allowed.includes((v.category || '').toLowerCase()));
        }
    }

    // 3. Duration (soft filter)
    if (filters.minRentalPeriod && filters.minRentalPeriod > 1) {
        const minDays = filters.minRentalPeriod;
        result = result.filter(v => {
            const vMin = v.minRentalPeriod;
            if (!vMin || vMin <= 1) return true;
            return vMin <= minDays;
        });
    }

    // 4. Category buttons
    if (selectedCategories.size > 0) {
        result = result.filter(v => selectedCategories.has((v.category || '').toLowerCase()));
    }

    // 5. Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(v =>
            (v.brand || '').toLowerCase().includes(q) ||
            (v.model || '').toLowerCase().includes(q)
        );
    }

    // 6. Brand
    if (filters.brand !== 'all') {
        result = result.filter(v => (v.brand || '').toLowerCase() === filters.brand);
    }

    // 7. Price
    if (filters.price !== 'all') {
        if (filters.price === '500+') {
            result = result.filter(v => (v.pricePerDay || 0) >= 500);
        } else {
            const [min, max] = filters.price.split('-').map(Number);
            result = result.filter(v => {
                const p = v.pricePerDay || 0;
                return p >= min && p <= max;
            });
        }
    }

    // 8. Transmission
    if (filters.transmission !== 'all') {
        result = result.filter(v => (v.transmission || '').toLowerCase() === filters.transmission);
    }

    // 9. Fuel
    if (filters.fuel !== 'all') {
        result = result.filter(v => (v.fuelType || '').toLowerCase() === filters.fuel);
    }

    // 10. Seats
    if (filters.seats !== 'all') {
        switch (filters.seats) {
            case '1-2':
                result = result.filter(v => (v.seats || 1) >= 1 && (v.seats || 1) <= 2);
                break;
            case '3-4':
                result = result.filter(v => (v.seats || 0) >= 3 && (v.seats || 0) <= 4);
                break;
            case '5-7':
                result = result.filter(v => (v.seats || 0) >= 5 && (v.seats || 0) <= 7);
                break;
            case '8+':
                result = result.filter(v => (v.seats || 0) >= 8);
                break;
            default:
                if (!isNaN(filters.seats)) {
                    const n = parseInt(filters.seats);
                    result = result.filter(v => (v.seats || 0) >= n);
                }
                break;
        }
    }

    filteredVehicles = result;
    renderVehicles(result);
}

// ============================================================
// RENDER VEHICLES
// ============================================================
function renderVehicles(vehicles) {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (!vehicleGrid) return;

    if (vehicles.length === 0) {
        vehicleGrid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        return;
    }

    if (noResults) noResults.style.display = 'none';

    vehicleGrid.innerHTML = vehicles.map(vehicle => {
        // ---- Auto-derived license badge ----
        const licenseInfo = getLicenseInfo(vehicle);
        const licenseBadge = licenseInfo.required.length > 0
            ? `<span class="vehicle-license-required" title="${licenseInfo.reason || 'License required'}">
                   <i class="fas fa-id-card"></i> ${licenseInfo.required.join(' / ')}
               </span>`
            : '';

        const img = (vehicle.images && vehicle.images[0]) ? vehicle.images[0] : PLACEHOLDER_IMG;
        const vehicleName = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';

        return `
        <div class="vehicle-card">
            <div class="vehicle-image">
                <img src="${img}" alt="${vehicleName}" loading="lazy" />
                <span class="vehicle-year-badge">${vehicle.year || '2024'}</span>
                ${licenseBadge}
            </div>
            <div class="vehicle-info">
                <h3>${vehicleName}</h3>
                <div class="vehicle-brand">${vehicle.category || 'Vehicle'}</div>
                <div class="vehicle-specs">
                    <span><i class="fas fa-users"></i> ${vehicle.seats || 'N/A'} Seats</span>
                    <span><i class="fas fa-cog"></i> ${vehicle.transmission || 'N/A'}</span>
                    <span><i class="fas fa-gas-pump"></i> ${vehicle.fuelType || 'N/A'}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${vehicle.year || 'N/A'}</span>
                </div>
                <div class="vehicle-price">
                    <span class="price">RM ${vehicle.pricePerDay || 0} <span class="per-day">/ day</span></span>
                    <a href="VehicleDetails.html?id=${vehicle.id}" class="btn-view">View Details <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// ============================================================
// LOAD VEHICLES
// ============================================================
async function loadVehicles() {
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    allVehicles = await fetchVehicles();
    filterVehicles();
}

// ============================================================
// CATEGORY BUTTONS
// ============================================================
function updateCategoryButtons() {
    categoryButtons.forEach(btn => btn.classList.remove('active'));

    if (selectedCategories.size === 0) {
        if (filterAllBtn) filterAllBtn.classList.add('active');
        return;
    }
    categoryButtons.forEach(btn => {
        const category = btn.dataset.category;
        if (category !== 'all' && selectedCategories.has(category)) {
            btn.classList.add('active');
        }
    });
}

function toggleCategory(category) {
    if (category === 'all') {
        selectedCategories.clear();
        if (filterAllBtn) filterAllBtn.classList.add('active');
        categoryButtons.forEach(btn => {
            if (btn.dataset.category !== 'all') btn.classList.remove('active');
        });
        populateBrandFilter();
        populateSeatsFilter();
        filterVehicles();
        return;
    }

    if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
    } else {
        selectedCategories.add(category);
    }
    updateCategoryButtons();
    populateBrandFilter();
    populateSeatsFilter();
    filterVehicles();
}

// ============================================================
// APPLY URL FILTERS
// ============================================================
function applyURLFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const brand = urlParams.get('brand');
    const location = urlParams.get('location');
    const price = urlParams.get('price');
    const seats = urlParams.get('seats');
    const startDate = urlParams.get('startDate');
    const endDate = urlParams.get('endDate');
    const purpose = urlParams.get('purpose');
    const duration = urlParams.get('duration');

    // 1. Category FIRST
    if (category) {
        const catMap = ['motorcycles', 'cars', '4x4', 'trucks', 'heavy-machinery'];
        if (catMap.includes(category)) {
            selectedCategories.clear();
            selectedCategories.add(category);
            updateCategoryButtons();
        }
    }

    // 2. Rebuild dropdowns based on category
    populateBrandFilter();
    populateSeatsFilter();

    // 3. Location
    if (location) {
        const locLower = location.toLowerCase();
        const match = Array.from(filterLocation?.options || []).find(
            o => o.value.toLowerCase() === locLower
        );
        if (match) {
            filterLocation.value = match.value;
            filters.location = match.value;
        }
    }

    // 4. Dates
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // 5. Purpose
    if (purpose) {
        const validPurposes = ['Travel', 'Business', 'Adventure', 'Family', 'Work'];
        if (validPurposes.includes(purpose)) {
            filters.purpose = purpose;
        }
    }

    // 6. Duration
    if (duration) {
        const durationMap = { '1': 1, '2-3': 2, '4-7': 4, '7+': 7 };
        if (durationMap[duration]) {
            filters.minRentalPeriod = durationMap[duration];
        }
    }

    // 7. Brand
    if (brand) {
        const brandLower = brand.toLowerCase();
        const match = Array.from(filterBrand?.options || []).find(o => o.value === brandLower);
        if (match) {
            filterBrand.value = brandLower;
            filters.brand = brandLower;
        }
    }

    // 8. Price
    if (price) {
        const priceOptions = ['0-100', '100-200', '200-300', '300-500', '500+'];
        if (priceOptions.includes(price)) {
            filterPrice.value = price;
            filters.price = price;
        }
    }

    // 9. Seats
    if (seats) {
        const match = Array.from(filterSeats?.options || []).find(o => o.value === seats);
        if (match) {
            filterSeats.value = seats;
            filters.seats = seats;
        }
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
const categoryFilterEl = document.querySelector('.category-filter');
let lastCategoryScroll = 0;

if (categoryFilterEl) {
    categoryFilterEl.addEventListener('scroll', () => {
        lastCategoryScroll = Date.now();
    }, { passive: true });
}

categoryButtons.forEach(btn => {
    btn.addEventListener('click', function (e) {
        if (Date.now() - lastCategoryScroll < 150) {
            e.preventDefault();
            return;
        }
        toggleCategory(this.dataset.category);
    });
});

// --- Search (debounced) ---
let searchTimeout;
if (searchInput) {
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = this.value.trim();
            filterVehicles();
        }, 300);
    });
}

// --- Filter selects ---
filterBrand?.addEventListener('change', function () {
    filters.brand = this.value;
    filterVehicles();
});

filterLocation?.addEventListener('change', function () {
    filters.location = this.value;
    filterVehicles();
});

filterPrice?.addEventListener('change', function () {
    filters.price = this.value;
    filterVehicles();
});

filterTransmission?.addEventListener('change', function () {
    filters.transmission = this.value;
    filterVehicles();
});

filterFuel?.addEventListener('change', function () {
    filters.fuel = this.value;
    filterVehicles();
});

filterSeats?.addEventListener('change', function () {
    filters.seats = this.value;
    filterVehicles();
});

// --- Reset ---
resetFiltersBtn?.addEventListener('click', function () {
    selectedCategories.clear();
    updateCategoryButtons();

    if (searchInput) searchInput.value = '';
    searchQuery = '';

    populateBrandFilter();
    populateSeatsFilter();

    if (filterLocation) filterLocation.value = 'all';
    if (filterPrice) filterPrice.value = 'all';
    if (filterTransmission) filterTransmission.value = 'all';
    if (filterFuel) filterFuel.value = 'all';

    filters = {
        brand: 'all',
        price: 'all',
        transmission: 'all',
        fuel: 'all',
        seats: 'all',
        location: 'all',
        startDate: null,
        endDate: null,
        purpose: null,
        minRentalPeriod: null
    };

    filterVehicles();
});

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
    populateBrandFilter();
    populateSeatsFilter();

    applyURLFilters();

    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    await loadVehicles();
    if (loadingSpinner) loadingSpinner.style.display = 'none';
});