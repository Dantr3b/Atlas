import { useEffect, useState, useCallback } from 'react';
import TaskList from './features/tasks/components/TaskList';
import CreateTaskButton from './components/ui/CreateTaskButton';
import CreateTaskModal from './features/tasks/modals/CreateTaskModal';
import EditTaskModal from './features/tasks/modals/EditTaskModal';
import LoginPage from './features/auth/LoginPage';
import GeminiQuotaWidget from './components/ui/GeminiQuotaWidget';
import SettingsModal from './features/settings/SettingsModal';
import { api, type Task } from './lib/api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const checkAuth = useCallback(async () => {
    try {
      await api.getMe();
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="app">
        <div className="app-loading">
          <div className="app-spinner"></div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated
  const handleLogout = async () => {
    try {
      await api.logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTaskCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTaskUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <div className="app-header-content">
            <div>
              <h1 className="app-title">Atlas</h1>
              <p className="app-subtitle">Système d'organisation personnel</p>
            </div>
            <div className="app-header-actions">
              <button onClick={() => setIsSettingsOpen(true)} className="app-settings-btn">
                ⚙️ Paramètres
              </button>
              <button onClick={handleLogout} className="app-logout-btn">
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <TaskList key={refreshTrigger} onTaskClick={handleTaskClick} />
        </div>
      </main>

      <CreateTaskButton onClick={() => setIsCreateModalOpen(true)} />
      
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleTaskUpdated}
        onDelete={handleTaskUpdated}
      />

      {/* Gemini API Quota Widget */}
      <GeminiQuotaWidget />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;
