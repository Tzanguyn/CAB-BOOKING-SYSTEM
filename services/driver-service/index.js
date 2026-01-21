const app = require('./src/app');

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`🚗 Driver Service running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/drivers/health`);
});