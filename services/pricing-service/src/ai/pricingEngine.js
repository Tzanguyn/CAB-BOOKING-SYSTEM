const { SimpleLinearRegression, PolynomialRegression } = require('ml-regression');

/**
 * AI-based Dynamic Pricing Engine
 * Uses machine learning to predict optimal pricing based on multiple factors
 */
class PricingEngine {
  constructor() {
    this.models = {
      baseFare: null,
      surgeMultiplier: null,
      demandPredictor: null
    };

    this.isTrained = false;
    this.trainingData = [];
    this.lastTrained = null;
  }

  /**
   * Calculate dynamic pricing for a ride
   * @param {Object} rideData - Ride request data
   * @param {Object} marketData - Current market conditions
   * @returns {Object} Pricing breakdown
   */
  async calculatePrice(rideData, marketData) {
    try {
      const {
        distance,        // in km
        duration,        // in minutes
        vehicleType,     // standard, premium, suv, van
        pickupTime,      // Date object
        pickupLocation,  // {lat, lng}
        destination,     // {lat, lng}
        specialRequests, // array of special requests
        userHistory      // user's ride history stats
      } = rideData;

      // Base fare calculation
      const baseFare = await this.calculateBaseFare(distance, duration, vehicleType);

      // Surge pricing based on demand/supply
      const surgeMultiplier = await this.calculateSurgeMultiplier(marketData);

      // Location-based adjustments
      const locationMultiplier = await this.calculateLocationMultiplier(pickupLocation, destination);

      // Time-based adjustments
      const timeMultiplier = this.calculateTimeMultiplier(pickupTime);

      // User loyalty discount
      const loyaltyDiscount = this.calculateLoyaltyDiscount(userHistory);

      // Special requests premium
      const specialRequestsPremium = this.calculateSpecialRequestsPremium(specialRequests);

      // Weather impact (if available)
      const weatherMultiplier = marketData.weather ? this.calculateWeatherMultiplier(marketData.weather) : 1.0;

      // Traffic congestion impact
      const trafficMultiplier = marketData.trafficLevel ? this.calculateTrafficMultiplier(marketData.trafficLevel) : 1.0;

      // Calculate final price
      let totalFare = baseFare * surgeMultiplier * locationMultiplier * timeMultiplier * weatherMultiplier * trafficMultiplier;
      totalFare += specialRequestsPremium;
      totalFare -= loyaltyDiscount;

      // Ensure minimum fare
      const minFare = this.getMinimumFare(vehicleType);
      totalFare = Math.max(totalFare, minFare);

      // Round to nearest 1000 VND
      totalFare = Math.round(totalFare / 1000) * 1000;

      // Calculate price breakdown
      const breakdown = {
        baseFare: Math.round(baseFare),
        distanceFare: Math.round(baseFare * 0.6), // Approximate
        timeFare: Math.round(baseFare * 0.3),     // Approximate
        waitingFee: 0,
        tolls: 0,
        taxes: Math.round(totalFare * 0.1),
        discount: Math.round(loyaltyDiscount),
        surgeMultiplier: surgeMultiplier,
        locationMultiplier: locationMultiplier,
        timeMultiplier: timeMultiplier,
        weatherMultiplier: weatherMultiplier,
        trafficMultiplier: trafficMultiplier,
        specialRequestsPremium: Math.round(specialRequestsPremium),
        estimatedFare: Math.round(totalFare),
        currency: 'VND',
        estimatedDuration: Math.ceil(duration),
        distance: distance,
        pricingFactors: {
          demandLevel: marketData.demandLevel || 'normal',
          supplyLevel: marketData.supplyLevel || 'normal',
          trafficLevel: marketData.trafficLevel || 'light',
          weatherCondition: marketData.weather || 'clear',
          peakHours: this.isPeakHour(pickupTime),
          weekend: this.isWeekend(pickupTime),
          holiday: marketData.isHoliday || false
        }
      };

      return breakdown;

    } catch (error) {
      console.error('Error calculating price:', error);
      // Fallback to simple calculation
      return this.calculateFallbackPrice(rideData);
    }
  }

