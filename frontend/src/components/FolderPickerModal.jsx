import { useState, useEffect } from 'react';
import { listFolders } from '../services/api';

export default function FolderPickerModal({ onClose, onMove, currentFolderId, disableFolderIds = [] }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all root folders OR maybe all folders? 
    // To make it simple, an app like this usually fetches all folders 
    // and displays them as a flat list or tree. Let's do a flat list of all folders for now.
    async function loadAllFolders() {
      try {
        const res = await listFolders(''); // Getting all folders
        // Filter out folders we are not allowed to move into (e.g. moving a folder into itself)
        const validFolders = res.folders.filter(f => !disableFolderIds.includes(f.id));
        setFolders(validFolders);
      } catch (err) {
        console.error('Failed to load folders for picker:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllFolders();
  }, [disableFolderIds]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal animate-scale" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="headline-sm">Move to...</h2>
          <button className="btn-icon" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ height: '150px' }}>
            <span className="material-symbols-outlined" style={{ animation: 'pulse-glow 1.5s ease infinite', color: 'var(--primary)', fontSize: '2rem' }}>cloud_sync</span>
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {/* Option to move to root */}
            <div 
              className="folder-picker-item" 
              onClick={() => onMove(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: currentFolderId === null ? 'var(--secondary-container)' : 'transparent' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-container-high)'}
              onMouseOut={(e) => e.currentTarget.style.background = currentFolderId === null ? 'var(--secondary-container)' : 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>home</span>
              <span className="title-md">Home (Root)</span>
            </div>

            {/* List folders */}
            {folders.map(f => (
              <div 
                key={f.id} 
                onClick={() => onMove(f.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: currentFolderId === f.id ? 'var(--secondary-container)' : 'transparent' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-container-high)'}
                onMouseOut={(e) => e.currentTarget.style.background = currentFolderId === f.id ? 'var(--secondary-container)' : 'transparent'}
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>folder</span>
                <span className="body-md truncate">{f.name}</span>
              </div>
            ))}
            
            {folders.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                No other folders found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
