import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/create-order', authenticate, PaymentController.createOrder);
router.post('/verify', authenticate, PaymentController.verifyPayment);

router.post('/subscription/create-order', authenticate, PaymentController.createSubscriptionOrder);
router.post('/subscription/verify', authenticate, PaymentController.verifySubscriptionPayment);
router.get('/subscription/history', authenticate, PaymentController.getSubscriptionHistory);
router.get('/subscription/history/all', authenticate, requireRole(['admin']), PaymentController.getAllSubscriptionHistory);

export default router;
