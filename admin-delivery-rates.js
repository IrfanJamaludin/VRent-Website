// admin-delivery-rates.js

const DeliveryRates = {
    all: [],
    deleteTarget: null,
    _listenerBound: false,

    async init() {
        await window.AdminPanel.initAuth();
        this.bindUI();
        this.listen();
    },

    bindUI() {
        document.getElementById('addRateBtn')?.addEventListener('click', () => this.openModal());
        document.getElementById('rateForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => this.confirmDelete());

        // Auto-sync reverse route hint
        document.getElementById('rateOrigin')?.addEventListener('change', this.updateHint);
        document.getElementById('rateDestination')?.addEventListener('change', this.updateHint);
    },

    updateHint() {
        const o = document.getElementById('rateOrigin')?.value;
        const d = document.getElementById('rateDestination')?.value;
        const hint = document.getElementById('rateReverseHint');
        if (!hint) return;
        if (o && d && o !== d) {
            hint.textContent = `💡 Tip: create the reverse route "${d} → ${o}" too, for round trips.`;
        } else {
            hint.textContent = '';
        }
    },

    listen() {
        if (this._listenerBound) return;
        this._listenerBound = true;

        window.db.collection('deliveryRates')
            .onSnapshot(snap => {
                this.all = [];
                snap.forEach(doc => this.all.push({ id: doc.id, ...doc.data() }));
                this.all.sort((a, b) =>
                    (a.originState || '').localeCompare(b.originState || '') ||
                    (a.destinationState || '').localeCompare(b.destinationState || '')
                );
                this.render();
            }, err => {
                console.error('Rates listener error:', err);
                const c = document.getElementById('ratesList');
                if (c) c.innerHTML = `<div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Could not load rates.</p>
                </div>`;
            });
    },

    render() {
        const c = document.getElementById('ratesList');
        if (!c) return;

        if (this.all.length === 0) {
            c.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><p>No delivery rates configured yet.</p></div>`;
            return;
        }

        const multipliers = { 'cars': 1.0, 'motorcycles': 0.6, '4x4': 1.2, 'trucks': 1.8, 'heavy-machinery': 3.0 };

        let html = `<table class="admin-table"><thead><tr>
            <th>Origin</th><th>Destination</th><th>Base Rate</th>
            <th>Car</th><th>4x4</th><th>Truck</th><th>Moto</th>
            <th>Status</th><th>Actions</th>
        </tr></thead><tbody>`;

        this.all.forEach(r => {
            const base = r.baseRate || 0;
            const car = Math.round(base * multipliers.cars);
            const x4 = Math.round(base * multipliers['4x4']);
            const truck = Math.round(base * multipliers.trucks);
            const moto = Math.round(base * multipliers.motorcycles);

            const statusClass = r.active ? 'approved' : 'rejected';

            html += `<tr>
                <td><strong>${r.originState}</strong></td>
                <td><strong>${r.destinationState}</strong></td>
                <td>RM ${base}</td>
                <td>RM ${car}</td>
                <td>RM ${x4}</td>
                <td>RM ${truck}</td>
                <td>RM ${moto}</td>
                <td><span class="status-badge ${statusClass}">${r.active ? 'Active' : 'Disabled'}</span></td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="DeliveryRates.edit('${r.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="DeliveryRates.delete('${r.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });

        html += `</tbody></table>`;
        c.innerHTML = html;
    },

    openModal(rate = null) {
        document.getElementById('rateModal').classList.add('open');
        const title = document.getElementById('rateModalTitle');
        const form = document.getElementById('rateForm');
        form.reset();
        document.getElementById('rateId').value = '';

        if (rate) {
            title.textContent = 'Edit Delivery Route';
            document.getElementById('rateId').value = rate.id;
            document.getElementById('rateOrigin').value = rate.originState || '';
            document.getElementById('rateDestination').value = rate.destinationState || '';
            document.getElementById('rateAmount').value = rate.baseRate || 0;
            document.getElementById('rateStatus').value = String(rate.active ?? true);
        } else {
            title.textContent = 'Add Delivery Route';
        }
        this.updateHint();
    },

    edit(id) {
        const r = this.all.find(x => x.id === id);
        if (r) this.openModal(r);
    },

    closeModal() {
        document.getElementById('rateModal').classList.remove('open');
    },

    async save() {
        const id = document.getElementById('rateId').value;
        const origin = document.getElementById('rateOrigin').value;
        const destination = document.getElementById('rateDestination').value;
        const baseRate = parseFloat(document.getElementById('rateAmount').value);
        const active = document.getElementById('rateStatus').value === 'true';

        if (!origin || !destination || !baseRate) {
            alert('All fields are required.');
            return;
        }
        if (origin === destination) {
            alert('Origin and destination cannot be the same.');
            return;
        }

        const btn = document.getElementById('rateSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const data = {
                originState: origin,
                destinationState: destination,
                baseRate,
                active,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (id) {
                await window.db.collection('deliveryRates').doc(id).update(data);
            } else {
                // Doc ID pattern: Origin__Destination (safe + unique)
                const docId = `${origin}__${destination}`.replace(/\s+/g, '_');
                await window.db.collection('deliveryRates').doc(docId).set({
                    ...data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            this.closeModal();
        } catch (err) {
            alert('Save failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Route';
        }
    },

    delete(id) {
        this.deleteTarget = id;
        document.getElementById('deleteModal').classList.add('open');
    },

    closeDeleteModal() {
        this.deleteTarget = null;
        document.getElementById('deleteModal').classList.remove('open');
    },

    async confirmDelete() {
        if (!this.deleteTarget) return;
        try {
            await window.db.collection('deliveryRates').doc(this.deleteTarget).delete();
            this.closeDeleteModal();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Wait for AdminPanel to boot first
    setTimeout(() => DeliveryRates.init(), 100);
});