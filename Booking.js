// Booking.js - Vehicle booking with verified licence check
// + Public availability calendar (vehicleAvailability subcollection)
// + Owner snapshot (fixes missing owner info in notifications)
// + State-to-state delivery rates + Machinery weight-based delivery
// + 15% Service Fee + 20% Refundable Deposit + Handover confirmation
// Peninsular Malaysia only

// ============================================================
// 1. MACHINERY DELIVERY TIERS (heavy machinery only)
// ============================================================
const MACHINERY_DELIVERY_TIERS = [
    { maxKg: 5000,     fee: 300 },
    { maxKg: 10000,    fee: 600 },
    { maxKg: 20000,    fee: 1200 },
    { maxKg: 30000,    fee: 1800 },
    { maxKg: 50000,    fee: 2500 },
    { maxKg: Infinity, fee: 3500 }
];

function getMachineryDeliveryFee(operatingWeightKg) {
    const w = Number(operatingWeightKg) || 0;
    if (w <= 0) return 0;
    const tier = MACHINERY_DELIVERY_TIERS.find(t => w <= t.maxKg);
    return tier ? tier.fee : 0;
}

function shouldChargeDelivery(vehicle) {
    if (!vehicle) return false;
    if (vehicle.category !== 'heavy-machinery') return false;
    return vehicle.deliveredByVRent === true;
}

// ============================================================
// 2. PRICING CONSTANTS
// ============================================================
const SERVICE_FEE_RATE = 0.15;         // 15% charged to customer (V-Rent revenue)
const SECURITY_DEPOSIT_RATE = 0.20;    // 20% of rental subtotal (refundable, held at booking)
const INSURANCE_FEES = {               // RM per day
    Basic:   0,
    Medium:  30,
    Premium: 50
};

// Vehicle type multipliers applied to base state-to-state rate
const VEHICLE_TYPE_MULTIPLIERS = {
    'motorcycles':     0.6,
    'cars':            1.0,
    '4x4':             1.2,
    'trucks':          1.8,
    'heavy-machinery': 3.0
};

// ============================================================
// 3. AVAILABILITY — reads from PUBLIC vehicleAvailability subcollection
// ============================================================
const BLOCKING_STATUSES = ['Pending', 'Approved', 'Paid', 'Active'];

/**
 * Reads block-out ranges from the PUBLIC vehicleAvailability subcollection.
 * This makes the availability check work for guests + signed-in users without
 * exposing the private `bookings` collection (which contains renter PII).
 */
async function findConflicts(vehicleId, startDate, endDate) {
    if (!vehicleId || !startDate || !endDate) return [];
    try {
        const snap = await window.db
            .collection('vehicleAvailability')
            .doc(vehicleId)
            .collection('ranges')
            .get();

        const conflicts = [];
        snap.forEach(doc => {
            const r = doc.data();
            if (!BLOCKING_STATUSES.includes(r.status)) return;
            // Overlap test
            if (r.from <= endDate && r.to >= startDate) {
                conflicts.push({ id: doc.id, ...r });
            }
        });
        return conflicts;
    } catch (err) {
        console.error('Availability check failed:', err);
        return [];
    }
}

/**
 * Writes the date range into the public vehicleAvailability subcollection.
 * Called right after a successful booking.
 */
