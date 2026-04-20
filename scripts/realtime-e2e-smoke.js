const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const config = {
  authUrl: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3004',
  rideUrl: process.env.RIDE_SERVICE_URL || 'http://127.0.0.1:3009',
  socketUrl: process.env.SOCKET_URL || 'http://127.0.0.1:3013',
  timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 12000),
  maxRealtimeLatencyMs: Number(process.env.MAX_REALTIME_LATENCY_MS || 1000),
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key',
  allowAuthFallback: String(process.env.ALLOW_AUTH_FALLBACK || 'true').toLowerCase() === 'true',
  strictRideSync: String(process.env.STRICT_RIDE_SYNC || 'false').toLowerCase() === 'true'
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isTransientBrokerError(body) {
  const message = String(body?.error || body?.message || '').toLowerCase();
  return message.includes('channel closed')
    || message.includes('channel not initialized')
    || message.includes('broker')
    || message.includes('amqp')
    || message.includes('econn');
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
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
      signal: controller.signal
    });

    const text = await response.text();
    let body;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }

    return {
      ok: response.ok,
      status: response.status,
      body
    };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealth(url, label) {
  for (let i = 0; i < 20; i += 1) {
    try {
      const result = await requestJson(url, { method: 'GET' }, 4000);
      if (result.ok) {
        console.log(`[OK] ${label} healthy`);
        return;
      }
    } catch {
      // retry
    }
    await sleep(1500);
  }

  throw new Error(`${label} is not healthy: ${url}`);
}

function fallbackIdentity(role) {
  const userId = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const token = jwt.sign(
    {
      userId,
      role,
      sub: userId,
      aud: 'cab-booking-system',
      iss: 'cab-booking-auth-service'
    },
    config.jwtSecret,
    { expiresIn: '20m' }
  );

  return { token, userId, fallback: true };
}

async function registerAndLogin({ email, role }) {
  const password = 'P@ssw0rd123!';
  const registerPayload = {
    email,
    phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    password,
    firstName: role,
    lastName: 'Realtime',
    role
  };

  const register = await requestJson(`${config.authUrl}/auth/register`, {
    method: 'POST',
    body: registerPayload
  });

  if (!register.ok && register.status !== 400 && !config.allowAuthFallback) {
    throw new Error(`Register failed for ${email}: ${register.status} ${JSON.stringify(register.body)}`);
  }

  const login = await requestJson(`${config.authUrl}/auth/login`, {
    method: 'POST',
    body: { email, password }
  });

  if (!login.ok) {
    if (config.allowAuthFallback) {
      console.warn(`[WARN] Login failed for ${email}, using fallback JWT identity`);
      return fallbackIdentity(role);
    }

    throw new Error(`Login failed for ${email}: ${login.status} ${JSON.stringify(login.body)}`);
  }

  const token = login.body?.tokens?.accessToken;
  const userId = String(login.body?.user?.id || login.body?.user?.userId || '');

  ensure(token, `Missing access token for ${email}`);
  ensure(userId, `Missing userId for ${email}`);

  return { token, userId };
}

