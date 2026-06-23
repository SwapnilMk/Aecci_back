import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Admin-only: list all users
router.get('/', authenticate, requireRole(['admin']), UserController.getUsers);

// Admin-only: get user by ID
router.get('/:id', authenticate, requireRole(['admin']), UserController.getUserById);

// Admin-only: update KYC status
router.patch('/:id/kyc', authenticate, requireRole(['admin']), UserController.updateKycStatus);

export default router;
