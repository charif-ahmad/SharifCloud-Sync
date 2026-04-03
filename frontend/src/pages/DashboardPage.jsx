import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStorageStats, listPhotos, getPhotoUrl } from '../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStorageStats(),
      listPhotos({ limit: 4, sort: 'uploaded_at', order: 'desc' }),
    ]).then(([s, p]) => {
      setStats(s);
      setRecentPhotos(p.photos);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex-center" style={{ height: '60vh' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--primary)', animation: 'pulse-glow 1.5s ease infinite' }}>cloud_sync</span>
    </div>;
  }

  function formatSize(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  }

  const apiKey = localStorage.getItem('sharifcloud_api_key') || '';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="display-md" style={{ marginBottom: '0.25rem' }}>Welcome back, Sharif</h1>
        <p className="body-lg" style={{ color: 'var(--on-surface-variant)' }}>Your ethereal collection is safe and organized.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid-stats" style={{ marginBottom: '2.5rem' }}>
          <div className="stat-card">
            <div className="flex-between">
              <div className="stat-icon" style={{ background: 'var(--surface-container-low)', color: 'var(--primary)' }}>
                <span className="material-symbols-outlined">photo_library</span>
              </div>
            </div>
            <div>
              <div className="display-md" style={{ fontSize: '2rem', lineHeight: 1 }}>{stats.totalPhotos.toLocaleString()}</div>
              <div className="body-md" style={{ color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>Total Images</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex-between">
              <div className="stat-icon" style={{ background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}>
                <span className="material-symbols-outlined">folder</span>
              </div>
            </div>
            <div>
              <div className="display-md" style={{ fontSize: '2rem', lineHeight: 1 }}>{(stats.totalFolders || 0).toLocaleString()}</div>
              <div className="body-md" style={{ color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>Folders Created</div>
            </div>
          </div>

          <div className="stat-card dark">
            <div className="flex-between">
              <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                <span className="material-symbols-outlined">cloud</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>{stats.totalSize}</div>
              <div className="body-md" style={{ color: 'var(--inverse-on-surface)', marginTop: '0.25rem' }}>Storage Used</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Uploads */}
      <div>
        <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
          <h2 className="headline-md">Recent Uploads</h2>
          <Link to="/files" className="btn btn-ghost" style={{ fontSize: '0.8125rem' }}>
            View All Archive
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
          </Link>
        </div>

        {recentPhotos.length > 0 ? (
          <div className="photo-grid">
            {recentPhotos.map((photo) => (
              <div key={photo.id} className="photo-card">
                <img
                  src={getPhotoUrl(photo.id)}
                  alt={photo.originalName}
                  loading="lazy"
                  style={{ background: 'var(--surface-container-low)' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                  // Append API key as a custom header isn't possible with img tags,
                  // so we need to handle this differently — see below
                />
                <div className="photo-card-info">
                  <div className="title-md truncate">{photo.originalName}</div>
                  <div className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
                    {timeAgo(photo.uploadedAt)} • {formatSize(photo.fileSize)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline-variant)', marginBottom: '1rem', display: 'block' }}>cloud_upload</span>
            <p className="headline-sm" style={{ marginBottom: '0.5rem' }}>No photos yet</p>
            <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Start uploading your collection to the archive.</p>
            <Link to="/upload" className="btn btn-primary">Upload Photos</Link>
          </div>
        )}
      </div>
    </div>
  );
}
