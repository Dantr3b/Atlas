import { Link, NavLink } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

export default function Header({ onSettingsClick, onLogoutClick }: HeaderProps) {

  return (
    <header className="app-header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="brand-logo">
            <h1 className="app-title">Atlas</h1>
          </Link>

          <nav className="main-nav">
            <NavLink to="/inbox" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Inbox
            </NavLink>
            <NavLink to="/brief" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Brief
            </NavLink>
            <NavLink to="/today" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Aujourd'hui
            </NavLink>
            <NavLink to="/week" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Semaine
            </NavLink>
            <NavLink to="/in-progress" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              En cours
            </NavLink>
          </nav>

          <div className="header-actions">
            <button onClick={onSettingsClick} className="icon-btn" title="Paramètres">
              ⚙️
            </button>
            <button onClick={onLogoutClick} className="icon-btn" title="Déconnexion">
              🚪
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
