/**
 * Payment Saga Implementation
 * Based on Saga Pattern for distributed transactions
 * Ensures data consistency across payment processing steps
 */

const { v4: uuidv4 } = require('uuid');

class PaymentSaga {
  constructor(paymentId, rabbitMQClient) {
    this.paymentId = paymentId;
    this.rabbitMQClient = rabbitMQClient;
    this.sagaId = uuidv4();
    this.steps = [];
    this.currentStep = 0;
    this.status = 'pending'; // pending, executing, completed, compensating, failed
    this.compensationSteps = [];
  }

  // Add a saga step
  addStep(step) {
    this.steps.push({
      id: uuidv4(),
      name: step.name,
      execute: step.execute,
      compensate: step.compensate,
      data: step.data || {},
      status: 'pending',
      executedAt: null,
      compensatedAt: null
    });
  }

  // Execute the saga
  async execute() {
    this.status = 'executing';

    try {
      // Execute all steps
      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i;
        const step = this.steps[i];

        console.log(`Executing saga step: ${step.name}`);

        // Execute the step
        const result = await step.execute(step.data);
        step.status = 'completed';
        step.executedAt = new Date();
        step.result = result;

        // Publish step completed event
        await this.publishSagaEvent('step_completed', {
          stepId: step.id,
          stepName: step.name,
          result
        });
      }

      this.status = 'completed';

      // Publish saga completed event
      await this.publishSagaEvent('completed', {
        totalSteps: this.steps.length,
        executionTime: Date.now() - this.steps[0]?.executedAt?.getTime()
      });

      return { success: true, sagaId: this.sagaId };

    } catch (error) {
      console.error(`Saga execution failed at step ${this.currentStep}:`, error);
      this.status = 'compensating';

      // Execute compensation steps
      await this.compensate();

      this.status = 'failed';

      // Publish saga failed event
      await this.publishSagaEvent('failed', {
        failedStep: this.steps[this.currentStep]?.name,
        error: error.message,
        compensatedSteps: this.compensationSteps.length
      });

      throw error;
    }
  }

  // Execute compensation for failed steps
  async compensate() {
    console.log('Starting saga compensation...');

    // Compensate in reverse order
    for (let i = this.currentStep; i >= 0; i--) {
      const step = this.steps[i];

      if (step.status === 'completed' && step.compensate) {
        try {
          console.log(`Compensating step: ${step.name}`);

          await step.compensate(step.result);
          step.status = 'compensated';
          step.compensatedAt = new Date();
          this.compensationSteps.push(step.id);

          // Publish compensation completed event
          await this.publishSagaEvent('step_compensated', {
            stepId: step.id,
            stepName: step.name
          });

        } catch (compensationError) {
          console.error(`Compensation failed for step ${step.name}:`, compensationError);

          // Publish compensation failed event
          await this.publishSagaEvent('compensation_failed', {
            stepId: step.id,
            stepName: step.name,
            error: compensationError.message
          });
        }
      }
    }
  }

  // Get saga status
  getStatus() {
    return {
      sagaId: this.sagaId,
      paymentId: this.paymentId,
      status: this.status,
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      completedSteps: this.steps.filter(s => s.status === 'completed').length,
      compensatedSteps: this.compensationSteps.length,
      steps: this.steps.map(step => ({
        id: step.id,
        name: step.name,
        status: step.status,
        executedAt: step.executedAt,
        compensatedAt: step.compensatedAt
      }))
    };
  }

  // Publish saga event
  async publishSagaEvent(eventType, data) {
    if (!this.rabbitMQClient) return;

    try {
      await this.rabbitMQClient.publishEvent(
        'payment-events',
        `saga.${eventType}`,
        {
          type: `Saga${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`,
          sagaId: this.sagaId,
          paymentId: this.paymentId,
          ...data,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to publish saga event:', error);
    }
  }
}

// Payment-specific Saga Implementation
class PaymentProcessingSaga extends PaymentSaga {
  constructor(paymentId, paymentData, rabbitMQClient) {
    super(paymentId, rabbitMQClient);

    this.paymentData = paymentData;

    // Define saga steps for payment processing
    this.definePaymentSteps();
  }

  definePaymentSteps() {
    // Step 1: Validate payment data
    this.addStep({
      name: 'validate_payment',
      execute: this.validatePayment.bind(this),
      compensate: null // No compensation needed for validation
    });

    // Step 2: Reserve funds (for wallet payments)
    if (this.paymentData.method === 'wallet') {
      this.addStep({
        name: 'reserve_wallet_funds',
        execute: this.reserveWalletFunds.bind(this),
        compensate: this.releaseWalletFunds.bind(this)
      });
    }

    // Step 3: Process payment with payment provider
    this.addStep({
      name: 'process_payment',
      execute: this.processPayment.bind(this),
      compensate: this.refundPayment.bind(this)
    });

    // Step 4: Update ride payment status
    this.addStep({
      name: 'update_ride_status',
      execute: this.updateRideStatus.bind(this),
      compensate: this.revertRideStatus.bind(this)
    });

    // Step 5: Confirm payment completion
    this.addStep({
      name: 'confirm_payment',
      execute: this.confirmPayment.bind(this),
      compensate: null // Final step, no compensation
    });
  }

  // Step implementations
  async validatePayment(data) {
    console.log('Validating payment data...');

    const { amount, method, rideId } = this.paymentData;

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    // Validate payment method
    const validMethods = ['cash', 'wallet', 'card', 'bank_transfer'];
    if (!validMethods.includes(method)) {
      throw new Error('Invalid payment method');
    }

    // Validate ride exists and is in correct state
    // This would typically call ride service
    if (!rideId) {
      throw new Error('Ride ID is required');
    }

    // Additional validations based on payment method
    if (method === 'wallet' && !this.paymentData.userId) {
      throw new Error('User ID required for wallet payment');
    }

    if (method === 'card' && !this.paymentData.cardToken) {
      throw new Error('Card token required for card payment');
    }

    return { validated: true, method, amount, rideId };
  }

  async reserveWalletFunds(data) {
    console.log('Reserving wallet funds...');

    const { userId, amount } = this.paymentData;

    // Reserve funds in user wallet
    // This would typically call user service or wallet service
    // For now, we'll simulate the operation

    const reservationId = uuidv4();

    // Simulate API call to wallet service
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if user has sufficient funds
    const userBalance = await this.checkWalletBalance(userId);
    if (userBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Reserve the funds
    await this.reserveFunds(userId, amount, reservationId);

    return {
      reservationId,
      userId,
      amount,
      reservedAt: new Date()
    };
  }

  async releaseWalletFunds(reservationData) {
    console.log('Releasing wallet funds...');

    const { reservationId, userId, amount } = reservationData;

    // Release the reserved funds
    await this.releaseFunds(reservationId);

    return { released: true, reservationId };
  }

  async processPayment(data) {
    console.log('Processing payment with provider...');

    const { method, amount, rideId } = this.paymentData;

    let transactionId;
    let processingResult;

    try {
      switch (method) {
        case 'cash':
          // Cash payments are handled differently
          transactionId = `cash_${uuidv4()}`;
          processingResult = { status: 'completed', cashReceived: amount };
          break;

        case 'wallet':
          // Wallet payment (funds already reserved)
          transactionId = `wallet_${uuidv4()}`;
          processingResult = await this.processWalletPayment(amount);
          break;

        case 'card':
          // Process card payment via Stripe
          transactionId = await this.processCardPayment(amount, this.paymentData.cardToken);
          processingResult = { status: 'completed', transactionId };
          break;

        case 'bank_transfer':
          // Bank transfer (typically async)
          transactionId = `bank_${uuidv4()}`;
          processingResult = await this.initiateBankTransfer(amount);
          break;

        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }

      return {
        transactionId,
        method,
        amount,
        status: 'completed',
        processedAt: new Date(),
        ...processingResult
      };

    } catch (error) {
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  async refundPayment(processingResult) {
    console.log('Refunding payment...');

    const { transactionId, method, amount } = processingResult;

    try {
      switch (method) {
        case 'wallet':
          // Refund to wallet
          await this.refundToWallet(transactionId, amount);
          break;

        case 'card':
          // Refund to card via Stripe
          await this.refundToCard(transactionId, amount);
          break;

        case 'bank_transfer':
          // Reverse bank transfer
          await this.reverseBankTransfer(transactionId);
          break;

        case 'cash':
          // Cash refunds need manual processing
          console.log('Cash refund required:', amount);
          break;
      }

      return { refunded: true, transactionId, amount };

    } catch (error) {
      console.error('Refund failed:', error);
      // In production, this might need manual intervention
      throw error;
    }
  }

  async updateRideStatus(data) {
    console.log('Updating ride payment status...');

    const { rideId } = this.paymentData;
    const { transactionId, method, amount } = data;

    // Update ride payment status
    // This would typically call ride service via message queue
    const updateData = {
      rideId,
      paymentStatus: 'completed',
      paymentMethod: method,
      paymentAmount: amount,
      transactionId,
      paidAt: new Date()
    };

    // Simulate ride service call
    await new Promise(resolve => setTimeout(resolve, 50));

    return updateData;
  }

  async revertRideStatus(rideUpdateData) {
    console.log('Reverting ride payment status...');

    const { rideId } = rideUpdateData;

    // Revert ride payment status
    const revertData = {
      rideId,
      paymentStatus: 'pending',
      paymentMethod: null,
      paymentAmount: 0,
      transactionId: null,
      paidAt: null
    };

    // Simulate ride service call
    await new Promise(resolve => setTimeout(resolve, 50));

    return revertData;
  }

  async confirmPayment(data) {
    console.log('Confirming payment completion...');

    const { transactionId, method, amount } = data;

    // Final confirmation and cleanup
    // Send notifications, update analytics, etc.

    // Publish payment completed event
    if (this.rabbitMQClient) {
      await this.rabbitMQClient.publishEvent(
        'payment-events',
        'payment.completed',
        {
          type: 'PaymentCompleted',
          paymentId: this.paymentId,
          rideId: this.paymentData.rideId,
          userId: this.paymentData.userId,
          amount,
          method,
          transactionId,
          timestamp: new Date().toISOString()
        }
      );
    }

    return {
      confirmed: true,
      paymentId: this.paymentId,
      transactionId,
      completedAt: new Date()
    };
  }

  // Helper methods (would integrate with actual services)

  async checkWalletBalance(userId) {
    // Simulate wallet balance check
    return 100000; // VND
  }

  async reserveFunds(userId, amount, reservationId) {
    // Simulate fund reservation
    console.log(`Reserved ${amount} for user ${userId}, reservation: ${reservationId}`);
  }

  async releaseFunds(reservationId) {
    // Simulate fund release
    console.log(`Released reservation: ${reservationId}`);
  }

  async processWalletPayment(amount) {
    // Simulate wallet payment processing
    await new Promise(resolve => setTimeout(resolve, 200));
    return { status: 'completed', walletDebited: amount };
  }

  async processCardPayment(amount, cardToken) {
    // Simulate Stripe payment processing
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simulate success/failure randomly (for testing)
    if (Math.random() > 0.9) { // 10% failure rate
      throw new Error('Card payment declined');
    }

    return `stripe_${uuidv4()}`;
  }

  async initiateBankTransfer(amount) {
    // Simulate bank transfer initiation
    await new Promise(resolve => setTimeout(resolve, 100));
    return { status: 'pending', transferId: uuidv4() };
  }

  async refundToWallet(transactionId, amount) {
    // Simulate wallet refund
    console.log(`Refunded ${amount} to wallet, transaction: ${transactionId}`);
  }

  async refundToCard(transactionId, amount) {
    // Simulate card refund via Stripe
    console.log(`Refunded ${amount} to card, transaction: ${transactionId}`);
  }

  async reverseBankTransfer(transactionId) {
    // Simulate bank transfer reversal
    console.log(`Reversed bank transfer, transaction: ${transactionId}`);
  }
}

module.exports = {
  PaymentSaga,
  PaymentProcessingSaga
};