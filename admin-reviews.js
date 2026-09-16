// admin-reviews.js - Reviews moderation (only flagged need attention)

let allReviews = [];
let currentFilter = 'flagged';
let currentReviewId = null;

// ============================================================
// 1. AUTH CHECK + INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    if (!window.auth) {
        alert('Firebase not initialized.');
        return;
    }
    window.auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'LogIn.html';
            return;
        }
        try {
            const doc = await window.db.collection('users').doc(user.uid).get();
            if (!doc.exists || doc.data().role !== 'admin') {
                alert('Access denied. Admins only.');
                window.location.href = 'Home.html';
                return;
            }
            console.log('✅ Admin verified:', user.email);
            bindSidebar();
            bindTabs();
            bindModalButtons();
            await loadReviews();
        } catch (err) {
            console.error('Auth error:', err);
            window.location.href = 'Home.html';
        }
    });
});

// ============================================================
// 2. SIDEBAR
// ============================================================
function bindSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }
    const logout = document.getElementById('adminLogoutBtn');
    if (logout) {
        logout.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                await window.auth.signOut();
                window.location.href = 'LogIn.html';
            }
        });
    }
}

// ============================================================
// 3. TABS
// ============================================================
function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.tab;
            updateTableHeader();
            renderReviews();
        });
    });
}

function updateTableHeader() {
    const title = document.getElementById('tableTitle');
    const map = {
        flagged: '<i class="fas fa-flag" style="color:#EF4444;"></i> Flagged Reviews',
        approved: '<i class="fas fa-check-circle" style="color:#10B981;"></i> Published Reviews',
        rejected: '<i class="fas fa-times-circle" style="color:#64748B;"></i> Rejected Reviews',
        all: '<i class="fas fa-list" style="color:#D4AF37;"></i> All Reviews'
    };
    if (title) title.innerHTML = map[currentFilter] || map.flagged;
}

