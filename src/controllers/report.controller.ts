import { Response } from 'express';
import { prisma } from '../config/db.config';
import puppeteer from 'puppeteer';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

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
    res.status(500).json({ success: false, message: 'Failed to fetch reports', error });
  }
};

export const createOpportunityReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, marketSummary, potentialRoutes, recommendations } = req.body;
    const partnerId = req.user?.id;

    if (!partnerId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Usually partner creates it for a specific user, or maybe it's linked just to sessionId and userId.
    // For now we assume the frontend passes a userId, or we fetch all users registered.
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, message: 'Missing userId' });
      return;
    }

    const report = await prisma.opportunityReport.create({
      data: {
        marketSummary,
        potentialRoutes,
        recommendations,
        userId,
        sessionId,
      }
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create report', error });
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

    // Generate PDF using Puppeteer
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Opportunity Report - ${report.session.title}</title>
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
          <p><strong>Prepared For:</strong> ${report.user.fullName || report.user.companyName}</p>
          <p><strong>Session:</strong> ${report.session.title}</p>
          <p><strong>Target Market:</strong> ${report.session.country}</p>
          <p><strong>Date:</strong> ${new Date(report.session.date).toLocaleDateString()}</p>
        </div>

        <div class="section">
          <h2>Market Summary</h2>
          <p>${report.marketSummary.replace(/\\n/g, '<br/>')}</p>
        </div>

        <div class="section">
          <h2>Potential Routes to Market</h2>
          <p>${report.potentialRoutes.replace(/\\n/g, '<br/>')}</p>
        </div>

        <div class="section">
          <h2>Strategic Recommendations</h2>
          <p>${report.recommendations.replace(/\\n/g, '<br/>')}</p>
        </div>

        <div class="footer">
          <p>This report is confidential and intended solely for the use of the individual or entity to whom it is addressed.</p>
          <p>&copy; ${new Date().getFullYear()} AECCI Hub. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Opportunity_Report_${report.id}.pdf"`);
    res.status(200).send(Buffer.from(pdfBuffer));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate PDF', error });
  }
};
