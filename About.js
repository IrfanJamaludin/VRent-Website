// About.js — optional user greeting + page helpers

document.addEventListener('DOMContentLoaded', function () {

    // ---- Optional user greeting ----
    // Only runs if a #userGreeting element exists on the page.
    // Add <div id="userGreeting"></div> anywhere in About.html to activate.
    const greeting = document.getElementById('userGreeting');
    if (!greeting || !window.auth) return;

    // Small XSS-safe escaper (usernames come from Firestore and could contain HTML)
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.auth.onAuthStateChanged(async function (user) {
        if (!user) {
            greeting.style.display = 'none';
            return;
        }

        try {
            const doc = await window.db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                const username = data.username || data.firstName || 'User';
                greeting.innerHTML = `Welcome back, <strong>${escapeHtml(username)}</strong>! 👋`;
                greeting.style.display = 'block';
            } else {
                greeting.style.display = 'none';
            }
        } catch (err) {
            console.warn('Could not fetch user data:', err);
            greeting.style.display = 'none';
        }
    });

});