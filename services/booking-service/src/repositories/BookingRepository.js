const Booking = require('../models/Booking');
const mongoose = require('mongoose');

class BookingRepository {
    /**
     * Resolve a booking by either MongoDB _id or custom bookingId field (BKG-xxx).
     * Returns the Mongoose document or null.
     */
    async resolveBooking(id) {
        if (!id) return null;

        // Try MongoDB ObjectId first
        if (mongoose.Types.ObjectId.isValid(id)) {
            const byId = await Booking.findById(id);
            if (byId) return byId;
        }

        // Fallback: look up by the custom bookingId field
        const byBookingId = await Booking.findOne({ bookingId: id });
        return byBookingId || null;
    }

    // Tạo mới booking
    async createBooking(bookingData) {
        try {
            const booking = new Booking(bookingData);
            return await booking.save();
        } catch (error) {
            throw new Error(`Error creating booking: ${error.message}`);
        }
    }

    // Lấy booking theo ID (supports both _id and bookingId)
    async getBookingById(bookingId) {
        try {
            const booking = await this.resolveBooking(bookingId);
            return booking;
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

    // Cập nhật booking (supports both _id and custom bookingId)
    async updateBooking(bookingId, updateData) {
        try {
            const booking = await this.resolveBooking(bookingId);
            if (!booking) {
                throw new Error(`Booking not found: ${bookingId}`);
            }
            return await Booking.findByIdAndUpdate(
                booking._id,
                { ...updateData, updatedAt: new Date() },
                { new: true }
            );
        } catch (error) {
            throw new Error(`Error updating booking: ${error.message}`);
        }
    }

    // Hủy booking (supports both _id and custom bookingId)
    async cancelBooking(bookingId) {
        try {
            const booking = await this.resolveBooking(bookingId);
            if (!booking) {
                throw new Error(`Booking not found: ${bookingId}`);
            }
            return await Booking.findByIdAndUpdate(
                booking._id,
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
            const booking = await this.resolveBooking(bookingId);
            return !!booking;
        } catch (error) {
            throw new Error(`Error checking booking existence: ${error.message}`);
        }
    }

    async findByCustomerAndIdempotencyKey(customerId, idempotencyKey) {
        try {
            return await Booking.findOne({ customerId, idempotencyKey });
        } catch (error) {
            throw new Error(`Error finding idempotent booking: ${error.message}`);
        }
    }

    async deleteBookingById(bookingId) {
        try {
            return await Booking.findByIdAndDelete(bookingId);
        } catch (error) {
            throw new Error(`Error deleting booking: ${error.message}`);
        }
    }
}

module.exports = new BookingRepository();
