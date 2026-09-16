// ForgotPassword.js — password reset with Firebase Auth

// ------------------------------------------------------------
// 1. HELPERS
// ------------------------------------------------------------
function setLoading(btn, isLoading, loadingText = 'Sending...') {
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.textContent;
        btn.textContent = loadingText;
        btn.disabled = true;
    } else {
        btn.textContent = btn.dataset.originalText || 'Send Reset Link';
        btn.disabled = false;
    }
}

function showInlineMessage(message, type = 'info') {
    // Remove any existing message
    const existing = document.getElementById('resetMessage');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.id = 'resetMessage';
    msg.className = `reset-message ${type}`;
    msg.textContent = message;

    const form = document.getElementById('resetForm');
    if (form && form.parentElement) {
        form.parentElement.insertBefore(msg, form);
    }
}

function clearInlineMessage() {
    const existing = document.getElementById('resetMessage');
    if (existing) existing.remove();
}

// ------------------------------------------------------------
// 2. PASSWORD RESET FORM SUBMISSION
// ------------------------------------------------------------
document.getElementById('resetForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearInlineMessage();

    const emailInput = document.getElementById('resetEmail');
    const email = emailInput.value.trim();

    // Basic validation
    if (!email) {
        showInlineMessage('Please enter your email address.', 'error');
        emailInput.focus();
        return;
    }

    // Simple email format check (HTML5 handles most cases, this is a fallback)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showInlineMessage('Please enter a valid email address.', 'error');
        emailInput.focus();
        return;
    }

    // Failsafe: Firebase might not be ready
    if (!window.auth) {
        showInlineMessage('Authentication service not available. Please refresh the page.', 'error');
        return;
    }

    const submitBtn = document.querySelector('.btn-submit');
    setLoading(submitBtn, true);

    try {
        await window.auth.sendPasswordResetEmail(email);

        // Success — show message and disable form
        showInlineMessage(
            'Reset link sent. Check your email inbox (and spam folder) for the reset link.',
            'success'
        );

        // Clear input so user can see the message
        emailInput.value = '';
        emailInput.disabled = true;

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = 'LogIn.html';
        }, 2500);

    } catch (error) {
        console.error('Reset error:', error);

        let msg = '';
        switch (error.code) {
            case 'auth/user-not-found':
                msg = 'No account found with that email address.';
                break;
            case 'auth/invalid-email':
                msg = 'That email format is not valid.';
                break;
            case 'auth/too-many-requests':
                msg = 'Too many attempts. Please wait a few minutes and try again.';
                break;
            case 'auth/network-request-failed':
                msg = 'Network error. Check your connection and try again.';
                break;
            case 'auth/user-disabled':
                msg = 'This account has been disabled. Contact support for help.';
                break;
            default:
                msg = error.message || 'Something went wrong. Please try again.';
        }

        showInlineMessage(msg, 'error');
        setLoading(submitBtn, false);
        emailInput.focus();
    }
});

// ------------------------------------------------------------
// 3. AUTO-FOCUS (desktop only — mobile keyboard is intrusive)
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (!isMobile) {
        const emailInput = document.getElementById('resetEmail');
        if (emailInput) emailInput.focus();
    }
});

// ------------------------------------------------------------
// 4. CLEAR ERROR WHEN USER STARTS TYPING
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    const emailInput = document.getElementById('resetEmail');
    if (emailInput) {
        emailInput.addEventListener('input', function () {
            clearInlineMessage();
        });
    }
});