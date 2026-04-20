const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cab-booking-rides';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create indexes
    const db = mongoose.connection.db;
    const rides = db.collection('rides');
    
    console.log('📊 Creating indexes...');
    
    // Remove legacy geo indexes that were created on non-GeoJSON fields
    const indexes = await rides.indexes();
    const dropIfExists = async (name) => {
      if (indexes.some((index) => index.name === name)) {
        await rides.dropIndex(name);
        console.log(`🧹 Dropped legacy index: ${name}`);
      }
    };

    await dropIfExists('pickup.coordinates_2dsphere');
    await dropIfExists('destination.coordinates_2dsphere');

    // Backfill GeoJSON points from legacy coordinates
    await rides.updateMany(
      {
        'pickup.coordinates.lat': { $type: 'number' },
        'pickup.coordinates.lng': { $type: 'number' }
      },
      [
        {
          $set: {
            'pickup.geo': {
              type: 'Point',
              coordinates: ['$pickup.coordinates.lng', '$pickup.coordinates.lat']
            }
          }
        }
      ]
    );

    await rides.updateMany(
      {
        'destination.coordinates.lat': { $type: 'number' },
        'destination.coordinates.lng': { $type: 'number' }
      },
      [
        {
          $set: {
            'destination.geo': {
              type: 'Point',
              coordinates: ['$destination.coordinates.lng', '$destination.coordinates.lat']
            }
          }
        }
      ]
    );

    await rides.updateMany(
      {
        'currentLocation.coordinates.lat': { $type: 'number' },
        'currentLocation.coordinates.lng': { $type: 'number' }
      },
      [
        {
          $set: {
            'currentLocation.geo': {
              type: 'Point',
              coordinates: ['$currentLocation.coordinates.lng', '$currentLocation.coordinates.lat']
            }
          }
        }
      ]
    );

    // Create indexes for rides collection
    await rides.createIndex({ rideId: 1 }, { unique: true });
    await rides.createIndex({ userId: 1, createdAt: -1 });
    await rides.createIndex({ driverId: 1, createdAt: -1 });
    await rides.createIndex({ status: 1, createdAt: -1 });
    await rides.createIndex({ 'pickup.geo': '2dsphere' });
    await rides.createIndex({ 'destination.geo': '2dsphere' });
    await rides.createIndex({ 'currentLocation.geo': '2dsphere' });
    await rides.createIndex({ 'timing.requestedAt': -1 });
    await rides.createIndex({ 'payment.status': 1 });
    await rides.createIndex({ 'emergency.isEmergency': 1 });
    
    console.log('✅ Indexes created successfully');
    
    // Create sample data for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Creating sample data...');
      
      const sampleRide = {
        rideId: 'sample_ride_001',
        userId: 'sample_user_001',
        userDetails: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com'
        },
        status: 'completed',
        pickup: {
          address: '123 Main Street',
          coordinates: {
            lat: 10.762622,
            lng: 106.660172
          }
        },
        destination: {
          address: '456 Park Avenue',
          coordinates: {
            lat: 10.792622,
            lng: 106.690172
          }
        },
        route: {
          distance: 5000,
          duration: 1200,
          actualDistance: 5200,
          actualDuration: 1250
        },
        pricing: {
          vehicleType: 'standard',
          baseFare: 10000,
          distanceFare: 45000,
          timeFare: 25000,
          estimatedFare: 80000,
          finalFare: 82000,
          surgeMultiplier: 1.0
        },
        payment: {
          status: 'completed',
          method: 'wallet',
          paidAt: new Date()
        },
        timing: {
          requestedAt: new Date(Date.now() - 3600000),
          startedAt: new Date(Date.now() - 3500000),
          completedAt: new Date(Date.now() - 3400000)
        }
      };
      
      sampleRide.pickup.geo = {
        type: 'Point',
        coordinates: [sampleRide.pickup.coordinates.lng, sampleRide.pickup.coordinates.lat]
      };
      sampleRide.destination.geo = {
        type: 'Point',
        coordinates: [sampleRide.destination.coordinates.lng, sampleRide.destination.coordinates.lat]
      };

      await rides.updateOne(
        { rideId: sampleRide.rideId },
        { $set: sampleRide },
        { upsert: true }
      );
      
      console.log('✅ Sample data created');
    }
    
    await mongoose.disconnect();
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();