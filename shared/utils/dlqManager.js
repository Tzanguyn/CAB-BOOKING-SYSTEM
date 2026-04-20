/**
 * Dead Letter Queue (DLQ) Manager
 * Handles failed message retries, exponential backoff, poison detection
 */

const { validateEvent } = require('../events/schemas');

class DLQManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialBackoffMs = options.initialBackoffMs || 1000;
    this.maxBackoffMs = options.maxBackoffMs || 32000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.poisonThreshold = options.poisonThreshold || 3;
    this.serviceName = options.serviceName || 'unknown';
    
    // In-memory DLQ (in production, would use persistent store)
    this.dlqMessages = new Map();
    this.poisonMessages = new Set();
    
    this.metrics = {
      dlqMessages: 0,
      poisonMessages: 0,
      retriedMessages: 0,
      discardedMessages: 0
    };
  }

  /**
   * Send message to DLQ
   * @param {string} originalEventType - Original event type
   * @param {object} originalEvent - Original event data
   * @param {Error} error - Error that caused failure
   * @param {string} traceId - Trace ID for correlation
   */
  async sendToDLQ(originalEventType, originalEvent, error, traceId) {
    const dlqId = `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const dlqMessage = {
      dlqId,
      originalEventType,
      originalEvent,
      error: error.message || String(error),
      failureCount: 1,
      firstFailureTime: new Date().toISOString(),
      lastFailureTime: new Date().toISOString(),
      nextRetryTime: this._calculateNextRetryTime(1),
      backoffDelayMs: this.initialBackoffMs,
      traceId,
      errors: [error.message || String(error)]
    };

    this.dlqMessages.set(dlqId, dlqMessage);
    this.metrics.dlqMessages++;

    console.warn(`[DLQ] Message sent to DLQ: ${dlqId}`, {
      eventType: originalEventType,
      error: error.message,
      traceId
    });

    return dlqId;
  }

  /**
   * Attempt to retry DLQ message
   * @param {string} dlqId - DLQ message ID
   * @param {Function} retryFn - Function to retry
   */
  async retryDLQMessage(dlqId, retryFn) {
    const dlqMessage = this.dlqMessages.get(dlqId);
    if (!dlqMessage) {
      throw new Error(`DLQ message not found: ${dlqId}`);
    }

    // Check if should retry based on scheduled time
    if (new Date() < new Date(dlqMessage.nextRetryTime)) {
      throw new Error(`Message not ready for retry. Next retry: ${dlqMessage.nextRetryTime}`);
    }

    try {
      const result = await retryFn(dlqMessage.originalEvent);
      
      this.dlqMessages.delete(dlqId);
      this.metrics.dlqMessages--;
      this.metrics.retriedMessages++;
      
      console.info(`[DLQ] Message retried successfully: ${dlqId}`);
      return { success: true, result };
    } catch (error) {
      dlqMessage.failureCount++;
      dlqMessage.lastFailureTime = new Date().toISOString();
      dlqMessage.errors.push(error.message || String(error));
      
      // Keep only last 5 errors
      dlqMessage.errors = dlqMessage.errors.slice(-5);

      // Check if message is poison
      if (dlqMessage.failureCount >= this.poisonThreshold) {
        this.poisonMessages.add(dlqId);
        this.metrics.poisonMessages++;
        
        console.error(`[DLQ] POISON MESSAGE DETECTED: ${dlqId}`, {
          eventType: dlqMessage.originalEventType,
          failureCount: dlqMessage.failureCount,
          errors: dlqMessage.errors
        });

        return { 
          success: false, 
          poison: true, 
          error: error.message,
          suggestedAction: 'manual_review_required'
        };
      }

      // Schedule next retry
      const nextBackoff = Math.min(
        dlqMessage.backoffDelayMs * this.backoffMultiplier,
        this.maxBackoffMs
      );
      
      dlqMessage.backoffDelayMs = nextBackoff;
      dlqMessage.nextRetryTime = this._calculateNextRetryTime(nextBackoff);

      console.warn(`[DLQ] Retry failed, scheduling next attempt: ${dlqId}`, {
        failureCount: dlqMessage.failureCount,
        nextRetry: dlqMessage.nextRetryTime
      });

      return { 
        success: false, 
        failureCount: dlqMessage.failureCount,
        nextRetryTime: dlqMessage.nextRetryTime
      };
    }
  }

  /**
   * Get DLQ message
   */
  getDLQMessage(dlqId) {
    return this.dlqMessages.get(dlqId) || null;
  }

  /**
   * Get all DLQ messages
   */
  getAllDLQMessages() {
    return Array.from(this.dlqMessages.values());
  }

  /**
   * Get all poison messages
   */
  getPoisonMessages() {
    return Array.from(this.poisonMessages).map(id => this.dlqMessages.get(id));
  }

  /**
   * Manually purge DLQ message
   */
  purgeDLQMessage(dlqId) {
    const dlqMessage = this.dlqMessages.get(dlqId);
    if (!dlqMessage) {
      throw new Error(`DLQ message not found: ${dlqId}`);
    }

    this.dlqMessages.delete(dlqId);
    this.poisonMessages.delete(dlqId);
    this.metrics.dlqMessages--;
    this.metrics.discardedMessages++;

    console.info(`[DLQ] Message purged: ${dlqId}`);
    return true;
  }

  /**
   * Calculate next retry time based on backoff
   */
  _calculateNextRetryTime(backoffMs) {
    return new Date(Date.now() + backoffMs).toISOString();
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.dlqMessages.size
    };
  }

  /**
   * Get health status
   */
  getHealth() {
    return {
      status: this.poisonMessages.size > 0 ? 'warning' : 'healthy',
      dlqQueueSize: this.dlqMessages.size,
      poisonMessages: this.poisonMessages.size,
      metrics: this.getMetrics()
    };
  }

  /**
   * Reset all DLQ messages (for testing)
   */
  reset() {
    this.dlqMessages.clear();
    this.poisonMessages.clear();
    this.metrics = {
      dlqMessages: 0,
      poisonMessages: 0,
      retriedMessages: 0,
      discardedMessages: 0
    };
  }
}

/**
 * Create DLQ manager
 */
function createDLQManager(serviceName, options = {}) {
  return new DLQManager({
    serviceName,
    ...options
  });
}

module.exports = {
  DLQManager,
  createDLQManager
};
