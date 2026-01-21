const app = require('./src/app');

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`📢 Notification Service running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/notifications/health`);
});