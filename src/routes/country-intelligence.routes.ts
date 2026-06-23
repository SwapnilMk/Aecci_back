import { Router } from 'express';
import { countryIntelligenceController } from '../controllers/country-intelligence.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { requireActivePlan } from '../middlewares/plan.middleware';

const router = Router();

// User reads — require active plan, filter fields by tier
router.get('/', authenticate, requireActivePlan, countryIntelligenceController.getBriefs);
router.get('/:id', authenticate, requireActivePlan, countryIntelligenceController.getBriefById);

// Admin only — full CRUD
router.post('/', authenticate, requireRole(['admin']), countryIntelligenceController.createBrief);
router.put('/:id', authenticate, requireRole(['admin']), countryIntelligenceController.updateBrief);
router.delete('/:id', authenticate, requireRole(['admin']), countryIntelligenceController.deleteBrief);

export default router;
