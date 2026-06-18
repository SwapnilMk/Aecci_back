import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/send-otp', authController.sendOtp);
router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/refresh-token', authController.refreshToken);
router.patch('/profile', authenticate, authController.updateProfile);

export default router;
