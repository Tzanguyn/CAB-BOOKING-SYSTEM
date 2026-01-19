const { createMachine, interpret, assign } = require('xstate');

/**
 * Ride State Machine
 * Manages the complete lifecycle of a ride based on CAB-BOOKING-SYSTEM.pdf
 */

// Ride States
const RIDE_STATES = {
  REQUESTED: 'requested',
  SEARCHING_DRIVER: 'searching_driver',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_ARRIVED: 'driver_arrived',
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

// Ride Events
const RIDE_EVENTS = {
  REQUEST_RIDE: 'REQUEST_RIDE',
  SEARCH_DRIVER: 'SEARCH_DRIVER',
  ASSIGN_DRIVER: 'ASSIGN_DRIVER',
  DRIVER_ARRIVE: 'DRIVER_ARRIVE',
  START_RIDE: 'START_RIDE',
  COMPLETE_RIDE: 'COMPLETE_RIDE',
  CANCEL_RIDE: 'CANCEL_RIDE',
  MARK_NO_SHOW: 'MARK_NO_SHOW',
  TIMEOUT: 'TIMEOUT',
  DRIVER_CANCEL: 'DRIVER_CANCEL',
  PASSENGER_NO_SHOW: 'PASSENGER_NO_SHOW'
};

// Ride State Machine Configuration
const rideStateMachine = createMachine({
  id: 'ride',
  initial: RIDE_STATES.REQUESTED,
  context: {
    rideId: null,
    userId: null,
    driverId: null,
    pickupLocation: null,
    destination: null,
    vehicleType: 'standard',
    estimatedFare: 0,
    actualFare: 0,
    distance: 0,
    duration: 0,
    status: RIDE_STATES.REQUESTED,
    requestedAt: null,
    acceptedAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
    searchTimeout: 5 * 60 * 1000, // 5 minutes
    noShowTimeout: 10 * 60 * 1000, // 10 minutes
    rideTimeout: 8 * 60 * 60 * 1000, // 8 hours max
    lastUpdated: null
  },
  states: {
    [RIDE_STATES.REQUESTED]: {
      entry: assign({
        status: RIDE_STATES.REQUESTED,
        requestedAt: () => new Date(),
        lastUpdated: () => new Date()
      }),
      on: {
        [RIDE_EVENTS.SEARCH_DRIVER]: {
          target: RIDE_STATES.SEARCHING_DRIVER,
          actions: assign({
            status: RIDE_STATES.SEARCHING_DRIVER,
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.CANCEL_RIDE]: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'passenger',
            cancellationReason: 'cancelled_by_passenger',
            lastUpdated: () => new Date()
          })
        }
      },
      after: {
        // Auto timeout after 2 minutes if no driver search started
        120000: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'system',
            cancellationReason: 'search_timeout',
            lastUpdated: () => new Date()
          })
        }
      }
    },

    [RIDE_STATES.SEARCHING_DRIVER]: {
      entry: assign({
        status: RIDE_STATES.SEARCHING_DRIVER,
        lastUpdated: () => new Date()
      }),
      on: {
        [RIDE_EVENTS.ASSIGN_DRIVER]: {
          target: RIDE_STATES.DRIVER_ASSIGNED,
          actions: assign({
            driverId: (context, event) => event.driverId,
            status: RIDE_STATES.DRIVER_ASSIGNED,
            acceptedAt: () => new Date(),
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.CANCEL_RIDE]: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'passenger',
            cancellationReason: 'cancelled_during_search',
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.TIMEOUT]: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'system',
            cancellationReason: 'no_driver_found',
            lastUpdated: () => new Date()
          })
        }
      },
      after: {
        // Search timeout
        searchTimeout: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'system',
            cancellationReason: 'driver_search_timeout',
            lastUpdated: () => new Date()
          })
        }
      }
    },

    [RIDE_STATES.DRIVER_ASSIGNED]: {
      entry: assign({
        status: RIDE_STATES.DRIVER_ASSIGNED,
        lastUpdated: () => new Date()
      }),
      on: {
        [RIDE_EVENTS.DRIVER_ARRIVE]: {
          target: RIDE_STATES.DRIVER_ARRIVED,
          actions: assign({
            status: RIDE_STATES.DRIVER_ARRIVED,
            arrivedAt: () => new Date(),
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.START_RIDE]: {
          target: RIDE_STATES.STARTED,
          actions: assign({
            status: RIDE_STATES.STARTED,
            startedAt: () => new Date(),
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.DRIVER_CANCEL]: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'driver',
            cancellationReason: 'cancelled_by_driver',
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.CANCEL_RIDE]: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'passenger',
            cancellationReason: 'cancelled_after_assignment',
            lastUpdated: () => new Date()
          })
        }
      },
      after: {
        // Driver should arrive within 15 minutes
        900000: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'system',
            cancellationReason: 'driver_arrival_timeout',
            lastUpdated: () => new Date()
          })
        }
      }
    },

    [RIDE_STATES.DRIVER_ARRIVED]: {
      entry: assign({
        status: RIDE_STATES.DRIVER_ARRIVED,
        lastUpdated: () => new Date()
      }),
      on: {
        [RIDE_EVENTS.START_RIDE]: {
          target: RIDE_STATES.STARTED,
          actions: assign({
            status: RIDE_STATES.STARTED,
            startedAt: () => new Date(),
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.PASSENGER_NO_SHOW]: {
          target: RIDE_STATES.NO_SHOW,
          actions: assign({
            status: RIDE_STATES.NO_SHOW,
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.CANCEL_RIDE]: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'passenger',
            cancellationReason: 'cancelled_at_pickup',
            lastUpdated: () => new Date()
          })
        }
      },
      after: {
        // Passenger no-show timeout (10 minutes after driver arrival)
        noShowTimeout: {
          target: RIDE_STATES.NO_SHOW,
          actions: assign({
            status: RIDE_STATES.NO_SHOW,
            lastUpdated: () => new Date()
          })
        }
      }
    },

    [RIDE_STATES.STARTED]: {
      entry: assign({
        status: RIDE_STATES.STARTED,
        lastUpdated: () => new Date()
      }),
      on: {
        [RIDE_EVENTS.COMPLETE_RIDE]: {
          target: RIDE_STATES.COMPLETED,
          actions: assign({
            status: RIDE_STATES.COMPLETED,
            completedAt: () => new Date(),
            lastUpdated: () => new Date()
          })
        },
        [RIDE_EVENTS.CANCEL_RIDE]: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'passenger',
            cancellationReason: 'cancelled_during_ride',
            lastUpdated: () => new Date()
          })
        }
      },
      after: {
        // Maximum ride duration (8 hours)
        rideTimeout: {
          target: RIDE_STATES.CANCELLED,
          actions: assign({
            status: RIDE_STATES.CANCELLED,
            cancelledAt: () => new Date(),
            cancelledBy: 'system',
            cancellationReason: 'ride_duration_timeout',
            lastUpdated: () => new Date()
          })
        }
      }
    },

    [RIDE_STATES.COMPLETED]: {
      entry: assign({
        status: RIDE_STATES.COMPLETED,
        lastUpdated: () => new Date()
      }),
      type: 'final'
    },

    [RIDE_STATES.CANCELLED]: {
      entry: assign({
        status: RIDE_STATES.CANCELLED,
        lastUpdated: () => new Date()
      }),
      type: 'final'
    },

    [RIDE_STATES.NO_SHOW]: {
      entry: assign({
        status: RIDE_STATES.NO_SHOW,
        lastUpdated: () => new Date()
      }),
      type: 'final'
    }
  }
});

