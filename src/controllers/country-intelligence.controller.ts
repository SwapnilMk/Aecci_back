import { Request, Response } from 'express';
import { prisma } from '../config/db.config';
import { filterIntelligenceByPlan } from '../middlewares/plan.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class CountryIntelligenceController {
  async createBrief(req: Request, res: Response) {
    try {
      const { country, marketOverview, importRequirements, distributionStructure, opportunities, risks } = req.body;
      const brief = await prisma.countryIntelligence.create({
        data: { country, marketOverview, importRequirements, distributionStructure, opportunities, risks }
      });
      res.status(201).json({ success: true, data: brief });
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(400).json({ success: false, message: 'Country Intelligence brief already exists for this country.' });
      } else {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  }

  async getBriefs(req: AuthenticatedRequest, res: Response) {
    try {
      const briefs = await prisma.countryIntelligence.findMany();
      const hasFullAccess = (req as any).hasFullIntelligence ?? (req.user?.role !== 'user');
      res.status(200).json({ success: true, data: filterIntelligenceByPlan(briefs, hasFullAccess) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBriefById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const brief = await prisma.countryIntelligence.findUnique({ where: { id: id as string } });
      if (!brief) return res.status(404).json({ success: false, message: 'Not found' });
      const hasFullAccess = (req as any).hasFullIntelligence ?? (req.user?.role !== 'user');
      res.status(200).json({ success: true, data: filterIntelligenceByPlan(brief, hasFullAccess) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateBrief(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const brief = await prisma.countryIntelligence.update({
        where: { id: id as string },
        data: req.body
      });
      res.status(200).json({ success: true, data: brief });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteBrief(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.countryIntelligence.delete({ where: { id: id as string } });
      res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const countryIntelligenceController = new CountryIntelligenceController();
