import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
      const { role, userType, kycStatus, partnerId } = req.query;
      
      const filters = {
        role: role as string,
        userType: userType as string,
        kycStatus: kycStatus as string,
        partnerId: partnerId as string,
      };

      const users = await UserService.getUsers(filters);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id as string);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  }

  static async updateKycStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { kycStatus } = req.body;

      const allowedStatuses = [
        'pending', 
        'approved_pending_assignment', 
        'assigned_pending_pricing', 
        'priced_pending_payment', 
        'active', 
        'rejected'
      ];
      if (!allowedStatuses.includes(kycStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid kycStatus' });
      }

      const updatedUser = await UserService.updateKycStatus(id as string, kycStatus);

      res.status(200).json({
        success: true,
        message: `User KYC status updated to ${kycStatus}`,
        data: updatedUser,
      });
    } catch (error) {
      console.error('Error updating KYC status:', error);
      res.status(500).json({ success: false, message: 'Failed to update KYC status' });
    }
  }

  static async assignPartner(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { partnerId } = req.body;
      
      if (!partnerId) {
        return res.status(400).json({ success: false, message: 'partnerId is required' });
      }

      const updatedUser = await UserService.assignPartner(id as string, partnerId as string);

      res.status(200).json({
        success: true,
        message: 'Partner assigned successfully',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Error assigning partner:', error);
      res.status(500).json({ success: false, message: 'Failed to assign partner' });
    }
  }

  static async setPricing(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { dealRoomPrice } = req.body;

      if (dealRoomPrice === undefined || dealRoomPrice === null) {
        return res.status(400).json({ success: false, message: 'dealRoomPrice is required' });
      }

      const updatedUser = await UserService.setPricing(id as string, Number(dealRoomPrice));

      res.status(200).json({
        success: true,
        message: 'Pricing set successfully',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Error setting pricing:', error);
      res.status(500).json({ success: false, message: 'Failed to set pricing' });
    }
  }

  static async processPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const updatedUser = await UserService.processPayment(id as string);

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully. Deal Room access granted.',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ success: false, message: 'Failed to process payment' });
    }
  }
}
