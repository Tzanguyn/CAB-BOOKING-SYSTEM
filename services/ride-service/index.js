const app = require('./src/app');

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
  console.log(`🚕 Ride Service running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/rides/health`);
});