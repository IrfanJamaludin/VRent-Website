// RentVehicle.js - Full listing logic for V-Rent (with verification gate + auto-license)
// Peninsular Malaysia only — no cross-border, no outstation configuration needed

// ============================================================
// 1. DATA CONFIGURATION
// ============================================================

const subCategories = {
    'motorcycles': ['Sport', 'Scooter', 'Commuter', 'Naked', 'Adventure', 'Touring'],
    'cars': ['Sedan', 'Hatchback', 'SUV', 'MPV'],
    '4x4': ['SUV', 'Pickup'],
    'trucks': ['Light Duty', 'Medium Duty', 'Heavy Duty'],
    'heavy-machinery': ['Earthmoving', 'Roadbuilding', 'Aerial Work Platform']
};

const brands = {
    'motorcycles': ['Yamaha', 'Honda', 'Modenas', 'Kawasaki', 'SYM', 'Suzuki'],
    'cars': ['Perodua', 'Proton', 'Toyota', 'Honda', 'Mazda', 'Nissan', 'Chery', 'BYD', 'BMW'],
    '4x4': ['Toyota', 'Mitsubishi', 'Suzuki', 'Ford'],
    'trucks': ['Isuzu', 'Hino', 'Scania', 'Volvo'],
    'heavy-machinery': ['Caterpillar', 'Komatsu', 'Hitachi', 'SANY', 'Kobelco', 'Genie', 'JLG']
};

// Peninsular-only constraint (enforced at submission)
const PENINSULAR_LOCATIONS = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Selangor', 'Terengganu',
    'Kuala Lumpur', 'Putrajaya', 'Labuan'
];

