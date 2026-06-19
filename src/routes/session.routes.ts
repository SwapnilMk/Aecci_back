import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Sessions are typically managed by Admins or Partners, but viewed by users
// For now, we'll assume authentication is required to access any deal room session route
router.post('/', authenticate, SessionController.createSession);
router.get('/', authenticate, SessionController.getSessions);
router.get('/:id', authenticate, SessionController.getSessionById);

export default router;
