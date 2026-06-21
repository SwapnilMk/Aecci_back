import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { InvoiceService } from '../services/invoice.service';
import { invoiceQueue } from '../queues/invoice.queue';
import { prisma } from '../config/db.config';
import { v4 as uuidv4 } from 'uuid';

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
      const order = await PaymentService.createOrder(session.price, receiptId);

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
}
