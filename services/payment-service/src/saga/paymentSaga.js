/**
 * Payment Saga Implementation
 * Giải pháp xử lý triệt để lỗi Parallel Save & Missing Provider
 */

const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');
const Payment = require('../models/Payment');
const { calculateExponentialBackoffDelay } = require('../../../../shared/utils/retryPolicy');

let rabbitConnectAttempts = 0;

class PaymentSaga {
  constructor(paymentId, rabbitMQClient) {
    this.paymentId = paymentId;
    this.rabbitMQClient = rabbitMQClient;
    this.sagaId = uuidv4();
    this.steps = [];
    this.currentStep = 0;
    this.status = 'pending';
  }

  addStep(step) {
    this.steps.push({
      id: uuidv4(),
      name: step.name,
      execute: step.execute,
      compensate: step.compensate,
      status: 'pending'
    });
  }

  async execute() {
    this.status = 'executing';
    try {
      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i;
        const step = this.steps[i];
        console.log(`[Saga] Đang thực thi: ${step.name}`);
        await step.execute();
        step.status = 'completed';
      }
      this.status = 'completed';
      return { success: true };
    } catch (error) {
      console.error(`[Saga] Lỗi tại bước ${this.currentStep}:`, error.message);
      await this.compensate();
      this.status = 'failed';
      throw error;
    }
  }

  async compensate() {
    for (let i = this.currentStep; i >= 0; i--) {
      const step = this.steps[i];
      if (step.status === 'completed' && step.compensate) {
        try { await step.compensate(); } catch (err) { console.error(`[Saga] Lỗi hoàn tác:`, err.message); }
      }
    }
  }
}

async function connectRabbitMQ() {
  const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://cab_admin:cab123!@#@rabbitmq:5672/cab-booking';

  try {
    const connection = await amqp.connect(RABBIT_URL);
    rabbitConnectAttempts = 0;
    const channel = await connection.createChannel();

    await channel.assertExchange('booking-events', 'topic', { durable: true });
    await channel.assertExchange('payment-events', 'topic', { durable: true });

    const q = await channel.assertQueue('payment-service-queue', { durable: true });
    channel.bindQueue(q.queue, 'booking-events', 'booking.created');

    console.log('📡 [Payment Service] Sẵn sàng xử lý thanh toán...');

    channel.consume(q.queue, async (msg) => {
      if (msg === null) return;

      try {
        const bookingData = JSON.parse(msg.content.toString());
        const rideId = bookingData.id;

        // BƯỚC QUAN TRỌNG NHẤT: ATOMIC UPSERT
        // Nếu đã có rideId, nó sẽ KHÔNG tạo mới. Nếu chưa có, nó sẽ tạo mới TRONG 1 LỆNH DUY NHẤT.
        const paymentDoc = await Payment.findOneAndUpdate(
          { rideId: rideId }, // Điều kiện tìm kiếm
          { 
            $setOnInsert: { // Chỉ set các giá trị này nếu là tạo mới (Insert)
              paymentId: `PAY-${uuidv4().substring(0, 8)}`,
              userId: bookingData.userId || 'system',
              amount: bookingData.totalFare || 0,
              method: bookingData.paymentMethod || 'card',
              provider: (bookingData.paymentMethod === 'cash') ? 'cash' : 'stripe',
              status: 'pending'
            }
          },
          { upsert: true, new: true, rawResult: true } 
        );

        // Kiểm tra xem đây là bản ghi mới tạo hay bản ghi cũ đã tồn tại
        if (paymentDoc.lastErrorObject && !paymentDoc.lastErrorObject.updatedExisting) {
          console.log(`💳 Khởi tạo thanh toán mới cho RideID: ${rideId}`);
          
          const payment = paymentDoc.value;
          
          // Tính phí và cập nhật trạng thái processing
          payment.calculateFees();
          await payment.startProcessing();

          // Chạy Saga
          const saga = new PaymentSaga(payment.paymentId);
          saga.addStep({
            name: 'deduct_balance',
            execute: async () => true,
            compensate: async () => await payment.refund()
          });

          await saga.execute();

          // Hoàn tất
          await payment.completeProcessing(`TXN-${Date.now()}`);
          
          channel.publish('payment-events', 'payment.succeeded', 
            Buffer.from(JSON.stringify({ bookingId: rideId, status: 'paid' }))
          );
          
          console.log(`✅ Thành công: ${payment.paymentId}`);
        } else {
          console.log(`⚠️ Bỏ qua tin nhắn trùng cho RideID: ${rideId}`);
        }

      } catch (err) {
        console.error('❌ Lỗi xử lý:', err.message);
      } finally {
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('❌ Lỗi kết nối RabbitMQ:', error.message);
    rabbitConnectAttempts += 1;
    const reconnectDelayMs = calculateExponentialBackoffDelay(rabbitConnectAttempts, {
      initialDelayMs: Number(process.env.PAYMENT_RABBIT_RECONNECT_INITIAL_MS || 2000),
      maxDelayMs: Number(process.env.PAYMENT_RABBIT_RECONNECT_MAX_MS || 30000),
      multiplier: Number(process.env.PAYMENT_RABBIT_RECONNECT_MULTIPLIER || 2),
      jitterRatio: Number(process.env.PAYMENT_RABBIT_RECONNECT_JITTER_RATIO || 0.15)
    });
    console.warn(`↻ Retry RabbitMQ connection in ${reconnectDelayMs}ms (attempt ${rabbitConnectAttempts})`);
    setTimeout(connectRabbitMQ, reconnectDelayMs);
  }
}

module.exports = { connectRabbitMQ };