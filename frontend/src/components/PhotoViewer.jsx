import { useEffect, useCallback, useRef, useState } from 'react';
import { deletePhoto, getPhotoUrl } from '../services/api';

export default function PhotoViewer({ photo, photos, currentIndex, onClose, onNavigate, onDeleted }) {
  const [showDelete, setShowDelete] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
    if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, photos.length, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Touch swipe for mobile navigation
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Only swipe if horizontal movement > vertical
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0 && currentIndex > 0) onNavigate(currentIndex - 1);
      if (dx < 0 && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  async function handleDelete() {
    try {
      await deletePhoto(photo.id);
      setShowDelete(false);
      onDeleted();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  function handleDownload() {
    fetch(getPhotoUrl(photo.id))
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = photo.originalName;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  function formatSize(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  return (
    <div
      className="viewer-overlay animate-fade-in"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="viewer-header" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header-info">
          <div className="viewer-header-icon">
            <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '1.125rem' }}>photo_camera</span>
          </div>
          <div>
            <div className="viewer-filename">{photo.originalName}</div>
            <div className="viewer-fileinfo">{formatSize(photo.fileSize)} • {currentIndex + 1}/{photos.length}</div>
          </div>
        </div>
        <button
          className="btn-icon viewer-close-btn"
          onClick={onClose}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Image */}
      <img
        className="viewer-image animate-scale"
        src={getPhotoUrl(photo.id)}
        alt={photo.originalName}
        onClick={(e) => e.stopPropagation()}
        onError={(e) => { e.target.style.background = 'var(--surface-container-high)'; }}
      />

      {/* Navigation Arrows — Desktop only (CSS hidden on mobile) */}
      {currentIndex > 0 && (
        <button className="viewer-nav prev" onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}>
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button className="viewer-nav next" onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      )}

      {/* Bottom Toolbar */}
      <div className="viewer-toolbar" onClick={(e) => e.stopPropagation()}>
        <button className="viewer-action-btn" title="Delete" onClick={() => setShowDelete(true)}>
          <span className="material-symbols-outlined" style={{ color: 'var(--error)' }}>delete</span>
          <span className="viewer-action-label">Delete</span>
        </button>
        <button className="viewer-action-btn" title="Download" onClick={handleDownload}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>download</span>
          <span className="viewer-action-label">Save</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="modal-backdrop" style={{ zIndex: 110 }} onClick={(e) => { e.stopPropagation(); setShowDelete(false); }}>
          <div className="modal animate-scale" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)', background: 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: '1.5rem' }}>warning</span>
              </div>
              <div>
                <h2 className="headline-sm" style={{ marginBottom: '0.25rem' }}>Delete Photo</h2>
                <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>This action cannot be undone.</p>
              </div>
            </div>
            <p className="body-lg" style={{ marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>"{photo.originalName}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button>
              <button
                className="btn"
                style={{ background: 'var(--error)', color: 'var(--on-error)' }}
                onClick={handleDelete}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
