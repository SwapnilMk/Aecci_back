import { Router } from 'express';
import { questionController } from '../controllers/question.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Users submit questions
router.post('/', authenticate, requireRole(['user']), questionController.askQuestion);
router.get('/my-questions', authenticate, requireRole(['user']), questionController.getMyQuestions);

// Partners view and answer questions assigned to them
router.get('/partner-questions', authenticate, requireRole(['partner']), questionController.getPartnerQuestions);
router.put('/:id/answer', authenticate, requireRole(['partner']), questionController.answerQuestion);

export default router;
