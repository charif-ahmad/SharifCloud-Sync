# 🏗️ System Architecture

## Architectural Pattern

The system follows an **enhanced Client-Server Model** with an **Offline-First** client strategy. The frontend and backend are fully decoupled and communicate exclusively via REST API over HTTPS.

---

## System Topology

```
┌─────────────────────────────────────────────────────┐
│                 VERCEL (Free Tier)                   │
│               React PWA — Frontend                   │
│                                                     │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Upload UI │  │ Gallery  │  │ Service Worker   │ │
│  │  + Drag &  │  │ Viewer   │  │ ┌──────────────┐│ │
│  │  Drop      │  │ + Grid   │  │ │ IndexedDB    ││ │
│  │           │  │          │  │ │ (Offline Q)  ││ │
│  └─────┬─────┘  └────┬─────┘  │ └──────────────┘│ │
│        │              │        │ Background Sync  │ │
│        │              │        └────────┬─────────┘ │
└────────┼──────────────┼─────────────────┼───────────┘
         │              │                 │
         │       HTTPS (REST API)         │
         │     ┌────────┴─────────┐       │
         │     │ Cloudflare Tunnel│       │
         │     │ (Secure Link)    │       │
         │     └────────┬─────────┘       │
         │              │                 │
┌────────┼──────────────┼─────────────────┼───────────┐
│        ▼              ▼                 ▼           │
│  ┌──────────────────────────────────────────────┐   │
│  │           Nginx (Reverse Proxy)               │   │
│  │  • SSL Termination                           │   │
│  │  • Rate Limiting                             │   │
│  │  • Request Routing → localhost:3000           │   │
│  └──────────────────────┬───────────────────────┘   │
│                         ▼                           │
│  ┌──────────────────────────────────────────────┐   │
│  │        Node.js + Express (REST API)           │   │
│  │                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │  Routes  │ │Controller│ │ Middleware    │  │   │
│  │  │ /upload  │→│ process  │→│ • Auth        │  │   │
│  │  │ /photos  │ │ validate │ │ • Validation  │  │   │
│  │  │ /health  │ │ store    │ │ • Error       │  │   │
│  │  │ /sync    │ │          │ │ • Rate Limit  │  │   │
│  │  └──────────┘ └──────────┘ └──────────────┘  │   │
│  │         │                                    │   │
│  │    ┌────┴────────────┐                       │   │
│  │    ▼                 ▼                       │   │
│  │ ┌──────────┐  ┌──────────────┐               │   │
│  │ │Filesystem│  │ PostgreSQL   │               │   │
│  │ │/uploads/ │  │ (Metadata)   │               │   │
│  │ │YYYY/MM/DD│  │ • file_name  │               │   │
│  │ │          │  │ • file_path  │               │   │
│  │ │ Raw      │  │ • file_size  │               │   │
│  │ │ Photos   │  │ • hash       │               │   │
│  │ │ (Binary) │  │ • upload_date│               │   │
│  │ └──────────┘  └──────────────┘               │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│          🖥️ Toshiba Satellite L655                   │
│             Linux Mint • 4.1 GB RAM                  │
│             430 GB Storage                           │
└─────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Frontend (Vercel)
| Component | Responsibility |
|-----------|---------------|
| **Upload UI** | Drag-and-drop or file picker for photo selection |
| **Gallery Viewer** | Grid/list view of uploaded photos with lazy loading |
| **Service Worker** | Intercepts failed requests, manages offline queue |
| **IndexedDB** | Stores photos as Blobs when server is unreachable |
| **Background Sync** | Drains the offline queue when server comes back online |

### Backend (Toshiba Server)
| Component | Responsibility |
|-----------|---------------|
| **Nginx** | Reverse proxy, rate limiting, SSL termination |
| **Express API** | Business logic, routing, request validation |
| **Filesystem** | Raw photo binary storage in date-organized folders |
| **PostgreSQL** | Photo metadata, search indexes, storage stats |

### Network Layer
| Component | Responsibility |
|-----------|---------------|
| **Cloudflare Tunnel** | Secure link between internet and local Nginx without exposing ports |
| **HTTPS** | Encrypted data transfer (auto-managed by Vercel + Cloudflare) |

---

## Request Flow Example: Upload Photo

```
1. User selects photo on phone
2. React app reads file → generates SHA-256 hash
3. React sends POST /api/photos/upload (multipart/form-data)
   ├─ If server reachable:
   │   4a. Nginx receives request → forwards to Express :3000
   │   5a. Auth middleware validates API key
   │   6a. Controller checks hash for duplicates in PostgreSQL
   │   7a. Saves file to /uploads/YYYY/MM/DD/filename.jpg
   │   8a. Inserts metadata into PostgreSQL
   │   9a. Returns 201 Created + photo metadata
   │
   └─ If server unreachable:
       4b. Service Worker intercepts failed request
       5b. Saves photo Blob + metadata to IndexedDB
       6b. Registers Background Sync event
       7b. Returns local success to UI
       8b. When server comes back → drains queue automatically
```

---

## Design Decisions

| Decision | Reasoning |
|----------|-----------|
| **Separate frontend/backend** | Frontend on Vercel stays alive even when server is down |
| **Filesystem for photos** | Faster I/O than storing BLOBs in PostgreSQL; simpler backups |
| **PostgreSQL for metadata** | Enables complex queries, full-text search, and future extensibility |
| **Cloudflare Tunnel** | Free, no port forwarding, handles dynamic IP, secure by default |
| **API Key auth (not OAuth)** | Single user = no need for complex auth; API key is sufficient |
| **Date-based folder structure** | Prevents single-directory bottleneck; easy to browse and backup |

---

> **Next**: [API Design →](./api-design.md)