  /**
   * Calculate base fare using AI model or fallback
   */
  async calculateBaseFare(distance, duration, vehicleType) {
    if (this.models.baseFare && this.isTrained) {
      try {
        // Use trained model for prediction
        const features = this.extractFeatures(distance, duration, vehicleType);
        const predictedFare = this.models.baseFare.predict(features);
        return Math.max(predictedFare, this.getBaseRate(vehicleType));
      } catch (error) {
        console.warn('AI model prediction failed, using fallback:', error.message);
      }
    }

    // Fallback calculation
    const baseRate = this.getBaseRate(vehicleType);
    const distanceFare = distance * this.getPerKmRate(vehicleType);
    const timeFare = duration * this.getPerMinuteRate(vehicleType);

    return baseRate + distanceFare + timeFare;
  }

  /**
   * Calculate surge multiplier based on market conditions
   */
  async calculateSurgeMultiplier(marketData) {
    const { demandLevel, supplyLevel } = marketData;

    // Simple surge calculation based on demand/supply ratio
    let surgeMultiplier = 1.0;

    // Demand-based surge
    switch (demandLevel) {
      case 'low': surgeMultiplier *= 0.9; break;
      case 'normal': surgeMultiplier *= 1.0; break;
      case 'high': surgeMultiplier *= 1.3; break;
      case 'very_high': surgeMultiplier *= 1.8; break;
      case 'extreme': surgeMultiplier *= 2.5; break;
    }

    // Supply-based surge (inverse relationship)
    switch (supplyLevel) {
      case 'abundant': surgeMultiplier *= 0.95; break;
      case 'normal': surgeMultiplier *= 1.0; break;
      case 'low': surgeMultiplier *= 1.2; break;
      case 'very_low': surgeMultiplier *= 1.5; break;
      case 'scarce': surgeMultiplier *= 2.0; break;
    }

    // Cap surge at reasonable levels
    return Math.min(Math.max(surgeMultiplier, 0.7), 3.0);
  }

  /**
   * Calculate location-based multiplier
   */
  async calculateLocationMultiplier(pickup, destination) {
    // Airport premium
    const airportMultiplier = this.isAirportLocation(pickup) || this.isAirportLocation(destination) ? 1.2 : 1.0;

    // Downtown premium
    const downtownMultiplier = this.isDowntownLocation(pickup) || this.isDowntownLocation(destination) ? 1.1 : 1.0;

    // Long distance discount
    const distance = this.calculateDistance(pickup, destination);
    const longDistanceMultiplier = distance > 50 ? 0.95 : 1.0;

    return airportMultiplier * downtownMultiplier * longDistanceMultiplier;
  }

  /**
   * Calculate time-based multiplier
   */
  calculateTimeMultiplier(pickupTime) {
    let multiplier = 1.0;

    // Peak hours (7-9 AM, 5-7 PM on weekdays)
    if (this.isPeakHour(pickupTime)) {
      multiplier *= 1.2;
    }

    // Late night premium (11 PM - 6 AM)
    if (this.isLateNight(pickupTime)) {
      multiplier *= 1.3;
    }

    // Weekend premium
    if (this.isWeekend(pickupTime)) {
      multiplier *= 1.1;
    }

    return multiplier;
  }

  /**
   * Calculate loyalty discount
   */
  calculateLoyaltyDiscount(userHistory) {
    if (!userHistory || !userHistory.totalRides) return 0;

    const { totalRides, averageRating } = userHistory;
    let discount = 0;

    // Ride frequency discount
    if (totalRides > 100) discount += 5000;      // 5k VND
    else if (totalRides > 50) discount += 3000;  // 3k VND
    else if (totalRides > 20) discount += 1000;  // 1k VND

    // Rating-based discount
    if (averageRating >= 4.8) discount += 2000;  // 2k VND for excellent rating
    else if (averageRating >= 4.5) discount += 1000; // 1k VND

    return discount;
  }

