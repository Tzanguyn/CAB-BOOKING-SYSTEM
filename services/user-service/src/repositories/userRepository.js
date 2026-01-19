const UserProfile = require('../models/UserProfile');
const RideHistory = require('../models/RideHistory');
const { cacheUtils } = require('../config/redis');

class UserRepository {
  // User Profile Operations

  async createUserProfile(userId, profileData) {
    try {
      const profile = new UserProfile({
        userId,
        ...profileData
      });
      const savedProfile = await profile.save();

      // Cache the profile
      await cacheUtils.setUserProfile(userId, savedProfile.toObject());

      return savedProfile.toObject();
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      // Try cache first
      let profile = await cacheUtils.getUserProfile(userId);
      if (profile) {
        return profile;
      }

      // Fetch from database
      const profileDoc = await UserProfile.findOne({ userId });
      if (!profileDoc) {
        return null;
      }

      profile = profileDoc.toObject();

      // Cache the profile
      await cacheUtils.setUserProfile(userId, profile);

      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updateData) {
    try {
      const updatedProfile = await UserProfile.findOneAndUpdate(
        { userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedProfile) {
        return null;
      }

      const profileObj = updatedProfile.toObject();

      // Update cache
      await cacheUtils.setUserProfile(userId, profileObj);

      return profileObj;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async deleteUserProfile(userId) {
    try {
      const result = await UserProfile.findOneAndDelete({ userId });

      // Clear cache
      await cacheUtils.deleteUserProfile(userId);

      return result ? result.toObject() : null;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  }

  // Ride History Operations

  async addRideHistory(rideData) {
    try {
      const ride = new RideHistory(rideData);
      const savedRide = await ride.save();

      // Invalidate user's cache
      await cacheUtils.invalidateUserData(rideData.userId);

      return savedRide.toObject();
    } catch (error) {
      console.error('Error adding ride history:', error);
      throw error;
    }
  }

  async getRideHistory(userId, page = 1, limit = 10) {
    try {
      // Try cache first
      const cacheKey = `ride_history:${userId}:${page}:${limit}`;
      let cachedRides = await cacheUtils.getRideHistory(userId, page, limit);
      if (cachedRides) {
        return cachedRides;
      }

      // Fetch from database
      const skip = (page - 1) * limit;
      const rides = await RideHistory.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await RideHistory.countDocuments({ userId });
      const totalPages = Math.ceil(total / limit);

      const result = {
        rides,
        pagination: {
          currentPage: page,
          totalPages,
          totalRides: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

      // Cache the result
      await cacheUtils.setRideHistory(userId, page, limit, result);

      return result;
    } catch (error) {
      console.error('Error getting ride history:', error);
      throw error;
    }
  }

  async getRideById(userId, rideId) {
    try {
      const ride = await RideHistory.findOne({ userId, rideId }).lean();
      return ride;
    } catch (error) {
      console.error('Error getting ride by ID:', error);
      throw error;
    }
  }

  async updateRideRating(userId, rideId, rating, review) {
    try {
      const updateData = {};
      if (rating !== undefined) updateData.userRating = rating;
      if (review !== undefined) updateData.userReview = review;

      const updatedRide = await RideHistory.findOneAndUpdate(
        { userId, rideId },
        updateData,
        { new: true }
      ).lean();

      if (updatedRide) {
        // Clear user's cache
        await cacheUtils.invalidateUserData(userId);
      }

      return updatedRide;
    } catch (error) {
      console.error('Error updating ride rating:', error);
      throw error;
    }
  }

  // Statistics and Analytics

  async getUserStats(userId) {
    try {
      // Try cache first
      let stats = await cacheUtils.getUserStats(userId);
      if (stats) {
        return stats;
      }

      // Calculate stats from ride history
      const [
        totalRides,
        completedRides,
        cancelledRides,
        totalSpent,
        avgRating,
        favoriteVehicle,
        spendingByMonth
      ] = await Promise.all([
        RideHistory.countDocuments({ userId }),
        RideHistory.countDocuments({ userId, status: 'completed' }),
        RideHistory.countDocuments({ userId, status: 'cancelled' }),
        RideHistory.aggregate([
          { $match: { userId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        RideHistory.aggregate([
          { $match: { userId, userRating: { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$userRating' } } }
        ]),
        RideHistory.aggregate([
          { $match: { userId, status: 'completed' } },
          { $group: { _id: '$vehicle', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 }
        ]),
        RideHistory.aggregate([
          { $match: { userId, status: 'completed' } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              count: { $sum: 1 },
              spent: { $sum: '$totalAmount' }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 }
        ])
      ]);

      stats = {
        totalRides,
        completedRides,
        cancelledRides,
        completionRate: totalRides > 0 ? (completedRides / totalRides * 100).toFixed(1) : 0,
        totalSpent: totalSpent[0]?.total || 0,
        averageRating: avgRating[0]?.avg ? avgRating[0].avg.toFixed(1) : 0,
        favoriteVehicle: favoriteVehicle[0]?._id || null,
        monthlySpending: spendingByMonth
      };

      // Cache stats for 30 minutes
      await cacheUtils.setUserStats(userId, stats);

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getPopularDestinations(userId, limit = 5) {
    try {
      // Try cache first
      let destinations = await cacheUtils.getPopularDestinations(userId);
      if (destinations) {
        return destinations;
      }

      // Calculate from database
      destinations = await RideHistory.getPopularDestinations(userId, limit);

      // Cache for 1 hour
      await cacheUtils.setPopularDestinations(userId, destinations);

      return destinations;
    } catch (error) {
      console.error('Error getting popular destinations:', error);
      throw error;
    }
  }

  async getLoyaltyLeaderboard(limit = 10) {
    try {
      // Try cache first
      let leaderboard = await cacheUtils.getLoyaltyLeaderboard();
      if (leaderboard) {
        return leaderboard;
      }

      // Calculate from database
      leaderboard = await UserProfile.getLoyaltyLeaderboard(limit);

      // Cache for 30 minutes
      await cacheUtils.setLoyaltyLeaderboard(leaderboard);

      return leaderboard;
    } catch (error) {
      console.error('Error getting loyalty leaderboard:', error);
      throw error;
    }
  }

  // Bulk operations for data migration/analytics

  async getUsersByActivity(startDate, endDate, minRides = 1) {
    try {
      return await RideHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$userId',
            rideCount: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            lastRide: { $max: '$createdAt' }
          }
        },
        {
          $match: { rideCount: { $gte: minRides } }
        },
        {
          $lookup: {
            from: 'user_profiles',
            localField: '_id',
            foreignField: 'userId',
            as: 'profile'
          }
        },
        {
          $sort: { rideCount: -1 }
        }
      ]);
    } catch (error) {
      console.error('Error getting users by activity:', error);
      throw error;
    }
  }

  // Profile completeness and engagement

  async getProfileCompleteness(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return 0;

      return profile.profileCompleteness || 0;
    } catch (error) {
      console.error('Error getting profile completeness:', error);
      return 0;
    }
  }

  async updateUserLoyaltyPoints(userId, pointsToAdd) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { userId },
        { $inc: { loyaltyPoints: pointsToAdd } },
        { new: true }
      );

      if (profile) {
        // Clear cache
        await cacheUtils.invalidateUserData(userId);
      }

      return profile ? profile.loyaltyTier : null;
    } catch (error) {
      console.error('Error updating loyalty points:', error);
      throw error;
    }
  }
}

module.exports = UserRepository;