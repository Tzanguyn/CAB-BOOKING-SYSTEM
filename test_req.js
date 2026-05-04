const http = require('http');

const data = JSON.stringify({
  email: "test@example.com",
  password: "password123"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log("Login Body:", body);
    const token = JSON.parse(body).accessToken;
    console.log("Token:", token ? "Got token" : "Failed");
    
    // Now request booking
    const bookingReq = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, bRes => {
      let bBody = '';
      bRes.on('data', d => bBody += d);
      bRes.on('end', () => {
        console.log("Status:", bRes.statusCode);
        console.log("Body:", bBody);
      });
    });
    
    bookingReq.write(JSON.stringify({customerId: "123", drop: {lat: 10, lng: 106}}));
    bookingReq.end();
  });
});

req.write(data);
req.end();
