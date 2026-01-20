require('dotenv').config();

const app = require('./src/app');
const { connectMongoDB } = require('./src/config/mongodb');
const { connectRedis } = require('./src/config/redis');

const PORT = process.env.PORT || 3010;

async function startServer() {
	try {
		console.log('🚀 Starting User Service...');

		await connectMongoDB();
		await connectRedis();

		const server = app.listen(PORT, () => {
			console.log('✅ User Service started successfully!');
			console.log(`🌐 Server running on port ${PORT}`);
			console.log(`📊 Health check: http://localhost:${PORT}/api/users/health`);
		});

		server.on('error', (error) => {
			console.error('❌ User Service server error:', error);
			process.exit(1);
		});

		const gracefulShutdown = async (signal) => {
			console.log(`\n🛑 Received ${signal}, shutting down...`);
			server.close(() => process.exit(0));

			setTimeout(() => {
				console.error('❌ Forced shutdown after timeout');
				process.exit(1);
			}, 10000);
		};

		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => gracefulShutdown('SIGINT'));

		process.on('uncaughtException', (error) => {
			console.error('Uncaught Exception:', error);
			gracefulShutdown('uncaughtException');
		});

		process.on('unhandledRejection', (reason, promise) => {
			console.error('Unhandled Rejection at:', promise, 'reason:', reason);
			gracefulShutdown('unhandledRejection');
		});
	} catch (error) {
		console.error('❌ Failed to start User Service:', error);
		process.exit(1);
	}
}

startServer();