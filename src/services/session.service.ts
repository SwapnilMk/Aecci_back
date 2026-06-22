import { prisma } from '../config/db.config';

export class SessionService {
  static async createSession(data: any) {
    const session = await prisma.session.create({
      data: {
        title: data.title,
        country: data.country,
        marketOverview: data.marketOverview,
        rules: data.rules,
        date: new Date(data.date),
        durationMinutes: data.durationMinutes,
        seatsTotal: data.seatsTotal,
        seatsAvailable: data.seatsTotal,
        price: data.price,
        partnerId: data.partnerId,
      },
    });
    return session;
  }

  static async getSessions(filters: any = {}) {
    const where: any = {};
    if (filters.country) where.country = filters.country;
    if (filters.status) where.status = filters.status;
    if (filters.partnerId) where.partnerId = filters.partnerId;

    const sessions = await prisma.session.findMany({
      where,
      include: {
        partner: {
          select: {
            id: true,
            fullName: true,
            companyName: true,
          }
        },
        client: {
          select: {
            id: true,
            fullName: true,
            companyName: true,
            country: true,
          }
        },
        reports: true
      },
      orderBy: { date: 'asc' },
    });
    return sessions;
  }

  static async getSessionById(id: string) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        partner: {
          select: {
            id: true,
            fullName: true,
            companyName: true,
          }
        }
      }
    });
    return session;
  }

  static async bookSeat(userId: string, sessionId: string) {
    // We use a transaction to ensure atomic decrement of seatsAvailable
    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.seatsAvailable <= 0) {
        throw new Error("Session is fully booked");
      }

      // Check if user already registered
      const existingReg = await tx.sessionRegistration.findUnique({
        where: {
          userId_sessionId: { userId, sessionId }
        }
      });

      if (existingReg) {
        throw new Error("User is already registered for this session");
      }

      const registration = await tx.sessionRegistration.create({
        data: {
          userId,
          sessionId,
          paymentStatus: session.price > 0 ? "pending" : "paid",
        }
      });

      await tx.session.update({
        where: { id: sessionId },
        data: {
          seatsAvailable: {
            decrement: 1
          }
        }
      });

      return registration;
    });
  }

  static async requestSession(clientId: string, partnerId: string, date: string, questionnaire: string) {
    const client = await prisma.user.findUnique({ where: { id: clientId } });
    if (!client) throw new Error("Client user not found");
    if (!client.planActive || client.slotsRemaining <= 0) {
      throw new Error("You must purchase a plan and have remaining slots to request a booking");
    }

    const partner = await prisma.user.findUnique({ where: { id: partnerId } });
    if (!partner) throw new Error("Partner user not found");

    const session = await prisma.session.create({
      data: {
        title: `Deal Room: ${client.fullName || 'Client'} & ${partner.fullName || 'Partner'}`,
        country: partner.country || '',
        date: new Date(date),
        durationMinutes: 45,
        seatsTotal: 1,
        seatsAvailable: 1,
        price: 0,
        status: "pending_approval",
        partnerId,
        clientId,
        questionnaire
      }
    });

    return session;
  }

  static async getClientSessions(userId: string) {
    return await prisma.session.findMany({
      where: {
        OR: [
          { clientId: userId },
          { partnerId: userId }
        ]
      },
      include: {
        partner: {
          select: { id: true, fullName: true, companyName: true, country: true, profilePicture: true }
        },
        client: {
          select: { id: true, fullName: true, companyName: true, country: true, profilePicture: true }
        }
      },
      orderBy: { date: 'asc' }
    });
  }

  static async approveSession(sessionId: string) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { client: true }
      });

      if (!session) throw new Error("Session request not found");
      if (session.status !== "pending_approval") throw new Error("Session is not in pending status");
      
      const clientId = session.clientId;
      if (!clientId) throw new Error("No client associated with this booking");

      const client = await tx.user.findUnique({ where: { id: clientId } });
      if (!client) throw new Error("Associated client not found");
      if (!client.planActive || client.slotsRemaining <= 0) {
        throw new Error("Client has no remaining session slots");
      }

      // Deduct slot from client
      await tx.user.update({
        where: { id: clientId },
        data: { slotsRemaining: { decrement: 1 } }
      });

      // Update session status to upcoming
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: { status: "upcoming" }
      });

      return updatedSession;
    });
  }

  static async rejectSession(sessionId: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session request not found");
    if (session.status !== "pending_approval") throw new Error("Session is not in pending status");

    return await prisma.session.update({
      where: { id: sessionId },
      data: { status: "rejected" }
    });
  }

  static async getPendingRequests() {
    return await prisma.session.findMany({
      where: { status: "pending_approval" },
      include: {
        client: {
          select: { id: true, fullName: true, companyName: true, country: true }
        },
        partner: {
          select: { id: true, fullName: true, companyName: true, country: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async submitSessionSummary(sessionId: string, partnerId: string, summary: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session not found");
    if (session.partnerId !== partnerId) throw new Error("You are not authorized to submit summary for this session");

    return await prisma.session.update({
      where: { id: sessionId },
      data: {
        postSessionSummary: summary,
        status: "completed"
      }
    });
  }
}
