import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
  const { isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--primary)', animation: 'pulse-glow 1.5s ease infinite' }}>
          cloud_sync
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />

      {/* Mobile Top App Bar */}
      <header className="mobile-topbar">
        <div className="mobile-topbar-logo">
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="white"/>
            </svg>
          </div>
          <span>Ether Cloud</span>
        </div>
        <button 
          className="btn-icon" 
          onClick={logout} 
          style={{ background: 'transparent', color: 'var(--error)' }} 
          title="Logout"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span className="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/files" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span className="material-symbols-outlined">folder_open</span>
          <span>Files</span>
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span className="material-symbols-outlined">add_circle</span>
          <span>Upload</span>
        </NavLink>
      </nav>
    </div>
  );
}
