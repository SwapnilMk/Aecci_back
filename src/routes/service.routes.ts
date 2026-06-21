import { Router } from 'express';
import { getServices, purchaseService, getUserPurchases } from '../controllers/service.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Routes
router.get('/', authenticate, getServices);
router.post('/purchase', authenticate, purchaseService);
router.get('/my-purchases', authenticate, getUserPurchases);

export default router;
