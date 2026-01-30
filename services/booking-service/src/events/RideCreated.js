// RideCreated Event Handler
// Được gọi khi Ride Service tạo một ride mới từ booking request

const bookingService = require('../services/BookingService');

const handleRideCreated = async (eventData) => {
    try {
        const { bookingId, rideId, driverId } = eventData;

        console.log(`📨 Received RideCreated event for booking: ${bookingId}`);

        // Cập nhật booking - xác nhận với driver info
        const booking = await bookingService.confirmBooking(bookingId, driverId, rideId);

        console.log(`✅ Booking ${bookingId} confirmed with driver ${driverId}`);

        return booking;
    } catch (error) {
        console.error('Error handling RideCreated event:', error.message);
        throw error;
    }
};

module.exports = {
    handleRideCreated
};
