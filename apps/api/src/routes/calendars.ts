import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/require-auth.js';
import { GoogleCalendarService } from '../lib/google-calendar.js';
import { prisma } from '../lib/prisma.js';

const listCalendarsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        calendars: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              summary: { type: 'string' },
              backgroundColor: { type: 'string' },
              accessRole: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

const getUserCalendarsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        calendars: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              calendarId: { type: 'string' },
              label: { type: 'string' },
              color: { type: 'string' },
              enabled: { type: 'boolean' },
              treatAllDayAsSchedule: { type: 'boolean' },
              defaultStartTime: { type: 'string', nullable: true },
              defaultEndTime: { type: 'string', nullable: true },
              schedulePerDay: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  },
};

const saveUserCalendarsSchema = {
  body: {
    type: 'object',
    required: ['calendars'],
    properties: {
      calendars: {
        type: 'array',
        items: {
          type: 'object',
          required: ['calendarId', 'label', 'color', 'enabled'],
          properties: {
            calendarId: { type: 'string' },
            label: { type: 'string' },
            color: { type: 'string' },
            enabled: { type: 'boolean' },
            treatAllDayAsSchedule: { type: 'boolean' },
            defaultStartTime: { type: 'string' },
            defaultEndTime: { type: 'string' },
            schedulePerDay: { type: ['object', 'null'] },
          },
        },
      },
    },
  },
};

export default async function calendarRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', requireAuth);

  // GET /calendars - List all available Google calendars for the user
  fastify.get('/', { schema: listCalendarsSchema }, async (request, reply) => {
    const userId = request.session.get('userId')!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.accessToken) {
      return reply.status(401).send({ error: 'No Google access token found' });
    }

    const calendarService = new GoogleCalendarService(
      user.accessToken,
      user.refreshToken || undefined
    );

    const calendars = await calendarService.listCalendars();

    return reply.send({ calendars });
  });

  // GET /calendars/user - Get user's configured calendars
  fastify.get('/user', { schema: getUserCalendarsSchema }, async (request, reply) => {
    const userId = request.session.get('userId')!;

    const userCalendars = await prisma.userCalendar.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({ calendars: userCalendars });
  });

  // POST /calendars/user - Save user's calendar configuration
  fastify.post('/user', { schema: saveUserCalendarsSchema }, async (request, reply) => {
    const userId = request.session.get('userId')!;
    const { calendars } = request.body as {
      calendars: Array<{
        calendarId: string;
        label: string;
        color: string;
        enabled: boolean;
        treatAllDayAsSchedule?: boolean;
        defaultStartTime?: string;
        defaultEndTime?: string;
        schedulePerDay?: object;
      }>;
    };

    // Delete existing calendars for this user
    await prisma.userCalendar.deleteMany({
      where: { userId },
    });

    // Create new configuration
    await prisma.userCalendar.createMany({
      data: calendars.map((cal) => ({
        userId,
        calendarId: cal.calendarId,
        label: cal.label,
        color: cal.color,
        enabled: cal.enabled,
        treatAllDayAsSchedule: cal.treatAllDayAsSchedule || false,
        defaultStartTime: cal.defaultStartTime || '09:00',
        defaultEndTime: cal.defaultEndTime || '17:00',
        schedulePerDay: (cal.schedulePerDay as any) || null,
      })),
    });

    return reply.send({ success: true });
  });

  // GET /calendars/events - Get events from all configured calendars
  fastify.get('/events', async (request, reply) => {
    const userId = request.session.get('userId')!;
    const { timeMin, timeMax } = request.query as {
      timeMin?: string;
      timeMax?: string;
    };

    // Default to current week if not specified
    const start = timeMin ? new Date(timeMin) : new Date();
    const end = timeMax
      ? new Date(timeMax)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 7);
          return d;
        })();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.accessToken) {
      return reply.status(401).send({ error: 'No Google access token found' });
    }

    const userCalendars = await prisma.userCalendar.findMany({
      where: { userId, enabled: true },
    });

    if (userCalendars.length === 0) {
      return reply.send({ events: [] });
    }

    const calendarService = new GoogleCalendarService(
      user.accessToken,
      user.refreshToken || undefined
    );

    const events = await calendarService.getEventsFromMultipleCalendars(
      userCalendars.map((c) => c.calendarId),
      start,
      end
    );

    return reply.send({ events });
  });
}
