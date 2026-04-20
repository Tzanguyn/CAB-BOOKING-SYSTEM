const { createRealtimeServer } = require('./src/index');

const PORT = Number(process.env.PORT || 3011);

async function bootstrap() {
  const { server } = await createRealtimeServer();

  server.listen(PORT, () => {
    console.log(`🔌 Real-time Socket Server running on port ${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  });

  return server;
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start realtime socket server:', error.message);
  process.exit(1);
});