export interface CalendarConfig {
  id?: number;
  calendarId: string;
  label: string;
  color: string;
  enabled: boolean;
  treatAllDayAsSchedule: boolean;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  schedulePerDay: Record<string, { start: string; end: string }> | null;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor?: string;
  accessRole?: string;
}

class CalendarAPI {
  private baseUrl = import.meta.env.VITE_API_URL;

  /**
   * Get all available Google calendars
   */
  async listAvailableCalendars(): Promise<GoogleCalendar[]> {
    const response = await fetch(`${this.baseUrl}/calendars`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch calendars');
    }

    const data = await response.json();
    return data.calendars;
  }

  /**
   * Get user's configured calendars
   */
  async getUserCalendars(): Promise<CalendarConfig[]> {
    const response = await fetch(`${this.baseUrl}/calendars/user`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user calendars');
    }

    const data = await response.json();
    return data.calendars;
  }

  /**
   * Save user's calendar configuration
   */
  async saveUserCalendars(calendars: CalendarConfig[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/calendars/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ calendars }),
    });

    if (!response.ok) {
      throw new Error('Failed to save calendars');
    }
  }

  /**
   * Get events from configured calendars
   */
  async getEvents(timeMin?: string, timeMax?: string) {
    const params = new URLSearchParams();
    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);

    const response = await fetch(
      `${this.baseUrl}/calendars/events?${params.toString()}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    return data.events;
  }
}

export const calendarAPI = new CalendarAPI();
