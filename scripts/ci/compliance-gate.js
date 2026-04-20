const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

const requiredFiles = [
  '.github/workflows/ci.yml',
  'k8s/base/namespace.yaml',
  'k8s/base/api-gateway-deployment.yaml',
  'k8s/base/api-gateway-hpa.yaml',
  'k8s/base/booking-service-deployment.yaml',
  'k8s/base/booking-service-hpa.yaml',
  'k8s/base/realtime-socket-deployment.yaml',
  'k8s/base/realtime-socket-hpa.yaml',
  'k8s/base/ingress.yaml',
  'k8s/security/peer-authentication-mtls.yaml',
  'k8s/security/network-policy-default-deny.yaml',
  'infra/terraform/main.tf',
  'infra/terraform/variables.tf',
  'infra/terraform/outputs.tf',
  'scripts/realtime-e2e-smoke.js'
];

const contentChecks = [
  {
    file: 'api-gateway/src/app.js',
    mustInclude: ['helmet(', 'rateLimit('],
    label: 'API Gateway security middleware'
  },
  {
    file: 'realtime/socket-server/src/index.js',
    mustInclude: ['socket.io', 'driver:location:update', 'gpsTracker.updateDriverLocation'],
    label: 'Realtime Socket.IO + Redis Geo pipeline'
  },
  {
    file: 'docker-compose.yml',
    mustInclude: ['realtime-socket', 'RIDE_SERVICE_URL=', '3013:3011'],
    label: 'Realtime deployment baseline'
  }
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function run() {
  const missing = [];
  const contentFailures = [];

  for (const relativePath of requiredFiles) {
    if (!exists(relativePath)) {
      missing.push(relativePath);
    }
  }

  for (const check of contentChecks) {
    if (!exists(check.file)) {
      contentFailures.push(`${check.label}: missing file ${check.file}`);
      continue;
    }

    const data = read(check.file);
    for (const token of check.mustInclude) {
      if (!data.includes(token)) {
        contentFailures.push(`${check.label}: missing token \"${token}\" in ${check.file}`);
      }
    }
  }

  console.log('=== Compliance Gate Report ===');

  if (missing.length === 0) {
    console.log('[OK] Required cloud-native/CI files are present');
  } else {
    console.log('[FAIL] Missing required files:');
    for (const item of missing) {
      console.log(` - ${item}`);
    }
  }

  if (contentFailures.length === 0) {
    console.log('[OK] Security/realtime control checks passed');
  } else {
    console.log('[FAIL] Control checks failed:');
    for (const item of contentFailures) {
      console.log(` - ${item}`);
    }
  }

  if (missing.length > 0 || contentFailures.length > 0) {
    process.exit(1);
  }

  console.log('=== Compliance Gate Passed ===');
}

run();