// Ride State Machine Service Class
class RideStateMachineService {
  constructor(rideId) {
    this.rideId = rideId;
    this.service = interpret(rideStateMachine)
      .onTransition((state, event) => {
        console.log(`Ride ${this.rideId} transitioned to ${state.value} via ${event.type}`);
      })
      .start();
  }

  // Send event to state machine
  send(event, data = {}) {
    return this.service.send({ type: event, ...data });
  }

  // Get current state
  getCurrentState() {
    return this.service.getSnapshot().value;
  }

  // Get current context
  getContext() {
    return this.service.getSnapshot().context;
  }

  // Check if state machine can handle event
  canHandle(event) {
    return this.service.getSnapshot().nextEvents.includes(event);
  }

  // Stop state machine
  stop() {
    this.service.stop();
  }

  // Initialize ride with context
  initializeRide(rideData) {
    this.service = interpret(
      rideStateMachine.withContext({
        ...rideStateMachine.context,
        ...rideData,
        rideId: this.rideId
      })
    )
      .onTransition((state, event) => {
        console.log(`Ride ${this.rideId} transitioned to ${state.value} via ${event?.type || 'initial'}`);
      })
      .start();

    return this;
  }
}

module.exports = {
  RideStateMachineService,
  RIDE_STATES,
  RIDE_EVENTS
};