import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../config/db.config';

// Plans that get full country intelligence access
const FULL_INTELLIGENCE_PLANS = new Set(['growth', 'market_entry', 'enterprise']);

// Basic intelligence fields available to all active-plan holders (Explorer included)
const BASIC_FIELDS = ['id', 'country', 'marketOverview', 'importRequirements', 'createdAt', 'updatedAt'];

export const requireActivePlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Admins and partners bypass plan checks
    if (req.user.role === 'admin' || req.user.role === 'partner') {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { planActive: true, planExpiresAt: true, planName: true },
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();
    const expired = user.planExpiresAt && user.planExpiresAt < now;

    if (!user.planActive || expired) {
      return res.status(403).json({
        success: false,
        message: 'An active subscription plan is required to access this feature.',
        code: 'PLAN_REQUIRED',
      });
    }

    // Attach plan tier to request for downstream filtering
    (req as any).planName = user.planName;
    (req as any).hasFullIntelligence = FULL_INTELLIGENCE_PLANS.has(user.planName || '');
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error during plan check' });
  }
};

export const filterIntelligenceByPlan = (data: any, hasFullAccess: boolean): any => {
  if (hasFullAccess) return data;

  // Explorer plan: only return basic fields
  if (Array.isArray(data)) {
    return data.map(item => filterFields(item));
  }
  return filterFields(data);
};

function filterFields(item: any): any {
  const filtered: any = {};
  for (const key of BASIC_FIELDS) {
    if (key in item) filtered[key] = item[key];
  }
  return filtered;
}
