import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Admin-only: list all users
router.get('/', authenticate, requireRole(['admin']), UserController.getUsers);

// Admin-only: get user by ID
router.get('/:id', authenticate, requireRole(['admin']), UserController.getUserById);

// Admin-only: update verification status
router.patch('/:id/verification', authenticate, requireRole(['admin']), UserController.updateVerificationStatus);

export default router;
