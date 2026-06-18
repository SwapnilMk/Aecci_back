import nodemailer from 'nodemailer';
import * as aws from '@aws-sdk/client-ses';
import { config } from './config';

const ses = new aws.SES({
  apiVersion: '2010-12-01',
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

export const transporter = nodemailer.createTransport({
  SES: { ses, aws },
} as any);
