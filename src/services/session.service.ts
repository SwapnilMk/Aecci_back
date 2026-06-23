import { prisma } from '../config/db.config';
import { emailService } from './email.service';
import { emailQueue } from '../queues/email.queue';
import { generateIcs } from '../utils/icsGenerator';
import { config } from '../config/config';

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

    return await prisma.session.findMany({
      where,
      include: {
        partner: { select: { id: true, fullName: true, companyName: true } },
        client: { select: { id: true, fullName: true, companyName: true, country: true } },
        reports: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  static async getSessionById(id: string) {
    return await prisma.session.findUnique({
      where: { id },
      include: {
        partner: { select: { id: true, fullName: true, companyName: true } },
      },
    });
  }

  static async bookSeat(userId: string, sessionId: string) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error('Session not found');
      if (session.seatsAvailable <= 0) throw new Error('Session is fully booked');

      const existingReg = await tx.sessionRegistration.findUnique({
        where: { userId_sessionId: { userId, sessionId } },
      });
      if (existingReg) throw new Error('User is already registered for this session');

      const registration = await tx.sessionRegistration.create({
        data: {
          userId,
          sessionId,
          paymentStatus: session.price > 0 ? 'pending' : 'paid',
        },
      });

      await tx.session.update({
        where: { id: sessionId },
        data: { seatsAvailable: { decrement: 1 } },
      });

      return registration;
    });
  }

  static async requestSession(clientId: string, partnerId: string, date: string, questionnaire: string) {
    const client = await prisma.user.findUnique({ where: { id: clientId } });
    if (!client) throw new Error('Client user not found');

    const now = new Date();
    const planExpired = client.planExpiresAt && client.planExpiresAt < now;

    if (!client.planActive || planExpired || client.slotsRemaining <= 0) {
      throw new Error('You must have an active plan with remaining slots to request a booking');
    }

    const partner = await prisma.user.findUnique({ where: { id: partnerId } });
    if (!partner) throw new Error('Partner user not found');

    const session = await prisma.session.create({
      data: {
        title: `Deal Room: ${client.fullName || 'Client'} & ${partner.fullName || 'Partner'}`,
        country: partner.country || '',
        date: new Date(date),
        durationMinutes: 45,
        seatsTotal: 1,
        seatsAvailable: 1,
        price: 0,
        status: 'pending_approval',
        partnerId,
        clientId,
        questionnaire,
      },
    });

    return session;
  }

  static async getClientSessions(userId: string) {
    return await prisma.session.findMany({
      where: {
        OR: [{ clientId: userId }, { partnerId: userId }],
      },
      include: {
        partner: { select: { id: true, fullName: true, companyName: true, country: true, profilePicture: true } },
        client: { select: { id: true, fullName: true, companyName: true, country: true, profilePicture: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  static async approveSession(sessionId: string) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: {
          client: true,
          partner: true,
        },
      });

      if (!session) throw new Error('Session request not found');
      if (session.status !== 'pending_approval') throw new Error('Session is not in pending status');

      const clientId = session.clientId;
      if (!clientId) throw new Error('No client associated with this booking');

      const client = await tx.user.findUnique({ where: { id: clientId } });
      if (!client) throw new Error('Associated client not found');

      const now = new Date();
      const planExpired = client.planExpiresAt && client.planExpiresAt < now;
      if (!client.planActive || planExpired || client.slotsRemaining <= 0) {
        throw new Error('Client has no remaining session slots or plan is expired');
      }

      // Deduct one slot from the client
      await tx.user.update({
        where: { id: clientId },
        data: { slotsRemaining: { decrement: 1 } },
      });

      // Mark session as upcoming
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: { status: 'upcoming' },
      });

      return { updatedSession, session };
    }).then(async ({ updatedSession, session }) => {
      // Build meeting link and ICS after transaction commits
      const meetingLink = `${config.FRONTEND_URL}/dashboard/waiting-room?sessionId=${sessionId}`;
      const sessionDate = new Date(session.date);
      const dateStr = sessionDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = sessionDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';

      const icsContent = generateIcs({
        sessionId,
        title: session.title,
        description: `AECCI Global Deal Room Session\nQuestionnaire: ${session.questionnaire || ''}`,
        startDate: sessionDate,
        durationMinutes: session.durationMinutes,
        meetingLink,
        organizerEmail: config.AWS_SES_SENDER_EMAIL || 'noreply@aecci.in',
        organizerName: 'AECCI Global Deal Room',
      });

      // Queue emails with ICS for client and partner
      await emailQueue.add('session-approved-client', {
        type: 'sendSessionApproved',
        payload: {
          email: session.client!.email,
          fullName: session.client!.fullName || 'Member',
          country: session.country,
          dateStr,
          timeStr,
          meetingLink,
          icsContent,
        },
      });

      await emailQueue.add('session-approved-partner', {
        type: 'sendSessionApproved',
        payload: {
          email: session.partner.email,
          fullName: session.partner.fullName || 'Partner',
          country: session.country,
          dateStr,
          timeStr,
          meetingLink,
          icsContent,
        },
      });

      // Schedule 24-hour reminder
      const reminderTime24h = sessionDate.getTime() - 24 * 60 * 60 * 1000;
      const delay24h = Math.max(0, reminderTime24h - Date.now());

      await emailQueue.add(
        'session-reminder-24h',
        {
          type: 'sendSessionReminder24h',
          payload: {
            clientEmail: session.client!.email,
            clientName: session.client!.fullName || 'Member',
            partnerEmail: session.partner.email,
            partnerName: session.partner.fullName || 'Partner',
            meetingLink,
          },
        },
        { delay: delay24h }
      );

      // Schedule 30-minute reminder
      const reminderTime30min = sessionDate.getTime() - 30 * 60 * 1000;
      const delay30min = Math.max(0, reminderTime30min - Date.now());

      await emailQueue.add(
        'session-reminder-30min',
        {
          type: 'sendSessionReminder30min',
          payload: {
            clientEmail: session.client!.email,
            clientName: session.client!.fullName || 'Member',
            partnerEmail: session.partner.email,
            partnerName: session.partner.fullName || 'Partner',
            meetingLink,
          },
        },
        { delay: delay30min }
      );

      return updatedSession;
    });
  }

  static async rejectSession(sessionId: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session request not found');
    if (session.status !== 'pending_approval') throw new Error('Session is not in pending status');

    return await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'rejected' },
    });
  }

  static async getPendingRequests() {
    return await prisma.session.findMany({
      where: { status: 'pending_approval' },
      include: {
        client: { select: { id: true, fullName: true, companyName: true, country: true } },
        partner: { select: { id: true, fullName: true, companyName: true, country: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async submitSessionSummary(sessionId: string, partnerId: string, summary: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { partner: { select: { email: true, fullName: true } } },
    });
    if (!session) throw new Error('Session not found');
    if (session.partnerId !== partnerId) throw new Error('You are not authorized to submit summary for this session');

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { postSessionSummary: summary, status: 'completed' },
    });

    // Notify admin that summary is ready for report generation
    await emailQueue.add('partner-summary-submitted', {
      type: 'sendAdminSummaryReady',
      payload: {
        sessionId,
        sessionTitle: session.title,
        partnerName: session.partner.fullName || 'Partner',
      },
    });

    return updated;
  }
}
