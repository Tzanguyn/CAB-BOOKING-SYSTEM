const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// ─── Config & DB ─────────────────────────────────────────────────────────────
const { connectMongoDB, disconnectMongoDB, checkMongoDBHealth } = require('./config/mongodb');

// ─── Routes & Controller ─────────────────────────────────────────────────────
const reviewRoutes = require('./routes/reviewRoutes');
const ReviewController = require('./controllers/reviewController');

const app = express();
const reviewController = new ReviewController();

// ─── Middleware Stack ────────────────────────────────────────────────────────

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Tắt CSP vì đây là pure API
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Compression (giảm bandwidth)
app.use(compression());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://localhost:8080', 'https://your-frontend-domain.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Role', 'X-Requested-With']
  })
);

// Logging (dev: chi tiết, prod: ngắn gọn)
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: () => process.env.NODE_ENV === 'test'
  })
);

// Body parser - Parse JSON cho tất cả content types (fix Postman text/plain issue)
// Sử dụng type: '*/*' để parse JSON cho mọi content-type
app.use(express.json({ 
  limit: '10mb',
  type: (req) => {
    // Parse JSON cho cả application/json và text/plain
    const contentType = req.get('Content-Type') || '';
    return contentType.includes('json') || contentType.includes('text/plain');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom request logger (có thể thay bằng structured logger sau)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  }
  next();
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/reviews/health', async (req, res) => {
  try {
    const mongoStatus = await checkMongoDBHealth();

    const health = {
      service: 'review-service',
      status: mongoStatus.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: mongoStatus,
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
      }
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (err) {
    res.status(503).json({
      service: 'review-service',
      status: 'error',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/reviews', reviewRoutes);

// ─── Root / Welcome ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Review Service',
    version: process.env.npm_package_version || '1.0.0',
    description: 'API xử lý đánh giá tài xế, hành khách và chuyến đi',
    status: 'running',
    docs: {
      health: 'GET /api/reviews/health',
      swagger: '/api/reviews/docs' // nếu sau này thêm swagger
    }
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy route: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const status = err.status || 500;
  const response = {
    success: false,
    message: status >= 500 ? 'Lỗi hệ thống' : err.message || 'Có lỗi xảy ra',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Xử lý lỗi cụ thể
  if (err.name === 'ValidationError') {
    response.code = 'VALIDATION_ERROR';
    response.errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(response);
  }

  if (err.code === 11000) {
    response.code = 'CONFLICT';
    response.message = 'Dữ liệu đã tồn tại';
    return res.status(409).json(response);
  }

  res.status(status).json(response);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  const shutdownTimeout = setTimeout(() => {
    console.error('Graceful shutdown timeout. Force exit.');
    process.exit(1);
  }, 10000);

  try {
    // Cleanup logic
    await reviewController.cleanup?.();
    await disconnectMongoDB();

    console.log('All resources cleaned up successfully');
    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Unhandled Rejection & Exception ─────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', { promise, reason });
  // Trong production có thể gửi alert (Sentry, etc.)
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// ─── Export app ────────────────────────────────────────────────────────
// Note: Server startup is handled in index.js, not here
// This file only exports the Express app instance

module.exports = app;