const RideService = require('../src/services/rideService');
const Ride = require('../src/models/Ride');

jest.mock('../src/models/Ride');
jest.mock('amqplib', () => ({
  connect: jest.fn()
}));

describe('RideService', () => {
  let rideService;
  let mockRabbitMQClient;

  beforeEach(() => {
    mockRabbitMQClient = {
      publishEvent: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    rideService = new RideService();
    rideService.rabbitMQClient = mockRabbitMQClient;
    rideService.activeRides.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRideRequest', () => {
    it('should create a new ride request successfully', async () => {
      const rideData = {
        userId: 'user123',
        pickup: {
          address: '123 Main St',
          coordinates: { lat: 10.762622, lng: 106.660172 }
        },
        destination: {
          address: '456 Park Ave',
          coordinates: { lat: 10.792622, lng: 106.690172 }
        },
        vehicleType: 'standard',
        estimatedFare: 150000
      };

      const mockSave = jest.fn().mockResolvedValue({
        rideId: 'ride_123',
        ...rideData,
        save: mockSave
      });

      Ride.mockImplementation(() => ({
        save: mockSave
      }));

      const result = await rideService.createRideRequest(rideData);

      expect(result).toHaveProperty('rideId');
      expect(result).toHaveProperty('status', 'requested');
      expect(mockSave).toHaveBeenCalled();
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledWith(
        expect.any(String),
        'ride.created',
        expect.objectContaining({
          type: expect.any(String),
          rideId: expect.any(String),
          userId: 'user123'
        })
      );
    });
  });

  describe('assignDriverToRide', () => {
    it('should assign driver to ride successfully', async () => {
      const rideId = 'ride_123';
      const driverData = {
        driverId: 'driver_456',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        vehicle: {
          make: 'Toyota',
          model: 'Camry',
          licensePlate: 'ABC-123'
        }
      };

      const mockRide = {
        rideId,
        userId: 'user123',
        driverId: null,
        driverDetails: null,
        updateStatus: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };

      Ride.findOne.mockResolvedValue(mockRide);

      const result = await rideService.assignDriverToRide(rideId, driverData);

      expect(result).toHaveProperty('rideId', rideId);
      expect(result).toHaveProperty('status', 'driver_assigned');
      expect(result).toHaveProperty('driver');
      expect(mockRide.updateStatus).toHaveBeenCalledWith('driver_assigned', 'system');
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalled();
    });
  });

  describe('completeRide', () => {
    it('should complete ride successfully', async () => {
      const rideId = 'ride_123';
      const completionData = {
        distance: 5000,
        duration: 1200,
        finalFare: 180000,
        waypoints: []
      };

      const mockRide = {
        rideId,
        userId: 'user123',
        driverId: 'driver_456',
        route: {
          actualDistance: 0,
          actualDuration: 0,
          waypoints: []
        },
        pricing: {
          finalFare: 0
        },
        calculateFinalFare: jest.fn().mockReturnValue(180000),
        updateStatus: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };

      Ride.findOne.mockResolvedValue(mockRide);
      rideService.activeRides.set(rideId, {
        send: jest.fn(),
        stop: jest.fn()
      });

      const result = await rideService.completeRide(rideId, completionData);

      expect(result).toHaveProperty('rideId', rideId);
      expect(result).toHaveProperty('status', 'completed');
      expect(result).toHaveProperty('finalFare', 180000);
      expect(rideService.activeRides.has(rideId)).toBe(false);
    });
  });
});