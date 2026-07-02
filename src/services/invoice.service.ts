import puppeteer from 'puppeteer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/config';
import { s3Client } from '../config/s3.config';

export class InvoiceService {
  static async generateInvoiceHtml(data: {
    userName: string;
    companyName: string;
    amount: number;
    description: string;
    date: Date;
    invoiceId: string;
    currency?: string;
  }): Promise<string> {
    const currencyStr = data.currency || 'USD';
    const symbol = currencyStr === 'INR' ? '₹' : '$';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice</title>
        <style>
          body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #1e3a8a; }
          .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
          table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
          table th, table td { padding: 12px; border-bottom: 1px solid #eee; }
          table th { background: #f9f9f9; font-weight: bold; }
          .total { font-weight: bold; font-size: 18px; color: #1e3a8a; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <h1>AECCI GLOBAL</h1>
              <p>Deal Room Registration</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Invoice #:</strong> ${data.invoiceId}</p>
              <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div class="details">
            <div>
              <strong>Billed To:</strong><br>
              ${data.userName}<br>
              ${data.companyName ? data.companyName : ''}
            </div>
            <div style="text-align: right;">
              <strong>AECCI HQ</strong><br>
              Mumbai, India
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount (${currencyStr})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${data.description}</td>
                <td style="text-align: right;">${symbol}${data.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="text-align: right;"><strong>Total</strong></td>
                <td style="text-align: right;" class="total">${symbol}${data.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 50px; text-align: center; color: #777; font-size: 14px;">
            Thank you for your business.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static async generateAndUploadInvoice(data: any): Promise<string> {
    const html = await this.generateInvoiceHtml(data);
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' as any });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // Upload to S3
    const fileName = `invoices/${data.invoiceId}.pdf`;
    const uploadParams = {
      Bucket: config.AWS_BUCKET_NAME,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ACL: 'public-read' as const,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Return the URL
    return `https://${config.AWS_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${fileName}`;
  }
}
