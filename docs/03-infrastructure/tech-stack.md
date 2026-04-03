# 🛠️ Technology Stack

## Stack Overview

```
┌────────────────────────────────────────┐
│            FRONTEND (Client)           │
│  React.js • PWA • Service Worker       │
│  IndexedDB • Vite • Vercel             │
├────────────────────────────────────────┤
│            NETWORK LAYER               │
│  HTTPS • REST API • Cloudflare Tunnel  │
├────────────────────────────────────────┤
│            BACKEND (Server)            │
│  Node.js • Express.js • Nginx          │
├────────────────────────────────────────┤
│            DATA LAYER                  │
│  PostgreSQL • Linux Filesystem         │
└────────────────────────────────────────┘
```

---

## Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | v20.x | JavaScript runtime |
| **Express.js** | v4.x | REST API framework |
| **Nginx** | Latest | Reverse proxy, rate limiting, SSL |
| **PostgreSQL** | Latest + contrib | Relational database for metadata |
| **Multer** | Latest | File upload handling (multipart) |
| **pg (node-postgres)** | Latest | PostgreSQL client for Node.js |
| **dotenv** | Latest | Environment variable management |
| **cors** | Latest | Cross-origin request handling |
| **helmet** | Latest | Security headers |
| **morgan** | Latest | HTTP request logging |
| **uuid** | Latest | Unique ID generation for files |
| **crypto (built-in)** | — | SHA-256 hash verification |

### Backend Project Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "multer": "^1.4.5",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.4.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

---

## Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React.js** | v18.x | UI library |
| **Vite** | v5.x | Build tool and dev server |
| **React Router** | v6.x | Client-side routing |
| **Workbox** | Latest | Service Worker tooling for PWA |
| **idb** | Latest | IndexedDB wrapper (Promise-based) |
| **vite-plugin-pwa** | Latest | PWA manifest + Service Worker generation |

### Frontend Project Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.1.0",
    "vite-plugin-pwa": "^0.19.0"
  }
}
```

---

## Infrastructure & DevOps

| Technology | Purpose |
|------------|---------|
| **Cloudflare Tunnel** | Secure public access to home server without port forwarding |
| **Vercel** | Free-tier hosting for React PWA frontend |
| **Git** | Version control |
| **VS Code + Remote-SSH** | Development environment (write code from Windows, run on Linux) |
| **systemctl** | Service management for Nginx and PostgreSQL |

---

## Why These Choices?

| Choice | Alternatives Considered | Reasoning |
|--------|------------------------|-----------|
| **Express.js** over Fastify | Fastify has better performance | Express has larger ecosystem, more tutorials, simpler for single-user app |
| **PostgreSQL** over SQLite | SQLite is simpler | PostgreSQL handles concurrent writes better, supports UUID, more extensible |
| **Vite** over CRA | CRA is more common | Vite is faster, lighter, better PWA plugin support, actively maintained |
| **Multer** over Busboy | Busboy is lower-level | Multer provides file filtering, size limits, and storage config out of the box |
| **IndexedDB** over localStorage | localStorage is simpler | IndexedDB supports large binary data (photos); localStorage is limited to 5-10 MB |
| **Workbox** over manual SW | Manual gives more control | Workbox simplifies caching strategies and background sync significantly |

---

> **Next**: [Remote SSH Setup →](./remote-ssh-setup.md)
