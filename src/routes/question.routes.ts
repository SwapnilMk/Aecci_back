import { Router } from 'express';
import { questionController } from '../controllers/question.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, questionController.askQuestion);
router.get('/my-questions', authenticate, questionController.getMyQuestions);
router.get('/partner-questions', authenticate, questionController.getPartnerQuestions);
router.put('/:id/answer', authenticate, questionController.answerQuestion);

export default router;
