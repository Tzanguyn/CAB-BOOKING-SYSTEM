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

  async ensureDriversTable() {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        driver_id VARCHAR(64) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(32) UNIQUE NOT NULL,
        date_of_birth DATE,
        license_number VARCHAR(100) UNIQUE NOT NULL,
        license_expiry_date DATE,
        vehicle_make VARCHAR(100),
        vehicle_model VARCHAR(100),
        vehicle_year INTEGER,
        vehicle_color VARCHAR(50),
        license_plate VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'offline',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  }

  async createDriver(driverData) {
    await this.ensureDriversTable();

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
      ON CONFLICT (driver_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        date_of_birth = EXCLUDED.date_of_birth,
        license_number = EXCLUDED.license_number,
        license_expiry_date = EXCLUDED.license_expiry_date,
        vehicle_make = EXCLUDED.vehicle_make,
        vehicle_model = EXCLUDED.vehicle_model,
        vehicle_year = EXCLUDED.vehicle_year,
        vehicle_color = EXCLUDED.vehicle_color,
        license_plate = EXCLUDED.license_plate
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
    await this.ensureDriversTable();
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
    try {
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
        console.warn(`⚠️ Invalid coordinates for driver ${driverId}: lat=${lat}, lng=${lng}`);
        return;
      }
      await redisClient.geoAdd(
        'drivers:geo',
        { longitude: numLng, latitude: numLat, member: String(driverId) }
      );
    } catch (err) {
      console.warn(`⚠️ Redis geoAdd error for driver ${driverId}:`, err.message);
    }
  }

  async findNearbyDrivers(lat, lng, radiusKm = 5) {
    if (!redisClient) return [];
    try {
      const numLat = Number(lat);
      const numLng = Number(lng);
      const numRadius = Number(radiusKm);
      if (!Number.isFinite(numLat) || !Number.isFinite(numLng) || !Number.isFinite(numRadius)) {
        console.warn(`⚠️ Invalid params for findNearbyDrivers: lat=${lat}, lng=${lng}, radius=${radiusKm}`);
        return [];
      }
      return await redisClient.geoRadius(
        'drivers:geo',
        { longitude: numLng, latitude: numLat },
        numRadius,
        'km'
      );
    } catch (err) {
      console.warn(`⚠️ Redis geoRadius error:`, err.message);
      return [];
    }
  }
}

module.exports = DriverRepository;
