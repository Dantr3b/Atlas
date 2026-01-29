interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

interface CalendarEvent {
  start: Date;
  end: Date;
  isAllDay: boolean;
  calendarId: string;
}

interface CalendarConfig {
  calendarId: string;
  treatAllDayAsSchedule: boolean;
  defaultStartTime: string; // "09:00"
  defaultEndTime: string; // "17:00"
  schedulePerDay?: {
    [day: string]: { start: string; end: string };
  };
}

export class FreeTimeDetector {
  /**
   * Convert an all-day event to specific hours based on calendar config
   */
  static convertAllDayEvent(
    event: CalendarEvent,
    config: CalendarConfig
  ): { start: Date; end: Date } {
    // If not all-day or no special handling, return as-is
    if (!event.isAllDay || !config.treatAllDayAsSchedule) {
      return { start: event.start, end: event.end };
    }

    const date = new Date(event.start);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });

    // Find schedule for this day (custom or default)
    const schedule = config.schedulePerDay?.[dayName] || {
      start: config.defaultStartTime,
      end: config.defaultEndTime,
    };

    // Parse time strings (HH:MM format)
    const [startHour, startMin] = schedule.start.split(':').map(Number);
    const [endHour, endMin] = schedule.end.split(':').map(Number);

    // Create new dates with the specific hours
    const start = new Date(date);
    start.setHours(startHour, startMin, 0, 0);

    const end = new Date(date);
    end.setHours(endHour, endMin, 0, 0);

    return { start, end };
  }

  /**
   * Detect free time slots between events
   */
  static detectFreeSlots(
    events: CalendarEvent[],
    configs: CalendarConfig[],
    dayStart: Date,
    dayEnd: Date,
    minDurationMinutes: number = 15
  ): TimeSlot[] {
    // First, convert all-day events to specific hours
    const processedEvents = events.map((event) => {
      const config = configs.find((c) => c.calendarId === event.calendarId);
      if (!config) return event;

      const { start, end } = this.convertAllDayEvent(event, config);
      return { ...event, start, end };
    });

    // Then detect free slots
    return this.detectFreeSlotsFromEvents(
      processedEvents,
      dayStart,
      dayEnd,
      minDurationMinutes
    );
  }

  /**
   * Internal method to detect free slots from processed events
   */
  private static detectFreeSlotsFromEvents(
    events: CalendarEvent[],
    dayStart: Date,
    dayEnd: Date,
    minDurationMinutes: number
  ): TimeSlot[] {
    const freeSlots: TimeSlot[] = [];

    // Sort events by start time
    const sortedEvents = events
      .filter((e) => e.start < dayEnd && e.end > dayStart) // Only events within the day
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let currentTime = dayStart;

    for (const event of sortedEvents) {
      // Is there a gap between current time and this event?
      if (event.start > currentTime) {
        const gapDuration =
          (event.start.getTime() - currentTime.getTime()) / (1000 * 60);

        if (gapDuration >= minDurationMinutes) {
          freeSlots.push({
            start: currentTime,
            end: event.start,
            durationMinutes: Math.floor(gapDuration),
          });
        }
      }

      // Move cursor to the end of this event (or keep current if event already passed)
      if (event.end > currentTime) {
        currentTime = event.end;
      }
    }

    // Is there free time after the last event?
    if (currentTime < dayEnd) {
      const remainingDuration =
        (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60);

      if (remainingDuration >= minDurationMinutes) {
        freeSlots.push({
          start: currentTime,
          end: dayEnd,
          durationMinutes: Math.floor(remainingDuration),
        });
      }
    }

    return freeSlots;
  }

  /**
   * Suggest tasks that fit in the available free slots
   */
  static suggestTasksForSlots<T extends { id: string; estimatedDuration: number | null }>(
    freeSlots: TimeSlot[],
    tasks: T[]
  ): Array<{ slot: TimeSlot; tasks: T[] }> {
    return freeSlots.map((slot) => {
      const suitableTasks = tasks.filter(
        (task) =>
          task.estimatedDuration && task.estimatedDuration <= slot.durationMinutes
      );

      return {
        slot,
        tasks: suitableTasks,
      };
    });
  }

  /**
   * Get total free time in a day (in minutes)
   */
  static getTotalFreeTime(freeSlots: TimeSlot[]): number {
    return freeSlots.reduce((total, slot) => total + slot.durationMinutes, 0);
  }
}
