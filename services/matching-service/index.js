const app = require('./src/app');
const { initMessageBroker } = require('./src/config/messageBroker');

const PORT = process.env.PORT || 3014;

const startServer = async () => {
  try {
    // Initialize Message Broker and Matching Consumer
    const { matchingConsumer } = await initMessageBroker();
    console.log('✅ Matching Consumer initialized');

    app.listen(PORT, () => {
      console.log(`🚀 Matching Service running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/api/matching/health`);
    });
  } catch (error) {
    console.error('❌ Error starting Matching Service:', error.message);
    process.exit(1);
  }
};

startServer();
