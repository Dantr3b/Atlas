import { useState } from 'react';
import { api } from '../../../lib/api';
import './QuickTaskPicker.css';

interface QuickTaskPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskSelect?: (taskId: string) => void;
}

interface TaskSuggestion {
  id: string;
  content: string;
  estimatedDuration: number | null;
  priority: number;
  type: string | null;
  context: string;
  deadline: Date | null;
  reasoning: string;
}

export default function QuickTaskPicker({ isOpen, onClose, onTaskSelect }: QuickTaskPickerProps) {
  const [availableTime, setAvailableTime] = useState(30);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGetSuggestions() {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.suggestTasks(availableTime);
      setSuggestions(result.suggestions);
      
      if (result.suggestions.length === 0) {
        setError('Aucune tâche ne correspond à ce temps disponible');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la recherche');
    } finally {
      setLoading(false);
    }
  }

  function handleTaskSelect(taskId: string) {
    if (onTaskSelect) {
      onTaskSelect(taskId);
    }
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="quick-picker-modal" onClick={handleBackdropClick}>
      <div className="quick-picker-content">
        <div className="quick-picker-header">
          <h2>⏱️ J'ai du temps !</h2>
          <button onClick={onClose} className="close-btn" aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="time-input-section">
          <label htmlFor="time-input">Combien de temps avez-vous ?</label>
          
          <div className="time-presets">
            <button 
              onClick={() => setAvailableTime(15)}
              className={availableTime === 15 ? 'active' : ''}
            >
              15 min
            </button>
            <button 
              onClick={() => setAvailableTime(30)}
              className={availableTime === 30 ? 'active' : ''}
            >
              30 min
            </button>
            <button 
              onClick={() => setAvailableTime(60)}
              className={availableTime === 60 ? 'active' : ''}
            >
              1h
            </button>
            <button 
              onClick={() => setAvailableTime(90)}
              className={availableTime === 90 ? 'active' : ''}
            >
              1h30
            </button>
          </div>

          <div className="time-custom-input">
            <input
              id="time-input"
              type="number"
              value={availableTime}
              onChange={(e) => setAvailableTime(Number(e.target.value))}
              min={5}
              max={480}
              step={5}
            />
            <span>minutes</span>
          </div>
        </div>

        <button 
          onClick={handleGetSuggestions}
          className="get-suggestions-btn"
          disabled={loading || availableTime < 5}
        >
          {loading ? '⏳ Recherche...' : '🔍 Trouver des tâches'}
        </button>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="suggestions-section">
            <div className="suggestions-header">
              <h3>Tâches suggérées ({suggestions.length})</h3>
              <p className="total-time">
                Temps total: {suggestions.reduce((sum, t) => sum + (t.estimatedDuration || 30), 0)} min
              </p>
            </div>

            <div className="suggestions-list">
              {suggestions.map((task) => (
                <div key={task.id} className="suggestion-card">
                  <div className="task-info">
                    <h4>{task.content}</h4>
                    <div className="task-meta">
                      <span className="duration">⏱️ {task.estimatedDuration || 30} min</span>
                      {task.type && <span className="type">{task.type}</span>}
                      <span className="priority">Priorité: {task.priority}</span>
                    </div>
                    <p className="reasoning">{task.reasoning}</p>
                  </div>
                  <button 
                    onClick={() => handleTaskSelect(task.id)}
                    className="start-task-btn"
                  >
                    Commencer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
