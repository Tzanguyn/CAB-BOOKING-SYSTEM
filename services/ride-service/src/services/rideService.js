const Ride = require('../models/Ride');
const { RideStateMachineService, RIDE_STATES, RIDE_EVENTS } = require('../state-machine/rideStateMachine');
const { RabbitMQClient, EXCHANGES, EVENT_TYPES } = require('../../../shared');

class RideService {
  constructor() {
    this.rabbitMQClient = null;
    this.activeRides = new Map(); // rideId -> stateMachineService
  }

  // Initialize RabbitMQ
  async initializeRabbitMQ() {
    try {
      this.rabbitMQClient = new RabbitMQClient();
      await this.rabbitMQClient.connect();

      // Setup event listeners
      await this.setupEventListeners();

      console.log('✅ Ride Service: RabbitMQ connected');
    } catch (error) {
      console.error('❌ Ride Service: RabbitMQ connection failed:', error);
    }
  }

  // Setup event listeners
  async setupEventListeners() {
    // Listen to driver events
    await this.rabbitMQClient.subscribeToQueue('ride-service-queue', this.handleDriverEvent.bind(this));

    // Listen to payment events
    await this.rabbitMQClient.subscribeToQueue('ride-payment-queue', this.handlePaymentEvent.bind(this));
  }

  // Create new ride request
  async createRideRequest(rideData) {
    try {
      const rideId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create ride document
      const ride = new Ride({
        rideId,
        userId: rideData.userId,
        status: RIDE_STATES.REQUESTED,
        pickup: rideData.pickup,
        destination: rideData.destination,
        pricing: {
          vehicleType: rideData.vehicleType || 'standard',
          estimatedFare: rideData.estimatedFare || 0
        },
        source: rideData.source || 'mobile_app',
        specialRequests: rideData.specialRequests || [],
        accessibilityNeeds: rideData.accessibilityNeeds || []
      });

      await ride.save();

      // Initialize state machine
      const stateMachine = new RideStateMachineService(rideId);
      stateMachine.initializeRide({
        rideId,
        userId: rideData.userId,
        pickupLocation: rideData.pickup,
        destination: rideData.destination,
        vehicleType: rideData.vehicleType,
        estimatedFare: rideData.estimatedFare
      });

      this.activeRides.set(rideId, stateMachine);

      // Publish ride created event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.RIDE_EVENTS,
          'ride.created',
          {
            type: EVENT_TYPES.RIDE_CREATED,
            rideId,
            userId: rideData.userId,
            pickup: rideData.pickup,
            destination: rideData.destination,
            vehicleType: rideData.vehicleType,
            estimatedFare: rideData.estimatedFare,
            timestamp: new Date().toISOString()
          }
        );
      }

