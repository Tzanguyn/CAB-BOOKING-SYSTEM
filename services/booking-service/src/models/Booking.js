const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        bookingId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        idempotencyKey: {
            type: String,
            index: true,
            sparse: true
        },
        customerId: {
            type: String,
            required: true,
            index: true
        },
        pickupLocation: {
            address: String,
            latitude: Number,
            longitude: Number
        },
        dropoffLocation: {
            address: String,
            latitude: Number,
            longitude: Number
        },
        status: {
            type: String,
            enum: ['REQUESTED', 'PENDING', 'CONFIRMED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'],
            default: 'REQUESTED'
        },
        estimatedFare: Number,
        surge: {
            type: Number,
            default: 1
        },
        etaMinutes: Number,
        actualFare: Number,
        driverId: String,
        paymentId: String,
        rideId: String,
        paymentMethod: {
            type: String,
            enum: ['CASH', 'CARD', 'WALLET'],
            default: 'CASH'
        },
        notes: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

bookingSchema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Booking', bookingSchema);
