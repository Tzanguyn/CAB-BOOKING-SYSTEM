const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
    // Lấy host từ .env hoặc mặc định localhost (vì bạn chạy Node ngoài docker)
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

client.on('error', (err) => console.log('❌ Redis Client Error', err));
client.on('connect', () => console.log('✅ Connected to Redis!'));

// Kết nối ngay lập tức
(async () => {
    await client.connect();
})();

module.exports = client;