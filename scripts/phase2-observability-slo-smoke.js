#!/usr/bin/env node

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://127.0.0.1:3000',
  bookingServiceUrl: process.env.BOOKING_SERVICE_URL || 'http://127.0.0.1:3003',
  matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://127.0.0.1:3014',
  pricingServiceUrl: process.env.PRICING_SERVICE_URL || 'http://127.0.0.1:3001',
  etaServiceUrl: process.env.ETA_SERVICE_URL || 'http://127.0.0.1:3011',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 8000),
  sampleCount: Number(process.env.SLO_SAMPLE_COUNT || 15),
  p95BudgetMs: Number(process.env.SLO_P95_BUDGET_MS || 500)
};

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function percentile(values, p) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function requestJson(url, options = {}, timeoutMs = config.requestTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    const text = await response.text();
    let body = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      body
    };
  } finally {
    clearTimeout(timer);
  }
}

async function warmup(urls) {
  for (const url of urls) {
    await requestJson(url, { method: 'GET' }, config.requestTimeoutMs);
  }
}

async function measureEndpoint(name, url, options = {}) {
  const samples = [];
  const iterations = Number(options.iterations || config.sampleCount);
  const acceptableStatuses = options.acceptableStatuses || [200];

  for (let i = 0; i < iterations; i += 1) {
    const started = Date.now();
    const response = await requestJson(url, options.requestOptions || {}, config.requestTimeoutMs);
    samples.push({
      ok: acceptableStatuses.includes(response.status),
      status: response.status,
      latencyMs: Date.now() - started,
      body: response.body,
      headers: response.headers
    });
  }

  const successful = samples.filter((item) => item.ok);
  const latencies = successful.map((item) => item.latencyMs);
  const p95 = percentile(latencies, 95);
  const successRate = samples.length ? successful.length / samples.length : 0;

  return {
    name,
    total: samples.length,
    successRate,
    p95,
    samples
  };
}

async function main() {
  console.log('--- Phase 2 Observability + SLO Smoke Test ---');
  console.log(`Gateway: ${config.gatewayUrl}`);
  console.log(`Booking: ${config.bookingServiceUrl}`);
  console.log(`Matching: ${config.matchingServiceUrl}`);
  console.log(`Pricing: ${config.pricingServiceUrl}`);
  console.log(`ETA: ${config.etaServiceUrl}`);

  const endpoints = [
    { name: 'gateway-health', url: `${config.gatewayUrl}/health` },
    { name: 'booking-health', url: `${config.bookingServiceUrl}/api/bookings/health` },
    { name: 'matching-health', url: `${config.matchingServiceUrl}/api/matching/health` },
    { name: 'pricing-health', url: `${config.pricingServiceUrl}/api/pricing/health` },
    { name: 'eta-health', url: `${config.etaServiceUrl}/api/eta/health` }
  ];

  for (const endpoint of endpoints) {
    const response = await requestJson(endpoint.url, { method: 'GET' });
    ensure(response.ok, `${endpoint.name} failed with status ${response.status}`);
    ensure(response.body?.traceId || response.body?.requestId, `${endpoint.name} did not return trace metadata`);
    ensure(typeof response.body?.sloHealthy === 'boolean', `${endpoint.name} did not return sloHealthy flag`);
    ensure(String(response.headers.get('traceparent') || '').length > 0, `${endpoint.name} missing traceparent response header`);
  }

  const traceSamples = [];
  const serviceSamples = [
    {
      name: 'pricing-estimate',
      url: `${config.pricingServiceUrl}/api/pricing/estimate`,
      requestOptions: {
        method: 'POST',
        body: JSON.stringify({
          distance_km: 5,
          demand_index: 1.2,
          supply_index: 0.9
        })
      },
      acceptableStatuses: [200]
    },
    {
      name: 'eta-estimate',
      url: `${config.etaServiceUrl}/api/eta/estimate`,
      requestOptions: {
        method: 'POST',
        body: JSON.stringify({
          distance_km: 6,
          traffic_level: 0.3,
          avg_speed_kmh: 30,
          weather_factor: 1
        })
      },
      acceptableStatuses: [200]
    },
    {
      name: 'matching-recommend',
      url: `${config.matchingServiceUrl}/api/matching/recommend`,
      requestOptions: {
        method: 'POST',
        body: JSON.stringify({
          lat: 10.7769,
          lng: 106.6696,
          radiusKm: 5,
          top: 3
        })
      },
      acceptableStatuses: [200]
    }
  ];

  for (const sample of serviceSamples) {
    const result = await measureEndpoint(sample.name, sample.url, {
      requestOptions: sample.requestOptions,
      acceptableStatuses: sample.acceptableStatuses,
      iterations: config.sampleCount
    });

    traceSamples.push(result);
    ensure(result.successRate >= 0.95, `${sample.name} success rate below threshold: ${(result.successRate * 100).toFixed(1)}%`);
    ensure(Number.isFinite(result.p95) ? result.p95 <= config.p95BudgetMs : false, `${sample.name} p95 too high: ${Math.round(result.p95 || 0)}ms`);
  }

  const sloEndpoints = [
    `${config.gatewayUrl}/slo`,
    `${config.bookingServiceUrl}/slo`,
    `${config.matchingServiceUrl}/slo`,
    `${config.pricingServiceUrl}/slo`,
    `${config.etaServiceUrl}/slo`
  ];

  for (const sloUrl of sloEndpoints) {
    const response = await requestJson(sloUrl, { method: 'GET' });
    ensure(response.ok, `${sloUrl} failed with status ${response.status}`);
    ensure(typeof response.body?.healthy === 'boolean', `${sloUrl} missing healthy flag`);
    ensure(typeof response.body?.p95LatencyMs === 'number' || response.body?.p95LatencyMs === null, `${sloUrl} missing p95LatencyMs`);
  }

  console.log('\n=== SLO Results ===');
  for (const result of traceSamples) {
    console.log(`- ${result.name}: success ${(result.successRate * 100).toFixed(1)}%, p95 ${Math.round(result.p95 || 0)}ms`);
  }

  console.log('\n=== Phase 2 Smoke Test Passed ===');
}

main().catch((error) => {
  console.error('Phase 2 smoke test failed:', error.message);
  process.exit(1);
});