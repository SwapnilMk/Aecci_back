import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { InvoiceService } from '../services/invoice.service';
import { invoiceQueue } from '../queues/invoice.queue';
import { prisma } from '../config/db.config';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const PLANS_CONFIG: Record<string, { price: number; slots: number; validityDays: number; description: string }> = {
  explorer: {
    price: 3999,
    slots: 1,
    validityDays: 30,
    description: "AECCI Global Deal Room Explorer Plan"
  },
  growth: {
    price: 14999,
    slots: 4,
    validityDays: 90,
    description: "AECCI Global Deal Room Growth Plan"
  },
  market_entry: {
    price: 44999,
    slots: 8,
    validityDays: 180,
    description: "AECCI Global Deal Room Market Entry Plan"
  },
  enterprise: {
    price: 150000,
    slots: 9999,
    validityDays: 365,
    description: "AECCI Global Deal Room Enterprise Plan"
  }
};

export class PaymentController {
  static async createOrder(req: Request, res: Response) {
    try {
      const { sessionId, userId } = req.body;
      
      if (!sessionId || !userId) {
        return res.status(400).json({ success: false, message: 'Session ID and User ID are required' });
      }

      // 1. Get Session Price
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }

      // 2. Create Razorpay Order
      const receiptId = `rcpt_${uuidv4().split('-')[0]}`;
      const order = await PaymentService.createOrder(session.price, receiptId, 'INR');

      // 3. Return Order ID to frontend
      res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      });

    } catch (error) {
      console.error('Error in createOrder:', error);
      res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
  }

  static async verifyPayment(req: Request, res: Response) {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        sessionId,
        userId
      } = req.body;

      // 1. Verify Signature
      const isValid = PaymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      // 2. Update Database to record payment success
      // First ensure the user exists and session exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const session = await prisma.session.findUnique({ where: { id: sessionId } });

      if (!user || !session) {
        return res.status(404).json({ success: false, message: 'User or Session not found during verification' });
      }

      await prisma.$transaction(async (tx) => {
        const existingReg = await tx.sessionRegistration.findUnique({
          where: { userId_sessionId: { userId, sessionId } }
        });

        if (!existingReg) {
          await tx.sessionRegistration.create({
            data: {
              userId,
              sessionId,
              paymentStatus: 'paid',
              paymentReference: razorpay_payment_id,
            }
          });

          await tx.session.update({
            where: { id: sessionId },
            data: { seatsAvailable: { decrement: 1 } }
          });
        } else {
          await tx.sessionRegistration.update({
            where: { userId_sessionId: { userId, sessionId } },
            data: { paymentStatus: 'paid', paymentReference: razorpay_payment_id }
          });
        }
      });

      // Update User kycStatus if they were pending payment
      if (user.kycStatus === 'pending_verification' || user.kycStatus === 'approved') {
         await prisma.user.update({
           where: { id: userId },
           data: { kycStatus: 'active' }
         });
      }

      // 3. Queue Invoice Generation
      const invoiceData = {
        userName: user.fullName || 'User',
        companyName: user.companyName || '',
        amount: session.price,
        description: `Deal Room Registration: ${session.title} (${session.country})`,
        date: new Date(),
        invoiceId: `INV-${uuidv4().split('-')[0].toUpperCase()}`
      };

      await invoiceQueue.add('generateInvoice', {
        type: 'generateInvoice',
        payload: {
          invoiceData,
          userId,
          sessionId
        }
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
      });

    } catch (error) {
      console.error('Error in verifyPayment:', error);
      res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
  }

  static async createSubscriptionOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { planName } = req.body;
      const userId = req.user.id;

      if (!planName || !PLANS_CONFIG[planName]) {
        return res.status(400).json({ success: false, message: 'Valid planName is required' });
      }

      const plan = PLANS_CONFIG[planName];
      const receiptId = `sub_${uuidv4().split('-')[0]}`;
      const order = await PaymentService.createOrder(plan.price, receiptId, 'INR');

      // Create a pending SubscriptionPurchase record
      await prisma.subscriptionPurchase.create({
        data: {
          userId,
          planName,
          amount: plan.price,
          currency: 'INR',
          paymentStatus: 'pending',
          orderId: order.id,
        }
      });

      res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: 'INR',
      });
    } catch (error) {
      console.error('Error creating subscription order:', error);
      res.status(500).json({ success: false, message: 'Failed to create subscription order' });
    }
  }

  static async verifySubscriptionPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        planName 
      } = req.body;
      const userId = req.user.id;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planName) {
        return res.status(400).json({ success: false, message: 'Missing required payment verification fields' });
      }

      const plan = PLANS_CONFIG[planName];
      if (!plan) {
        return res.status(400).json({ success: false, message: 'Invalid plan selected' });
      }

      // 1. Verify Signature
      const isValid = PaymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      // 2. Find pending purchase
      const pendingPurchase = await prisma.subscriptionPurchase.findFirst({
        where: { orderId: razorpay_order_id, paymentStatus: 'pending' }
      });

      let purchaseId = pendingPurchase?.id;

      // Update SubscriptionPurchase
      if (pendingPurchase) {
        await prisma.subscriptionPurchase.update({
          where: { id: pendingPurchase.id },
          data: {
            paymentStatus: 'paid',
            paymentReference: razorpay_payment_id
          }
        });
      } else {
        // If not found (e.g. timeout or race condition), create it as paid
        const newPurchase = await prisma.subscriptionPurchase.create({
          data: {
            userId,
            planName,
            amount: plan.price,
            currency: 'INR',
            paymentStatus: 'paid',
            orderId: razorpay_order_id,
            paymentReference: razorpay_payment_id
          }
        });
        purchaseId = newPurchase.id;
      }

      // Calculate new expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.validityDays);

      // Get user to fetch name and companyName for invoice
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Update User plan fields — set slots (not increment) to prevent stacking on re-purchase
      // For upgrades, add the difference between new plan and current total
      const currentSlotsTotal = user.slotsTotal || 0;
      const currentSlotsRemaining = user.slotsRemaining || 0;
      const newSlotsTotal = plan.slots;
      // If upgrading, only add the incremental slots; if same/downgrade, set to new plan
      const slotsToAdd = Math.max(newSlotsTotal - currentSlotsTotal, 0);
      const finalSlotsTotal = currentSlotsTotal + slotsToAdd;
      const finalSlotsRemaining = currentSlotsRemaining + slotsToAdd;

      await prisma.user.update({
        where: { id: userId },
        data: {
          planName,
          planActive: true,
          planExpiresAt: expiryDate,
          slotsTotal: finalSlotsTotal,
          slotsRemaining: finalSlotsRemaining,
          kycStatus: user.kycStatus === 'approved' ? 'active' : user.kycStatus,
        }
      });

      // 3. Queue Subscription Invoice Generation
      const invoiceData = {
        userName: user.fullName || 'User',
        companyName: user.companyName || '',
        amount: plan.price,
        description: plan.description,
        date: new Date(),
        invoiceId: `INV-SUB-${uuidv4().split('-')[0].toUpperCase()}`,
        currency: 'INR'
      };

      await invoiceQueue.add('generateSubscriptionInvoice', {
        type: 'generateSubscriptionInvoice',
        payload: {
          invoiceData,
          userId,
          purchaseId
        }
      });

      res.status(200).json({
        success: true,
        message: 'Subscription payment verified successfully',
      });
    } catch (error) {
      console.error('Error verifying subscription payment:', error);
      res.status(500).json({ success: false, message: 'Subscription payment verification failed' });
    }
  }

  static async getSubscriptionHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const history = await prisma.subscriptionPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching subscription history:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch subscription history' });
    }
  }

  static async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

      // Verify webhook signature
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (secret && expectedSig !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }

      const event = req.body;
      const eventType: string = event.event;

      if (eventType === 'payment.captured') {
        const payment = event.payload.payment.entity;
        const orderId: string = payment.order_id;
        const paymentId: string = payment.id;
        const amountPaise: number = payment.amount;

        // Check if this is a subscription order
        const purchase = await prisma.subscriptionPurchase.findFirst({
          where: { orderId, paymentStatus: 'pending' },
        });

        if (purchase) {
          const plan = PLANS_CONFIG[purchase.planName];
          if (!plan) return res.status(200).json({ received: true });

          await prisma.subscriptionPurchase.update({
            where: { id: purchase.id },
            data: { paymentStatus: 'paid', paymentReference: paymentId },
          });

          const user = await prisma.user.findUnique({ where: { id: purchase.userId } });
          if (user) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + plan.validityDays);

            const currentSlotsTotal = user.slotsTotal || 0;
            const currentSlotsRemaining = user.slotsRemaining || 0;
            const slotsToAdd = Math.max(plan.slots - currentSlotsTotal, 0);

            await prisma.user.update({
              where: { id: purchase.userId },
              data: {
                planName: purchase.planName,
                planActive: true,
                planExpiresAt: expiryDate,
                slotsTotal: currentSlotsTotal + slotsToAdd,
                slotsRemaining: currentSlotsRemaining + slotsToAdd,
                kycStatus: user.kycStatus === 'approved' ? 'active' : user.kycStatus,
              },
            });

            const invoiceData = {
              userName: user.fullName || 'User',
              companyName: user.companyName || '',
              amount: amountPaise / 100,
              description: plan.description,
              date: new Date(),
              invoiceId: `INV-SUB-${uuidv4().split('-')[0].toUpperCase()}`,
              currency: 'INR',
            };

            await invoiceQueue.add('generateSubscriptionInvoice', {
              type: 'generateSubscriptionInvoice',
              payload: { invoiceData, userId: purchase.userId, purchaseId: purchase.id },
            });
          }
        }
      }

      if (eventType === 'payment.failed') {
        const payment = event.payload.payment.entity;
        const orderId: string = payment.order_id;
        await prisma.subscriptionPurchase.updateMany({
          where: { orderId, paymentStatus: 'pending' },
          data: { paymentStatus: 'failed' },
        });
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  }

  static async getAllSubscriptionHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 30);
      const search = (req.query.search as string) || '';
      const skip = (page - 1) * limit;

      const userFilter = search
        ? {
            user: {
              OR: [
                { email: { contains: search, mode: 'insensitive' as const } },
                { fullName: { contains: search, mode: 'insensitive' as const } },
                { companyName: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {};

      const [data, total] = await Promise.all([
        prisma.subscriptionPurchase.findMany({
          where: userFilter,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: { fullName: true, email: true, companyName: true },
            },
          },
        }),
        prisma.subscriptionPurchase.count({ where: userFilter }),
      ]);

      res.status(200).json({ success: true, data, total, page, limit });
    } catch (error) {
      console.error('Error fetching all subscription history:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch subscription history' });
    }
  }
}
