import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Only authenticated users (admins) can fetch users
router.get('/', authenticate, UserController.getUsers);

router.get('/:id', authenticate, UserController.getUserById);

// Only authenticated users (admins) can update KYC status
router.patch('/:id/kyc', authenticate, UserController.updateKycStatus);

// Post-onboarding routes
router.post('/:id/assign-partner', authenticate, UserController.assignPartner);
router.post('/:id/pricing', authenticate, UserController.setPricing);
router.post('/:id/payment', authenticate, UserController.processPayment);

export default router;
