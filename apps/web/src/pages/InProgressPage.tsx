import { useEffect, useState } from 'react';
import TaskList from '../features/tasks/components/TaskList';
import { type Task } from '../lib/api';
import EditTaskModal from '../features/tasks/modals/EditTaskModal';
import SearchFilter, { type FilterState } from '../features/tasks/components/SearchFilter';

export default function InProgressPage() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    typeFilters: [],
    contextFilters: [],
    statusFilters: [],
  });

  useEffect(() => {
    const handleTaskCreated = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener('task-created', handleTaskCreated);
    return () => window.removeEventListener('task-created', handleTaskCreated);
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  return (
    <div className="page in-progress-page">
      <div className="page-header">
        <h2>Tâches en Cours</h2>
        <p className="text-secondary">Ce sur quoi vous travaillez actuellement</p>
      </div>
      
      <SearchFilter onFilterChange={setFilters} showStatusFilter={false} />
      
      <TaskList 
        key={refreshTrigger} 
        filter="in_progress" 
        onTaskClick={handleTaskClick}
        searchText={filters.searchText}
        typeFilters={filters.typeFilters}
        contextFilters={filters.contextFilters}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={() => setRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
}
