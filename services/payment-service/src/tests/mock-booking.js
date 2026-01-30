const amqp = require('amqplib');

async function test() {
  try {
    // THAY ĐỔI TẠI ĐÂY: Đảm bảo user và pass khớp 100% với tài khoản bạn vừa login web
    const USER = 'cab_admin';
    const PASS = 'cab123!@#'; 
    const HOST = 'localhost:5672';
    const VHOST = 'cab-booking'; // Kiểm tra xem bạn có tạo vhost này không, nếu không thì để trống hoặc '/'

    const url = `amqp://${USER}:${encodeURIComponent(PASS)}@${HOST}/${VHOST}`;
    
    console.log("⏳ Đang thử kết nối tới RabbitMQ...");
    const conn = await amqp.connect(url);
    const ch = await conn.createChannel();
    
    const exchange = 'booking-events';
    const routingKey = 'booking.created';
    
    const data = { 
      id: "RIDE-" + Date.now(), 
      userId: "USER_TEST", 
      totalFare: 50000,
      paymentMethod: "card"
    };

    await ch.assertExchange(exchange, 'topic', { durable: true });
    ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)));
    
    console.log("📤 [SUCCESS] Đã bắn đơn hàng giả lập!");
    setTimeout(() => process.exit(), 500);
  } catch (err) {
    console.error("❌ Lỗi kết nối:", err.message);
    console.log("💡 Gợi ý: Kiểm tra lại User/Pass trên giao diện http://localhost:15672");
  }
}
test();