// ============================================================
// 2. SPEC TEMPLATES (license checkboxes removed — auto-derived)
// ============================================================
const specTemplates = {

    'motorcycles': `
        <div class="form-group">
            <label for="engineCapacity">Engine Capacity (cc) <span class="required">*</span></label>
            <input type="number" id="engineCapacity" placeholder="155" min="50" required />
        </div>
        <div class="form-group">
            <label for="transmission">Transmission <span class="required">*</span></label>
            <select id="transmission" required>
                <option value="">Select</option>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fuelType">Fuel Type <span class="required">*</span></label>
            <select id="fuelType" required>
                <option value="">Select</option>
                <option value="Petrol">Petrol</option>
                <option value="Electric">Electric</option>
            </select>
        </div>
        <div class="form-group">
            <label for="seats">Seat Capacity <span class="required">*</span></label>
            <input type="number" id="seats" placeholder="2" min="1" required />
        </div>
        <div class="form-group">
            <label for="helmetIncluded">Helmet Included</label>
            <select id="helmetIncluded">
                <option value="No">No</option>
                <option value="Yes (1 helmet)">Yes (1 helmet)</option>
                <option value="Yes (2 helmets)">Yes (2 helmets)</option>
            </select>
        </div>
    `,

    'cars': `
        <div class="form-group">
            <label for="seats">Number of Seats <span class="required">*</span></label>
            <input type="number" id="seats" placeholder="5" min="1" required />
        </div>
        <div class="form-group">
            <label for="transmission">Transmission <span class="required">*</span></label>
            <select id="transmission" required>
                <option value="">Select</option>
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fuelType">Fuel Type <span class="required">*</span></label>
            <select id="fuelType" required>
                <option value="">Select</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
            </select>
        </div>
        <div class="form-group">
            <label for="engineCapacity">Engine Capacity <span class="required">*</span></label>
            <input type="text" id="engineCapacity" placeholder="e.g. 1.5L" required />
        </div>
        <div class="form-group">
            <label for="driveType">Drive Type</label>
            <select id="driveType">
                <option value="">Select</option>
                <option value="FWD">FWD</option>
                <option value="RWD">RWD</option>
                <option value="AWD">AWD</option>
                <option value="4WD">4WD</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fuelPolicy">Fuel Policy <span class="required">*</span></label>
            <select id="fuelPolicy" required>
                <option value="">Select</option>
                <option value="Full to Full">Full to Full</option>
                <option value="Full to Half">Full to Half</option>
                <option value="Half to Half">Half to Half</option>
                <option value="Owner Pays">Owner Pays (fuel included)</option>
            </select>
        </div>
        <div class="form-group full">
            <label>Amenities</label>
            <div class="checkbox-group" id="amenitiesGroup">
                <label class="checkbox-label"><input type="checkbox" value="Aircond" /> Aircond</label>
                <label class="checkbox-label"><input type="checkbox" value="Bluetooth" /> Bluetooth</label>
                <label class="checkbox-label"><input type="checkbox" value="Reverse Camera" /> Reverse Camera</label>
                <label class="checkbox-label"><input type="checkbox" value="Apple CarPlay / Android Auto" /> Apple CarPlay / Android Auto</label>
            </div>
        </div>
    `,

    '4x4': `
        <div class="form-group">
            <label for="seats">Number of Seats <span class="required">*</span></label>
            <input type="number" id="seats" placeholder="5" min="1" required />
        </div>
        <div class="form-group">
            <label for="transmission">Transmission <span class="required">*</span></label>
            <select id="transmission" required>
                <option value="">Select</option>
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fuelType">Fuel Type <span class="required">*</span></label>
            <select id="fuelType" required>
                <option value="">Select</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
            </select>
        </div>
        <div class="form-group">
            <label for="engineCapacity">Engine Capacity <span class="required">*</span></label>
            <input type="text" id="engineCapacity" placeholder="e.g. 2.8L" required />
        </div>
        <div class="form-group">
            <label>4x4 System <span class="required">*</span></label>
            <input type="text" id="driveType" placeholder="e.g. 4WD, AWD" required />
        </div>
        <div class="form-group">
            <label for="groundClearance">Ground Clearance (mm)</label>
            <input type="number" id="groundClearance" placeholder="220" min="0" />
        </div>
        <div class="form-group">
            <label for="wadingDepth">Wading Depth (mm)</label>
            <input type="number" id="wadingDepth" placeholder="700" min="0" />
        </div>
        <div class="form-group">
            <label for="diffLock">Diff Lock Type</label>
            <select id="diffLock">
                <option value="">Select</option>
                <option value="None">None</option>
                <option value="Rear Only">Rear Only</option>
                <option value="Front & Rear">Front &amp; Rear</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fuelPolicy">Fuel Policy <span class="required">*</span></label>
            <select id="fuelPolicy" required>
                <option value="">Select</option>
                <option value="Full to Full">Full to Full</option>
                <option value="Full to Half">Full to Half</option>
                <option value="Half to Half">Half to Half</option>
                <option value="Owner Pays">Owner Pays</option>
            </select>
        </div>
    `,

    'trucks': `
        <div class="form-group">
            <label for="truckType">Truck Type <span class="required">*</span></label>
            <select id="truckType" required>
                <option value="">Select</option>
                <option value="Light Duty">Light Duty</option>
                <option value="Medium Duty">Medium Duty</option>
                <option value="Heavy Duty">Heavy Duty</option>
            </select>
        </div>
        <div class="form-group">
            <label for="wheelConfig">Wheel Configuration <span class="required">*</span></label>
            <select id="wheelConfig" required>
                <option value="">Select</option>
                <option value="4x2">4x2</option>
                <option value="6x4">6x4</option>
                <option value="8x4">8x4</option>
            </select>
        </div>
        <div class="form-group">
            <label for="gvw">Gross Vehicle Weight (kg) <span class="required">*</span></label>
            <input type="number" id="gvw" placeholder="7500" min="1000" required />
        </div>
        <div class="form-group">
            <label for="payload">Payload Capacity (kg) <span class="required">*</span></label>
            <input type="number" id="payload" placeholder="4000" min="100" required />
        </div>
        <div class="form-group">
            <label for="transmission">Transmission <span class="required">*</span></label>
            <select id="transmission" required>
                <option value="">Select</option>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fuelType">Fuel Type <span class="required">*</span></label>
            <select id="fuelType" required>
                <option value="Diesel">Diesel</option>
                <option value="Petrol">Petrol</option>
            </select>
        </div>
        <div class="form-group full">
            <label>Cargo/Body Type</label>
            <input type="text" id="cargoType" placeholder="e.g. Box Truck, Flatbed" />
        </div>
        <div class="form-group full">
            <label>Trailer Capability</label>
            <div class="checkbox-group" id="trailerGroup">
                <label class="checkbox-label"><input type="checkbox" value="None" /> None</label>
                <label class="checkbox-label"><input type="checkbox" value="Box" /> Box Trailer</label>
                <label class="checkbox-label"><input type="checkbox" value="Flatbed" /> Flatbed Trailer</label>
                <label class="checkbox-label"><input type="checkbox" value="Tanker" /> Tanker</label>
            </div>
        </div>
        <div class="form-group full">
            <label>Capabilities</label>
            <div class="checkbox-group" id="capabilitiesGroup">
                <label class="checkbox-label"><input type="checkbox" value="Cargo" /> Cargo</label>
                <label class="checkbox-label"><input type="checkbox" value="Construction" /> Construction</label>
                <label class="checkbox-label"><input type="checkbox" value="Delivery" /> Delivery</label>
                <label class="checkbox-label"><input type="checkbox" value="Heavy Haulage" /> Heavy Haulage</label>
            </div>
        </div>
    `,

    'heavy-machinery': `
        <div class="form-group">
            <label for="equipmentType">Equipment Type <span class="required">*</span></label>
            <select id="equipmentType" required>
                <option value="">Select</option>
                <option value="Excavator">Excavator</option>
                <option value="Motor Grader">Motor Grader</option>
                <option value="Wheel Loader">Wheel Loader</option>
                <option value="Scissor Lift">Scissor Lift</option>
                <option value="Boom Lift">Boom Lift</option>
                <option value="Asphalt Paver">Asphalt Paver</option>
            </select>
        </div>
        <div class="form-group">
            <label for="operatingWeight">Operating Weight (kg) <span class="required">*</span></label>
            <input type="number" id="operatingWeight" placeholder="20000" min="100" required />
            <small class="field-hint">
                <i class="fas fa-info-circle"></i> Used to calculate delivery fee automatically.
            </small>
        </div>
        <div class="form-group">
            <label for="operatingHours">Operating Hours <span class="required">*</span></label>
            <input type="number" id="operatingHours" placeholder="3200" min="0" required />
        </div>
        <div class="form-group">
            <label for="enginePower">Engine Power (HP)</label>
            <input type="number" id="enginePower" placeholder="150" min="1" />
        </div>
        <div class="form-group">
            <label for="workingHeight">Working Height (m)</label>
            <input type="number" id="workingHeight" placeholder="12" min="0" step="0.1" />
        </div>
        <div class="form-group">
            <label for="diggingDepth">Digging Depth (m)</label>
            <input type="number" id="diggingDepth" placeholder="5" min="0" step="0.1" />
        </div>

        <div class="form-group full">
            <label>Included Attachments</label>
            <div class="checkbox-group" id="attachmentsGroup">
                <label class="checkbox-label"><input type="checkbox" value="Bucket" /> Standard Bucket</label>
                <label class="checkbox-label"><input type="checkbox" value="Breaker" /> Hydraulic Breaker</label>
                <label class="checkbox-label"><input type="checkbox" value="Ripper" /> Ripper</label>
                <label class="checkbox-label"><input type="checkbox" value="Grapple" /> Grapple</label>
                <label class="checkbox-label"><input type="checkbox" value="Auger" /> Auger</label>
            </div>
        </div>

        <div class="form-group full">
            <label>Delivery Arrangement <span class="required">*</span></label>
            <div class="radio-group" id="deliveryArrangementGroup">
                <label class="radio-label">
                    <input type="radio" name="deliveryArrangement" value="VRent" checked />
                    Use V-Rent Delivery (fee applies)
                </label>
                <label class="radio-label">
                    <input type="radio" name="deliveryArrangement" value="Self" />
                    Owner Arranges (no fee)
                </label>
            </div>
            <small class="field-hint">
                <i class="fas fa-info-circle"></i>
                If V-Rent delivers, the fee is calculated automatically from the operating weight and charged to the renter at booking. (owner will receive full rental price)
            </small>
        </div>

        <div class="form-group full">
            <label>Equipment Capabilities</label>
            <div class="checkbox-group" id="equipCapabilitiesGroup">
                <label class="checkbox-label"><input type="checkbox" value="Excavation" /> Excavation</label>
                <label class="checkbox-label"><input type="checkbox" value="Earthmoving" /> Earthmoving</label>
                <label class="checkbox-label"><input type="checkbox" value="Construction" /> Construction</label>
                <label class="checkbox-label"><input type="checkbox" value="Roadbuilding" /> Roadbuilding</label>
            </div>
        </div>
    `
};

