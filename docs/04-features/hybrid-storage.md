# 💾 Hybrid Storage

## Strategy

The system uses a **dual-storage approach**:

| Data Type | Storage | Reason |
|-----------|---------|--------|
| **Photo files** (binary) | Linux Filesystem | Fast I/O, simple backups, no DB bloat |
| **Photo metadata** (structured) | PostgreSQL | Queryable, indexed, supports complex searches |

---

## Filesystem Storage

### Directory Structure

```
/home/<user>/SharifCloud-Sync/backend/uploads/
└── YYYY/
    └── MM/
        └── DD/
            ├── <uuid>.jpg
            ├── <uuid>.png
            └── <uuid>.webp
```

### Example

```
uploads/
├── 2026/
│   ├── 03/
│   │   ├── 15/
│   │   │   ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
│   │   │   └── b2c3d4e5-f6a7-8901-bcde-f12345678901.png
│   │   └── 28/
│   │       └── c3d4e5f6-a7b8-9012-cdef-123456789012.jpg
│   └── 04/
│       └── 01/
│           └── d4e5f6a7-b8c9-0123-def0-234567890123.webp
```

### Naming Rules
- **UUID-based filenames** (not original names) to prevent collisions
- **Date-based folders** based on upload date (not photo taken date)
- **Original extension preserved** for proper content-type serving

---

## PostgreSQL Schema

### Photos Table

```sql
CREATE TABLE IF NOT EXISTS photos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name   VARCHAR(255) NOT NULL,         -- UUID-based name on disk
    original_name VARCHAR(255),                 -- Original name from device
    file_path   VARCHAR(500) NOT NULL UNIQUE,   -- Relative path: 2026/04/01/uuid.jpg
    file_size   BIGINT NOT NULL,                -- Size in bytes
    mime_type   VARCHAR(50) NOT NULL,            -- image/jpeg, image/png, etc.
    hash        VARCHAR(128) NOT NULL UNIQUE,    -- SHA-256 hash for deduplication
    taken_at    TIMESTAMPTZ,                     -- When photo was originally taken
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),       -- When it was uploaded to server

    -- Constraints
    CONSTRAINT valid_mime CHECK (mime_type IN (
        'image/jpeg', 'image/png', 'image/webp', 'image/heic'
    )),
    CONSTRAINT positive_size CHECK (file_size > 0)
);

-- Indexes for common queries
CREATE INDEX idx_photos_uploaded_at ON photos (uploaded_at DESC);
CREATE INDEX idx_photos_hash ON photos (hash);
CREATE INDEX idx_photos_mime_type ON photos (mime_type);
```

### Storage Stats View

```sql
CREATE VIEW storage_stats AS
SELECT
    COUNT(*)                                    AS total_photos,
    COALESCE(SUM(file_size), 0)                AS total_size_bytes,
    pg_size_pretty(COALESCE(SUM(file_size), 0)) AS total_size_human,
    MIN(uploaded_at)                            AS first_upload,
    MAX(uploaded_at)                            AS last_upload
FROM photos;
```

---

## Data Integrity

### SHA-256 Deduplication

Every photo is hashed on the client before upload:

```javascript
// Client-side hash generation
async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

Server-side verification:

```javascript
// Server verifies the hash matches
async function verifyHash(filePath, clientHash) {
  const fileBuffer = await fs.promises.readFile(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return `sha256:${hash}` === clientHash;
}
```

### Consistency Rules

| Rule | Implementation |
|------|---------------|
| No orphan files | If DB insert fails → delete the saved file |
| No orphan records | If file save fails → don't insert to DB |
| No duplicates | `UNIQUE` constraint on `hash` column |
| Atomic operations | Use PostgreSQL transactions for multi-step writes |

```javascript
// Atomic upload operation
async function savePhoto(file, metadata) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Save file to disk
    const filePath = await saveFileToDisk(file);

    // 2. Insert metadata to DB
    await client.query(
      'INSERT INTO photos (file_name, file_path, ...) VALUES ($1, $2, ...)',
      [filePath, ...]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    // Clean up: delete file if it was saved
    await deleteFileIfExists(filePath);
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Backup Strategy

Since photos are on the filesystem and metadata is in PostgreSQL, backups require two steps:

```bash
# 1. Backup photos directory
tar -czf photos-backup-$(date +%Y%m%d).tar.gz ~/SharifCloud-Sync/backend/uploads/

# 2. Backup PostgreSQL
pg_dump sharifcloud > db-backup-$(date +%Y%m%d).sql
```

---

> **Next**: [Deployment Strategy →](../05-deployment/deployment-strategy.md)