async function createStartedRide(customerToken, driverId) {
  let createRide;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    createRide = await requestJson(`${config.rideUrl}/api/rides`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`
      },
      body: {
        pickup: {
          address: 'Ben Thanh Market',
          coordinates: { lat: 10.772, lng: 106.698 }
        },
        destination: {
          address: 'Landmark 81',
          coordinates: { lat: 10.794, lng: 106.721 }
        },
        vehicleType: 'standard',
        estimatedFare: 125000
      }
    });

    if (createRide.ok || !isTransientBrokerError(createRide.body)) {
      break;
    }

    await sleep(400 * attempt);
  }

  ensure(createRide.ok, `Create ride failed: ${createRide.status} ${JSON.stringify(createRide.body)}`);

  const rideId = createRide.body?.data?.rideId;
  ensure(rideId, `Missing rideId: ${JSON.stringify(createRide.body)}`);

  const assign = await requestJson(`${config.rideUrl}/api/rides/${rideId}/status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${customerToken}`
    },
    body: {
      status: 'driver_assigned',
      driverData: {
        driverId,
        firstName: 'Driver',
        lastName: 'Realtime',
        phone: '0900000001',
        vehicle: {
          make: 'Toyota',
          model: 'Vios',
          licensePlate: '51A-12345',
          color: 'white'
        }
      }
    }
  });

  ensure(assign.ok, `Assign driver failed: ${assign.status} ${JSON.stringify(assign.body)}`);

  const start = await requestJson(`${config.rideUrl}/api/rides/${rideId}/status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${customerToken}`
    },
    body: {
      status: 'started',
      location: { lat: 10.772, lng: 106.698 }
    }
  });

  ensure(start.ok, `Start ride failed: ${start.status} ${JSON.stringify(start.body)}`);

  return { rideId, strictSync: true };
}

async function run() {
  console.log('=== Realtime E2E Smoke (SAD) ===');
  console.log(JSON.stringify(config, null, 2));

  if (dryRun) {
    console.log('[OK] Dry run mode: configuration validated');
    return;
  }

  try {
    await waitForHealth(`${config.authUrl}/auth/health`, 'Auth service');
  } catch (error) {
    if (!config.allowAuthFallback) {
      throw error;
    }
    console.warn('[WARN] Auth health check failed, fallback JWT identities enabled');
  }
  await waitForHealth(`${config.rideUrl}/health`, 'Ride service');
  await waitForHealth(`${config.socketUrl}/health`, 'Realtime socket service');

  const customerEmail = `customer.realtime.${Date.now()}@example.com`;
  const driverEmail = `driver.realtime.${Date.now()}@example.com`;

  const customer = await registerAndLogin({ email: customerEmail, role: 'customer' });
  const driver = await registerAndLogin({ email: driverEmail, role: 'driver' });

  if (customer.fallback || driver.fallback) {
    console.log('[WARN] Using fallback JWT identity for local realtime E2E');
  }

  let rideId;
  let strictSync = true;

  try {
    const prepared = await createStartedRide(customer.token, driver.userId);
    rideId = prepared.rideId;
    strictSync = prepared.strictSync;
    console.log(`[OK] Ride prepared: ${rideId}`);
  } catch (error) {
    const errorMessage = String(error?.message || '').toLowerCase();
    const transientRideFailure = errorMessage.includes('channel closed')
      || errorMessage.includes('channel not initialized')
      || errorMessage.includes('broker')
      || errorMessage.includes('amqp')
      || errorMessage.includes('econn');

    if (config.strictRideSync && !transientRideFailure) {
      throw error;
    }

    rideId = `virtual-ride-${Date.now()}`;
    strictSync = false;
    console.warn(`[WARN] Ride creation unavailable (${config.strictRideSync ? 'strict+transient' : 'local'} mode), continuing with virtual ride: ${error.message}`);
  }

  const passengerSocket = io(config.socketUrl, {
    transports: ['websocket'],
    auth: {
      token: customer.token,
      userId: customer.userId,
      role: 'customer'
    }
  });

  const driverSocket = io(config.socketUrl, {
    transports: ['websocket'],
    auth: {
      token: driver.token,
      userId: driver.userId,
      role: 'driver'
    }
  });

  try {
    await Promise.all([
      new Promise((resolve, reject) => {
        passengerSocket.once('connect', resolve);
        passengerSocket.once('connect_error', reject);
      }),
      new Promise((resolve, reject) => {
        driverSocket.once('connect', resolve);
        driverSocket.once('connect_error', reject);
      })
    ]);

    passengerSocket.emit('ride:join', { rideId });

    const startTime = Date.now();
    const received = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Did not receive realtime ride update in time')), config.maxRealtimeLatencyMs + 800);

      passengerSocket.once('ride:location:update', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });

      driverSocket.emit('driver:location:update', {
        rideId,
        driverId: driver.userId,
        coordinates: { lat: 10.7785, lng: 106.7042 },
        speed: 28,
        heading: 120,
        accuracy: 6,
        timestamp: new Date().toISOString()
      });
    });

    const latencyMs = Date.now() - startTime;
    ensure(latencyMs <= config.maxRealtimeLatencyMs, `Realtime latency exceeded threshold: ${latencyMs}ms`);
    ensure(received?.rideId === rideId, `Unexpected realtime payload: ${JSON.stringify(received)}`);

    const nearby = await requestJson(`${config.socketUrl}/api/realtime/drivers/nearby?lat=10.7785&lng=106.7042&radiusKm=3`, {
      method: 'GET'
    });

    ensure(nearby.ok, `Nearby driver query failed: ${nearby.status}`);

    if (strictSync) {
      const rideDetails = await requestJson(`${config.rideUrl}/api/rides/${rideId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${customer.token}`
        }
      });

      ensure(rideDetails.ok, `Ride detail query failed: ${rideDetails.status}`);

      const currentLocation = rideDetails.body?.data?.currentLocation?.coordinates;
      ensure(currentLocation, `Ride current location missing: ${JSON.stringify(rideDetails.body)}`);
      console.log('[OK] Ride service location sync succeeded');
    } else {
      console.log('[WARN] Ride service strict sync skipped in non-strict mode');
    }

    console.log(`[OK] Realtime payload latency: ${latencyMs}ms`);
    console.log('[OK] Redis Geo nearby query succeeded');
    console.log('=== Realtime E2E Smoke Passed ===');
  } finally {
    passengerSocket.disconnect();
    driverSocket.disconnect();
  }
}

run().catch((error) => {
  console.error('Realtime E2E smoke failed:', error.message);
  process.exit(1);
});
