const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

const traceContextStore = new AsyncLocalStorage();

function generateRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

function normalizeTraceFlags(flags) {
  if (typeof flags !== 'string') {
    return '01';
  }

  return /^[0-9a-f]{2}$/i.test(flags) ? flags.toLowerCase() : '01';
}

function parseTraceparent(headerValue) {
  if (typeof headerValue !== 'string') {
    return null;
  }

  const parts = headerValue.trim().split('-');
  if (parts.length !== 4) {
    return null;
  }

  const [version, traceId, spanId, flags] = parts;
  if (!/^[0-9a-f]{2}$/i.test(version) || !/^[0-9a-f]{32}$/i.test(traceId) || !/^[0-9a-f]{16}$/i.test(spanId)) {
    return null;
  }

  return {
    version: version.toLowerCase(),
    traceId: traceId.toLowerCase(),
    spanId: spanId.toLowerCase(),
    traceFlags: normalizeTraceFlags(flags)
  };
}

function formatTraceparent(traceId, spanId, traceFlags = '01') {
  return `00-${traceId}-${spanId}-${normalizeTraceFlags(traceFlags)}`;
}

function getCurrentTraceContext() {
  return traceContextStore.getStore() || null;
}

function buildTraceHeaders(extraHeaders = {}, context = null) {
  const currentContext = context || getCurrentTraceContext();

  if (!currentContext) {
    return { ...extraHeaders };
  }

  const childSpanId = generateSpanId();

  return {
    ...extraHeaders,
    'X-Request-ID': currentContext.requestId,
    'X-Trace-ID': currentContext.traceId,
    'X-Span-ID': childSpanId,
    traceparent: formatTraceparent(currentContext.traceId, childSpanId, currentContext.traceFlags)
  };
}

function escapeLabelValue(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function resolveRouteLabel(req) {
  const routePath = req.route?.path;
  const baseUrl = req.baseUrl || '';

  if (routePath) {
    return `${baseUrl}${routePath}` || '/';
  }

  const originalUrl = req.originalUrl || req.url || '/';
  return originalUrl.split('?')[0] || '/';
}

function createSecurityHeadersMiddleware(options = {}) {
  const serviceName = options.serviceName || 'cab-booking-service';

  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Service-Name', serviceName);

    next();
  };
}

function createRequestContextMiddleware(options = {}) {
  const serviceName = options.serviceName || 'cab-booking-service';

  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || generateRequestId();
    const incomingTraceparent = parseTraceparent(req.headers.traceparent || req.headers['traceparent']);
    const traceId = req.headers['x-trace-id'] || incomingTraceparent?.traceId || generateTraceId();
    const spanId = generateSpanId();
    const traceFlags = normalizeTraceFlags(incomingTraceparent?.traceFlags);
    const traceparent = formatTraceparent(traceId, spanId, traceFlags);
    const context = {
      requestId,
      traceId,
      spanId,
      parentSpanId: incomingTraceparent?.spanId || null,
      traceFlags,
      traceparent,
      serviceName
    };

    req.requestId = requestId;
    req.traceId = traceId;
    req.spanId = spanId;
    req.parentSpanId = context.parentSpanId;
    req.traceparent = traceparent;
    req.serviceName = serviceName;
    req.traceContext = context;

    req.headers['x-request-id'] = requestId;
    req.headers['x-correlation-id'] = requestId;
    req.headers['x-trace-id'] = traceId;
    req.headers.traceparent = traceparent;

    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Trace-ID', traceId);
    res.setHeader('traceparent', traceparent);
    res.setHeader('X-Service-Name', serviceName);

    traceContextStore.run(context, next);
  };
}

