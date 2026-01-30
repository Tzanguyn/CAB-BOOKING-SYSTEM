const mongoose = require('mongoose');
const app = require('./src/app');
const { connectRabbitMQ } = require('./src/saga/paymentSaga');

const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGODB_URL || 'mongodb://cab_admin:cab_pass123@mongodb:27017/cab_booking?authSource=admin';

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`🚀 Payment Service chạy tại: ${PORT}`);
      connectRabbitMQ().catch(err => console.error(err));
    });
  } catch (error) {
    process.exit(1);
  }
}
startServer();