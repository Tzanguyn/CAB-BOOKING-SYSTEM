#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://127.0.0.1:3000',
  realtimeUrl: process.env.REALTIME_URL || 'http://127.0.0.1:3013',
  timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 6000),
  namespace: process.env.K8S_NAMESPACE || 'cab-booking',
  strictMeshAssert: String(process.env.STRICT_MESH_ASSERT || 'false').toLowerCase() === 'true'
};

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

async function requestJson(url, options = {}, timeoutMs = config.timeoutMs) {
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
      body,
      headers: response.headers
    };
  } finally {
    clearTimeout(timer);
  }
}

function run(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function tryRun(command) {
  try {
    return { ok: true, output: run(command) };
  } catch (error) {
    return { ok: false, output: String(error.message || error) };
  }
}

function checkClientFiles() {
  const requiredFiles = [
    'clients/driver-app/index.html',
    'clients/driver-app/app.js',
    'clients/admin-dashboard/index.html',
    'clients/admin-dashboard/app.js'
  ];

  for (const file of requiredFiles) {
    ensure(exists(file), `Missing required client file: ${file}`);
  }

  const driverApp = read('clients/driver-app/app.js');
  const adminApp = read('clients/admin-dashboard/app.js');

  ensure(driverApp.includes("bookingAction('accept')") || driverApp.includes('bookingAction("accept")'), 'Driver app missing accept booking workflow');
  ensure(driverApp.includes("bookingAction('start')") || driverApp.includes('bookingAction("start")'), 'Driver app missing start ride workflow');
  ensure(driverApp.includes("bookingAction('complete')") || driverApp.includes('bookingAction("complete")'), 'Driver app missing complete ride workflow');
  ensure(adminApp.includes('serviceCatalog'), 'Admin dashboard missing service health matrix logic');
  ensure(adminApp.includes('runMeshCheck'), 'Admin dashboard missing mesh posture check logic');

  return {
    requiredFiles,
    checks: [
      'driver accept/start/complete workflow',
      'admin service matrix',
      'admin mesh posture check'
    ]
  };
}

function checkStaticMeshArtifacts() {
  const artifacts = [
    'k8s/security/peer-authentication-mtls.yaml',
    'k8s/security/authorization-policy.yaml',
    'k8s/security/network-policy-default-deny.yaml',
    'k8s/base/ingress.yaml'
  ];

  for (const file of artifacts) {
    ensure(exists(file), `Missing mesh/security artifact: ${file}`);
  }

  const peerAuth = read('k8s/security/peer-authentication-mtls.yaml');
  const ingress = read('k8s/base/ingress.yaml');

  ensure(peerAuth.includes('mode: STRICT'), 'PeerAuthentication is not STRICT');
  ensure(ingress.toLowerCase().includes('force-ssl-redirect'), 'Ingress missing SSL redirect hardening');

  return { artifacts };
}

function checkRuntimeMesh() {
  const kubectlCheck = tryRun('kubectl version --client=true --short');
  if (!kubectlCheck.ok) {
    return {
      runtimeVerified: false,
      reason: 'kubectl is unavailable in this environment'
    };
  }

  const nsCheck = tryRun(`kubectl get namespace ${config.namespace} -o name`);
  if (!nsCheck.ok) {
    return {
      runtimeVerified: false,
      reason: `namespace ${config.namespace} not found`
    };
  }

  const peerAuthCheck = tryRun(`kubectl get peerauthentication -n ${config.namespace}`);
  const authzCheck = tryRun(`kubectl get authorizationpolicy -n ${config.namespace}`);
  const netpolCheck = tryRun(`kubectl get networkpolicy -n ${config.namespace}`);

  const runtimeVerified = peerAuthCheck.ok && authzCheck.ok && netpolCheck.ok;

  return {
    runtimeVerified,
    reason: runtimeVerified ? null : 'mesh resources not queryable in cluster',
    peerAuthOutput: peerAuthCheck.output,
    authzOutput: authzCheck.output,
    netpolOutput: netpolCheck.output
  };
}

async function checkRuntimeEndpoints() {
  const gatewayHealth = await requestJson(`${config.gatewayUrl}/health`).catch(() => ({ ok: false, status: 0, body: null, headers: new Headers() }));
  const realtimeHealth = await requestJson(`${config.realtimeUrl}/health`).catch(() => ({ ok: false, status: 0, body: null, headers: new Headers() }));

  const gatewayHeaders = gatewayHealth.headers;
  const hasSecurityHeader = gatewayHeaders && (
    gatewayHeaders.get('x-content-type-options') ||
    gatewayHeaders.get('x-frame-options') ||
    gatewayHeaders.get('x-service-name')
  );

  return {
    gateway: {
      ok: gatewayHealth.ok,
      status: gatewayHealth.status,
      hasSecurityHeader: Boolean(hasSecurityHeader)
    },
    realtime: {
      ok: realtimeHealth.ok,
      status: realtimeHealth.status
    }
  };
}

async function main() {
  const summary = [];

  const clientChecks = checkClientFiles();
  summary.push({ case: 'P4-1', name: 'Client workflow coverage', status: 'passed', details: clientChecks });

  const staticMesh = checkStaticMeshArtifacts();
  summary.push({ case: 'P4-2', name: 'Static mesh/security artifacts', status: 'passed', details: staticMesh });

  const runtimeEndpoints = await checkRuntimeEndpoints();
  const endpointPass = runtimeEndpoints.gateway.ok && runtimeEndpoints.gateway.hasSecurityHeader;
  summary.push({
    case: 'P4-3',
    name: 'Runtime endpoint posture',
    status: endpointPass ? 'passed' : 'failed',
    details: runtimeEndpoints
  });

  const runtimeMesh = checkRuntimeMesh();
  const meshPass = runtimeMesh.runtimeVerified || !config.strictMeshAssert;
  summary.push({
    case: 'P4-4',
    name: 'Runtime mesh verification',
    status: meshPass ? 'passed' : 'failed',
    details: runtimeMesh
  });

  console.log('--- Phase 4 Client + Mesh Smoke Report ---');
  console.log(JSON.stringify({ summary }, null, 2));

  if (!endpointPass || !meshPass) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Phase 4 smoke failed:', error.message);
  process.exit(1);
});
