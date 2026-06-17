import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '../config/config';
import { emailTemplates } from '../utils/emailTemplates';

const sesClient = new SESv2Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

export class EmailService {
  async sendOTP(email: string, name: string, otp: string) {
    const template = emailTemplates.otpEmail(name, otp);
    await this.sendMail(email, template.subject, template.text);
  }

  async sendRegistrationSubmitted(email: string, name: string, referenceId: string) {
    const template = emailTemplates.registrationSubmitted(name, referenceId);
    await this.sendMail(email, template.subject, template.text);
  }

  private async sendMail(to: string, subject: string, text: string) {
    if (!config.AWS_SES_SENDER_EMAIL) {
      console.warn('AWS_SES_SENDER_EMAIL is not set. Skipping email send.');
      console.log(`[Mock Email intended for ${to}]\nSubject: ${subject}\n\n${text}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: config.AWS_SES_SENDER_EMAIL,
        to,
        subject,
        text,
      });
      console.log(`Email successfully sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      // Depending on requirements, we might want to throw error or just log it
      // throw new Error('Failed to send email');
    }
  }
}

export const emailService = new EmailService();
