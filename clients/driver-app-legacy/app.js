let socket = null;
const eventsEl = document.getElementById('events');
const statusEl = document.getElementById('socketStatus');
const rideStatusEl = document.getElementById('rideStatus');
const driverStatusInfoEl = document.getElementById('driverStatusInfo');

function serviceUrl(id) {
  return document.getElementById(id).value.trim().replace(/\/$/, '');
}

function getDriverId() {
  return document.getElementById('driverId').value.trim() || 'driver-console';
}

function addEvent(title, details) {
  const item = document.createElement('div');
  item.className = 'event';
  item.innerHTML = `
    <strong>${title}</strong>
    <pre>${JSON.stringify(details, null, 2)}</pre>
  `;
  eventsEl.prepend(item);
}

function getAuth() {
  const driverId = getDriverId();
  return {
    token: document.getElementById('token').value.trim(),
    userId: driverId,
    role: 'driver'
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
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
    body
  };
}

function authHeaders() {
  const token = document.getElementById('token').value.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function bookingPayload() {
  const customerId = document.getElementById('customerId').value.trim();
  return {
    customerId,
    pickupLocation: {
      latitude: Number(document.getElementById('pickupLat').value),
      longitude: Number(document.getElementById('pickupLng').value)
    },
    dropoffLocation: {
      latitude: Number(document.getElementById('dropoffLat').value),
      longitude: Number(document.getElementById('dropoffLng').value)
    },
    paymentMethod: 'CASH',
    autoAssign: true,
    searchRadiusKm: 5
  };
}

async function createBooking() {
  const payload = bookingPayload();
  if (!payload.customerId) {
    addEvent('validation', { message: 'Customer ID is required for create booking' });
    return;
  }

  const response = await requestJson(`${serviceUrl('bookingUrl')}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });

  const mongoId = response.body?.data?._id || '';
  if (mongoId) {
    document.getElementById('rideId').value = String(mongoId);
  }

  addEvent('create booking', response);
}

async function updateDriverStatus() {
  const response = await requestJson(`${serviceUrl('driverUrl')}/api/drivers/status/${encodeURIComponent(getDriverId())}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: document.getElementById('driverStatus').value
    })
  });

  driverStatusInfoEl.textContent = response.ok
    ? `Driver ${getDriverId()} status: ${response.body?.status || response.body?.data?.status || 'updated'}`
    : `Status update failed (HTTP ${response.status})`;
  addEvent('driver status update', response);
}

async function refreshDriverStatus() {
  const response = await requestJson(`${serviceUrl('driverUrl')}/api/drivers/status/${encodeURIComponent(getDriverId())}`, {
    method: 'GET'
  });

  driverStatusInfoEl.textContent = response.ok
    ? `Driver ${getDriverId()} status: ${response.body?.status || response.body?.data?.status || 'unknown'}`
    : `Status fetch failed (HTTP ${response.status})`;
  addEvent('driver status fetch', response);
}

async function saveDriverLocation() {
  const response = await requestJson(`${serviceUrl('driverUrl')}/api/drivers/location/${encodeURIComponent(getDriverId())}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      lat: Number(document.getElementById('lat').value),
      lng: Number(document.getElementById('lng').value)
    })
  });

  addEvent('driver location save', response);
}

async function bookingAction(action) {
  const rideId = document.getElementById('rideId').value.trim();
  const driverId = getDriverId();

  if (!rideId) {
    addEvent('validation', { message: 'Ride ID is required' });
    return;
  }

  let path = '';
  let body = null;
  if (action === 'accept') {
    path = 'confirm';
    body = {
      driverId,
      rideId
    };
  } else if (action === 'start') {
    path = 'start';
    body = {};
  } else if (action === 'complete') {
    path = 'complete';
    body = {
      actualFare: Number(document.getElementById('actualFare').value)
    };
  } else if (action === 'cancel') {
    path = 'cancel';
    body = {
      reason: 'cancelled_from_driver_console'
    };
  }

  const response = await requestJson(`${serviceUrl('bookingUrl')}/api/bookings/${encodeURIComponent(rideId)}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(body)
  });

  addEvent(`booking ${action}`, response);
}

