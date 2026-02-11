import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { api, type Task } from '../../../lib/api';
import TaskCard from './TaskCard';
import QuickTaskPicker from './QuickTaskPicker';
import './TaskList.css';

interface TaskListProps {
  onTaskClick?: (task: Task) => void;
  filter?: 'all' | 'today' | 'week' | 'in_progress';
  searchText?: string;
  typeFilters?: Array<'QUICK' | 'DEEP_WORK' | 'COURSE' | 'ADMIN'>;
  contextFilters?: Array<'PERSONAL' | 'WORK' | 'LEARNING'>;
  statusFilters?: Array<'INBOX' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'>;
}

export default function TaskList({ 
  onTaskClick, 
  filter = 'all',
  searchText = '',
  typeFilters = [],
  contextFilters = [],
  statusFilters = []
}: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showQuickPicker, setShowQuickPicker] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Stabilize filter dependencies to prevent infinite re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableTypeFilters = useMemo(() => typeFilters, [JSON.stringify(typeFilters)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableContextFilters = useMemo(() => contextFilters, [JSON.stringify(contextFilters)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableStatusFilters = useMemo(() => statusFilters, [JSON.stringify(statusFilters)]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { tasks: fetchedTasks } = await api.getTasks();
      
      let filteredTasks = fetchedTasks;
      const todayEndpoint = new Date();
      todayEndpoint.setHours(23, 59, 59, 999);
      
      const weekEndpoint = new Date();
      weekEndpoint.setDate(weekEndpoint.getDate() + 7);
      weekEndpoint.setHours(23, 59, 59, 999);

      if (filter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        filteredTasks = fetchedTasks.filter(task => {
          if (!task.assignedDate && !task.deadline) return false;
          
          if (task.assignedDate) {
            return task.assignedDate.toString().split('T')[0] === todayStr;
          }
          
          if (task.deadline) {
            const deadline = new Date(task.deadline);
            return deadline <= todayEndpoint;
          }
          
          return false;
        });
      } else if (filter === 'week') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        filteredTasks = fetchedTasks.filter(task => {
          if (task.assignedDate) {
            const assigned = new Date(task.assignedDate);
            return assigned >= today && assigned <= weekEndpoint;
          }
          
          if (task.deadline) {
            const deadline = new Date(task.deadline);
            return deadline >= today && deadline <= weekEndpoint;
          }
          
          return false;
        });
      } else if (filter === 'in_progress') {
        filteredTasks = fetchedTasks.filter(task => task.status === 'IN_PROGRESS');
      }

      // Apply search and additional filters
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filteredTasks = filteredTasks.filter(task =>
          task.content.toLowerCase().includes(searchLower)
        );
      }

      if (stableTypeFilters.length > 0) {
        filteredTasks = filteredTasks.filter(task =>
          task.type && stableTypeFilters.includes(task.type)
        );
      }

      if (stableContextFilters.length > 0) {
        filteredTasks = filteredTasks.filter(task =>
          task.context && stableContextFilters.includes(task.context)
        );
      }

      if (stableStatusFilters.length > 0) {
        filteredTasks = filteredTasks.filter(task =>
          stableStatusFilters.includes(task.status)
        );
      }

      // Sort by priority (highest first), then by creation date
      const sortedTasks = filteredTasks.sort((a, b) => {
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setTasks(sortedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filter, searchText, stableTypeFilters, stableContextFilters, stableStatusFilters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleQuickTaskSelect(taskId: string) {
    try {
      // Update task status to IN_PROGRESS
      await api.updateTask(taskId, { status: 'IN_PROGRESS' });
      
      // Reload tasks to reflect changes
      await loadTasks();
      
      // Show success feedback
      setError('✅ Tâche démarrée ! Bon courage !');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de démarrer la tâche');
    } finally {
      setShowQuickPicker(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);

    const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
    
    // Optimistically update UI
    setTasks(reorderedTasks);

    try {
      // Calculate new priorities based on position
      // First task (index 0) gets highest priority (10)
      // Last task gets lowest priority (1)
      const totalTasks = reorderedTasks.length;
      const updates = reorderedTasks.map((task, index) => {
        const newPriority = Math.max(1, Math.min(10, totalTasks - index));
        return { id: task.id, priority: newPriority };
      });

      // Update priorities for all affected tasks
      await Promise.all(
        updates
          .filter((update, index) => update.priority !== tasks[index]?.priority)
          .map((update) => api.updateTask(update.id, { priority: update.priority }))
      );

      // Reload tasks to get fresh data
      await loadTasks();
    } catch (err) {
      // Rollback on error
      setTasks(tasks);
      setError(err instanceof Error ? err.message : 'Failed to update task order');
    }
  }

  async function handleAIReorder() {
    try {
      setReordering(true);
      setError(null);
      
      const result = await api.reorderTasks();
      
      // Reload tasks to show new order
      await loadTasks();
      
      // Show success message briefly
      setError(`✅ ${result.message}`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Rate limit')) {
        setError('⏱️ Limite de taux atteinte. Réessayez dans 1 minute.');
      } else {
        setError(err instanceof Error ? err.message : 'Échec de la réorganisation');
      }
    } finally {
      setReordering(false);
    }
  }

  async function handleAssignDaily() {
    try {
      setAssigning(true);
      setError(null);
      
      const result = await api.assignDailyTasks();
      
      // Reload tasks to show assigned ones
      await loadTasks();
      
      // Show success message briefly
      setError(`✅ ${result.message}`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'assignation');
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="task-list-container">
        <div className="task-list-loading">
          <div className="task-list-spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-list-container">
        <div className="task-list-error">
          <p>❌ {error}</p>
          <button onClick={loadTasks} className="task-list-retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list-container">
        <div className="task-list-empty">
          <div className="task-list-empty-icon">📋</div>
          <h3>No tasks yet</h3>
          <p>Create your first task to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="task-list-container">
        <div className="task-list-header">
          <h2>Your Tasks</h2>
          <div className="task-list-actions">
            <p className="task-list-count">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </p>
            <button 
              onClick={handleAIReorder} 
              className="task-list-ai-btn"
              disabled={reordering || tasks.length === 0}
              title="Réorganiser les tâches avec l'IA"
            >
              {reordering ? '⏳ Réorganisation...' : '🤖 Réorganiser avec IA'}
            </button>
            <button 
              onClick={handleAssignDaily} 
              className="task-list-assign-btn"
              disabled={assigning || tasks.length === 0}
              title="Assigner les tâches pour aujourd'hui selon le calendrier"
            >
              {assigning ? '⏳ Assignation...' : '📅 Assigner les tâches du jour'}
            </button>
            <button 
              onClick={() => setShowQuickPicker(true)} 
              className="task-list-quick-btn"
              title="Trouver des tâches selon votre temps disponible"
            >
              ⏱️ J'ai du temps
            </button>
          </div>
        </div>
        
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="task-list">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} />
            ))}
          </div>
        </SortableContext>
      </div>

      <QuickTaskPicker 
        isOpen={showQuickPicker} 
        onClose={() => setShowQuickPicker(false)}
        onTaskSelect={handleQuickTaskSelect} 
      />
    </DndContext>
  );
}