// ============================================================
// 3. CONSTANTS
// ============================================================
const DAYS_PER_WEEK = 7;
const WEEKLY_SUGGESTED_DISCOUNT = 0.10;
const INSPECTION_OPEN_HOUR = 9;
const INSPECTION_CLOSE_HOUR = 17;
const INSPECTION_MAX_DAYS_AHEAD = 60;

// ============================================================
// 4. CLOUDINARY CONFIG
// ============================================================
const CLOUDINARY_CLOUD_NAME = 'ggxrhjdr';
const CLOUDINARY_UPLOAD_PRESET = 'vrent_avatar';

function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (!blob) reject(new Error('Canvas to Blob failed'));
                    else resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
    });
}

async function uploadToCloudinary(file) {
    const compressed = await compressImage(file, 800, 800, 0.8);
    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'vehicles');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.secure_url;
}

// ============================================================
// 5. DOM ELEMENTS
// ============================================================
const form = document.getElementById('rentVehicleForm');
const submitBtn = document.getElementById('submitBtn');
const categorySelect = document.getElementById('vehicleCategory');
const subCategorySelect = document.getElementById('vehicleSubCategory');
const brandSelect = document.getElementById('vehicleBrand');
const yearSelect = document.getElementById('vehicleYear');
const specsContainer = document.getElementById('specificationsContainer');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('imageUpload');
const previewGrid = document.getElementById('imagePreviewGrid');
const statusDiv = document.getElementById('submissionStatus');

const contactMethodSelect = document.getElementById('contactMethod');
const pricePerDayInput = document.getElementById('pricePerDay');
const pricePerWeekInput = document.getElementById('pricePerWeek');
const availableFromInput = document.getElementById('availableFrom');
const availableToInput = document.getElementById('availableTo');
const inspectionDateInput = document.getElementById('inspectionDate');
const inspectionTimeInput = document.getElementById('inspectionTime');

const registrationGroup = document.getElementById('registrationGroup');
const chassisGroup = document.getElementById('chassisGroup');
const roadTaxGroup = document.getElementById('roadTaxGroup');
const insuranceLabel = document.getElementById('insuranceLabel');
const pickupMethodGroup = document.getElementById('pickupMethodGroup');
const vrentDeliveryBadge = document.getElementById('vrentDeliveryBadge');
const deliveryFeeGroup = document.getElementById('deliveryFeeGroup');

// Tick group references (Outstation removed — Peninsular-only platform)
const mileagePolicyGroup = document.querySelector('[data-field="mileagePolicy"]');
const mileageLimitGroup = document.getElementById('mileageLimitGroup');
const mileageExcessGroup = document.getElementById('mileageExcessGroup');

let uploadedImageUrls = [];
let currentUser = null;
let isUploading = false;
let pricePerWeekUserEdited = false;

// ============================================================
// 6. POPULATE YEARS
// ============================================================
function populateYears() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2000; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}
populateYears();

