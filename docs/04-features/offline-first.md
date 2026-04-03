# 📴 Offline-First Strategy

## Core Principle

> The phone application **never assumes the server is available**. Every upload operation is designed to succeed locally first, then synchronize with the server when connectivity is confirmed.

---

## Why Offline-First?

The server is a home machine (Toshiba Satellite) that may be:
- **Powered off** (to save electricity)
- **Disconnected** from the internet (ISP outage)
- **Unreachable** (router restart, IP change)

The PWA must handle all of these gracefully without losing any data.

---

## Implementation Stack

| Component | Technology | Role |
|-----------|-----------|------|
| **Offline Detection** | `navigator.onLine` + Heartbeat API | Detect server availability |
| **Local Storage** | IndexedDB (via `idb` library) | Store photos + metadata locally |
| **Background Processing** | Service Worker | Handle sync events |
| **Retry Mechanism** | Background Sync API + Exponential Backoff | Retry uploads when server returns |

---

## IndexedDB Schema

```javascript
// Database: SharifCloudSync
// Version: 1

const db = {
  stores: {
    // Offline photo queue
    'pending-uploads': {
      keyPath: 'id',           // Auto-generated UUID
      indexes: {
        'by-date': 'queuedAt', // When the photo was queued
        'by-status': 'status'  // pending | uploading | failed
      },
      // Each record:
      // {
      //   id: 'uuid',
      //   blob: Blob,              ← The actual photo file
      //   originalName: 'IMG_001.jpg',
      //   hash: 'sha256:...',
      //   fileSize: 4521398,
      //   mimeType: 'image/jpeg',
      //   takenAt: '2026-04-01T14:30:22Z',
      //   queuedAt: '2026-04-01T14:31:00Z',
      //   status: 'pending',
      //   retryCount: 0,
      //   lastError: null
      // }
    },

    // Sync history log
    'sync-log': {
      keyPath: 'id',
      indexes: {
        'by-date': 'syncedAt'
      }
      // Each record:
      // {
      //   id: 'uuid',
      //   photoId: 'server-assigned-id',
      //   originalName: 'IMG_001.jpg',
      //   syncedAt: '2026-04-01T15:00:00Z',
      //   status: 'success' | 'duplicate' | 'failed'
      // }
    }
  }
};
```

---

## Upload Flow State Machine

```
                    User selects photo
                          │
                          ▼
                  ┌───────────────┐
                  │ Generate Hash │
                  │ (SHA-256)     │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
          ┌──YES──│ Server Online? │──NO──┐
          │       └───────────────┘       │
          ▼                               ▼
  ┌───────────────┐              ┌────────────────┐
  │ Direct Upload │              │ Save to         │
  │ POST /upload  │              │ IndexedDB       │
  └───────┬───────┘              │ status: pending │
          │                      └────────┬────────┘
          ▼                               │
  ┌───────────────┐              ┌────────▼────────┐
  │ Server ACK?   │              │ Register Sync   │
  │               │              │ Event           │
  ├──YES──┐  ┌──NO┤              └────────┬────────┘
  │       │  │    │                       │
  │       ▼  ▼    │                       ▼
  │   ┌────────┐  │              ┌────────────────┐
  │   │ Success│  │              │ Show "Queued"  │
  │   │ Toast  │  │              │ badge in UI    │
  │   └────────┘  │              └────────────────┘
  │               │
  │               ▼
  │       ┌────────────────┐
  │       │ Fallback →     │
  │       │ Save to        │
  │       │ IndexedDB      │
  │       └────────────────┘
  ▼
 Done
```

---

## Key Behaviors

### 1. Upload Attempt (Online)
```
User → Select Photo → Hash → POST /api/photos/upload → Success ✅
```

### 2. Upload Attempt (Offline)
```
User → Select Photo → Hash → POST fails → Service Worker catches →
Save Blob + metadata to IndexedDB → Show "Queued" badge → Register sync event
```

### 3. Server Comes Back Online
```
Heartbeat detects server → Trigger sync event →
Read pending items from IndexedDB → POST each →
On ACK: delete from IndexedDB + log to sync-log →
Update UI badge count
```

---

## ⚠️ Important Considerations

### IndexedDB Storage Limits
- **Chrome**: Up to 80% of total disk space (generous)
- **Firefox**: Up to 50% of disk space
- **Safari**: ⚠️ **Only 1 GB** and may be evicted after 7 days of inactivity
- **Mitigation**: Show clear warnings when queue grows large; prioritize sync

### Data Loss Prevention
- Never delete from IndexedDB until server sends **explicit ACK** (201 Created)
- Keep a `sync-log` store to track successful uploads for auditing
- Show queue count prominently in the UI so user is always aware

### Hash-Based Deduplication
- Generate SHA-256 hash on the client **before** queuing
- Server checks hash against PostgreSQL before saving
- Prevents duplicate uploads both online and during offline sync drain

---

> **Next**: [Smart Sync Protocol →](./smart-sync.md)
