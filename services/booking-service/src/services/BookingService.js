const bookingRepository = require('../repositories/BookingRepository');
const { publishEvent } = require('../config/messageBroker');
const axios = require('axios');

class BookingService {
    // Tạo yêu cầu đặt xe mới
    async createBookingRequest(customerId, bookingData) {
        try {
            // Validation
            if (!customerId || !bookingData.pickupLocation || !bookingData.dropoffLocation) {
                throw new Error('Missing required fields');
            }

            // Gọi Pricing Service để tính giá
            const estimatedFare = await this.getEstimatedFare(
                bookingData.pickupLocation,
                bookingData.dropoffLocation
            );

            // Tạo booking mới
            const newBooking = await bookingRepository.createBooking({
                customerId,
                pickupLocation: bookingData.pickupLocation,
                dropoffLocation: bookingData.dropoffLocation,
                estimatedFare,
                paymentMethod: bookingData.paymentMethod || 'CASH',
                notes: bookingData.notes,
                status: 'PENDING'
            });

            // Publish event để Ride Service subscribe
            await publishEvent('booking.created', {
                bookingId: newBooking._id,
                customerId,
                pickupLocation: newBooking.pickupLocation,
                dropoffLocation: newBooking.dropoffLocation,
                estimatedFare,
                timestamp: new Date()
            });

            return newBooking;
        } catch (error) {
            throw new Error(`Error creating booking request: ${error.message}`);
        }
    }

    // Lấy giá từ Pricing Service
    async getEstimatedFare(pickupLocation, dropoffLocation) {
        try {
            const pricingServiceUrl = process.env.PRICING_SERVICE_URL || 'http://localhost:3006';
            
            const response = await axios.post(`${pricingServiceUrl}/pricing/estimate`, {
                pickupLocation,
                dropoffLocation
            });

            return response.data.estimatedFare || 100000; // Default 100k VND
        } catch (error) {
            console.warn('Error getting estimated fare:', error.message);
            return 100000; // Default value
        }
    }

    // Xác nhận booking (khi driver chấp nhận)
    async confirmBooking(bookingId, driverId, rideId) {
        try {
            const booking = await bookingRepository.updateBooking(bookingId, {
                status: 'CONFIRMED',
                driverId,
                rideId
            });

            // Publish event
            await publishEvent('booking.confirmed', {
                bookingId,
                driverId,
                rideId,
                timestamp: new Date()
            });

            return booking;
        } catch (error) {
            throw new Error(`Error confirming booking: ${error.message}`);
        }
    }

    // Bắt đầu chuyến đi
    async startRide(bookingId) {
        try {
            const booking = await bookingRepository.updateBooking(bookingId, {
                status: 'IN_PROGRESS'
            });

            await publishEvent('booking.started', {
                bookingId,
                timestamp: new Date()
            });

            return booking;
        } catch (error) {
            throw new Error(`Error starting ride: ${error.message}`);
        }
    }

    // Hoàn thành chuyến đi
    async completeBooking(bookingId, actualFare) {
        try {
            const booking = await bookingRepository.updateBooking(bookingId, {
                status: 'COMPLETED',
                actualFare
            });

            // Publish event để Notification Service gửi notification
            await publishEvent('booking.completed', {
                bookingId,
                actualFare,
                timestamp: new Date()
            });

            return booking;
        } catch (error) {
            throw new Error(`Error completing booking: ${error.message}`);
        }
    }

    // Hủy booking
    async cancelBooking(bookingId, reason) {
        try {
            const booking = await bookingRepository.cancelBooking(bookingId);

            await publishEvent('booking.cancelled', {
                bookingId,
                reason,
                timestamp: new Date()
            });

            return booking;
        } catch (error) {
            throw new Error(`Error cancelling booking: ${error.message}`);
        }
    }

    // Lấy booking theo ID
    async getBooking(bookingId) {
        try {
            return await bookingRepository.getBookingById(bookingId);
        } catch (error) {
            throw new Error(`Error fetching booking: ${error.message}`);
        }
    }

    // Lấy tất cả booking của customer
    async getCustomerBookings(customerId) {
        try {
            return await bookingRepository.getBookingsByCustomerId(customerId);
        } catch (error) {
            throw new Error(`Error fetching customer bookings: ${error.message}`);
        }
    }
}

module.exports = new BookingService();
