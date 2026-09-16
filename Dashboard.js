// Dashboard.js — includes rental requests tab + verified licence card (owner view)
// + quick categories counts + owner return-handover confirmation

// ============================================================
// 1. STATE & DOM ELEMENTS
// ============================================================
let currentUser = null;
let userVehicles = [];
let userBookings = [];
let rentalRequests = [];
let userFavourites = [];
let recentActivities = [];

const userNameDisplay = document.getElementById('userNameDisplay');

// (Stat card elements removed — Quick Categories now handle counts)

const vehiclesList = document.getElementById('vehiclesList');
const bookingsList = document.getElementById('bookingsList');
const rentalRequestsList = document.getElementById('rentalRequestsList');
const favouritesList = document.getElementById('favouritesList');
const vehicleCountBadge = document.getElementById('vehicleCountBadge');
const bookingCountBadge = document.getElementById('bookingCountBadge');
const rentalRequestsCountBadge = document.getElementById('rentalRequestsCountBadge');
const rentalRequestsTabBadge = document.getElementById('rentalRequestsTabBadge');

const profileName = document.getElementById('profileName');
const profileUsernameDisplay = document.getElementById('profileUsernameDisplay');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const profileJoinedDate = document.getElementById('profileJoinedDate');
const profileVerificationStatus = document.getElementById('profileVerificationStatus');
const profileInitialLarge = document.getElementById('profileInitialLarge');
const profileAvatarLargeImg = document.getElementById('profileAvatarLargeImg');
const profileJoined = document.getElementById('profileJoined');

// ============================================================
// 2. CLOUDINARY CONFIG
// ============================================================
const CLOUDINARY_CLOUD_NAME = 'ggxrhjdr';
const CLOUDINARY_UPLOAD_PRESET = 'vrent_avatar';

async function uploadFileToCloudinary(file, folder) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    return data.secure_url;
}

function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > h) { if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; } }
                else { if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => {
                    if (!blob) reject(new Error('Blob creation failed'));
                    else resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
    });
}

// ============================================================
// 3. HELPERS
// ============================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeLicenseArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

const CONTACT_VISIBLE_STATUSES = ['approved', 'confirmed', 'active', 'completed'];
function canSeeRenterContact(status) {
    return CONTACT_VISIBLE_STATUSES.includes((status || '').toLowerCase());
}

// Update Quick Categories counts (helper lives in Dashboard.html)
function updateQuickCategoryBadges() {
    if (typeof window.updateQuickBadge !== 'function') return;
    window.updateQuickBadge('quickVehiclesCount', userVehicles.length);
    window.updateQuickBadge('quickBookingsCount', userBookings.length);
    window.updateQuickBadge('quickRentalCount',   rentalRequests.length);
    window.updateQuickBadge('quickFavCount',      userFavourites.length);
}

// ============================================================
// 4. TAB SWITCHING
// ============================================================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
        tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `tab-${tab}`) {
                content.classList.add('active');
            }
        });
        if (tab === 'favourites' && currentUser) {
            fetchFavourites(currentUser.uid);
        }
    });
});

