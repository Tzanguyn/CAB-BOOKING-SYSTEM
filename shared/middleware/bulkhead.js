/**
 * Bulkhead Pattern Implementation
 * Limits concurrent requests, prevents cascading failures
 * Uses queue + thread pool model
 */

const EventEmitter = require('events');

class BulkheadManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxConcurrent = options.maxConcurrent || 10;
    this.maxQueueDepth = options.maxQueueDepth || 50;
    this.timeoutMs = options.timeoutMs || 3000;
    this.serviceName = options.serviceName || 'unknown';
    
    this.activeRequests = 0;
    this.queuedRequests = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timedOutRequests: 0,
      rejectedRequests: 0,
      maxQueueDepthSeen: 0
    };
  }

  /**
   * Execute function with bulkhead protection
   * @param {Function} fn - Async function to execute
   * @param {object} context - Execution context (for logging)
   * @returns {Promise} Result from fn or rejection
   */
  async execute(fn, context = {}) {
    const requestId = context.requestId || `bulk-${Date.now()}-${Math.random()}`;
    
    this.metrics.totalRequests++;

    // Check if queue is full
    if (this.queuedRequests.length >= this.maxQueueDepth) {
      this.metrics.rejectedRequests++;
      const error = new Error(`Bulkhead queue full (${this.maxQueueDepth})`);
      error.code = 'BULKHEAD_QUEUE_FULL';
      error.serviceName = this.serviceName;
      
      this.emit('request_rejected', { requestId, ...context });
      throw error;
    }

    // If below max concurrent, execute immediately
    if (this.activeRequests < this.maxConcurrent) {
      return this._executeWithTimeout(fn, requestId, context);
    }

    // Otherwise queue the request
    return new Promise((resolve, reject) => {
      const queueItem = {
        fn,
        context,
        requestId,
        resolve,
        reject,
        enqueuedAt: Date.now()
      };

      this.queuedRequests.push(queueItem);
      this.metrics.maxQueueDepthSeen = Math.max(
        this.metrics.maxQueueDepthSeen,
        this.queuedRequests.length
      );

      this.emit('request_queued', { requestId, queueDepth: this.queuedRequests.length });
    });
  }

  /**
   * Execute with timeout protection
   */
  async _executeWithTimeout(fn, requestId, context) {
    this.activeRequests++;
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Bulkhead timeout (${this.timeoutMs}ms)`);
        error.code = 'BULKHEAD_TIMEOUT';
        reject(error);
      }, this.timeoutMs);
    });

    try {
      this.emit('request_started', { requestId, activeRequests: this.activeRequests });
      
      const result = await Promise.race([fn(), timeoutPromise]);
      
      this.metrics.successfulRequests++;
      this.emit('request_completed', { requestId, status: 'success' });
      
      return result;
    } catch (error) {
      if (error.code === 'BULKHEAD_TIMEOUT') {
        this.metrics.timedOutRequests++;
        this.emit('request_timeout', { requestId, timeoutMs: this.timeoutMs });
      } else {
        this.metrics.failedRequests++;
        this.emit('request_failed', { requestId, error: error.message });
      }
      
      throw error;
    } finally {
      this.activeRequests--;
      
      // Process queued request if any
      if (this.queuedRequests.length > 0) {
        const nextItem = this.queuedRequests.shift();
        this._executeWithTimeout(nextItem.fn, nextItem.requestId, nextItem.context)
          .then(nextItem.resolve)
          .catch(nextItem.reject);
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeRequests: this.activeRequests,
      queuedRequests: this.queuedRequests.length,
      successRate: this.metrics.totalRequests > 0
        ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timedOutRequests: 0,
      rejectedRequests: 0,
      maxQueueDepthSeen: 0
    };
  }

  /**
   * Get health status
   */
  getHealth() {
    const criticalQueue = this.queuedRequests.length > this.maxQueueDepth * 0.8;
    const highFailureRate = this.metrics.totalRequests > 0 &&
      ((this.metrics.failedRequests + this.metrics.timedOutRequests) / this.metrics.totalRequests) > 0.2;

    return {
      status: criticalQueue || highFailureRate ? 'degraded' : 'healthy',
      activeRequests: this.activeRequests,
      queuedRequests: this.queuedRequests.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueDepth: this.maxQueueDepth,
      metrics: this.getMetrics()
    };
  }
}

/**
 * Create bulkhead manager for a service
 */
function createBulkhead(serviceName, options = {}) {
  return new BulkheadManager({
    serviceName,
    ...options
  });
}

/**
 * Express middleware for bulkhead protection
 */
function createBulkheadMiddleware(bulkhead) {
  return (req, res, next) => {
    req.bulkhead = bulkhead;
    
    // Add bulkhead health to request
    req.bulkheadHealth = () => bulkhead.getHealth();
    
    next();
  };
}

module.exports = {
  BulkheadManager,
  createBulkhead,
  createBulkheadMiddleware
};
