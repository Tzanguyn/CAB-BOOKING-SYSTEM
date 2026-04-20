const validateBookingCreate = (req, res, next) => {
    const body = req.body || {};
    const { customerId } = body;
    const pickup = body.pickupLocation || body.pickup;
    const drop = body.dropoffLocation || body.drop;
    const paymentMethod = body.paymentMethod || body.payment_method;

    const normalizedPickup = pickup
        ? {
            address: pickup.address || '',
            latitude: pickup.latitude ?? pickup.lat,
            longitude: pickup.longitude ?? pickup.lng
        }
        : null;

    const normalizedDrop = drop
        ? {
            address: drop.address || '',
            latitude: drop.latitude ?? drop.lat,
            longitude: drop.longitude ?? drop.lng
        }
        : null;

    req.body = {
        ...body,
        paymentMethod,
        pickupLocation: normalizedPickup,
        dropoffLocation: normalizedDrop
    };

    // Validate required fields
    if (!customerId) {
        return res.status(400).json({
            success: false,
            message: 'customerId is required'
        });
    }

    if (!normalizedPickup) {
        return res.status(400).json({
            success: false,
            message: 'pickup is required'
        });
    }

    if (!normalizedDrop) {
        return res.status(400).json({
            success: false,
            message: 'drop is required'
        });
    }

    // Validate payment method
    const validPaymentMethods = ['CASH', 'CARD', 'WALLET'];
    if (paymentMethod && !validPaymentMethods.includes(String(paymentMethod).toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment method'
        });
    }

    // Validate location format (latitude and longitude must be number types)
    const isValidCoord = (lat, lng) => {
        return typeof lat === 'number'
            && typeof lng === 'number'
            && Number.isFinite(lat)
            && Number.isFinite(lng)
            && lat >= -90
            && lat <= 90
            && lng >= -180
            && lng <= 180;
    };

    if (!isValidCoord(normalizedPickup.latitude, normalizedPickup.longitude)) {
        return res.status(422).json({
            success: false,
            message: 'Validation error from schema'
        });
    }

    if (!isValidCoord(normalizedDrop.latitude, normalizedDrop.longitude)) {
        return res.status(422).json({
            success: false,
            message: 'Validation error from schema'
        });
    }

    if (paymentMethod) {
        req.body.paymentMethod = String(paymentMethod).toUpperCase();
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