// ============================================================
// 7. TICK GROUPS — MILEAGE POLICY ONLY
// ============================================================
function initTickGroups() {
    if (!mileagePolicyGroup) return;

    // Sync initial dataset
    const initial = mileagePolicyGroup.querySelector('.tick-btn.active');
    if (initial) mileagePolicyGroup.dataset.selected = initial.dataset.value;

    mileagePolicyGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.tick-btn');
        if (!btn) return;

        mileagePolicyGroup.querySelectorAll('.tick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mileagePolicyGroup.dataset.selected = btn.dataset.value;

        const isLimited = btn.dataset.value === 'Limited';
        if (mileageLimitGroup) mileageLimitGroup.style.display = isLimited ? 'flex' : 'none';
        if (mileageExcessGroup) mileageExcessGroup.style.display = isLimited ? 'flex' : 'none';
        if (isLimited) {
            const ml = document.getElementById('mileageLimit');
            if (ml && !ml.value) ml.value = '300';
            const me = document.getElementById('mileageExcess');
            if (me && !me.value) me.value = '0.50';
        }
    });
}
initTickGroups();

// ============================================================
// 8. CATEGORY CHANGE HANDLER
// ============================================================
categorySelect.addEventListener('change', function () {
    const category = this.value;

    subCategorySelect.innerHTML = '<option value="">Select Type</option>';
    if (category && subCategories[category]) {
        subCategories[category].forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.toLowerCase();
            option.textContent = sub;
            subCategorySelect.appendChild(option);
        });
    }

    brandSelect.innerHTML = '<option value="">Select Brand</option>';
    if (category && brands[category]) {
        brands[category].forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.toLowerCase();
            option.textContent = brand;
            brandSelect.appendChild(option);
        });
    }

    if (category && specTemplates[category]) {
        specsContainer.innerHTML = specTemplates[category];
    } else {
        specsContainer.innerHTML = '<p class="empty-specs">Please select a category to view specifications.</p>';
    }

    applyCategoryVisibility(category);
    attachLicenseFieldListeners();
    updateLicenseDisplay();
});

function applyCategoryVisibility(category) {
    const isMachinery = category === 'heavy-machinery';

    if (registrationGroup) registrationGroup.style.display = isMachinery ? 'none' : 'flex';
    if (chassisGroup) chassisGroup.style.display = isMachinery ? 'flex' : 'none';
    const regInput = document.getElementById('registrationNumber');
    if (regInput) {
        regInput.required = !isMachinery;
        if (isMachinery) regInput.value = '';
    }
    const chassisInput = document.getElementById('chassisNumber');
    if (chassisInput && !isMachinery) chassisInput.value = '';

    if (roadTaxGroup) roadTaxGroup.style.display = isMachinery ? 'none' : 'flex';
    const rtInput = document.getElementById('roadTaxStatus');
    if (rtInput && isMachinery) rtInput.value = '';

    if (insuranceLabel) {
        insuranceLabel.textContent = isMachinery
            ? 'Equipment Insurance Status'
            : 'Insurance Status';
    }

    if (isMachinery) {
        if (pickupMethodGroup) pickupMethodGroup.style.display = 'none';
        if (vrentDeliveryBadge) vrentDeliveryBadge.style.display = 'block';
        if (deliveryFeeGroup) deliveryFeeGroup.style.display = 'none';

        const deliveryRadio = document.querySelector('input[name="pickupMethod"][value="Delivery"]');
        if (deliveryRadio) deliveryRadio.checked = true;
    } else {
        if (pickupMethodGroup) pickupMethodGroup.style.display = 'flex';
        if (vrentDeliveryBadge) vrentDeliveryBadge.style.display = 'none';
        if (deliveryFeeGroup) deliveryFeeGroup.style.display = 'flex';

        const pickupRadio = document.querySelector('input[name="pickupMethod"][value="Pickup"]');
        if (pickupRadio) pickupRadio.checked = true;

        const feeInput = document.getElementById('deliveryFee');
        if (feeInput) {
            feeInput.disabled = true;
            feeInput.value = 0;
        }
    }
}

// ============================================================
// 9. AUTO-DERIVED LICENSE DISPLAY
// ============================================================
function updateLicenseDisplay() {
    const box = document.getElementById('licenseInfoBox');
    if (!box) return;

    const titleEl = document.getElementById('licenseInfoTitle');
    const detailEl = document.getElementById('licenseInfoDetail');
    if (!titleEl || !detailEl) return;

    const snapshot = {
        category: categorySelect.value,
        transmission: document.getElementById('transmission')?.value || '',
        engineCapacity: document.getElementById('engineCapacity')?.value || '',
        gvw: document.getElementById('gvw')?.value || '',
        operatingWeight: document.getElementById('operatingWeight')?.value || '',
        equipmentType: document.getElementById('equipmentType')?.value || ''
    };

    if (!snapshot.category) {
        titleEl.textContent = '—';
        detailEl.textContent = 'Select a vehicle category to see requirement';
        return;
    }

    if (typeof window.getRequiredLicense !== 'function') {
        titleEl.textContent = '—';
        detailEl.textContent = 'License rules not loaded.';
        return;
    }

    const { required, reason } = window.getRequiredLicense(snapshot);

    if (!required || required.length === 0) {
        titleEl.textContent = 'No license required';
        detailEl.textContent = 'This vehicle has no license requirement.';
    } else {
        titleEl.textContent = `Class ${required.join(' or ')}`;
        detailEl.textContent = reason || 'Requirement derived from vehicle specifications.';
    }
}

function attachLicenseFieldListeners() {
    ['transmission', 'engineCapacity', 'gvw', 'operatingWeight', 'equipmentType'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.dataset.licenseBound === '1') return;
        el.addEventListener('input', updateLicenseDisplay);
        el.addEventListener('change', updateLicenseDisplay);
        el.dataset.licenseBound = '1';
    });
}