// ============================================================
// 4. LOAD REVIEWS FROM FIRESTORE
// ============================================================
async function loadReviews() {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading reviews...</div>';

    try {
        const snapshot = await window.db.collection('reviews').get();
        allReviews = [];
        snapshot.forEach(doc => allReviews.push({ id: doc.id, ...doc.data() }));

        // Sort newest first
        allReviews.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        // Update stats
        const flaggedCount = allReviews.filter(r => r.flagged || r.status === 'Flagged').length;
        const approvedCount = allReviews.filter(r => r.status === 'Approved').length;
        const rejectedCount = allReviews.filter(r => r.status === 'Rejected').length;

        setText('flaggedStat', flaggedCount);
        setText('approvedStat', approvedCount);
        setText('rejectedStat', rejectedCount);
        setText('totalStat', allReviews.length);
        setText('flaggedBadge', flaggedCount);

        renderReviews();

    } catch (err) {
        console.error('Error loading reviews:', err);
        container.innerHTML = `<p style="text-align:center;color:#88909C;padding:20px;">Failed to load reviews: ${err.message}</p>`;
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================================
// 5. RENDER REVIEWS
// ============================================================
function renderReviews() {
    const container = document.getElementById('reviewsList');
    const countEl = document.getElementById('tableCount');
    if (!container) return;

    let filtered = [...allReviews];

    if (currentFilter === 'flagged') {
        filtered = filtered.filter(r => r.flagged || r.status === 'Flagged');
    } else if (currentFilter === 'approved') {
        filtered = filtered.filter(r => r.status === 'Approved');
    } else if (currentFilter === 'rejected') {
        filtered = filtered.filter(r => r.status === 'Rejected');
    }

    if (countEl) countEl.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        const iconMap = {
            flagged: 'fa-flag',
            approved: 'fa-check-circle',
            rejected: 'fa-times-circle',
            all: 'fa-star'
        };
        container.innerHTML = `
            <div class="empty-state" style="padding:60px 20px;text-align:center;">
                <i class="fas ${iconMap[currentFilter] || 'fa-star'}" style="font-size:3rem;color:#D4AF37;opacity:0.3;display:block;margin-bottom:12px;"></i>
                <p style="color:#88909C;font-size:1rem;">No ${currentFilter === 'flagged' ? 'flagged' : currentFilter} reviews.</p>
                ${currentFilter === 'flagged' ? '<p style="color:#88909C;font-size:0.85rem;margin-top:4px;">All clean! Nothing needs your attention.</p>' : ''}
            </div>
        `;
        return;
    }

    let html = `<table class="admin-table"><thead><tr>
        <th style="width:140px;">Renter</th>
        <th style="width:180px;">Vehicle</th>
        <th style="width:100px;">Rating</th>
        <th>Review</th>
        <th style="width:110px;">Status</th>
        <th style="width:110px;">Date</th>
        <th style="width:200px;">Actions</th>
    </tr></thead><tbody>`;

    filtered.forEach(r => {
        const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
        const date = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('en-MY') : 'N/A';
        const statusClass = (r.status || 'Approved').toLowerCase();
        const isFlagged = r.flagged || r.status === 'Flagged';

        const truncated = (r.text || '').length > 180
            ? (r.text || '').substring(0, 180) + '…'
            : (r.text || '');

        html += `<tr${isFlagged ? ' style="background:rgba(239,68,68,0.04);"' : ''}>
            <td><strong>${r.renterName || 'Anonymous'}</strong></td>
            <td>${r.vehicleName || 'N/A'}</td>
            <td style="color:#D4AF37;font-size:1rem;letter-spacing:2px;">${stars}</td>
            <td style="max-width:340px;">
                <div style="font-size:0.85rem;line-height:1.5;">${truncated}</div>
                ${isFlagged ? '<span style="color:#ef4444;font-size:0.7rem;font-weight:700;">⚠️ FLAGGED</span>' : ''}
            </td>
            <td><span class="status-badge ${statusClass}">${r.status || 'Approved'}</span></td>
            <td style="font-size:0.8rem;color:#88909C;">${date}</td>
            <td class="actions-cell">
                <button class="btn-view" onclick="viewReview('${r.id}')" title="View Full">
                    <i class="fas fa-eye"></i> View
                </button>
                ${r.status !== 'Approved' ? `<button class="btn-approve" onclick="approveReview('${r.id}')" title="Publish">
                    <i class="fas fa-check"></i>
                </button>` : ''}
                ${r.status !== 'Rejected' ? `<button class="btn-reject" onclick="rejectReview('${r.id}')" title="Reject">
                    <i class="fas fa-times"></i>
                </button>` : ''}
                <button class="btn-delete" onclick="deleteReview('${r.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ============================================================
// 6. VIEW REVIEW (modal)
// ============================================================
window.viewReview = function(id) {
    const review = allReviews.find(r => r.id === id);
    if (!review) return;
    currentReviewId = id;

    const stars = '★'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));
    const date = review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleString('en-MY') : 'N/A';
    const isFlagged = review.flagged || review.status === 'Flagged';

    document.getElementById('reviewModalTitle').textContent = `Review by ${review.renterName || 'Anonymous'}`;
    document.getElementById('reviewModalBadge').innerHTML = isFlagged
        ? '<i class="fas fa-flag"></i> Flagged'
        : '<i class="fas fa-star"></i> Review';
    document.getElementById('reviewModalBadge').style.background = isFlagged
        ? 'rgba(239,68,68,0.12)'
        : 'rgba(212,175,55,0.12)';
    document.getElementById('reviewModalBadge').style.color = isFlagged ? '#EF4444' : '#D4AF37';

    const html = `
        <div class="view-detail-grid">
            <div class="view-detail-item">
                <span class="label">Renter</span>
                <span class="value">${review.renterName || 'Anonymous'}</span>
            </div>
            <div class="view-detail-item">
                <span class="label">Vehicle</span>
                <span class="value">${review.vehicleName || 'N/A'}</span>
            </div>
            <div class="view-detail-item">
                <span class="label">Rating</span>
                <span class="value" style="color:#D4AF37;font-size:1.2rem;letter-spacing:3px;">${stars}</span>
            </div>
            <div class="view-detail-item">
                <span class="label">Date</span>
                <span class="value">${date}</span>
            </div>
            <div class="view-detail-item">
                <span class="label">Status</span>
                <span class="value status-${(review.status || 'Approved').toLowerCase()}">${review.status || 'Approved'}</span>
            </div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #EBEEF2;">
            <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:#88909C;font-weight:600;">Review Text</span>
            <p style="margin-top:6px;color:#11141A;font-size:0.95rem;line-height:1.7;white-space:pre-wrap;">${review.text || 'No review text.'}</p>
        </div>
        ${review.adminNote ? `
            <div style="margin-top:16px;padding:12px 16px;background:rgba(239,68,68,0.06);border-radius:10px;border-left:3px solid #EF4444;">
                <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:#88909C;font-weight:600;">Admin Note</span>
                <p style="margin-top:4px;color:#4A5568;font-size:0.9rem;">${review.adminNote}</p>
            </div>
        ` : ''}
    `;

    document.getElementById('reviewModalBody').innerHTML = html;
    document.getElementById('reviewModal').classList.add('open');

    // Show/hide action buttons based on status
    const approveBtn = document.getElementById('modalApproveBtn');
    const deleteBtn = document.getElementById('modalDeleteBtn');
    if (review.status === 'Approved') {
        approveBtn.style.display = 'none';
    } else {
        approveBtn.style.display = 'inline-flex';
    }
};

window.closeReviewModal = function() {
    document.getElementById('reviewModal').classList.remove('open');
    currentReviewId = null;
};

// ============================================================
// 7. MODAL BUTTONS
// ============================================================
function bindModalButtons() {
    const deleteBtn = document.getElementById('modalDeleteBtn');
    const approveBtn = document.getElementById('modalApproveBtn');

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!currentReviewId) return;
            if (!confirm('Permanently delete this review? This cannot be undone.')) return;
            try {
                await window.db.collection('reviews').doc(currentReviewId).delete();
                closeReviewModal();
                await loadReviews();
            } catch (err) {
                alert('Delete failed: ' + err.message);
            }
        });
    }

    if (approveBtn) {
        approveBtn.addEventListener('click', async () => {
            if (!currentReviewId) return;
            try {
                await window.db.collection('reviews').doc(currentReviewId).update({
                    status: 'Approved',
                    flagged: false,
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                closeReviewModal();
                await loadReviews();
            } catch (err) {
                alert('Approve failed: ' + err.message);
            }
        });
    }

    // Close modal on overlay click
    const overlay = document.getElementById('reviewModal');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeReviewModal();
        });
    }

    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeReviewModal();
    });
}

// ============================================================
// 8. ACTION FUNCTIONS
// ============================================================
window.approveReview = async function(id) {
    if (!confirm('Publish this review publicly?')) return;
    try {
        await window.db.collection('reviews').doc(id).update({
            status: 'Approved',
            flagged: false,
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await loadReviews();
    } catch (err) {
        alert('Approve failed: ' + err.message);
    }
};

window.rejectReview = async function(id) {
    const reason = prompt('Reason for rejection (optional):', 'Inappropriate content');
    if (reason === null) return; // user cancelled
    try {
        await window.db.collection('reviews').doc(id).update({
            status: 'Rejected',
            adminNote: reason || 'No reason provided',
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await loadReviews();
    } catch (err) {
        alert('Reject failed: ' + err.message);
    }
};

window.deleteReview = async function(id) {
    if (!confirm('Permanently delete this review? This cannot be undone.')) return;
    try {
        await window.db.collection('reviews').doc(id).delete();
        await loadReviews();
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
};