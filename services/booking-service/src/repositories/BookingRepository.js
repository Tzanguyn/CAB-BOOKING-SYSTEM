const Booking = require('../models/Booking');

class BookingRepository {
    // Tạo mới booking
    async createBooking(bookingData) {
        try {
            const booking = new Booking(bookingData);
            return await booking.save();
        } catch (error) {
            throw new Error(`Error creating booking: ${error.message}`);
        }
    }

    // Lấy booking theo ID
    async getBookingById(bookingId) {
        try {
            return await Booking.findById(bookingId);
        } catch (error) {
            throw new Error(`Error fetching booking: ${error.message}`);
        }
    }

    // Lấy tất cả booking của customer
    async getBookingsByCustomerId(customerId) {
        try {
            return await Booking.find({ customerId }).sort({ createdAt: -1 });
        } catch (error) {
            throw new Error(`Error fetching bookings: ${error.message}`);
        }
    }

    // Cập nhật booking
    async updateBooking(bookingId, updateData) {
        try {
            return await Booking.findByIdAndUpdate(
                bookingId,
                { ...updateData, updatedAt: new Date() },
                { new: true }
            );
        } catch (error) {
            throw new Error(`Error updating booking: ${error.message}`);
        }
    }

    // Hủy booking
    async cancelBooking(bookingId) {
        try {
            return await Booking.findByIdAndUpdate(
                bookingId,
                { status: 'CANCELLED', updatedAt: new Date() },
                { new: true }
            );
        } catch (error) {
            throw new Error(`Error cancelling booking: ${error.message}`);
        }
    }

    // Lấy booking theo status
    async getBookingsByStatus(status) {
        try {
            return await Booking.find({ status }).sort({ createdAt: -1 });
        } catch (error) {
            throw new Error(`Error fetching bookings by status: ${error.message}`);
        }
    }

    // Kiểm tra booking đã tồn tại
    async bookingExists(bookingId) {
        try {
            const booking = await Booking.findById(bookingId);
            return !!booking;
        } catch (error) {
            throw new Error(`Error checking booking existence: ${error.message}`);
        }
    }
}

module.exports = new BookingRepository();
