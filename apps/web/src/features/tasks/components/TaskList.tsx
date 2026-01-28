import { useEffect, useState } from 'react';
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
import './TaskList.css';

interface TaskListProps {
  onTaskClick?: (task: Task) => void;
}

export default function TaskList({ onTaskClick }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);
      const { tasks: fetchedTasks } = await api.getTasks();
      
      // Sort by priority (highest first), then by creation date
      const sortedTasks = fetchedTasks.sort((a, b) => {
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
      setError('Failed to update task order');
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
          <p className="task-list-count">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
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
    </DndContext>
  );
}
