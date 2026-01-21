const app = require('./src/index');

const PORT = process.env.PORT || 3011;

const server = app.listen(PORT, () => {
  console.log(`🔌 Real-time Socket Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});

module.exports = server;