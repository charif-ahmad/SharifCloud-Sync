import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { getStorageStats } from '../services/api';

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStorageStats().then(setStats).catch(() => {});
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navItems = [
    { to: '/', icon: 'dashboard', label: 'Dashboard' },
    { to: '/files', icon: 'folder_open', label: 'File Manager' },
    { to: '/upload', icon: 'cloud_upload', label: 'Upload' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.5rem 2rem' }}>
        <div style={{
          width: '2.25rem', height: '2.25rem',
          background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
          borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--on-primary)', fontSize: '1.25rem' }}>cloud_done</span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.2 }}>The Archive</div>
          <div className="label-sm" style={{ color: 'var(--on-surface-variant)', letterSpacing: '0.1em' }}>Premium Storage</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Storage Bar */}
      {stats && (
        <div style={{ padding: '1rem 0.5rem 0.5rem' }}>
          <div className="label-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Storage Used</div>
          <div className="storage-bar">
            <div className="storage-bar-fill" style={{ width: `${Math.min((stats.totalSizeBytes / (1024 * 1024 * 1024)) * 100, 100)}%` }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
            {stats.totalSize} used
          </div>
        </div>
      )}

      {/* Logout */}
      <button className="nav-link" onClick={handleLogout} style={{ marginTop: '0.5rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>logout</span>
        Logout
      </button>
    </aside>
  );
}