document.getElementById('connectBtn').addEventListener('click', () => {
  const { token, userId, role } = getAuth();
  const socketUrl = document.getElementById('socketUrl').value.trim();

  if (!socketUrl) {
    statusEl.textContent = 'Socket URL is required';
    return;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = window.io(socketUrl, {
    transports: ['websocket'],
    auth: { token, userId, role }
  });

  socket.on('connect', () => {
    statusEl.textContent = `Connected: ${socket.id}`;
    addEvent('connected', { socketId: socket.id });
  });

  socket.on('connected', (payload) => addEvent('server connected', payload));
  socket.on('ride:joined', (payload) => rideStatusEl.textContent = `Joined ${payload.rideId}`);
  socket.on('ride:left', (payload) => rideStatusEl.textContent = `Left ${payload.rideId}`);
  socket.on('ride:location:update', (payload) => addEvent('ride:location:update', payload));
  socket.on('connect_error', (error) => {
    statusEl.textContent = `Connection error: ${error.message}`;
    addEvent('connect_error', { message: error.message });
  });
});

document.getElementById('disconnectBtn').addEventListener('click', () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  statusEl.textContent = 'Disconnected';
});

document.getElementById('joinBtn').addEventListener('click', () => {
  const rideId = document.getElementById('rideId').value.trim();
  if (!socket || !rideId) {
    rideStatusEl.textContent = 'Connect first and provide a ride ID';
    return;
  }
  socket.emit('ride:join', { rideId });
  rideStatusEl.textContent = `Joining ${rideId}...`;
});

document.getElementById('leaveBtn').addEventListener('click', () => {
  const rideId = document.getElementById('rideId').value.trim();
  if (!socket || !rideId) {
    return;
  }
  socket.emit('ride:leave', { rideId });
});

document.getElementById('sendLocationBtn').addEventListener('click', () => {
  if (!socket) {
    statusEl.textContent = 'Connect first';
    return;
  }

  const rideId = document.getElementById('rideId').value.trim();
  const payload = {
    rideId,
    driverId: getDriverId(),
    coordinates: {
      lat: Number(document.getElementById('lat').value),
      lng: Number(document.getElementById('lng').value)
    },
    speed: Number(document.getElementById('speed').value),
    heading: Number(document.getElementById('heading').value),
    accuracy: 6,
    timestamp: new Date().toISOString()
  };

  socket.emit('driver:location:update', payload, (ack) => {
    addEvent('driver:location:update ack', ack);
  });
});

document.getElementById('saveLocationBtn').addEventListener('click', () => {
  saveDriverLocation().catch((error) => addEvent('driver location save error', { message: error.message }));
});

document.getElementById('statusBtn').addEventListener('click', () => {
  updateDriverStatus().catch((error) => addEvent('driver status update error', { message: error.message }));
});

document.getElementById('refreshStatusBtn').addEventListener('click', () => {
  refreshDriverStatus().catch((error) => addEvent('driver status fetch error', { message: error.message }));
});

document.getElementById('createBookingBtn').addEventListener('click', () => {
  createBooking().catch((error) => addEvent('create booking error', { message: error.message }));
});

document.getElementById('acceptBtn').addEventListener('click', () => {
  bookingAction('accept').catch((error) => addEvent('accept error', { message: error.message }));
});

document.getElementById('startBtn').addEventListener('click', () => {
  bookingAction('start').catch((error) => addEvent('start error', { message: error.message }));
});

document.getElementById('completeBtn').addEventListener('click', () => {
  bookingAction('complete').catch((error) => addEvent('complete error', { message: error.message }));
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  bookingAction('cancel').catch((error) => addEvent('cancel error', { message: error.message }));
});
