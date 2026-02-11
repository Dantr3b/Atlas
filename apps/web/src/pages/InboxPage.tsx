import { useEffect, useState } from 'react';
import TaskList from '../features/tasks/components/TaskList';
import { type Task } from '../lib/api';
import EditTaskModal from '../features/tasks/modals/EditTaskModal';
import SearchFilter, { type FilterState } from '../features/tasks/components/SearchFilter';

export default function InboxPage() {
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
    <div className="page inbox-page">
      <div className="page-header">
        <h2>Inbox</h2>
        <p className="text-secondary">Toutes vos tâches</p>
      </div>
      
      <SearchFilter onFilterChange={setFilters} showStatusFilter={true} />
      
      <TaskList 
        key={refreshTrigger} 
        filter="all" 
        onTaskClick={handleTaskClick}
        searchText={filters.searchText}
        typeFilters={filters.typeFilters}
        contextFilters={filters.contextFilters}
        statusFilters={filters.statusFilters}
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
