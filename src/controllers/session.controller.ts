import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';

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
}
