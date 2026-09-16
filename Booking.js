// Booking.js - Vehicle booking with verified licence check + V-Rent machinery delivery
// + Insurance tiers + Booking fee + Down payment + Handover confirmation
// Peninsular Malaysia only — no outstation field

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
// 2. PRICING CONSTANTS
// ============================================================
const BOOKING_FEE = 10;                    // RM 10 flat platform fee
const DOWN_PAYMENT_PERCENT = 0.20;         // 20% due now
const INSURANCE_FEES = {                   // RM per day
    Basic:   0,
    Medium:  30,
    Premium: 50
};

// ============================================================
// 3. LICENCE HELPERS
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
// 4. STATE
// ============================================================
let vehicleData = null;
let currentUser = null;
let pricePerDay = 0;
let listenersBound = false;
let tickListenersBound = false;
let insuranceListenersBound = false;
let lastSubtotal = 0;
let lastDownPayment = 0;
let lastBalance = 0;
let lastInsuranceFee = 0;
let lastInsuranceTier = 'Basic';

// ============================================================
// 5. DOM ELEMENTS
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
const summaryDownPayment = document.getElementById('summaryDownPayment');
const summaryBalance = document.getElementById('summaryBalance');
const summaryTotal = document.getElementById('summaryTotal');

// ============================================================
// 6. SHOW/HIDE HELPERS
// ============================================================
function showEl(el, display = 'block') {
    if (el) el.style.display = display;
}
function hideEl(el) {
    if (el) el.style.display = 'none';
}

// ============================================================
// 7. URL / FETCH
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
// 8. TICK GROUP HANDLERS (payment method only — outstation removed)
// ============================================================
function initTickGroups() {
    if (tickListenersBound) return;
    tickListenersBound = true;

    document.querySelectorAll('.tick-group').forEach(group => {
        // Initial selected value = active button
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
// 9. INSURANCE SELECTION
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
            lastInsuranceTier = radio.value;
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
// 10. RENDER VEHICLE
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

    // Initialise tick groups + insurance (bind once)
    initTickGroups();
    initInsuranceOptions();

    hideEl(loadingState);
    showEl(form, 'block');
    updateSummary();
}

// ============================================================
// 11. PRICE SUMMARY
// ============================================================
function updateSummary() {
    const start = new Date(pickupDate.value + 'T' + (pickupTime.value || '09:00'));
    const end = new Date(returnDate.value + 'T' + (returnTime.value || '18:00'));
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days < 1) days = 1;

    const qty = parseInt(quantity.value) || 1;
    const rentalTotal = pricePerDay * days * qty;

    let deliveryFee = 0;
    if (shouldChargeDelivery(vehicleData)) {
        deliveryFee = getMachineryDeliveryFee(vehicleData.operatingWeight);
    }

    const { tier, feePerDay } = getSelectedInsurance();
    const insuranceFee = feePerDay * days * qty;
    lastInsuranceFee = insuranceFee;
    lastInsuranceTier = tier;

    const subtotal = rentalTotal + deliveryFee + insuranceFee + BOOKING_FEE;
    const downPayment = Math.round(subtotal * DOWN_PAYMENT_PERCENT);
    const balance = subtotal - downPayment;

    lastSubtotal = subtotal;
    lastDownPayment = downPayment;
    lastBalance = balance;

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
            deliveryValue.textContent = `RM ${deliveryFee}`;
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

    if (summarySubtotal) summarySubtotal.textContent = `RM ${subtotal}`;
    if (summaryDownPayment) summaryDownPayment.textContent = `RM ${downPayment}`;
    if (summaryBalance) summaryBalance.textContent = `RM ${balance}`;
    if (summaryTotal) summaryTotal.textContent = `RM ${subtotal}`;
}

// ============================================================
// 12. LOAD USER DATA + LICENCE DISPLAY
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
// 13. FORM SUBMISSION
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

    // ---- RETURN ADDRESS (MANDATORY) ----
    if (!returnAddress || !returnAddress.value.trim()) {
        alert('Please enter a return address.');
        returnAddress && returnAddress.focus();
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

    const { tier: insuranceTier, feePerDay: insurancePerDay } = getSelectedInsurance();
    const insuranceFee = insurancePerDay * days * qty;

    const subtotal = rentalTotal + vrentDeliveryFee + insuranceFee + BOOKING_FEE;
    const downPayment = Math.round(subtotal * DOWN_PAYMENT_PERCENT);
    const balanceDue = subtotal - downPayment;

    // ---- Payment method from tick group ----
    const paymentGroup = document.querySelector('[data-field="paymentMethod"]');
    const paymentMethod = paymentGroup ? (paymentGroup.dataset.selected || 'FPX') : 'FPX';

    const ownerId = vehicleData.ownerId || vehicleData.ownerUID || null;

    const bookingData = {
        // ---- Vehicle ----
        vehicleId: vehicleData.id,
        vehicleName: `${vehicleData.brand || ''} ${vehicleData.model || ''}`.trim(),
        vehicleCategory: vehicleData.category,
        vehicleImage: (vehicleData.images && vehicleData.images[0]) || null,
        ownerId: ownerId,

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

        // ---- Pricing breakdown ----
        rentalSubtotal: rentalTotal,
        deliveryFee: vrentDeliveryFee,
        insuranceTier: insuranceTier,
        insuranceFee: insuranceFee,
        bookingFee: BOOKING_FEE,
        subtotal: subtotal,
        downPayment: downPayment,
        balanceDue: balanceDue,
        totalPrice: subtotal,
        paymentMethod: paymentMethod,

        // ---- Notes ----
        notes: bookingNotes.value.trim() || '',

        // ---- Status & timestamps ----
        status: 'Pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        renterReceivedAt: null,
        ownerReceivedAt: null,

        // ---- Contractor (trucks & heavy machinery only) ----
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
// 14. RECEIVED VEHICLE (renter handover confirmation)
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
// 15. AUTH STATE LISTENER (with verification gate)
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