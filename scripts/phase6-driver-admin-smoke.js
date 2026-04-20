#!/usr/bin/env node

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://127.0.0.1:3000',
  timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 12000)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function requestJson(url, options = {}, timeoutMs = config.timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
      signal: controller.signal
    })

    const raw = await response.text()
    let body = null
    try {
      body = raw ? JSON.parse(raw) : null
    } catch {
      body = { raw }
    }

    return {
      ok: response.ok,
      status: response.status,
      body
    }
  } finally {
    clearTimeout(timer)
  }
}

async function waitForHealth(url, label) {
  for (let i = 0; i < 20; i += 1) {
    try {
      const r = await requestJson(url, { method: 'GET' }, 5000)
      if (r.ok) {
        return
      }
    } catch {
      // retry
    }

    await sleep(1000)
  }

  throw new Error(`${label} is not healthy`)
}

function randomPhone(prefix) {
  return `${prefix}${String(Date.now()).slice(-7)}`
}

async function registerAndLogin(role, stamp) {
  const email = `${role}.phase6.${stamp}@example.com`
  const password = 'Aa1!2345'

  const register = await requestJson(`${config.gatewayUrl}/auth/register`, {
    method: 'POST',
    body: {
      email,
      phone: randomPhone(role === 'driver' ? '091' : role === 'admin' ? '092' : '093'),
      password,
      firstName: role,
      lastName: 'Phase6',
      role
    }
  })

  ensure(register.status === 201 || register.status === 400, `register ${role} unexpected status ${register.status}`)

  const login = await requestJson(`${config.gatewayUrl}/auth/login`, {
    method: 'POST',
    body: { email, password }
  })

  ensure(login.ok, `login ${role} failed: ${login.status} ${JSON.stringify(login.body)}`)

  const accessToken = login.body?.tokens?.accessToken
  const userId = String(login.body?.user?.id || login.body?.user?.userId || '')
  ensure(accessToken, `${role} accessToken missing`)
  ensure(userId, `${role} userId missing`)

  return { accessToken, userId }
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

function buildDriverProfile(driverId, stamp) {
  return {
    driverId,
    firstName: 'Phase6',
    lastName: 'Driver',
    email: `driver.profile.${stamp}@example.com`,
    phone: randomPhone('094'),
    dateOfBirth: '1990-01-01',
    licenseNumber: `LIC-P6-${stamp}`,
    licenseExpiryDate: '2030-12-31',
    vehicle: {
      make: 'Toyota',
      model: 'Vios',
      year: 2024,
      color: 'White',
      licensePlate: `61A-${String(stamp).slice(-5)}`
    }
  }
}

async function main() {
  const summary = []
  const stamp = Date.now()

  await waitForHealth(`${config.gatewayUrl}/health`, 'api-gateway')

  const customer = await registerAndLogin('customer', `${stamp}-customer`)
  const driver = await registerAndLogin('driver', `${stamp}-driver`)
  const admin = await registerAndLogin('admin', `${stamp}-admin`)

  // Case P6-1: Driver can manage own business profile/status/location
  const driverBusinessId = `DRV-P6-${String(stamp).slice(-6)}`
  const createProfile = await requestJson(`${config.gatewayUrl}/api/drivers/profile`, {
    method: 'POST',
    headers: authHeader(driver.accessToken),
    body: buildDriverProfile(driverBusinessId, stamp)
  })
  ensure(createProfile.ok, `P6-1 create profile failed: ${createProfile.status} ${JSON.stringify(createProfile.body)}`)

  const updateStatus = await requestJson(`${config.gatewayUrl}/api/drivers/status/${encodeURIComponent(driverBusinessId)}`, {
    method: 'PUT',
    headers: authHeader(driver.accessToken),
    body: { status: 'ONLINE' }
  })
  ensure(updateStatus.ok, `P6-1 update status failed: ${updateStatus.status} ${JSON.stringify(updateStatus.body)}`)

  const updateLocation = await requestJson(`${config.gatewayUrl}/api/drivers/location/${encodeURIComponent(driverBusinessId)}`, {
    method: 'PUT',
    headers: authHeader(driver.accessToken),
    body: { lat: 10.7605, lng: 106.6605 }
  })
  ensure(updateLocation.ok, `P6-1 update location failed: ${updateLocation.status} ${JSON.stringify(updateLocation.body)}`)

  summary.push({ case: 'P6-1', name: 'Driver profile/status/location flow', status: 'passed' })

  // Case P6-2: Customer cannot call driver-only route
  const forbiddenForCustomer = await requestJson(`${config.gatewayUrl}/api/drivers/profile`, {
    method: 'POST',
    headers: authHeader(customer.accessToken),
    body: buildDriverProfile(`DRV-P6-C-${String(stamp).slice(-4)}`, stamp)
  })
  ensure(forbiddenForCustomer.status === 403, `P6-2 expected 403, got ${forbiddenForCustomer.status}`)
  summary.push({ case: 'P6-2', name: 'Customer blocked from driver-only route', status: 'passed' })

  // Case P6-3: Customer booking + driver confirm/start/complete
  const createBooking = await requestJson(`${config.gatewayUrl}/api/bookings`, {
    method: 'POST',
    headers: authHeader(customer.accessToken),
    body: {
      customerId: customer.userId,
      pickup: { lat: 10.76, lng: 106.66 },
      drop: { lat: 10.77, lng: 106.7 },
      payment_method: 'cash',
      autoAssign: false,
      idempotency_key: `p6-booking-${stamp}`
    }
  })
  ensure(createBooking.ok, `P6-3 create booking failed: ${createBooking.status} ${JSON.stringify(createBooking.body)}`)

  const bookingId = String(createBooking.body?.data?._id || '')
  ensure(bookingId, 'P6-3 booking id missing')

  const confirm = await requestJson(`${config.gatewayUrl}/api/bookings/${encodeURIComponent(bookingId)}/confirm`, {
    method: 'POST',
    headers: authHeader(driver.accessToken),
    body: {
      driverId: driverBusinessId,
      rideId: bookingId
    }
  })
  ensure(confirm.ok, `P6-3 confirm failed: ${confirm.status} ${JSON.stringify(confirm.body)}`)

  const start = await requestJson(`${config.gatewayUrl}/api/bookings/${encodeURIComponent(bookingId)}/start`, {
    method: 'POST',
    headers: authHeader(driver.accessToken),
    body: {}
  })
  ensure(start.ok, `P6-3 start failed: ${start.status} ${JSON.stringify(start.body)}`)

  const complete = await requestJson(`${config.gatewayUrl}/api/bookings/${encodeURIComponent(bookingId)}/complete`, {
    method: 'POST',
    headers: authHeader(driver.accessToken),
    body: { actualFare: Number(createBooking.body?.data?.estimatedFare || 100000) }
  })
  ensure(complete.ok, `P6-3 complete failed: ${complete.status} ${JSON.stringify(complete.body)}`)

  summary.push({ case: 'P6-3', name: 'Driver operational booking lifecycle', status: 'passed' })

  // Case P6-4: Admin can access customer bookings (ABAC admin bypass)
  const adminReadCustomerBookings = await requestJson(`${config.gatewayUrl}/api/bookings/customer/${encodeURIComponent(customer.userId)}`, {
    method: 'GET',
    headers: authHeader(admin.accessToken)
  })
  ensure(adminReadCustomerBookings.ok, `P6-4 admin booking read failed: ${adminReadCustomerBookings.status} ${JSON.stringify(adminReadCustomerBookings.body)}`)

  summary.push({ case: 'P6-4', name: 'Admin ABAC access over customer bookings', status: 'passed' })

  console.log('--- Phase 6 Driver/Admin Business Smoke Report ---')
  console.log(JSON.stringify({ summary }, null, 2))
}

main().catch((error) => {
  console.error('phase6 driver/admin smoke failed:', error.message)
  process.exit(1)
})
