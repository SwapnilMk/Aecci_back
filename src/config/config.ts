import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'mongodb://localhost:27017/aecci',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'supersecretaccesskey_change_me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey_change_me',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  AWS_S3_BUCKET_REGION: process.env.AWS_S3_BUCKET_REGION || 'us-east-1',
  AWS_SES_SENDER_EMAIL: process.env.AWS_SES_SENDER_EMAIL || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@example.com',

  // AWS Configuration
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'aecci-uploads',

  // Razorpay Configuration
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyId',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_YourSecret',

  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
};
