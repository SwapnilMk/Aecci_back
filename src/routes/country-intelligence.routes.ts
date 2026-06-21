import { Router } from 'express';
import { countryIntelligenceController } from '../controllers/country-intelligence.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, countryIntelligenceController.getBriefs);
router.get('/:id', authenticate, countryIntelligenceController.getBriefById);
router.post('/', authenticate, countryIntelligenceController.createBrief); // Admin only conceptually
router.put('/:id', authenticate, countryIntelligenceController.updateBrief); // Admin only
router.delete('/:id', authenticate, countryIntelligenceController.deleteBrief); // Admin only

export default router;
