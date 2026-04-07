import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { listFolders, listPhotos, createFolder, renameFolder, deleteFolder, moveFolder, getFolder, getPhotoUrl, deletePhoto, batchMovePhotos } from '../services/api';
import PhotoViewer from '../components/PhotoViewer';
import FolderPickerModal from '../components/FolderPickerModal';

export default function FileManagerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentFolderId = searchParams.get('folder') || null;

  const [folders, setFolders] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(-1);

  // Modals & Context
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null); 
  const contextRef = useRef(null);

  // Selection Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  useEffect(() => {
    loadContent();
  }, [currentFolderId]);

  // Close context menu on click outside
  useEffect(() => {
    function handleClick(e) {
      if (contextRef.current && !contextRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  async function loadContent() {
    setLoading(true);
    try {
      const [foldersData, photosData] = await Promise.all([
        listFolders(currentFolderId || 'root'),
        listPhotos({ folderId: currentFolderId || 'root', limit: 50 }),
      ]);
      setFolders(foldersData.folders);
      setPhotos(photosData.photos);

      // Load breadcrumb
      if (currentFolderId) {
        const folderDetail = await getFolder(currentFolderId);
        setBreadcrumb(folderDetail.breadcrumb || []);
      } else {
        setBreadcrumb([]);
      }
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  function navigateToFolder(folderId) {
    if (folderId) {
      setSearchParams({ folder: folderId });
    } else {
      setSearchParams({});
    }
  }

  async function handleCreateFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setShowNewFolder(false);
      loadContent();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRenameFolder(e) {
    e.preventDefault();
    if (!renameValue.trim() || !renameTarget) return;
    try {
      await renameFolder(renameTarget.id, renameValue.trim());
      setRenameTarget(null);
      setRenameValue('');
      loadContent();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleContextMenu(e, item, type = 'folder') {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 120);
    setContextMenu({ x, y, item, type });
  }

  function toggleSelectionMode() {
    setIsSelectionMode(!isSelectionMode);
    setSelectedFolders([]);
    setSelectedPhotos([]);
  }

  function toggleSelectFolder(id) {
    setSelectedFolders(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }

  function toggleSelectPhoto(id) {
    setSelectedPhotos(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  async function handleMove(targetFolderId) {
    try {
      if (moveTarget?.type === 'multi') {
        const promises = [];
        if (selectedPhotos.length > 0) {
          promises.push(batchMovePhotos(selectedPhotos, targetFolderId));
        }
        for (const fId of selectedFolders) {
          promises.push(moveFolder(fId, targetFolderId));
        }
        await Promise.all(promises);
        toggleSelectionMode();
      } else if (moveTarget?.type === 'folder') {
        await moveFolder(moveTarget.item.id, targetFolderId);
      } else if (moveTarget?.type === 'photo') {
        await batchMovePhotos([moveTarget.item.id], targetFolderId);
      }
      setShowMovePicker(false);
      setMoveTarget(null);
      loadContent();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteConfirmed() {
    try {
      if (deleteTarget?.type === 'multi') {
        const promises = [];
        for (const pId of selectedPhotos) promises.push(deletePhoto(pId));
        for (const fId of selectedFolders) promises.push(deleteFolder(fId));
        await Promise.all(promises);
        toggleSelectionMode();
      } else if (deleteTarget?.type === 'folder') {
        await deleteFolder(deleteTarget.item.id);
      } else if (deleteTarget?.type === 'photo') {
        await deletePhoto(deleteTarget.item.id);
      }
      setDeleteTarget(null);
      loadContent();
    } catch (err) {
      alert(err.message);
    }
  }

  function openViewer(index) {
    setViewerIndex(index);
    setViewerPhoto(photos[index]);
  }

  function formatSize(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        {/* Breadcrumb */}
        <div>
          <div className="breadcrumb" style={{ marginBottom: '0.5rem' }}>
            <span className="breadcrumb-item" onClick={() => navigateToFolder(null)}>Home</span>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span className="material-symbols-outlined breadcrumb-separator" style={{ fontSize: '1.125rem' }}>chevron_right</span>
                <span
                  className="breadcrumb-item"
                  onClick={() => i < breadcrumb.length - 1 ? navigateToFolder(crumb.id) : null}
                  style={{ fontWeight: i === breadcrumb.length - 1 ? 600 : 400, color: i === breadcrumb.length - 1 ? 'var(--on-surface)' : undefined }}
                >
                  {crumb.name}
                </span>
              </span>
            ))}
          </div>
          <h1 className="headline-lg">{breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'My Archive'}</h1>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isSelectionMode ? (
            <>
              <span className="body-md" style={{ color: 'var(--on-surface-variant)', marginRight: '0.5rem' }}>
                {selectedFolders.length + selectedPhotos.length} selected
              </span>
              <button 
                className="btn btn-secondary" 
                disabled={selectedFolders.length === 0 && selectedPhotos.length === 0}
                onClick={() => { setMoveTarget({ type: 'multi' }); setShowMovePicker(true); }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>drive_file_move</span>
                Move
              </button>
              <button 
                className="btn btn-secondary danger" 
                style={{ color: 'var(--error)' }}
                disabled={selectedFolders.length === 0 && selectedPhotos.length === 0}
                onClick={() => setDeleteTarget({ type: 'multi' })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
                Delete
              </button>
              <button className="btn btn-ghost" onClick={toggleSelectionMode}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={toggleSelectionMode} title="Select Items">
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>checklist</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setShowNewFolder(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>create_new_folder</span>
                Create New Folder
              </button>
              <button className="btn btn-primary" onClick={() => navigate(`/upload${currentFolderId ? `?folder=${currentFolderId}` : ''}`)}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>cloud_upload</span>
                Upload Here
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: '40vh' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--primary)', animation: 'pulse-glow 1.5s ease infinite' }}>cloud_sync</span>
        </div>
      ) : (
        <>
          {/* Folders */}
          {folders.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`folder-card ${selectedFolders.includes(folder.id) ? 'selected' : ''}`}
                  onClick={() => isSelectionMode ? toggleSelectFolder(folder.id) : navigateToFolder(folder.id)}
                  onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
                  style={{ position: 'relative', border: selectedFolders.includes(folder.id) ? '2px solid var(--primary)' : 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="folder-icon" style={{ background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}>
                      <span className="material-symbols-outlined">folder</span>
                    </div>
                    <button
                      className="btn-icon"
                      style={{ width: '2rem', height: '2rem', background: 'transparent' }}
                      onClick={(e) => handleContextMenu(e, folder, 'folder')}
                      title="More options"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--outline)' }}>more_vert</span>
                    </button>
                  </div>
                  <div className="title-md truncate">{folder.name}</div>
                  <div className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
                    {folder.photoCount} items{folder.subfolderCount > 0 ? ` • ${folder.subfolderCount} folders` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div style={{ marginTop: folders.length > 0 ? 0 : '1.5rem' }}>
              <div className="photo-grid">
                {photos.map((photo, index) => (
                  <div 
                    key={photo.id} 
                    className="photo-card" 
                    onClick={() => isSelectionMode ? toggleSelectPhoto(photo.id) : openViewer(index)}
                    onContextMenu={(e) => handleContextMenu(e, photo, 'photo')}
                    style={{ border: selectedPhotos.includes(photo.id) ? '2px solid var(--primary)' : 'none' }}
                  >
                    <img
                      src={getPhotoUrl(photo.id)}
                      alt={photo.originalName}
                      loading="lazy"
                      style={{ background: 'var(--surface-container-low)' }}
                      onError={(e) => {
                        e.target.src = '';
                        e.target.style.background = 'var(--surface-container-high)';
                      }}
                    />
                    <div className="photo-card-info">
                      <div className="title-md truncate" style={{ fontSize: '0.8125rem' }}>{photo.originalName}</div>
                      <div className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>
                        {formatSize(photo.fileSize)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {folders.length === 0 && photos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--outline-variant)', marginBottom: '1rem', display: 'block' }}>folder_off</span>
              <p className="headline-sm" style={{ marginBottom: '0.5rem' }}>This space is empty</p>
              <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Create a folder or upload some photos to get started.</p>
            </div>
          )}
        </>
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="modal-backdrop" onClick={() => setShowNewFolder(false)}>
          <div className="modal animate-scale" onClick={(e) => e.stopPropagation()}>
            <h2 className="headline-sm" style={{ marginBottom: '1.5rem' }}>Create New Folder</h2>
            <form onSubmit={handleCreateFolder}>
              <input
                className="input"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewFolder(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="modal-backdrop" onClick={() => setRenameTarget(null)}>
          <div className="modal animate-scale" onClick={(e) => e.stopPropagation()}>
            <h2 className="headline-sm" style={{ marginBottom: '1.5rem' }}>Rename Folder</h2>
            <form onSubmit={handleRenameFolder}>
              <input
                className="input"
                placeholder="New name..."
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setRenameTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Rename</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="mobile-only-backdrop" onClick={() => setContextMenu(null)} />
          <div ref={contextRef} className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed', zIndex: 100 }}>
            {contextMenu.type === 'folder' && (
              <button className="context-menu-item" onClick={() => { setRenameTarget(contextMenu.item); setRenameValue(contextMenu.item.name); setContextMenu(null); }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
                Rename
              </button>
            )}
            <button className="context-menu-item" onClick={() => { setMoveTarget({ type: contextMenu.type, item: contextMenu.item }); setShowMovePicker(true); setContextMenu(null); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>drive_file_move</span>
              Move to...
            </button>
            <button className="context-menu-item danger" onClick={() => { setDeleteTarget({ type: contextMenu.type, item: contextMenu.item }); setContextMenu(null); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
              Delete
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal animate-scale" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)', background: 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: '1.5rem' }}>warning</span>
              </div>
              <div>
                <h2 className="headline-sm" style={{ marginBottom: '0.25rem' }}>Confirm Deletion</h2>
                <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>This action cannot be undone.</p>
              </div>
            </div>
            <p className="body-lg" style={{ marginBottom: '1.5rem' }}>
              {deleteTarget.type === 'folder' 
                ? `Are you sure you want to delete "${deleteTarget.item.name}"? This will permanently delete ALL photos and folders inside it.`
                : deleteTarget.type === 'multi'
                  ? `Are you sure you want to permanently delete these ${selectedPhotos.length + selectedFolders.length} items? All contents inside selected folders will also be destroyed.`
                  : `Are you sure you want to permanently delete this photo?`
              }
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: 'var(--error)', color: 'var(--on-error)' }}
                onClick={handleDeleteConfirmed}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Picker Modal */}
      {showMovePicker && moveTarget && (
        <FolderPickerModal
          currentFolderId={currentFolderId}
          disableFolderIds={moveTarget.type === 'folder' ? [moveTarget.item.id] : (moveTarget.type === 'multi' ? selectedFolders : [])}
          onClose={() => { setShowMovePicker(false); setMoveTarget(null); }}
          onMove={handleMove}
        />
      )}

      {/* Photo Viewer */}
      {viewerPhoto && (
        <PhotoViewer
          photo={viewerPhoto}
          photos={photos}
          currentIndex={viewerIndex}
          onClose={() => { setViewerPhoto(null); setViewerIndex(-1); }}
          onNavigate={(index) => { setViewerIndex(index); setViewerPhoto(photos[index]); }}
          onDeleted={() => { setViewerPhoto(null); setViewerIndex(-1); loadContent(); }}
        />
      )}
    </div>
  );
}
