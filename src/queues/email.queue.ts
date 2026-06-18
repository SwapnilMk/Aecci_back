import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.config';
import { emailService } from '../services/email.service';

export const emailQueue = new Queue('email-queue', { connection: redis as any });

const worker = new Worker('email-queue', async job => {
  const { type, payload } = job.data;
  
  if (type === 'sendOTP') {
    const { email, fullName, otp } = payload;
    await emailService.sendOTP(email, fullName, otp);
  } else if (type === 'sendRegistrationSubmitted') {
    const { email, fullName, userId } = payload;
    await emailService.sendRegistrationSubmitted(email, fullName, userId);
  }
}, { connection: redis as any });

worker.on('completed', job => {
  console.log(`Job ${job.id} of type ${job.data.type} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
