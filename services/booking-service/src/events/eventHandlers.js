// Event Handlers cho Booking Service
// Nhận các events từ các services khác qua RabbitMQ

const bookingRepository = require('../repositories/BookingRepository');
const bookingService = require('../services/BookingService');

/**
 * Xử lý sự kiện: Ride được tạo từ booking request
 * Được gọi khi Ride Service tạo một ride mới từ booking
 */
const handleRideCreated = async (eventData) => {
    try {
        const { bookingId, rideId, driverId } = eventData;

        console.log(`📨 Received RideCreated event for booking: ${bookingId}`);

        // Cập nhật booking - xác nhận với driver info
        const booking = await bookingService.confirmBooking(bookingId, driverId, rideId);

        console.log(`✅ Booking ${bookingId} confirmed with driver ${driverId}`);

        return booking;
    } catch (error) {
        console.error('❌ Error handling RideCreated event:', error.message);
        throw error;
    }
};

/**
 * Xử lý sự kiện: Driver hủy ride
 */
const handleRideCancelled = async (eventData) => {
    try {
        const { rideId, bookingId, reason } = eventData;

        console.log(`📨 Received RideCancelled event for booking: ${bookingId}`);

        const booking = await bookingRepository.updateBooking(bookingId, {
            status: 'CANCELLED',
            notes: `Cancelled by driver: ${reason}`
        });

        console.log(`✅ Booking ${bookingId} cancelled (driver cancelled ride)`);

        return booking;
    } catch (error) {
        console.error('❌ Error handling RideCancelled event:', error.message);
        throw error;
    }
};

/**
 * Xử lý sự kiện: Thanh toán thành công
 */
const handlePaymentCompleted = async (eventData) => {
    try {
        const { bookingId, amount, paymentId } = eventData;

        console.log(`📨 Received PaymentCompleted event for booking: ${bookingId}`);

        const booking = await bookingRepository.updateBooking(bookingId, {
            paymentId,
            notes: `Payment completed: ${paymentId}`
        });

        console.log(`✅ Booking ${bookingId} payment recorded`);

        return booking;
    } catch (error) {
        console.error('❌ Error handling PaymentCompleted event:', error.message);
        throw error;
    }
};

/**
 * Xử lý sự kiện: Thanh toán thất bại
 */
const handlePaymentFailed = async (eventData) => {
    try {
        const { bookingId, reason } = eventData;

        console.log(`📨 Received PaymentFailed event for booking: ${bookingId}`);

        const booking = await bookingRepository.updateBooking(bookingId, {
            notes: `Payment failed: ${reason}`
        });

        console.log(`✅ Booking ${bookingId} payment failed recorded`);

        return booking;
    } catch (error) {
        console.error('❌ Error handling PaymentFailed event:', error.message);
        throw error;
    }
};

module.exports = {
    handleRideCreated,
    handleRideCancelled,
    handlePaymentCompleted,
    handlePaymentFailed
};
