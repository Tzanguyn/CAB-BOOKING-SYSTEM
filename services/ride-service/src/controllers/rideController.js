const rideService = require('../services/rideService');
const logger = require('../utils/logger');

class RideController {
  // Create new ride
  async createRide(req, res) {
    try {
      const rideData = req.body;
      const userId = req.user?.userId || rideData.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const result = await rideService.createRideRequest({
        ...rideData,
        userId
      });

      logger.info('Ride created', { rideId: result.rideId, userId });

      res.status(201).json({
        success: true,
        message: 'Ride request created successfully',
        data: result
      });
    } catch (error) {
      logger.error('Create ride error', { error: error.message, body: req.body });
      res.status(500).json({
        success: false,
        message: 'Failed to create ride',
        error: error.message
      });
    }
  }

  // Get ride details
  async getRide(req, res) {
    try {
      const { rideId } = req.params;
      const userId = req.user?.userId;

      const ride = await rideService.getRideDetails(rideId, userId);

      res.json({
        success: true,
        data: ride
      });
    } catch (error) {
      if (error.message === 'Ride not found') {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      logger.error('Get ride error', { rideId: req.params.rideId, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get ride details',
        error: error.message
      });
    }
  }

  // Update ride status
  async updateRideStatus(req, res) {
    try {
      const { rideId } = req.params;
      const { status, location, metadata } = req.body;
      const actor = req.user?.userId || 'system';

      let result;
      
      switch (status) {
        case 'driver_assigned':
          result = await rideService.assignDriverToRide(rideId, req.body.driverData);
          break;
        case 'driver_arrived':
          result = await rideService.updateDriverArrival(rideId, location);
          break;
        case 'started':
          result = await rideService.startRide(rideId, location);
          break;
        case 'completed':
          result = await rideService.completeRide(rideId, req.body.completionData);
          break;
        default:
          throw new Error(`Invalid status transition: ${status}`);
      }

      logger.info('Ride status updated', { rideId, from: req.body.oldStatus, to: status, actor });

      res.json({
        success: true,
        message: `Ride status updated to ${status}`,
        data: result
      });
    } catch (error) {
      logger.error('Update ride status error', { 
        rideId: req.params.rideId, 
        status: req.body.status,
        error: error.message 
      });
      res.status(400).json({
        success: false,
        message: 'Failed to update ride status',
        error: error.message
      });
    }
  }

  // Cancel ride
  async cancelRide(req, res) {
    try {
      const { rideId } = req.params;
      const { reason, notes } = req.body;
      const cancelledBy = req.user?.role === 'driver' ? 'driver' : 'passenger';

      const result = await rideService.cancelRide(rideId, {
        cancelledBy,
        reason,
        notes
      });

      logger.info('Ride cancelled', { rideId, cancelledBy, reason });

      res.json({
        success: true,
        message: 'Ride cancelled successfully',
        data: result
      });
    } catch (error) {
      logger.error('Cancel ride error', { rideId: req.params.rideId, error: error.message });
      res.status(400).json({
        success: false,
        message: 'Failed to cancel ride',
        error: error.message
      });
    }
  }

  // Update ride location (real-time GPS)
  async updateLocation(req, res) {
    try {
      const { rideId } = req.params;
      const locationData = req.body;

      const result = await rideService.updateRideLocation(rideId, locationData);

      res.json({
        success: true,
        message: 'Location updated',
        data: result
      });
    } catch (error) {
      logger.error('Update location error', { rideId: req.params.rideId, error: error.message });
      res.status(400).json({
        success: false,
        message: 'Failed to update location',
        error: error.message
      });
    }
  }

  // Get live tracking
  async getLiveTracking(req, res) {
    try {
      const { rideId } = req.params;
      
      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // This would connect to WebSocket/Redis pubsub in real implementation
      res.write(`data: ${JSON.stringify({
        type: 'tracking_init',
        rideId,
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Keep connection alive
      const interval = setInterval(() => {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }, 30000);

      req.on('close', () => {
        clearInterval(interval);
      });
    } catch (error) {
      logger.error('Live tracking error', { rideId: req.params.rideId, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to establish tracking connection'
      });
    }
  }

  // Get active rides for user
  async getActiveRides(req, res) {
    try {
      const { userId } = req.params;

      const rides = await rideService.getActiveRidesForUser(userId);

      res.json({
        success: true,
        data: rides
      });
    } catch (error) {
      logger.error('Get active rides error', { userId: req.params.userId, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get active rides',
        error: error.message
      });
    }
  }

  // Get ride history
  async getRideHistory(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, startDate, endDate } = req.query;

      // Implementation would query MongoDB with pagination
      const skip = (page - 1) * limit;
      
      // Placeholder - implement actual database query
      const history = await rideService.getRideHistory(userId, { skip, limit, startDate, endDate });

      res.json({
        success: true,
        data: history.rides,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: history.total
        }
      });
    } catch (error) {
      logger.error('Get ride history error', { userId: req.params.userId, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get ride history',
        error: error.message
      });
    }
  }

  // Get assigned rides for driver
  async getAssignedRides(req, res) {
    try {
      const { driverId } = req.params;
      const { status } = req.query;

      // Placeholder - implement actual database query
      const rides = await rideService.getAssignedRidesForDriver(driverId, status);

      res.json({
        success: true,
        data: rides
      });
    } catch (error) {
      logger.error('Get assigned rides error', { driverId: req.params.driverId, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get assigned rides',
        error: error.message
      });
    }
  }

  // Driver accept ride
  async acceptRide(req, res) {
    try {
      const { rideId, driverId } = req.body;

      // This would trigger state machine transition
      const result = await rideService.assignDriverToRide(rideId, {
        driverId,
        ...req.body.driverDetails
      });

      logger.info('Driver accepted ride', { rideId, driverId });

      res.json({
        success: true,
        message: 'Ride accepted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Accept ride error', { body: req.body, error: error.message });
      res.status(400).json({
        success: false,
        message: 'Failed to accept ride',
        error: error.message
      });
    }
  }

  // Driver reject ride
  async rejectRide(req, res) {
    try {
      const { rideId, driverId, reason } = req.body;

      // This would update search metadata
      await rideService.rejectRide(rideId, driverId, reason);

      logger.info('Driver rejected ride', { rideId, driverId, reason });

      res.json({
        success: true,
        message: 'Ride rejected'
      });
    } catch (error) {
      logger.error('Reject ride error', { body: req.body, error: error.message });
      res.status(400).json({
        success: false,
        message: 'Failed to reject ride',
        error: error.message
      });
    }
  }

  // Get ride statistics (admin)
  async getRideStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await rideService.getRideStats(
        startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
        endDate ? new Date(endDate) : new Date()
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get ride stats error', { query: req.query, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get ride statistics',
        error: error.message
      });
    }
  }

  // Search rides (admin)
  async searchRides(req, res) {
    try {
      const { query, status, startDate, endDate, page = 1, limit = 50 } = req.query;

      const skip = (page - 1) * limit;
      const results = await rideService.searchRides({
        query,
        status,
        startDate,
        endDate,
        skip,
        limit
      });

      res.json({
        success: true,
        data: results.rides,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: results.total
        }
      });
    } catch (error) {
      logger.error('Search rides error', { query: req.query, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to search rides',
        error: error.message
      });
    }
  }
}

module.exports = new RideController();