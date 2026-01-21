const UserService = require('../services/userService');

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  // Initialize service
  async initialize() {
    // RabbitMQ disabled for now
    // await this.userService.initializeRabbitMQ();
  }

  // Profile Management Endpoints

  createProfile = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const profileData = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const profile = await this.userService.createUserProfile(userId, profileData);

      res.status(201).json({
        message: 'Profile created successfully',
        profile
      });

    } catch (error) {
      console.error('Create profile controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  getProfile = async (req, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const profile = await this.userService.getUserProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({ profile });

    } catch (error) {
      console.error('Get profile controller error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  };

  updateProfile = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const updateData = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const profile = await this.userService.updateUserProfile(userId, updateData);

      res.json({
        message: 'Profile updated successfully',
        profile
      });

    } catch (error) {
      console.error('Update profile controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // Ride History Endpoints

  getRideHistory = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 50) {
        return res.status(400).json({
          error: 'Invalid pagination parameters',
          validRange: { page: '>= 1', limit: '1-50' }
        });
      }

      const result = await this.userService.getRideHistory(userId, page, limit);

      res.json(result);

    } catch (error) {
      console.error('Get ride history controller error:', error);
      res.status(500).json({ error: 'Failed to get ride history' });
    }
  };

  getRideDetails = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { rideId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      if (!rideId) {
        return res.status(400).json({ error: 'Ride ID is required' });
      }

      const ride = await this.userService.getRideDetails(userId, rideId);

      res.json({ ride });

    } catch (error) {
      console.error('Get ride details controller error:', error);
      res.status(404).json({ error: error.message });
    }
  };

  rateRide = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { rideId } = req.params;
      const { rating, review } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      if (!rideId) {
        return res.status(400).json({ error: 'Ride ID is required' });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const updatedRide = await this.userService.rateRide(userId, rideId, rating, review);

      res.json({
        message: 'Ride rated successfully',
        ride: updatedRide
      });

    } catch (error) {
      console.error('Rate ride controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // Statistics Endpoints

  getStatistics = async (req, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const stats = await this.userService.getUserStatistics(userId);

      res.json({ statistics: stats });

    } catch (error) {
      console.error('Get statistics controller error:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  };

  getPopularDestinations = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const limit = parseInt(req.query.limit) || 5;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const destinations = await this.userService.getPopularDestinations(userId, limit);

      res.json({ destinations });

    } catch (error) {
      console.error('Get popular destinations controller error:', error);
      res.status(500).json({ error: 'Failed to get popular destinations' });
    }
  };

  // Favorite Locations Endpoints

  getFavoriteLocations = async (req, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const profile = await this.userService.getUserProfile(userId);

      res.json({
        favoriteLocations: profile?.favoriteLocations || []
      });

    } catch (error) {
      console.error('Get favorite locations controller error:', error);
      res.status(500).json({ error: 'Failed to get favorite locations' });
    }
  };

  addFavoriteLocation = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const locationData = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      // Validate location data
      if (!locationData.name || !locationData.address ||
          !locationData.lat || !locationData.lng) {
        return res.status(400).json({
          error: 'Missing required location fields',
          required: ['name', 'address', 'lat', 'lng']
        });
      }

      const favoriteLocations = await this.userService.addFavoriteLocation(userId, locationData);

      res.status(201).json({
        message: 'Favorite location added successfully',
        favoriteLocations
      });

    } catch (error) {
      console.error('Add favorite location controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  removeFavoriteLocation = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { index } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const locationIndex = parseInt(index);
      if (isNaN(locationIndex)) {
        return res.status(400).json({ error: 'Invalid location index' });
      }

      const favoriteLocations = await this.userService.removeFavoriteLocation(userId, locationIndex);

      res.json({
        message: 'Favorite location removed successfully',
        favoriteLocations
      });

    } catch (error) {
      console.error('Remove favorite location controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // Loyalty Program Endpoints

  getLoyaltyStatus = async (req, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const profile = await this.userService.getUserProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({
        loyalty: {
          points: profile.loyaltyPoints,
          tier: profile.loyaltyTier,
          totalRides: profile.totalRides,
          totalSpent: profile.totalSpent
        }
      });

    } catch (error) {
      console.error('Get loyalty status controller error:', error);
      res.status(500).json({ error: 'Failed to get loyalty status' });
    }
  };

  getLoyaltyLeaderboard = async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      if (limit < 1 || limit > 50) {
        return res.status(400).json({ error: 'Limit must be between 1 and 50' });
      }

      const leaderboard = await this.userService.getLoyaltyLeaderboard(limit);

      res.json({ leaderboard });

    } catch (error) {
      console.error('Get loyalty leaderboard controller error:', error);
      res.status(500).json({ error: 'Failed to get loyalty leaderboard' });
    }
  };

  // Profile Completeness Endpoint

  getProfileCompleteness = async (req, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const completeness = await this.userService.getProfileCompleteness(userId);

      res.json(completeness);

    } catch (error) {
      console.error('Get profile completeness controller error:', error);
      res.status(500).json({ error: 'Failed to get profile completeness' });
    }
  };

  // Health check
  healthCheck = async (req, res) => {
    res.json({
      service: 'user-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };

  // Add ride to history (internal API for other services)
  addRideToHistory = async (req, res) => {
    try {
      const rideData = req.body;

      // This should be protected with service-to-service authentication
      const ride = await this.userService.addRideToHistory(rideData);

      res.status(201).json({
        message: 'Ride added to history successfully',
        ride
      });

    } catch (error) {
      console.error('Add ride to history controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // Cleanup
  async cleanup() {
    await this.userService.cleanup();
  }
}

module.exports = UserController;