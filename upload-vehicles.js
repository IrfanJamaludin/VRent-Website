// upload-vehicles.js
// Run this in your browser console to upload all vehicles to Firebase

const db = firebase.firestore();

// ============================================
// 1. MOTORCYCLES
// ============================================
const motorcycles = [
    // Yamaha
    { brand: "Yamaha", model: "Y15ZR", category: "motorcycles", pricePerDay: 80, seats: 2, transmission: "Manual", fuelType: "Petrol", images: ["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400&h=250&fit=crop&crop=center"] },
    { brand: "Yamaha", model: "Y16ZR", category: "motorcycles", pricePerDay: 90, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Yamaha", model: "135LC Fi", category: "motorcycles", pricePerDay: 70, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Yamaha", model: "NVX", category: "motorcycles", pricePerDay: 100, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Yamaha", model: "NMAX", category: "motorcycles", pricePerDay: 110, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Yamaha", model: "R15M", category: "motorcycles", pricePerDay: 120, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Yamaha", model: "R25", category: "motorcycles", pricePerDay: 150, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Yamaha", model: "MT-15", category: "motorcycles", pricePerDay: 130, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Yamaha", model: "MT-07", category: "motorcycles", pricePerDay: 200, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Yamaha", model: "MT-09", category: "motorcycles", pricePerDay: 250, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    
    // Honda Motorcycles
    { brand: "Honda", model: "EX5", category: "motorcycles", pricePerDay: 50, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "Wave Alpha", category: "motorcycles", pricePerDay: 55, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "RS-X", category: "motorcycles", pricePerDay: 75, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "RS150R", category: "motorcycles", pricePerDay: 70, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "Vario 125", category: "motorcycles", pricePerDay: 85, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "Vario 160", category: "motorcycles", pricePerDay: 95, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "ADV160", category: "motorcycles", pricePerDay: 110, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "ADV350", category: "motorcycles", pricePerDay: 180, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "CB250R", category: "motorcycles", pricePerDay: 140, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "CB500X", category: "motorcycles", pricePerDay: 220, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    
    // Modenas
    { brand: "Modenas", model: "Kriss 110", category: "motorcycles", pricePerDay: 40, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Modenas", model: "Kriss 125 Fi", category: "motorcycles", pricePerDay: 45, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Modenas", model: "Elegan 250", category: "motorcycles", pricePerDay: 90, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Modenas", model: "Pulsar NS200", category: "motorcycles", pricePerDay: 100, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Modenas", model: "Dominar D400", category: "motorcycles", pricePerDay: 130, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Modenas", model: "DTX 250", category: "motorcycles", pricePerDay: 110, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    
    // Kawasaki
    { brand: "Kawasaki", model: "Ninja 250", category: "motorcycles", pricePerDay: 130, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Kawasaki", model: "Ninja 500", category: "motorcycles", pricePerDay: 180, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Kawasaki", model: "Ninja ZX-4R", category: "motorcycles", pricePerDay: 220, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Kawasaki", model: "Z250", category: "motorcycles", pricePerDay: 120, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Kawasaki", model: "Z500", category: "motorcycles", pricePerDay: 170, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Kawasaki", model: "Versys 650", category: "motorcycles", pricePerDay: 240, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Kawasaki", model: "KLX230", category: "motorcycles", pricePerDay: 150, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    
    // SYM
    { brand: "SYM", model: "VF3i", category: "motorcycles", pricePerDay: 45, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "SYM", model: "Husky 150", category: "motorcycles", pricePerDay: 60, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "SYM", model: "Jet X 150", category: "motorcycles", pricePerDay: 75, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "SYM", model: "Jet 14", category: "motorcycles", pricePerDay: 65, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "SYM", model: "ADX 300", category: "motorcycles", pricePerDay: 100, seats: 2, transmission: "Automatic", fuelType: "Petrol", images: [] },
    
    // Suzuki Motorcycles
    { brand: "Suzuki", model: "Raider R150", category: "motorcycles", pricePerDay: 80, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Suzuki", model: "GSX-R150", category: "motorcycles", pricePerDay: 100, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Suzuki", model: "GSX-S150", category: "motorcycles", pricePerDay: 90, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Suzuki", model: "V-Strom 250SX", category: "motorcycles", pricePerDay: 130, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Suzuki", model: "V-Strom 650", category: "motorcycles", pricePerDay: 220, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
];

// ============================================
// 2. CARS
// ============================================
const cars = [
    // Perodua
    { brand: "Perodua", model: "Axia", category: "cars", pricePerDay: 90, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Perodua", model: "Bezza", category: "cars", pricePerDay: 100, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Perodua", model: "Myvi", category: "cars", pricePerDay: 120, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: ["https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&h=250&fit=crop&crop=center"] },
    { brand: "Perodua", model: "Alza", category: "cars", pricePerDay: 150, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Perodua", model: "Ativa", category: "cars", pricePerDay: 140, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Perodua", model: "Aruz", category: "cars", pricePerDay: 160, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Perodua", model: "Traz", category: "cars", pricePerDay: 130, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    
    // Proton
    { brand: "Proton", model: "Saga", category: "cars", pricePerDay: 100, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: ["https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=250&fit=crop&crop=center"] },
    { brand: "Proton", model: "Persona", category: "cars", pricePerDay: 120, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Proton", model: "Iriz", category: "cars", pricePerDay: 110, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Proton", model: "S70", category: "cars", pricePerDay: 140, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Proton", model: "X50", category: "cars", pricePerDay: 180, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Proton", model: "X70", category: "cars", pricePerDay: 210, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Proton", model: "X90", category: "cars", pricePerDay: 250, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
    
    // Toyota Cars
    { brand: "Toyota", model: "Vios", category: "cars", pricePerDay: 150, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Toyota", model: "Yaris", category: "cars", pricePerDay: 140, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Toyota", model: "Corolla Altis", category: "cars", pricePerDay: 190, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Toyota", model: "Camry", category: "cars", pricePerDay: 280, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Toyota", model: "Corolla Cross", category: "cars", pricePerDay: 210, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Toyota", model: "Innova", category: "cars", pricePerDay: 230, seats: 7, transmission: "Automatic", fuelType: "Diesel", images: [] },
    { brand: "Toyota", model: "Veloz", category: "cars", pricePerDay: 200, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
    
    // Honda Cars
    { brand: "Honda", model: "City", category: "cars", pricePerDay: 160, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "City Hatchback", category: "cars", pricePerDay: 165, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "Civic", category: "cars", pricePerDay: 220, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: ["https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=250&fit=crop&crop=center"] },
    { brand: "Honda", model: "HR-V", category: "cars", pricePerDay: 200, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "BR-V", category: "cars", pricePerDay: 190, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "CR-V", category: "cars", pricePerDay: 260, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Honda", model: "Type R", category: "cars", pricePerDay: 400, seats: 5, transmission: "Manual", fuelType: "Petrol", images: [] },
    
    // Mazda
    { brand: "Mazda", model: "Mazda 2", category: "cars", pricePerDay: 130, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Mazda", model: "Mazda 3", category: "cars", pricePerDay: 190, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Mazda", model: "CX-3", category: "cars", pricePerDay: 170, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Mazda", model: "CX-5", category: "cars", pricePerDay: 240, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Mazda", model: "CX-30", category: "cars", pricePerDay: 210, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Mazda", model: "MX-5", category: "cars", pricePerDay: 350, seats: 2, transmission: "Manual", fuelType: "Petrol", images: [] },
    
    // Nissan
    { brand: "Nissan", model: "Almera", category: "cars", pricePerDay: 140, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Nissan", model: "Serena", category: "cars", pricePerDay: 220, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Nissan", model: "X-Trail", category: "cars", pricePerDay: 260, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Nissan", model: "Navara", category: "cars", pricePerDay: 280, seats: 5, transmission: "Automatic", fuelType: "Diesel", images: [] },
    
    // Chery
    { brand: "Chery", model: "OMODA 5", category: "cars", pricePerDay: 190, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Chery", model: "TIGGO 7 Pro", category: "cars", pricePerDay: 210, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "Chery", model: "TIGGO 8 Pro", category: "cars", pricePerDay: 250, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
    
    // BYD
    { brand: "BYD", model: "Dolphin", category: "cars", pricePerDay: 180, seats: 5, transmission: "Automatic", fuelType: "Electric", images: [] },
    { brand: "BYD", model: "Atto 3", category: "cars", pricePerDay: 220, seats: 5, transmission: "Automatic", fuelType: "Electric", images: [] },
    { brand: "BYD", model: "Seal", category: "cars", pricePerDay: 280, seats: 5, transmission: "Automatic", fuelType: "Electric", images: [] },
    { brand: "BYD", model: "M6", category: "cars", pricePerDay: 200, seats: 7, transmission: "Automatic", fuelType: "Electric", images: [] },
    
    // BMW
    { brand: "BMW", model: "3 Series", category: "cars", pricePerDay: 350, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "BMW", model: "5 Series", category: "cars", pricePerDay: 450, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "BMW", model: "X1", category: "cars", pricePerDay: 320, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "BMW", model: "X3", category: "cars", pricePerDay: 400, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    { brand: "BMW", model: "X5", category: "cars", pricePerDay: 550, seats: 7, transmission: "Automatic", fuelType: "Petrol", images: [] },
];

// ============================================
// 3. 4X4
// ============================================
const fourByFour = [
    // Toyota 4x4
    { brand: "Toyota", model: "Hilux", category: "4x4", pricePerDay: 280, seats: 5, transmission: "Manual", fuelType: "Diesel", images: ["https://images.unsplash.com/photo-1515169067868-5387ec356754?w=400&h=250&fit=crop&crop=center"] },
    { brand: "Toyota", model: "Fortuner", category: "4x4", pricePerDay: 300, seats: 7, transmission: "Automatic", fuelType: "Diesel", images: ["https://images.unsplash.com/photo-1533473359331-fd1784b1ea02?w=400&h=250&fit=crop&crop=center"] },
    { brand: "Toyota", model: "Land Cruiser Prado", category: "4x4", pricePerDay: 450, seats: 7, transmission: "Automatic", fuelType: "Diesel", images: [] },
    { brand: "Toyota", model: "Land Cruiser 300", category: "4x4", pricePerDay: 600, seats: 7, transmission: "Automatic", fuelType: "Diesel", images: [] },
    
    // Mitsubishi 4x4
    { brand: "Mitsubishi", model: "Triton", category: "4x4", pricePerDay: 260, seats: 5, transmission: "Manual", fuelType: "Diesel", images: [] },
    { brand: "Mitsubishi", model: "Triton Athlete", category: "4x4", pricePerDay: 290, seats: 5, transmission: "Automatic", fuelType: "Diesel", images: [] },
    { brand: "Mitsubishi", model: "Pajero Sport", category: "4x4", pricePerDay: 320, seats: 7, transmission: "Automatic", fuelType: "Diesel", images: [] },
    
    // Suzuki 4x4
    { brand: "Suzuki", model: "Jimny", category: "4x4", pricePerDay: 200, seats: 4, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Suzuki", model: "Jimny 5-Door", category: "4x4", pricePerDay: 230, seats: 5, transmission: "Manual", fuelType: "Petrol", images: [] },
    { brand: "Suzuki", model: "Vitara", category: "4x4", pricePerDay: 190, seats: 5, transmission: "Automatic", fuelType: "Petrol", images: [] },
    
    // Ford 4x4
    { brand: "Ford", model: "Ranger", category: "4x4", pricePerDay: 270, seats: 5, transmission: "Automatic", fuelType: "Diesel", images: [] },
    { brand: "Ford", model: "Ranger Raptor", category: "4x4", pricePerDay: 400, seats: 5, transmission: "Automatic", fuelType: "Diesel", images: [] },
    { brand: "Ford", model: "Everest", category: "4x4", pricePerDay: 340, seats: 7, transmission: "Automatic", fuelType: "Diesel", images: [] },
];

// ============================================
// 4. TRUCKS
// ============================================
const trucks = [
    // Isuzu
    { brand: "Isuzu", model: "NLR", category: "trucks", pricePerDay: 350, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Light Duty", wheelConfig: "4x2", gvw: 4500 },
    { brand: "Isuzu", model: "NMR", category: "trucks", pricePerDay: 400, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Light Duty", wheelConfig: "4x2", gvw: 5500 },
    { brand: "Isuzu", model: "NPR", category: "trucks", pricePerDay: 450, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Medium Duty", wheelConfig: "4x2", gvw: 7500 },
    { brand: "Isuzu", model: "NQR", category: "trucks", pricePerDay: 500, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Medium Duty", wheelConfig: "4x2", gvw: 8500 },
    { brand: "Isuzu", model: "FRR", category: "trucks", pricePerDay: 550, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Duty", wheelConfig: "6x2", gvw: 15000 },
    { brand: "Isuzu", model: "FSR", category: "trucks", pricePerDay: 600, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Duty", wheelConfig: "6x4", gvw: 18000 },
    { brand: "Isuzu", model: "FVR", category: "trucks", pricePerDay: 650, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Duty", wheelConfig: "6x4", gvw: 22000 },
    { brand: "Isuzu", model: "GIGA", category: "trucks", pricePerDay: 800, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Haulage", wheelConfig: "8x4", gvw: 32000 },
    
    // Hino
    { brand: "Hino", model: "XZU600", category: "trucks", pricePerDay: 380, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Light Duty", wheelConfig: "4x2", gvw: 4500 },
    { brand: "Hino", model: "XZU640", category: "trucks", pricePerDay: 420, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Light Duty", wheelConfig: "4x2", gvw: 5500 },
    { brand: "Hino", model: "XZC710", category: "trucks", pricePerDay: 470, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Medium Duty", wheelConfig: "4x2", gvw: 7500 },
    { brand: "Hino", model: "XZC730", category: "trucks", pricePerDay: 520, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Medium Duty", wheelConfig: "4x2", gvw: 8500 },
    { brand: "Hino", model: "500 Series", category: "trucks", pricePerDay: 600, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Duty", wheelConfig: "6x4", gvw: 18000 },
    { brand: "Hino", model: "700 Series", category: "trucks", pricePerDay: 800, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Prime Mover", wheelConfig: "6x4", gvw: 32000 },
    
    // Mitsubishi Fuso
    { brand: "Mitsubishi Fuso", model: "FE71", category: "trucks", pricePerDay: 360, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Light Duty", wheelConfig: "4x2", gvw: 4500 },
    { brand: "Mitsubishi Fuso", model: "FE73", category: "trucks", pricePerDay: 390, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Light Duty", wheelConfig: "4x2", gvw: 5000 },
    { brand: "Mitsubishi Fuso", model: "FE84", category: "trucks", pricePerDay: 460, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Medium Duty", wheelConfig: "4x2", gvw: 7500 },
    { brand: "Mitsubishi Fuso", model: "Fighter", category: "trucks", pricePerDay: 580, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Duty", wheelConfig: "6x4", gvw: 18000 },
    { brand: "Mitsubishi Fuso", model: "Super Great", category: "trucks", pricePerDay: 750, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Haulage", wheelConfig: "8x4", gvw: 32000 },
    
    // Sinotruk
    { brand: "Sinotruk", model: "HOWO 4x2", category: "trucks", pricePerDay: 450, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Duty", wheelConfig: "4x2", gvw: 12000 },
    { brand: "Sinotruk", model: "HOWO 6x4", category: "trucks", pricePerDay: 550, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Duty", wheelConfig: "6x4", gvw: 20000 },
    { brand: "Sinotruk", model: "HOWO 8x4", category: "trucks", pricePerDay: 680, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Haulage", wheelConfig: "8x4", gvw: 30000 },
    { brand: "Sinotruk", model: "HOWO Tractor Head", category: "trucks", pricePerDay: 700, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Prime Mover", wheelConfig: "6x4", gvw: 40000 },
    
    // Foton
    { brand: "Foton", model: "Aumark", category: "trucks", pricePerDay: 340, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Light Duty", wheelConfig: "4x2", gvw: 4500 },
    { brand: "Foton", model: "Auman", category: "trucks", pricePerDay: 480, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Medium Duty", wheelConfig: "4x2", gvw: 8500 },
    { brand: "Foton", model: "Tornado", category: "trucks", pricePerDay: 400, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Delivery", wheelConfig: "4x2", gvw: 6500 },
    
    // Scania
    { brand: "Scania", model: "P-Series", category: "trucks", pricePerDay: 650, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "General Transport", wheelConfig: "6x2", gvw: 18000 },
    { brand: "Scania", model: "G-Series", category: "trucks", pricePerDay: 720, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Construction", wheelConfig: "6x4", gvw: 22000 },
    { brand: "Scania", model: "R-Series", category: "trucks", pricePerDay: 800, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Long Haul", wheelConfig: "6x4", gvw: 28000 },
    { brand: "Scania", model: "S-Series", category: "trucks", pricePerDay: 900, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Haulage", wheelConfig: "8x4", gvw: 40000 },
    
    // Volvo Trucks
    { brand: "Volvo", model: "FL", category: "trucks", pricePerDay: 500, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Distribution", wheelConfig: "4x2", gvw: 12000 },
    { brand: "Volvo", model: "FE", category: "trucks", pricePerDay: 580, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Construction", wheelConfig: "6x2", gvw: 18000 },
    { brand: "Volvo", model: "FM", category: "trucks", pricePerDay: 680, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Regional Transport", wheelConfig: "6x4", gvw: 24000 },
    { brand: "Volvo", model: "FH", category: "trucks", pricePerDay: 820, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Long Haul", wheelConfig: "6x4", gvw: 32000 },
    { brand: "Volvo", model: "FH16", category: "trucks", pricePerDay: 950, seats: 3, transmission: "Manual", fuelType: "Diesel", images: [], truckType: "Heavy Haulage", wheelConfig: "8x4", gvw: 44000 },
];

// ============================================
// 5. HEAVY MACHINERY
// ============================================
const heavyMachinery = [
    // Caterpillar Excavators
    { brand: "Cat", model: "300.9D", category: "heavy-machinery", pricePerDay: 350, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Mini Excavator", operatingWeight: 920 },
    { brand: "Cat", model: "301.7 CR", category: "heavy-machinery", pricePerDay: 400, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Mini Excavator", operatingWeight: 1700 },
    { brand: "Cat", model: "302 CR", category: "heavy-machinery", pricePerDay: 450, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 2200 },
    { brand: "Cat", model: "303 CR", category: "heavy-machinery", pricePerDay: 500, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 2800 },
    { brand: "Cat", model: "305 CR", category: "heavy-machinery", pricePerDay: 550, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 3300 },
    { brand: "Cat", model: "308", category: "heavy-machinery", pricePerDay: 600, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 8000 },
    { brand: "Cat", model: "313", category: "heavy-machinery", pricePerDay: 700, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 13000 },
    { brand: "Cat", model: "320", category: "heavy-machinery", pricePerDay: 850, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: ["https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=250&fit=crop&crop=center"], equipmentType: "Excavator", operatingWeight: 20000 },
    { brand: "Cat", model: "330", category: "heavy-machinery", pricePerDay: 1000, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Large Excavator", operatingWeight: 30000 },
    { brand: "Cat", model: "336", category: "heavy-machinery", pricePerDay: 1100, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Large Excavator", operatingWeight: 36000 },
    
    // Komatsu Excavators
    { brand: "Komatsu", model: "PC30", category: "heavy-machinery", pricePerDay: 380, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Mini Excavator", operatingWeight: 800 },
    { brand: "Komatsu", model: "PC55", category: "heavy-machinery", pricePerDay: 420, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 1500 },
    { brand: "Komatsu", model: "PC78", category: "heavy-machinery", pricePerDay: 500, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 2800 },
    { brand: "Komatsu", model: "PC128", category: "heavy-machinery", pricePerDay: 650, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 12000 },
    { brand: "Komatsu", model: "PC200", category: "heavy-machinery", pricePerDay: 800, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 19000 },
    { brand: "Komatsu", model: "PC210", category: "heavy-machinery", pricePerDay: 830, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 21000 },
    { brand: "Komatsu", model: "PC300", category: "heavy-machinery", pricePerDay: 1000, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Large Excavator", operatingWeight: 31000 },
    { brand: "Komatsu", model: "PC350", category: "heavy-machinery", pricePerDay: 1100, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Large Excavator", operatingWeight: 36000 },
    
    // Hitachi Excavators
    { brand: "Hitachi", model: "ZX30U", category: "heavy-machinery", pricePerDay: 370, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Mini Excavator", operatingWeight: 900 },
    { brand: "Hitachi", model: "ZX50U", category: "heavy-machinery", pricePerDay: 430, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 1500 },
    { brand: "Hitachi", model: "ZX75US", category: "heavy-machinery", pricePerDay: 520, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 2800 },
    { brand: "Hitachi", model: "ZX130", category: "heavy-machinery", pricePerDay: 650, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 12000 },
    { brand: "Hitachi", model: "ZX200", category: "heavy-machinery", pricePerDay: 820, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 20000 },
    { brand: "Hitachi", model: "ZX210", category: "heavy-machinery", pricePerDay: 850, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 22000 },
    { brand: "Hitachi", model: "ZX330", category: "heavy-machinery", pricePerDay: 1050, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Large Excavator", operatingWeight: 33000 },
    
    // SANY
    { brand: "Sany", model: "SY16C", category: "heavy-machinery", pricePerDay: 360, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Mini Excavator", operatingWeight: 800 },
    { brand: "Sany", model: "SY35U", category: "heavy-machinery", pricePerDay: 400, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Mini Excavator", operatingWeight: 1500 },
    { brand: "Sany", model: "SY55C", category: "heavy-machinery", pricePerDay: 460, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 2500 },
    { brand: "Sany", model: "SY75C", category: "heavy-machinery", pricePerDay: 530, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 3000 },
    { brand: "Sany", model: "SY135C", category: "heavy-machinery", pricePerDay: 660, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 13000 },
    { brand: "Sany", model: "SY215C", category: "heavy-machinery", pricePerDay: 800, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 22000 },
    
    // Kobelco Excavators
    { brand: "Kobelco", model: "SK35SR", category: "heavy-machinery", pricePerDay: 390, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Mini Excavator", operatingWeight: 900 },
    { brand: "Kobelco", model: "SK50P", category: "heavy-machinery", pricePerDay: 440, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 1500 },
    { brand: "Kobelco", model: "SK75SR", category: "heavy-machinery", pricePerDay: 540, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Compact Excavator", operatingWeight: 2800 },
    { brand: "Kobelco", model: "SK130", category: "heavy-machinery", pricePerDay: 670, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 13000 },
    { brand: "Kobelco", model: "SK200", category: "heavy-machinery", pricePerDay: 830, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 20000 },
    { brand: "Kobelco", model: "SK210", category: "heavy-machinery", pricePerDay: 860, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Excavator", operatingWeight: 22000 },
    { brand: "Kobelco", model: "SK350", category: "heavy-machinery", pricePerDay: 1080, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Large Excavator", operatingWeight: 36000 },
];

// ============================================
// 6. ADDITIONAL: Site Support Equipment
// ============================================
const siteSupport = [
    { brand: "Cat", model: "D6 Bulldozer", category: "heavy-machinery", pricePerDay: 700, seats: 1, transmission: "Manual", fuelType: "Diesel", images: [], equipmentType: "Bulldozer", operatingWeight: 18000 },
    { brand: "Komatsu", model: "D65 Bulldozer", category: "heavy-machinery", pricePerDay: 750, seats: 1, transmission: "Manual", fuelType: "Diesel", images: [], equipmentType: "Bulldozer", operatingWeight: 20000 },
    { brand: "Cat", model: "950 Wheel Loader", category: "heavy-machinery", pricePerDay: 650, seats: 1, transmission: "Manual", fuelType: "Diesel", images: [], equipmentType: "Wheel Loader", operatingWeight: 15000 },
    { brand: "Komatsu", model: "WA320 Wheel Loader", category: "heavy-machinery", pricePerDay: 680, seats: 1, transmission: "Manual", fuelType: "Diesel", images: [], equipmentType: "Wheel Loader", operatingWeight: 16000 },
    { brand: "Cat", model: "SKD Skid Steer", category: "heavy-machinery", pricePerDay: 400, seats: 1, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Skid Steer Loader", operatingWeight: 3000 },
    { brand: "JCB", model: "3DX Backhoe", category: "heavy-machinery", pricePerDay: 500, seats: 1, transmission: "Manual", fuelType: "Diesel", images: [], equipmentType: "Backhoe Loader", operatingWeight: 7000 },
    { brand: "Cat", model: "CS56 Road Roller", category: "heavy-machinery", pricePerDay: 450, seats: 1, transmission: "Manual", fuelType: "Diesel", images: [], equipmentType: "Road Roller", operatingWeight: 5500 },
];

// ============================================
// 7. MATERIAL HANDLING
// ============================================
const materialHandling = [
    { brand: "Toyota", model: "8FGCU25 Forklift", category: "heavy-machinery", pricePerDay: 350, seats: 1, transmission: "Automatic", fuelType: "LPG", images: [], equipmentType: "Forklift", operatingWeight: 4000 },
    { brand: "Komatsu", model: "FB25 Forklift", category: "heavy-machinery", pricePerDay: 380, seats: 1, transmission: "Automatic", fuelType: "Electric", images: [], equipmentType: "Forklift", operatingWeight: 4000 },
    { brand: "Cat", model: "GP25 Forklift", category: "heavy-machinery", pricePerDay: 360, seats: 1, transmission: "Automatic", fuelType: "Diesel", images: [], equipmentType: "Forklift", operatingWeight: 4000 },
    { brand: "Genie", model: "Z-45 Boom Lift", category: "heavy-machinery", pricePerDay: 500, seats: 2, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Boom Lift", operatingWeight: 8000 },
    { brand: "JLG", model: "600S Boom Lift", category: "heavy-machinery", pricePerDay: 550, seats: 2, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Boom Lift", operatingWeight: 9000 },
    { brand: "Genie", model: "GS-3246 Scissor Lift", category: "heavy-machinery", pricePerDay: 400, seats: 2, transmission: "Electric", fuelType: "Electric", images: [], equipmentType: "Scissor Lift", operatingWeight: 3500 },
    { brand: "JLG", model: "1230ES Scissor Lift", category: "heavy-machinery", pricePerDay: 420, seats: 2, transmission: "Electric", fuelType: "Electric", images: [], equipmentType: "Scissor Lift", operatingWeight: 3800 },
    { brand: "Genie", model: "Z-60 Boom Lift", category: "heavy-machinery", pricePerDay: 600, seats: 2, transmission: "Hydrostatic", fuelType: "Diesel", images: [], equipmentType: "Boom Lift", operatingWeight: 10000 },
];

// ============================================
// 8. UPLOAD FUNCTION
// ============================================
async function uploadVehicles() {
    const allVehicles = [
        ...motorcycles,
        ...cars,
        ...fourByFour,
        ...trucks,
        ...heavyMachinery,
        ...siteSupport,
        ...materialHandling
    ];

    console.log(`📦 Total vehicles to upload: ${allVehicles.length}`);

    let successCount = 0;
    let failCount = 0;

    for (const vehicle of allVehicles) {
        try {
            // Add required fields
            const vehicleData = {
                ...vehicle,
                availability: "Available",
                approvalStatus: "Approved",
                location: vehicle.location || "Kuala Lumpur",
                description: vehicle.description || `${vehicle.brand} ${vehicle.model} available for rent.`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Auto-generate a document ID
            const docRef = await db.collection('vehicles').add(vehicleData);
            console.log(`✅ Added: ${vehicle.brand} ${vehicle.model} (${docRef.id})`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to add: ${vehicle.brand} ${vehicle.model}`, error);
            failCount++;
        }
    }

    console.log(`\n📊 Upload complete!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
}

// ============================================
// 9. RUN THE UPLOAD
// ============================================
uploadVehicles();