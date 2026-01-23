#!/usr/bin/env node

/**
 * Review Service - Entry Point
 * CAB Booking System - Review & Rating Microservice
 */

require('dotenv').config();

const app = require('./src/app');
const { connectMongoDB, disconnectMongoDB } = require('./src/config/mongodb');

const PORT = process.env.PORT || 3009;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server; // để reference khi shutdown

// ────────────────────────────────────────────────
// Khởi động server
// ────────────────────────────────────────────────
async function startServer() {
  try {
    console.log('🚀 Bắt đầu khởi động Review Service...');
    console.log(`   Environment : ${NODE_ENV}`);
    console.log(`   Port         : ${PORT}`);
    console.log(`   Timezone     : ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    // Kết nối MongoDB
    console.log('🔌 Đang kết nối MongoDB...');
    await connectMongoDB();
    console.log('✅ MongoDB kết nối thành công');

    // Khởi động Express server
    server = app.listen(PORT, () => {
      console.log('───────────────────────────────────────────────');
      console.log('✅ Review Service đã khởi động thành công!');
      console.log(`   🌐 Listening  : http://localhost:${PORT}`);
      console.log(`   Health check : http://localhost:${PORT}/api/reviews/health`);
      console.log(`   Root info    : http://localhost:${PORT}/`);
      console.log(`   Started at   : ${new Date().toISOString()}`);
      console.log('───────────────────────────────────────────────');
    });

    // Graceful shutdown
    setupGracefulShutdown();

  } catch (err) {
    console.error('❌ Khởi động thất bại:', err.message);
    if (NODE_ENV === 'development') console.error(err.stack);
    process.exit(1);
  }
}

// ────────────────────────────────────────────────
// Graceful Shutdown
// ────────────────────────────────────────────────
function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang tắt dịch vụ an toàn...`);

    const timeout = setTimeout(() => {
      console.error('⏰ Timeout shutdown → buộc thoát');
      process.exit(1);
    }, 15000); // 15 giây tối đa

    try {
      // 1. Đóng HTTP server trước (ngừng nhận request mới)
      if (server) {
        await new Promise((resolve) => server.close(resolve));
        console.log('✅ HTTP server đã đóng');
      }

      // 2. Đóng kết nối database
      await disconnectMongoDB();
      console.log('✅ Kết nối MongoDB đã đóng');

      console.log('👋 Dịch vụ đã tắt thành công');
      clearTimeout(timeout);
      process.exit(0);
    } catch (err) {
      console.error('❌ Lỗi khi tắt dịch vụ:', err);
      clearTimeout(timeout);
      process.exit(1);
    }
  };

  // Các signal phổ biến
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C

  // Xử lý lỗi không catch được
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
}

// ────────────────────────────────────────────────
// Chạy khởi động
// ────────────────────────────────────────────────
startServer();

// ────────────────────────────────────────────────
// Một số warning hữu ích
// ────────────────────────────────────────────────
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') {
    console.warn(`⚠️ Deprecation: ${warning.message}`);
  }
});