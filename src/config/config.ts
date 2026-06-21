import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: process.env.PORT as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  CORS_ORIGIN: process.env.CORS_ORIGIN as string,
  AWS_S3_BUCKET_REGION: process.env.AWS_S3_BUCKET_REGION as string,
  AWS_SES_SENDER_EMAIL: process.env.AWS_SES_SENDER_EMAIL as string,
  EMAIL_FROM: process.env.EMAIL_FROM as string,

  // AWS Configuration
  AWS_REGION: process.env.AWS_REGION as string,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID as string,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY as string,
  AWS_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME as string,

  // Razorpay Configuration
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID as string,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET as string,

  REDIS_URL: process.env.REDIS_URL as string,
};
