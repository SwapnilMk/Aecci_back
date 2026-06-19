import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
      const { role, userType, kycStatus } = req.query;
      
      const filters = {
        role: role as string,
        userType: userType as string,
        kycStatus: kycStatus as string,
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

      if (!['pending', 'approved', 'rejected'].includes(kycStatus)) {
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
}