// ============================================================
// 5. LOAD DASHBOARD
// ============================================================
async function loadDashboard(user) {
    currentUser = user;
    showLoadingSkeletons();

    try {
        await Promise.all([
            loadUserProfile(user),
            fetchUserVehicles(user.uid),
            fetchUserBookings(user.uid),
            fetchRentalRequests(user.uid),
            fetchUserReviews(user.uid),
            loadVerificationStatus(user.uid),
            loadRecentActivity(user.uid),
            fetchFavourites(user.uid)
        ]);
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

function showLoadingSkeletons() {
    if (vehiclesList) vehiclesList.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading your vehicles...</p></div>`;
    if (bookingsList) bookingsList.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading your bookings...</p></div>`;
    if (rentalRequestsList) rentalRequestsList.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading rental requests...</p></div>`;
    if (favouritesList) favouritesList.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading favourites...</p></div>`;
    const recent = document.getElementById('recentActivityList');
    if (recent) recent.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading activity...</p></div>`;
}

// ============================================================
// 6. LOAD USER PROFILE (+ verified licence card)
// ============================================================
async function loadUserProfile(user) {
    try {
        const doc = await window.db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();

            const username = data.username || data.firstName || user.displayName || user.email?.split('@')[0] || 'User';
            if (userNameDisplay) userNameDisplay.textContent = username;
            if (profileUsernameDisplay) profileUsernameDisplay.textContent = data.username || '—';

            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || user.displayName || user.email?.split('@')[0] || 'User';
            if (profileName) profileName.textContent = fullName;
            if (profileEmail) profileEmail.textContent = data.email || user.email || '';
            if (profilePhone) profilePhone.textContent = data.phone || 'Not provided';

            const joinedDate = data.createdAt
                ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'N/A';
            if (profileJoined) profileJoined.textContent = joinedDate;
            if (profileJoinedDate) profileJoinedDate.textContent = joinedDate;

            const profilePicture = data.profilePicture || null;
            if (profilePicture) {
                if (profileAvatarLargeImg) {
                    profileAvatarLargeImg.src = profilePicture;
                    profileAvatarLargeImg.style.display = 'block';
                }
                if (profileInitialLarge) profileInitialLarge.style.display = 'none';
                const smallImg = document.getElementById('profileAvatarImg');
                if (smallImg) {
                    smallImg.src = profilePicture;
                    smallImg.style.display = 'block';
                    document.getElementById('profileInitial').style.display = 'none';
                }
            } else {
                const initial = fullName.charAt(0).toUpperCase();
                if (profileInitialLarge) {
                    profileInitialLarge.textContent = initial;
                    profileInitialLarge.style.display = 'flex';
                }
                if (profileAvatarLargeImg) profileAvatarLargeImg.style.display = 'none';
                const smallInitial = document.getElementById('profileInitial');
                if (smallInitial) {
                    smallInitial.textContent = initial;
                    smallInitial.style.display = 'flex';
                }
            }

            currentUser.licenseClasses = normalizeLicenseArray(data.licenseClasses);
            currentUser.verificationStatus = data.verificationStatus || 'Not Submitted';

            renderVerificationCard(data);
        }
    } catch (err) {
        console.error('Error loading user profile:', err);
    }
}

// ============================================================
// 6b. VERIFIED LICENCE CARD
// ============================================================
function renderVerificationCard(userData) {
    const container = document.getElementById('verificationStatusCard');
    if (!container) return;

    const classes = normalizeLicenseArray(userData.licenseClasses);
    const status = userData.verificationStatus || 'Not Submitted';

    let html = '';

    if (status === 'Approved' && classes.length > 0) {
        html = `
            <div class="verify-card approved">
                <div class="verify-icon"><i class="fas fa-shield-alt"></i></div>
                <div class="verify-body">
                    <h4>Licence Verified</h4>
                    <p>Your verified classes: <strong>${escapeHtml(classes.join(', '))}</strong></p>
                    <span class="verify-badge">✓ Approved</span>
                </div>
            </div>
        `;
    } else if (status === 'Pending') {
        html = `
            <div class="verify-card pending">
                <div class="verify-icon"><i class="fas fa-clock"></i></div>
                <div class="verify-body">
                    <h4>Verification in Review</h4>
                    <p>Your documents are being reviewed. This usually takes 24–48 hours.</p>
                    <span class="verify-badge amber">⏳ Pending</span>
                </div>
            </div>
        `;
    } else if (status === 'Rejected') {
        html = `
            <div class="verify-card rejected">
                <div class="verify-icon"><i class="fas fa-times-circle"></i></div>
                <div class="verify-body">
                    <h4>Verification Rejected</h4>
                    <p>${escapeHtml(userData.adminNote || 'Your documents did not pass verification. Please resubmit with clearer images.')}</p>
                    <button class="btn-verify-now" onclick="scrollToVerificationForm()">
                        <i class="fas fa-redo"></i> Resubmit Documents
                    </button>
                </div>
            </div>
        `;
    } else {
        html = `
            <div class="verify-card none">
                <div class="verify-icon"><i class="fas fa-id-card"></i></div>
                <div class="verify-body">
                    <h4>Verify Your Licence</h4>
                    <p>You need a verified licence to book vehicles. Upload your IC and driving licence to get started.</p>
                    <button class="btn-verify-now" onclick="scrollToVerificationForm()">
                        <i class="fas fa-upload"></i> Verify Now
                    </button>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// ============================================================
// 6c. ENHANCED SCROLL-TO-FORM
// ============================================================
function scrollToVerificationForm() {
    const form = document.getElementById('verificationForm');
    if (!form) return;

    form.style.display = 'block';
    const submitted = document.getElementById('verificationSubmitted');
    if (submitted) submitted.style.display = 'none';

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });

    form.classList.add('highlight-pulse');
    setTimeout(() => form.classList.remove('highlight-pulse'), 2200);

    setTimeout(() => {
        const firstInput = document.getElementById('icFront');
        if (firstInput) firstInput.focus({ preventScroll: true });
    }, 700);
}
window.scrollToVerificationForm = scrollToVerificationForm;

// ============================================================
// 7. USERNAME EDIT
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    const editBtn = document.getElementById('editUsernameBtn');
    const saveBtn = document.getElementById('saveUsernameBtn');
    const cancelBtn = document.getElementById('cancelUsernameBtn');
    const form = document.getElementById('usernameEditForm');
    const input = document.getElementById('usernameInput');

    if (editBtn) {
        editBtn.addEventListener('click', function () {
            const current = profileUsernameDisplay.textContent;
            input.value = current === '—' ? '' : current;
            form.style.display = 'flex';
            this.style.display = 'none';
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            form.style.display = 'none';
            editBtn.style.display = 'inline-flex';
        });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', async function () {
            const newUsername = input.value.trim();
            if (!newUsername) { alert('Username cannot be empty.'); return; }
            try {
                await window.db.collection('users').doc(currentUser.uid).update({ username: newUsername });
                profileUsernameDisplay.textContent = newUsername;
                userNameDisplay.textContent = newUsername;
                form.style.display = 'none';
                editBtn.style.display = 'inline-flex';
                alert('Username updated.');
                setTimeout(() => location.reload(), 500);
            } catch (err) {
                alert('Failed to update: ' + err.message);
            }
        });
    }
});

// ============================================================
// 8. FETCH USER VEHICLES
// ============================================================
async function fetchUserVehicles(uid) {
    try {
        const snapshot = await window.db.collection('vehicles').where('ownerId', '==', uid).get();
        userVehicles = [];
        snapshot.forEach(doc => userVehicles.push({ id: doc.id, ...doc.data() }));
        userVehicles.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        if (userVehicles.length > 20) userVehicles = userVehicles.slice(0, 20);
        renderVehicles(userVehicles);
        if (vehicleCountBadge) vehicleCountBadge.textContent = userVehicles.length;
        updateQuickCategoryBadges();
    } catch (err) {
        console.error('Error fetching vehicles:', err);
    }
}

