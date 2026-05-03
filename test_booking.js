const http = require('http');

// First register, then login
const registerData = JSON.stringify({
  firstName: "Test",
  lastName: "Customer",
  email: "testcustomer@test.com",
  phone: "0909000001",
  password: "Test1234!",
  role: "customer"
});

function makeRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    const req = http.request({
      hostname: 'localhost', port: 3000,
      path, method, headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: Register customer
  console.log('=== REGISTER CUSTOMER ===');
  const regResult = await makeRequest('/auth/register', 'POST', registerData);
  console.log('Status:', regResult.status);
  console.log('Response:', regResult.body.substring(0, 300));
  
  // Step 2: Login
  console.log('\n=== LOGIN CUSTOMER ===');
  const loginData = JSON.stringify({ email: "testcustomer@test.com", password: "Test1234!" });
  const loginResult = await makeRequest('/auth/login', 'POST', loginData);
  console.log('Status:', loginResult.status);
  console.log('Response:', loginResult.body.substring(0, 300));
  
  const loginParsed = JSON.parse(loginResult.body);
  const token = loginParsed.accessToken || loginParsed.data?.accessToken || loginParsed.token;
  const userId = loginParsed.user?.id || loginParsed.data?.user?.id;
  
  if (!token) {
    console.log('Login failed, full:', loginResult.body.substring(0, 500));
    return;
  }
  
  console.log('Token:', token.substring(0, 30) + '...');
  console.log('UserId:', userId);
  
  // Step 3: Create booking
  console.log('\n=== CREATE BOOKING ===');
  const bookingData = JSON.stringify({
    customerId: userId,
    pickupLocation: { lat: 10.7769, lng: 106.7009, address: '828 Su Van Hanh, Q10' },
    dropoffLocation: { lat: 10.7626, lng: 106.6602, address: 'Bitexco Financial Tower, Q1' },
    distance_km: 5,
    paymentMethod: 'CASH',
    autoAssign: false
  });
  const bookResult = await makeRequest('/api/bookings', 'POST', bookingData, token);
  console.log('Status:', bookResult.status);
  console.log('Response:', bookResult.body.substring(0, 500));
  
  // Step 4: Check socket server logs
  console.log('\n=== Check MqBridge logs via: docker logs cab-booking-realtime-socket --tail 5 ===');
}

main().catch(console.error);
