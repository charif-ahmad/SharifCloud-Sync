# 🔄 Smart Sync Protocol

## Purpose

The Smart Sync Protocol ensures that photos queued during server downtime are automatically uploaded when connectivity is restored — without user intervention, without data loss, and without duplicates.

---

## Protocol Components

```
┌──────────────────────────────────────────────────────────┐
│                    SMART SYNC ENGINE                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Heartbeat    │  │  Sync Queue  │  │  Upload       │  │
│  │  Monitor      │→│  Manager     │→│  Pipeline     │  │
│  │              │  │              │  │              │  │
│  │ Checks if    │  │ Reads from   │  │ Sends photos │  │
│  │ server is    │  │ IndexedDB    │  │ with retry   │  │
│  │ reachable    │  │ pending list │  │ logic        │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Heartbeat Monitor

Continuously checks server availability using lightweight pings.

### Mechanism
```http
GET /api/health
```
- Expects `200 OK` with `{ "status": "online" }`
- If the request fails or times out (3 seconds) → server is **offline**

### Exponential Backoff Strategy

Instead of pinging every X seconds (wastes battery), the interval increases when the server is down:

```
Attempt 1:  5 seconds
Attempt 2: 10 seconds
Attempt 3: 20 seconds
Attempt 4: 40 seconds
Attempt 5: 60 seconds   ← Max interval (capped at 1 minute)
...stays at 60s until server responds...

Server responds → Reset to 5 seconds
```

### Pseudocode

```javascript
class HeartbeatMonitor {
  constructor(onOnline, onOffline) {
    this.interval = 5000;         // Start: 5s
    this.maxInterval = 60000;     // Max: 60s
    this.backoffFactor = 2;
    this.isServerOnline = false;
    this.onOnline = onOnline;
    this.onOffline = onOffline;
  }

  async check() {
    try {
      const res = await fetch('/api/health', {
        signal: AbortSignal.timeout(3000)
      });

      if (res.ok) {
        if (!this.isServerOnline) {
          this.isServerOnline = true;
          this.interval = 5000;   // Reset interval
          this.onOnline();        // Trigger sync!
        }
      }
    } catch {
      if (this.isServerOnline) {
        this.isServerOnline = false;
        this.onOffline();
      }
      // Increase interval (exponential backoff)
      this.interval = Math.min(
        this.interval * this.backoffFactor,
        this.maxInterval
      );
    }

    setTimeout(() => this.check(), this.interval);
  }
}
```

---

## 2. Sync Queue Manager

Manages the IndexedDB pending queue and orchestrates the upload pipeline.

### States of a Queued Item

```
pending → uploading → completed (deleted from queue)
    │         │
    │         └─→ failed → pending (retry with backoff)
    │                          │
    │                          └─→ max retries exceeded → dead-letter
    ▼
  duplicate → completed (deleted from queue, logged as duplicate)
```

### Max Retry Policy

| Retry # | Wait Before Retry | Action |
|---------|-------------------|--------|
| 1 | 0s (immediate) | Retry |
| 2 | 5s | Retry |
| 3 | 15s | Retry |
| 4 | 30s | Retry |
| 5 | 60s | Retry |
| 6+ | — | Mark as `dead-letter`, notify user |

---

## 3. Upload Pipeline

Handles the actual file transfer with concurrency control.

### Concurrency Model

```
Queue:  [Photo1] [Photo2] [Photo3] [Photo4] [Photo5] [Photo6]
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
    [Upload 1]       [Upload 2]         [Upload 3]
    (parallel)       (parallel)         (parallel)
        │                 │                  │
        ▼                 ▼                  ▼
    [ACK ✅]          [ACK ✅]          [FAIL ❌]
    Delete from DB    Delete from DB    Retry later
```

- **Max concurrent uploads**: 3 (to avoid overwhelming the server's limited RAM)
- **Timeout per upload**: 30 seconds
- **Progress tracking**: Update IndexedDB record status in real-time

### Sync Trigger Flow

```javascript
async function drainSyncQueue() {
  const pending = await db.getAll('pending-uploads');

  if (pending.length === 0) return;

  // Process in batches of 3
  for (let i = 0; i < pending.length; i += 3) {
    const batch = pending.slice(i, i + 3);

    await Promise.allSettled(
      batch.map(item => uploadAndConfirm(item))
    );
  }
}

async function uploadAndConfirm(item) {
  try {
    // Update status
    await db.put('pending-uploads', { ...item, status: 'uploading' });

    // Upload
    const formData = new FormData();
    formData.append('photo', item.blob, item.originalName);
    formData.append('hash', item.hash);

    const res = await fetch('/api/photos/upload', {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY },
      body: formData,
      signal: AbortSignal.timeout(30000)
    });

    if (res.status === 201 || res.status === 409) {
      // Success or duplicate — remove from queue
      await db.delete('pending-uploads', item.id);
      await db.add('sync-log', {
        id: crypto.randomUUID(),
        photoId: (await res.json()).id,
        originalName: item.originalName,
        syncedAt: new Date().toISOString(),
        status: res.status === 201 ? 'success' : 'duplicate'
      });
    }
  } catch (error) {
    // Failed — increment retry count
    await db.put('pending-uploads', {
      ...item,
      status: 'pending',
      retryCount: item.retryCount + 1,
      lastError: error.message
    });
  }
}
```

---

## UI Indicators

The user should always know the sync status:

| State | UI Indicator |
|-------|-------------|
| All synced | ✅ Green badge: "All photos synced" |
| Items queued | 🟡 Yellow badge: "5 photos waiting to sync" |
| Currently syncing | 🔄 Animated spinner: "Syncing 3/5..." |
| Server offline | 🔴 Red dot: "Server offline — photos queued locally" |
| Dead-letter items | ⚠️ Warning: "2 photos failed after multiple attempts" |

---

> **Next**: [Hybrid Storage →](./hybrid-storage.md)
