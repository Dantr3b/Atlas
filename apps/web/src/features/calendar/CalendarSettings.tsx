import { useEffect, useState } from 'react';
import { calendarAPI, type CalendarConfig, type GoogleCalendar } from '../../lib/calendar-api';
import './CalendarSettings.css';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

export default function CalendarSettings() {
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [userCalendars, setUserCalendars] = useState<CalendarConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    try {
      setLoading(true);
      const [available, configured] = await Promise.all([
        calendarAPI.listAvailableCalendars(),
        calendarAPI.getUserCalendars(),
      ]);

      setAvailableCalendars(available);
      setUserCalendars(configured);
    } catch (err) {
      setError('Erreur lors du chargement des calendriers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCalendar = (calendar: GoogleCalendar) => {
    const exists = userCalendars.some((c) => c.calendarId === calendar.id);
    if (exists) return;

    setUserCalendars([
      ...userCalendars,
      {
        calendarId: calendar.id,
        label: calendar.summary,
        color: calendar.backgroundColor || '#4285F4',
        enabled: true,
        treatAllDayAsSchedule: false,
        defaultStartTime: '09:00',
        defaultEndTime: '17:00',
        schedulePerDay: null,
      },
    ]);
  };

  const handleRemoveCalendar = (calendarId: string) => {
    setUserCalendars(userCalendars.filter((c) => c.calendarId !== calendarId));
  };

  const handleToggleCalendar = (calendarId: string) => {
    setUserCalendars(
      userCalendars.map((c) =>
        c.calendarId === calendarId ? { ...c, enabled: !c.enabled } : c
      )
    );
  };

  const handleUpdateCalendar = (calendarId: string, updates: Partial<CalendarConfig>) => {
    setUserCalendars(
      userCalendars.map((c) => (c.calendarId === calendarId ? { ...c, ...updates } : c))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await calendarAPI.saveUserCalendars(userCalendars);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="calendar-settings">Chargement...</div>;
  }

  return (
    <div className="calendar-settings">
      <h2 className="calendar-settings__title">📅 Calendriers Google</h2>
      <p className="calendar-settings__subtitle">
        Sélectionnez les calendriers à synchroniser pour la détection du temps libre
      </p>

      {error && <div className="calendar-settings__error">{error}</div>}
      {success && (
        <div className="calendar-settings__success">Configuration sauvegardée !</div>
      )}

      <div className="calendar-settings__list">
        {userCalendars.map((calendar) => (
          <div key={calendar.calendarId} className="calendar-item">
            <div className="calendar-item__header">
              <input
                type="checkbox"
                checked={calendar.enabled}
                onChange={() => handleToggleCalendar(calendar.calendarId)}
              />
              <span
                className="calendar-item__color"
                style={{ backgroundColor: calendar.color }}
              />
              <span className="calendar-item__label">{calendar.label}</span>
              <button
                className="calendar-item__remove"
                onClick={() => handleRemoveCalendar(calendar.calendarId)}
              >
                ✕
              </button>
            </div>

            {calendar.enabled && (
              <div className="calendar-item__config">
                <label className="calendar-config__checkbox">
                  <input
                    type="checkbox"
                    checked={calendar.treatAllDayAsSchedule}
                    onChange={(e) =>
                      handleUpdateCalendar(calendar.calendarId, {
                        treatAllDayAsSchedule: e.target.checked,
                      })
                    }
                  />
                  <span>Convertir les événements "toute la journée" en horaires fixes</span>
                </label>

                {calendar.treatAllDayAsSchedule && (
                  <div className="calendar-schedule">
                    <div className="calendar-schedule__default">
                      <label>
                        <span>Horaires par défaut :</span>
                        <div className="calendar-schedule__time">
                          <input
                            type="time"
                            value={calendar.defaultStartTime || '09:00'}
                            onChange={(e) =>
                              handleUpdateCalendar(calendar.calendarId, {
                                defaultStartTime: e.target.value,
                              })
                            }
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={calendar.defaultEndTime || '17:00'}
                            onChange={(e) =>
                              handleUpdateCalendar(calendar.calendarId, {
                                defaultEndTime: e.target.value,
                              })
                            }
                          />
                        </div>
                      </label>
                    </div>

                    <details className="calendar-schedule__advanced">
                      <summary>Horaires personnalisés par jour</summary>
                      <div className="calendar-schedule__days">
                        {DAYS_OF_WEEK.map((day) => {
                          const schedule = calendar.schedulePerDay?.[day.key];
                          return (
                            <div key={day.key} className="calendar-schedule__day">
                              <span>{day.label}</span>
                              <input
                                type="time"
                                value={schedule?.start || calendar.defaultStartTime || '09:00'}
                                onChange={(e) => {
                                  const newSchedule = {
                                    ...calendar.schedulePerDay,
                                    [day.key]: {
                                      start: e.target.value,
                                      end:
                                        schedule?.end ||
                                        calendar.defaultEndTime ||
                                        '17:00',
                                    },
                                  };
                                  handleUpdateCalendar(calendar.calendarId, {
                                    schedulePerDay: newSchedule,
                                  });
                                }}
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={schedule?.end || calendar.defaultEndTime || '17:00'}
                                onChange={(e) => {
                                  const newSchedule = {
                                    ...calendar.schedulePerDay,
                                    [day.key]: {
                                      start:
                                        schedule?.start ||
                                        calendar.defaultStartTime ||
                                        '09:00',
                                      end: e.target.value,
                                    },
                                  };
                                  handleUpdateCalendar(calendar.calendarId, {
                                    schedulePerDay: newSchedule,
                                  });
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="calendar-settings__add">
        <h3>Ajouter un calendrier</h3>
        <div className="calendar-settings__available">
          {availableCalendars
            .filter((cal) => !userCalendars.some((uc) => uc.calendarId === cal.id))
            .map((calendar) => (
              <button
                key={calendar.id}
                className="calendar-add-btn"
                onClick={() => handleAddCalendar(calendar)}
              >
                + {calendar.summary}
              </button>
            ))}
        </div>
      </div>

      <button
        className="calendar-settings__save"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  );
}
