const validateBookingCreate = (req, res, next) => {
    const { customerId, pickupLocation, dropoffLocation, paymentMethod } = req.body;

    // Validate required fields
    if (!customerId) {
        return res.status(400).json({
            success: false,
            message: 'customerId is required'
        });
    }

    if (!pickupLocation || !pickupLocation.address || !pickupLocation.latitude || !pickupLocation.longitude) {
        return res.status(400).json({
            success: false,
            message: 'pickupLocation with address, latitude, and longitude is required'
        });
    }

    if (!dropoffLocation || !dropoffLocation.address || !dropoffLocation.latitude || !dropoffLocation.longitude) {
        return res.status(400).json({
            success: false,
            message: 'dropoffLocation with address, latitude, and longitude is required'
        });
    }

    // Validate payment method
    const validPaymentMethods = ['CASH', 'CARD', 'WALLET'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
            success: false,
            message: `paymentMethod must be one of: ${validPaymentMethods.join(', ')}`
        });
    }

    // Validate location format (latitude and longitude should be numbers between -180 and 180)
    const isValidCoord = (lat, lng) => {
        return typeof lat === 'number' && typeof lng === 'number' &&
               lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    if (!isValidCoord(pickupLocation.latitude, pickupLocation.longitude)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid pickup location coordinates'
        });
    }

    if (!isValidCoord(dropoffLocation.latitude, dropoffLocation.longitude)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid dropoff location coordinates'
        });
    }

    next();
};

const validateBookingConfirm = (req, res, next) => {
    const { driverId, rideId } = req.body;

    if (!driverId) {
        return res.status(400).json({
            success: false,
            message: 'driverId is required'
        });
    }

    if (!rideId) {
        return res.status(400).json({
            success: false,
            message: 'rideId is required'
        });
    }

    next();
};

const validateBookingComplete = (req, res, next) => {
    const { actualFare } = req.body;

    if (actualFare === undefined || actualFare === null) {
        return res.status(400).json({
            success: false,
            message: 'actualFare is required'
        });
    }

    if (typeof actualFare !== 'number' || actualFare < 0) {
        return res.status(400).json({
            success: false,
            message: 'actualFare must be a positive number'
        });
    }

    next();
};

const validateBookingCancel = (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({
            success: false,
            message: 'reason is required'
        });
    }

    next();
};

module.exports = {
    validateBookingCreate,
    validateBookingConfirm,
    validateBookingComplete,
    validateBookingCancel
};
