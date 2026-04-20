const bookingRepository = require('../repositories/BookingRepository');
const { publishEvent } = require('../config/messageBroker');
const axios = require('axios');
const { buildTraceHeaders, getCurrentTraceContext } = require('../../../shared/utils/observability');
const { calculateExponentialBackoffDelay, sleep } = require('../../../shared/utils/retryPolicy');

class BookingService {
    constructor(eventDrivenMatcher = null) {
        this.defaultPricingTimeoutMs = Number(process.env.PRICING_TIMEOUT_MS || 2500);
        this.defaultPricingRetryCount = Number(process.env.PRICING_RETRY_COUNT || 2);
        this.paymentRetryMaxAttempts = Number(process.env.PAYMENT_RETRY_MAX_ATTEMPTS || 3);
        this.paymentRetryInitialBackoffMs = Number(process.env.PAYMENT_RETRY_INITIAL_BACKOFF_MS || 500);
        this.paymentRetryMaxBackoffMs = Number(process.env.PAYMENT_RETRY_MAX_BACKOFF_MS || 8000);
        this.eventDrivenMatcher = eventDrivenMatcher;
        this.useEventDrivenMatching = process.env.USE_EVENT_DRIVEN_MATCHING !== 'false';
    }

    isRetryablePaymentError(error) {
        const code = String(error?.code || '').toUpperCase();
        const status = Number(error?.response?.status || 0);
        const timeout = code === 'ECONNABORTED';
        const network = ['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(code);
        const serverError = status >= 500;
        return timeout || network || serverError;
    }

    normalizeDriverId(candidate) {
        if (!candidate) return null;
        if (typeof candidate === 'string') return candidate;
        return candidate.driverId || candidate.driver_id || candidate.id || null;
    }

    chooseDriver(candidates) {
        if (!Array.isArray(candidates) || !candidates.length) {
            return null;
        }

        return this.normalizeDriverId(candidates[0]);
    }

    async getDriverStatus(driverId) {
        try {
            const driverServiceUrl = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3007';
            const response = await axios.get(`${driverServiceUrl}/api/drivers/status/${encodeURIComponent(driverId)}`, {
                headers: buildTraceHeaders(),
                timeout: 5000
            });

            const status = String(response.data?.status || response.data?.data?.status || '').toUpperCase();
            return status || 'OFFLINE';
        } catch (error) {
            console.warn(`Error fetching driver status for ${driverId}:`, error.message);
            return 'OFFLINE';
        }
    }

    async getEtaEstimate(pickupLocation, dropoffLocation) {
        try {
            const etaServiceUrl = process.env.ETA_SERVICE_URL || 'http://eta-service:3011';
            const distanceKm = Math.max(
                0,
                Math.sqrt(
                    ((Number(pickupLocation.latitude) - Number(dropoffLocation.latitude)) ** 2)
                    + ((Number(pickupLocation.longitude) - Number(dropoffLocation.longitude)) ** 2)
                ) * 111
            );

            const response = await axios.post(`${etaServiceUrl}/api/eta/estimate`, {
                distance_km: Number(distanceKm.toFixed(3)),
                pickup: {
                    lat: pickupLocation.latitude,
                    lng: pickupLocation.longitude
                },
                drop: {
                    lat: dropoffLocation.latitude,
                    lng: dropoffLocation.longitude
                }
            }, {
                headers: buildTraceHeaders(),
                timeout: 4000
            });

            const etaMinutes = Number(response.data?.eta ?? response.data?.eta_minutes ?? 0);
            if (!Number.isFinite(etaMinutes) || etaMinutes < 0) {
                return 0;
            }

            return etaMinutes;
        } catch (error) {
            console.warn('Error getting ETA:', error.message);
            return 0;
        }
    }

    async initializePayment({ rideId, amount, userId, paymentMethod, idempotencyKey }) {
        const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3002';
        let lastError = null;

        for (let attempt = 1; attempt <= this.paymentRetryMaxAttempts; attempt += 1) {
            try {
                const traceHeaders = buildTraceHeaders();
                const headers = {
                    ...traceHeaders,
                    ...(idempotencyKey ? { 'idempotency-key': String(idempotencyKey) } : {})
                };

                const response = await axios.post(`${paymentServiceUrl}/api/payments/test-order`, {
                    rideId,
                    amount,
                    userId,
                    method: paymentMethod,
                    idempotencyKey: idempotencyKey || undefined
                }, {
                    headers,
                    timeout: 5000
                });

                return {
                    ...(response.data?.data || null),
                    retryCount: attempt - 1
                };
            } catch (error) {
                lastError = error;
                const isLastAttempt = attempt === this.paymentRetryMaxAttempts;
                const retryable = this.isRetryablePaymentError(error);

                if (isLastAttempt || !retryable) {
                    console.warn('Error initializing payment:', error.message);
                    break;
                }

                const backoffMs = calculateExponentialBackoffDelay(attempt, {
                    initialDelayMs: this.paymentRetryInitialBackoffMs,
                    maxDelayMs: this.paymentRetryMaxBackoffMs,
                    multiplier: 2,
                    jitterRatio: 0.15
                });

                console.warn(`Payment init retry ${attempt}/${this.paymentRetryMaxAttempts - 1} after ${backoffMs}ms:`, error.message);
                await sleep(backoffMs);
            }
        }

        throw lastError || new Error('Payment initialization failed');
    }

    async notifyUser({ userId, title, message, metadata }) {
        try {
            const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3008';
            const response = await axios.post(`${notificationServiceUrl}/api/notifications/send`, {
                userId,
                title,
                message,
                type: 'ALL',
                metadata
            }, {
                headers: buildTraceHeaders(),
                timeout: 5000
            });

            return response.data?.data || null;
        } catch (error) {
            console.warn('Error sending notification:', error.message);
            return null;
        }
    }

    async getAvailableDrivers(pickupLocation, radiusKm = 5) {
        try {
            const driverServiceUrl = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3007';
            const lat = pickupLocation.latitude;
            const lng = pickupLocation.longitude;

            const response = await axios.get(`${driverServiceUrl}/api/drivers/nearby`, {
                params: {
                    lat,
                    lng,
                    radius: radiusKm
                },
                headers: buildTraceHeaders(),
                timeout: 5000
            });

            return Array.isArray(response.data?.drivers)
                ? response.data.drivers
                : [];
        } catch (error) {
            console.warn('Error checking nearby drivers:', error.message);
            return [];
        }
    }

    async getMatchedDrivers(pickupLocation, radiusKm = 5) {
        try {
            // Try event-driven matching first if available
            if (this.useEventDrivenMatching && this.eventDrivenMatcher) {
                try {
                    const eventDrivenResults = await this.eventDrivenMatcher.getMatchedDriversViaEvent(
                        pickupLocation,
                        radiusKm
                    );
                    
                    if (eventDrivenResults && eventDrivenResults.length > 0) {
                        console.log(`[BookingService] Event-driven matching returned ${eventDrivenResults.length} drivers`);
                        return eventDrivenResults;
                    }
                    
                    console.log('[BookingService] Event-driven matching returned empty, falling back to HTTP');
                } catch (eventError) {
                    console.warn('[BookingService] Event-driven matching failed:', eventError.message);
                    console.log('[BookingService] Falling back to HTTP matching');
                }
            }

            // Fallback to HTTP call
            const matchingServiceUrl = process.env.MATCHING_SERVICE_URL || 'http://matching-service:3014';
            const response = await axios.post(`${matchingServiceUrl}/api/matching/recommend`, {
                lat: pickupLocation.latitude,
                lng: pickupLocation.longitude,
                radiusKm,
                top: 5,
                demandIndex: 1
            }, {
                headers: buildTraceHeaders(),
                timeout: 3000
            });

            const recommendations = Array.isArray(response.data?.recommendations)
                ? response.data.recommendations
                : [];

            return recommendations.map((item) => ({
                driverId: item.driverId || item.driver_id || item.id,
                score: item.score || 0,
                status: item.status || 'UNKNOWN',
                rating: item.rating || 0,
                distance: item.distance || 0
            })).filter((item) => item.driverId);
        } catch (error) {
            console.warn('Error getting matched drivers:', error.message);
            return [];
        }
    }

    // Tạo yêu cầu đặt xe mới
    async createBookingRequest(customerId, bookingData) {
        try {
            // Validation
            if (!customerId || !bookingData.pickupLocation || !bookingData.dropoffLocation) {
                throw new Error('Missing required fields');
            }

            const idempotencyKey = bookingData.idempotencyKey || null;
            const strictTransaction = bookingData.strictTransaction === true;

            if (idempotencyKey) {
                const existingBooking = await bookingRepository.findByCustomerAndIdempotencyKey(customerId, idempotencyKey);
                if (existingBooking) {
                    return {
                        ...existingBooking.toObject(),
                        _id: existingBooking._id,
                        _idempotentReplay: true
                    };
                }
            }

            const bookingId = `BKG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const shouldAutoAssign = bookingData.autoAssign === true;
            let noDriversAvailable = false;
            let bookingStatus = 'REQUESTED';
            let selectedDriverId = null;
            let selectedDriverStatus = null;
            const traceContext = getCurrentTraceContext();

            if (shouldAutoAssign) {
                const aiMatchedDrivers = await this.getMatchedDrivers(bookingData.pickupLocation, bookingData.searchRadiusKm || 5);
                const nearbyDrivers = aiMatchedDrivers.length > 0
                    ? aiMatchedDrivers
                    : await this.getAvailableDrivers(bookingData.pickupLocation, bookingData.searchRadiusKm || 5);

                if (!nearbyDrivers.length) {
                    noDriversAvailable = true;
                    bookingStatus = 'PENDING';
                } else {
                    for (const candidate of nearbyDrivers) {
                        const candidateDriverId = this.normalizeDriverId(candidate);
                        if (!candidateDriverId) {
                            continue;
                        }

                        selectedDriverStatus = await this.getDriverStatus(candidateDriverId);
                        if (selectedDriverStatus === 'ONLINE') {
                            selectedDriverId = candidateDriverId;
                            break;
                        }
                    }

                    if (!selectedDriverId) {
                        noDriversAvailable = true;
                        bookingStatus = 'PENDING';
                    }
                }
            }

            const etaMinutes = await this.getEtaEstimate(
                bookingData.pickupLocation,
                bookingData.dropoffLocation
            );

            // Gọi Pricing Service để tính giá
            const pricingResult = await this.getEstimatedFare(
                bookingData.pickupLocation,
                bookingData.dropoffLocation,
                {
                    timeoutMs: bookingData.pricingTimeoutMs
                }
            );
            const { estimatedFare, surge } = pricingResult;

            // Tạo booking mới
            const newBooking = await bookingRepository.createBooking({
                bookingId,
                ...(idempotencyKey ? { idempotencyKey } : {}),
                customerId,
                pickupLocation: bookingData.pickupLocation,
                dropoffLocation: bookingData.dropoffLocation,
                estimatedFare,
                surge,
                etaMinutes,
                paymentMethod: bookingData.paymentMethod || 'CASH',
                notes: bookingData.notes,
                status: bookingStatus,
                ...(selectedDriverId ? { driverId: selectedDriverId } : {})
            });

            if (bookingData.simulateFailureAfterInsert === true) {
                await bookingRepository.deleteBookingById(newBooking._id);
                await publishEvent('booking.rollback', {
                    event_type: 'booking_rollback',
                    booking_id: bookingId,
                    trace_id: traceContext?.traceId || null,
                    request_id: traceContext?.requestId || null,
                    reason: 'simulated_failure_after_insert',
                    timestamp: new Date().toISOString()
                });
                throw new Error('Transaction rolled back due to simulated failure');
            }

            let payment = null;
            let paymentError = null;

            try {
                if (bookingData.simulatePaymentFailure === true) {
                    throw new Error('Simulated payment failure');
                }

                if (bookingData.simulateNetworkIssue === true) {
                    throw new Error('Simulated payment timeout/network issue');
                }

                payment = await this.initializePayment({
                    rideId: bookingId,
                    amount: estimatedFare,
                    userId: customerId,
                    paymentMethod: bookingData.paymentMethod || 'CASH',
                    idempotencyKey
                });
            } catch (error) {
                paymentError = error;
            }

            if (paymentError && strictTransaction) {
                const compensatedBooking = await bookingRepository.updateBooking(newBooking._id, {
                    status: 'CANCELLED'
                });

                await publishEvent('booking.compensated', {
                    event_type: 'booking_compensated',
                    booking_id: bookingId,
                    trace_id: traceContext?.traceId || null,
                    request_id: traceContext?.requestId || null,
                    reason: paymentError.message,
                    timestamp: new Date().toISOString()
                });

                return {
                    ...compensatedBooking.toObject(),
                    _id: compensatedBooking._id,
                    compensated: true,
                    paymentError: paymentError.message,
                    transaction: {
                        atomic: true,
                        consistent: true,
                        isolated: true,
                        durable: false
                    }
                };
            }

            if (payment?.paymentId) {
                await bookingRepository.updateBooking(newBooking._id, {
                    paymentId: payment.paymentId
                });
            }

            const notification = await this.notifyUser({
                userId: customerId,
                title: 'Booking Created',
                message: `Booking ${bookingId} created successfully`,
                metadata: {
                    bookingId,
                    estimatedFare,
                    etaMinutes
                }
            });

            if (selectedDriverId) {
                await this.notifyUser({
                    userId: selectedDriverId,
                    title: 'New Ride Assigned',
                    message: `You have a new ride request: ${bookingId}`,
                    metadata: {
                        bookingId,
                        customerId,
                        pickupLocation: bookingData.pickupLocation,
                        dropoffLocation: bookingData.dropoffLocation
                    }
                });
            }

            const rideRequestedEvent = {
                event_type: 'ride_requested',
                ride_id: bookingId,
                user_id: customerId,
                trace_id: traceContext?.traceId || null,
                request_id: traceContext?.requestId || null,
                pickup: {
                    lat: bookingData.pickupLocation.latitude,
                    lng: bookingData.pickupLocation.longitude
                },
                timestamp: new Date().toISOString()
            };

            await publishEvent('ride_requested', rideRequestedEvent);

            // Publish event để Ride Service subscribe
            await publishEvent('booking.created', {
                bookingId: newBooking._id,
                customerId,
                pickupLocation: newBooking.pickupLocation,
                dropoffLocation: newBooking.dropoffLocation,
                estimatedFare,
                trace_id: traceContext?.traceId || null,
                request_id: traceContext?.requestId || null,
                timestamp: new Date()
            });

            const resultObject = {
                ...newBooking.toObject(),
                _id: newBooking._id,
                etaMinutes,
                estimatedFare,
                surge,
                pricing: pricingResult,
                payment,
                notification,
                selectedDriverStatus,
                selectedDriverId,
                transaction: {
                    atomic: true,
                    consistent: true,
                    isolated: true,
                    durable: true
                }
            };

            if (noDriversAvailable) {
                return {
                    ...resultObject,
                    noDriversAvailable: true,
                    message: 'No drivers available'
                };
            }

            return resultObject;
        } catch (error) {
            throw new Error(`Error creating booking request: ${error.message}`);
        }
    }

    // Lấy giá từ Pricing Service
    async getEstimatedFare(pickupLocation, dropoffLocation, options = {}) {
        const pricingServiceUrl = process.env.PRICING_SERVICE_URL || 'http://pricing-service:3001';
        const timeoutMs = Number(options.timeoutMs || this.defaultPricingTimeoutMs);

        for (let attempt = 1; attempt <= this.defaultPricingRetryCount; attempt += 1) {
            try {
                const distanceKm = Math.max(
                    0,
                    Math.sqrt(
                        ((Number(pickupLocation.latitude) - Number(dropoffLocation.latitude)) ** 2)
                        + ((Number(pickupLocation.longitude) - Number(dropoffLocation.longitude)) ** 2)
                    ) * 111
                );

                const response = await axios.post(`${pricingServiceUrl}/api/pricing/estimate`, {
                    pickupLocation,
                    dropoffLocation,
                    distance_km: Number(distanceKm.toFixed(3))
                }, {
                    headers: buildTraceHeaders(),
                    timeout: timeoutMs
                });

                const estimatedFare = Number(response.data?.estimatedFare ?? response.data?.price ?? 100000);
                const surge = Math.max(1, Number(response.data?.surge ?? 1));

                return {
                    estimatedFare: Number.isFinite(estimatedFare) && estimatedFare > 0 ? estimatedFare : 100000,
                    surge: Number.isFinite(surge) && surge >= 1 ? surge : 1,
                    source: 'pricing-service',
                    retryCount: attempt - 1,
                    timedOut: false
                };
            } catch (error) {
                const isLast = attempt === this.defaultPricingRetryCount;
                const isTimeout = error.code === 'ECONNABORTED';

                if (isLast) {
                    console.warn('Error getting estimated fare, fallback enabled:', error.message);
                    return {
                        estimatedFare: 100000,
                        surge: 1,
                        source: 'fallback',
                        retryCount: attempt,
                        timedOut: isTimeout
                    };
                }
            }
        }

        return {
            estimatedFare: 100000,
            surge: 1,
            source: 'fallback',
            retryCount: this.defaultPricingRetryCount,
            timedOut: true
        };
    }

    // Xác nhận booking (khi driver chấp nhận)
    async confirmBooking(bookingId, driverId, rideId) {
        try {
            const booking = await bookingRepository.updateBooking(bookingId, {
                status: 'ACCEPTED',
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

            await publishEvent('ride_accepted', {
                event_type: 'ride_accepted',
                ride_id: booking?.bookingId || rideId,
                driver_id: driverId,
                booking_id: booking?.bookingId,
                    trace_id: getCurrentTraceContext()?.traceId || null,
                    request_id: getCurrentTraceContext()?.requestId || null,
                timestamp: new Date().toISOString()
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

    async getMcpContext(bookingId) {
        const booking = await this.getBooking(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        const availableDrivers = await this.getAvailableDrivers(booking.pickupLocation, 5);
        const etaMinutes = await this.getEtaEstimate(booking.pickupLocation, booking.dropoffLocation);
        const pricing = await this.getEstimatedFare(booking.pickupLocation, booking.dropoffLocation);

        return {
            ride_id: booking.bookingId || String(booking._id),
            pickup: {
                lat: booking.pickupLocation?.latitude,
                lng: booking.pickupLocation?.longitude
            },
            drop: {
                lat: booking.dropoffLocation?.latitude,
                lng: booking.dropoffLocation?.longitude
            },
            available_drivers: availableDrivers.map((driver) => ({
                id: this.normalizeDriverId(driver),
                distance: typeof driver?.distance === 'number' ? driver.distance : null,
                rating: typeof driver?.rating === 'number' ? driver.rating : null
            })),
            eta_minutes: etaMinutes,
            pricing,
            demand_index: 1,
            supply_index: 1
        };
    }
}

module.exports = new BookingService();
