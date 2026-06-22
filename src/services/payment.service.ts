import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/config';

// Make sure to add these to config
const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID || 'test_key',
  key_secret: config.RAZORPAY_KEY_SECRET || 'test_secret',
});

export class PaymentService {
  static async createOrder(amount: number, receiptId: string, currency = 'USD') {
    const options = {
      amount: amount * 100, // Amount in smallest currency unit (paise for INR, cents for USD)
      currency: currency,
      receipt: receiptId,
    };
    
    try {
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error("Razorpay order creation failed:", error);
      throw error;
    }
  }

  static verifySignature(orderId: string, paymentId: string, signature: string) {
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(text)
      .digest('hex');

    return expectedSignature === signature;
  }
}
