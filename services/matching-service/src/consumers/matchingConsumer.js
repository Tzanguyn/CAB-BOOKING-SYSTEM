/**
 * Matching Service Event Consumer
 * Listens to matching.request events and publishes matching.response
 */

const axios = require('axios');
const { buildTraceHeaders, getCurrentTraceContext } = require('../../../shared/utils/observability');
const { createDLQManager } = require('../../../shared/utils/dlqManager');

class MatchingConsumer {
  constructor(channel, serviceName = 'matching-service') {
    this.channel = channel;
    this.serviceName = serviceName;
    this.dlqManager = createDLQManager(serviceName);
    this.driverServiceUrl = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3007';
    this.pricingServiceUrl = process.env.PRICING_SERVICE_URL || 'http://pricing-service:3001';
  }

  /**
   * Initialize consumer - setup queues and listeners
   */
  async initialize() {
    try {
      // Declare matching request queue
      await this.channel.assertQueue('matching.request.queue', { durable: true });
      await this.channel.assertExchange('matching', 'topic', { durable: true });
      await this.channel.bindQueue('matching.request.queue', 'matching', 'matching.request');

      // Declare matching response exchange (for publishing responses)
      await this.channel.assertExchange('matching.responses', 'direct', { durable: true });

      // Declare DLQ
      await this.channel.assertQueue('matching.dlq', { 
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': 'matching.request.queue'
        }
      });

      // Set QoS (prefetch 5 at a time)
      await this.channel.prefetch(5);

      // Start consuming
      await this.channel.consume('matching.request.queue', 
        (msg) => this.handleMatchingRequest(msg),
        { noAck: false }
      );

      console.log('✅ Matching Consumer initialized');
    } catch (error) {
      console.error('❌ Error initializing Matching Consumer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming matching request
   */
  async handleMatchingRequest(msg) {
    if (!msg) return;

    let eventData;
    let requestId;

    try {
      const content = msg.content.toString();
      eventData = JSON.parse(content);
      requestId = eventData.requestId;

      console.log(`[MatchingConsumer] Processing request: ${requestId}`);

      // Score drivers
      const recommendations = await this.scoreAndRecommendDrivers(eventData);

      // Publish response
      await this.publishResponse({
        requestId,
        bookingId: eventData.bookingId,
        recommendations,
        source: 'ai',
        traceId: eventData.traceId,
        timestamp: new Date().toISOString()
      });

      // Acknowledge message
      this.channel.ack(msg);
      console.log(`[MatchingConsumer] Request completed: ${requestId}`);

    } catch (error) {
      console.error(`[MatchingConsumer] Error processing request:`, error);

      // Send to DLQ
      try {
        await this.dlqManager.sendToDLQ(
          'matching.request',
          eventData,
          error,
          eventData?.traceId
        );

        // Nack and requeue will go to DLQ
        this.channel.nack(msg, false, false);
      } catch (dlqError) {
        console.error('[MatchingConsumer] Failed to send to DLQ:', dlqError);
        this.channel.nack(msg, false, true); // Requeue as last resort
      }
    }
  }

  /**
   * Score drivers and generate recommendations
   */
  async scoreAndRecommendDrivers(requestData) {
    try {
      const { pickupLocation, dropoffLocation, radiusKm = 5, top = 3, demandIndex = 1 } = requestData;

      // Fetch nearby drivers
      const drivers = await this.fetchNearbyDrivers(
        pickupLocation.lat,
        pickupLocation.lng,
        radiusKm
      );

      if (!drivers.length) {
        return [];
      }

      // Fetch pricing context for demand scoring
      const pricingContext = await this.fetchPricingContext(
        pickupLocation,
        dropoffLocation
      );

      // Score each driver
      const scored = drivers.map(driver => ({
        ...driver,
        score: this.scoreDriver(driver, { demandIndex, ...pricingContext })
      }));

      // Sort by score and return top N
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, top)
        .map(driver => ({
          driverId: driver.driverId || driver.driver_id || driver.id,
          score: driver.score,
          status: driver.status,
          rating: driver.rating,
          distance: driver.distance
        }));

    } catch (error) {
      console.error('[MatchingConsumer] Error scoring drivers:', error);
      return []; // Return empty recommendations, will be handled as timeout
    }
  }

  /**
   * Score individual driver
   */
  scoreDriver(driver, context) {
    const distance = Number(driver?.distance ?? driver?.meters ?? driver?.scoreDistance ?? 0);
    const rating = Number(driver?.rating ?? 4.5);
    const isOnline = String(driver?.status || '').toUpperCase() === 'ONLINE';

    const distanceScore = Math.max(0, 100 - (distance * 12));
    const ratingScore = Math.max(0, rating * 18);
    const demandBoost = Number(context?.demandIndex ?? 1) * 4;
    const onlineBonus = isOnline ? 30 : 0;

    return Math.round(distanceScore + ratingScore + demandBoost + onlineBonus);
  }

  /**
   * Fetch nearby drivers
   */
  async fetchNearbyDrivers(lat, lng, radiusKm) {
    try {
      const response = await axios.get(`${this.driverServiceUrl}/api/drivers/nearby`, {
        params: { lat, lng, radius: radiusKm },
        headers: buildTraceHeaders(),
        timeout: 3000
      });

      return Array.isArray(response.data?.drivers) ? response.data.drivers : [];
    } catch (error) {
      console.warn('[MatchingConsumer] Error fetching nearby drivers:', error.message);
      return [];
    }
  }

  /**
   * Fetch pricing context
   */
  async fetchPricingContext(pickupLocation, dropoffLocation) {
    try {
      const response = await axios.post(`${this.pricingServiceUrl}/api/pricing/estimate`, {
        distance_km: 5,
        demand_index: 1,
        supply_index: 1,
        pickupLocation,
        dropoffLocation
      }, {
        headers: buildTraceHeaders(),
        timeout: 2000
      });

      return response.data || {};
    } catch (error) {
      console.warn('[MatchingConsumer] Error fetching pricing context:', error.message);
      return { demandIndex: 1, surge: 1 };
    }
  }

  /**
   * Publish matching response
   */
  async publishResponse(responseData) {
    try {
      const message = Buffer.from(JSON.stringify(responseData));
      
      // Publish to matching.responses exchange with requestId as routing key
      this.channel.publish(
        'matching.responses',
        responseData.requestId,
        message,
        { persistent: true, contentType: 'application/json' }
      );

      console.log(`[MatchingConsumer] Response published: ${responseData.requestId}`);
    } catch (error) {
      console.error('[MatchingConsumer] Error publishing response:', error);
      throw error;
    }
  }

  /**
   * Get DLQ messages
   */
  getDLQMessages() {
    return this.dlqManager.getAllDLQMessages();
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return this.dlqManager.getMetrics();
  }
}

/**
 * Create and initialize matching consumer
 */
async function createMatchingConsumer(channel) {
  const consumer = new MatchingConsumer(channel);
  await consumer.initialize();
  return consumer;
}

module.exports = {
  MatchingConsumer,
  createMatchingConsumer
};
