const { performance } = require('perf_hooks');

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percentile(values, p) {
  if (!values.length) return NaN;

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function createSloMonitor(options = {}) {
  const serviceName = options.serviceName || 'cab-service';
  const maxWindowSize = Math.max(20, Number(options.maxWindowSize || 200));
  const latencyThresholdMs = Math.max(1, Number(options.latencyThresholdMs || 500));
  const successRateThreshold = Math.min(1, Math.max(0, Number(options.successRateThreshold || 0.99)));

  const recentLatencies = [];
  const recentStatuses = [];
  const recentPaths = [];

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalLatencyMs = 0;

  function recordSample(sample) {
    recentLatencies.push(sample.durationMs);
    recentStatuses.push(sample.statusCode);
    recentPaths.push(sample.path);

    if (recentLatencies.length > maxWindowSize) {
      recentLatencies.shift();
      recentStatuses.shift();
      recentPaths.shift();
    }
  }

  const middleware = (req, res, next) => {
    const startedAt = performance.now();

    res.on('finish', () => {
      const durationMs = performance.now() - startedAt;
      const statusCode = Number(res.statusCode || 0);
      const path = req.route?.path || req.originalUrl || req.url || '/';

      totalRequests += 1;
      totalLatencyMs += durationMs;

      if (statusCode >= 200 && statusCode < 500) {
        successfulRequests += 1;
      } else {
        failedRequests += 1;
      }

      recordSample({ durationMs, statusCode, path });
    });

    next();
  };

  function snapshot() {
    const p95 = percentile(recentLatencies, 95);
    const p99 = percentile(recentLatencies, 99);
    const averageLatencyMs = totalRequests > 0 ? totalLatencyMs / totalRequests : 0;
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;

    return {
      serviceName,
      totalRequests,
      successfulRequests,
      failedRequests,
      recentWindowSize: recentLatencies.length,
      averageLatencyMs: Number(averageLatencyMs.toFixed(3)),
      p95LatencyMs: Number.isFinite(p95) ? Number(p95.toFixed(3)) : null,
      p99LatencyMs: Number.isFinite(p99) ? Number(p99.toFixed(3)) : null,
      successRate: Number(successRate.toFixed(4)),
      latencyThresholdMs,
      successRateThreshold,
      latencyCompliant: Number.isFinite(p95) ? p95 <= latencyThresholdMs : true,
      successRateCompliant: successRate >= successRateThreshold,
      healthy: (Number.isFinite(p95) ? p95 <= latencyThresholdMs : true) && successRate >= successRateThreshold
    };
  }

  function metricsHandler(req, res) {
    const current = snapshot();
    const serviceLabel = String(serviceName).replace(/"/g, '\\"');

    const lines = [
      '# HELP cab_service_slo_requests_total Total requests considered for SLO tracking',
      '# TYPE cab_service_slo_requests_total counter',
      `cab_service_slo_requests_total{service="${serviceLabel}"} ${current.totalRequests}`,
      '# HELP cab_service_slo_success_rate Success rate ratio for the current request window',
      '# TYPE cab_service_slo_success_rate gauge',
      `cab_service_slo_success_rate{service="${serviceLabel}"} ${current.successRate}`,
      '# HELP cab_service_slo_latency_p95_ms P95 latency for the current request window',
      '# TYPE cab_service_slo_latency_p95_ms gauge',
      `cab_service_slo_latency_p95_ms{service="${serviceLabel}"} ${current.p95LatencyMs ?? 0}`,
      '# HELP cab_service_slo_latency_p99_ms P99 latency for the current request window',
      '# TYPE cab_service_slo_latency_p99_ms gauge',
      `cab_service_slo_latency_p99_ms{service="${serviceLabel}"} ${current.p99LatencyMs ?? 0}`,
      '# HELP cab_service_slo_latency_threshold_ms Configured latency threshold for compliance',
      '# TYPE cab_service_slo_latency_threshold_ms gauge',
      `cab_service_slo_latency_threshold_ms{service="${serviceLabel}"} ${current.latencyThresholdMs}`,
      '# HELP cab_service_slo_success_threshold Configured success-rate threshold for compliance',
      '# TYPE cab_service_slo_success_threshold gauge',
      `cab_service_slo_success_threshold{service="${serviceLabel}"} ${current.successRateThreshold}`,
      '# HELP cab_service_slo_healthy Whether the current window meets latency and success targets',
      '# TYPE cab_service_slo_healthy gauge',
      `cab_service_slo_healthy{service="${serviceLabel}"} ${current.healthy ? 1 : 0}`
    ];

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n') + '\n');
  }

  function sloHandler(req, res) {
    res.json(snapshot());
  }

  return {
    middleware,
    metricsHandler,
    sloHandler,
    snapshot
  };
}

module.exports = {
  createSloMonitor,
  percentile,
  safeNumber
};