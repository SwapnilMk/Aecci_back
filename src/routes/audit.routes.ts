import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { prisma } from '../config/db.config';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Response } from 'express';

const router = Router();

router.get('/', authenticate, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, action, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action as string, mode: 'insensitive' };

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { fullName: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({ success: true, data: logs, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { action, metadata } = req.body;
    if (!action) return res.status(400).json({ success: false, message: 'action is required' });

    const log = await prisma.auditLog.create({
      data: {
        userId,
        action,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
        metadata: metadata || null,
      },
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create audit log' });
  }
});

export default router;
