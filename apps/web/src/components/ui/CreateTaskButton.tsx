import './CreateTaskButton.css';

interface CreateTaskButtonProps {
  onClick?: () => void;
}

export default function CreateTaskButton({ onClick }: CreateTaskButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      alert('Task creation coming soon! 🚀');
    }
  };

  return (
    <button 
      className="create-task-btn"
      onClick={handleClick}
      aria-label="Create new task"
    >
      <svg 
        className="create-task-btn__icon" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  );
}
