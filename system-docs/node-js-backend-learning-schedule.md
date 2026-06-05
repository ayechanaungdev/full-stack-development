# Node.js バックエンド 学習スケジュール
# Node.js Backend Learning Schedule

---

## 📌 要約スケジュール (Summary Overview)

> **Goal:** Build & Deploy a production-ready NestJS backend for a Car Rental app — fully migrated from Supabase to a custom stack.

| Phase | 週 (Week) | 重点分野 | 主な学習・タスク | 成果物 (Deliverable) |
|-------|-----------|----------|-----------------|----------------------|
| **Phase 1** — 学習 | 第1週 (Week 1) | Core API & DB | NestJS CLI, Prisma Setup with Neon.tech (PostgreSQL), CRUD logic for Cars, Data Validation (Class-validator) | Working Car API with local DB |
| **Phase 1** — 学習 | 第2週 (Week 2) | Auth & Advanced | JWT & Passport.js Auth, Socket.io for Chat, Firebase Admin SDK for Push Notifications, NestJS Cron-Jobs | Secure API + Real-time Logic |
| **Phase 2** — 練習 | 第3週 (Week 3) | Migration & Implementation | Dividing code into Layers (Controller/Service/Repo), Migrating React Native code from Supabase SDK to Axios | Integrated React Native + NestJS |
| **Phase 2** — 練習 | 第4週 (Week 4) | DevOps & Launch | Dockerization, Swagger API Documentation, Deployment to Render/Koyeb, Keep-alive Cron Setup | Live Production Server (Free) |

> **Further Can Do:** Testing Server Loads, Preparing & adjusting documentation + course materials for coming training.

---

## 🔧 Tech Stack (使用技術)

- **Framework:** NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL via Neon.tech
- **Auth:** JWT + Passport.js + Bcrypt
- **Real-time:** Socket.io
- **Push Notifications:** Firebase Admin SDK (FCM)
- **File Storage:** Firebase Storage
- **Containerization:** Docker
- **API Docs:** Swagger
- **Hosting:** Render / Koyeb (Free tier)
- **Keep-alive:** Cron-job.org
- **Frontend:** React Native (Axios client)

---

## 📅 フェーズ① (Phase 1) — Days 1–10

> **Theme: Foundation — Build the Core API from Scratch**

### Week 1 — Core API & Database

| Day | 日付 | 曜日 | タスク | 学習の目標 | 成果物 |
|-----|------|------|--------|-----------|--------|
| **Day-1** | Wed | — | NestJS Project Setup | Learn CLI commands, Modules, Controllers, and Services | Initial project structure |
| **Day-2** | Thu | — | DB Connection | Create Neon.tech account; Setup Prisma ORM; Link DB | `DATABASE_URL` connectivity |
| **Day-3** | Fri | — | Schema & CRUD | Define User, Car, and Booking models; Implement Car inventory CRUD | DB Tables & Car API |
| **Day-4** | Mon | — | Validation & Relations | Use class-validator; Handle One-to-Many logic (User & Bookings) | Secure & Linked Data |
| **Day-5** | Tue | — | Prisma Studio & Signup | Manage live data via GUI; Bcrypt password hashing & User logic | Verified Data & Signup |

### Week 2 — Auth & Advanced Features

| Day | 日付 | 曜日 | タスク | 学習の目標 | 成果物 |
|-----|------|------|--------|-----------|--------|
| **Day-6** | Wed | — | Security: Login | Implement JWT Strategy; Issue access tokens | Auth Token generation |
| **Day-7** | Thu | — | Route Guards & Chat | Protect "Rent Car" route; Install Socket.io for real-time connection | Private Routes & Chat |
| *(buffer)* | Fri | — | バッファ時間 | — | — |
| **Day-8** | Mon | — | FCM Notification | Setup Firebase; trigger push notifications from NestJS | Sent "Booking" alert |
| **Day-9** | Tue | — | Cron Jobs | Automate daily report generation (Late returns / Revenue) | Auto-running logic |
| **Day-10** | Wed | — | Dockerization | Write Dockerfile; Build & Run image locally | Local Docker Container |

---

## 📅 フェーズ② (Phase 2) — Days 11–20

> **Theme: Migration & DevOps — Connect the App & Go Live**

### Week 3 — Migration & Integration

| Day | 日付 | 曜日 | タスク | 学習の目標 | 成果物 |
|-----|------|------|--------|-----------|--------|
| **Day-11** | Thu | — | Architecture Refactor | Move logic into Service layer (Clean Architecture) | Organized Codebase |
| **Day-12** | Fri | — | Axios Client Setup | Setup Axios in React Native; handle JWT interceptors | RN API helper class |
| **Day-13** | Mon | — | Migrate Auth | Replace Supabase Auth logic with Custom JWT logic | Login/Signup working in App |
| **Day-14** | Tue | — | Migrate Car List | Replace Supabase Select with Axios GET calls | Car list showing in App |
| **Day-15** | Wed | — | File Storage Swap | Setup Firebase Storage; upload car images via RN | Image URLs in DB |
| *(holiday)* | Thu | — | 祭日 | — | — |
| **Day-16** | Fri | — | Real-time Swap & Testing | Remove Supabase Realtime → Socket.io; Full cycle: Book car → Notify Admin → Check DB | Chat Working & Full System Flow |

### Week 4 — DevOps & Launch

| Day | 日付 | 曜日 | タスク | 学習の目標 | 成果物 |
|-----|------|------|--------|-----------|--------|
| **Day-17** | Mon | — | API Doc & Hosting Setup | Setup Swagger; auto-generate API docs; Setup Render/Koyeb; Link GitHub repo | `localhost:3000/api` & CI Pipeline |
| **Day-18** | Tue | — | Cloud Deployment | Push Docker image; configure Env Variables on Cloud | **Live Server URL** 🚀 |
| **Day-19** | Wed | — | Conn Pooling & Ping | Setup Neon pooling; Setup Cron-job.org to keep Free instance awake | Stable Connections & 24/7 Uptime |
| **Day-20** | Thu | — | Load Testing & Documentation | Invite 30 members for a "Stress Test"; Final code cleanup; finalize README and Architecture map | Performance Report & Final Documentation |
| *(buffer)* | Fri | — | バッファ時間 | — | — |

---

## 🏗️ Architecture Overview

```
React Native App (Frontend)
        │
        │  Axios + JWT Token
        ▼
  NestJS Backend (API)
  ┌─────────────────────────┐
  │  Controller Layer       │  ← Routes & Request handling
  │  Service Layer          │  ← Business Logic
  │  Repository / Prisma    │  ← DB Queries
  └─────────────────────────┘
        │                  │
        ▼                  ▼
  PostgreSQL           Firebase
  (Neon.tech)       (FCM + Storage)
        │
  [Docker Container]
        │
  Render / Koyeb (Cloud)
        │
  Cron-job.org (Keep-alive ping)
```

---

## ✅ Milestone Checklist

- [ ] **Week 1:** Working Car CRUD API with Neon.tech PostgreSQL
- [ ] **Week 2:** Secure Auth (JWT) + Real-time Chat (Socket.io) + Push Notifications (FCM) + Cron Jobs
- [ ] **Week 3:** Full React Native App migrated from Supabase → Custom NestJS Backend
- [ ] **Week 4:** Dockerized & deployed to cloud, Swagger docs live, 24/7 uptime confirmed
- [ ] **Bonus:** Load test with 30 members + finalized README & Architecture docs
