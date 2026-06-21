import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/db.config';

export class QuestionController {
  async askQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const { type, content, sessionId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Find user to get their assigned partner
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const question = await prisma.question.create({
        data: {
          type,
          content,
          userId,
          partnerId: user.partnerId || null,
          sessionId: sessionId || null,
          status: 'pending'
        }
      });

      res.status(201).json({ success: true, data: question });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMyQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const questions = await prisma.question.findMany({
        where: { userId },
        include: {
          partner: {
            select: { fullName: true, companyName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ success: true, data: questions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPartnerQuestions(req: AuthenticatedRequest, res: Response) {
    try {
      const partnerId = req.user?.id;
      if (!partnerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const questions = await prisma.question.findMany({
        where: { partnerId },
        include: {
          user: {
            select: { fullName: true, companyName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ success: true, data: questions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async answerQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const partnerId = req.user?.id;
      const { id } = req.params;
      const { answer } = req.body;

      if (!partnerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const question = await prisma.question.findUnique({ where: { id: id as string } });
      if (!question || question.partnerId !== partnerId) {
        return res.status(403).json({ success: false, message: 'Forbidden or not found' });
      }

      const updated = await prisma.question.update({
        where: { id: id as string },
        data: { answer, status: 'answered' }
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const questionController = new QuestionController();
