import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/create-order', authenticate, PaymentController.createOrder);
router.post('/verify', authenticate, PaymentController.verifyPayment);

export default router;
