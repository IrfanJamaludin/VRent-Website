// AdminPanel.js - COMPLETE (with reviews moderation, drag-drop images, and all sections)

// ============================================================
// CLOUDINARY CONFIG
// ============================================================
const ADMIN_CLOUD_NAME = 'ggxrhjdr';
const ADMIN_UPLOAD_PRESET = 'vrent_avatar';

// ============================================================
// ADMIN PANEL OBJECT
// ============================================================
const AdminPanel = {

    // ---------- STATE ----------
    allVehicles: [],
    allBookings: [],
    allUsers: [],
    allVerifications: [],
    allReviews: [],
    currentDeleteTarget: null,
    currentRejectTarget: null,
    currentPreviewVehicleId: null,
    currentEditVehicleId: null,
    currentFilter: 'flagged',

    // ============================================================
    // AUTH
    // ============================================================
    initAuth() {
        return new Promise((resolve) => {
            if (!window.auth) {
                console.error('❌ Firebase auth not available');
                resolve(false);
                return;
            }

            window.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    try {
                        const doc = await window.db.collection('users').doc(user.uid).get();
                        if (doc.exists && doc.data().role === 'admin') {
                            const name = doc.data().firstName || doc.data().username || 'Admin';
                            const emailEl = document.getElementById('dashboardAdminEmail');
                            const nameEl = document.getElementById('dashboardAdminName');
                            if (nameEl) nameEl.textContent = name;
                            if (emailEl) emailEl.textContent = user.email || 'admin@vrent.com';
                            console.log('✅ Admin authenticated:', user.email);
                            resolve(true);
                        } else {
                            alert('Access denied. You are not an admin.');
                            window.location.href = 'Home.html';
                            resolve(false);
                        }
                    } catch (err) {
                        console.error('❌ Auth error:', err);
                        alert('Error checking admin role.');
                        window.location.href = 'Home.html';
                        resolve(false);
                    }
                } else {
                    window.location.href = 'LogIn.html';
                    resolve(false);
                }
            });
        });
    },

    // ============================================================
    // FETCH HELPERS
    // ============================================================
    async fetchVehicles() {
        try {
            const snap = await window.db.collection('vehicles').get();
            this.allVehicles = [];
            snap.forEach(doc => this.allVehicles.push({ id: doc.id, ...doc.data() }));
            console.log(`✅ Loaded ${this.allVehicles.length} vehicles`);
            return this.allVehicles;
        } catch (err) { console.error('❌ Vehicles:', err); this.allVehicles = []; return []; }
    },
    async fetchBookings() {
        try {
            const snap = await window.db.collection('bookings').get();
            this.allBookings = [];
            snap.forEach(doc => this.allBookings.push({ id: doc.id, ...doc.data() }));
            return this.allBookings;
        } catch (err) { console.error('❌ Bookings:', err); this.allBookings = []; return []; }
    },
    async fetchUsers() {
        try {
            const snap = await window.db.collection('users').get();
            this.allUsers = [];
            snap.forEach(doc => this.allUsers.push({ id: doc.id, ...doc.data() }));
            return this.allUsers;
        } catch (err) { console.error('❌ Users:', err); this.allUsers = []; return []; }
    },
    async fetchVerifications() {
        try {
            const snap = await window.db.collection('verification').get();
            this.allVerifications = [];
            snap.forEach(doc => this.allVerifications.push({ id: doc.id, ...doc.data() }));
            return this.allVerifications;
        } catch (err) { console.error('❌ Verifications:', err); this.allVerifications = []; return []; }
    },
    async fetchReviews() {
        try {
            const snap = await window.db.collection('reviews').get();
            this.allReviews = [];
            snap.forEach(doc => this.allReviews.push({ id: doc.id, ...doc.data() }));
            this.allReviews.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            return this.allReviews;
        } catch (err) { console.error('❌ Reviews:', err); this.allReviews = []; return []; }
    },

    // ============================================================
    // DASHBOARD
    // ============================================================
    async initDashboard() {
        await this.initAuth();
        await Promise.all([
            this.fetchVehicles(),
            this.fetchBookings(),
            this.fetchUsers(),
            this.fetchVerifications(),
            this.fetchReviews()
        ]);
        this.renderStats();
        this.renderRecentActivity();
    },

    renderStats() {
        const pending = this.allVehicles.filter(v => v.approvalStatus === 'Pending').length;
        const approved = this.allVehicles.filter(v => v.approvalStatus === 'Approved' && v.availability === 'Available').length;
        const pendingVer = this.allVerifications.filter(v => v.status === 'Pending').length;
        const flaggedReviews = this.allReviews.filter(r => r.flagged || r.status === 'Flagged').length;

        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setEl('pendingCount', pending);
        setEl('approvedCount', approved);
        setEl('totalVehicles', this.allVehicles.length);
        setEl('totalUsers', this.allUsers.length);
        setEl('pendingVerifications', pendingVer);
        setEl('totalBookings', this.allBookings.length);

        const badge = document.getElementById('quickVerBadge');
        if (badge) badge.textContent = pendingVer;

        const reviewBadge = document.getElementById('quickReviewBadge');
        if (reviewBadge) reviewBadge.textContent = flaggedReviews;
    },

    renderRecentActivity() {
        const container = document.getElementById('recentActivityList');
        if (!container) return;

        const activities = [];

        // Pending verifications
        this.allVerifications.filter(v => v.status === 'Pending').forEach(v => {
            activities.push({
                type: 'verification',
                id: v.id,
                title: `🔔 Verification from ${v.idFullName || 'Unknown'}`,
                time: v.submittedAt ? new Date(v.submittedAt.seconds * 1000).toLocaleString() : 'Just now',
                status: 'pending',
                details: `IC: ${v.idNumber || 'N/A'}`
            });
        });

        // Pending vehicles
        this.allVehicles.filter(v => v.approvalStatus === 'Pending').forEach(v => {
            activities.push({
                type: 'vehicle',
                id: v.id,
                title: `🚗 New vehicle "${v.brand || ''} ${v.model || ''}"`,
                time: v.submittedAt ? new Date(v.submittedAt.seconds * 1000).toLocaleString() : 'Just now',
                status: 'pending',
                details: `${v.category || 'N/A'} · RM ${v.pricePerDay || 0}/day`
            });
        });

        // Flagged reviews
        this.allReviews.filter(r => r.flagged || r.status === 'Flagged').forEach(r => {
            activities.push({
                type: 'review',
                id: r.id,
                title: `⚠️ Flagged review on "${r.vehicleName || 'Vehicle'}"`,
                time: r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString() : 'Just now',
                status: 'flagged',
                details: `By ${r.renterName || 'Anonymous'} · ${r.rating || 0}★`
            });
        });

        // Recent bookings
        this.allBookings.slice(0, 5).forEach(b => {
            activities.push({
                type: 'booking',
                id: b.id,
                title: `📅 Booking for "${b.vehicleName || 'Vehicle'}"`,
                time: b.createdAt ? new Date(b.createdAt.seconds * 1000).toLocaleString() : 'Just now',
                status: b.status || 'pending',
                details: `${b.renterName || 'Someone'} · RM ${b.totalPrice || 0}`
            });
        });

        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        const top = activities.slice(0, 10);

        if (top.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent activity</p></div>`;
            return;
        }

        container.innerHTML = top.map(item => {
            const statusColor = item.status === 'pending' ? '#D97706'
                              : item.status === 'approved' ? '#059669'
                              : item.status === 'flagged' ? '#DC2626'
                              : '#4A5568';
            return `<div class="activity-item" onclick="AdminPanel.viewActivityItem('${item.type}', '${item.id}')" style="cursor:pointer;">
                <div class="activity-text">
                    <span style="font-weight:500;">${item.title}</span>
                    <span style="font-size:0.8rem;color:#88909C;display:block;">${item.details}</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-size:0.7rem;padding:2px 10px;border-radius:40px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">
                        ${item.status}
                    </span>
                    <span class="activity-time">${item.time}</span>
                </div>
            </div>`;
        }).join('');
    },

    viewActivityItem(type, id) {
        if (type === 'verification') this.viewVerification(id);
        else if (type === 'vehicle') this.customerPreview(id);
        else if (type === 'booking') this.viewBooking(id);
        else if (type === 'review') {
            if (typeof window.scrollTo === 'function') {
                window.location.href = 'admin-reviews.html';
            }
        }
    },

    // ============================================================
    // VEHICLES
    // ============================================================
    async initVehicles() {
        await this.initAuth();
        await this.fetchVehicles();
        this.renderVehicles();
        this.bindVehicleEvents();
        this.bindImageDragDrop();
        this.checkAddAction();
    },

    checkAddAction() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'add') {
            setTimeout(() => this.openVehicleModal(), 300);
        }
    },

    renderVehicles() {
        const container = document.getElementById('vehiclesList');
        if (!container) return;

        if (this.allVehicles.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-car"></i><p>No vehicles found.</p></div>`;
            return;
        }

        let html = `<table class="admin-table"><thead><tr>
            <th>Brand / Model</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>`;

        this.allVehicles.forEach(v => {
            const statusClass = (v.approvalStatus || 'Pending').toLowerCase();
            html += `<tr>
                <td><strong>${v.brand || ''} ${v.model || ''}</strong></td>
                <td>${v.category || 'N/A'}</td>
                <td>RM ${v.pricePerDay || 0}</td>
                <td><span class="status-badge ${statusClass}">${v.approvalStatus || 'Pending'}</span></td>
                <td class="actions-cell">
                    <button class="btn-view" onclick="AdminPanel.customerPreview('${v.id}')"><i class="fas fa-eye"></i> Preview</button>
                    <button class="btn-edit" onclick="AdminPanel.editVehicle('${v.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="AdminPanel.deleteItem('vehicles','${v.id}')"><i class="fas fa-trash"></i></button>
                    ${v.approvalStatus === 'Pending' ? `
                        <button class="btn-approve" onclick="AdminPanel.approveVehicle('${v.id}')"><i class="fas fa-check"></i></button>
                        <button class="btn-reject" onclick="AdminPanel.openRejectModal('vehicles','${v.id}')"><i class="fas fa-times"></i></button>
                    ` : ''}
                </td>
            </tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    bindVehicleEvents() {
        const addBtn = document.getElementById('addVehicleBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openVehicleModal());
    },

    // ============================================================
    // BOOKINGS
    // ============================================================
    async initBookings() {
        await this.initAuth();
        await this.fetchBookings();
        this.renderBookings();
    },

    renderBookings() {
        const container = document.getElementById('bookingsList');
        if (!container) return;

        if (this.allBookings.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No bookings yet.</p></div>`;
            return;
        }

        let html = `<table class="admin-table"><thead><tr>
            <th>Vehicle</th><th>Renter</th><th>Dates</th><th>Total</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>`;

        this.allBookings.forEach(b => {
            const statusClass = (b.status || 'pending').toLowerCase();
            html += `<tr>
                <td>${b.vehicleName || 'N/A'}</td>
                <td>${b.renterName || 'N/A'}</td>
                <td>${b.pickupDate || 'N/A'} → ${b.returnDate || 'N/A'}</td>
                <td>RM ${b.totalPrice || 0}</td>
                <td><span class="status-badge ${statusClass}">${b.status || 'Pending'}</span></td>
                <td class="actions-cell">
                    <button class="btn-view" onclick="AdminPanel.viewBooking('${b.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn-delete" onclick="AdminPanel.deleteItem('bookings','${b.id}')"><i class="fas fa-trash"></i></button>
                    ${b.status === 'Pending' ? `
                        <button class="btn-approve" onclick="AdminPanel.approveBooking('${b.id}')"><i class="fas fa-check"></i></button>
                        <button class="btn-reject" onclick="AdminPanel.rejectBooking('${b.id}')"><i class="fas fa-times"></i></button>
                    ` : ''}
                </td>
            </tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    // ============================================================
    // USERS
    // ============================================================
    async initUsers() {
        await this.initAuth();
        await this.fetchUsers();
        this.renderUsers();
    },

    renderUsers() {
        const container = document.getElementById('usersList');
        if (!container) return;

        if (this.allUsers.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>No users found.</p></div>`;
            return;
        }

        let html = `<table class="admin-table"><thead><tr>
            <th>Name</th><th>Email</th><th>Role</th><th>Verification</th><th>Actions</th>
        </tr></thead><tbody>`;

        this.allUsers.forEach(u => {
            const verifClass = (u.verificationStatus || 'Pending').toLowerCase();
            html += `<tr>
                <td>${u.firstName || ''} ${u.lastName || ''}</td>
                <td>${u.email || 'N/A'}</td>
                <td>${u.role || 'user'}</td>
                <td><span class="status-badge ${verifClass}">${u.verificationStatus || 'Pending'}</span></td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="AdminPanel.editUserRole('${u.id}')"><i class="fas fa-user-cog"></i> Role</button>
                    <button class="btn-delete" onclick="AdminPanel.deleteItem('users','${u.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    // ============================================================
    // VERIFICATIONS
    // ============================================================
    async initVerifications() {
        await this.initAuth();
        await this.fetchVerifications();
        this.renderVerifications();
    },

    renderVerifications() {
        const container = document.getElementById('verificationList');
        if (!container) return;

        const pending = this.allVerifications.filter(v => v.status === 'Pending');

        if (pending.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-id-card"></i><p>No pending verifications.</p></div>`;
            return;
        }

        let html = `<table class="admin-table"><thead><tr>
            <th>Name</th><th>IC Number</th><th>License</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>`;

        pending.forEach(v => {
            html += `<tr>
                <td>${v.idFullName || 'Unknown'}</td>
                <td>${v.idNumber || 'N/A'}</td>
                <td>${v.licenseNumber || 'N/A'}</td>
                <td><span class="status-badge pending">Pending</span></td>
                <td class="actions-cell">
                    <button class="btn-view" onclick="AdminPanel.viewVerification('${v.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn-approve" onclick="AdminPanel.approveVerification('${v.id}')"><i class="fas fa-check"></i></button>
                    <button class="btn-reject" onclick="AdminPanel.openRejectModal('verifications','${v.id}')"><i class="fas fa-times"></i></button>
                </td>
            </tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    // ============================================================
    // REVIEWS
    // ============================================================
    async initReviews() {
        await this.initAuth();
        await this.fetchReviews();
        this.renderReviewBadges();
        this.renderReviews();
        this.bindReviewTabs();
    },

    renderReviewBadges() {
        const flaggedCount = this.allReviews.filter(r => r.flagged || r.status === 'Flagged').length;
        const approvedCount = this.allReviews.filter(r => r.status === 'Approved').length;

        const flaggedBadge = document.getElementById('flaggedReviewsBadge');
        const approvedBadge = document.getElementById('approvedReviewsBadge');
        if (flaggedBadge) flaggedBadge.textContent = flaggedCount;
        if (approvedBadge) approvedBadge.textContent = approvedCount;
    },

    bindReviewTabs() {
        document.querySelectorAll('[data-review-tab]').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('[data-review-tab]').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                AdminPanel.currentFilter = this.dataset.reviewTab;
                AdminPanel.renderReviews();
            });
        });
    },

    renderReviews() {
        const container = document.getElementById('reviewsList');
        if (!container) return;

        let filtered = [...this.allReviews];

        if (this.currentFilter === 'flagged') {
            filtered = filtered.filter(r => r.flagged || r.status === 'Flagged');
        } else if (this.currentFilter === 'approved') {
            filtered = filtered.filter(r => r.status === 'Approved');
        } else if (this.currentFilter === 'rejected') {
            filtered = filtered.filter(r => r.status === 'Rejected');
        }
        // 'all' → no filter

        if (filtered.length === 0) {
            const label = this.currentFilter === 'flagged' ? 'flagged'
                        : this.currentFilter === 'approved' ? 'approved'
                        : this.currentFilter === 'rejected' ? 'rejected'
                        : '';
            container.innerHTML = `<div class="empty-state">
                <i class="fas fa-${this.currentFilter === 'flagged' ? 'flag' : 'star'}"></i>
                <p>No ${label} reviews.</p>
            </div>`;
            return;
        }

        let html = `<table class="admin-table"><thead><tr>
            <th>Renter</th><th>Vehicle</th><th>Rating</th><th>Review</th><th>Status</th><th>Date</th><th>Actions</th>
        </tr></thead><tbody>`;

        filtered.forEach(r => {
            const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
            const date = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('en-MY') : 'N/A';
            const statusClass = (r.status || 'Approved').toLowerCase();
            const isFlagged = r.flagged || r.status === 'Flagged';

            html += `<tr${isFlagged ? ' style="background:rgba(239,68,68,0.04);"' : ''}>
                <td><strong>${r.renterName || 'Anonymous'}</strong></td>
                <td>${r.vehicleName || 'N/A'}</td>
                <td style="color:#D4AF37;">${stars}</td>
                <td style="max-width:320px;">
                    <div style="font-size:0.85rem;line-height:1.5;">${r.text || ''}</div>
                    ${isFlagged ? '<span style="color:#ef4444;font-size:0.7rem;font-weight:600;">⚠️ FLAGGED</span>' : ''}
                </td>
                <td><span class="status-badge ${statusClass}">${r.status || 'Approved'}</span></td>
                <td style="font-size:0.8rem;">${date}</td>
                <td class="actions-cell">
                    ${r.status !== 'Approved' ? `<button class="btn-approve" onclick="AdminPanel.approveReview('${r.id}')"><i class="fas fa-check"></i> Publish</button>` : ''}
                    ${r.status !== 'Rejected' ? `<button class="btn-reject" onclick="AdminPanel.rejectReview('${r.id}')"><i class="fas fa-times"></i> Reject</button>` : ''}
                    <button class="btn-delete" onclick="AdminPanel.deleteItem('reviews','${r.id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    async approveReview(id) {
        if (!confirm('Publish this review publicly?')) return;
        try {
            await window.db.collection('reviews').doc(id).update({
                status: 'Approved',
                flagged: false,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await this.fetchReviews();
            this.renderReviewBadges();
            this.renderReviews();
        } catch (err) { alert('Failed: ' + err.message); }
    },

    async rejectReview(id) {
        const reason = prompt('Reason for rejection (optional):', 'Inappropriate content');
        if (reason === null) return;
        try {
            await window.db.collection('reviews').doc(id).update({
                status: 'Rejected',
                adminNote: reason,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await this.fetchReviews();
            this.renderReviewBadges();
            this.renderReviews();
        } catch (err) { alert('Failed: ' + err.message); }
    },

    // ============================================================
    // VEHICLE CRUD
    // ============================================================
    openVehicleModal(vehicle = null) {
        const modal = document.getElementById('vehicleModal');
        if (!modal) return;

        const title = document.getElementById('vehicleModalTitle');
        const submitBtn = document.getElementById('vehicleSubmitBtn');
        const badge = document.getElementById('vehicleModalBadge');

        if (vehicle) {
            if (title) title.textContent = 'Edit Vehicle';
            if (submitBtn) submitBtn.textContent = 'Update Vehicle';
            if (badge) badge.innerHTML = '<i class="fas fa-edit"></i> Edit Vehicle';
            document.getElementById('editVehicleId').value = vehicle.id;
            document.getElementById('vBrand').value = vehicle.brand || '';
            document.getElementById('vModel').value = vehicle.model || '';
            document.getElementById('vCategory').value = vehicle.category || 'cars';
            document.getElementById('vYear').value = vehicle.year || '';
            document.getElementById('vPrice').value = vehicle.pricePerDay || '';
            document.getElementById('vLocation').value = vehicle.location || vehicle.rentalLocation || '';
            document.getElementById('vSeats').value = vehicle.seats || '';
            document.getElementById('vTransmission').value = vehicle.transmission || '';
            document.getElementById('vFuel').value = vehicle.fuelType || '';
            document.getElementById('vEngine').value = vehicle.engineCapacity || '';
            document.getElementById('vDescription').value = vehicle.description || '';

            // License could be string or array
            let lic = vehicle.requiredLicense;
            if (Array.isArray(lic)) lic = lic.join(', ');
            document.getElementById('vLicense').value = lic || '';

            // Images
            let imgs = vehicle.images;
            if (Array.isArray(imgs)) imgs = imgs.join(', ');
            document.getElementById('vImages').value = imgs || '';

            document.getElementById('vStatus').value = vehicle.approvalStatus || 'Pending';
            document.getElementById('vAvailability').value = vehicle.availability || 'Available';
            this.currentEditVehicleId = vehicle.id;
        } else {
            if (title) title.textContent = 'Add Vehicle';
            if (submitBtn) submitBtn.textContent = 'Save Vehicle';
            if (badge) badge.innerHTML = '<i class="fas fa-car"></i> Vehicle';
            document.getElementById('editVehicleId').value = '';
            const form = document.getElementById('vehicleForm');
            if (form) form.reset();
            const preview = document.getElementById('imagePreviewContainer');
            if (preview) preview.innerHTML = '';
            this.currentEditVehicleId = null;
        }

        this.updateImagePreview();
        modal.classList.add('open');
    },

    editVehicle(id) {
        const vehicle = this.allVehicles.find(v => v.id === id);
        if (vehicle) this.openVehicleModal(vehicle);
    },

    async saveVehicle() {
        const id = document.getElementById('editVehicleId').value;

        // Parse images (comma string → array)
        const imagesStr = document.getElementById('vImages').value.trim();
        const images = imagesStr ? imagesStr.split(',').map(s => s.trim()).filter(Boolean) : [];

        // Parse license (comma string → array)
        const licenseStr = document.getElementById('vLicense').value.trim();
        const licenseArr = licenseStr ? licenseStr.split(',').map(s => s.trim()).filter(Boolean) : [];

        const data = {
            brand: document.getElementById('vBrand').value.trim(),
            model: document.getElementById('vModel').value.trim(),
            category: document.getElementById('vCategory').value,
            year: parseInt(document.getElementById('vYear').value) || null,
            pricePerDay: parseFloat(document.getElementById('vPrice').value) || 0,
            location: document.getElementById('vLocation').value.trim(),
            rentalLocation: document.getElementById('vLocation').value.trim(),
            seats: parseInt(document.getElementById('vSeats').value) || null,
            transmission: document.getElementById('vTransmission').value || null,
            fuelType: document.getElementById('vFuel').value || null,
            engineCapacity: document.getElementById('vEngine').value.trim(),
            description: document.getElementById('vDescription').value.trim(),
            images: images,
            requiredLicense: licenseArr,
            approvalStatus: document.getElementById('vStatus').value,
            availability: document.getElementById('vAvailability').value,
        };

        const submitBtn = document.getElementById('vehicleSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            if (id) {
                await window.db.collection('vehicles').doc(id).update(data);
            } else {
                data.ownerId = 'admin';
                data.ownerName = 'Admin';
                data.submittedAt = firebase.firestore.FieldValue.serverTimestamp();
                await window.db.collection('vehicles').add(data);
            }
            this.closeModal('vehicleModal');
            await this.fetchVehicles();
            this.renderVehicles();
        } catch (err) {
            alert('Error saving vehicle: ' + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = id ? 'Update Vehicle' : 'Save Vehicle';
            }
        }
    },

    // ============================================================
    // IMAGE DRAG & DROP
    // ============================================================
    bindImageDragDrop() {
        const dropZone = document.getElementById('imageDropZone');
        const fileInput = document.getElementById('imageUploadInput');
        const imagesField = document.getElementById('vImages');

        if (!dropZone || !fileInput || !imagesField) return;

        // Click to open file picker
        dropZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                AdminPanel.handleImageFiles(this.files);
                this.value = '';
            }
        });

        // Prevent default drags on page
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            document.body.addEventListener(evt, (e) => {
                if (e.target.closest('#imageDropZone')) return;
                e.preventDefault();
            });
        });

        // Highlight
        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            });
        });

        // Handle drop
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                AdminPanel.handleImageFiles(files);
            }
        });

        // Live preview when typing URLs
        imagesField.addEventListener('input', () => this.updateImagePreview());
    },

    compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
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
                        if (!blob) reject(new Error('Compression failed'));
                        else resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', quality);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
        });
    },

    async uploadToCloudinary(file, folder = 'vehicles') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', ADMIN_UPLOAD_PRESET);
        formData.append('folder', folder);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${ADMIN_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
        }
        const data = await res.json();
        return data.secure_url;
    },

    async handleImageFiles(files) {
        const imagesField = document.getElementById('vImages');
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (!imagesField || !previewContainer) return;

        const currentUrls = imagesField.value.split(',').map(s => s.trim()).filter(Boolean);
        const remaining = 8 - currentUrls.length;
        if (remaining <= 0) {
            alert('Maximum 8 images allowed. Remove some first.');
            return;
        }

        const validFiles = Array.from(files).filter(f =>
            f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
        ).slice(0, remaining);

        if (validFiles.length === 0) {
            alert('No valid images. Please use JPG/PNG/WEBP under 5 MB.');
            return;
        }

        // Show temporary uploading previews
        const tempNodes = [];
        validFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'image-preview-item uploading';
            item.innerHTML = `<img src="${URL.createObjectURL(file)}" />`;
            previewContainer.appendChild(item);
            tempNodes.push({ file, node: item });
        });

        // Upload in parallel
        const results = await Promise.allSettled(
            tempNodes.map(async ({ file, node }) => {
                try {
                    const compressed = await this.compressImage(file, 1200, 1200, 0.85);
                    const url = await this.uploadToCloudinary(compressed, 'vehicles');
                    node.remove();
                    return url;
                } catch (err) {
                    console.error('Upload failed:', err);
                    node.remove();
                    throw err;
                }
            })
        );

        const newUrls = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').length;

        if (newUrls.length > 0) {
            const existing = imagesField.value.split(',').map(s => s.trim()).filter(Boolean);
            imagesField.value = [...existing, ...newUrls].join(', ');
            this.updateImagePreview();
        }

        if (failed > 0) {
            alert(`⚠️ ${failed} image(s) failed to upload. The rest were added.`);
        }
    },

    updateImagePreview() {
        const container = document.getElementById('imagePreviewContainer');
        const imagesField = document.getElementById('vImages');
        if (!container || !imagesField) return;

        const urls = imagesField.value.split(',').map(s => s.trim()).filter(Boolean);
        const vehicleId = document.getElementById('editVehicleId')?.value || '';

        container.innerHTML = '';
        urls.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'image-preview-item';
            item.innerHTML = `
                <img src="${url}" alt="Vehicle image ${index + 1}" />
                <button type="button" class="remove-img-btn" data-index="${index}" title="Remove">×</button>
            `;
            item.querySelector('.remove-img-btn').addEventListener('click', function() {
                const idx = parseInt(this.dataset.index);
                const arr = imagesField.value.split(',').map(s => s.trim()).filter(Boolean);
                arr.splice(idx, 1);
                imagesField.value = arr.join(', ');
                AdminPanel.updateImagePreview();
            });
            container.appendChild(item);
        });
    },

    // ============================================================
    // CUSTOMER PREVIEW
    // ============================================================
    customerPreview(id) {
        const v = this.allVehicles.find(v => v.id === id);
        if (!v) return;
        this.currentPreviewVehicleId = id;

        const modal = document.getElementById('customerPreviewModal');
        if (!modal) {
            window.open(`VehicleDetails.html?id=${id}`, '_blank');
            return;
        }

        document.getElementById('previewTitle').textContent = `${v.brand || ''} ${v.model || ''}`;

        let images = v.images;
        if (typeof images === 'string') images = images.split(',').map(s => s.trim());
        if (!Array.isArray(images)) images = [];
        const img = images[0] || 'https://via.placeholder.com/800x500/0b1220/ffffff?text=No+Image';

        const price = v.pricePerDay || 0;
        const statusClass = (v.approvalStatus || 'pending').toLowerCase();

        let license = v.requiredLicense;
        if (Array.isArray(license)) license = license.join(', ');

        let html = `
            <div class="customer-preview-grid">
                <div>
                    <img src="${img}" alt="${v.brand} ${v.model}" class="customer-preview-image" />
                    ${images.length > 1 ? `<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">${images.slice(1, 4).map(im => `<img src="${im}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid #EBEEF2;" />`).join('')}</div>` : ''}
                </div>
                <div class="customer-preview-info">
                    <h2>${v.brand || ''} ${v.model || ''}</h2>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <span style="background:#F8F9FA;padding:2px 12px;border-radius:40px;font-size:0.75rem;">${v.category || 'N/A'}</span>
                        <span style="background:#F8F9FA;padding:2px 12px;border-radius:40px;font-size:0.75rem;"><i class="fas fa-map-pin"></i> ${v.location || v.rentalLocation || 'N/A'}</span>
                        <span class="preview-status-badge ${statusClass}">${v.approvalStatus || 'Pending'}</span>
                    </div>
                    <div class="preview-price">RM ${price} <small>/ day</small></div>
                    <div class="customer-preview-specs">
                        <div class="spec-item"><i class="fas fa-users"></i> ${v.seats || 'N/A'} Seats</div>
                        <div class="spec-item"><i class="fas fa-cog"></i> ${v.transmission || 'N/A'}</div>
                        <div class="spec-item"><i class="fas fa-gas-pump"></i> ${v.fuelType || 'N/A'}</div>
                        <div class="spec-item"><i class="fas fa-tachometer-alt"></i> ${v.engineCapacity || 'N/A'}</div>
                        <div class="spec-item"><i class="fas fa-calendar-alt"></i> ${v.year || 'N/A'}</div>
                    </div>
                    <div style="margin:6px 0;"><span class="preview-license-badge"><i class="fas fa-id-card"></i> License: ${license || 'N/A'}</span></div>
                    ${v.description ? `<p style="color:#4A5568;font-size:0.9rem;line-height:1.6;border-top:1px solid #EBEEF2;padding-top:10px;">${v.description}</p>` : ''}
                </div>
            </div>
        `;
        document.getElementById('customerPreviewBody').innerHTML = html;
        modal.classList.add('open');
    },

    openCustomerView() {
        if (this.currentPreviewVehicleId) {
            window.open(`VehicleDetails.html?id=${this.currentPreviewVehicleId}`, '_blank');
        }
    },

    // ============================================================
    // VIEW MODALS
    // ============================================================
    viewBooking(id) {
        const b = this.allBookings.find(b => b.id === id);
        if (!b) return;
        const modal = document.getElementById('viewModal');
        if (!modal) return;
        document.getElementById('viewModalTitle').textContent = `Booking #${id.slice(0, 8)}`;
        const badge = document.getElementById('viewModalBadge');
        if (badge) badge.textContent = 'Booking';

        let html = `<div class="view-detail-grid">`;
        const fields = [
            { label: 'Vehicle', value: b.vehicleName || 'N/A' },
            { label: 'Renter', value: b.renterName || 'N/A' },
            { label: 'Email', value: b.renterEmail || 'N/A' },
            { label: 'Phone', value: b.renterPhone || 'N/A' },
            { label: 'Pickup', value: `${b.pickupDate || 'N/A'} ${b.pickupTime || ''}` },
            { label: 'Return', value: `${b.returnDate || 'N/A'} ${b.returnTime || ''}` },
            { label: 'Location', value: b.pickupLocation || 'N/A' },
            { label: 'Total', value: `RM ${b.totalPrice || 0}` },
            { label: 'Status', value: b.status || 'Pending', isStatus: true },
        ];
        fields.forEach(f => {
            const sc = f.isStatus ? `status-${(f.value || 'pending').toLowerCase()}` : '';
            html += `<div class="view-detail-item"><span class="label">${f.label}</span><span class="value ${sc}">${f.value}</span></div>`;
        });
        html += `</div>`;
        document.getElementById('viewModalBody').innerHTML = html;
        modal.classList.add('open');
    },

    viewVerification(id) {
        const v = this.allVerifications.find(v => v.id === id);
        if (!v) return;
        const modal = document.getElementById('viewModal');
        if (!modal) return;
        document.getElementById('viewModalTitle').textContent = `Verification: ${v.idFullName || 'Unknown'}`;
        const badge = document.getElementById('viewModalBadge');
        if (badge) badge.textContent = 'Verification';

        let html = `<div class="view-detail-grid">`;
        const fields = [
            { label: 'Full Name', value: v.idFullName || 'N/A' },
            { label: 'IC Number', value: v.idNumber || 'N/A' },
            { label: 'License Number', value: v.licenseNumber || 'N/A' },
            { label: 'License Expiry', value: v.licenseExpiry || 'N/A' },
            { label: 'Classes', value: (v.licenseClasses || []).join(', ') || 'None' },
        ];
        fields.forEach(f => {
            html += `<div class="view-detail-item"><span class="label">${f.label}</span><span class="value">${f.value}</span></div>`;
        });
        html += `</div>`;

        if (v.icFront || v.icBack || v.licenseImage) {
            html += `<div style="margin-top:16px;">
                <strong style="color:#88909C;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;">Documents</strong>
                <div class="view-images-grid">`;
            if (v.icFront) html += `<div class="image-wrapper"><img src="${v.icFront}" alt="IC Front" /></div>`;
            if (v.icBack) html += `<div class="image-wrapper"><img src="${v.icBack}" alt="IC Back" /></div>`;
            if (v.licenseImage) html += `<div class="image-wrapper"><img src="${v.licenseImage}" alt="License" /></div>`;
            html += `</div></div>`;
        }

        document.getElementById('viewModalBody').innerHTML = html;
        modal.classList.add('open');
    },

    // ============================================================
    // APPROVE / REJECT
    // ============================================================
    async approveVehicle(id) {
        if (!confirm('Approve this vehicle?')) return;
        try {
            await window.db.collection('vehicles').doc(id).update({
                approvalStatus: 'Approved',
                availability: 'Available'
            });
            await this.fetchVehicles();
            this.renderVehicles();
        } catch (err) { alert(err.message); }
    },

    openRejectModal(collection, id) {
        this.currentRejectTarget = { collection, id };
        const modal = document.getElementById('rejectModal');
        if (modal) {
            modal.classList.add('open');
            document.getElementById('rejectReason').value = '';
        }
    },

    async confirmReject() {
        if (!this.currentRejectTarget) return;
        const { collection, id } = this.currentRejectTarget;
        const reason = document.getElementById('rejectReason').value.trim();
        if (!reason) { alert('Please provide a reason.'); return; }

        try {
            if (collection === 'vehicles') {
                await window.db.collection('vehicles').doc(id).update({
                    approvalStatus: 'Rejected',
                    adminNote: reason
                });
                await this.fetchVehicles();
                this.renderVehicles();
            } else if (collection === 'verifications') {
                await window.db.collection('verification').doc(id).update({
                    status: 'Rejected',
                    adminNote: reason
                });
                await window.db.collection('users').doc(id).update({
                    verificationStatus: 'Rejected'
                });
                await this.fetchVerifications();
                this.renderVerifications();
            }
            this.closeModal('rejectModal');
        } catch (err) { alert(err.message); }
    },

    async approveBooking(id) {
        if (!confirm('Approve this booking?')) return;
        try {
            await window.db.collection('bookings').doc(id).update({ status: 'Approved' });
            await this.fetchBookings();
            this.renderBookings();
        } catch (err) { alert(err.message); }
    },

    async rejectBooking(id) {
        const reason = prompt('Enter rejection reason:');
        if (reason === null) return;
        try {
            await window.db.collection('bookings').doc(id).update({
                status: 'Rejected',
                adminNote: reason
            });
            await this.fetchBookings();
            this.renderBookings();
        } catch (err) { alert(err.message); }
    },

    async approveVerification(id) {
        if (!confirm('Approve this verification?')) return;
        try {
            const doc = await window.db.collection('verification').doc(id).get();
            const data = doc.data();
            await window.db.collection('verification').doc(id).update({ status: 'Approved' });
            await window.db.collection('users').doc(id).update({
                verificationStatus: 'Approved',
                licenseClasses: data.licenseClasses || []
            });
            await this.fetchVerifications();
            this.renderVerifications();
        } catch (err) { alert(err.message); }
    },

    // ============================================================
    // DELETE ITEM
    // ============================================================
    deleteItem(collection, id) {
        this.currentDeleteTarget = { collection, id };
        const modal = document.getElementById('deleteModal');
        if (modal) modal.classList.add('open');
    },

    async confirmDelete() {
        if (!this.currentDeleteTarget) return;
        const { collection, id } = this.currentDeleteTarget;
        try {
            await window.db.collection(collection).doc(id).delete();
            this.closeModal('deleteModal');

            if (collection === 'vehicles') {
                await this.fetchVehicles();
                this.renderVehicles();
            } else if (collection === 'bookings') {
                await this.fetchBookings();
                this.renderBookings();
            } else if (collection === 'users') {
                await this.fetchUsers();
                this.renderUsers();
            } else if (collection === 'verifications') {
                await this.fetchVerifications();
                this.renderVerifications();
            } else if (collection === 'reviews') {
                await this.fetchReviews();
                this.renderReviewBadges();
                this.renderReviews();
            }
        } catch (err) { alert('Delete failed: ' + err.message); }
    },

    // ============================================================
    // USER ROLE
    // ============================================================
    async editUserRole(id) {
        const newRole = prompt('Enter new role (user / admin):', 'user');
        if (newRole === null) return;
        if (newRole !== 'user' && newRole !== 'admin') {
            alert('Role must be "user" or "admin"');
            return;
        }
        try {
            await window.db.collection('users').doc(id).update({ role: newRole });
            await this.fetchUsers();
            this.renderUsers();
        } catch (err) { alert(err.message); }
    },

    // ============================================================
    // MODAL HELPERS
    // ============================================================
    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('open');
    },

    // ============================================================
    // LOGOUT
    // ============================================================
    logout() {
        window.auth.signOut().then(() => {
            window.location.href = 'LogIn.html';
        });
    },

    // ============================================================
    // SIDEBAR
    // ============================================================
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('open');
    },

    // ============================================================
    // GLOBAL BINDINGS
    // ============================================================
    bindGlobalEvents() {
        // Logout
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        // Sidebar toggle
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleSidebar());

        // Vehicle form submit
        const vehicleForm = document.getElementById('vehicleForm');
        if (vehicleForm) {
            vehicleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveVehicle();
            });
        }

        // Confirm delete
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());

        // Confirm reject
        const confirmRejectBtn = document.getElementById('confirmRejectBtn');
        if (confirmRejectBtn) confirmRejectBtn.addEventListener('click', () => this.confirmReject());

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) this.classList.remove('open');
            });
        });

        // ESC to close all modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
            }
        });

        // Bind review tabs (if any on this page)
        this.bindReviewTabs();
    }
};

