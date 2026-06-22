import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Standard Client Routes
router.post('/request', authenticate, SessionController.requestSession);
router.get('/my-sessions', authenticate, SessionController.getMySessions);

// Admin & Partner Routes
router.get('/admin/pending', authenticate, requireRole(['admin']), SessionController.getPendingSessions);
router.patch('/:id/approve', authenticate, requireRole(['admin']), SessionController.approveSession);
router.patch('/:id/reject', authenticate, requireRole(['admin']), SessionController.rejectSession);
router.post('/:id/summary', authenticate, requireRole(['partner', 'admin']), SessionController.submitSessionSummary);

// Group/Legacy Sessions (Keep for backwards compatibility where needed)
router.post('/', authenticate, SessionController.createSession);
router.get('/', authenticate, SessionController.getSessions);
router.get('/:id', authenticate, SessionController.getSessionById);
router.post('/:id/book', authenticate, SessionController.bookSession);

export default router;
