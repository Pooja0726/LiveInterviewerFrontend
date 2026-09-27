import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { authed, email, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentTab = location.state?.tab || 'home';
  const isDashboard = location.pathname === '/dashboard';
  const isCoding = location.pathname === '/coding-practice';

  const firstName = email ? email.split('@')[0].split('.')[0] : 'there';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">LV</div>
          <div className="brand-text">
            <strong>LIVE</strong>interVIEWer
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {authed && (
          <>
            <Link
              to="/dashboard"
              className={`sidebar-item ${isDashboard && currentTab === 'home' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/dashboard', { state: { tab: 'home' } });
              }}
            >
              Overview
            </Link>
            <Link
              to="/coding-practice"
              className={`sidebar-item ${isCoding ? 'active' : ''}`}
            >
              Coding
            </Link>
            <Link
              to="/dashboard"
              className={`sidebar-item ${isDashboard && currentTab === 'history' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/dashboard', { state: { tab: 'history' } });
              }}
            >
              History
            </Link>
            <Link
              to="/dashboard"
              className={`sidebar-item ${isDashboard && currentTab === 'reports' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/dashboard', { state: { tab: 'reports' } });
              }}
            >
              Reports
            </Link>
          </>
        )}
        {!authed && (
          <Link to="/login" className="sidebar-item">
            Login
          </Link>
        )}
      </nav>

      <div className="sidebar-divider"></div>

      <div className="sidebar-status">
        <div className="status-label">INTERVIEW MODE</div>
        <div className="status-badge">
          <span className="status-dot"></span> David • ready
        </div>
      </div>

      <div className="sidebar-footer">
        {authed && (
          <div className="user-profile" onClick={handleLogout} title="Click to logout" style={{ cursor: 'pointer' }}>
            <div className="user-avatar">{displayName.charAt(0)}</div>
            <div className="user-details">
              <div className="user-name">{displayName}</div>
              <div className="user-role" style={{ color: 'var(--text-muted)' }}>Log out</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
