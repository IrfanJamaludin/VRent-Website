// Nav.js - Universal Navigation

// ------------------------------------------------------------
// 1. MOBILE MENU TOGGLE
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    if (!menuToggle || !navLinks) return;

    // Toggle menu
    menuToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        navLinks.classList.toggle('active');
    });

    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
            navLinks.classList.remove('active');
            navLinks.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
        });
    });

    // Dropdown parent click (mobile only)
    navLinks.querySelectorAll('.dropdown > a').forEach(link => {
        link.addEventListener('click', function (e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const parent = this.parentElement;
                navLinks.querySelectorAll('.dropdown.active').forEach(d => {
                    if (d !== parent) d.classList.remove('active');
                });
                parent.classList.toggle('active');
            }
        });
    });

    // Close menu when clicking outside header
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.header')) {
            navLinks.classList.remove('active');
        }
    });

    // Close menu on ESC
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            navLinks.classList.remove('active');
        }
    });

    // Auto-close menu if viewport resizes past mobile breakpoint
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
        }
    });
});

// ------------------------------------------------------------
// 2. CHECK LOGIN STATUS & UPDATE NAV
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    const authButton = document.getElementById('authButton');

    if (!authButton) return;

    // Firebase not available → show default signed-out state
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        authButton.innerHTML = `
            <a href="MainPage.html" class="btn-login">Log In / Sign Up</a>
        `;
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const doc = await db.collection('users').doc(user.uid).get();

                if (doc.exists) {
                    const data = doc.data();
                    const username = data.username || data.firstName || user.displayName || (user.email ? user.email.split('@')[0] : 'User');
                    const profilePicture = data.profilePicture || null;

                    let avatarHTML = '';
                    if (profilePicture) {
                        avatarHTML = `
                            <img src="${profilePicture}"
                                 alt="${username}"
                                 class="nav-avatar-img"
                                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                            <div class="avatar-placeholder" style="display:none;">${username.charAt(0).toUpperCase()}</div>
                        `;
                    } else {
                        avatarHTML = `<div class="avatar-placeholder">${username.charAt(0).toUpperCase()}</div>`;
                    }

                    authButton.innerHTML = `
                        <a href="Dashboard.html" class="user-avatar" title="Go to Dashboard">
                            ${avatarHTML}
                            <span class="avatar-username">@${username}</span>
                        </a>
                    `;
                } else {
                    const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
                    authButton.innerHTML = `
                        <a href="Dashboard.html" class="user-avatar" title="Go to Dashboard">
                            <div class="avatar-placeholder">${fallbackName.charAt(0).toUpperCase()}</div>
                            <span class="avatar-username">@${fallbackName}</span>
                        </a>
                    `;
                }
            } catch (error) {
                console.error('Nav.js: error fetching user data:', error);
                const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
                authButton.innerHTML = `
                    <a href="Dashboard.html" class="user-avatar" title="Go to Dashboard">
                        <div class="avatar-placeholder">${fallbackName.charAt(0).toUpperCase()}</div>
                        <span class="avatar-username">@${fallbackName}</span>
                    </a>
                `;
            }
        } else {
            // Signed-out state — matches the initial HTML
            authButton.innerHTML = `
                <a href="MainPage.html" class="btn-login">Log In / Sign Up</a>
            `;
        }
    });
});

// ------------------------------------------------------------
// 3. HIGHLIGHT ACTIVE NAV LINK
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    const currentPage = window.location.pathname.split('/').pop() || 'Home.html';
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        if (href === currentPage) {
            link.classList.add('active');
        } else if (href === 'Categories.html' && currentPage.includes('Categories')) {
            link.classList.add('active');
        } else if (href === 'RentVehicle.html' && currentPage.includes('RentVehicle')) {
            link.classList.add('active');
        } else if (href === 'Dashboard.html' && currentPage.includes('Dashboard')) {
            link.classList.add('active');
        }
    });

    // Highlight the "Rent Your Vehicle" CTA when on its page
    const rentBtn = document.querySelector('.btn-rent-vehicle');
    if (rentBtn) {
        if (currentPage === 'RentVehicle.html') {
            rentBtn.classList.add('active');
        } else {
            rentBtn.classList.remove('active');
        }
    }
});

// ------------------------------------------------------------
// 4. SMOOTH SCROLL FOR ANCHOR LINKS
// ------------------------------------------------------------
document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ------------------------------------------------------------
// 5. NAV AVATAR IMAGE FALLBACK
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.nav-avatar-img').forEach(img => {
        img.addEventListener('error', function () {
            this.style.display = 'none';
            const placeholder = this.nextElementSibling;
            if (placeholder && placeholder.classList.contains('avatar-placeholder')) {
                placeholder.style.display = 'flex';
            }
        });
    });
});