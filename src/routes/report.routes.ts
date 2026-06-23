import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { createOpportunityReport, generateReportPdf, getAllReports, getOpportunityReports, uploadReportPdf } from '../controllers/report.controller';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// User: fetch own reports
router.get('/', authenticate, requireRole(['user']), getOpportunityReports);

// Admin: fetch all reports
router.get('/all', authenticate, requireRole(['admin']), getAllReports);

// Admin/Partner: create report entry
router.post('/', authenticate, requireRole(['admin', 'partner']), createOpportunityReport);

// Admin: upload final PDF and deliver to user
router.patch('/:id/upload', authenticate, requireRole(['admin']), upload.single('pdf'), uploadReportPdf);

// User/Admin/Partner: stream generated PDF
router.get('/:id/pdf', authenticate, generateReportPdf);

export default router;
