const app = require('./src/app');

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
  console.log(`💳 Payment Service running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/payments/health`);
});