import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import CreateTaskButton from './ui/CreateTaskButton';
import CreateTaskModal from '../features/tasks/modals/CreateTaskModal';
import SettingsModal from '../features/settings/SettingsModal';
import GeminiQuotaWidget from './ui/GeminiQuotaWidget';

interface LayoutProps {
  onLogout: () => void;
}

export default function Layout({ onLogout }: LayoutProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Note: Selected task state might need to be moved to context or processed here differently 
  // if we want EditModal to be available globally triggered from children
  // For now, we'll keep simple structure

  const handleTaskCreated = () => {
    // This will trigger a refresh in the child components via Context or other means
    // For now we might need to force refresh or use React Query later
    window.dispatchEvent(new Event('task-created'));
  };

  return (
    <div className="app-layout">
      <Header 
        onSettingsClick={() => setIsSettingsOpen(true)}
        onLogoutClick={onLogout}
      />
      
      <main className="app-content">
        <div className="container">
          <Outlet context={{ isCreateModalOpen }} />
        </div>
      </main>

      <CreateTaskButton onClick={() => setIsCreateModalOpen(true)} />

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <GeminiQuotaWidget />
    </div>
  );
}
