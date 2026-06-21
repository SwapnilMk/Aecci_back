import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { createOpportunityReport, generateReportPdf, getOpportunityReports } from '../controllers/report.controller';

const router = Router();

// Routes
router.get('/', authenticate, getOpportunityReports);
router.post('/', authenticate, createOpportunityReport);
router.get('/:id/pdf', authenticate, generateReportPdf);

export default router;
