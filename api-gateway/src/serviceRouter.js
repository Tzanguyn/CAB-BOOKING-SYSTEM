const { createProxyMiddleware } = require('http-proxy-middleware');
const CircuitBreaker = require('circuit-breaker-js');
const axios = require('axios');

/**
 * Service Router and Load Balancer for API Gateway
 * Handles routing, load balancing, and circuit breaking
 */
class ServiceRouter {
  constructor() {
    this.services = new Map();
    this.circuitBreakers = new Map();
    this.healthChecks = new Map();
    this.loadBalancers = new Map();

    this.initializeServices();
    this.startHealthChecks();
  }

  /**
   * Initialize service configurations
   */
  initializeServices() {
    // Service configurations with multiple instances for load balancing
    this.services.set('auth-service', {
      instances: [
        { url: 'http://auth-service:3001', weight: 1, healthy: true },
      ],
      healthCheck: '/auth/health',
      timeout: 30000,
      retries: 3
    });

    this.services.set('user-service', {
      instances: [
        { url: 'http://user-service:3010', weight: 1, healthy: true },
      ],
      healthCheck: '/api/users/health',
      timeout: 30000,
      retries: 3
    });

    this.services.set('driver-service', {
      instances: [
        { url: 'http://driver-service:3004', weight: 1, healthy: true },
      ],
      healthCheck: '/api/drivers/health',
      timeout: 30000,
      retries: 3
    });

    this.services.set('ride-service', {
      instances: [
        { url: 'http://ride-service:3005', weight: 1, healthy: true },
      ],
      healthCheck: '/api/rides/health',
      timeout: 30000,
      retries: 3
    });

    this.services.set('payment-service', {
      instances: [
        { url: 'http://payment-service:3006', weight: 1, healthy: true },
      ],
      healthCheck: '/api/payments/health',
      timeout: 30000,
      retries: 3
    });

    this.services.set('pricing-service', {
      instances: [
        { url: 'http://pricing-service:3008', weight: 1, healthy: true },
      ],
      healthCheck: '/api/pricing/health',
      timeout: 30000,
      retries: 3
    });

    this.services.set('notification-service', {
      instances: [
        { url: 'http://notification-service:3007', weight: 1, healthy: true },
      ],
      healthCheck: '/api/notifications/health',
      timeout: 30000,
      retries: 3
    });

    // Initialize circuit breakers
    for (const [serviceName, config] of this.services) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringPeriod: 30000 // 30 seconds
      }));
    }

    // Initialize load balancers
    for (const [serviceName, config] of this.services) {
      this.loadBalancers.set(serviceName, this.createLoadBalancer(config.instances));
    }
  }

  /**
   * Create load balancer for service instances
   */
  createLoadBalancer(instances) {
    let currentIndex = 0;

    return {
      getNextInstance: () => {
        // Round-robin load balancing
        const healthyInstances = instances.filter(inst => inst.healthy);
        if (healthyInstances.length === 0) return null;

        const instance = healthyInstances[currentIndex % healthyInstances.length];
        currentIndex = (currentIndex + 1) % healthyInstances.length;
        return instance;
      },

      getAllInstances: () => instances,

      markHealthy: (url) => {
        const instance = instances.find(inst => inst.url === url);
        if (instance) instance.healthy = true;
      },

      markUnhealthy: (url) => {
        const instance = instances.find(inst => inst.url === url);
        if (instance) instance.healthy = false;
      }
    };
  }

  /**
   * Start health checks for all services
   */
  startHealthChecks() {
    setInterval(async () => {
      for (const [serviceName, config] of this.services) {
        await this.checkServiceHealth(serviceName, config);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check health of a specific service
   */
  async checkServiceHealth(serviceName, config) {
    const loadBalancer = this.loadBalancers.get(serviceName);
    const instances = loadBalancer.getAllInstances();

    for (const instance of instances) {
      try {
        const healthUrl = `${instance.url}${config.healthCheck}`;
        const response = await axios.get(healthUrl, {
          timeout: 5000,
          validateStatus: (status) => status === 200
        });

        if (response.status === 200) {
          loadBalancer.markHealthy(instance.url);
        }
      } catch (error) {
        console.warn(`Health check failed for ${serviceName} at ${instance.url}:`, error.message);
        loadBalancer.markUnhealthy(instance.url);
      }
    }
  }

  /**
   * Get proxy middleware for a service
   */
  getProxyMiddleware(serviceName, pathRewrite = {}) {
    const config = this.services.get(serviceName);
    const loadBalancer = this.loadBalancers.get(serviceName);
    const circuitBreaker = this.circuitBreakers.get(serviceName);

    if (!config) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    return createProxyMiddleware({
      router: (req) => {
        // Use circuit breaker
        if (circuitBreaker.isOpen()) {
          throw new Error(`Circuit breaker is open for ${serviceName}`);
        }

        // Get next healthy instance
        const instance = loadBalancer.getNextInstance();
        if (!instance) {
          throw new Error(`No healthy instances available for ${serviceName}`);
        }

        return instance.url;
      },

      pathRewrite,

      onError: (err, req, res) => {
        console.error(`Proxy error for ${serviceName}:`, err.message);

        // Trigger circuit breaker
        circuitBreaker.failure();

        // Return error response
        res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName,
          code: 'SERVICE_UNAVAILABLE'
        });
      },

      onProxyReq: (proxyReq, req, res) => {
        // Add gateway headers
        proxyReq.setHeader('X-Gateway', 'cab-booking-gateway');
        proxyReq.setHeader('X-Request-ID', req.requestId || 'unknown');
        proxyReq.setHeader('X-Forwarded-For', req.ip);

        // Forward user context if authenticated
        if (req.user) {
          proxyReq.setHeader('X-User-ID', req.user.userId);
          proxyReq.setHeader('X-User-Role', req.user.role);
        }
      },

      onProxyRes: (proxyRes, req, res) => {
        // Success - reset circuit breaker
        circuitBreaker.success();

        // Add gateway response headers
        res.setHeader('X-Gateway-Processed', 'true');
        res.setHeader('X-Service-Name', serviceName);
      },

      timeout: config.timeout,

      proxyTimeout: config.timeout,

      changeOrigin: true,

      logLevel: 'warn'
    });
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    const status = {};

    for (const [serviceName, config] of this.services) {
      const loadBalancer = this.loadBalancers.get(serviceName);
      const circuitBreaker = this.circuitBreakers.get(serviceName);
      const instances = loadBalancer.getAllInstances();

      status[serviceName] = {
        instances: instances.map(inst => ({
          url: inst.url,
          healthy: inst.healthy,
          weight: inst.weight
        })),
        circuitBreaker: {
          state: circuitBreaker.getState(),
          failures: circuitBreaker.getFailures(),
          successes: circuitBreaker.getSuccesses()
        },
        healthyInstances: instances.filter(inst => inst.healthy).length,
        totalInstances: instances.length
      };
    }

    return status;
  }

  /**
   * Add new service instance for load balancing
   */
  addServiceInstance(serviceName, instanceUrl, weight = 1) {
    const config = this.services.get(serviceName);
    if (!config) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    config.instances.push({
      url: instanceUrl,
      weight,
      healthy: true
    });

    // Reinitialize load balancer
    this.loadBalancers.set(serviceName, this.createLoadBalancer(config.instances));
  }

  /**
   * Remove service instance
   */
  removeServiceInstance(serviceName, instanceUrl) {
    const config = this.services.get(serviceName);
    if (!config) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    config.instances = config.instances.filter(inst => inst.url !== instanceUrl);

    // Reinitialize load balancer
    this.loadBalancers.set(serviceName, this.createLoadBalancer(config.instances));
  }

  /**
   * Force circuit breaker reset
   */
  resetCircuitBreaker(serviceName) {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    const metrics = {
      services: this.getServiceStatus(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    return metrics;
  }
}

module.exports = ServiceRouter;