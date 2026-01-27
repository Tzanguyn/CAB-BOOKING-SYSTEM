const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
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
            enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            default: 'PENDING'
        },
        estimatedFare: Number,
        actualFare: Number,
        driverId: String,
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

module.exports = mongoose.model('Booking', bookingSchema);