async function mirrorAvailabilityRange(bookingId, vehicleId, from, to, status, renterId, ownerId) {
    if (!bookingId || !vehicleId || !from || !to) return;
    try {
        await window.db
            .collection('vehicleAvailability')
            .doc(vehicleId)
            .collection('ranges')
            .doc(bookingId)
            .set({
                from,
                to,
                status: status || 'Pending',
                bookingId,
                renterId: renterId || null,
                ownerId: ownerId || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    } catch (err) {
        console.warn('Could not mirror availability range:', err);
    }
}

// ============================================================
// 4. DELIVERY RATES (state-to-state, admin-controlled)
// ============================================================
let cachedDeliveryRates = null;

async function loadDeliveryRates() {
    if (cachedDeliveryRates) return cachedDeliveryRates;
    try {
        const snap = await window.db.collection('deliveryRates')
            .where('active', '==', true)
            .get();
        cachedDeliveryRates = [];
        snap.forEach(doc => cachedDeliveryRates.push({ id: doc.id, ...doc.data() }));
        return cachedDeliveryRates;
    } catch (err) {
        console.error('Failed to load delivery rates:', err);
        return [];
    }
}

async function getDeliveryRate(originState, destinationState, vehicleCategory) {
    if (!originState || !destinationState) return null;
    const rates = await loadDeliveryRates();
    const route = rates.find(r =>
        r.originState === originState &&
        r.destinationState === destinationState
    );
    if (!route) return null;

    const multiplier = VEHICLE_TYPE_MULTIPLIERS[vehicleCategory] || 1.0;
    return Math.round(route.baseRate * multiplier);
}

async function resolveDeliveryFee(vehicle, destinationState) {
    if (!vehicle) return { fee: 0, source: 'none', breakdown: null };

    if (shouldChargeDelivery(vehicle)) {
        const fee = getMachineryDeliveryFee(vehicle.operatingWeight);
        return {
            fee,
            source: 'machinery',
            breakdown: `Low Loader · ${vehicle.operatingWeight || 0} kg`
        };
    }

    if (!destinationState) {
        return { fee: 0, source: 'no-destination', breakdown: null };
    }

    const originState = vehicle.rentalLocation || vehicle.location || '';
    if (!originState) {
        return { fee: 0, source: 'no-origin', breakdown: null };
    }

    const multiplier = VEHICLE_TYPE_MULTIPLIERS[vehicle.category] || 1.0;
    const rate = await getDeliveryRate(originState, destinationState, vehicle.category);

    if (rate === null) {
        return {
            fee: 0,
            source: 'no-route',
            breakdown: `${originState} → ${destinationState} (no rate)`
        };
    }

    return {
        fee: rate,
        source: originState === destinationState ? 'same-state' : 'state-to-state',
        breakdown: `${originState} → ${destinationState} · ×${multiplier}`
    };
}

// ============================================================
// 5. LICENCE HELPERS
// ============================================================
function normalizeLicenseArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

function getVehicleRequirements(vehicle) {
    if (typeof window.getRequiredLicense === 'function') {
        return window.getRequiredLicense(vehicle);
    }
    return { required: normalizeLicenseArray(vehicle && vehicle.requiredLicense), reason: '' };
}

// ============================================================
// 5b. OWNER INFO RESOLVER (fixes missing owner name/phone)
// ============================================================
async function resolveOwnerInfo(vehicle) {
    if (!vehicle) return { name: 'Owner', email: '', phone: 'Not provided' };

    // 1) Vehicle doc snapshot (fastest — no extra read)
    if (vehicle.ownerName && vehicle.ownerPhone) {
        return {
            name: vehicle.ownerName,
            email: vehicle.ownerEmail || '',
            phone: vehicle.ownerPhone
        };
    }

    // 2) Fallback: read from users collection
    const ownerId = vehicle.ownerId || vehicle.ownerUID;
    if (!ownerId) {
        return { name: 'Unknown Owner', email: '', phone: 'Not provided' };
    }

    try {
        const snap = await window.db.collection('users').doc(ownerId).get();
        if (snap.exists) {
            const u = snap.data();
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
            return {
                name: fullName || u.username || 'Owner',
                email: u.email || '',
                phone: u.phone || 'Not provided'
            };
        }
    } catch (err) {
        console.warn('Could not fetch owner info:', err);
    }

    return { name: 'Unknown Owner', email: '', phone: 'Not provided' };
}

// ============================================================
// 6. STATE
// ============================================================
let vehicleData = null;
let currentUser = null;
let pricePerDay = 0;
let listenersBound = false;
let tickListenersBound = false;
let insuranceListenersBound = false;
let lastConflictCheckId = 0;
let lastDeliveryBreakdown = null;

// ============================================================
// 7. DOM ELEMENTS
// ============================================================
const form = document.getElementById('bookingForm');
const loadingState = document.getElementById('loadingState');
const notFound = document.getElementById('notFound');
const bookingStatus = document.getElementById('bookingStatus');

const vehicleImage = document.getElementById('vehicleImage');
const vehicleName = document.getElementById('vehicleName');
const vehicleCategoryEl = document.getElementById('vehicleCategory');
const vehiclePriceEl = document.getElementById('vehiclePrice');
const vehicleLocation = document.getElementById('vehicleLocation');

const pickupDate = document.getElementById('pickupDate');
const returnDate = document.getElementById('returnDate');
const pickupTime = document.getElementById('pickupTime');
const returnTime = document.getElementById('returnTime');
const quantity = document.getElementById('quantity');
const quantityGroup = document.getElementById('quantityGroup');
const pickupLocation = document.getElementById('pickupLocation');
const deliveryAddress = document.getElementById('deliveryAddress');
const deliveryAddressGroup = document.getElementById('deliveryAddressGroup');
const deliveryDestination = document.getElementById('deliveryDestination');
const deliveryDestinationGroup = document.getElementById('deliveryDestinationGroup');
const returnAddress = document.getElementById('returnAddress');
const bookingNotes = document.getElementById('bookingNotes');

const contractorSection = document.getElementById('contractorSection');
const companyName = document.getElementById('companyName');
const contactPerson = document.getElementById('contactPerson');
const contactPhone = document.getElementById('contactPhone');
const projectName = document.getElementById('projectName');
const projectAddress = document.getElementById('projectAddress');
const purpose = document.getElementById('purpose');

const renterName = document.getElementById('renterName');
const renterEmail = document.getElementById('renterEmail');
const renterPhone = document.getElementById('renterPhone');
const licenceDisplay = document.getElementById('licenceDisplay');

const summaryPricePerDay = document.getElementById('summaryPricePerDay');
const summaryDays = document.getElementById('summaryDays');
const summaryQuantity = document.getElementById('summaryQuantity');
const summaryQuantityRow = document.getElementById('summaryQuantityRow');
const summaryInsurance = document.getElementById('summaryInsurance');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryServiceFee = document.getElementById('summaryServiceFee');
const summaryDeposit = document.getElementById('summaryDeposit');
const summaryAtPickup = document.getElementById('summaryAtPickup');
const summaryTotal = document.getElementById('summaryTotal');

// ============================================================
// 8. SHOW/HIDE HELPERS
// ============================================================
function showEl(el, display = 'block') {
    if (el) el.style.display = display;
}
function hideEl(el) {
    if (el) el.style.display = 'none';
}

// ============================================================
// 9. URL / FETCH
// ============================================================
function getVehicleId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function fetchVehicle(id) {
    try {
        const doc = await window.db.collection('vehicles').doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    } catch (e) {
        console.error('Error fetching vehicle:', e);
        return null;
    }
}

const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'><rect fill='%2311141A' width='200' height='150'/><text x='50%' y='50%' fill='%23D4AF37' font-family='Inter,sans-serif' font-size='14' text-anchor='middle' dominant-baseline='middle'>No Image</text></svg>";

// ============================================================
// 10. AVAILABILITY WARNING + LIVE CHECK
// ============================================================
function showAvailabilityWarning(conflicts) {
    let banner = document.getElementById('availabilityWarning');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'availabilityWarning';
        banner.style.cssText = `
            display:none;margin-bottom:16px;padding:14px 18px;
            background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);
            border-radius:12px;color:#991B1B;font-size:0.88rem;line-height:1.5;
        `;
        const card = document.querySelector('.booking-card');
        if (card) card.insertBefore(banner, card.firstChild);
    }

    if (conflicts.length === 0) {
        banner.style.display = 'none';
        banner.innerHTML = '';
        return;
    }

    const dates = conflicts
        .map(c => `${c.from || '?'} → ${c.to || '?'}`)
        .join(', ');

    banner.style.display = 'block';
    banner.innerHTML = `
        <strong><i class="fas fa-exclamation-triangle"></i> Vehicle not available</strong><br>
        This vehicle is already booked on: <strong>${dates}</strong>.<br>
        Please choose different dates.
    `;
}

async function checkAvailabilityLive() {
    if (!vehicleData || !pickupDate.value || !returnDate.value) return;
    if (returnDate.value < pickupDate.value) return;

    const myId = ++lastConflictCheckId;
    const conflicts = await findConflicts(vehicleData.id, pickupDate.value, returnDate.value);

    if (myId !== lastConflictCheckId) return;

    showAvailabilityWarning(conflicts);

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = conflicts.length > 0;
}

// ============================================================
// 11. TICK GROUP HANDLERS (payment method only)
// ============================================================
function initTickGroups() {
    if (tickListenersBound) return;
    tickListenersBound = true;

    document.querySelectorAll('.tick-group').forEach(group => {
        const initial = group.querySelector('.tick-btn.active');
        if (initial) group.dataset.selected = initial.dataset.value;
        else group.dataset.selected = group.querySelector('.tick-btn')?.dataset.value || '';

        group.addEventListener('click', (e) => {
            const btn = e.target.closest('.tick-btn');
            if (!btn) return;
            group.querySelectorAll('.tick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            group.dataset.selected = btn.dataset.value;
        });
    });
}

// ============================================================
// 12. INSURANCE SELECTION
// ============================================================
function initInsuranceOptions() {
    if (insuranceListenersBound) return;
    insuranceListenersBound = true;

    const options = document.querySelectorAll('.insurance-option');
    options.forEach(opt => {
        const radio = opt.querySelector('input[name="insurance"]');
        if (!radio) return;

        if (radio.checked) opt.classList.add('selected');

        radio.addEventListener('change', () => {
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            updateSummary();
        });
    });
}

function getSelectedInsurance() {
    const radio = document.querySelector('input[name="insurance"]:checked');
    if (!radio) return { tier: 'Basic', fee: 0 };
    const tier = radio.value;
    const feePerDay = Number(radio.dataset.fee) || INSURANCE_FEES[tier] || 0;
    return { tier, feePerDay };
}

// ============================================================
// 13. RENDER VEHICLE
// ============================================================
function renderVehicle(vehicle) {
    vehicleData = vehicle;
    pricePerDay = vehicle.pricePerDay || 0;

    vehicleImage.src = (vehicle.images && vehicle.images[0]) ? vehicle.images[0] : PLACEHOLDER_IMG;
    vehicleName.textContent = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';
    vehicleCategoryEl.textContent = vehicle.category || 'N/A';
    vehiclePriceEl.innerHTML = `RM ${pricePerDay} <span>/ day</span>`;
    vehicleLocation.innerHTML =
        `<i class="fas fa-map-marker-alt"></i> ${vehicle.rentalLocation || vehicle.location || 'Location not specified'}`;

    pickupLocation.value = vehicle.rentalLocation || vehicle.location || '';

    const isTruckOrHeavy = vehicle.category === 'trucks' || vehicle.category === 'heavy-machinery';
    showEl(quantityGroup, isTruckOrHeavy ? 'block' : 'none');
    showEl(contractorSection, isTruckOrHeavy ? 'block' : 'none');

    const pm = vehicle.pickupMethod || 'Pickup';
    const offersDelivery = pm === 'Delivery' || pm === 'Both';
    showEl(deliveryDestinationGroup, offersDelivery ? 'block' : 'none');
    showEl(deliveryAddressGroup, offersDelivery ? 'block' : 'none');

    const deliveryNotice = document.getElementById('vrentDeliveryNotice');
    if (deliveryNotice) {
        const show = vehicle.category === 'heavy-machinery' && vehicle.deliveredByVRent === true;
        showEl(deliveryNotice, show ? 'flex' : 'none');
    }

    const today = new Date().toISOString().split('T')[0];
    pickupDate.min = today;
    returnDate.min = today;
    pickupDate.value = today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    returnDate.value = tomorrow.toISOString().split('T')[0];

    if (!listenersBound) {
        pickupDate.addEventListener('change', () => { updateSummary(); checkAvailabilityLive(); });
        returnDate.addEventListener('change', () => { updateSummary(); checkAvailabilityLive(); });
        pickupTime.addEventListener('change', updateSummary);
        returnTime.addEventListener('change', updateSummary);
        quantity.addEventListener('input', updateSummary);

        if (deliveryDestination) {
            deliveryDestination.addEventListener('change', updateSummary);
        }
        listenersBound = true;
    }

    initTickGroups();
    initInsuranceOptions();

    hideEl(loadingState);
    showEl(form, 'block');
    updateSummary();
    checkAvailabilityLive();
}

// ============================================================
// 14. PRICE SUMMARY
// ============================================================
async function updateSummary() {
    const start = new Date(pickupDate.value + 'T' + (pickupTime.value || '09:00'));
    const end = new Date(returnDate.value + 'T' + (returnTime.value || '18:00'));
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days < 1) days = 1;

    const qty = parseInt(quantity.value) || 1;
    const rentalTotal = pricePerDay * days * qty;

    const destination = deliveryDestination ? deliveryDestination.value : '';
    const deliveryInfo = await resolveDeliveryFee(vehicleData, destination);
    const deliveryFee = deliveryInfo.fee;
    lastDeliveryBreakdown = deliveryInfo.breakdown;

    const { tier, feePerDay } = getSelectedInsurance();
    const insuranceFee = feePerDay * days * qty;

    const rentalSubtotal = rentalTotal + deliveryFee + insuranceFee;
    const serviceFee = Math.round(rentalSubtotal * SERVICE_FEE_RATE);
    const totalAtPickup = rentalSubtotal + serviceFee;
    const deposit = Math.round(rentalSubtotal * SECURITY_DEPOSIT_RATE);

    summaryPricePerDay.textContent = `RM ${pricePerDay}`;
    summaryDays.textContent = `${days} day${days > 1 ? 's' : ''}`;
    summaryQuantity.textContent = qty;

    if (quantityGroup.style.display === 'block') {
        showEl(summaryQuantityRow, 'flex');
    } else {
        hideEl(summaryQuantityRow);
    }

    const deliveryRow = document.getElementById('summaryDeliveryRow');
    const deliveryValue = document.getElementById('summaryDeliveryFee');
    if (deliveryRow && deliveryValue) {
        if (deliveryFee > 0) {
            showEl(deliveryRow, 'flex');
            deliveryValue.textContent = `RM ${deliveryFee}${lastDeliveryBreakdown ? ' · ' + lastDeliveryBreakdown : ''}`;
        } else if (destination && lastDeliveryBreakdown) {
            showEl(deliveryRow, 'flex');
            deliveryValue.textContent = lastDeliveryBreakdown;
        } else {
            hideEl(deliveryRow);
        }
    }

    if (summaryInsurance) {
        if (insuranceFee > 0) {
            summaryInsurance.textContent = `RM ${insuranceFee} (${tier})`;
            summaryInsurance.style.color = '#D4AF37';
        } else {
            summaryInsurance.textContent = `Included (Basic)`;
            summaryInsurance.style.color = '#16A34A';
        }
    }

    if (summarySubtotal) summarySubtotal.textContent = `RM ${rentalSubtotal}`;
    if (summaryServiceFee) summaryServiceFee.textContent = `RM ${serviceFee}`;
    if (summaryDeposit) summaryDeposit.textContent = `RM ${deposit}`;
    if (summaryAtPickup) summaryAtPickup.textContent = `RM ${totalAtPickup}`;
    if (summaryTotal) summaryTotal.textContent = `RM ${totalAtPickup + deposit}`;
}

// ============================================================
// 15. LOAD USER DATA + LICENCE DISPLAY
// ============================================================
async function loadUserData(user) {
    currentUser = user;
    renterName.value = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
    renterEmail.value = user.email || '';

    try {
        const doc = await window.db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();
            renterPhone.value = data.phone || '';
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            if (fullName) renterName.value = fullName;

            currentUser.licenseClasses = normalizeLicenseArray(data.licenseClasses);
            currentUser.verificationStatus = data.verificationStatus || 'Not Submitted';
        } else {
            currentUser.licenseClasses = [];
            currentUser.verificationStatus = 'Not Submitted';
        }
        renderLicenceDisplay();
    } catch (e) {
        console.error('Error loading user data:', e);
        currentUser.licenseClasses = [];
        currentUser.verificationStatus = 'Not Submitted';
        renderLicenceDisplay();
    }
}