// ============================================================
// EXPOSE TO WINDOW
// ============================================================
window.AdminPanel = AdminPanel;

// ============================================================
// AUTO-INIT BASED ON PAGE
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    AdminPanel.bindGlobalEvents();

    const path = window.location.pathname.split('/').pop();
    console.log('📄 Admin page:', path);

    if (path.includes('admin-dashboard') || path === 'AdminPanel.html' || path === 'admin-panel.html' || path === '') {
        console.log('🔄 Loading Dashboard...');
        AdminPanel.initDashboard();
    } else if (path.includes('admin-vehicles')) {
        console.log('🔄 Loading Vehicles...');
        AdminPanel.initVehicles();
    } else if (path.includes('admin-bookings')) {
        console.log('🔄 Loading Bookings...');
        AdminPanel.initBookings();
    } else if (path.includes('admin-users')) {
        console.log('🔄 Loading Users...');
        AdminPanel.initUsers();
    } else if (path.includes('admin-verifications')) {
        console.log('🔄 Loading Verifications...');
        AdminPanel.initVerifications();
    } else if (path.includes('admin-reviews')) {
        console.log('🔄 Loading Reviews...');
        AdminPanel.initReviews();
    } else {
        // Fallback detection by DOM
        if (document.getElementById('vehiclesList')) AdminPanel.initVehicles();
        else if (document.getElementById('bookingsList')) AdminPanel.initBookings();
        else if (document.getElementById('usersList')) AdminPanel.initUsers();
        else if (document.getElementById('verificationList')) AdminPanel.initVerifications();
        else if (document.getElementById('reviewsList')) AdminPanel.initReviews();
        else AdminPanel.initDashboard();
    }
});