const app = require('./src/app');

const PORT = process.env.PORT || 3011;

app.listen(PORT, () => {
  console.log(`⏱️ ETA Service running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/eta/health`);
});
