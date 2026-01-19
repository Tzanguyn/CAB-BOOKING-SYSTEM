const UserRepository = require('../repositories/userRepository');
const { RabbitMQClient, EXCHANGES, EVENT_TYPES } = require('../../../shared');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.rabbitMQClient = null;
  }

  // Initialize RabbitMQ
  async initializeRabbitMQ() {
    try {
      this.rabbitMQClient = new RabbitMQClient();
      await this.rabbitMQClient.connect();
      console.log('✅ User Service: RabbitMQ connected');
    } catch (error) {
      console.error('❌ User Service: RabbitMQ connection failed:', error);
    }
  }

  // Profile Management

  async createUserProfile(userId, profileData) {
    try {
      // Validate required fields
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check if profile already exists
      const existingProfile = await this.userRepository.getUserProfile(userId);
      if (existingProfile) {
        throw new Error('User profile already exists');
      }

      const profile = await this.userRepository.createUserProfile(userId, profileData);

      // Publish profile created event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.profile_created',
          {
            type: 'UserProfileCreated',
            userId,
            profileCompleteness: profile.profileCompleteness,
            timestamp: new Date().toISOString()
          }
        );
      }

      return profile;
    } catch (error) {
      console.error('Create profile error:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const profile = await this.userRepository.getUserProfile(userId);
      return profile;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updateData) {
    try {
      const updatedProfile = await this.userRepository.updateUserProfile(userId, updateData);

      if (!updatedProfile) {
        throw new Error('User profile not found');
      }

      // Publish profile updated event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.profile_updated',
          {
            type: 'UserProfileUpdated',
            userId,
            changes: Object.keys(updateData),
            profileCompleteness: updatedProfile.profileCompleteness,
            timestamp: new Date().toISOString()
          }
        );
      }

      return updatedProfile;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Ride History Management

  async addRideToHistory(rideData) {
    try {
      // Validate required fields
      const required = ['userId', 'rideId', 'status', 'totalAmount'];
      for (const field of required) {
        if (!rideData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      const ride = await this.userRepository.addRideHistory(rideData);

      // Update user profile stats if ride is completed
      if (rideData.status === 'completed' && rideData.totalAmount) {
        try {
          await this.updateUserProfileStats(rideData.userId, rideData.totalAmount);
        } catch (error) {
          console.warn('Failed to update user stats:', error);
        }
      }

      // Publish ride added to history event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.ride_history_added',
          {
            type: 'UserRideHistoryAdded',
            userId: rideData.userId,
            rideId: rideData.rideId,
            status: rideData.status,
            amount: rideData.totalAmount,
            timestamp: new Date().toISOString()
          }
        );
      }

      return ride;
    } catch (error) {
      console.error('Add ride to history error:', error);
      throw error;
    }
  }

  async getRideHistory(userId, page = 1, limit = 10) {
    try {
      const result = await this.userRepository.getRideHistory(userId, page, limit);
      return result;
    } catch (error) {
      console.error('Get ride history error:', error);
      throw error;
    }
  }

  async getRideDetails(userId, rideId) {
    try {
      const ride = await this.userRepository.getRideById(userId, rideId);

      if (!ride) {
        throw new Error('Ride not found');
      }

      return ride;
    } catch (error) {
      console.error('Get ride details error:', error);
      throw error;
    }
  }

  async rateRide(userId, rideId, rating, review) {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const updatedRide = await this.userRepository.updateRideRating(userId, rideId, rating, review);

      if (!updatedRide) {
        throw new Error('Ride not found or not owned by user');
      }

      // Publish ride rated event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.ride_rated',
          {
            type: 'UserRideRated',
            userId,
            rideId,
            rating,
            review: review || null,
            timestamp: new Date().toISOString()
          }
        );
      }

      return updatedRide;
    } catch (error) {
      console.error('Rate ride error:', error);
      throw error;
    }
  }

  // Statistics and Analytics

  async getUserStatistics(userId) {
    try {
      const stats = await this.userRepository.getUserStats(userId);
      return stats;
    } catch (error) {
      console.error('Get user statistics error:', error);
      throw error;
    }
  }

  async getPopularDestinations(userId, limit = 5) {
    try {
      const destinations = await this.userRepository.getPopularDestinations(userId, limit);
      return destinations;
    } catch (error) {
      console.error('Get popular destinations error:', error);
      throw error;
    }
  }

  async getLoyaltyLeaderboard(limit = 10) {
    try {
      const leaderboard = await this.userRepository.getLoyaltyLeaderboard(limit);
      return leaderboard;
    } catch (error) {
      console.error('Get loyalty leaderboard error:', error);
      throw error;
    }
  }

  // Favorite Locations Management

  async addFavoriteLocation(userId, locationData) {
    try {
      const profile = await this.userRepository.getUserProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      const newLocation = {
        name: locationData.name,
        address: locationData.address,
        coordinates: {
          lat: locationData.lat,
          lng: locationData.lng
        },
        type: locationData.type || 'other'
      };

      const favoriteLocations = profile.favoriteLocations || [];
      favoriteLocations.push(newLocation);

      const updatedProfile = await this.userRepository.updateUserProfile(userId, {
        favoriteLocations
      });

      return updatedProfile.favoriteLocations;
    } catch (error) {
      console.error('Add favorite location error:', error);
      throw error;
    }
  }

  async removeFavoriteLocation(userId, locationIndex) {
    try {
      const profile = await this.userRepository.getUserProfile(userId);
      if (!profile || !profile.favoriteLocations) {
        throw new Error('User profile or favorite locations not found');
      }

      if (locationIndex < 0 || locationIndex >= profile.favoriteLocations.length) {
        throw new Error('Invalid location index');
      }

      const favoriteLocations = [...profile.favoriteLocations];
      favoriteLocations.splice(locationIndex, 1);

      const updatedProfile = await this.userRepository.updateUserProfile(userId, {
        favoriteLocations
      });

      return updatedProfile.favoriteLocations;
    } catch (error) {
      console.error('Remove favorite location error:', error);
      throw error;
    }
  }

  // Loyalty Program

  async awardLoyaltyPoints(userId, points, reason) {
    try {
      const newTier = await this.userRepository.updateUserLoyaltyPoints(userId, points);

      // Publish loyalty points awarded event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.loyalty_points_awarded',
          {
            type: 'UserLoyaltyPointsAwarded',
            userId,
            points,
            reason,
            newTier,
            timestamp: new Date().toISOString()
          }
        );
      }

      return { newTier, pointsAwarded: points };
    } catch (error) {
      console.error('Award loyalty points error:', error);
      throw error;
    }
  }

  // Profile Completeness

  async getProfileCompleteness(userId) {
    try {
      const completeness = await this.userRepository.getProfileCompleteness(userId);
      return {
        completeness,
        status: completeness >= 80 ? 'complete' : completeness >= 50 ? 'good' : 'incomplete'
      };
    } catch (error) {
      console.error('Get profile completeness error:', error);
      throw error;
    }
  }

  // Private helper methods

  async updateUserProfileStats(userId, rideAmount) {
    try {
      const profile = await this.userRepository.getUserProfile(userId);
      if (!profile) return;

      // Update ride count and spending
      await profile.updateRideStats(rideAmount);
    } catch (error) {
      console.error('Update user profile stats error:', error);
      // Don't throw - this is not critical
    }
  }

  // Event handling (consumed events)

  async handleRideCompleted(event) {
    try {
      // Add ride to user's history
      const rideData = {
        userId: event.userId,
        rideId: event.rideId,
        driverId: event.driverId,
        driverName: event.driverName,
        vehicle: event.vehicleType,
        licensePlate: event.licensePlate,
        pickup: event.pickup,
        destination: event.destination,
        status: 'completed',
        requestedAt: new Date(event.requestedAt),
        acceptedAt: event.acceptedAt ? new Date(event.acceptedAt) : null,
        startedAt: event.startedAt ? new Date(event.startedAt) : null,
        completedAt: new Date(event.completedAt),
        baseFare: event.baseFare,
        distance: event.distance,
        duration: event.duration,
        distanceFare: event.distanceFare,
        timeFare: event.timeFare,
        tolls: event.tolls,
        taxes: event.taxes,
        discount: event.discount,
        totalAmount: event.totalAmount,
        currency: event.currency,
        paymentMethod: event.paymentMethod,
        route: event.route
      };

      await this.addRideToHistory(rideData);

      // Award loyalty points
      await this.awardLoyaltyPoints(event.userId, Math.floor(event.totalAmount / 100), 'ride_completed');

    } catch (error) {
      console.error('Handle ride completed error:', error);
    }
  }

  async handlePaymentCompleted(event) {
    try {
      // Could update payment method preferences
      console.log(`Payment completed for user ${event.userId}, amount: ${event.amount}`);
    } catch (error) {
      console.error('Handle payment completed error:', error);
    }
  }

  // Cleanup
  async cleanup() {
    if (this.rabbitMQClient) {
      await this.rabbitMQClient.disconnect();
    }
  }
}

module.exports = UserService;