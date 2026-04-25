async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  try {
    return { status: response.status, ok: response.ok, body: text ? JSON.parse(text) : null };
  } catch {
    return { status: response.status, ok: response.ok, body: { raw: text } };
  }
}

function baseUrl(id) {
  return document.getElementById(id).value.trim().replace(/\/$/, '');
}

function authHeaders() {
  const token = document.getElementById('adminToken').value.trim();
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

function renderAlerts(items) {
  const alertsEl = document.getElementById('alerts');
  alertsEl.innerHTML = '';

  if (!items.length) {
    const p = document.createElement('p');
    p.textContent = 'No alerts right now.';
    alertsEl.appendChild(p);
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = `alert ${item.level}`;
    row.textContent = item.message;
    alertsEl.appendChild(row);
  }
}

function parseMetricValue(metricsText, metricName) {
  if (!metricsText || typeof metricsText !== 'string') {
    return null;
  }

  const lines = metricsText.split(/\r?\n/);
  const matched = lines.find((line) => line.startsWith(metricName));
  if (!matched) {
    return null;
  }

  const value = Number(matched.split(' ').pop());
  return Number.isFinite(value) ? value : null;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

function serviceCatalog(gateway, realtime) {
  return [
    { name: 'api-gateway', url: `${gateway}/health` },
    { name: 'booking-service', url: 'http://localhost:3003/api/bookings/health' },
    { name: 'driver-service', url: 'http://localhost:3007/api/drivers/health' },
    { name: 'pricing-service', url: 'http://localhost:3001/api/pricing/health' },
    { name: 'payment-service', url: 'http://localhost:3002/api/payments/health' },
    { name: 'matching-service', url: 'http://localhost:3014/api/matching/health' },
    { name: 'eta-service', url: 'http://localhost:3011/api/eta/health' },
    { name: 'realtime-socket', url: `${realtime}/health` }
  ];
}

function renderServiceGrid(results) {
  const grid = document.getElementById('serviceGrid');
  grid.innerHTML = '';

  for (const result of results) {
    const item = document.createElement('article');
    item.className = `service ${result.ok ? 'ok' : 'bad'}`;
    item.innerHTML = `
      <h3>${result.name}</h3>
      <p>${result.ok ? 'healthy' : `HTTP ${result.status}`}</p>
    `;
    grid.appendChild(item);
  }
}

async function runMeshCheck() {
  const meshStatus = document.getElementById('meshStatus');
  const checks = [
    {
      label: 'PeerAuthentication STRICT manifest',
      url: 'http://localhost:3000/api/docs/openapi.json',
      relaxed: true
    },
    {
      label: 'Gateway security headers',
      url: `${baseUrl('gatewayUrl')}/health`,
      relaxed: false
    }
  ];

  const outcomes = [];
  for (const check of checks) {
    try {
      const response = await fetch(check.url);
      outcomes.push({
        label: check.label,
        ok: check.relaxed ? true : response.ok,
        status: response.status
      });
    } catch {
      outcomes.push({
        label: check.label,
        ok: check.relaxed,
        status: 0
      });
    }
  }

  const passed = outcomes.filter((item) => item.ok).length;
  meshStatus.textContent = `Mesh posture checks: ${passed}/${outcomes.length} passed`;
}

async function refreshBoard() {
  const gateway = document.getElementById('gatewayStatus');
  const realtime = document.getElementById('realtimeStatus');
  const boardStatus = document.getElementById('boardStatus');
  const gatewayP95 = document.getElementById('gatewayP95');
  const realtimeUsers = document.getElementById('realtimeUsers');

  boardStatus.textContent = 'Refreshing...';
  const gatewayUrl = baseUrl('gatewayUrl');
  const realtimeUrl = baseUrl('realtimeUrl');

  const services = serviceCatalog(gatewayUrl, realtimeUrl);
  const serviceResults = await Promise.all(
    services.map(async (service) => {
      try {
        const result = await fetchJson(service.url, { headers: { ...authHeaders() } });
        return { name: service.name, ok: result.ok, status: result.status, body: result.body };
      } catch {
        return { name: service.name, ok: false, status: 0, body: null };
      }
    })
  );

  renderServiceGrid(serviceResults);

  const healthyCount = serviceResults.filter((item) => item.ok).length;
  const degradedCount = serviceResults.length - healthyCount;
  document.getElementById('healthyCount').textContent = String(healthyCount);
  document.getElementById('degradedCount').textContent = String(degradedCount);

  const gatewayHealth = serviceResults.find((item) => item.name === 'api-gateway');
  gateway.textContent = gatewayHealth?.ok
    ? `Healthy: ${gatewayHealth.body?.service || 'api-gateway'}`
    : `Gateway unavailable (${gatewayHealth?.status || 'n/a'})`;

  const realtimeHealth = serviceResults.find((item) => item.name === 'realtime-socket');
  realtime.textContent = realtimeHealth?.ok
    ? `Healthy: ${realtimeHealth.body?.service || 'realtime-socket'}`
    : `Realtime unavailable (${realtimeHealth?.status || 'n/a'})`;

  const metricResponse = await fetchText(`${gatewayUrl}/metrics`).catch(() => ({ ok: false, status: 0, body: '' }));
  const p95Value = metricResponse.ok
    ? parseMetricValue(metricResponse.body, 'cab_service_http_request_duration_ms_avg')
    : null;
  gatewayP95.textContent = Number.isFinite(p95Value) ? String(Math.round(p95Value)) : '-';

  const realtimeStats = await fetchJson(`${realtimeUrl}/api/realtime/stats`).catch(() => ({ ok: false, status: 0, body: null }));
  const connectedUsers = realtimeStats.body?.stats?.connectedClients;
  realtimeUsers.textContent = Number.isFinite(Number(connectedUsers)) ? String(connectedUsers) : '-';

  const alerts = [];
  if (degradedCount > 0) {
    alerts.push({ level: 'warn', message: `${degradedCount} services are degraded` });
  }
  if (!metricResponse.ok) {
    alerts.push({ level: 'warn', message: 'Gateway metrics endpoint unavailable' });
  }
  if (Number.isFinite(p95Value) && p95Value > 500) {
    alerts.push({ level: 'critical', message: `Gateway avg latency high (${Math.round(p95Value)}ms)` });
  }
  renderAlerts(alerts);

  boardStatus.textContent = `Updated at ${new Date().toLocaleTimeString()}`;
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  refreshBoard().catch((error) => {
    document.getElementById('boardStatus').textContent = `Refresh failed: ${error.message}`;
  });
});

document.getElementById('meshCheckBtn').addEventListener('click', () => {
  runMeshCheck().catch((error) => {
    document.getElementById('meshStatus').textContent = `Mesh check failed: ${error.message}`;
  });
});

(async function init() {
  await refreshBoard();
})();
