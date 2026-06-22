import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class SessionController {
  static async createSession(req: Request, res: Response) {
    try {
      // Basic validation
      const { title, country, date, durationMinutes, seatsTotal, price, partnerId } = req.body;
      if (!title || !country || !date || !durationMinutes || !seatsTotal || price === undefined || !partnerId) {
        return res.status(400).json({ success: false, message: 'Missing required fields for session creation' });
      }

      const session = await SessionService.createSession(req.body);

      res.status(201).json({
        success: true,
        message: 'Session created successfully',
        data: session,
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ success: false, message: 'Failed to create session' });
    }
  }

  static async getSessions(req: Request, res: Response) {
    try {
      const filters = req.query;
      const sessions = await SessionService.getSessions(filters);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
    }
  }

  static async getSessionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await SessionService.getSessionById(id as string);

      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch session' });
    }
  }

  static async bookSession(req: any, res: Response) {
    try {
      const { id } = req.params; // session id
      const userId = req.user.id;

      const registration = await SessionService.bookSeat(userId, id);

      res.status(200).json({
        success: true,
        message: 'Seat booked successfully',
        data: registration,
      });
    } catch (error: any) {
      console.error('Error booking session:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to book session' });
    }
  }

  static async requestSession(req: AuthenticatedRequest, res: Response) {
    try {
      const clientId = req.user.id;
      const { partnerId, date, questionnaire } = req.body;

      if (!partnerId || !date || !questionnaire) {
        return res.status(400).json({ success: false, message: 'Partner ID, Date, and Questionnaire are required' });
      }

      const session = await SessionService.requestSession(clientId, partnerId, date, questionnaire);

      res.status(201).json({
        success: true,
        message: 'Session request submitted successfully to admin review',
        data: session,
      });
    } catch (error: any) {
      console.error('Error requesting session:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to request session' });
    }
  }

  static async getMySessions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const sessions = await SessionService.getClientSessions(userId);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error: any) {
      console.error('Error fetching my sessions:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
    }
  }

  static async approveSession(req: Request, res: Response) {
    try {
      const { id } = req.params; // session id
      const session = await SessionService.approveSession(id as string);

      res.status(200).json({
        success: true,
        message: 'Session approved and scheduled successfully',
        data: session,
      });
    } catch (error: any) {
      console.error('Error approving session:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to approve session' });
    }
  }

  static async rejectSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await SessionService.rejectSession(id as string);

      res.status(200).json({
        success: true,
        message: 'Session booking request rejected successfully',
        data: session,
      });
    } catch (error: any) {
      console.error('Error rejecting session:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to reject session' });
    }
  }

  static async getPendingSessions(req: Request, res: Response) {
    try {
      const sessions = await SessionService.getPendingRequests();

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error: any) {
      console.error('Error fetching pending sessions:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch pending sessions' });
    }
  }

  static async submitSessionSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { summary } = req.body;
      const partnerId = req.user.id;

      if (!summary || !summary.trim()) {
        res.status(400).json({ success: false, message: 'Summary is required' });
        return;
      }

      const session = await SessionService.submitSessionSummary(id as string, partnerId, summary);

      res.status(200).json({
        success: true,
        message: 'Post-session summary submitted successfully',
        data: session,
      });
    } catch (error: any) {
      console.error('Error submitting session summary:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to submit session summary' });
    }
  }
}