// ============================================================
// 10. WEEKLY PRICE
// ============================================================
function getStandardWeeklyPrice() {
    const perDay = parseFloat(pricePerDayInput.value) || 0;
    return Math.round(perDay * DAYS_PER_WEEK);
}

function getSuggestedWeeklyPrice() {
    const perDay = parseFloat(pricePerDayInput.value) || 0;
    return Math.round(perDay * DAYS_PER_WEEK * (1 - WEEKLY_SUGGESTED_DISCOUNT));
}

function getDiscountPercent() {
    const standard = getStandardWeeklyPrice();
    const current = parseFloat(pricePerWeekInput.value) || 0;
    if (standard <= 0 || current <= 0) return 0;
    const pct = Math.round((1 - current / standard) * 100);
    return pct > 0 ? pct : 0;
}

function ensurePriceBadge() {
    let badge = document.getElementById('weeklyDiscountBadge');
    let hint = document.getElementById('weeklyPriceHint');
    const parent = pricePerWeekInput.parentElement;

    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'weeklyDiscountBadge';
        badge.className = 'discount-badge';
        badge.style.display = 'none';
        parent.appendChild(badge);
    }
    if (!hint) {
        hint = document.createElement('small');
        hint.id = 'weeklyPriceHint';
        hint.className = 'field-hint';
        parent.appendChild(hint);
    }
    return { badge, hint };
}

function refreshWeeklyPrice() {
    const perDay = parseFloat(pricePerDayInput.value) || 0;
    const standard = getStandardWeeklyPrice();
    const suggested = getSuggestedWeeklyPrice();

    pricePerWeekInput.max = standard > 0 ? standard : '';

    const current = parseFloat(pricePerWeekInput.value) || 0;
    if (!pricePerWeekUserEdited) {
        pricePerWeekInput.value = suggested > 0 ? suggested : '';
    } else if (current > standard) {
        pricePerWeekInput.value = standard;
    }

    const { badge, hint } = ensurePriceBadge();
    const discount = getDiscountPercent();

    if (perDay > 0 && standard > 0) {
        if (discount > 0) {
            badge.textContent = `${discount}% OFF`;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
        hint.textContent =
            `Max: RM ${standard} (= RM ${perDay} × 7). ` +
            `Suggested: RM ${suggested} (10% off). ` +
            `Set anything between RM 0 and RM ${standard}.`;
    } else {
        badge.style.display = 'none';
        hint.textContent = 'Enter price per day to auto-calculate a weekly rate.';
    }
}

pricePerDayInput.addEventListener('input', function () {
    pricePerWeekUserEdited = false;
    refreshWeeklyPrice();
});

pricePerWeekInput.addEventListener('input', function () {
    const standard = getStandardWeeklyPrice();
    const current = parseFloat(pricePerWeekInput.value) || 0;
    if (standard > 0 && current > standard) {
        pricePerWeekInput.value = standard;
        alert(`Weekly price cannot exceed RM ${standard} (= RM ${pricePerDayInput.value} × 7).`);
        return;
    }
    pricePerWeekUserEdited = true;
    refreshWeeklyPrice();
});

// ============================================================
// 11. AVAILABILITY GUARDS
// ============================================================
function todayISO() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

function setupAvailabilityGuards() {
    availableFromInput.min = todayISO();
    availableFromInput.addEventListener('change', function () {
        if (this.value) {
            availableToInput.min = this.value;
            if (availableToInput.value && availableToInput.value < this.value) {
                availableToInput.value = this.value;
            }
        }
    });
}
setupAvailabilityGuards();

// ============================================================
// 12. INSPECTION GUARDS
// ============================================================
function setupInspectionGuards() {
    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + INSPECTION_MAX_DAYS_AHEAD);

    inspectionDateInput.min = todayISO();
    inspectionDateInput.max = max.toISOString().split('T')[0];
    inspectionTimeInput.min = `${String(INSPECTION_OPEN_HOUR).padStart(2, '0')}:00`;
    inspectionTimeInput.max = `${String(INSPECTION_CLOSE_HOUR).padStart(2, '0')}:00`;

    inspectionDateInput.addEventListener('change', function () {
        if (!this.value) return;
        const d = new Date(this.value + 'T00:00:00');
        const day = d.getDay();
        if (day === 0 || day === 6) {
            alert('Inspections are only available on weekdays (Mon–Fri). Please pick another date.');
            this.value = '';
        }
    });

    inspectionTimeInput.addEventListener('change', function () {
        if (!this.value) return;
        const [h, m] = this.value.split(':').map(Number);
        const totalMin = h * 60 + m;
        const openMin = INSPECTION_OPEN_HOUR * 60;
        const closeMin = INSPECTION_CLOSE_HOUR * 60;

        if (totalMin < openMin || totalMin > closeMin) {
            alert(
                `Inspections are only available between ` +
                `${String(INSPECTION_OPEN_HOUR).padStart(2, '0')}:00 and ` +
                `${String(INSPECTION_CLOSE_HOUR).padStart(2, '0')}:00.`
            );
            this.value = '';
        }
    });
}
setupInspectionGuards();

// ============================================================
// 13. IMAGE UPLOAD (Cloudinary)
// ============================================================
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
});

function createPreviewTile(file) {
    const preview = document.createElement('div');
    preview.className = 'image-preview-item uploading';
    const objectUrl = URL.createObjectURL(file);
    preview.innerHTML = `
        <img src="${objectUrl}" alt="Vehicle photo" />
        <div class="uploading-overlay">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Uploading...</span>
        </div>
    `;
    return { preview, objectUrl };
}

