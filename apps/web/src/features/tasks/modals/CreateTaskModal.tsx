import { useState } from 'react';
import { api } from '../../../lib/api';
import './CreateTaskModal.css';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  // Mode: 'natural' or 'form'
  const [mode, setMode] = useState<'natural' | 'form'>('natural');
  
  // Natural language input
  const [naturalInput, setNaturalInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  
  // Form fields
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'INBOX' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'>('INBOX');
  const [type, setType] = useState<'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN' | ''>('');
  const [context, setContext] = useState<'PERSONAL' | 'WORK' | 'LEARNING' | ''>('');
  const [priority, setPriority] = useState<number>(5);
  const [estimatedDuration, setEstimatedDuration] = useState<5 | 10 | 15 | 30 | 60 | 90 | 120 | 180 | 300 | null>(null);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  // Helper to round duration to nearest allowed value
  const roundToAllowedDuration = (minutes: number | null): 5 | 10 | 15 | 30 | 60 | 90 | 120 | 180 | 300 | null => {
    if (!minutes) return null;
    
    const allowedValues = [5, 10, 15, 30, 60, 90, 120, 180, 300];
    const closest = allowedValues.reduce((prev, curr) => 
      Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev
    );
    
    return closest as 5 | 10 | 15 | 30 | 60 | 90 | 120 | 180 | 300;
  };

  const handleParseNatural = async () => {
    if (!naturalInput.trim()) {
      setError('Veuillez saisir une description de tâche');
      return;
    }

    try {
      setParsing(true);
      setError(null);

      const result = await api.parseNaturalLanguage(naturalInput);

      // Fill form fields with parsed data
      setContent(result.content);
      if (result.deadline) {
        // Convert ISO to datetime-local format
        const date = new Date(result.deadline);
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDeadline(localDateTime);
      }
      if (result.priority) setPriority(result.priority);
      if (result.type) setType(result.type);
      if (result.context) setContext(result.context);
      if (result.estimatedDuration) {
        // Round to nearest allowed duration
        const rounded = roundToAllowedDuration(result.estimatedDuration);
        setEstimatedDuration(rounded);
      }

      setParsed(true);
      setMode('form');
      setShowAdvanced(true);
    } catch (err) {
      // Check if it's a rate limit error
      const isErrorWithStatus = (error: unknown): error is Error & { status: number } => {
        return error instanceof Error && 'status' in error && typeof (error as Error & { status?: number }).status === 'number';
      };
      
      if (isErrorWithStatus(err) && err.status === 429) {
        setError('⏱️ Limite d\'utilisation atteinte. Réessayez dans 60 secondes.');
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse');
      }
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Le contenu est requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.createTask({
        content: content.trim(),
        status,
        type: type || undefined,
        context: context || undefined,
        priority,
        estimatedDuration: estimatedDuration || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });

      // Reset form
      setContent('');
      setStatus('INBOX');
      setType('');
      setContext('');
      setPriority(5);
      setEstimatedDuration(null);
      setDeadline('');
      setShowAdvanced(false);
      
      onTaskCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Nouvelle tâche</h2>
          <button onClick={onClose} className="modal-close-btn" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="task-form__tabs">
          <button
            type="button"
            className={`task-form__tab ${mode === 'natural' ? 'task-form__tab--active' : ''}`}
            onClick={() => setMode('natural')}
          >
            ✨ Langage naturel
          </button>
          <button
            type="button"
            className={`task-form__tab ${mode === 'form' ? 'task-form__tab--active' : ''}`}
            onClick={() => setMode('form')}
          >
            📝 Formulaire
          </button>
        </div>

        {mode === 'natural' ? (
          <div className="task-form">
            {error && (
              <div className="task-form__error">
                {error}
              </div>
            )}

            <div className="task-form__group">
              <label htmlFor="natural-input" className="task-form__label">
                Décrivez votre tâche en français
              </label>
              <textarea
                id="natural-input"
                value={naturalInput}
                onChange={(e) => setNaturalInput(e.target.value)}
                className="task-form__textarea"
                placeholder="Ex: je dois finir le rapport avant vendredi soir"
                rows={4}
                maxLength={500}
                autoFocus
              />
              <span className="task-form__hint">{naturalInput.length}/500</span>
            </div>

            <button
              type="button"
              onClick={handleParseNatural}
              className="task-form__parse-btn"
              disabled={parsing || !naturalInput.trim()}
            >
              {parsing ? '🤖 Analyse en cours...' : '✨ Analyser avec l\'IA'}
            </button>

            <div className="task-form__actions">
              <button
                type="button"
                onClick={onClose}
                className="task-form__btn task-form__btn--cancel"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="task-form">
          {error && (
            <div className="task-form__error">
              {error}
            </div>
          )}

          {parsed && (
            <div className="task-form__success">
              ✅ Tâche analysée avec succès ! Vérifiez et validez.
            </div>
          )}

          <div className="task-form__group">
            <label htmlFor="content" className="task-form__label">
              Contenu <span className="task-form__required">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="task-form__textarea"
              placeholder="Décrire la tâche..."
              rows={3}
              maxLength={500}
              required
              autoFocus
            />
            <span className="task-form__hint">{content.length}/500</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="task-form__toggle-btn"
          >
            {showAdvanced ? '▼' : '▶'} Options avancées
          </button>

          {showAdvanced && (
            <>

          <div className="task-form__row">
            <div className="task-form__group">
              <label htmlFor="status" className="task-form__label">Statut</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'INBOX' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED')}
                className="task-form__select"
              >
                <option value="INBOX">Inbox</option>
                <option value="PLANNED">Planifiée</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminée</option>
              </select>
            </div>

            <div className="task-form__group">
              <label htmlFor="priority" className="task-form__label">
                Priorité: {priority}
              </label>
              <input
                type="range"
                id="priority"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="task-form__range"
              />
            </div>
          </div>

          <div className="task-form__row">
            <div className="task-form__group">
              <label htmlFor="type" className="task-form__label">Type</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as 'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN' | '')}
                className="task-form__select"
              >
                <option value="">Aucun</option>
                <option value="QUICK">Rapide (&lt; 15min)</option>
                <option value="DEEP_WORK">Deep Work (&gt; 1h)</option>
                <option value="COURSE">Cours/Formation</option>
                <option value="ADMIN">Administratif</option>
              </select>
            </div>

            <div className="task-form__group">
              <label htmlFor="context" className="task-form__label">Contexte</label>
              <select
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value as 'PERSONAL' | 'WORK' | 'LEARNING' | '')}
                className="task-form__select"
              >
                <option value="">Aucun</option>
                <option value="PERSONAL">Personnel</option>
                <option value="WORK">Travail</option>
                <option value="LEARNING">Apprentissage</option>
              </select>
            </div>
          </div>

          <div className="task-form__row">
            <div className="task-form__group">
              <label htmlFor="duration" className="task-form__label">Durée estimée</label>
              <select
                id="duration"
                value={estimatedDuration || ''}
                onChange={(e) => setEstimatedDuration(e.target.value ? parseInt(e.target.value) as 5 | 10 | 15 | 30 | 60 | 90 | 120 | 180 | 300 : null)}
                className="task-form__select"
              >
                <option value="">Aucune</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 heure</option>
                <option value="90">1h30</option>
                <option value="120">2 heures</option>
                <option value="180">3 heures</option>
                <option value="300">Plus de 3h</option>
              </select>
            </div>

            <div className="task-form__group">
              <label htmlFor="deadline" className="task-form__label">Date limite</label>
              <input
                type="datetime-local"
                id="deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="task-form__input"
              />
            </div>
          </div>
          </>
          )}

          <div className="task-form__actions">
            <button
              type="button"
              onClick={onClose}
              className="task-form__btn task-form__btn--cancel"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="task-form__btn task-form__btn--submit"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer la tâche'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
