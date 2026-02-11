import { useState } from 'react';
import './SearchFilter.css';

export interface FilterState {
  searchText: string;
  typeFilters: Array<'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN'>;
  contextFilters: Array<'PERSONAL' | 'WORK' | 'LEARNING'>;
  statusFilters: Array<'INBOX' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'>;
}

interface SearchFilterProps {
  onFilterChange: (filters: FilterState) => void;
  showStatusFilter?: boolean;
}

const TYPE_OPTIONS = [
  { value: 'QUICK', label: '⚡ Rapide' },
  { value: 'DEEP_WORK', label: '🧠 Deep Work' },
  { value: 'COURSE', label: '📚 Cours' },
  { value: 'ADMIN', label: '📋 Admin' },
] as const;

const CONTEXT_OPTIONS = [
  { value: 'PERSONAL', label: '🏠 Personnel' },
  { value: 'WORK', label: '💼 Travail' },
  { value: 'LEARNING', label: '🎓 Apprentissage' },
] as const;

const STATUS_OPTIONS = [
  { value: 'INBOX', label: '📥 Inbox' },
  { value: 'PLANNED', label: '📅 Planifié' },
  { value: 'IN_PROGRESS', label: '🔄 En cours' },
  { value: 'COMPLETED', label: '✅ Terminé' },
] as const;

export default function SearchFilter({ onFilterChange, showStatusFilter = false }: SearchFilterProps) {
  const [searchText, setSearchText] = useState('');
  const [typeFilters, setTypeFilters] = useState<FilterState['typeFilters']>([]);
  const [contextFilters, setContextFilters] = useState<FilterState['contextFilters']>([]);
  const [statusFilters, setStatusFilters] = useState<FilterState['statusFilters']>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    onFilterChange({ searchText: value, typeFilters, contextFilters, statusFilters });
  };

  const handleTypeToggle = (type: FilterState['typeFilters'][number]) => {
    const newFilters = typeFilters.includes(type)
      ? typeFilters.filter(t => t !== type)
      : [...typeFilters, type];
    setTypeFilters(newFilters);
    onFilterChange({ searchText, typeFilters: newFilters, contextFilters, statusFilters });
  };

  const handleContextToggle = (context: FilterState['contextFilters'][number]) => {
    const newFilters = contextFilters.includes(context)
      ? contextFilters.filter(c => c !== context)
      : [...contextFilters, context];
    setContextFilters(newFilters);
    onFilterChange({ searchText, typeFilters, contextFilters: newFilters, statusFilters });
  };

  const handleStatusToggle = (status: FilterState['statusFilters'][number]) => {
    const newFilters = statusFilters.includes(status)
      ? statusFilters.filter(s => s !== status)
      : [...statusFilters, status];
    setStatusFilters(newFilters);
    onFilterChange({ searchText, typeFilters, contextFilters, statusFilters: newFilters });
  };

  const handleClearFilters = () => {
    setSearchText('');
    setTypeFilters([]);
    setContextFilters([]);
    setStatusFilters([]);
    onFilterChange({ searchText: '', typeFilters: [], contextFilters: [], statusFilters: [] });
  };

  const hasActiveFilters = searchText || typeFilters.length > 0 || contextFilters.length > 0 || statusFilters.length > 0;
  const activeFilterCount = typeFilters.length + contextFilters.length + statusFilters.length;

  return (
    <div className="search-filter">
      <div className="search-filter-main-row">
        <div className="search-filter-input-wrapper">
          <input
            type="text"
            placeholder="🔍 Rechercher une tâche..."
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-filter-input"
          />
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className={`search-filter-toggle-btn ${isExpanded ? 'active' : ''}`}
          title="Afficher/masquer les filtres"
        >
          🎛️ Filtres {activeFilterCount > 0 && `(${activeFilterCount})`}
          <span className={`search-filter-toggle-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </button>

        {hasActiveFilters && (
          <button onClick={handleClearFilters} className="search-filter-clear-btn">
            ✕ Effacer
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="search-filter-dropdown">
          <div className="search-filter-group">
            <label className="search-filter-label">Type</label>
            <div className="search-filter-options">
              {TYPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleTypeToggle(option.value)}
                  className={`search-filter-chip ${typeFilters.includes(option.value) ? 'active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="search-filter-group">
            <label className="search-filter-label">Contexte</label>
            <div className="search-filter-options">
              {CONTEXT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleContextToggle(option.value)}
                  className={`search-filter-chip ${contextFilters.includes(option.value) ? 'active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {showStatusFilter && (
            <div className="search-filter-group">
              <label className="search-filter-label">Statut</label>
              <div className="search-filter-options">
                {STATUS_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusToggle(option.value)}
                    className={`search-filter-chip ${statusFilters.includes(option.value) ? 'active' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

