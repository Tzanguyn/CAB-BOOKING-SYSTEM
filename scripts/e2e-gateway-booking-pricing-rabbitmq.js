/*
  E2E test: gateway -> booking -> pricing -> rabbitmq event

  Expected flow:
  1) Authenticate through API Gateway (/auth/register + /auth/login)
  2) Create booking through API Gateway (/api/bookings)
  3) Booking service calls pricing service (/api/pricing/estimate)
  4) Booking service publishes RabbitMQ event: booking.created (exchange: ride_events)

  Usage:
    node scripts/e2e-gateway-booking-pricing-rabbitmq.js

  Optional env vars:
    GATEWAY_URL=http://localhost:3000
    RABBIT_API_URL=http://localhost:15672/api
    RABBIT_USER=cab_admin
    RABBIT_PASS=cab123!@#
    RABBIT_VHOST=cab-booking
*/

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
  rabbitApiUrl: process.env.RABBIT_API_URL || 'http://localhost:15672/api',
  rabbitUser: process.env.RABBIT_USER || 'cab_admin',
  rabbitPass: process.env.RABBIT_PASS || 'cab123!@#',
  rabbitVhost: process.env.RABBIT_VHOST || 'cab-booking',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 12000)
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function httpJson(url, options = {}, timeoutMs = config.requestTimeoutMs) {
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

    if (text && text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
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

function rabbitAuthHeader() {
  const raw = `${config.rabbitUser}:${config.rabbitPass}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

function encVhost(vhost) {
  return encodeURIComponent(vhost);
}

function encName(name) {
  return encodeURIComponent(name);
}

async function waitForHealth(url, label, retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i += 1) {
    try {
      const r = await httpJson(url, { method: 'GET' }, 6000);
      if (r.ok) {
        console.log(`[OK] ${label} is healthy`);
        return;
      }
    } catch {
      // ignore and retry
    }

    if (i < retries) {
      await sleep(delayMs);
    }
  }

  throw new Error(`${label} is not healthy after ${retries} attempts`);
}

async function ensureRabbitQueue(queueName) {
  const vhost = encVhost(config.rabbitVhost);
  const queue = encName(queueName);
  const baseHeaders = { Authorization: rabbitAuthHeader() };

  const createQueue = await httpJson(
    `${config.rabbitApiUrl}/queues/${vhost}/${queue}`,
    {
      method: 'PUT',
      headers: baseHeaders,
      body: JSON.stringify({ durable: false, auto_delete: true, arguments: {} })
    }
  );

  if (!(createQueue.ok || createQueue.status === 201 || createQueue.status === 204)) {
    throw new Error(`Failed to create queue ${queueName}: HTTP ${createQueue.status}`);
  }

  const bindQueue = await httpJson(
    `${config.rabbitApiUrl}/bindings/${vhost}/e/${encName('ride_events')}/q/${queue}`,
    {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ routing_key: 'booking.created', arguments: {} })
    }
  );

  if (!bindQueue.ok) {
    throw new Error(`Failed to bind queue ${queueName} to ride_events:booking.created (HTTP ${bindQueue.status})`);
  }

  console.log(`[OK] Rabbit queue bound: ${queueName} -> ride_events (booking.created)`);
}

async function pullOneMessage(queueName) {
  const vhost = encVhost(config.rabbitVhost);
  const queue = encName(queueName);

  const r = await httpJson(
    `${config.rabbitApiUrl}/queues/${vhost}/${queue}/get`,
    {
      method: 'POST',
      headers: { Authorization: rabbitAuthHeader() },
      body: JSON.stringify({
        count: 1,
        ackmode: 'ack_requeue_false',
        encoding: 'auto',
        truncate: 50000
      })
    }
  );

  if (!r.ok) {
    throw new Error(`Rabbit get message failed: HTTP ${r.status}`);
  }

  return Array.isArray(r.body) ? r.body : [];
}

async function deleteQueue(queueName) {
  const vhost = encVhost(config.rabbitVhost);
  const queue = encName(queueName);

  await httpJson(`${config.rabbitApiUrl}/queues/${vhost}/${queue}`, {
    method: 'DELETE',
    headers: { Authorization: rabbitAuthHeader() }
  });
}

async function registerAndLogin() {
  const stamp = Date.now();
  const email = `e2e_${stamp}@example.com`;
  const password = 'Aa1!e2ePass';

  const registerPayload = {
    email,
    phone: `090${String(stamp).slice(-7)}`,
    password,
    firstName: 'E2E',
    lastName: 'Tester',
    role: 'customer'
  };

  const reg = await httpJson(`${config.gatewayUrl}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(registerPayload)
  });

  if (!(reg.ok || reg.status === 400)) {
    throw new Error(`Register failed unexpectedly: HTTP ${reg.status} ${JSON.stringify(reg.body)}`);
  }

  const login = await httpJson(`${config.gatewayUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (!login.ok) {
    throw new Error(`Login failed: HTTP ${login.status} ${JSON.stringify(login.body)}`);
  }

  const accessToken = login.body?.tokens?.accessToken;
  const userId = login.body?.user?.id;

  if (!accessToken || !userId) {
    throw new Error(`Login response missing token/user: ${JSON.stringify(login.body)}`);
  }

  console.log(`[OK] Authenticated user ${userId}`);
  return { accessToken, userId };
}

async function createBookingViaGateway(accessToken, customerId) {
  const payload = {
    customerId,
    pickupLocation: {
      address: '1 Nguyen Hue, District 1, HCMC',
      latitude: 10.776889,
      longitude: 106.700806
    },
    dropoffLocation: {
      address: '2 Hai Ba Trung, District 1, HCMC',
      latitude: 10.781623,
      longitude: 106.704308
    },
    paymentMethod: 'CASH',
    notes: 'E2E flow verification'
  };

  const r = await httpJson(`${config.gatewayUrl}/api/bookings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    throw new Error(`Create booking failed: HTTP ${r.status} ${JSON.stringify(r.body)}`);
  }

  const booking = r.body?.data;
  if (!booking) {
    throw new Error(`Booking response missing data: ${JSON.stringify(r.body)}`);
  }

  const { estimatedFare } = booking;
  if (estimatedFare !== 15000) {
    throw new Error(
      `Expected estimatedFare=15000 from pricing-service, got ${estimatedFare}. Full: ${JSON.stringify(r.body)}`
    );
  }

  console.log(`[OK] Booking created with estimatedFare=${estimatedFare} (pricing-service reached)`);
  return booking;
}

