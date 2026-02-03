import { google } from 'googleapis';

interface CalendarListItem {
  id: string;
  summary: string;
  backgroundColor?: string;
  accessRole?: string;
}

interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  organizer?: {
    email: string;
  };
}

export class GoogleCalendarService {
  private calendar;

  constructor(accessToken: string, refreshToken?: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * List all calendars accessible by the user
   */
  async listCalendars(): Promise<CalendarListItem[]> {
    try {
      const response = await this.calendar.calendarList.list();
      const items = response.data.items || [];
      
      // Filter out items without required fields and map to CalendarListItem
      return items
        .filter((item) => item.id && item.summary)
        .map((item) => ({
          id: item.id!,
          summary: item.summary!,
          backgroundColor: item.backgroundColor || undefined,
          accessRole: item.accessRole || undefined,
        }));
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw new Error('Failed to fetch calendar list');
    }
  }

  /**
   * Get events from a specific calendar
   */
  async getEvents(
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEventItem[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });

      // Filter out items without required fields and map to CalendarEventItem
      return (response.data.items || [])
        .filter((item) => item.id && item.summary && (item.start?.dateTime || item.start?.date))
        .map((item) => ({
          id: item.id!,
          summary: item.summary!,
          description: item.description || undefined,
          location: item.location || undefined,
          start: {
            dateTime: item.start?.dateTime || undefined,
            date: item.start?.date || undefined,
            timeZone: item.start?.timeZone || undefined,
          },
          end: {
            dateTime: item.end?.dateTime || undefined,
            date: item.end?.date || undefined,
            timeZone: item.end?.timeZone || undefined,
          },
          organizer: item.organizer?.email
            ? { email: item.organizer.email }
            : undefined,
        }));
    } catch (error) {
      console.error(`Error fetching events for calendar ${calendarId}:`, error);
      throw new Error(`Failed to fetch events from calendar ${calendarId}`);
    }
  }

  /**
   * Get events from multiple calendars and merge them
   */
  async getEventsFromMultipleCalendars(
    calendarIds: string[],
    timeMin: Date,
    timeMax: Date
  ): Promise<Array<CalendarEventItem & { calendarId: string }>> {
    try {
      const eventPromises = calendarIds.map(async (calendarId) => {
        const events = await this.getEvents(calendarId, timeMin, timeMax);
        return events.map((event) => ({ ...event, calendarId }));
      });

      const allEventsArrays = await Promise.all(eventPromises);
      const allEvents = allEventsArrays.flat();

      // Sort by start time
      return allEvents.sort((a, b) => {
        const aStart = new Date(a.start.dateTime || a.start.date || '').getTime();
        const bStart = new Date(b.start.dateTime || b.start.date || '').getTime();
        return aStart - bStart;
      });
    } catch (error) {
      console.error('Error fetching events from multiple calendars:', error);
      throw new Error('Failed to fetch events from calendars');
    }
  }
}
