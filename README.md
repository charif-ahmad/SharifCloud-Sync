<p align="center">
  <h1 align="center">☁️ SharifCloud-Sync</h1>
  <p align="center">
    <strong>Personal Cloud Infrastructure for Photo Sync</strong>
  </p>
  <p align="center">
    A self-hosted, offline-resilient photo storage system powered by a React PWA and a Node.js home server.
  </p>"أواجه حالياً مشكلة عدم تطابق البيئات (Environment Inconsistency)؛ حيث أقوم بالتطوير على جهازي الشخصي بينما تتم عملية التشغيل على سيرفر خارجي (Toshiba Server). هذا الانفصال يسبب لي بطئاً في دورة التطوير بسبب النقل اليدوي للملفات (Manual Sync) وصعوبة في تتبع الأخطاء (Remote Debugging) في الوقت الفعلي. أريد اعتماد سير عمل يعتمد على Remote - SSH لتوحيد بيئة التطوير وضمان Environment Parity، فكيف نبدأ الإعداد؟"
  <p align="center">
    <img src="https://img.shields.io/badge/status-in--development-orange" alt="Status">
    <img src="https://img.shields.io/badge/node.js-v20-green?logo=nodedotjs" alt="Node.js">
    <img src="https://img.shields.io/badge/react-v19-blue?logo=react" alt="React">
    <img src="https://img.shields.io/badge/postgresql-latest-336791?logo=postgresql" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa" alt="PWA">
  </p>
</p>

---

## 🌟 Overview

SharifCloud-Sync is a **personal cloud system** that lets you upload and store photos from your smartphone to your home server — with **full offline support**. Photos taken when the server is unreachable are queued locally and automatically synced when connectivity is restored.

### Key Features

- 📤 **Photo Upload** — Single and batch upload with drag & drop
- 🖼️ **Gallery** — Browse and manage your photo collection
- 📴 **Offline-First** — Works without server connectivity
- 🔄 **Smart Sync** — Automatic background sync with retry logic
- 🔒 **Secure** — HTTPS, API key auth, Cloudflare Tunnel
- 💰 **Zero Cost** — Runs entirely on owned hardware + free-tier services

---

## 🏗️ Architecture

```
📱 Phone (React PWA on Vercel)
      │
      ├─ Online ──► HTTPS ──► Cloudflare Tunnel ──► Nginx ──► Express API
      │                                                          │
      │                                                     ┌────┴────┐
      │                                                     │         │
      │                                                  Photos   PostgreSQL
      │                                                (Filesystem) (Metadata)
      │
      └─ Offline ──► IndexedDB (local queue) ──► Auto-sync when server returns
```

---

## 📁 Project Structure

```
SharifCloud-Sync/
├── backend/              # Node.js + Express REST API
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── config/
│   ├── uploads/          # Photo storage (date-organized)
│   ├── package.json
│   └── .env
│
├── frontend/             # React PWA (Vite)
│   ├── public/
│   ├── src/
│   └── package.json
│
├── docs/                 # Full technical documentation
│   ├── 01-project-vision/
│   ├── 02-architecture/
│   ├── 03-infrastructure/
│   ├── 04-features/
│   ├── 05-deployment/
│   └── 06-roadmap/
│
└── README.md             ← You are here
```

---

## 📚 Documentation

Full technical documentation is available in the [`docs/`](./docs/README.md) directory:

| Section | What's Inside |
|---------|--------------|
| [Project Vision](./docs/01-project-vision/project-overview.md) | Goals, scope, design principles |
| [Architecture](./docs/02-architecture/system-architecture.md) | System topology, component design |
| [API Design](./docs/02-architecture/api-design.md) | All REST endpoints with schemas |
| [Server Specs](./docs/03-infrastructure/server-specs.md) | Hardware report, resource budgeting |
| [Tech Stack](./docs/03-infrastructure/tech-stack.md) | All technologies and why they were chosen |
| [Dev Setup](./docs/03-infrastructure/remote-ssh-setup.md) | VS Code Remote-SSH configuration |
| [Offline-First](./docs/04-features/offline-first.md) | IndexedDB queue, service worker strategy |
| [Smart Sync](./docs/04-features/smart-sync.md) | Heartbeat, sync protocol, retry logic |
| [Storage](./docs/04-features/hybrid-storage.md) | Filesystem + PostgreSQL hybrid approach |
| [Deployment](./docs/05-deployment/deployment-strategy.md) | Vercel, Cloudflare Tunnel, PM2, Nginx |
| [Roadmap](./docs/06-roadmap/implementation-plan.md) | Phased implementation plan |

---

## 🖥️ Server

| Spec | Value |
|------|-------|
| Machine | Toshiba Satellite L655 |
| OS | Linux Mint |
| RAM | 4.1 GB |
| Storage | 430 GB |
| Runtime | Node.js v20 |
| Database | PostgreSQL |

---

## 📄 License

Private — Personal Use Only

---

> Built with ☕ by Sharif