function renderVehicles(vehicles) {
    if (!vehiclesList) return;
    if (vehicles.length === 0) {
        vehiclesList.innerHTML = `<div class="empty-state"><i class="fas fa-car"></i><p>You haven't listed any vehicles yet.</p><a href="RentVehicle.html" class="action-btn" style="margin-top:12px;display:inline-flex; text-decoration:none;">List Your First Vehicle</a></div>`;
        return;
    }
    vehiclesList.innerHTML = vehicles.map(vehicle => {
        const statusClass = vehicle.approvalStatus === 'Approved' ? 'approved' : vehicle.approvalStatus === 'Rejected' ? 'rejected' : 'pending';
        return `<div class="dashboard-item">
            <div class="item-info">
                <span class="item-title">${escapeHtml(vehicle.brand || '')} ${escapeHtml(vehicle.model || '')}</span>
                <div class="item-sub">
                    <span><i class="fas fa-tag"></i> ${escapeHtml(vehicle.category || 'N/A')}</span>
                    <span><i class="fas fa-money-bill"></i> RM${vehicle.pricePerDay || 0}/day</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(vehicle.rentalLocation || vehicle.location || 'N/A')}</span>
                </div>
            </div>
            <span class="item-status status-${statusClass}">${escapeHtml(vehicle.approvalStatus || 'Pending')}</span>
            <div class="item-actions">
                <a href="VehicleDetails.html?id=${vehicle.id}" class="btn-sm-view"><i class="fas fa-eye"></i> View</a>
                <button class="btn-sm-edit" onclick="openEditVehicle('${vehicle.id}')"><i class="fas fa-edit"></i> Edit</button>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// 9. EDIT VEHICLE MODAL
// ============================================================
let editingVehicleId = null;

const editSpecTemplates = {
    'cars': `<div class="form-group"><label>Seats <span class="required">*</span></label><input type="number" id="editSeats" min="1" required /></div>
        <div class="form-group"><label>Transmission <span class="required">*</span></label><select id="editTransmission" required><option value="Automatic">Automatic</option><option value="Manual">Manual</option></select></div>
        <div class="form-group"><label>Fuel Type <span class="required">*</span></label><select id="editFuelType" required><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option><option value="Electric">Electric</option></select></div>
        <div class="form-group"><label>Engine Capacity <span class="required">*</span></label><input type="text" id="editEngineCapacity" required /></div>`,
    'motorcycles': `<div class="form-group"><label>Engine Capacity (cc) <span class="required">*</span></label><input type="number" id="editEngineCapacity" min="50" required /></div>
        <div class="form-group"><label>Transmission <span class="required">*</span></label><select id="editTransmission" required><option value="Manual">Manual</option><option value="Automatic">Automatic</option></select></div>
        <div class="form-group"><label>Fuel Type <span class="required">*</span></label><select id="editFuelType" required><option value="Petrol">Petrol</option><option value="Electric">Electric</option></select></div>
        <div class="form-group"><label>Seats <span class="required">*</span></label><input type="number" id="editSeats" min="1" required /></div>`,
    '4x4': `<div class="form-group"><label>Seats <span class="required">*</span></label><input type="number" id="editSeats" min="1" required /></div>
        <div class="form-group"><label>Transmission <span class="required">*</span></label><select id="editTransmission" required><option value="Automatic">Automatic</option><option value="Manual">Manual</option></select></div>
        <div class="form-group"><label>Fuel Type <span class="required">*</span></label><select id="editFuelType" required><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option></select></div>
        <div class="form-group"><label>Engine Capacity <span class="required">*</span></label><input type="text" id="editEngineCapacity" required /></div>
        <div class="form-group"><label>4WD System <span class="required">*</span></label><input type="text" id="editDriveType" required /></div>`,
    'trucks': `<div class="form-group"><label>Truck Type <span class="required">*</span></label><select id="editTruckType" required><option value="Light Duty">Light Duty</option><option value="Medium Duty">Medium Duty</option><option value="Heavy Duty">Heavy Duty</option></select></div>
        <div class="form-group"><label>Wheel Config <span class="required">*</span></label><select id="editWheelConfig" required><option value="4x2">4x2</option><option value="6x4">6x4</option><option value="8x4">8x4</option></select></div>
        <div class="form-group"><label>GVW (kg) <span class="required">*</span></label><input type="number" id="editGvw" min="1000" required /></div>
        <div class="form-group"><label>Payload (kg) <span class="required">*</span></label><input type="number" id="editPayload" min="100" required /></div>`,
    'heavy-machinery': `<div class="form-group"><label>Equipment Type <span class="required">*</span></label><select id="editEquipmentType" required><option value="Excavator">Excavator</option><option value="Motor Grader">Motor Grader</option><option value="Wheel Loader">Wheel Loader</option><option value="Scissor Lift">Scissor Lift</option><option value="Boom Lift">Boom Lift</option></select></div>
        <div class="form-group"><label>Operating Weight (kg) <span class="required">*</span></label><input type="number" id="editOperatingWeight" min="100" required /></div>
        <div class="form-group"><label>Operating Hours <span class="required">*</span></label><input type="number" id="editOperatingHours" min="0" required /></div>`
};

function openEditVehicle(vehicleId) {
    const vehicle = userVehicles.find(v => v.id === vehicleId);
    if (!vehicle) { alert('Vehicle not found.'); return; }
    editingVehicleId = vehicleId;
    document.getElementById('editVehicleModal').style.display = 'flex';
    document.getElementById('editCategory').value = vehicle.category || 'cars';
    document.getElementById('editBrand').value = vehicle.brand || '';
    document.getElementById('editModel').value = vehicle.model || '';
    document.getElementById('editYear').value = vehicle.year || '';
    document.getElementById('editColor').value = vehicle.color || '';
    document.getElementById('editRegistration').value = vehicle.registrationNumber || '';
    document.getElementById('editPrice').value = vehicle.pricePerDay || '';
    document.getElementById('editLocation').value = vehicle.rentalLocation || vehicle.location || '';
    document.getElementById('editDescription').value = vehicle.description || '';
    const category = vehicle.category || 'cars';
    const specsContainer = document.getElementById('editSpecsContainer');
    specsContainer.innerHTML = editSpecTemplates[category] || editSpecTemplates['cars'];

    if (category === 'cars' || category === '4x4') {
        document.getElementById('editSeats').value = vehicle.seats || '';
        document.getElementById('editTransmission').value = vehicle.transmission || '';
        document.getElementById('editFuelType').value = vehicle.fuelType || '';
        document.getElementById('editEngineCapacity').value = vehicle.engineCapacity || '';
        if (category === '4x4') document.getElementById('editDriveType').value = vehicle.driveType || '';
    } else if (category === 'motorcycles') {
        document.getElementById('editEngineCapacity').value = vehicle.engineCapacity || '';
        document.getElementById('editTransmission').value = vehicle.transmission || '';
        document.getElementById('editFuelType').value = vehicle.fuelType || '';
        document.getElementById('editSeats').value = vehicle.seats || '';
    } else if (category === 'trucks') {
        document.getElementById('editTruckType').value = vehicle.truckType || '';
        document.getElementById('editWheelConfig').value = vehicle.wheelConfig || '';
        document.getElementById('editGvw').value = vehicle.gvw || '';
        document.getElementById('editPayload').value = vehicle.payload || '';
    } else if (category === 'heavy-machinery') {
        document.getElementById('editEquipmentType').value = vehicle.equipmentType || '';
        document.getElementById('editOperatingWeight').value = vehicle.operatingWeight || '';
        document.getElementById('editOperatingHours').value = vehicle.operatingHours || '';
    }
}

function closeEditVehicleModal() {
    document.getElementById('editVehicleModal').style.display = 'none';
    editingVehicleId = null;
}
window.closeEditVehicleModal = closeEditVehicleModal;
window.openEditVehicle = openEditVehicle;

document.getElementById('editVehicleForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!editingVehicleId) { alert('No vehicle selected.'); return; }

    const category = document.getElementById('editCategory').value;
    const brand = document.getElementById('editBrand').value.trim();
    const model = document.getElementById('editModel').value.trim();
    const year = parseInt(document.getElementById('editYear').value);
    const color = document.getElementById('editColor').value.trim();
    const registration = document.getElementById('editRegistration').value.trim();
    const price = parseFloat(document.getElementById('editPrice').value);
    const location = document.getElementById('editLocation').value.trim();
    const description = document.getElementById('editDescription').value.trim();

    if (!brand || !model || !year || !color || !registration || !price || !location || !description) {
        alert('Please fill in all required fields.');
        return;
    }

    const updateData = { brand, model, year, color, registrationNumber: registration, pricePerDay: price, rentalLocation: location, description, category, approvalStatus: 'Pending', adminNote: 'Edited by owner – pending re-approval.' };

    if (category === 'cars' || category === '4x4') {
        updateData.seats = parseInt(document.getElementById('editSeats').value);
        updateData.transmission = document.getElementById('editTransmission').value;
        updateData.fuelType = document.getElementById('editFuelType').value;
        updateData.engineCapacity = document.getElementById('editEngineCapacity').value;
        if (category === '4x4') updateData.driveType = document.getElementById('editDriveType').value;
    } else if (category === 'motorcycles') {
        updateData.engineCapacity = parseInt(document.getElementById('editEngineCapacity').value);
        updateData.transmission = document.getElementById('editTransmission').value;
        updateData.fuelType = document.getElementById('editFuelType').value;
        updateData.seats = parseInt(document.getElementById('editSeats').value);
    } else if (category === 'trucks') {
        updateData.truckType = document.getElementById('editTruckType').value;
        updateData.wheelConfig = document.getElementById('editWheelConfig').value;
        updateData.gvw = parseInt(document.getElementById('editGvw').value);
        updateData.payload = parseInt(document.getElementById('editPayload').value);
    } else if (category === 'heavy-machinery') {
        updateData.equipmentType = document.getElementById('editEquipmentType').value;
        updateData.operatingWeight = parseInt(document.getElementById('editOperatingWeight').value);
        updateData.operatingHours = parseInt(document.getElementById('editOperatingHours').value);
    }

    const submitBtn = document.getElementById('editSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
        await window.db.collection('vehicles').doc(editingVehicleId).update(updateData);
        alert('Vehicle updated successfully. It will be reviewed by admin again.');
        closeEditVehicleModal();
        refreshDashboardData();
    } catch (err) {
        console.error('Update error:', err);
        alert('Failed to update: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Vehicle';
    }
});

// ============================================================
// 10. FETCH MY BOOKINGS (as renter)
// ============================================================
async function fetchUserBookings(uid) {
    try {
        const snapshot = await window.db.collection('bookings').where('renterId', '==', uid).get();
        userBookings = [];
        snapshot.forEach(doc => userBookings.push({ id: doc.id, ...doc.data() }));
        userBookings.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        if (userBookings.length > 20) userBookings = userBookings.slice(0, 20);
        renderBookings(userBookings);
        if (bookingCountBadge) bookingCountBadge.textContent = userBookings.length;
        updateQuickCategoryBadges();
    } catch (err) {
        console.error('Error fetching bookings:', err);
    }
}

function renderBookings(bookings) {
    if (!bookingsList) return;
    if (bookings.length === 0) {
        bookingsList.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>You have no bookings yet.</p><a href="Vehicles.html" class="action-btn" style="margin-top:12px;display:inline-flex; text-decoration:none;">Browse Vehicles</a></div>`;
        return;
    }
    bookingsList.innerHTML = bookings.map(b => {
        const statusClass = (b.status || 'pending').toLowerCase();
        return `<div class="dashboard-item">
            <div class="item-info">
                <span class="item-title">${escapeHtml(b.vehicleName || 'Vehicle')}</span>
                <div class="item-sub">
                    <span><i class="fas fa-calendar"></i> ${escapeHtml(b.pickupDate || b.dates?.from || 'N/A')} – ${escapeHtml(b.returnDate || b.dates?.to || 'N/A')}</span>
                    <span><i class="fas fa-money-bill"></i> RM${b.totalPrice || 0}</span>
                </div>
            </div>
            <span class="item-status status-${statusClass}">${escapeHtml(b.status || 'Pending')}</span>
        </div>`;
    }).join('');
}

// ============================================================
// 11. FETCH RENTAL REQUESTS (as owner)
// ============================================================
async function fetchRentalRequests(uid) {
    try {
        const snapshot = await window.db.collection('bookings').where('ownerId', '==', uid).get();
        rentalRequests = [];
        snapshot.forEach(doc => rentalRequests.push({ id: doc.id, ...doc.data() }));
        rentalRequests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        if (rentalRequests.length > 20) rentalRequests = rentalRequests.slice(0, 20);
        renderRentalRequests(rentalRequests);
        if (rentalRequestsCountBadge) rentalRequestsCountBadge.textContent = rentalRequests.length;
        if (rentalRequestsTabBadge) rentalRequestsTabBadge.textContent = rentalRequests.length;
        updateQuickCategoryBadges();
    } catch (err) {
        console.error('Error fetching rental requests:', err);
        if (rentalRequestsList) {
            rentalRequestsList.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Could not load rental requests.</p></div>`;
        }
    }
}

function renderRentalRequests(requests) {
    if (!rentalRequestsList) return;
    if (requests.length === 0) {
        rentalRequestsList.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No rental requests yet.<br>When someone books one of your vehicles, it will appear here.</p></div>`;
        return;
    }

    rentalRequestsList.innerHTML = requests.map(r => {
        const status = r.status || 'Pending';
        const statusLower = status.toLowerCase();
        const unlocked = canSeeRenterContact(status);

        const phone = r.renterPhone || '';
        const email = r.renterEmail || '';
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        const telHref = cleanPhone ? `tel:${cleanPhone}` : '#';
        const waHref = cleanPhone ? `https://wa.me/${cleanPhone.replace(/\+/g, '')}` : '#';

        const contactBlock = unlocked ? `
            <div class="renter-contact unlocked">
                <div class="contact-row">
                    <i class="fas fa-user"></i>
                    <span>${escapeHtml(r.renterName || 'N/A')}</span>
                </div>
                <div class="contact-row">
                    <i class="fas fa-phone"></i>
                    ${phone ? `<a href="${telHref}">${escapeHtml(phone)}</a>` : '<span>Not provided</span>'}
                </div>
                <div class="contact-row">
                    <i class="fas fa-envelope"></i>
                    ${email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : '<span>Not provided</span>'}
                </div>
                ${r.licenceType ? `<div class="contact-row"><i class="fas fa-id-card"></i><span>License: ${escapeHtml(r.licenceType)}</span></div>` : ''}
                <div class="contact-actions">
                    ${phone ? `<a href="${telHref}" class="btn-contact"><i class="fas fa-phone"></i> Call</a>` : ''}
                    ${phone ? `<a href="${waHref}" target="_blank" rel="noopener" class="btn-contact whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
                    ${email ? `<a href="mailto:${escapeHtml(email)}" class="btn-contact email"><i class="fas fa-envelope"></i> Email</a>` : ''}
                </div>
            </div>
        ` : `
            <div class="renter-contact locked">
                <i class="fas fa-lock"></i>
                <span>Contact details unlock after admin approval</span>
            </div>
        `;

        const qtyLine = r.quantity && r.quantity > 1
            ? `<span><i class="fas fa-cubes"></i> ${r.quantity} units</span>`
            : '';

        // OWNER RETURN-HANDOVER BUTTON — only show when booking is Active
        const returnButton = statusLower === 'active' ? `
            <button class="btn-owner-received" data-booking-id="${r.id}">
                <i class="fas fa-undo-alt"></i>
                I've Received the Vehicle Back
            </button>
        ` : '';

        return `<div class="dashboard-item rental-request-item">
            <div class="item-info">
                <span class="item-title">${escapeHtml(r.vehicleName || 'Vehicle')}</span>
                <div class="item-sub">
                    <span><i class="fas fa-calendar"></i> ${escapeHtml(r.pickupDate || 'N/A')} – ${escapeHtml(r.returnDate || 'N/A')}</span>
                    <span><i class="fas fa-money-bill"></i> RM${r.totalPrice || 0}</span>
                    ${qtyLine}
                </div>
            </div>
            <span class="item-status status-${statusLower}">${escapeHtml(status)}</span>
            ${contactBlock}
            ${returnButton}
        </div>`;
    }).join('');
}

// ============================================================
// 11b. OWNER RETURN HANDOVER — "I've Received the Vehicle Back"
// ============================================================
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-owner-received');
    if (!btn) return;

    const bookingId = btn.dataset.bookingId;
    if (!bookingId) return;

    const confirmed = confirm(
        'Confirm you have received the vehicle back from the renter?\n\n' +
        'Only proceed if you have:\n' +
        '• Inspected the vehicle for damage\n' +
        '• Checked fuel / charge level\n' +
        '• Received the keys back'
    );
    if (!confirmed) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';

    try {
        await window.db.collection('bookings').doc(bookingId).update({
            ownerReceivedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ownerReceivedBy: currentUser ? currentUser.uid : null,
            status: 'Completed'
        });

        btn.innerHTML = '<i class="fas fa-check"></i> Completed';
        btn.classList.add('done');

        setTimeout(() => {
            if (confirm('Booking completed! Would you like to leave a review for the renter?')) {
                window.location.href = `Reviews.html?booking=${bookingId}`;
            } else {
                refreshDashboardData();
            }
        }, 600);
    } catch (err) {
        console.error('Return handover error:', err);
        alert('Failed to confirm. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-undo-alt"></i> I\'ve Received the Vehicle Back';
    }
});

// ============================================================
// 12. FETCH USER REVIEWS
// ============================================================
async function fetchUserReviews(uid) {
    try {
        const snapshot = await window.db.collection('reviews').where('renterId', '==', uid).get();
        console.log('User reviews:', snapshot.size);
    } catch (err) {
        console.warn('Could not fetch reviews:', err);
    }
}

// ============================================================
// 13. FETCH FAVOURITES
// ============================================================
async function fetchFavourites(uid) {
    try {
        const userDoc = await window.db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            if (favouritesList) favouritesList.innerHTML = `<div class="empty-state"><i class="fas fa-heart"></i><p>No favourites yet.</p></div>`;
            userFavourites = [];
            updateQuickCategoryBadges();
            return;
        }
        const favouriteIds = userDoc.data().favourites || [];
        if (favouriteIds.length === 0) {
            if (favouritesList) favouritesList.innerHTML = `<div class="empty-state"><i class="fas fa-heart"></i><p>No favourites yet.</p></div>`;
            userFavourites = [];
            updateQuickCategoryBadges();
            return;
        }
        const snaps = await Promise.all(favouriteIds.map(id => window.db.collection('vehicles').doc(id).get()));
        userFavourites = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
        renderFavourites(userFavourites);
        updateQuickCategoryBadges();
    } catch (err) {
        console.error('Error fetching favourites:', err);
    }
}

function renderFavourites(favourites) {
    if (!favouritesList) return;
    if (favourites.length === 0) {
        favouritesList.innerHTML = `<div class="empty-state"><i class="fas fa-heart"></i><p>No favourites yet.</p></div>`;
        return;
    }
    favouritesList.innerHTML = favourites.map(v => {
        const img = (v.images && v.images[0]) ? v.images[0] : 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22250%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%2311141A%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23D4AF37%22 font-family=%22Inter%22 font-size=%2216%22 text-anchor=%22middle%22 dy=%22.3em%22>No Image</text></svg>';
        return `<div class="dashboard-item">
            <div style="display:flex; align-items:center; gap:16px; flex:1;">
                <img src="${img}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;" />
                <div class="item-info">
                    <span class="item-title">${escapeHtml(v.brand)} ${escapeHtml(v.model)}</span>
                    <div class="item-sub"><span>RM${v.pricePerDay}/day</span></div>
                </div>
            </div>
            <div class="item-actions">
                <a href="VehicleDetails.html?id=${v.id}" class="btn-sm-view"><i class="fas fa-eye"></i> View</a>
                <button class="btn-sm-edit" onclick="removeFavourite('${v.id}')"><i class="fas fa-heart-broken"></i> Remove</button>
            </div>
        </div>`;
    }).join('');
}

async function removeFavourite(vehicleId) {
    if (!currentUser) return;
    try {
        await window.db.collection('users').doc(currentUser.uid).update({
            favourites: firebase.firestore.FieldValue.arrayRemove(vehicleId)
        });
        await fetchFavourites(currentUser.uid);
        alert('Removed from favourites.');
    } catch (err) {
        alert('Failed to remove: ' + err.message);
    }
}
window.removeFavourite = removeFavourite;

// ============================================================
// 14. UPDATE STATS (now just updates quick-category counts)
// ============================================================
function updateStats() {
    updateQuickCategoryBadges();
}

// ============================================================
// 15. LOAD VERIFICATION STATUS (badge + form toggle)
// ============================================================
async function loadVerificationStatus(uid) {
    try {
        const doc = await window.db.collection('verification').doc(uid).get();
        const badgeSmall = document.getElementById('verificationBadge');
        const badgeLarge = document.getElementById('verificationStatusBadgeLarge');
        const statusEl = document.getElementById('verificationStatus');
        const formEl = document.getElementById('verificationForm');
        const submittedEl = document.getElementById('verificationSubmitted');

        if (!doc.exists) {
            if (badgeSmall) { badgeSmall.className = 'badge-pill pending'; badgeSmall.innerHTML = '<i class="fas fa-clock"></i> Pending Verification'; }
            if (badgeLarge) badgeLarge.textContent = 'Pending';
            if (statusEl) { statusEl.className = 'verification-badge pending'; statusEl.innerHTML = '<i class="fas fa-clock"></i> Not verified — please submit your documents.'; }
            if (formEl) formEl.style.display = 'block';
            if (submittedEl) submittedEl.style.display = 'none';
            return;
        }
        const data = doc.data();
        const status = data.status || 'Pending';
        if (status === 'Approved') {
            if (badgeSmall) { badgeSmall.className = 'badge-pill approved'; badgeSmall.innerHTML = '<i class="fas fa-check-circle"></i> Verified'; }
            if (badgeLarge) badgeLarge.textContent = 'Approved';
            if (statusEl) { statusEl.className = 'verification-badge approved'; statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Verified – You can book vehicles.'; }
            if (formEl) formEl.style.display = 'none';
            if (submittedEl) submittedEl.style.display = 'none';
        } else if (status === 'Rejected') {
            if (badgeSmall) { badgeSmall.className = 'badge-pill rejected'; badgeSmall.innerHTML = '<i class="fas fa-times-circle"></i> Rejected'; }
            if (badgeLarge) badgeLarge.textContent = 'Rejected';
            if (statusEl) { statusEl.className = 'verification-badge rejected'; statusEl.innerHTML = `<i class="fas fa-times-circle"></i> Rejected: ${escapeHtml(data.adminNote || 'No reason provided.')}`; }
            if (formEl) formEl.style.display = 'block';
            if (submittedEl) submittedEl.style.display = 'none';
        } else {
            if (badgeSmall) { badgeSmall.className = 'badge-pill pending'; badgeSmall.innerHTML = '<i class="fas fa-clock"></i> Pending Verification'; }
            if (badgeLarge) badgeLarge.textContent = 'Pending';
            if (statusEl) { statusEl.className = 'verification-badge pending'; statusEl.innerHTML = '<i class="fas fa-clock"></i> Your documents are being reviewed.'; }
            if (formEl) formEl.style.display = 'none';
            if (submittedEl) submittedEl.style.display = 'block';
        }
    } catch (err) { console.error('Error loading verification status:', err); }
}

// ============================================================
// 16. VERIFICATION SUBMISSION (CLOUDINARY)
// ============================================================
document.getElementById('verificationForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!currentUser) { alert('Please log in first.'); return; }

    const icFront = document.getElementById('icFront').files[0];
    const icBack = document.getElementById('icBack').files[0];
    const licenseImage = document.getElementById('licenseImage').files[0];
    const idNumber = document.getElementById('idNumber').value.trim();
    const idFullName = document.getElementById('idFullName').value.trim();
    const licenseNumber = document.getElementById('licenseNumber').value.trim();
    const licenseExpiry = document.getElementById('licenseExpiry').value;
    const checkedClasses = document.querySelectorAll('.license-classes-grid input[type="checkbox"]:checked');
    const licenseClasses = Array.from(checkedClasses).map(cb => cb.value);

    if (!icFront || !icBack || !licenseImage || !idNumber || !idFullName || !licenseNumber || !licenseExpiry || licenseClasses.length === 0) {
        alert('Please fill in all fields and upload all required images.');
        return;
    }

    const submitBtn = document.getElementById('verifySubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const db = window.db;
        const uid = currentUser.uid;

        const [icFrontC, icBackC, licenseC] = await Promise.all([
            compressImage(icFront, 1200, 1200, 0.85),
            compressImage(icBack, 1200, 1200, 0.85),
            compressImage(licenseImage, 1200, 1200, 0.85)
        ]);

        const [icFrontUrl, icBackUrl, licenseUrl] = await Promise.all([
            uploadFileToCloudinary(icFrontC, 'verification'),
            uploadFileToCloudinary(icBackC, 'verification'),
            uploadFileToCloudinary(licenseC, 'verification')
        ]);

        await db.collection('verification').doc(uid).set({
            uid,
            idNumber,
            idFullName,
            icFront: icFrontUrl,
            icBack: icBackUrl,
            licenseNumber,
            licenseExpiry,
            licenseClasses,
            licenseImage: licenseUrl,
            status: 'Pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            adminNote: ''
        });

        await db.collection('users').doc(uid).update({
            verificationStatus: 'Pending',
            licenseClasses: licenseClasses
        });

        submitBtn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
        document.getElementById('verificationForm').style.display = 'none';
        document.getElementById('verificationSubmitted').style.display = 'block';
        document.getElementById('verificationStatus').className = 'verification-badge pending';
        document.getElementById('verificationStatus').innerHTML = '<i class="fas fa-clock"></i> Your documents are being reviewed.';

        alert('Verification documents submitted successfully.');
        loadVerificationStatus(uid);

        const doc = await window.db.collection('users').doc(uid).get();
        if (doc.exists) renderVerificationCard(doc.data());

    } catch (err) {
        console.error('Verification upload error:', err);
        alert('Upload failed: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit for Verification';
    }
});

// ============================================================
// 17. LOAD RECENT ACTIVITY
// ============================================================
async function loadRecentActivity(uid) {
    const container = document.getElementById('recentActivityList');
    const activityCount = document.getElementById('activityCount');
    if (!container) return;
    container.style.overflowX = 'auto';

    try {
        const [bookingsSnap, vehiclesSnap] = await Promise.all([
            window.db.collection('bookings').where('renterId', '==', uid).get(),
            window.db.collection('vehicles').where('ownerId', '==', uid).get()
        ]);

        const activities = [];
        bookingsSnap.forEach(doc => {
            const d = doc.data();
            activities.push({
                id: doc.id, type: 'booking',
                title: d.vehicleName || 'Vehicle Booking',
                status: d.status || 'Pending',
                date: d.createdAt ? new Date(d.createdAt.seconds * 1000) : new Date(),
                details: `${d.pickupDate || 'N/A'} – ${d.returnDate || 'N/A'}`,
                price: d.totalPrice || 0
            });
        });
        vehiclesSnap.forEach(doc => {
            const d = doc.data();
            activities.push({
                id: doc.id, type: 'vehicle',
                title: `${d.brand || ''} ${d.model || ''}`.trim() || 'Vehicle Listed',
                status: d.approvalStatus || 'Pending',
                date: d.createdAt ? new Date(d.createdAt.seconds * 1000) : new Date(),
                details: `${d.category || ''} · ${d.rentalLocation || d.location || ''}`,
                price: d.pricePerDay || 0
            });
        });

        activities.sort((a, b) => b.date - a.date);
        const topActivities = activities.slice(0, 10);
        if (activityCount) activityCount.textContent = topActivities.length;

        if (topActivities.length === 0) {
            container.style.overflowX = 'hidden';
            container.innerHTML = `<div class="empty-state" style="padding:20px; text-align:center; width:100%;"><i class="fas fa-inbox"></i><p>No recent activity.</p></div>`;
            return;
        }

        container.innerHTML = topActivities.map(item => {
            const icon = item.type === 'booking' ? 'fa-calendar-check' : 'fa-car';
            const statusClass = (item.status || '').toLowerCase();
            const statusLabel = item.status || 'Pending';
            const timeAgo = timeSince(item.date);

            return `<div class="activity-item">
                <div class="activity-icon"><i class="fas ${icon}"></i></div>
                <div class="activity-content">
                    <div class="title">${escapeHtml(item.title)}</div>
                    <div class="meta">
                        ${escapeHtml(item.details)} · <span class="item-status status-${statusClass}" style="font-size:0.7rem;padding:1px 10px;">${escapeHtml(statusLabel)}</span>
                        ${item.price ? ` · RM${item.price}` : ''}
                    </div>
                </div>
                <div class="activity-time">${timeAgo}</div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error('Error loading recent activity:', err);
        if (container) {
            container.style.overflowX = 'hidden';
            container.innerHTML = `<div class="empty-state" style="padding:20px; text-align:center; width:100%;"><i class="fas fa-exclamation-circle"></i><p>Could not load activity.</p></div>`;
        }
        if (activityCount) activityCount.textContent = '0';
    }
}

// ============================================================
// 18. HELPER: TIME SINCE
// ============================================================
function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
    return 'Just now';
}

// ============================================================
// 19. REFRESH DASHBOARD DATA
// ============================================================
async function refreshDashboardData() {
    if (currentUser) {
        await Promise.all([
            fetchUserVehicles(currentUser.uid),
            fetchUserBookings(currentUser.uid),
            fetchRentalRequests(currentUser.uid),
            fetchUserReviews(currentUser.uid),
            fetchFavourites(currentUser.uid),
            loadRecentActivity(currentUser.uid)
        ]);
    }
}

// ============================================================
// 20. LOGOUT
// ============================================================
document.getElementById('logoutBtn').addEventListener('click', async function () {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await window.auth.signOut();
            window.location.href = 'MainPage.html';
        } catch (err) {
            console.error('Logout error:', err);
            alert('Logout failed. Please try again.');
        }
    }
});

