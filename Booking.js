// Booking.js - Vehicle booking with verified licence check + V-Rent machinery delivery

// ============================================================
// 1. MACHINERY DELIVERY TIERS (auto-calculated from operating weight)
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
// 2. LICENCE HELPERS
// ============================================================
function normalizeLicenseArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

// Fallback if LicenseRules.js fails to load
function getVehicleRequirements(vehicle) {
    if (typeof window.getRequiredLicense === 'function') {
        return window.getRequiredLicense(vehicle);
    }
    // Minimal fallback — should never trigger if LicenseRules.js is loaded
    return { required: normalizeLicenseArray(vehicle && vehicle.requiredLicense), reason: '' };
}

// ============================================================
// 3. STATE
// ============================================================
let vehicleData = null;
let currentUser = null;
let pricePerDay = 0;
let listenersBound = false;

// ============================================================
// 4. DOM ELEMENTS
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
const returnLocation = document.getElementById('returnLocation');
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
const summaryTotal = document.getElementById('summaryTotal');

// ============================================================
// 5. SHOW/HIDE HELPERS
// ============================================================
function showEl(el, display = 'block') {
    if (el) el.style.display = display;
}
function hideEl(el) {
    if (el) el.style.display = 'none';
}

// ============================================================
// 6. URL / FETCH
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
// 7. RENDER VEHICLE
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

    // Truck / machinery → show quantity + contractor sections
    const isTruckOrHeavy = vehicle.category === 'trucks' || vehicle.category === 'heavy-machinery';
    showEl(quantityGroup, isTruckOrHeavy ? 'block' : 'none');
    showEl(contractorSection, isTruckOrHeavy ? 'block' : 'none');

    // V-Rent delivery notice (machinery only)
    const deliveryNotice = document.getElementById('vrentDeliveryNotice');
    if (deliveryNotice) {
        const show = vehicle.category === 'heavy-machinery' && vehicle.deliveredByVRent === true;
        showEl(deliveryNotice, show ? 'flex' : 'none');
    }

    // Date defaults
    const today = new Date().toISOString().split('T')[0];
    pickupDate.min = today;
    returnDate.min = today;
    pickupDate.value = today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    returnDate.value = tomorrow.toISOString().split('T')[0];

    // Live listeners (bind once)
    if (!listenersBound) {
        pickupDate.addEventListener('change', updateSummary);
        returnDate.addEventListener('change', updateSummary);
        pickupTime.addEventListener('change', updateSummary);
        returnTime.addEventListener('change', updateSummary);
        quantity.addEventListener('input', updateSummary);
        listenersBound = true;
    }

    hideEl(loadingState);
    showEl(form, 'block');
    updateSummary();
}

// ============================================================
// 8. PRICE SUMMARY
// ============================================================
function updateSummary() {
    const start = new Date(pickupDate.value + 'T' + (pickupTime.value || '09:00'));
    const end = new Date(returnDate.value + 'T' + (returnTime.value || '18:00'));
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days < 1) days = 1;

    const qty = parseInt(quantity.value) || 1;
    const rentalTotal = pricePerDay * days * qty;

    // Delivery fee (V-Rent machinery)
    let deliveryFee = 0;
    if (shouldChargeDelivery(vehicleData)) {
        deliveryFee = getMachineryDeliveryFee(vehicleData.operatingWeight);
    }
    const grandTotal = rentalTotal + deliveryFee;

    summaryPricePerDay.textContent = `RM ${pricePerDay}`;
    summaryDays.textContent = `${days} day${days > 1 ? 's' : ''}`;
    summaryQuantity.textContent = qty;

    // Show/hide quantity row alongside quantityGroup
    if (quantityGroup.style.display === 'block') {
        showEl(summaryQuantityRow, 'flex');
    } else {
        hideEl(summaryQuantityRow);
    }

    // Delivery fee row
    const deliveryRow = document.getElementById('summaryDeliveryRow');
    const deliveryValue = document.getElementById('summaryDeliveryFee');
    if (deliveryRow && deliveryValue) {
        if (deliveryFee > 0) {
            showEl(deliveryRow, 'flex');
            deliveryValue.textContent = `RM ${deliveryFee}`;
        } else {
            hideEl(deliveryRow);
        }
    }

    summaryTotal.textContent = `RM ${grandTotal}`;
}

// ============================================================
// 9. LOAD USER DATA + LICENCE DISPLAY
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

/**
 * Renders the verified licence chip inside the Booking form.
 * Also shows whether the user's classes match the vehicle's requirement.
 */
function renderLicenceDisplay() {
    if (!licenceDisplay) return;

    const classes = currentUser.licenseClasses || [];
    const status = currentUser.verificationStatus;

    if (classes.length > 0 && status === 'Approved') {
        // If vehicle is loaded, check whether it matches
        let matchNote = '';
        if (vehicleData) {
            const { required, reason } = getVehicleRequirements(vehicleData);
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
// 10. FORM SUBMISSION
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

    // Auto-derived requirement from vehicle specs (JPJ categories)
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
    const vrentDeliveryFee = shouldChargeDelivery(vehicleData)
        ? getMachineryDeliveryFee(vehicleData.operatingWeight)
        : 0;
    const grandTotal = rentalTotal + vrentDeliveryFee;

    const ownerId = vehicleData.ownerId || vehicleData.ownerUID || null;

    const bookingData = {
        vehicleId: vehicleData.id,
        vehicleName: `${vehicleData.brand || ''} ${vehicleData.model || ''}`.trim(),
        vehicleCategory: vehicleData.category,
        vehicleImage: (vehicleData.images && vehicleData.images[0]) || null,
        ownerId: ownerId,
        renterId: currentUser.uid,
        renterName: renterName.value,
        renterEmail: renterEmail.value,
        renterPhone: renterPhone.value || 'Not provided',
        licenceType: verifiedClasses.join(', '),
        verifiedLicenseClasses: verifiedClasses,
        requiredLicenseAtBooking: required,        // snapshot for auditing
        licenseRequirementReason: reason,
        pickupDate: pickupDate.value,
        returnDate: returnDate.value,
        pickupTime: pickupTime.value,
        returnTime: returnTime.value,
        pickupLocation: pickupLocation.value.trim(),
        returnLocation: returnLocation.value.trim() || pickupLocation.value.trim(),
        quantity: qty,
        days: days,
        pricePerDay: pricePerDay,
        rentalSubtotal: rentalTotal,
        deliveryFee: vrentDeliveryFee,
        totalPrice: grandTotal,
        notes: bookingNotes.value.trim() || '',
        status: 'Pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
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
        await window.db.collection('bookings').add(bookingData);
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
// 11. AUTH STATE LISTENER (with verification gate)
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    if (!window.auth) {
        console.error('Firebase auth not available');
        return;
    }

    window.auth.onAuthStateChanged(async function (user) {
        // ---- Gate 1: not logged in ----
        if (!user) {
            currentUser = null;
            if (typeof window.showAuthGate === 'function') window.showAuthGate();
            return;
        }

        // ---- Load user data ----
        await loadUserData(user);

        // ---- Gate 2: not verified ----
        const status = currentUser.verificationStatus;
        const classes = currentUser.licenseClasses || [];

        if (status !== 'Approved' || classes.length === 0) {
            hideEl(loadingState);
            hideEl(form);
            hideEl(notFound);
            if (typeof window.showVerifyGate === 'function') window.showVerifyGate();
            return;
        }

        // ---- Proceed to load vehicle ----
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

        // Re-render licence pill now that vehicle data is loaded
        // (shows "matches this vehicle" / "does not match")
        renderLicenceDisplay();
    });
});