  /**
   * Calculate special requests premium
   */
  calculateSpecialRequestsPremium(specialRequests) {
    if (!specialRequests || specialRequests.length === 0) return 0;

    let premium = 0;

    specialRequests.forEach(request => {
      switch (request) {
        case 'child_seat':
          premium += 5000; // 5k VND
          break;
        case 'extra_luggage':
          premium += 10000; // 10k VND
          break;
        case 'pet_friendly':
          premium += 15000; // 15k VND
          break;
        case 'wheelchair_accessible':
          premium += 20000; // 20k VND
          break;
        case 'meet_and_greet':
          premium += 8000; // 8k VND
          break;
        default:
          premium += 5000; // Default premium
      }
    });

    return premium;
  }

  /**
   * Calculate weather multiplier
   */
  calculateWeatherMultiplier(weatherCondition) {
    switch (weatherCondition.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return 1.0;
      case 'cloudy':
        return 1.05;
      case 'rain':
      case 'drizzle':
        return 1.2;
      case 'heavy_rain':
      case 'storm':
        return 1.5;
      case 'snow':
      case 'fog':
        return 1.8;
      default:
        return 1.0;
    }
  }

  /**
   * Calculate traffic multiplier
   */
  calculateTrafficMultiplier(trafficLevel) {
    switch (trafficLevel.toLowerCase()) {
      case 'light':
        return 1.0;
      case 'moderate':
        return 1.1;
      case 'heavy':
        return 1.3;
      case 'severe':
        return 1.6;
      default:
        return 1.0;
    }
  }

  /**
   * Train AI models with historical data
   */
  async trainModels(historicalData) {
    try {
      console.log('Training AI pricing models...');

      this.trainingData = historicalData;

      // Prepare training data
      const features = [];
      const targets = [];

      historicalData.forEach(record => {
        const featureVector = this.extractFeatures(
          record.distance,
          record.duration,
          record.vehicleType
        );
        features.push(featureVector);
        targets.push(record.actualFare);
      });

      // Train base fare model
      this.models.baseFare = new PolynomialRegression(features, targets, 2);

      // Train surge predictor (simplified)
      this.models.surgeMultiplier = this.trainSurgePredictor(historicalData);

      this.isTrained = true;
      this.lastTrained = new Date();

      console.log('AI models trained successfully');

      return {
        trained: true,
        samples: historicalData.length,
        lastTrained: this.lastTrained
      };

    } catch (error) {
      console.error('Error training AI models:', error);
      throw error;
    }
  }

  /**
   * Extract features for ML model
   */
  extractFeatures(distance, duration, vehicleType) {
    const vehicleMultiplier = this.getVehicleMultiplier(vehicleType);
    return [
      distance,
      duration,
      distance * vehicleMultiplier,
      duration * vehicleMultiplier,
      distance / Math.max(duration, 1), // Average speed
      vehicleMultiplier
    ];
  }

  /**
   * Train surge predictor
   */
  trainSurgePredictor(data) {
    // Simplified surge prediction based on historical patterns
    const surgePatterns = {};

    data.forEach(record => {
      const hour = record.pickupTime.getHours();
      const dayOfWeek = record.pickupTime.getDay();

      const key = `${dayOfWeek}_${hour}`;
      if (!surgePatterns[key]) {
        surgePatterns[key] = [];
      }
      surgePatterns[key].push(record.surgeMultiplier);
    });

    // Calculate average surge by time slot
    const averagedPatterns = {};
    Object.keys(surgePatterns).forEach(key => {
      const values = surgePatterns[key];
      averagedPatterns[key] = values.reduce((a, b) => a + b, 0) / values.length;
    });

    return averagedPatterns;
  }