// ============================================================
// 21. PROFILE PICTURE UPLOAD (CLOUDINARY)
// ============================================================
async function uploadToCloudinary(file) {
    if (!currentUser) {
        alert('Please log in first.');
        return;
    }

    const buttons = document.querySelectorAll('.avatar-upload-btn, .avatar-upload-btn-enhanced');
    buttons.forEach(btn => {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    });

    try {
        const compressed = await compressImage(file, 400, 400, 0.8);
        const url = await uploadFileToCloudinary(compressed, 'avatars');

        await window.db.collection('users').doc(currentUser.uid).update({
            profilePicture: url
        });

        if (profileAvatarLargeImg) {
            profileAvatarLargeImg.src = url;
            profileAvatarLargeImg.style.display = 'block';
        }
        if (profileInitialLarge) profileInitialLarge.style.display = 'none';

        const smallImg = document.getElementById('profileAvatarImg');
        if (smallImg) {
            smallImg.src = url;
            smallImg.style.display = 'block';
            document.getElementById('profileInitial').style.display = 'none';
        }

        alert('Profile picture updated successfully.');
        setTimeout(() => location.reload(), 500);

    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed: ' + err.message);
    } finally {
        buttons.forEach(btn => {
            btn.innerHTML = '<i class="fas fa-camera"></i>';
            btn.disabled = false;
        });
        const a1 = document.getElementById('avatarUpload');
        const a2 = document.getElementById('avatarUploadLarge');
        if (a1) a1.value = '';
        if (a2) a2.value = '';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const avatarInput = document.getElementById('avatarUpload');
    const avatarInputLarge = document.getElementById('avatarUploadLarge');
    if (avatarInput) {
        avatarInput.addEventListener('change', function () {
            if (this.files && this.files[0]) uploadToCloudinary(this.files[0]);
        });
    }
    if (avatarInputLarge) {
        avatarInputLarge.addEventListener('change', function () {
            if (this.files && this.files[0]) uploadToCloudinary(this.files[0]);
        });
    }
});

// ============================================================
// 22. AUTH STATE LISTENER
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    if (window.auth) {
        window.auth.onAuthStateChanged(function (user) {
            if (user) {
                loadDashboard(user);
            } else {
                alert('Please log in to access your dashboard.');
                window.location.href = 'LogIn.html';
            }
        });
    } else {
        console.error('Firebase auth not available');
        alert('Firebase is not initialized. Please check your configuration.');
    }
});