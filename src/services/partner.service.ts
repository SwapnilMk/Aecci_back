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
    if (data.profilePicture !== undefined || data.languagesSpoken !== undefined) {
      const userUpdateData: any = {};
      if (data.profilePicture !== undefined) userUpdateData.profilePicture = data.profilePicture;
      if (data.languagesSpoken !== undefined) userUpdateData.languagesSpoken = data.languagesSpoken;

      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData
      });
    }

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
    const bcrypt = await import('bcrypt');
    const rawPassword = data.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        country: data.country,
        password: hashedPassword,
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

  static async getMarketplaceProfiles(country?: string) {
    const where: any = {
      status: { in: ['approved', 'active'] }
    };
    if (country) {
      where.expertiseCountries = { has: country };
    }

    return await prisma.partnerProfile.findMany({
      where,
      select: {
        id: true,
        userId: true,
        organization: true,
        expertiseCountries: true,
        expertiseSectors: true,
        tier: true,
        bio: true,
        availability: true,
        status: true,
        user: {
          select: {
            fullName: true,
            profilePicture: true,
            languagesSpoken: true,
            country: true,
            yearsOfExperience: true,
            professionalTitle: true
          }
        }
      }
    });
  }

  static async getMarketplaceProfileDetail(userId: string) {
    const profile = await prisma.partnerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        organization: true,
        expertiseCountries: true,
        expertiseSectors: true,
        tier: true,
        bio: true,
        availability: true,
        status: true,
        user: {
          select: {
            fullName: true,
            profilePicture: true,
            languagesSpoken: true,
            country: true,
            yearsOfExperience: true,
            professionalTitle: true
          }
        }
      }
    });

    if (!profile || !['approved', 'active'].includes(profile.status)) {
      throw new Error('Partner profile not found or inactive');
    }

    return profile;
  }
}