function createMetricsCollector(options = {}) {
  const serviceName = options.serviceName || 'cab-booking-service';
  const routeCounters = new Map();
  const statusCounters = new Map();
  const methodCounters = new Map();
  let totalRequests = 0;
  let inflightRequests = 0;
  let totalDurationMs = 0;
  let completedRequests = 0;

  const middleware = (req, res, next) => {
    totalRequests += 1;
    inflightRequests += 1;
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      inflightRequests = Math.max(0, inflightRequests - 1);

      const routeLabel = resolveRouteLabel(req);
      const methodLabel = String(req.method || 'GET').toUpperCase();
      const statusLabel = String(res.statusCode || 0);
      const routeKey = `${methodLabel}\u0000${routeLabel}\u0000${statusLabel}`;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      routeCounters.set(routeKey, (routeCounters.get(routeKey) || 0) + 1);
      methodCounters.set(methodLabel, (methodCounters.get(methodLabel) || 0) + 1);
      statusCounters.set(statusLabel, (statusCounters.get(statusLabel) || 0) + 1);
      totalDurationMs += durationMs;
      completedRequests += 1;
    });

    next();
  };

  const metricsHandler = (req, res) => {
    const serviceLabel = escapeLabelValue(serviceName);
    const averageDuration = completedRequests > 0 ? totalDurationMs / completedRequests : 0;
    const lines = [
      '# HELP cab_service_http_requests_total Total HTTP requests handled',
      '# TYPE cab_service_http_requests_total counter',
      `cab_service_http_requests_total{service="${serviceLabel}"} ${totalRequests}`,
      '# HELP cab_service_http_inflight_requests Current in-flight requests',
      '# TYPE cab_service_http_inflight_requests gauge',
      `cab_service_http_inflight_requests{service="${serviceLabel}"} ${inflightRequests}`,
      '# HELP cab_service_http_request_duration_ms Total request duration in milliseconds',
      '# TYPE cab_service_http_request_duration_ms summary',
      `cab_service_http_request_duration_ms_sum{service="${serviceLabel}"} ${totalDurationMs.toFixed(3)}`,
      `cab_service_http_request_duration_ms_count{service="${serviceLabel}"} ${completedRequests}`,
      `cab_service_http_request_duration_ms_avg{service="${serviceLabel}"} ${averageDuration.toFixed(3)}`,
      '# HELP cab_service_http_requests_by_method_total Requests grouped by HTTP method',
      '# TYPE cab_service_http_requests_by_method_total counter'
    ];

    for (const [method, value] of methodCounters.entries()) {
      lines.push(`cab_service_http_requests_by_method_total{service="${serviceLabel}",method="${escapeLabelValue(method)}"} ${value}`);
    }

    lines.push('# HELP cab_service_http_requests_by_status_total Requests grouped by HTTP status code');
    lines.push('# TYPE cab_service_http_requests_by_status_total counter');

    for (const [status, value] of statusCounters.entries()) {
      lines.push(`cab_service_http_requests_by_status_total{service="${serviceLabel}",status="${escapeLabelValue(status)}"} ${value}`);
    }

    lines.push('# HELP cab_service_http_requests_by_route_total Requests grouped by method, route and status');
    lines.push('# TYPE cab_service_http_requests_by_route_total counter');

    for (const [key, value] of routeCounters.entries()) {
      const [method, route, status] = key.split('\u0000');
      lines.push(
        `cab_service_http_requests_by_route_total{service="${serviceLabel}",method="${escapeLabelValue(method)}",route="${escapeLabelValue(route)}",status="${escapeLabelValue(status)}"} ${value}`
      );
    }

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n') + '\n');
  };

  return {
    middleware,
    metricsHandler,
    snapshot: () => ({
      serviceName,
      totalRequests,
      inflightRequests,
      completedRequests,
      totalDurationMs,
      averageDurationMs: completedRequests > 0 ? totalDurationMs / completedRequests : 0,
      routeCounters: Array.from(routeCounters.entries()),
      statusCounters: Array.from(statusCounters.entries()),
      methodCounters: Array.from(methodCounters.entries())
    })
  };
}

module.exports = {
  createRequestContextMiddleware,
  createSecurityHeadersMiddleware,
  createMetricsCollector,
  generateRequestId,
  buildTraceHeaders,
  getCurrentTraceContext,
  formatTraceparent,
  parseTraceparent
};