function renderLicenceDisplay() {
    if (!licenceDisplay) return;

    const classes = currentUser.licenseClasses || [];
    const status = currentUser.verificationStatus;

    if (classes.length > 0 && status === 'Approved') {
        let matchNote = '';
        if (vehicleData) {
            const { required } = getVehicleRequirements(vehicleData);
            if (required.length > 0) {
                const ok = required.some(c => classes.includes(c));
                if (ok) {
                    matchNote = ` · <span style="color:#16A34A;">matches this vehicle</span>`;
                } else {
                    matchNote = ` · <span style="color:#DC2626;">does not match this vehicle</span>`;
                }
            }
        }

        licenceDisplay.className = 'licence-display verified';
        licenceDisplay.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span><strong>${classes.join(', ')}</strong> — Verified${matchNote}</span>
        `;
    } else if (classes.length > 0 && status !== 'Approved') {
        licenceDisplay.className = 'licence-display missing';
        licenceDisplay.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>Verification pending (${status})</span>
            <a href="Dashboard.html" class="verify-link">View Status</a>
        `;
    } else {
        licenceDisplay.className = 'licence-display missing';
        licenceDisplay.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>No verified licence</span>
            <a href="Dashboard.html" class="verify-link">Verify Now →</a>
        `;
    }
}

// ============================================================
// 16. FORM SUBMISSION
// ============================================================
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!currentUser) {
        if (typeof window.showAuthGate === 'function') window.showAuthGate();
        else window.location.href = 'MainPage.html';
        return;
    }

    // ---- LICENCE VALIDATION ----
    const verifiedClasses = currentUser.licenseClasses || [];
    const verificationStatus = currentUser.verificationStatus;

    if (verificationStatus !== 'Approved' || verifiedClasses.length === 0) {
        if (typeof window.showVerifyGate === 'function') {
            window.showVerifyGate();
        } else {
            alert(
                'Your licence must be verified before you can book.\n\n' +
                'Please go to your Dashboard and submit your licence for verification.'
            );
            window.location.href = 'Dashboard.html';
        }
        return;
    }

    const { required, reason } = getVehicleRequirements(vehicleData);

    if (required.length > 0) {
        const hasRequired = required.some(cls => verifiedClasses.includes(cls));
        if (!hasRequired) {
            alert(
                'This vehicle requires a different licence class.\n\n' +
                `Vehicle: ${reason}\n` +
                `Accepted: ${required.join(' or ')}\n` +
                `Your verified: ${verifiedClasses.join(', ')}\n\n` +
                'You cannot book this vehicle with your current licence.'
            );
            return;
        }
    }

    // ---- DATE VALIDATION ----
    const startDate = new Date(pickupDate.value);
    const endDate = new Date(returnDate.value);
    if (endDate < startDate) {
        alert('Return date must be after pickup date.');
        return;
    }

    if (!pickupLocation.value.trim()) {
        alert('Please enter a pickup location.');
        return;
    }

    if (!returnAddress || !returnAddress.value.trim()) {
        alert('Please enter a return address.');
        returnAddress && returnAddress.focus();
        return;
    }

    // ---- AVAILABILITY (final guard) ----
    const conflicts = await findConflicts(vehicleData.id, pickupDate.value, returnDate.value);
    if (conflicts.length > 0) {
        const dates = conflicts.map(c => `${c.from} → ${c.to}`).join(', ');
        alert(
            'This vehicle is not available on your selected dates.\n\n' +
            'Already booked: ' + dates + '\n\n' +
            'Please choose different dates.'
        );
        checkAvailabilityLive();
        return;
    }

    // ---- DELIVERY DESTINATION ----
    const pm = vehicleData.pickupMethod || 'Pickup';
    const offersDelivery = pm === 'Delivery' || pm === 'Both';
    const destination = deliveryDestination ? deliveryDestination.value : '';

    if (offersDelivery && pm === 'Delivery' && !destination) {
        alert('Please select a delivery destination state.');
        return;
    }

    // ---- CONTRACTOR VALIDATION ----
    const isTruckOrHeavy = vehicleData.category === 'trucks' || vehicleData.category === 'heavy-machinery';
    if (isTruckOrHeavy) {
        if (!companyName.value.trim() || !contactPerson.value.trim() || !contactPhone.value.trim()) {
            alert('Please fill in all contractor information fields.');
            return;
        }
    }

    if (!document.getElementById('agreeTerms').checked) {
        alert('Please agree to the terms and conditions.');
        return;
    }

    // ---- CALCULATE TOTALS ----
    const qty = parseInt(quantity.value) || 1;
    const start = new Date(pickupDate.value + 'T' + (pickupTime.value || '09:00'));
    const end = new Date(returnDate.value + 'T' + (returnTime.value || '18:00'));
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days < 1) days = 1;

    const rentalTotal = pricePerDay * days * qty;

    const deliveryInfo = await resolveDeliveryFee(vehicleData, destination);
    const vrentDeliveryFee = deliveryInfo.fee;

    const { tier: insuranceTier, feePerDay: insurancePerDay } = getSelectedInsurance();
    const insuranceFee = insurancePerDay * days * qty;

    const rentalSubtotal = rentalTotal + vrentDeliveryFee + insuranceFee;
    const serviceFee = Math.round(rentalSubtotal * SERVICE_FEE_RATE);
    const totalAtPickup = rentalSubtotal + serviceFee;
    const deposit = Math.round(rentalSubtotal * SECURITY_DEPOSIT_RATE);

    // ---- Payment method ----
    const paymentGroup = document.querySelector('[data-field="paymentMethod"]');
    const paymentMethod = paymentGroup ? (paymentGroup.dataset.selected || 'FPX') : 'FPX';

    const ownerId = vehicleData.ownerId || vehicleData.ownerUID || null;
    const originState = vehicleData.rentalLocation || vehicleData.location || '';

    // ✅ Resolve owner info (fixes missing owner in notifications)
    const ownerInfo = await resolveOwnerInfo(vehicleData);

    const bookingData = {
        // ---- Vehicle ----
        vehicleId: vehicleData.id,
        vehicleName: `${vehicleData.brand || ''} ${vehicleData.model || ''}`.trim(),
        vehicleCategory: vehicleData.category,
        vehicleImage: (vehicleData.images && vehicleData.images[0]) || null,
        ownerId: ownerId,

        // ---- Owner snapshot ----
        ownerName: ownerInfo.name,
        ownerEmail: ownerInfo.email,
        ownerPhone: ownerInfo.phone,

        // ---- Renter ----
        renterId: currentUser.uid,
        renterName: renterName.value,
        renterEmail: renterEmail.value,
        renterPhone: renterPhone.value || 'Not provided',
        licenceType: verifiedClasses.join(', '),
        verifiedLicenseClasses: verifiedClasses,
        requiredLicenseAtBooking: required,
        licenseRequirementReason: reason,

        // ---- Booking details ----
        pickupDate: pickupDate.value,
        returnDate: returnDate.value,
        pickupTime: pickupTime.value,
        returnTime: returnTime.value,
        pickupLocation: pickupLocation.value.trim(),
        deliveryAddress: deliveryAddress ? deliveryAddress.value.trim() : '',
        returnAddress: returnAddress.value.trim(),
        quantity: qty,
        days: days,
        pricePerDay: pricePerDay,

        // ---- Delivery snapshot ----
        deliveryOriginState: originState || null,
        deliveryDestinationState: destination || null,
        deliveryBreakdown: deliveryInfo.breakdown,
        deliverySource: deliveryInfo.source,

        // ---- Pricing breakdown ----
        rentalSubtotal: rentalSubtotal,
        deliveryFee: vrentDeliveryFee,
        insuranceTier: insuranceTier,
        insuranceFee: insuranceFee,

        serviceFeeRate: SERVICE_FEE_RATE,
        serviceFee: serviceFee,

        securityDeposit: deposit,
        securityDepositRate: SECURITY_DEPOSIT_RATE,

        totalPrice: totalAtPickup,
        amountDueNow: deposit,
        amountDueAtPickup: totalAtPickup,
        paymentMethod: paymentMethod,

        ownerPayout: rentalSubtotal,

        depositStatus: 'Held',
        depositRefundedAt: null,

        notes: bookingNotes.value.trim() || '',

        status: 'Pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        renterReceivedAt: null,
        ownerReceivedAt: null,

        // ---- Contractor ----
        isContractor: isTruckOrHeavy,
        companyName: isTruckOrHeavy ? companyName.value.trim() : null,
        contactPerson: isTruckOrHeavy ? contactPerson.value.trim() : null,
        contactPhone: isTruckOrHeavy ? contactPhone.value.trim() : null,
        projectName: isTruckOrHeavy ? projectName.value.trim() : null,
        projectAddress: isTruckOrHeavy ? projectAddress.value.trim() : null,
        purpose: isTruckOrHeavy ? purpose.value : null,
        deliveredByVRent: shouldChargeDelivery(vehicleData)
    };

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const docRef = await window.db.collection('bookings').add(bookingData);
        sessionStorage.setItem('lastBookingId', docRef.id);

        // ✅ Mirror range into PUBLIC vehicleAvailability subcollection
        //    Powers the calendar on VehicleDetails.html for guests
        await mirrorAvailabilityRange(
            docRef.id,
            vehicleData.id,
            pickupDate.value,
            returnDate.value,
            'Pending',
            currentUser.uid,
            ownerId
        );

        hideEl(form);
        showEl(bookingStatus, 'block');
    } catch (err) {
        console.error('Booking error:', err);
        alert('Failed to submit booking: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Booking';
    }
});

// ============================================================
// 17. RECEIVED VEHICLE (renter handover + admin notification)
// ============================================================
function initReceivedButton() {
    const btn = document.getElementById('confirmReceivedBtn');
    if (!btn) return;

    btn.addEventListener('click', async function () {
        const bookingId = sessionStorage.getItem('lastBookingId');
        if (!bookingId) {
            alert('No active booking found in this session.');
            return;
        }

        const confirmed = confirm(
            'Confirm you have received the vehicle from the owner?\n\n' +
            'Only proceed if you have:\n' +
            '• Inspected the vehicle\n' +
            '• Received the keys\n' +
            '• Photographed any existing damage'
        );
        if (!confirmed) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';

        try {
            await window.db.collection('bookings').doc(bookingId).update({
                renterReceivedAt: firebase.firestore.FieldValue.serverTimestamp(),
                renterReceivedBy: currentUser ? currentUser.uid : null,
                status: 'Active'
            });

            const bookingSnap = await window.db.collection('bookings').doc(bookingId).get();
            const b = bookingSnap.data() || {};

            // Update the availability range to 'Active'
            await mirrorAvailabilityRange(
                bookingId,
                b.vehicleId,
                b.pickupDate,
                b.returnDate,
                'Active',
                b.renterId,
                b.ownerId
            );

            await window.db.collection('notifications').add({
                type: 'pickup',
                bookingId: bookingId,
                vehicleId: b.vehicleId || null,
                vehicleName: b.vehicleName || 'Vehicle',
                vehicleImage: b.vehicleImage || null,
                renterId: b.renterId || null,
                renterName: b.renterName || 'Renter',
                renterPhone: b.renterPhone || '',
                ownerId: b.ownerId || null,
                ownerName: b.ownerName || 'Owner',
                ownerPhone: b.ownerPhone || 'Not provided',
                rentalSubtotal: b.rentalSubtotal || 0,
                serviceFee: b.serviceFee || 0,
                totalPrice: b.totalPrice || 0,
                securityDeposit: b.securityDeposit || 0,
                confirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
                adminReadAt: null
            });

            btn.innerHTML = '<i class="fas fa-check"></i> Confirmed!';
            btn.style.background = 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)';
            btn.style.color = '#FFFFFF';

            setTimeout(() => {
                window.location.href = 'Dashboard.html';
            }, 1200);
        } catch (err) {
            console.error('Handover confirm error:', err);
            alert('Failed to confirm. Please try again.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-double"></i> I\'ve Received the Vehicle from Owner';
        }
    });
}

// ============================================================
// 18. AUTH STATE LISTENER
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    if (!window.auth) {
        console.error('Firebase auth not available');
        return;
    }

    initReceivedButton();

    window.auth.onAuthStateChanged(async function (user) {
        if (!user) {
            currentUser = null;
            if (typeof window.showAuthGate === 'function') window.showAuthGate();
            return;
        }

        await loadUserData(user);

        const status = currentUser.verificationStatus;
        const classes = currentUser.licenseClasses || [];

        if (status !== 'Approved' || classes.length === 0) {
            hideEl(loadingState);
            hideEl(form);
            hideEl(notFound);
            if (typeof window.showVerifyGate === 'function') window.showVerifyGate();
            return;
        }

        const id = getVehicleId();
        if (!id) {
            hideEl(loadingState);
            showEl(notFound, 'block');
            return;
        }

        const vehicle = await fetchVehicle(id);
        if (!vehicle) {
            hideEl(loadingState);
            showEl(notFound, 'block');
            return;
        }

        renderVehicle(vehicle);
        renderLicenceDisplay();
    });
});