      return { rideId, status: RIDE_STATES.REQUESTED };

    } catch (error) {
      console.error('Create ride request error:', error);
      throw error;
    }
  }

  // Start driver search for ride
  async startDriverSearch(rideId) {
    try {
      const ride = await Ride.findOne({ rideId });
      if (!ride) {
        throw new Error('Ride not found');
      }

      if (ride.status !== RIDE_STATES.REQUESTED) {
        throw new Error('Ride is not in requested state');
      }

      // Get state machine
      const stateMachine = this.activeRides.get(rideId);
      if (!stateMachine) {
        throw new Error('State machine not found for ride');
      }

      // Transition to searching
      stateMachine.send(RIDE_EVENTS.SEARCH_DRIVER);

      // Update ride status
      await ride.updateStatus(RIDE_STATES.SEARCHING_DRIVER, 'system');

      // Publish driver search started event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.RIDE_EVENTS,
          'ride.driver_search_started',
          {
            type: 'RideDriverSearchStarted',
            rideId,
            userId: ride.userId,
            pickup: ride.pickup,
            vehicleType: ride.pricing.vehicleType,
            timestamp: new Date().toISOString()
          }
        );
      }

      return { rideId, status: RIDE_STATES.SEARCHING_DRIVER };

    } catch (error) {
      console.error('Start driver search error:', error);
      throw error;
    }
  }

  // Assign driver to ride
  async assignDriverToRide(rideId, driverData) {
    try {
      const ride = await Ride.findOne({ rideId });
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Update ride with driver information
      ride.driverId = driverData.driverId;
      ride.driverDetails = {
        firstName: driverData.firstName,
        lastName: driverData.lastName,
        phone: driverData.phone,
        email: driverData.email,
        vehicle: driverData.vehicle
      };

      // Get state machine
      const stateMachine = this.activeRides.get(rideId);
      if (stateMachine) {
        // Transition to driver assigned
        stateMachine.send(RIDE_EVENTS.ASSIGN_DRIVER, { driverId: driverData.driverId });
      }

      // Update ride status
      await ride.updateStatus(RIDE_STATES.DRIVER_ASSIGNED, 'system');

      // Publish driver assigned event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.RIDE_EVENTS,
          'ride.assigned',
          {
            type: EVENT_TYPES.RIDE_ASSIGNED,
            rideId,
            userId: ride.userId,
            driverId: driverData.driverId,
            driverDetails: ride.driverDetails,
            pickup: ride.pickup,
            timestamp: new Date().toISOString()
          }
        );
      }

      return { rideId, status: RIDE_STATES.DRIVER_ASSIGNED, driver: driverData };

    } catch (error) {
      console.error('Assign driver to ride error:', error);
      throw error;
    }
  }

  // Update driver arrival
  async updateDriverArrival(rideId, location) {
    try {
      const ride = await Ride.findOne({ rideId });
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Get state machine
      const stateMachine = this.activeRides.get(rideId);
      if (stateMachine) {
        stateMachine.send(RIDE_EVENTS.DRIVER_ARRIVE);
      }

      // Update ride status
      await ride.updateStatus(RIDE_STATES.DRIVER_ARRIVED, 'driver');

      // Update current location
      ride.currentLocation = {
        coordinates: location.coordinates,
        timestamp: new Date()
      };

      await ride.save();

      return { rideId, status: RIDE_STATES.DRIVER_ARRIVED };

    } catch (error) {
      console.error('Update driver arrival error:', error);
      throw error;
    }
  }

  // Start ride
  async startRide(rideId, startLocation) {
    try {
      const ride = await Ride.findOne({ rideId });
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Get state machine
      const stateMachine = this.activeRides.get(rideId);
      if (stateMachine) {
        stateMachine.send(RIDE_EVENTS.START_RIDE);
      }

      // Update ride status
      await ride.updateStatus(RIDE_STATES.STARTED, 'driver');

      // Update route start location
      ride.route.waypoints = [{
        lat: startLocation.lat,
        lng: startLocation.lng,
        timestamp: new Date()
      }];

      await ride.save();

      return { rideId, status: RIDE_STATES.STARTED };

    } catch (error) {
      console.error('Start ride error:', error);
      throw error;
    }
  }

  // Complete ride
  async completeRide(rideId, completionData) {
    try {
      const ride = await Ride.findOne({ rideId });
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Update route information
      ride.route.actualDistance = completionData.distance || 0;
      ride.route.actualDuration = completionData.duration || 0;
      ride.route.waypoints = completionData.waypoints || ride.route.waypoints;

      // Update final fare
      ride.pricing.finalFare = completionData.finalFare || ride.calculateFinalFare();

      // Get state machine
      const stateMachine = this.activeRides.get(rideId);
      if (stateMachine) {
        stateMachine.send(RIDE_EVENTS.COMPLETE_RIDE);
      }

      // Update ride status
      await ride.updateStatus(RIDE_STATES.COMPLETED, 'driver');

      // Remove from active rides
      this.activeRides.delete(rideId);

      // Publish ride completed event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.RIDE_EVENTS,
          'ride.completed',
          {
            type: EVENT_TYPES.RIDE_COMPLETED,
            rideId,
            userId: ride.userId,
            driverId: ride.driverId,
            finalFare: ride.pricing.finalFare,
            distance: ride.route.actualDistance,
            duration: ride.route.actualDuration,
            pickup: ride.pickup,
            destination: ride.destination,
            timestamp: new Date().toISOString()
          }
        );
      }

      return {
        rideId,
        status: RIDE_STATES.COMPLETED,
        finalFare: ride.pricing.finalFare,
        distance: ride.route.actualDistance,
        duration: ride.route.actualDuration
      };

    } catch (error) {
      console.error('Complete ride error:', error);
      throw error;
    }
  }

  // Cancel ride
  async cancelRide(rideId, cancellationData) {
    try {
      const ride = await Ride.findOne({ rideId });
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Get state machine
      const stateMachine = this.activeRides.get(rideId);
      if (stateMachine) {
        stateMachine.send(RIDE_EVENTS.CANCEL_RIDE);
      }

      // Update cancellation info
      ride.cancellation = {
        cancelledBy: cancellationData.cancelledBy,
        reason: cancellationData.reason,
        notes: cancellationData.notes
      };

      // Update ride status
      await ride.updateStatus(RIDE_STATES.CANCELLED, cancellationData.cancelledBy);

      // Remove from active rides
      this.activeRides.delete(rideId);

      // Publish ride cancelled event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.RIDE_EVENTS,
          'ride.cancelled',
          {
            type: EVENT_TYPES.RIDE_CANCELLED,
            rideId,
            userId: ride.userId,
            driverId: ride.driverId,
            cancelledBy: cancellationData.cancelledBy,
            reason: cancellationData.reason,
            timestamp: new Date().toISOString()
          }
        );
      }

      return { rideId, status: RIDE_STATES.CANCELLED };

    } catch (error) {
      console.error('Cancel ride error:', error);
      throw error;
    }
  }

  // Get ride details
  async getRideDetails(rideId, userId = null) {
    try {
      const ride = await Ride.findOne({ rideId });

      if (!ride) {
        throw new Error('Ride not found');
      }

      // Check if user has permission to view this ride
      if (userId && ride.userId !== userId && ride.driverId !== userId) {
        throw new Error('Access denied');
      }

      return ride.toObject();

    } catch (error) {
      console.error('Get ride details error:', error);
      throw error;
    }
  }

  // Get active rides for user
  async getActiveRidesForUser(userId) {
    try {
      const activeStatuses = [
        RIDE_STATES.REQUESTED,
        RIDE_STATES.SEARCHING_DRIVER,
        RIDE_STATES.DRIVER_ASSIGNED,
        RIDE_STATES.DRIVER_ARRIVED,
        RIDE_STATES.STARTED
      ];

      const rides = await Ride.find({
        userId,
        status: { $in: activeStatuses }
      }).sort({ createdAt: -1 });

      return rides.map(ride => ride.toObject());

    } catch (error) {
      console.error('Get active rides for user error:', error);
      throw error;
    }
  }

  // Update ride location (GPS tracking)
  async updateRideLocation(rideId, locationData) {
    try {
      const ride = await Ride.findOne({ rideId });
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Update current location
      ride.currentLocation = {
        coordinates: locationData.coordinates,
        heading: locationData.heading,
        speed: locationData.speed,
        timestamp: new Date()
      };

      // Add to route waypoints if ride is active
      if (ride.status === RIDE_STATES.STARTED) {
        ride.route.waypoints.push({
          lat: locationData.coordinates.lat,
          lng: locationData.coordinates.lng,
          timestamp: new Date()
        });
      }

      await ride.save();

      return { rideId, location: ride.currentLocation };

    } catch (error) {
      console.error('Update ride location error:', error);
      throw error;
    }
  }

  // Handle incoming driver events
  async handleDriverEvent(event) {
    try {
      console.log('Ride Service received driver event:', event.type);

      switch (event.type) {
        case 'DriverLocationUpdated':
          await this.handleDriverLocationUpdate(event);
          break;

        case 'DriverStatusChanged':
          await this.handleDriverStatusChange(event);
          break;

        default:
          console.log('Unknown driver event type:', event.type);
      }
    } catch (error) {
      console.error('Handle driver event error:', error);
    }
  }

  // Handle incoming payment events
  async handlePaymentEvent(event) {
    try {
      console.log('Ride Service received payment event:', event.type);

      switch (event.type) {
        case 'PaymentCompleted':
          await this.handlePaymentCompleted(event);
          break;

        case 'PaymentFailed':
          await this.handlePaymentFailed(event);
          break;

        default:
          console.log('Unknown payment event type:', event.type);
      }
    } catch (error) {
      console.error('Handle payment event error:', error);
    }
  }

  // Private helper methods

  async handleDriverLocationUpdate(event) {
    // Update ride location if driver is on a ride
    const ride = await Ride.findOne({
      driverId: event.driverId,
      status: RIDE_STATES.STARTED
    });

    if (ride) {
      await this.updateRideLocation(ride.rideId, {
        coordinates: event.location,
        heading: event.heading,
        speed: event.speed
      });
    }
  }

  async handleDriverStatusChange(event) {
    // Handle driver status changes that affect rides
    if (event.newStatus === 'offline') {
      // Cancel rides assigned to this driver
      const assignedRides = await Ride.find({
        driverId: event.driverId,
        status: RIDE_STATES.DRIVER_ASSIGNED
      });

      for (const ride of assignedRides) {
        await this.cancelRide(ride.rideId, {
          cancelledBy: 'system',
          reason: 'driver_went_offline'
        });
      }
    }
  }

  async handlePaymentCompleted(event) {
    // Update ride payment status
    const ride = await Ride.findOne({ rideId: event.rideId });
    if (ride) {
      ride.payment.status = 'completed';
      ride.payment.paidAt = new Date();
      ride.payment.transactionId = event.transactionId;
      await ride.save();
    }
  }

  async handlePaymentFailed(event) {
    // Handle payment failure
    const ride = await Ride.findOne({ rideId: event.rideId });
    if (ride) {
      ride.payment.status = 'failed';
      await ride.save();

      // Could trigger additional actions like notifications
    }
  }

  // Cleanup
  async cleanup() {
    // Stop all active state machines
    for (const [rideId, stateMachine] of this.activeRides) {
      stateMachine.stop();
    }
    this.activeRides.clear();

    if (this.rabbitMQClient) {
      await this.rabbitMQClient.disconnect();
    }
  }
}

module.exports = RideService;