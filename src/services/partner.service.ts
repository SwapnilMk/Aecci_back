import { prisma } from '../config/db.config';

export class PartnerService {
  static async createApplication(userId: string, data: any) {
    // Ensure the user exists and isn't already a partner
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.role === 'partner') throw new Error('User is already a partner');

    // Create partner profile and set kyc status if needed
    const partnerProfile = await prisma.partnerProfile.create({
      data: {
        userId,
        organization: data.organization,
        expertiseCountries: data.expertiseCountries || [],
        expertiseSectors: data.expertiseSectors || [],
        motivation: data.motivation,
        governmentId: data.governmentId,
        professionalCert: data.professionalCert,
        businessProof: data.businessProof,
        references: data.references,
        status: 'pending_review',
      },
    });

    return partnerProfile;
  }

  static async getProfiles(status?: string) {
    const where = status ? { status } : {};
    return await prisma.partnerProfile.findMany({
      where,
      include: {
        user: {
          select: { fullName: true, email: true, mobileNumber: true }
        }
      }
    });
  }

  static async getProfileByUserId(userId: string) {
    return await prisma.partnerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { fullName: true, email: true, mobileNumber: true }
        }
      }
    });
  }

  static async updateStatus(userId: string, status: string, tier?: string) {
    const dataToUpdate: any = { status };
    if (tier) dataToUpdate.tier = tier;

    if (status === 'approved') {
      // Also update user role to partner
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'partner', kycStatus: 'active' }
      });
    }

    return await prisma.partnerProfile.update({
      where: { userId },
      data: dataToUpdate
    });
  }

  static async updateSetupInfo(userId: string, data: any) {
    return await prisma.partnerProfile.update({
      where: { userId },
      data: {
        bio: data.bio,
        availability: data.availability,
        signedAgreement: data.signedAgreement,
        agreementDate: data.signedAgreement ? new Date() : undefined,
      }
    });
  }

  static async createPartnerManually(data: any) {
    // Admin directly creating a partner
    // Generate a secure random password if not provided
    const password = data.password || Math.random().toString(36).slice(-8);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        country: data.country,
        password: password, // In real scenario, hash this!
        role: 'partner',
        kycStatus: 'active',
        isEmailVerified: true,
        userType: 'Individual', // Default for partners
      }
    });

    const partnerProfile = await prisma.partnerProfile.create({
      data: {
        userId: user.id,
        organization: data.organization,
        expertiseCountries: data.expertiseCountries || [],
        expertiseSectors: data.expertiseSectors || [],
        status: 'approved',
        tier: data.tier || 'Standard',
      }
    });

    return { user, partnerProfile };
  }
}
