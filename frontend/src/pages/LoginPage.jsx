import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkHealth } from '../services/api';

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // Check server on mount
  useEffect(() => {
    checkHealth()
      .then((data) => setServerStatus(data.status))
      .catch(() => setServerStatus('offline'));
  }, []);

  if (isAuthenticated) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError('');

    try {
      await login(key.trim());
      navigate('/', { replace: true });
    } catch {
      setError('Invalid API key. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ position: 'relative', minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Animated Background Blobs */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%',
          borderRadius: '50%', background: 'var(--primary-container)', opacity: 0.2,
          filter: 'blur(120px)', animation: 'pulse-glow 4s ease infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-5%', right: '-5%', width: '35%', height: '35%',
          borderRadius: '50%', background: 'var(--tertiary-container)', opacity: 0.15,
          filter: 'blur(100px)', animation: 'pulse-glow 5s ease infinite 1s',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '10%', width: '20%', height: '20%',
          borderRadius: '50%', background: 'var(--secondary-container)', opacity: 0.1,
          filter: 'blur(80px)', animation: 'pulse-glow 6s ease infinite 2s',
        }} />
      </div>

      {/* Login Card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '0 1.5rem' }}>
        <div className="glass-panel animate-scale" style={{ padding: '2.5rem' }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '3.5rem', height: '3.5rem',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem',
              boxShadow: '0 8px 24px rgba(0, 83, 220, 0.2)',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--on-primary)', fontSize: '1.75rem' }}>cloud_done</span>
            </div>
            <h1 className="headline-lg" style={{ marginBottom: '0.5rem' }}>Welcome</h1>
            <p className="body-md" style={{ color: 'var(--on-surface-variant)', textAlign: 'center' }}>
              Enter your secure vault credentials to access the archive.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label className="label-md" htmlFor="api_key" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '0.5rem', marginLeft: '0.25rem' }}>
                Enter API Key
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--outline)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>key</span>
                </div>
                <input
                  className="input"
                  id="api_key"
                  type="password"
                  placeholder="sk-archive-••••••••••••"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  style={{ paddingLeft: '2.75rem' }}
                  autoFocus
                />
              </div>
              {error && (
                <p style={{ color: 'var(--error)', fontSize: '0.8125rem', marginTop: '0.5rem', marginLeft: '0.25rem' }}>{error}</p>
              )}
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
            >
              {loading ? 'Connecting...' : 'Login'}
              {!loading && <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_forward</span>}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ height: '1px', width: '3rem', background: 'var(--outline-variant)', opacity: 0.3 }} />
            <p className="label-sm" style={{ color: 'var(--outline)', letterSpacing: '0.05em' }}>
              SharifCloud-Sync © 2026
            </p>
          </div>
        </div>
      </div>

      {/* Server Status */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{
          width: '0.5rem', height: '0.5rem', borderRadius: '50%',
          background: serverStatus === 'online' ? '#10b981' : serverStatus === 'offline' ? 'var(--error)' : 'var(--outline)',
          animation: serverStatus === 'online' ? 'pulse-glow 2s ease infinite' : 'none',
        }} />
        <span className="label-sm" style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>
          {serverStatus === 'online' ? 'Systems Nominal' : serverStatus === 'offline' ? 'Server Offline' : 'Checking...'}
        </span>
      </div>
    </main>
  );
}