function finalizePreviewTile(preview, url, objectUrl) {
    preview.classList.remove('uploading');
    preview.innerHTML = `
        <img src="${url}" alt="Vehicle photo" />
        <button type="button" class="remove-image" data-url="${url}" aria-label="Remove photo">
            <i class="fas fa-times"></i>
        </button>
    `;
    preview.querySelector('.remove-image').addEventListener('click', function () {
        const targetUrl = this.dataset.url;
        uploadedImageUrls = uploadedImageUrls.filter(u => u !== targetUrl);
        preview.remove();
    });
    URL.revokeObjectURL(objectUrl);
}

function failPreviewTile(preview, objectUrl) {
    preview.classList.remove('uploading');
    preview.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#ef4444;padding:16px;text-align:center;">
            <i class="fas fa-exclamation-circle" style="font-size:1.5rem;"></i>
            <span style="font-size:0.7rem;">Upload failed</span>
        </div>
    `;
    URL.revokeObjectURL(objectUrl);
}

async function handleFiles(files) {
    const maxFiles = 8 - uploadedImageUrls.length;
    if (maxFiles <= 0) {
        alert('Maximum 8 photos allowed.');
        return;
    }
    if (isUploading) {
        alert('Please wait for current uploads to finish.');
        return;
    }

    const validFiles = Array.from(files).filter(file =>
        file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    ).slice(0, maxFiles);

    if (validFiles.length === 0) {
        alert('Please upload valid image files (max 10MB each).');
        return;
    }

    isUploading = true;

    const tiles = validFiles.map(file => {
        const { preview, objectUrl } = createPreviewTile(file);
        previewGrid.appendChild(preview);
        return { preview, file, objectUrl };
    });

    let failed = 0;

    await Promise.all(tiles.map(async ({ preview, file, objectUrl }) => {
        try {
            const url = await uploadToCloudinary(file);
            uploadedImageUrls.push(url);
            finalizePreviewTile(preview, url, objectUrl);
        } catch (err) {
            console.error('Upload error:', err);
            failed++;
            failPreviewTile(preview, objectUrl);
        }
    }));

    isUploading = false;

    if (failed > 0) {
        alert(`${failed} photo${failed > 1 ? 's' : ''} failed to upload. Please try again.`);
    }
}

// ============================================================
// 14. DELIVERY FEE TOGGLE (non-machinery)
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    const pickupRadios = document.querySelectorAll('input[name="pickupMethod"]');
    const deliveryFeeInput = document.getElementById('deliveryFee');

    pickupRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (categorySelect.value === 'heavy-machinery') return;

            if (this.value === 'Pickup') {
                deliveryFeeInput.disabled = true;
                deliveryFeeInput.value = 0;
            } else {
                deliveryFeeInput.disabled = false;
                if (deliveryFeeInput.value === '0') deliveryFeeInput.value = '';
            }
        });
    });
});

// ============================================================
// 15. CHECKBOX HELPER
// ============================================================
function getCheckboxValues(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const values = [];
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        values.push(cb.value);
    });
    return values;
}

// ============================================================
// 16. FORM SUBMISSION
// ============================================================
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // ---- AUTH CHECK ----
    if (!currentUser) {
        if (typeof window.showAuthGate === 'function') window.showAuthGate();
        else window.location.href = 'MainPage.html';
        return;
    }

    // ---- VERIFICATION CHECK ----
    try {
        const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const vStatus = userData.verificationStatus || 'Not Submitted';
        const vClasses = Array.isArray(userData.licenseClasses)
            ? userData.licenseClasses
            : (userData.licenseClasses ? String(userData.licenseClasses).split(',').map(s => s.trim()) : []);

        if (vStatus !== 'Approved' || vClasses.length === 0) {
            if (typeof window.showVerifyGate === 'function') {
                window.showVerifyGate(
                    vStatus === 'Pending' ? 'pending'
                    : vStatus === 'Rejected' ? 'rejected'
                    : 'missing'
                );
            } else {
                alert('You must be verified before listing a vehicle. Please visit your Dashboard.');
                window.location.href = 'Dashboard.html';
            }
            return;
        }
    } catch (err) {
        console.error('Verification check failed:', err);
        alert('Could not verify your account status. Please try again.');
        return;
    }

    // ---- PHOTOS MINIMUM ----
    if (uploadedImageUrls.length < 3) {
        alert('Please upload at least 3 photos of your vehicle.');
        return;
    }

    const category = categorySelect.value;
    const isMachinery = category === 'heavy-machinery';

    // ---- Gather values ----
    const ownerPhone = document.getElementById('ownerPhone').value.trim();
    const contactMethod = contactMethodSelect.value;
    const subCategory = subCategorySelect.value;
    const brand = brandSelect.value;
    const model = document.getElementById('vehicleModel').value.trim();
    const year = parseInt(yearSelect.value);
    const color = document.getElementById('vehicleColor').value.trim();
    const registrationNumber = document.getElementById('registrationNumber').value.trim();
    const chassisNumber = document.getElementById('chassisNumber').value.trim();
    const mileage = document.getElementById('vehicleMileage').value.trim();
    const lastMaintenance = document.getElementById('lastMaintenance').value;
    const insuranceStatus = document.getElementById('insuranceStatus').value;
    const roadTaxStatus = document.getElementById('roadTaxStatus').value;
    const vehicleCondition = document.getElementById('vehicleCondition').value;
    const existingDamage = document.getElementById('existingDamage').value.trim();
    const pricePerDay = parseFloat(pricePerDayInput.value);
    const pricePerWeek = parseFloat(pricePerWeekInput.value) || 0;
    const minRentalPeriod = parseInt(document.getElementById('minRentalPeriod').value);
    const maxRentalPeriod = parseInt(document.getElementById('maxRentalPeriod').value) || null;
    const rentalLocation = document.getElementById('rentalLocation').value;
    const availableFrom = availableFromInput.value;
    const availableTo = availableToInput.value;

    // ---- Mileage policy (from tick group) ----
    const mileagePolicy = mileagePolicyGroup?.dataset.selected || 'Unlimited';
    const mileageLimit = mileagePolicy === 'Limited'
        ? (parseInt(document.getElementById('mileageLimit').value) || 0)
        : 0;
    const mileageExcessRate = mileagePolicy === 'Limited'
        ? (parseFloat(document.getElementById('mileageExcess').value) || 0)
        : 0;

    const pickupMethod = isMachinery
        ? 'Delivery'
        : (document.querySelector('input[name="pickupMethod"]:checked')?.value || 'Pickup');
    const deliveryFee = isMachinery
        ? 0
        : (parseFloat(document.getElementById('deliveryFee').value) || 0);
    const securityDeposit = parseFloat(document.getElementById('securityDeposit').value) || 0;
    const rentalRules = getCheckboxValues('rentalRulesGroup');
    const description = document.getElementById('vehicleDescription').value.trim();
    const inspectionDate = inspectionDateInput.value;
    const inspectionTime = inspectionTimeInput.value;

    // ---- Required fields ----
    const identityNumber = isMachinery ? chassisNumber : registrationNumber;
    if (!ownerPhone || !category || !subCategory || !brand || !model || !year || !color ||
        !identityNumber || !vehicleCondition || !pricePerDay || !minRentalPeriod ||
        !rentalLocation || !description || !inspectionDate || !inspectionTime) {
        alert('Please fill in all required fields.');
        return;
    }

    // ---- PENINSULAR-ONLY SAFETY CHECK ----
    if (!PENINSULAR_LOCATIONS.includes(rentalLocation)) {
        alert('Please select a valid rental location.');
        return;
    }

    // ---- Weekly price cap ----
    const standardWeekly = getStandardWeeklyPrice();
    if (pricePerWeek > standardWeekly) {
        alert(`Weekly price cannot exceed RM ${standardWeekly}. Please lower it.`);
        return;
    }

    // ---- Availability sanity ----
    if (availableFrom && availableTo && availableTo < availableFrom) {
        alert('Available "To" date must be after the "From" date.');
        return;
    }

    // ---- Mileage policy validation ----
    if (mileagePolicy === 'Limited') {
        if (!mileageLimit || mileageLimit < 50) {
            alert('Please enter a valid daily mileage cap (minimum 50 km).');
            return;
        }
        if (!mileageExcessRate || mileageExcessRate <= 0) {
            alert('Please enter a valid excess charge per km.');
            return;
        }
    }

    // ---- Inspection weekday + hours ----
    const inspectionDay = new Date(inspectionDate + 'T00:00:00').getDay();
    if (inspectionDay === 0 || inspectionDay === 6) {
        alert('Inspections are only available on weekdays (Mon–Fri).');
        return;
    }
    const [ih, im] = inspectionTime.split(':').map(Number);
    const totalMin = ih * 60 + im;
    if (totalMin < INSPECTION_OPEN_HOUR * 60 || totalMin > INSPECTION_CLOSE_HOUR * 60) {
        alert(`Inspection time must be between ${INSPECTION_OPEN_HOUR}:00 and ${INSPECTION_CLOSE_HOUR}:00.`);
        return;
    }

    // ---- Build vehicle object ----
    const vehicleData = {
        ownerId: currentUser.uid,
        ownerName: document.getElementById('ownerName').value || currentUser.displayName || 'User',
        ownerEmail: document.getElementById('ownerEmail').value || currentUser.email || '',
        ownerPhone,
        contactMethod,
        category,
        subCategory,
        brand,
        model,
        year,
        color,
        registrationNumber: isMachinery ? null : registrationNumber,
        chassisNumber: isMachinery ? chassisNumber : null,
        mileage: mileage || null,
        lastMaintenance: lastMaintenance || null,
        insuranceStatus: insuranceStatus || null,
        roadTaxStatus: isMachinery ? null : (roadTaxStatus || null),
        vehicleCondition,
        existingDamage: existingDamage || null,
        pricePerDay,
        pricePerWeek,
        weeklyDiscountPercent: getDiscountPercent(),
        minRentalPeriod,
        maxRentalPeriod,
        rentalLocation,
        availableFrom: availableFrom || null,
        availableTo: availableTo || null,

        // ---- Mileage policy fields ----
        mileagePolicy,
        mileageLimit,
        mileageExcessRate,

        // ---- Outstation: hardcoded — Peninsular-only platform ----
        outstationScope: 'Peninsular',
        outstationAllowed: true,
        outstationFee: 0,

        pickupMethod,
        deliveryFee,
        securityDeposit,
        rentalRules,
        description,
        images: uploadedImageUrls,
        inspectionDate,
        inspectionTime,
        approvalStatus: 'Pending',
        availability: 'Unavailable',
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        adminNote: ''
    };

    // ---- Category-specific fields ----
    if (category === 'cars') {
        vehicleData.seats = parseInt(document.getElementById('seats').value);
        vehicleData.transmission = document.getElementById('transmission').value;
        vehicleData.fuelType = document.getElementById('fuelType').value;
        vehicleData.engineCapacity = document.getElementById('engineCapacity').value;
        vehicleData.driveType = document.getElementById('driveType').value || null;
        vehicleData.fuelPolicy = document.getElementById('fuelPolicy').value;
        vehicleData.amenities = getCheckboxValues('amenitiesGroup');

    } else if (category === '4x4') {
        vehicleData.seats = parseInt(document.getElementById('seats').value);
        vehicleData.transmission = document.getElementById('transmission').value;
        vehicleData.fuelType = document.getElementById('fuelType').value;
        vehicleData.engineCapacity = document.getElementById('engineCapacity').value;
        vehicleData.driveType = document.getElementById('driveType').value;
        vehicleData.groundClearance = parseInt(document.getElementById('groundClearance').value) || 0;
        vehicleData.wadingDepth = parseInt(document.getElementById('wadingDepth').value) || 0;
        vehicleData.diffLock = document.getElementById('diffLock').value || null;
        vehicleData.fuelPolicy = document.getElementById('fuelPolicy').value;

    } else if (category === 'motorcycles') {
        vehicleData.seats = parseInt(document.getElementById('seats').value);
        vehicleData.transmission = document.getElementById('transmission').value;
        vehicleData.fuelType = document.getElementById('fuelType').value;
        vehicleData.engineCapacity = parseInt(document.getElementById('engineCapacity').value);
        vehicleData.helmetIncluded = document.getElementById('helmetIncluded').value;

    } else if (category === 'trucks') {
        vehicleData.truckType = document.getElementById('truckType').value;
        vehicleData.wheelConfig = document.getElementById('wheelConfig').value;
        vehicleData.gvw = parseInt(document.getElementById('gvw').value);
        vehicleData.payload = parseInt(document.getElementById('payload').value);
        vehicleData.transmission = document.getElementById('transmission').value;
        vehicleData.fuelType = document.getElementById('fuelType').value;
        vehicleData.cargoType = document.getElementById('cargoType').value || null;
        vehicleData.trailerCapability = getCheckboxValues('trailerGroup');
        vehicleData.capabilities = getCheckboxValues('capabilitiesGroup');

    } else if (category === 'heavy-machinery') {
        vehicleData.equipmentType = document.getElementById('equipmentType').value;
        vehicleData.operatingWeight = parseInt(document.getElementById('operatingWeight').value);
        vehicleData.operatingHours = parseInt(document.getElementById('operatingHours').value);
        vehicleData.enginePower = parseInt(document.getElementById('enginePower').value) || 0;
        vehicleData.workingHeight = parseFloat(document.getElementById('workingHeight').value) || 0;
        vehicleData.diggingDepth = parseFloat(document.getElementById('diggingDepth').value) || 0;
        vehicleData.attachments = getCheckboxValues('attachmentsGroup');
        vehicleData.equipCapabilities = getCheckboxValues('equipCapabilitiesGroup');

        const arrangement = document.querySelector('input[name="deliveryArrangement"]:checked')?.value || 'VRent';
        vehicleData.deliveredByVRent = (arrangement === 'VRent');
    }

    // ---- AUTO-DERIVE required license ----
    if (typeof window.getRequiredLicense === 'function') {
        const licenseInfo = window.getRequiredLicense(vehicleData);
        vehicleData.requiredLicense = licenseInfo.required || [];
        vehicleData.licenseReason = licenseInfo.reason || '';
    } else {
        vehicleData.requiredLicense = [];
        vehicleData.licenseReason = '';
        console.warn('LicenseRules.js not loaded — requiredLicense not derived');
    }

    // ---- Submit ----
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        await window.db.collection('vehicles').add(vehicleData);

        try {
            await window.db.collection('users').doc(currentUser.uid).set(
                { preferredContactMethod: contactMethod },
                { merge: true }
            );
        } catch (profileErr) {
            console.warn('Could not save preferred contact method:', profileErr);
        }

        form.style.display = 'none';
        statusDiv.style.display = 'block';

    } catch (error) {
        console.error('Submission error:', error);
        alert('Error submitting vehicle: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Vehicle for Approval';
    }
});

// ============================================================
// 17. LOAD USER DATA
// ============================================================
function loadUserData(user) {
    currentUser = user;
    document.getElementById('ownerName').value =
        user.displayName || (user.email ? user.email.split('@')[0] : 'User');
    document.getElementById('ownerEmail').value = user.email || '';

    window.db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
                document.getElementById('ownerName').value =
                    fullName || user.displayName || 'User';
                document.getElementById('ownerEmail').value =
                    data.email || user.email || '';
                document.getElementById('ownerPhone').value = data.phone || '';

                if (data.preferredContactMethod && contactMethodSelect) {
                    contactMethodSelect.value = data.preferredContactMethod;
                }
            }
        })
        .catch(err => console.error('Error loading user data:', err));
}

// ============================================================
// 18. INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    if (!window.auth) {
        console.error('Firebase auth not available — check the Firebase config block.');
        return;
    }

    ensurePriceBadge();
    refreshWeeklyPrice();
    updateLicenseDisplay();

    window.auth.onAuthStateChanged(function (user) {
        if (user) {
            loadUserData(user);
        } else {
            currentUser = null;
            // Gate controller in RentVehicle.html handles the modal
        }
    });
});