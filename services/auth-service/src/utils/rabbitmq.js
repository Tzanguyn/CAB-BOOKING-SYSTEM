const amqp = require('amqplib');

class RabbitMQClient {
  constructor(url) {
    this.url = url || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
    console.log('✅ RabbitMQ connected to:', this.url);
  }

  // --- HÀM CẦN BỔ SUNG 1: Để lắng nghe sự kiện ---
  async subscribeToQueue(queueName, callback) {
    if (!this.channel) await this.connect();
    
    // Đảm bảo queue tồn tại
    await this.channel.assertQueue(queueName, { durable: true });
    
    this.channel.consume(queueName, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        callback(content);
        this.channel.ack(msg); // Xác nhận đã xử lý xong tin nhắn
      }
    });
  }

  // --- HÀM CẦN BỔ SUNG 2: Để gửi sự kiện (nếu AuthEvents dùng publishEvent) ---
  async publishEvent(exchange, routingKey, message) {
    if (!this.channel) await this.connect();
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message))
    );
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

module.exports = RabbitMQClient;