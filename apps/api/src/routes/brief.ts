import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth.js';
import { prisma } from '../lib/prisma.js';
import { GoogleCalendarService } from '../lib/google-calendar.js';

interface GreetingResponse {
  destination: 'FunKart' | 'Sophia' | null;
  firstEvent: {
    summary: string;
    start: string;
    calendarLabel: string;
  } | null;
}

export default async function briefRoutes(fastify: FastifyInstance) {
  // Require authentication for all routes
  fastify.addHook('onRequest', requireAuth);

  // GET /brief/greeting - Get personalized greeting based on first calendar event
  fastify.get('/greeting', async (request, reply) => {
    const userId = request.session.get('userId')!;

    try {
      // Get user with access token
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user?.accessToken) {
        return reply.send({ destination: null, firstEvent: null });
      }

      // Get user's enabled calendars
      const userCalendars = await prisma.userCalendar.findMany({
        where: { userId, enabled: true },
      });

      if (userCalendars.length === 0) {
        return reply.send({ destination: null, firstEvent: null });
      }

      // Define today's time range (midnight to 11:59 PM)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // Fetch today's events
      const calendarService = new GoogleCalendarService(
        user.accessToken,
        user.refreshToken || undefined
      );

      const events = await calendarService.getEventsFromMultipleCalendars(
        userCalendars.map((c) => c.calendarId),
        startOfDay,
        endOfDay
      );

      if (events.length === 0) {
        return reply.send({ destination: null, firstEvent: null });
      }

      // Get the first event (already sorted by start time)
      const firstEvent = events[0];

      // Find the calendar label for this event
      const eventCalendar = userCalendars.find((c) => c.calendarId === firstEvent.calendarId);
      const calendarLabel = eventCalendar?.label || 'Unknown';

      // Determine destination based on calendar and event
      let destination: 'FunKart' | 'Sophia' = 'Sophia'; // Default to Sophia

      // Check if it's from ALTERNANCE GABIN calendar and event is "g"
      if (calendarLabel.toUpperCase().includes('ALTERNANCE') && 
          calendarLabel.toUpperCase().includes('GABIN') &&
          firstEvent.summary.toLowerCase().trim() === 'g') {
        destination = 'FunKart';
      }
      // Check if it's from HYP calendar (courses)
      else if (calendarLabel.includes('HYP') || calendarLabel.includes('ROLLAND-BERTRAND')) {
        destination = 'Sophia';
      }

      const response: GreetingResponse = {
        destination,
        firstEvent: {
          summary: firstEvent.summary,
          start: firstEvent.start.dateTime || firstEvent.start.date || '',
          calendarLabel,
        },
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error instanceof Error ? error.message : 'Error fetching greeting');
      return reply.send({ destination: null, firstEvent: null });
    }
  });
}
