const bookingService = require('../services/BookingService');

class BookingController {
    // POST /bookings - Tạo yêu cầu đặt xe
    async createBooking(req, res) {
        try {
            const { customerId, pickupLocation, dropoffLocation, paymentMethod, notes } = req.body;

            const booking = await bookingService.createBookingRequest(customerId, {
                pickupLocation,
                dropoffLocation,
                paymentMethod,
                notes
            });

            res.status(201).json({
                success: true,
                message: 'Booking created successfully',
                data: booking
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // GET /bookings/:id - Lấy thông tin booking
    async getBooking(req, res) {
        try {
            const { id } = req.params;

            const booking = await bookingService.getBooking(id);

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            res.status(200).json({
                success: true,
                data: booking
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // GET /bookings/customer/:customerId - Lấy tất cả booking của customer
    async getCustomerBookings(req, res) {
        try {
            const { customerId } = req.params;

            const bookings = await bookingService.getCustomerBookings(customerId);

            res.status(200).json({
                success: true,
                data: bookings
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // POST /bookings/:id/confirm - Xác nhận booking
    async confirmBooking(req, res) {
        try {
            const { id } = req.params;
            const { driverId, rideId } = req.body;

            const booking = await bookingService.confirmBooking(id, driverId, rideId);

            res.status(200).json({
                success: true,
                message: 'Booking confirmed',
                data: booking
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // POST /bookings/:id/start - Bắt đầu chuyến đi
    async startRide(req, res) {
        try {
            const { id } = req.params;

            const booking = await bookingService.startRide(id);

            res.status(200).json({
                success: true,
                message: 'Ride started',
                data: booking
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // POST /bookings/:id/complete - Hoàn thành chuyến đi
    async completeBooking(req, res) {
        try {
            const { id } = req.params;
            const { actualFare } = req.body;

            const booking = await bookingService.completeBooking(id, actualFare);

            res.status(200).json({
                success: true,
                message: 'Booking completed',
                data: booking
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // POST /bookings/:id/cancel - Hủy booking
    async cancelBooking(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const booking = await bookingService.cancelBooking(id, reason);

            res.status(200).json({
                success: true,
                message: 'Booking cancelled',
                data: booking
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new BookingController();
