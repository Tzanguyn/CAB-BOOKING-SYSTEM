/**
 * Event-Driven Matching Helper
 * Handles communication with Matching Service via event broker
 */

const { createBulkhead } = require('../../../shared/middleware/bulkhead');
const { createDLQManager } = require('../../../shared/utils/dlqManager');

class EventDrivenMatcher {
  constructor(channel, options = {}) {
    this.channel = channel;
    this.matchingTimeoutMs = options.matchingTimeoutMs || 3000;
    this.requestResponseMap = new Map(); // Track pending requests
    this.bulkhead = createBulkhead('event-matching', {
      maxConcurrent: 20,
      maxQueueDepth: 100,
      timeoutMs: this.matchingTimeoutMs
    });
    this.dlqManager = createDLQManager('booking-event-matcher');
  }

  /**
   * Initialize consumer for matching responses
   */
  async initialize() {
    try {
      // Create exclusive response queue for this instance
      await this.channel.assertExchange('matching.responses', 'direct', { durable: true });
      const responseQueue = await this.channel.assertQueue('', { exclusive: true });
      this.responseQueueName = responseQueue.queue;

      // Bind to receive responses
      await this.channel.bindQueue(this.responseQueueName, 'matching.responses', '');

      // Consume responses
      await this.channel.consume(this.responseQueueName, 
        (msg) => this.handleMatchingResponse(msg),
        { noAck: true }
      );

      console.log('✅ Event-Driven Matcher initialized');
    } catch (error) {
      console.error('❌ Error initializing Event-Driven Matcher:', error);
      throw error;
    }
  }

  /**
   * Request matching for drivers via event broker
   */
  async getMatchedDriversViaEvent(pickupLocation, radiusKm = 5) {
    const requestId = `match-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return this.bulkhead.execute(async () => {
      try {
        // Create request data
        const requestData = {
          pickupLocation,
          radiusKm: radiusKm || 5,
          requestId,
          top: 5,
          demandIndex: 1,
          timestamp: new Date().toISOString()
        };

        // Setup response listener with timeout
        const responsePromise = this.waitForResponse(requestId);

        // Publish request
        await this.publishMatchingRequest(requestData);

        // Wait for response with timeout
        const response = await Promise.race([
          responsePromise,
          this.timeoutPromise(requestId)
        ]);

        return response.recommendations || [];

      } catch (error) {
        // Handle timeout or error
        if (error.code === 'MATCHING_TIMEOUT') {
          console.warn(`[EventMatcher] Matching timeout for ${requestId}`);
          // Publish timeout event for observability
          await this.publishMatchingTimeout({
            requestId,
            reason: 'response_timeout'
          });
          return []; // Will trigger fallback in booking service
        }

        // Send to DLQ
        await this.dlqManager.sendToDLQ(
          'matching.request',
          { requestId, pickupLocation, radiusKm },
          error,
          requestId
        );

        throw error;
      }
    }, { requestId });
  }

  /**
   * Publish matching request to event broker
   */
  async publishMatchingRequest(requestData) {
    try {
      const message = Buffer.from(JSON.stringify(requestData));
      
      this.channel.publish(
        'matching',
        'matching.request',
        message,
        { 
          persistent: true, 
          contentType: 'application/json',
          replyTo: this.responseQueueName
        }
      );

      console.log(`[EventMatcher] Request published: ${requestData.requestId}`);
    } catch (error) {
      console.error('[EventMatcher] Error publishing request:', error);
      throw error;
    }
  }

  /**
   * Publish matching timeout event
   */
  async publishMatchingTimeout(timeoutData) {
    try {
      const message = Buffer.from(JSON.stringify(timeoutData));
      
      this.channel.publish(
        'matching',
        'matching.timeout',
        message,
        { 
          persistent: false, 
          contentType: 'application/json'
        }
      );
    } catch (error) {
      console.error('[EventMatcher] Error publishing timeout:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Handle matching response
   */
  handleMatchingResponse(msg) {
    if (!msg) return;

    try {
      const responseData = JSON.parse(msg.content.toString());
      const { requestId } = responseData;

      if (this.requestResponseMap.has(requestId)) {
        const pendingRequest = this.requestResponseMap.get(requestId);
        pendingRequest.resolve(responseData);
        this.requestResponseMap.delete(requestId);
        console.log(`[EventMatcher] Response received: ${requestId}`);
      }
    } catch (error) {
      console.error('[EventMatcher] Error processing response:', error);
    }
  }

  /**
   * Wait for matching response
   */
  waitForResponse(requestId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requestResponseMap.delete(requestId);
        reject(new Error(`No response received for ${requestId}`));
      }, this.matchingTimeoutMs);

      this.requestResponseMap.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout
      });
    });
  }

  /**
   * Create timeout promise
   */
  timeoutPromise(requestId) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        this.requestResponseMap.delete(requestId);
        const error = new Error(`Matching timeout after ${this.matchingTimeoutMs}ms`);
        error.code = 'MATCHING_TIMEOUT';
        error.requestId = requestId;
        reject(error);
      }, this.matchingTimeoutMs);
    });
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      pendingRequests: this.requestResponseMap.size,
      bulkhead: this.bulkhead.getMetrics(),
      dlq: this.dlqManager.getMetrics()
    };
  }

  /**
   * Get DLQ messages
   */
  getDLQMessages() {
    return this.dlqManager.getAllDLQMessages();
  }
}

/**
 * Create and initialize event-driven matcher
 */
async function createEventDrivenMatcher(channel, options = {}) {
  const matcher = new EventDrivenMatcher(channel, options);
  await matcher.initialize();
  return matcher;
}

module.exports = {
  EventDrivenMatcher,
  createEventDrivenMatcher
};
