import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.config';
import { InvoiceService } from '../services/invoice.service';
import { prisma } from '../config/db.config';

export const invoiceQueue = new Queue('invoice-queue', { connection: redis as any });

const worker = new Worker('invoice-queue', async job => {
  const { type, payload } = job.data;
  
  if (type === 'generateInvoice') {
    const { invoiceData, userId, sessionId } = payload;
    
    try {
      console.log(`[Worker] Processing generateInvoice for session ${sessionId} and user ${userId}`);
      // 1. Generate and Upload
      const url = await InvoiceService.generateAndUploadInvoice(invoiceData);
      
      // 2. Update Database
      await prisma.sessionRegistration.update({
        where: { userId_sessionId: { userId, sessionId } },
        data: { invoiceUrl: url }
      });
      
      console.log(`[Worker] Successfully generated invoice: ${url}`);
    } catch (error) {
      console.error(`[Worker] Error generating invoice for session ${sessionId}:`, error);
      throw error; // Let BullMQ handle retries
    }
  } else if (type === 'generateSubscriptionInvoice') {
    const { invoiceData, userId, purchaseId } = payload;
    try {
      console.log(`[Worker] Processing generateSubscriptionInvoice for purchase ${purchaseId} and user ${userId}`);
      // 1. Generate and Upload
      const url = await InvoiceService.generateAndUploadInvoice(invoiceData);
      
      // 2. Update Database
      await prisma.subscriptionPurchase.update({
        where: { id: purchaseId },
        data: { invoiceUrl: url }
      });
      
      console.log(`[Worker] Successfully generated subscription invoice: ${url}`);
    } catch (error) {
      console.error(`[Worker] Error generating subscription invoice for purchase ${purchaseId}:`, error);
      throw error;
    }
  }
}, { connection: redis as any });

worker.on('completed', job => {
  console.log(`Job ${job.id} of type ${job.data.type} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
