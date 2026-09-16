// SignUp.js - Account creation with validation + uniqueness checks

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', function () {

    // --------------------------------------------------------
    // 0. REDIRECT IF ALREADY LOGGED IN
    // --------------------------------------------------------
    if (window.auth) {
        window.auth.onAuthStateChanged(function (user) {
            if (user) {
                window.location.href = 'Home.html';
            }
        });
    }

    // --------------------------------------------------------
    // 1. SHOW / HIDE PASSWORD TOGGLE
    // --------------------------------------------------------
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            this.classList.toggle('visible');
        });
    });

    // --------------------------------------------------------
    // 2. REAL-TIME PASSWORD VALIDATION
    // --------------------------------------------------------
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');

    const reqLength  = document.getElementById('req-length');
    const reqSpace   = document.getElementById('req-space');
    const reqComplex = document.getElementById('req-complex');

    function validatePassword(password) {
        const lengthValid  = password.length >= 8;
        const spaceValid   = !password.includes(' ');
        const hasDigit     = /\d/.test(password);
        const hasLower     = /[a-z]/.test(password);
        const hasUpper     = /[A-Z]/.test(password);
        const hasSpecial   = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const complexValid = hasDigit && hasLower && hasUpper && hasSpecial;

        return { lengthValid, spaceValid, complexValid };
    }

    function updateRequirements(password) {
        const { lengthValid, spaceValid, complexValid } = validatePassword(password);
        const hasContent = password.length > 0;

        if (reqLength) {
            reqLength.classList.toggle('valid', lengthValid);
            reqLength.classList.toggle('invalid', !lengthValid && hasContent);
        }
        if (reqSpace) {
            reqSpace.classList.toggle('valid', spaceValid);
            reqSpace.classList.toggle('invalid', !spaceValid && hasContent);
        }
        if (reqComplex) {
            reqComplex.classList.toggle('valid', complexValid);
            reqComplex.classList.toggle('invalid', !complexValid && hasContent);
        }
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            updateRequirements(this.value);
        });
    }
    if (confirmInput) {
        confirmInput.addEventListener('focus', function () {
            if (passwordInput) updateRequirements(passwordInput.value);
        });
    }

    // --------------------------------------------------------
    // 3. FORM SUBMISSION
    // --------------------------------------------------------
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // ---- Gather values ----
        const firstName       = document.getElementById('firstName').value.trim();
        const lastName        = document.getElementById('lastName').value.trim();
        const username        = document.getElementById('username').value.trim();
        const birthDate       = document.getElementById('birthDate').value;
        const email           = document.getElementById('email').value.trim();
        const phone           = document.getElementById('phone').value.trim();
        const password        = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeCheck      = document.getElementById('agreeCheck');

        // ---- Validation chain ----

        // 1. All fields filled
        if (!firstName || !lastName || !username || !birthDate ||
            !email || !phone || !password || !confirmPassword) {
            alert('Please fill in all fields.');
            return;
        }

        // 2. Phone number — 10 to 11 digits
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            alert('Phone number must be 10 to 11 digits (e.g. 0123456789).');
            return;
        }

        // 3. Username — no spaces
        if (username.includes(' ')) {
            alert('Username cannot contain spaces.');
            return;
        }

        // 3b. Username — basic format (letters, numbers, underscore, dot)
        if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
            alert('Username must be 3–30 characters, letters/numbers/._ only.');
            return;
        }

        // 4. Age ≥ 18
        const birthDateObj = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }
        if (age < 18) {
            alert('You must be 18 years or older to create an account.');
            return;
        }

        // 5. Passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        // 6. Password meets requirements
        const { lengthValid, spaceValid, complexValid } = validatePassword(password);
        if (!lengthValid || !spaceValid || !complexValid) {
            alert('Password does not meet the requirements. Please check the list above.');
            return;
        }

        // 7. Terms agreed
        if (!agreeCheck.checked) {
            alert('Please agree to the Terms & Conditions and Privacy Notice.');
            return;
        }

        // ---- Prepare submit button ----
        const submitBtn = document.getElementById('signupSubmitBtn') || document.querySelector('.btn-submit');
        const originalText = submitBtn ? submitBtn.textContent : 'Agree & Continue';

        function setLoading(text) {
            if (submitBtn) {
                submitBtn.textContent = text;
                submitBtn.disabled = true;
            }
        }
        function resetBtn() {
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }

        // ---- Check uniqueness (phone + username) ----
        // Uses PUBLIC userRegistry collection so this works while signed out.
        setLoading('Checking...');

        let phoneTaken = false;
        let usernameTaken = false;

        try {
            const [phoneQuery, usernameQuery] = await Promise.all([
                window.db.collection('userRegistry').where('phone', '==', phoneDigits).limit(1).get(),
                window.db.collection('userRegistry').where('username', '==', username.toLowerCase()).limit(1).get()
            ]);

            phoneTaken    = !phoneQuery.empty;
            usernameTaken = !usernameQuery.empty;

        } catch (checkErr) {
            console.error('Uniqueness check failed:', checkErr);

            // Fallback: if userRegistry collection is missing/unconfigured,
            // let Firebase Auth's own email check catch duplicates and proceed.
            // This keeps signup usable during initial setup.
            if (checkErr.code === 'permission-denied') {
                console.warn('userRegistry not accessible — skipping client-side uniqueness check.');
            } else {
                alert('Could not verify uniqueness right now. Please try again.');
                resetBtn();
                return;
            }
        }

        if (phoneTaken) {
            alert('This phone number is already registered. Please use a different number.');
            resetBtn();
            return;
        }

        if (usernameTaken) {
            alert('This username is already taken. Please choose another.');
            resetBtn();
            return;
        }

        // ---- Create account ----
        setLoading('Creating account...');

        try {
            const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // ---- Save profile to users/{uid} ----
            await window.db.collection('users').doc(user.uid).set({
                firstName: firstName,
                lastName: lastName,
                username: username,
                usernameLower: username.toLowerCase(),
                birthDate: birthDate,
                email: email,
                phone: phoneDigits,
                role: 'user',
                verificationStatus: 'Not Submitted',
                licenseClasses: [],
                favourites: [],
                recentlyViewed: [],
                profilePicture: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                uid: user.uid,
                emailVerified: false
            });

            // ---- Save public registry entry (for uniqueness checks) ----
            try {
                await window.db.collection('userRegistry').doc(user.uid).set({
                    uid: user.uid,
                    phone: phoneDigits,
                    username: username.toLowerCase(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (regErr) {
                // Non-fatal — user account exists either way
                console.warn('userRegistry write failed:', regErr);
            }

            // ---- Send verification email ----
            try {
                await user.sendEmailVerification();
            } catch (emailErr) {
                console.warn('Email verification send failed:', emailErr);
            }

            alert('Account created successfully.\n\nPlease check your email to verify your account before logging in.');

            // Sign out so they have to log in fresh
            await window.auth.signOut();

            window.location.href = 'LogIn.html';

        } catch (error) {
            console.error('SignUp Error:', error);

            let msg = 'Error: ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    msg = 'This email is already registered. Please log in or use a different email.';
                    break;
                case 'auth/invalid-email':
                    msg = 'Invalid email format. Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    msg = 'Password is too weak. Please use at least 6 characters.';
                    break;
                case 'auth/operation-not-allowed':
                    msg = 'Email/Password sign-up is not enabled. Please contact support.';
                    break;
                case 'auth/network-request-failed':
                    msg = 'Network error. Please check your internet connection.';
                    break;
                default:
                    msg = error.message || 'Something went wrong. Please try again.';
            }
            alert(msg);
            resetBtn();
        }
    });

    // --------------------------------------------------------
    // 4. AUTO-FOCUS FIRST FIELD (desktop only)
    // --------------------------------------------------------
    const firstField = document.getElementById('firstName');
    const hasHover = window.matchMedia('(hover: hover)').matches;
    if (firstField && hasHover) {
        firstField.focus();
    }
});