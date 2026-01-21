const app = require('./src/app');

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
  console.log(`💰 Pricing Service running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/pricing/health`);
});