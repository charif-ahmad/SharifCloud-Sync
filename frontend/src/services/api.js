// const API_BASE = `http://${window.location.hostname}:3000/api`;
const API_BASE = `http://100.103.154.10:3000/api`;

function getApiKey() {
  return localStorage.getItem('sharifcloud_api_key') || '';
}

function headers(extra = {}) {
  return {
    'X-API-Key': getApiKey(),
    ...extra,
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: headers(options.headers || {}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.message || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }

  // For file downloads, return the response itself
  if (options.raw) return res;

  return res.json();
}

// ── Auth ──────────────────────────────────────────────
export function checkHealth() {
  return fetch(`${API_BASE}/health`).then(r => r.json());
}

export function authenticate(apiKey) {
  return fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
  }).then(r => {
    if (!r.ok) throw new Error('Invalid API Key');
    return r.json();
  });
}

// ── Photos ────────────────────────────────────────────
export function listPhotos({ page = 1, limit = 20, folderId, sort, order } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (folderId) params.set('folderId', folderId);
  if (sort) params.set('sort', sort);
  if (order) params.set('order', order);
  return request(`/photos?${params}`);
}

export function getPhotoUrl(id) {
  return `${API_BASE}/photos/${id}?apiKey=${encodeURIComponent(getApiKey())}`;
}

export function getPhotoDownloadUrl(id) {
  return `${API_BASE}/photos/${id}`;
}

export function deletePhoto(id) {
  return request(`/photos/${id}`, { method: 'DELETE' });
}

export function movePhoto(id, folderId) {
  return request(`/photos/${id}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId }),
  });
}

export function uploadPhoto(file, { folderId, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('photo', file);
    if (folderId) formData.append('folderId', folderId);

    xhr.open('POST', `${API_BASE}/photos/upload`);
    xhr.setRequestHeader('X-API-Key', getApiKey());

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText)?.message || 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

// ── Folders ───────────────────────────────────────────
export function listFolders(parentId) {
  const params = parentId ? `?parentId=${parentId}` : '';
  return request(`/folders${params}`);
}

export function getFolder(id) {
  return request(`/folders/${id}`);
}

export function createFolder(name, parentId) {
  return request('/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
  });
}

export function renameFolder(id, name) {
  return request(`/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function deleteFolder(id) {
  return request(`/folders/${id}`, { method: 'DELETE' });
}

// ── Storage ───────────────────────────────────────────
export function getStorageStats() {
  return request('/storage/stats');
}