  /**
   * Get base rate by vehicle type
   */
  getBaseRate(vehicleType) {
    const rates = {
      standard: 12000,   // 12k VND
      premium: 20000,    // 20k VND
      suv: 25000,        // 25k VND
      van: 30000         // 30k VND
    };
    return rates[vehicleType] || rates.standard;
  }

  /**
   * Get per km rate by vehicle type
   */
  getPerKmRate(vehicleType) {
    const rates = {
      standard: 8000,    // 8k VND/km
      premium: 12000,    // 12k VND/km
      suv: 15000,        // 15k VND/km
      van: 18000         // 18k VND/km
    };
    return rates[vehicleType] || rates.standard;
  }

  /**
   * Get per minute rate by vehicle type
   */
  getPerMinuteRate(vehicleType) {
    const rates = {
      standard: 3000,    // 3k VND/min
      premium: 5000,     // 5k VND/min
      suv: 6000,         // 6k VND/min
      van: 7000          // 7k VND/min
    };
    return rates[vehicleType] || rates.standard;
  }

  /**
   * Get vehicle multiplier for AI features
   */
  getVehicleMultiplier(vehicleType) {
    const multipliers = {
      standard: 1.0,
      premium: 1.5,
      suv: 1.8,
      van: 2.0
    };
    return multipliers[vehicleType] || 1.0;
  }

  /**
   * Get minimum fare by vehicle type
   */
  getMinimumFare(vehicleType) {
    const minFares = {
      standard: 15000,   // 15k VND
      premium: 25000,    // 25k VND
      suv: 30000,        // 30k VND
      van: 35000         // 35k VND
    };
    return minFares[vehicleType] || minFares.standard;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Check if location is airport
   */
  isAirportLocation(location) {
    // Simplified airport detection (would use actual airport coordinates)
    // Tan Son Nhat Airport area
    const airportLat = 10.8188;
    const airportLng = 106.6519;
    const distance = this.calculateDistance(location, { lat: airportLat, lng: airportLng });
    return distance <= 5; // Within 5km of airport
  }

  /**
   * Check if location is downtown
   */
  isDowntownLocation(location) {
    // Simplified downtown detection (Ben Thanh Market area)
    const downtownLat = 10.7725;
    const downtownLng = 106.6980;
    const distance = this.calculateDistance(location, { lat: downtownLat, lng: downtownLng });
    return distance <= 3; // Within 3km of downtown
  }

  /**
   * Check if it's peak hour
   */
  isPeakHour(time) {
    const hour = time.getHours();
    const dayOfWeek = time.getDay();

    // Weekdays: 7-9 AM, 5-7 PM
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    }

    return false;
  }

  /**
   * Check if it's late night
   */
  isLateNight(time) {
    const hour = time.getHours();
    return hour >= 23 || hour <= 6;
  }

  /**
   * Check if it's weekend
   */
  isWeekend(time) {
    const dayOfWeek = time.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  /**
   * Fallback price calculation
   */
  calculateFallbackPrice(rideData) {
    const { distance, duration, vehicleType } = rideData;

    const baseRate = this.getBaseRate(vehicleType);
    const distanceFare = distance * this.getPerKmRate(vehicleType);
    const timeFare = duration * this.getPerMinuteRate(vehicleType);

    const totalFare = baseRate + distanceFare + timeFare;

    return {
      baseFare: baseRate,
      distanceFare: distanceFare,
      timeFare: timeFare,
      estimatedFare: Math.round(totalFare),
      currency: 'VND',
      surgeMultiplier: 1.0,
      pricingFactors: {
        method: 'fallback',
        reason: 'ai_unavailable'
      }
    };
  }

  /**
   * Get model status
   */
  getModelStatus() {
    return {
      isTrained: this.isTrained,
      lastTrained: this.lastTrained,
      trainingSamples: this.trainingData.length,
      models: {
        baseFare: this.models.baseFare !== null,
        surgeMultiplier: this.models.surgeMultiplier !== null,
        demandPredictor: this.models.demandPredictor !== null
      }
    };
  }
}

module.exports = PricingEngine;