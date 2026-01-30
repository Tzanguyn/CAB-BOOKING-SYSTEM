const express = require('express');
const BookingController = require('../controllers/BookingController');
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  validateBookingCreate,
  validateBookingConfirm,
  validateBookingComplete,
  validateBookingCancel
} = require('../middlewares/validation.middleware');

const router = express.Router();
const bookingController = new BookingController();

/**
 * =========================
 * CUSTOMER ROUTES
 * =========================
 */

// ✅ Tạo booking (customer)
router.post(
  '/',
  authenticateToken,
  validateBookingCreate,
  bookingController.createBooking.bind(bookingController)
);

// ✅ Lấy booking theo ID
router.get(
  '/:id',
  authenticateToken,
  bookingController.getBooking.bind(bookingController)
);

// ✅ Lấy tất cả booking của customer
router.get(
  '/customer/:customerId',
  authenticateToken,
  bookingController.getCustomerBookings.bind(bookingController)
);

/**
 * =========================
 * DRIVER ROUTES
 * =========================
 */

// ✅ Driver xác nhận booking
router.post(
  '/:id/confirm',
  authenticateToken,
  validateBookingConfirm,
  bookingController.confirmBooking.bind(bookingController)
);

// ✅ Bắt đầu chuyến đi
router.post(
  '/:id/start',
  authenticateToken,
  bookingController.startRide.bind(bookingController)
);

// ✅ Hoàn thành chuyến đi
router.post(
  '/:id/complete',
  authenticateToken,
  validateBookingComplete,
  bookingController.completeBooking.bind(bookingController)
);

/**
 * =========================
 * SHARED
 * =========================
 */

// ✅ Hủy booking (customer / driver)
router.post(
  '/:id/cancel',
  authenticateToken,
  validateBookingCancel,
  bookingController.cancelBooking.bind(bookingController)
);

module.exports = router;
