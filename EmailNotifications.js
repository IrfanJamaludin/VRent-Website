// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Configure email (use environment variables)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: functions.config().email.user,
        pass: functions.config().email.pass
    }
});

exports.sendBookingConfirmation = functions.firestore
    .document('bookings/{bookingId}')
    .onCreate(async (snap, context) => {
        const booking = snap.data();
        const renterDoc = await db.collection('users').doc(booking.renterId).get();
        const renter = renterDoc.exists ? renterDoc.data() : {};

        const emailContent = {
            to: renter.email,
            subject: 'Booking Confirmation – V-Rent',
            html: `
                <h1>Booking Confirmed! ✅</h1>
                <p>Hi ${booking.renterName},</p>
                <p>Your booking for <strong>${booking.vehicleName}</strong> has been confirmed.</p>
                <h3>Booking Details:</h3>
                <ul>
                    <li><strong>Vehicle:</strong> ${booking.vehicleName}</li>
                    <li><strong>Pickup:</strong> ${booking.pickupDate} at ${booking.pickupTime}</li>
                    <li><strong>Return:</strong> ${booking.returnDate} at ${booking.returnTime}</li>
                    <li><strong>Location:</strong> ${booking.pickupLocation}</li>
                    <li><strong>Total:</strong> RM${booking.totalPrice}</li>
                    <li><strong>Status:</strong> ${booking.status}</li>
                </ul>
                <p><a href="https://v-rent.com/Dashboard.html">View in Dashboard</a></p>
                <p>Thank you for using V-Rent!</p>
            `
        };
        try { await transporter.sendMail(emailContent); } catch (e) { console.error('Email error:', e); }
    });