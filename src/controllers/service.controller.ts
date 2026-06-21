import { Response } from 'express';
import { prisma } from '../config/db.config';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getServices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // In a real app we might fetch these from a Catalog model, but for now we return static data
    const services = [
      { id: 'advisory', name: 'Strategic Advisory', price: 500, description: '1-on-1 consultation for market strategy.' },
      { id: 'documentation', name: 'Compliance & Documentation', price: 300, description: 'Assistance with required export/import documents.' },
      { id: 'partner-coordination', name: 'Partner Coordination', price: 400, description: 'Direct introductions and negotiation support with local partners.' },
      { id: 'market-entry', name: 'Market Entry Execution', price: 1500, description: 'End-to-end support for launching in the target market.' },
    ];
    
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch services', error });
  }
};

export const purchaseService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { serviceType, price } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const purchase = await prisma.servicePurchase.create({
      data: {
        serviceType,
        price,
        userId,
        paymentStatus: 'pending'
      }
    });

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create service purchase', error });
  }
};

export const getUserPurchases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const purchases = await prisma.servicePurchase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user purchases', error });
  }
};
