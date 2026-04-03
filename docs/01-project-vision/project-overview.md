# 📋 Project Overview — SharifCloud-Sync

## What is SharifCloud-Sync?

A **personal cloud infrastructure** that connects a smartphone application (React PWA) to a home server (Toshiba Satellite L655 running Linux Mint). The system enables **photo upload, storage, and synchronization** with full offline resilience — ensuring service continuity even when the server is disconnected from the network.

---

## 🎯 Core Goals

| Goal | Description |
|------|-------------|
| **Personal Photo Cloud** | Upload, store, and browse photos from phone to home server |
| **Offline Resilience** | App continues functioning when the server is unreachable |
| **Smart Sync** | Automatic background synchronization when connectivity is restored |
| **Zero Cost** | Entire stack runs on owned hardware + free-tier services |
| **Single User** | Designed for personal use — no multi-tenancy overhead |

---

## 🧩 Design Principles

### 1. Offline-First
The phone application never assumes the server is available. Every operation is designed to work locally first, then sync when possible.

### 2. Data Integrity
Every photo is validated via checksums (SHA-256) to prevent corruption during transfer or storage duplication.

### 3. Minimal Resource Footprint
The server has limited resources (4.1 GB RAM, 430 GB storage). Every architectural decision prioritizes low memory usage and efficient I/O.

### 4. Separation of Concerns
- **Frontend (React PWA)** → Hosted on Vercel (free CDN, HTTPS, global edge network)
- **Backend (Node.js API)** → Runs on the home server (handles data and file storage)

### 5. Security by Simplicity
Single-user system with API key authentication. No complex OAuth flows — security comes from HTTPS, Cloudflare Tunnel, and access control at the network level.

---

## 🔄 High-Level Data Flow

```
📱 Phone (React PWA on Vercel)
    │
    ├─ Online  → POST /api/photos/upload → Server stores photo + metadata
    │
    └─ Offline → Save to IndexedDB (local queue)
                    │
                    └─ Server comes back online (detected via heartbeat)
                        │
                        └─ Background Sync → Drain queue → POST each photo
                                                │
                                                └─ Server ACK → Delete from IndexedDB
```

---

## 📊 Project Scope

### In Scope (v1.0)
- [x] Photo upload (single + batch)
- [x] Photo gallery/viewer
- [x] Offline queue with IndexedDB
- [x] Background sync with retry logic
- [x] Server health monitoring (heartbeat)
- [x] Storage statistics dashboard

### Out of Scope (Future)
- [ ] Video upload support
- [ ] Photo editing / filters
- [ ] Multi-user / sharing features
- [ ] Mobile native app (React Native)
- [ ] End-to-end encryption
- [ ] Thumbnail generation / image optimization

---

> **Next**: [System Architecture →](../02-architecture/system-architecture.md)
