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
}
