import { Response } from 'express';
import { prisma } from '../config/db.config';
import puppeteer from 'puppeteer';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { emailService } from '../services/email.service';
import { s3Client } from '../config/s3.config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/config';
import { v4 as uuidv4 } from 'uuid';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const getOpportunityReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const reports = await prisma.opportunityReport.findMany({
      where: { userId },
      include: {
        session: { select: { title: true, country: true, partner: { select: { fullName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

export const getAllReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await prisma.opportunityReport.findMany({
      include: {
        session: { select: { title: true, country: true } },
        user: { select: { fullName: true, companyName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

export const createOpportunityReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, marketSummary, potentialRoutes, recommendations, userId } = req.body;
    const requesterId = req.user?.id;

    if (!requesterId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!userId) {
      res.status(400).json({ success: false, message: 'Missing userId' });
      return;
    }

    const report = await prisma.opportunityReport.create({
      data: { marketSummary, potentialRoutes, recommendations, userId, sessionId }
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create report' });
  }
};

export const uploadReportPdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const report = await prisma.opportunityReport.findUnique({
      where: { id: id as string },
      include: {
        user: { select: { email: true, fullName: true } }
      }
    });

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    // req.file populated by upload middleware
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No PDF file uploaded' });
      return;
    }

    const pdfUrl: string = (file as any).location || file.path;

    await prisma.opportunityReport.update({
      where: { id: id as string },
      data: { pdfUrl }
    });

    // Notify user that their report is ready
    await emailService.sendOpportunityReport(
      report.user.email,
      report.user.fullName || 'Member',
      pdfUrl
    );

    res.status(200).json({ success: true, message: 'Report uploaded and user notified', data: { pdfUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload report' });
  }
};

export const generateReportPdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const report = await prisma.opportunityReport.findUnique({
      where: { id: id as string },
      include: {
        session: { select: { title: true, country: true, date: true } },
        user: { select: { fullName: true, companyName: true } }
      }
    });

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    if (report.userId !== userId && req.user?.role !== 'admin' && req.user?.role !== 'partner') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    // Escape all user-supplied content before interpolating into HTML
    const safeTitle = escapeHtml(report.session.title);
    const safeCountry = escapeHtml(report.session.country);
    const safeName = escapeHtml(report.user.fullName || report.user.companyName || '');
    const safeSummary = escapeHtml(report.marketSummary).replace(/\n/g, '<br/>');
    const safeRoutes = escapeHtml(report.potentialRoutes).replace(/\n/g, '<br/>');
    const safeRecs = escapeHtml(report.recommendations).replace(/\n/g, '<br/>');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Opportunity Report - ${safeTitle}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
          h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
          h2 { color: #2d3748; margin-top: 30px; }
          .header { text-align: center; margin-bottom: 40px; }
          .meta-info { margin-bottom: 30px; background: #f7fafc; padding: 20px; border-radius: 8px; }
          .meta-info p { margin: 5px 0; }
          .section { margin-bottom: 30px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #718096; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Post-Session Opportunity Report</h1>
          <p>Prepared exclusively by AECCI Hub</p>
        </div>
        <div class="meta-info">
          <p><strong>Prepared For:</strong> ${safeName}</p>
          <p><strong>Session:</strong> ${safeTitle}</p>
          <p><strong>Target Market:</strong> ${safeCountry}</p>
          <p><strong>Date:</strong> ${new Date(report.session.date).toLocaleDateString()}</p>
        </div>
        <div class="section">
          <h2>Market Summary</h2>
          <p>${safeSummary}</p>
        </div>
        <div class="section">
          <h2>Potential Routes to Market</h2>
          <p>${safeRoutes}</p>
        </div>
        <div class="section">
          <h2>Strategic Recommendations</h2>
          <p>${safeRecs}</p>
        </div>
        <div class="footer">
          <p>This report is confidential and intended solely for the use of the individual or entity to whom it is addressed.</p>
          <p>&copy; ${new Date().getFullYear()} AECCI Hub. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Opportunity_Report_${report.id}.pdf"`);
    res.status(200).send(Buffer.from(pdfBuffer));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};
