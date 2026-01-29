import { useEffect, useState } from 'react';
import { calendarAPI } from '../../lib/calendar-api';
import './CalendarView.css';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  calendarId: string;
}

interface DayEvents {
  date: Date;
  dateString: string;
  dayName: string;
  events: CalendarEvent[];
}

export default function CalendarView() {
  const [weekEvents, setWeekEvents] = useState<DayEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // Get events for next 7 days
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const events = await calendarAPI.getEvents(
        now.toISOString(),
        nextWeek.toISOString()
      );

      // Group events by day
      const dayMap = new Map<string, CalendarEvent[]>();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);
        const dateString = date.toISOString().split('T')[0];
        dayMap.set(dateString, []);
      }

      events.forEach((event: CalendarEvent) => {
        const startDate = new Date(event.start.dateTime || event.start.date || '');
        const dateString = startDate.toISOString().split('T')[0];
        
        if (dayMap.has(dateString)) {
          dayMap.get(dateString)!.push(event);
        }
      });

      // Convert to array
      const grouped: DayEvents[] = Array.from(dayMap.entries()).map(([dateString, events]) => {
        const date = new Date(dateString + 'T00:00:00');
        return {
          date,
          dateString,
          dayName: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
          events: events.sort((a, b) => {
            const aTime = new Date(a.start.dateTime || a.start.date || '').getTime();
            const bTime = new Date(b.start.dateTime || b.start.date || '').getTime();
            return aTime - bTime;
          }),
        };
      });

      setWeekEvents(grouped);
    } catch (err) {
      setError('Erreur lors du chargement des événements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (event: CalendarEvent): string => {
    const isAllDay = !event.start.dateTime;
    
    if (isAllDay) {
      return 'Toute la journée';
    }

    const start = new Date(event.start.dateTime!);
    const end = new Date(event.end.dateTime!);

    return `${start.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${end.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return <div className="calendar-view">Chargement du calendrier...</div>;
  }

  if (error) {
    return <div className="calendar-view calendar-view--error">{error}</div>;
  }

  return (
    <div className="calendar-view">
      <div className="calendar-view__header">
        <h2>📅 Ma semaine</h2>
        <button onClick={loadEvents} className="calendar-view__refresh">
          🔄 Actualiser
        </button>
      </div>

      <div className="calendar-view__days">
        {weekEvents.map((day) => (
          <div
            key={day.dateString}
            className={`calendar-day ${isToday(day.date) ? 'calendar-day--today' : ''}`}
          >
            <div className="calendar-day__header">
              <h3 className="calendar-day__name">{day.dayName}</h3>
              <span className="calendar-day__date">
                {day.date.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>

            <div className="calendar-day__events">
              {day.events.length === 0 ? (
                <div className="calendar-event calendar-event--empty">
                  Aucun événement
                </div>
              ) : (
                day.events.map((event) => (
                  <div key={event.id} className="calendar-event">
                    <div className="calendar-event__time">
                      {formatTime(event)}
                    </div>
                    <div className="calendar-event__title">{event.summary}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
