import { prisma } from '../config/db.config';

export class UserService {
  static async getUsers(filters: { role?: string; userType?: string; kycStatus?: string; partnerId?: string }) {
    const { role, userType, kycStatus, partnerId } = filters;
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (userType) {
      where.userType = userType;
    }

    if (kycStatus) {
      where.kycStatus = kycStatus;
    }

    if (partnerId) {
      where.partnerId = partnerId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        country: true,
        mobileNumber: true,
        role: true,
        userType: true,
        companyName: true,
        kycStatus: true,
        iecDocument: true,
        gstDocument: true,
        panDocument: true,
        companyProfileDocument: true,
        productCatalogue: true,
        isEmailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        country: true,
        mobileNumber: true,
        role: true,
        userType: true,
        companyName: true,
        kycStatus: true,
        iecDocument: true,
        gstDocument: true,
        panDocument: true,
        companyProfileDocument: true,
        productCatalogue: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
    return user;
  }

  static async updateKycStatus(
    userId: string, 
    kycStatus: string, 
    reason?: string,
    partnerId?: string,
    assignedPartnerFee?: number,
    assignedPartnerSlot?: Date
  ) {
    const updateData: any = { kycStatus };
    if (partnerId) updateData.partnerId = partnerId;
    if (assignedPartnerFee !== undefined) updateData.assignedPartnerFee = assignedPartnerFee;
    if (assignedPartnerSlot) updateData.assignedPartnerSlot = assignedPartnerSlot;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    
    // Import here to avoid circular dependency if email service depends on config which depends on DB
    const { emailService } = await import('./email.service');
    
    if (kycStatus === 'approved_pending_assignment' || kycStatus === 'approved') {
      // Create payment link logic or stub here
      const paymentLink = `https://aecci-deal-room.com/payment?uid=${user.id}`;
      // In the new flow, package plan is omitted
      await emailService.sendApplicationApproved(user.email, user.fullName || 'Valued Partner', user.country || 'Target Country', paymentLink);
    } else if (kycStatus === 'rejected') {
      await emailService.sendKycRejected(user.email, user.fullName || 'Applicant', reason || 'Does not meet criteria.');
    }
    
    return user;
  }

  static async assignPartner(userId: string, partnerId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        partnerId,
        kycStatus: 'assigned_pending_pricing',
      },
    });
    return user;
  }

  static async setPricing(userId: string, dealRoomPrice: number) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        dealRoomPrice,
        kycStatus: 'priced_pending_payment',
      },
    });
    return user;
  }

  static async processPayment(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        paymentStatus: 'paid',
        kycStatus: 'active',
      },
    });
    return user;
  }
}
