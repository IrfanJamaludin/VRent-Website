// LogIn.js - Authentication + role-based redirect

document.addEventListener('DOMContentLoaded', function () {

    const loginForm  = document.getElementById('loginForm');
    const submitBtn  = document.getElementById('loginSubmitBtn') || document.querySelector('.btn-submit');

    // Guard so checkUserRole only runs once per login attempt
    let redirecting = false;

    // ============================================================
    // 1. PASSWORD TOGGLE
    // ============================================================
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';

            // Slashed eye = password hidden | Plain eye = password visible
            this.innerHTML = showing
                ? `<svg viewBox="0 0 24 24" width="20" height="20">
                       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                   </svg>`
                : `<svg viewBox="0 0 24 24" width="20" height="20">
                       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       <path d="M22 22l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       <path d="M17 17l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                   </svg>`;
        });
    });

    // ============================================================
    // 2. ROLE CHECK + REDIRECT
    // ============================================================
    function checkUserRole(user) {
        if (!user || redirecting) return;
        redirecting = true;

        const db = window.db;
        if (!db) {
            window.location.href = 'Home.html';
            return;
        }

        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                const role = doc.exists ? (doc.data().role || 'user') : 'user';
                if (role.toLowerCase() === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'Home.html';
                }
            })
            .catch((err) => {
                console.error('Role check failed:', err);
                alert('Could not verify user role. Redirecting to Home.');
                window.location.href = 'Home.html';
            });
    }

    // ============================================================
    // 3. LOGIN FORM SUBMIT
    // ============================================================
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

        window.auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // onAuthStateChanged will fire and call checkUserRole.
                // No setTimeout needed — that was the previous bug.
            })
            .catch((error) => {
                console.error('Login error:', error);
                let msg = 'Login failed. Please check your email and password.';

                switch (error.code) {
                    case 'auth/user-not-found':
                        msg = 'No account found with this email. Please sign up first.';
                        break;
                    case 'auth/wrong-password':
                        msg = 'Incorrect password. Please try again.';
                        break;
                    case 'auth/invalid-email':
                        msg = 'Please enter a valid email address.';
                        break;
                    case 'auth/invalid-credential':
                        msg = 'Invalid email or password. Please try again.';
                        break;
                    case 'auth/too-many-requests':
                        msg = 'Too many failed attempts. Please wait a few minutes and try again.';
                        break;
                    case 'auth/user-disabled':
                        msg = 'This account has been disabled. Please contact support.';
                        break;
                }

                alert(msg);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Continue';
            });
    });

    // ============================================================
    // 4. AUTH STATE LISTENER
    //    Fires on login (success) AND when the page loads.
    //    Skips on signed-out loads so the form stays visible.
    // ============================================================
    window.auth.onAuthStateChanged(function (user) {
        if (user) {
            // Show a small loading state only if the button exists
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
            }
            checkUserRole(user);
        }
        // else: signed out on page load — form is already visible, do nothing
    });
});