// Reviews.js - Vehicle reviews with auto-publish + profanity flag + report

// ============================================================
// STATE
// ============================================================
let currentUser = null;
let selectedRating = 0;
let filterVehicleId = null;
let filterVehicleName = '';
let eligibleBooking = null;

// ============================================================
// PROFANITY FILTER
// ============================================================
const BANNED_WORDS = [
    // English
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
    'dick', 'pussy', 'cunt', 'whore', 'slut',
    // Malay
    'bodoh', 'babi', 'sial', 'pukimak', 'kimak', 'lancau', 'pantat',
    'bangsat', 'anjing', 'puki', 'tetek', 'kontol',
    // Slurs / scam accusations
    'scam', 'fraud', 'thief', 'liar', 'penipu', 'pencuri',
];

function containsProfanity(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    for (const word of BANNED_WORDS) {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(lower)) return true;
    }
    return false;
}

// ============================================================
// URL PARAMS
// ============================================================
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return { vehicleId: params.get('vehicleId') };
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', function () {

    // --------------------------------------------------------
    // 1. STAR RATING
    // --------------------------------------------------------
    document.querySelectorAll('.star-rating i').forEach(star => {
        star.addEventListener('click', function () {
            const value = parseInt(this.dataset.value, 10);
            selectedRating = value;
            const hidden = document.getElementById('reviewRating');
            if (hidden) hidden.value = value;

            document.querySelectorAll('.star-rating i').forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.value, 10) <= value);
            });
        });

        star.addEventListener('mouseenter', function () {
            const value = parseInt(this.dataset.value, 10);
            document.querySelectorAll('.star-rating i').forEach(s => {
                s.style.color = parseInt(s.dataset.value, 10) <= value ? '#fbbf24' : '';
            });
        });

        star.addEventListener('mouseleave', function () {
            document.querySelectorAll('.star-rating i').forEach(s => {
                s.style.color = s.classList.contains('active') ? '#fbbf24' : '';
            });
        });
    });

    // --------------------------------------------------------
    // 2. FLOATING PANEL — open/close
    // --------------------------------------------------------
    const floatingBtn = document.getElementById('floatingReviewBtn');
    const closeBtn = document.getElementById('closeReviewPanel');
    const overlay = document.getElementById('reviewPanelOverlay');
    const panel = document.getElementById('reviewPanel');

    if (floatingBtn) floatingBtn.addEventListener('click', openReviewPanel);
    if (closeBtn) closeBtn.addEventListener('click', closeReviewPanel);
    if (overlay) overlay.addEventListener('click', closeReviewPanel);
    if (panel) {
        // Prevent click inside panel from bubbling to overlay
        panel.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeReviewPanel();
    });

    // --------------------------------------------------------
    // 3. REVIEW FORM SUBMIT
    // --------------------------------------------------------
    const form = document.getElementById('reviewForm');
    if (form) form.addEventListener('submit', submitReview);

    // --------------------------------------------------------
    // 4. AUTH STATE LISTENER — boot the page
    // --------------------------------------------------------
    if (!window.auth) {
        console.error('Firebase auth not available.');
        return;
    }

    window.auth.onAuthStateChanged(async function (user) {
        currentUser = user || null;
        await loadVehicleAndBooking();
        await loadReviews();
    });
});

