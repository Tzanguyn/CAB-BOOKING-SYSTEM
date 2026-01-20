db = db.getSiblingDB('cab_booking');

// Create admin user
db.createUser({
  user: 'cab_admin',
  pwd: 'cab123!@#',
  roles: [
    {
      role: 'readWrite',
      db: 'cab_booking'
    }
  ]
});

// Create collections
db.createCollection('users');
db.createCollection('drivers');
db.createCollection('rides');
db.createCollection('bookings');
db.createCollection('payments');
db.createCollection('reviews');
db.createCollection('notifications');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 }, { unique: true });
db.drivers.createIndex({ "email": 1 }, { unique: true });
db.drivers.createIndex({ "phone": 1 }, { unique: true });
db.drivers.createIndex({ "licenseNumber": 1 }, { unique: true });
db.drivers.createIndex({ "vehicle.licensePlate": 1 }, { unique: true });
db.drivers.createIndex({ "location": "2dsphere" });
db.rides.createIndex({ "userId": 1 });
db.rides.createIndex({ "driverId": 1 });
db.bookings.createIndex({ "userId": 1 });
db.bookings.createIndex({ "driverId": 1 });
db.payments.createIndex({ "userId": 1 });
db.payments.createIndex({ "rideId": 1 });
db.reviews.createIndex({ "subjectId": 1 });
db.reviews.createIndex({ "reviewerId": 1 });

print('MongoDB initialization completed');
