const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'cab_booking',
  process.env.DB_USER || 'cab_user',
  process.env.DB_PASS || 'cab_pass123',
  {
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true // soft delete
    }
  }
);

// Test connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Auth Service: Database connection established');

    // Sync models (create tables if not exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Auth Service: Database synchronized');

  } catch (error) {
    console.error('❌ Auth Service: Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB
};