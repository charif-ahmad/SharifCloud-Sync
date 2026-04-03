import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listFolders, uploadPhoto } from '../services/api';

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const preselectedFolder = searchParams.get('folder') || '';

  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(preselectedFolder);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]); // { id, file, progress, status, error }
  const fileInputRef = useRef(null);
  const uploadIdRef = useRef(0);

  useEffect(() => {
    listFolders().then((data) => setFolders(data.folders)).catch(console.error);
  }, []);

  function addFiles(files) {
    const newUploads = Array.from(files)
      .filter(f => ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(f.type))
      .map((file) => {
        const id = ++uploadIdRef.current;
        return { id, file, progress: 0, status: 'pending', error: null };
      });

    setUploads((prev) => [...prev, ...newUploads]);

    // Start uploading each
    newUploads.forEach((upload) => startUpload(upload));
  }

  async function startUpload(uploadItem) {
    setUploads((prev) => prev.map((u) => u.id === uploadItem.id ? { ...u, status: 'uploading' } : u));

    try {
      await uploadPhoto(uploadItem.file, {
        folderId: selectedFolder || undefined,
        onProgress: (progress) => {
          setUploads((prev) => prev.map((u) => u.id === uploadItem.id ? { ...u, progress } : u));
        },
      });
      setUploads((prev) => prev.map((u) => u.id === uploadItem.id ? { ...u, status: 'done', progress: 100 } : u));
    } catch (err) {
      setUploads((prev) => prev.map((u) => u.id === uploadItem.id ? { ...u, status: 'error', error: err.message } : u));
    }
  }

  function handleDragOver(e) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e) { e.preventDefault(); setIsDragging(false); }
  function handleDrop(e) { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }
  function handleFileSelect(e) { if (e.target.files.length) addFiles(e.target.files); }
  function removeUpload(id) { setUploads((prev) => prev.filter((u) => u.id !== id)); }

  const totalProgress = uploads.length > 0
    ? Math.round(uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length)
    : 0;
  const activeUploads = uploads.filter((u) => u.status === 'uploading');

  function formatSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="display-md" style={{ marginBottom: '0.25rem' }}>Digital Upload</h1>
        <p className="body-lg" style={{ color: 'var(--on-surface-variant)' }}>Curate your high-fidelity archive with ease.</p>
      </div>

      <div className="upload-grid">
        {/* Left: Upload Area */}
        <div>
          {/* Folder Selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label-md" style={{ display: 'block', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>
              Select Destination Folder
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontSize: '1.25rem' }}>folder</span>
              <select
                className="input"
                style={{ paddingLeft: '2.5rem', cursor: 'pointer', appearance: 'none' }}
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
              >
                <option value="">Root (No folder)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: '1.25rem', pointerEvents: 'none' }}>expand_more</span>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={`drop-zone${isDragging ? ' active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{
              width: '4rem', height: '4rem', borderRadius: 'var(--radius-xl)',
              background: 'var(--surface-container-low)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--primary)' }}>cloud_upload</span>
            </div>
            <p className="headline-sm" style={{ marginBottom: '0.5rem' }}>
              {isDragging ? 'Drop your files here' : 'Drag and drop your visual assets'}
            </p>
            <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
              Support for JPEG, PNG, WebP, and HEIC files up to 25MB per file.
            </p>
            <button className="btn btn-primary" type="button">Browse Local Files</button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {/* Right: Upload Queue */}
        <div>
          {uploads.length > 0 && (
            <div style={{ background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)', padding: '1.25rem' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <span className="headline-sm">Uploading ({uploads.length})</span>
                {activeUploads.length > 0 && (
                  <span style={{
                    background: 'var(--primary-container)', color: 'var(--on-primary-fixed)',
                    padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>{totalProgress}% Total</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {uploads.map((upload) => (
                  <div key={upload.id} className="upload-item">
                    <div style={{
                      width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-container-low)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--on-surface-variant)' }}>
                        {upload.status === 'done' ? 'check_circle' : upload.status === 'error' ? 'error' : 'image'}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{upload.file.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                        {formatSize(upload.file.size)} • {upload.status === 'done' ? 'Complete' : upload.status === 'error' ? upload.error : upload.status === 'uploading' ? `${upload.progress}%` : 'Pending'}
                      </div>
                      {upload.status === 'uploading' && (
                        <div className="upload-progress">
                          <div className="upload-progress-bar" style={{ width: `${upload.progress}%` }} />
                        </div>
                      )}
                    </div>
                    <button className="btn-icon" style={{ width: '1.75rem', height: '1.75rem' }} onClick={() => removeUpload(upload.id)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploads.length === 0 && (
            <div style={{
              background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
              padding: '2rem', textAlign: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', marginBottom: '0.75rem', display: 'block' }}>upload_file</span>
              <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Selected files will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
