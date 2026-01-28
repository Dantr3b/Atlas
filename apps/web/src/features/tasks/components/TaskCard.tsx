import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../../lib/api';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

function getPriorityColor(priority?: number): string {
  if (!priority) return '';
  if (priority >= 8) return 'var(--color-priority-high)';
  if (priority >= 5) return 'var(--color-priority-medium)';
  return 'var(--color-priority-low)';
}

function getPriorityLabel(priority?: number): string {
  if (!priority) return 'No priority';
  if (priority >= 8) return 'High';
  if (priority >= 5) return 'Medium';
  return 'Low';
}

function getStatusColor(status: Task['status']): string {
  switch (status) {
    case 'COMPLETED': return 'var(--color-success)';
    case 'IN_PROGRESS': return 'var(--color-warning)';
    case 'PLANNED': return 'var(--color-primary)';
    default: return 'var(--color-text-tertiary)';
  }
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColor = getPriorityColor(task.priority);
  const priorityLabel = getPriorityLabel(task.priority);
  const statusColor = getStatusColor(task.status);

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger onClick when clicking the drag handle
    const target = e.target as HTMLElement;
    if (target.closest('.task-card__drag-handle')) {
      return;
    }
    if (onClick) {
      onClick(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'task-card--dragging' : ''}`}
      onClick={handleClick}
    >
      <div
        className="task-card__drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <svg viewBox="0 0 20 20" fill="currentColor">
          <circle cx="7" cy="5" r="1.5" />
          <circle cx="13" cy="5" r="1.5" />
          <circle cx="7" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1.5" />
          <circle cx="7" cy="15" r="1.5" />
          <circle cx="13" cy="15" r="1.5" />
        </svg>
      </div>

      <div className="task-card__content-wrapper" style={{ borderLeftColor: priorityColor }}>
        <div className="task-card__header">
          <span 
            className="task-card__status-badge"
            style={{ backgroundColor: statusColor }}
          >
            {task.status.replace('_', ' ')}
          </span>
          {task.priority && (
            <span 
              className="task-card__priority-badge"
              style={{ color: priorityColor }}
            >
              {priorityLabel} ({task.priority})
            </span>
          )}
        </div>

        <div className="task-card__content">
          {task.content}
        </div>

        <div className="task-card__footer">
          {task.type && (
            <span className="task-card__tag task-card__tag--type">
              {task.type.replace('_', ' ')}
            </span>
          )}
          {task.context && (
            <span className="task-card__tag task-card__tag--context">
              {task.context}
            </span>
          )}
          {task.estimatedDuration && (
            <span className="task-card__tag task-card__tag--duration">
              ⏱ {formatDuration(task.estimatedDuration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