// ============================================================
// LOAD REVIEWS LIST (only Approved)
// ============================================================
async function loadReviews() {
    const container = document.getElementById('reviewsList');
    const badge = document.getElementById('reviewCountBadge');
    if (!container) return;

    try {
        const params = getUrlParams();
        filterVehicleId = params.vehicleId;

        let query = window.db.collection('reviews').where('status', '==', 'Approved');

        if (filterVehicleId) {
            query = query.where('vehicleId', '==', filterVehicleId);
        }

        let snapshot;
        try {
            snapshot = await query.orderBy('createdAt', 'desc').get();
        } catch (indexErr) {
            // Fall back to client-side sort if composite index missing
            if (indexErr.code === 'failed-precondition' || (indexErr.message || '').includes('index')) {
                snapshot = await query.get();
            } else {
                throw indexErr;
            }
        }

        const reviews = [];
        snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
        reviews.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (badge) badge.textContent = reviews.length;

        if (reviews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <p>${filterVehicleId ? 'No reviews for this vehicle yet.' : 'No reviews yet. Be the first to share your experience!'}</p>
                </div>
            `;
            return;
        }

        let html = '';
        reviews.forEach(data => {
            const stars = '★'.repeat(data.rating || 0) + '☆'.repeat(5 - (data.rating || 0));
            const date = data.createdAt
                ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('en-MY')
                : 'N/A';
            const vehicleName = data.vehicleName || filterVehicleName || 'Vehicle';

            html += `
                <div class="review-card">
                    <div class="review-header">
                        <span class="reviewer">${escapeHtml(data.renterName || 'Anonymous')}</span>
                        <span class="review-date">${date}</span>
                    </div>
                    <div class="review-vehicle">${escapeHtml(vehicleName)}</div>
                    <div class="review-stars">${stars}</div>
                    <div class="review-text">${escapeHtml(data.text || 'No review text.')}</div>
                    <button onclick="reportReview('${data.id}')" style="background:none;border:none;color:#88909C;font-size:0.75rem;cursor:pointer;margin-top:8px;padding:0;">
                        <i class="fas fa-flag"></i> Report
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (err) {
        console.error('Error loading reviews:', err);
        container.innerHTML = `<p style="color:#88909C;text-align:center;">Could not load reviews.</p>`;
    }
}

// ============================================================
// SIMPLE HTML ESCAPER (defense-in-depth against XSS)
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

// ============================================================
// REPORT REVIEW
// ============================================================
window.reportReview = async function (id) {
    if (!confirm('Report this review to our team?')) return;
    try {
        await window.db.collection('reviews').doc(id).update({
            flagged: true,
            status: 'Flagged',
            reportedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('✅ Reported. Our team will review it.');
        loadReviews();
    } catch (err) {
        alert('Failed to report: ' + err.message);
    }
};

// ============================================================
// LOAD VEHICLE INFO + PAGE TITLE
// ============================================================
async function loadVehicleAndBooking() {
    const params = getUrlParams();
    filterVehicleId = params.vehicleId;

    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    if (!filterVehicleId) {
        if (pageTitle) pageTitle.textContent = 'Vehicle Reviews';
        if (pageSubtitle) pageSubtitle.textContent = 'Browse reviews from other renters.';
        return;
    }

    try {
        const vDoc = await window.db.collection('vehicles').doc(filterVehicleId).get();
        if (vDoc.exists) {
            const data = vDoc.data();
            filterVehicleName = `${data.brand || ''} ${data.model || ''}`.trim() || 'Vehicle';

            if (pageTitle) pageTitle.textContent = `Reviews for ${filterVehicleName}`;
            if (pageSubtitle) pageSubtitle.textContent = `See what renters are saying about the ${filterVehicleName}.`;

            // Optional: update back button if present in the DOM
            const backBtn = document.getElementById('backToVehicleBtn');
            if (backBtn) backBtn.href = `VehicleDetails.html?id=${filterVehicleId}`;

            const backWrap = document.getElementById('vehicleBackBtn');
            if (backWrap) backWrap.style.display = 'block';
        }
    } catch (err) {
        console.warn('Could not load vehicle info:', err);
    }
}

// ============================================================
// ELIGIBILITY CHECK (before opening form)
// ============================================================
async function checkEligibility() {
    const loadingEl = document.getElementById('reviewPanelLoading');
    const notEligibleEl = document.getElementById('reviewPanelNotEligible');
    const notEligibleText = document.getElementById('notEligibleText');
    const formEl = document.getElementById('reviewForm');

    if (loadingEl) loadingEl.style.display = 'block';
    if (notEligibleEl) notEligibleEl.style.display = 'none';
    if (formEl) formEl.style.display = 'none';

    // Must be logged in
    if (!currentUser) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (notEligibleEl) notEligibleEl.style.display = 'block';
        if (notEligibleText) notEligibleText.textContent = 'Please log in to write a review.';
        return;
    }

    // Must be on a specific vehicle page
    if (!filterVehicleId) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (notEligibleEl) notEligibleEl.style.display = 'block';
        if (notEligibleText) notEligibleText.textContent = 'Open a vehicle page and click "Write a Review" to leave feedback.';
        return;
    }

    try {
        // Already reviewed?
        const existing = await window.db.collection('reviews')
            .where('vehicleId', '==', filterVehicleId)
            .where('renterId', '==', currentUser.uid)
            .get();

        if (!existing.empty) {
            if (loadingEl) loadingEl.style.display = 'none';
            if (notEligibleEl) notEligibleEl.style.display = 'block';
            if (notEligibleText) notEligibleText.textContent = '✅ You have already reviewed this vehicle. Thank you for your feedback!';
            return;
        }

        // Eligible booking on THIS vehicle?
        const bookingSnap = await window.db.collection('bookings')
            .where('renterId', '==', currentUser.uid)
            .where('vehicleId', '==', filterVehicleId)
            .get();

        if (bookingSnap.empty) {
            if (loadingEl) loadingEl.style.display = 'none';
            if (notEligibleEl) notEligibleEl.style.display = 'block';
            if (notEligibleText) notEligibleText.textContent = 'You need to book this vehicle first before you can review it.';
            return;
        }

        const validStatuses = ['completed', 'approved', 'confirmed', 'active'];
        let eligible = null;

        bookingSnap.forEach(doc => {
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            if (!eligible && validStatuses.includes(status)) {
                eligible = { id: doc.id, ...data };
            }
        });

        if (!eligible) {
            if (loadingEl) loadingEl.style.display = 'none';
            if (notEligibleEl) notEligibleEl.style.display = 'block';
            if (notEligibleText) notEligibleText.textContent = 'Your booking must be approved or completed before you can leave a review.';
            return;
        }

        eligibleBooking = eligible;
        if (loadingEl) loadingEl.style.display = 'none';
        if (formEl) formEl.style.display = 'block';

        // Thumbnail
        const thumb = document.getElementById('panelVehicleThumb');
        const img = eligible.vehicleImage || eligible.imageUrl || '';
        if (thumb) {
            if (img) {
                thumb.style.backgroundImage = `url('${img}')`;
                thumb.innerHTML = '';
            } else {
                thumb.style.backgroundImage = 'none';
                thumb.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#D4AF37;"><i class="fas fa-car"></i></div>`;
            }
        }

        // Vehicle + booking info
        const nameEl = document.getElementById('panelVehicleName');
        if (nameEl) nameEl.textContent = eligible.vehicleName || filterVehicleName;

        const bookingEl = document.getElementById('panelVehicleBooking');
        if (bookingEl) {
            bookingEl.textContent =
                `${eligible.pickupDate || 'N/A'} → ${eligible.returnDate || 'N/A'} · Status: ${eligible.status}`;
        }

        // Hidden inputs
        const hidBooking = document.getElementById('reviewBookingId');
        const hidVehicle = document.getElementById('reviewVehicleId');
        if (hidBooking) hidBooking.value = eligible.id;
        if (hidVehicle) hidVehicle.value = filterVehicleId;

    } catch (err) {
        console.error('Eligibility check error:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        if (notEligibleEl) notEligibleEl.style.display = 'block';
        if (notEligibleText) notEligibleText.textContent = 'Could not verify your booking. Please try again later.';
    }
}

// ============================================================
// SUBMIT REVIEW
// ============================================================
async function submitReview(e) {
    e.preventDefault();
    if (!currentUser) return;

    const bookingId = (document.getElementById('reviewBookingId') || {}).value;
    const vehicleId = (document.getElementById('reviewVehicleId') || {}).value;
    const rating = selectedRating;
    const text = (document.getElementById('reviewText') || {}).value?.trim() || '';

    if (rating === 0) { alert('Please select a rating.'); return; }
    if (!text) { alert('Please write a review.'); return; }
    if (!eligibleBooking) { alert('No eligible booking.'); return; }

    const isBad = containsProfanity(text);

    const submitBtn = document.getElementById('submitReviewBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
        await window.db.collection('reviews').add({
            bookingId: bookingId,
            vehicleId: vehicleId,
            vehicleName: eligibleBooking.vehicleName || filterVehicleName,
            renterId: currentUser.uid,
            renterName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User'),
            rating: rating,
            text: text,
            status: isBad ? 'Flagged' : 'Approved',
            flagged: isBad,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (isBad) {
            alert('⚠️ Your review contains flagged language.\n\nIt has been sent to our team for review and will not appear publicly.');
        } else {
            alert('✅ Review posted! Thank you for your feedback.');
        }

        closeReviewPanel();

        // Reset form
        const form = document.getElementById('reviewForm');
        if (form) form.reset();
        document.querySelectorAll('.star-rating i').forEach(s => {
            s.classList.remove('active');
            s.style.color = '';
        });
        selectedRating = 0;

        loadReviews();

    } catch (err) {
        console.error('Error submitting review:', err);
        alert('❌ Failed to submit review: ' + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Review';
        }
    }
}

// ============================================================
// OPEN / CLOSE PANEL
// ============================================================
function openReviewPanel() {
    const panel = document.getElementById('reviewPanel');
    const overlay = document.getElementById('reviewPanelOverlay');
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    checkEligibility();
}

function closeReviewPanel() {
    const panel = document.getElementById('reviewPanel');
    const overlay = document.getElementById('reviewPanelOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

// Expose for inline handlers
window.openReviewPanel = openReviewPanel;
window.closeReviewPanel = closeReviewPanel;