async function waitForBookingEvent(queueName, expectedBookingId, retries = 20, delayMs = 1000) {
  for (let i = 1; i <= retries; i += 1) {
    const messages = await pullOneMessage(queueName);
    if (messages.length > 0) {
      const msg = messages[0];
      const routingKey = msg.routing_key;
      const payload = msg.payload || {};

      if (routingKey !== 'booking.created') {
        throw new Error(`Unexpected routing key: ${routingKey}`);
      }

      if (expectedBookingId && payload.bookingId && payload.bookingId !== String(expectedBookingId)) {
        throw new Error(
          `Received booking.created for another booking. expected=${expectedBookingId}, actual=${payload.bookingId}`
        );
      }

      console.log('[OK] Received booking.created event from RabbitMQ');
      return payload;
    }

    if (i < retries) {
      await sleep(delayMs);
    }
  }

  throw new Error('Did not receive booking.created event in RabbitMQ within timeout');
}

async function main() {
  const queueName = `e2e_booking_created_${Date.now()}`;

  console.log('--- E2E flow start ---');
  console.log(`Gateway: ${config.gatewayUrl}`);
  console.log(`Rabbit API: ${config.rabbitApiUrl} (vhost: ${config.rabbitVhost})`);

  await waitForHealth(`${config.gatewayUrl}/health`, 'API Gateway');
  await waitForHealth(`${config.rabbitApiUrl}/overview`, 'RabbitMQ Management API', 30, 2000);

  await ensureRabbitQueue(queueName);

  let cleanupDone = false;

  try {
    const { accessToken, userId } = await registerAndLogin();
    const booking = await createBookingViaGateway(accessToken, userId);
    const eventPayload = await waitForBookingEvent(queueName, booking._id || booking.id);

    console.log('--- E2E flow success ---');
    console.log(
      JSON.stringify(
        {
          gatewayToBooking: 'OK',
          bookingToPricing: 'OK (estimatedFare=15000)',
          bookingToRabbitMQ: 'OK (booking.created)',
          bookingId: booking._id || booking.id,
          eventBookingId: eventPayload.bookingId || null
        },
        null,
        2
      )
    );
  } finally {
    await deleteQueue(queueName);
    cleanupDone = true;
    if (cleanupDone) {
      console.log(`[CLEANUP] Deleted temporary queue ${queueName}`);
    }
  }
}

main().catch((err) => {
  console.error('--- E2E flow failed ---');
  console.error(err.message);
  process.exit(1);
});
