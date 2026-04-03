<p align="center">
  <h1 align="center">☁️ SharifCloud-Sync</h1>
  <p align="center"><strong>Personal Cloud Infrastructure — Technical Documentation</strong></p>
  <p align="center">
    <img src="https://img.shields.io/badge/status-in--development-orange" alt="Status">
    <img src="https://img.shields.io/badge/backend-Node.js%20%2B%20Express-green" alt="Backend">
    <img src="https://img.shields.io/badge/frontend-React%20PWA-blue" alt="Frontend">
    <img src="https://img.shields.io/badge/database-PostgreSQL-336791" alt="Database">
    <img src="https://img.shields.io/badge/license-Private-red" alt="License">
  </p>
</p>

---

## 📚 Documentation Index

| # | Section | Description | Path |
|---|---------|-------------|------|
| 01 | [Project Vision](./01-project-vision/project-overview.md) | Core idea, goals, and project scope | `01-project-vision/` |
| 02 | [Architecture](./02-architecture/) | System design, API contracts, and data flow | `02-architecture/` |
| 03 | [Infrastructure](./03-infrastructure/) | Server specs, tech stack, and dev environment setup | `03-infrastructure/` |
| 04 | [Features](./04-features/) | Offline-first strategy, smart sync, and hybrid storage | `04-features/` |
| 05 | [Deployment](./05-deployment/) | Hosting strategy and remote connectivity | `05-deployment/` |
| 06 | [Roadmap](./06-roadmap/) | Phased implementation plan and priorities | `06-roadmap/` |

---

## 🏗️ Project Structure

```
SharifCloud-Sync/
├── docs/                   ← You are here
│   ├── 01-project-vision/
│   ├── 02-architecture/
│   ├── 03-infrastructure/
│   ├── 04-features/
│   ├── 05-deployment/
│   └── 06-roadmap/
│
├── backend/                ← Node.js + Express + PostgreSQL
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── config/
│   ├── uploads/
│   ├── package.json
│   └── .env
│
├── frontend/               ← React PWA (deployed to Vercel)
│   ├── public/
│   ├── src/
│   └── package.json
│
└── README.md
```

---

## 🚀 Quick Start

> Full setup instructions are available in [03-infrastructure/remote-ssh-setup.md](./03-infrastructure/remote-ssh-setup.md)

```bash
# 1. Clone the project on the Toshiba server
git clone <repo-url> ~/SharifCloud-Sync

# 2. Set up the backend
cd ~/SharifCloud-Sync/backend
npm install
cp .env.example .env    # Configure environment variables
npm run dev

# 3. Set up the frontend (for local development)
cd ~/SharifCloud-Sync/frontend
npm install
npm run dev
```

---

> **Last Updated**: April 2026  
> **Author**: Sharif  
> **Server**: Toshiba Satellite L655 — Linux Mint
