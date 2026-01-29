import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { GoogleCalendarService } from '../lib/google-calendar.js';

/**
 * Sync calendar events from Google Calendar every 15 minutes
 */
export function startCalendarSync() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Starting calendar sync...');

    try {
      // Get all users with calendar configurations
      const users = await prisma.user.findMany({
        where: {
          accessToken: { not: null },
        },
        include: {
          calendars: {
            where: { enabled: true },
          },
        },
      });

      for (const user of users) {
        if (!user.accessToken || user.calendars.length === 0) {
          continue;
        }

        try {
          const calendarService = new GoogleCalendarService(
            user.accessToken,
            user.refreshToken || undefined
          );

          // Sync for the next 7 days
          const timeMin = new Date();
          const timeMax = new Date();
          timeMax.setDate(timeMax.getDate() + 7);

          const events = await calendarService.getEventsFromMultipleCalendars(
            user.calendars.map((c) => c.calendarId),
            timeMin,
            timeMax
          );

          // Upsert events in the database
          for (const event of events) {
            const isAllDay = !event.start.dateTime;
            const startTime = new Date(event.start.dateTime || event.start.date || '');
            const endTime = new Date(event.end.dateTime || event.end.date || '');

            await prisma.calendarEvent.upsert({
              where: {
                userId_googleEventId: {
                  userId: user.id,
                  googleEventId: event.id,
                },
              },
              create: {
                userId: user.id,
                googleEventId: event.id,
                calendarId: event.calendarId,
                summary: event.summary || 'Sans titre',
                description: event.description,
                location: event.location,
                startTime,
                endTime,
                isAllDay,
                lastSyncedAt: new Date(),
              },
              update: {
                summary: event.summary || 'Sans titre',
                description: event.description,
                location: event.location,
                startTime,
                endTime,
                isAllDay,
                lastSyncedAt: new Date(),
              },
            });
          }

          console.log(`[CRON] Synced ${events.length} events for user ${user.email}`);
        } catch (error) {
          console.error(`[CRON] Error syncing calendar for user ${user.email}:`, error);
        }
      }

      console.log('[CRON] Calendar sync completed');
    } catch (error) {
      console.error('[CRON] Error in calendar sync cron job:', error);
    }
  });

  console.log('📅 Calendar sync cron job started (runs every 15 minutes)');
}
