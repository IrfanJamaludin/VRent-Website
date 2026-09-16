// LicenseRules.js — Malaysian driving license derivation for V-Rent
// Based on JPJ categories (2024). Used by RentVehicle / Booking / VehicleDetails.

(function () {
    'use strict';

    // ============================================================
    // DERIVE REQUIRED LICENSE CLASSES FROM VEHICLE DATA
    // Returns: { required: [...], reason: 'short text' }
    // `required` = array of classes that would satisfy booking.
    //              Any match with a user's verified classes → OK.
    // ============================================================
    window.getRequiredLicense = function (vehicle) {
        if (!vehicle) return { required: [], reason: '' };
        const cat = (vehicle.category || '').toLowerCase();

        // --------------------------------------------------------
        // MOTORCYCLES — by engine capacity (cc)
        // --------------------------------------------------------
        if (cat === 'motorcycles') {
            const cc = parseInt(vehicle.engineCapacity) || 0;
            if (cc <= 0) {
                return { required: ['B2', 'B1', 'B'], reason: 'Motorcycle' };
            }
            if (cc <= 250) return { required: ['B2', 'B1', 'B'], reason: `${cc}cc — light motorcycle (B2)` };
            if (cc <= 500) return { required: ['B1', 'B'],      reason: `${cc}cc — medium motorcycle (B1)` };
            return { required: ['B'],                           reason: `${cc}cc — full motorcycle (B)` };
        }

        // --------------------------------------------------------
        // CARS — by transmission
        // --------------------------------------------------------
        if (cat === 'cars') {
            const trans = (vehicle.transmission || '').toLowerCase();
            if (trans === 'manual') {
                return { required: ['D'], reason: 'Requires Class D' };
            }
            return { required: ['D', 'DA'], reason: 'Accepts D or DA' };
        }

        // --------------------------------------------------------
        // 4x4 — by transmission (unladen ≤ 3500kg)
        // --------------------------------------------------------
        if (cat === '4x4') {
            const trans = (vehicle.transmission || '').toLowerCase();
            if (trans === 'manual') {
                return { required: ['D'], reason: 'Requires Class D' };
            }
            return { required: ['D', 'DA'], reason: 'Accepts D or DA' };
        }

        // --------------------------------------------------------
        // TRUCKS — by gross vehicle weight (GVW)
        // --------------------------------------------------------
        if (cat === 'trucks') {
            const gvw = parseInt(vehicle.gvw) || 0;
            if (gvw <= 0) {
                return { required: ['E2', 'E1', 'E'], reason: 'Truck — weight unknown' };
            }
            if (gvw <= 5000) return { required: ['E2', 'E1', 'E'], reason: `${gvw}kg GVW — light truck (E2)` };
            if (gvw <= 7500) return { required: ['E1', 'E'],       reason: `${gvw}kg GVW — medium truck (E1)` };
            return { required: ['E'],                              reason: `${gvw}kg GVW — heavy truck (E)` };
        }

        // --------------------------------------------------------
        // HEAVY MACHINERY — by weight + tracked/wheeled
        // --------------------------------------------------------
        if (cat === 'heavy-machinery') {
            const weight = parseInt(vehicle.operatingWeight) || 0;
            const equip = (vehicle.equipmentType || '').toLowerCase();

            const isTracked =
                equip.includes('excavator') ||
                equip.includes('grader') ||
                equip.includes('crawler') ||
                equip.includes('dozer');

            if (weight <= 0) {
                return {
                    required: isTracked ? ['G', 'I'] : ['F', 'H'],
                    reason: 'Machinery — weight unknown'
                };
            }
            if (weight <= 5000) {
                return isTracked
                    ? { required: ['G'], reason: `${weight}kg — tracked, light (G)` }
                    : { required: ['F'], reason: `${weight}kg — wheeled, light (F)` };
            }
            return isTracked
                ? { required: ['I'], reason: `${weight}kg — tracked, heavy (I)` }
                : { required: ['H'], reason: `${weight}kg — wheeled, heavy (H)` };
        }

        return { required: [], reason: '' };
    };

    // ============================================================
    // CHECK IF USER'S VERIFIED CLASSES SATISFY A REQUIREMENT
    // ============================================================
    window.userHasRequiredLicense = function (userClasses, required) {
        if (!Array.isArray(required) || required.length === 0) return true;
        if (!Array.isArray(userClasses) || userClasses.length === 0) return false;
        return required.some(cls => userClasses.includes(cls));
    };

    // ============================================================
    // HUMAN-READABLE CLASS DESCRIPTION
    // ============================================================
    window.getLicenseDescription = function (cls) {
        const map = {
            'A':  'Category A — Disabled persons (invalid carriage)',
            'A1': 'Category A1 — Disabled persons (motorcar)',
            'B':  'Category B — Motorcycle >500cc',
            'B1': 'Category B1 — Motorcycle ≤500cc',
            'B2': 'Category B2 — Motorcycle ≤250cc',
            'C':  'Category C — Three-wheeled motorcycle',
            'D':  'Category D — Manual car/SUV/van ≤3500kg',
            'DA': 'Category DA — Automatic car ≤3500kg',
            'E':  'Category E — Heavy truck >7500kg',
            'E1': 'Category E1 — Medium truck ≤7500kg',
            'E2': 'Category E2 — Light truck ≤5000kg',
            'F':  'Category F — Wheeled machinery ≤5000kg',
            'G':  'Category G — Tracked machinery ≤5000kg',
            'H':  'Category H — Wheeled machinery >5000kg',
            'I':  'Category I — Tracked machinery >5000kg'
        };
        return map[cls] || cls;
    };
})();