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
        }
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
}
