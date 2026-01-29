import { useState } from 'react';
import CalendarSettings from '../calendar/CalendarSettings';
import CalendarView from '../calendar/CalendarView';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'calendar-view' | 'calendars' | 'general'>('calendar-view');

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h2>⚙️ Paramètres</h2>
          <button className="settings-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-modal__tabs">
          <button
            className={`settings-tab ${activeTab === 'calendar-view' ? 'settings-tab--active' : ''}`}
            onClick={() => setActiveTab('calendar-view')}
          >
            📆 Ma semaine
          </button>
          <button
            className={`settings-tab ${activeTab === 'calendars' ? 'settings-tab--active' : ''}`}
            onClick={() => setActiveTab('calendars')}
          >
            ⚙️ Configuration
          </button>
          <button
            className={`settings-tab ${activeTab === 'general' ? 'settings-tab--active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            🔧 Général
          </button>
        </div>

        <div className="settings-modal__content">
          {activeTab === 'calendar-view' && <CalendarView />}
          {activeTab === 'calendars' && <CalendarSettings />}
          {activeTab === 'general' && (
            <div className="settings-general">
              <p>Paramètres généraux à venir...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
