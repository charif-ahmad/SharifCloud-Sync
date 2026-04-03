# 🔌 API Design

## Base Configuration

| Property | Value |
|----------|-------|
| **Base URL** | `https://<cloudflare-tunnel-domain>/api` |
| **Protocol** | HTTPS (TLS 1.3) |
| **Auth Method** | API Key via `X-API-Key` header |
| **Content Type** | `application/json` (unless file upload) |
| **Max Upload Size** | 25 MB per file |

---

## Authentication

All requests (except `GET /api/health`) require the `X-API-Key` header:

```http
X-API-Key: your-secret-api-key-here
```

Unauthorized requests receive:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key",
  "status": 401
}
```

---

## Endpoints

### 🟢 Health Check

```http
GET /api/health
```

**Purpose**: Server availability check (used by client heartbeat).  
**Auth Required**: No

**Response** `200 OK`:
```json
{
  "status": "online",
  "uptime": 86400,
  "timestamp": "2026-04-01T22:00:00Z"
}
```

---

### 🔐 Authentication

```http
POST /api/auth
```

**Purpose**: Validate API key and return session confirmation.  
**Auth Required**: Yes

**Request Body**:
```json
{
  "apiKey": "your-secret-api-key"
}
```

**Response** `200 OK`:
```json
{
  "authenticated": true,
  "message": "Welcome back, Sharif"
}
```

---

### 📤 Upload Single Photo

```http
POST /api/photos/upload
Content-Type: multipart/form-data
```

**Purpose**: Upload a single photo to the server.  
**Auth Required**: Yes

**Form Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `photo` | File | ✅ | The image file (JPEG, PNG, WebP, HEIC) |
| `hash` | String | ✅ | SHA-256 hash of the file (for deduplication) |
| `originalName` | String | ❌ | Original filename from device |
| `takenAt` | String | ❌ | ISO 8601 date when photo was taken |

**Response** `201 Created`:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "fileName": "IMG_20260401_143022.jpg",
  "filePath": "/uploads/2026/04/01/a1b2c3d4.jpg",
  "fileSize": 4521398,
  "hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "mimeType": "image/jpeg",
  "uploadedAt": "2026-04-01T14:30:22Z"
}
```

**Error** `409 Conflict` (duplicate):
```json
{
  "error": "Duplicate",
  "message": "Photo with this hash already exists",
  "existingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### 📤 Batch Upload (Sync Queue)

```http
POST /api/photos/batch
Content-Type: multipart/form-data
```

**Purpose**: Upload multiple photos from the offline sync queue.  
**Auth Required**: Yes  
**Max Files**: 10 per request

**Form Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `photos` | File[] | ✅ | Array of image files |
| `metadata` | JSON String | ✅ | Array of metadata objects (hash, originalName, takenAt) |

**Response** `200 OK`:
```json
{
  "total": 5,
  "successful": 4,
  "duplicates": 1,
  "failed": 0,
  "results": [
    { "index": 0, "status": "created", "id": "..." },
    { "index": 1, "status": "created", "id": "..." },
    { "index": 2, "status": "duplicate", "existingId": "..." },
    { "index": 3, "status": "created", "id": "..." },
    { "index": 4, "status": "created", "id": "..." }
  ]
}
```

---

### 📋 List Photos

```http
GET /api/photos?page=1&limit=20&sort=uploadedAt&order=desc
```

**Purpose**: Retrieve paginated list of uploaded photos.  
**Auth Required**: Yes

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | Number | 1 | Page number |
| `limit` | Number | 20 | Items per page (max: 100) |
| `sort` | String | `uploadedAt` | Sort field (`uploadedAt`, `fileSize`, `fileName`) |
| `order` | String | `desc` | Sort order (`asc`, `desc`) |

**Response** `200 OK`:
```json
{
  "photos": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "fileName": "IMG_20260401_143022.jpg",
      "fileSize": 4521398,
      "mimeType": "image/jpeg",
      "uploadedAt": "2026-04-01T14:30:22Z",
      "thumbnailUrl": "/api/photos/a1b2c3d4/thumbnail"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1423,
    "totalPages": 72
  }
}
```

---

### 🖼️ Get Single Photo

```http
GET /api/photos/:id
```

**Purpose**: Download the original photo file.  
**Auth Required**: Yes  
**Response**: Binary file with appropriate `Content-Type` header.

---

### 🗑️ Delete Photo

```http
DELETE /api/photos/:id
```

**Purpose**: Delete a photo and its metadata.  
**Auth Required**: Yes

**Response** `200 OK`:
```json
{
  "deleted": true,
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### 📊 Storage Statistics

```http
GET /api/storage/stats
```

**Purpose**: Get server storage usage information.  
**Auth Required**: Yes

**Response** `200 OK`:
```json
{
  "totalPhotos": 1423,
  "totalSize": "6.2 GB",
  "totalSizeBytes": 6654321098,
  "diskTotal": "430 GB",
  "diskUsed": "38 GB",
  "diskFree": "392 GB",
  "diskUsagePercent": 8.8
}
```

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable description",
  "status": 400
}
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad Request — invalid input |
| `401` | Unauthorized — missing or invalid API key |
| `404` | Not Found — photo doesn't exist |
| `409` | Conflict — duplicate photo hash |
| `413` | Payload Too Large — file exceeds 25 MB |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /api/photos/upload` | 30 requests / minute |
| `POST /api/photos/batch` | 5 requests / minute |
| `GET /api/photos` | 60 requests / minute |
| `GET /api/health` | 120 requests / minute |

---

> **Next**: [Server Specs →](../03-infrastructure/server-specs.md)
