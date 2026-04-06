const { Pool } = require('pg');
const redis = require('redis');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/* ================= REDIS SAFE INIT ================= */
let redisClient = null;
const REDIS_ENABLED = !!process.env.REDIS_URL;

if (REDIS_ENABLED) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL
  });

  redisClient.on('error', (err) => {
    console.warn('⚠️ Redis error:', err.message);
  });

  redisClient.connect()
    .then(() => console.log('✅ Redis connected'))
    .catch(() => console.warn('⚠️ Redis connect failed'));
} else {
  console.warn('⚠️ Redis disabled (local dev mode)');
}

class DriverRepository {
  /* ========== DRIVER PROFILE (POSTGRES) ========== */

  async createDriver(driverData) {
    const query = `
      INSERT INTO drivers (
        driver_id, first_name, last_name, email, phone,
        date_of_birth, license_number, license_expiry_date,
        vehicle_make, vehicle_model, vehicle_year,
        vehicle_color, license_plate, status
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,'offline'
      )
      RETURNING *;
    `;

    const values = [
      driverData.driverId,
      driverData.firstName,
      driverData.lastName,
      driverData.email,
      driverData.phone,
      driverData.dateOfBirth,
      driverData.licenseNumber,
      driverData.licenseExpiryDate,
      driverData.vehicle.make,
      driverData.vehicle.model,
      driverData.vehicle.year,
      driverData.vehicle.color,
      driverData.vehicle.licensePlate
    ];

    const { rows } = await pgPool.query(query, values);
    return rows[0];
  }

  async getDriverById(driverId) {
    const { rows } = await pgPool.query(
      'SELECT * FROM drivers WHERE driver_id = $1',
      [driverId]
    );
    return rows[0] || null;
  }

  /* ========== DRIVER STATUS (REDIS) ========== */

  async setDriverStatus(driverId, status) {
    if (!redisClient) return;
    await redisClient.set(
      `driver:${driverId}:status`,
      status,
      { EX: 60 } // heartbeat TTL
    );
  }

  async getDriverStatus(driverId) {
    if (!redisClient) return 'offline';
    return await redisClient.get(`driver:${driverId}:status`) || 'offline';
  }

  /* ========== DRIVER LOCATION (REDIS GEO) ========== */

  async updateDriverLocation(driverId, lat, lng) {
    if (!redisClient) return;
    await redisClient.geoAdd(
      'drivers:geo',
      { longitude: lng, latitude: lat, member: driverId }
    );
  }

  async findNearbyDrivers(lat, lng, radiusKm = 5) {
    if (!redisClient) return [];
    return await redisClient.geoRadius(
      'drivers:geo',
      { longitude: lng, latitude: lat },
      radiusKm,
      'km'
    );
  }
}

module.exports = DriverRepository;
