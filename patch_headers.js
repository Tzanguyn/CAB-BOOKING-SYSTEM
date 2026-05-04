const fs = require('fs');
const data = JSON.parse(fs.readFileSync('CAB-Booking-System-12-Levels.postman_collection.json', 'utf8'));

data.item.forEach(level => {
  level.item.forEach(req => {
    if (req.request.url.includes('/api/bookings')) {
      // Find if Authorization header exists
      const authHeader = req.request.header.find(h => h.key === 'Authorization');
      if (!authHeader) {
        req.request.header.push({
          key: "Authorization",
          value: "Bearer {{token}}"
        });
      }
    }
  });
});

fs.writeFileSync('CAB-Booking-System-12-Levels.postman_collection.json', JSON.stringify(data, null, 2));
console.log('Headers patched!');
