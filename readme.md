# 🚗 Full-Stack Car Rental System: NestJS Backend & Migration Guide

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

A comprehensive, production-ready full-stack ecosystem for a **Car Rental Application**. This repository documents the journey of migrating from a Supabase backend to a custom-built, enterprise-grade architecture using **NestJS**, **Prisma ORM**, and **Neon.tech (PostgreSQL)**, integrated with a **React Native** customer app and a **Vite/React** admin dashboard.

---

## 🏗️ Ecosystem Architecture

The ecosystem consists of three independent sub-projects cooperating to form the full application:

1. **`backend/`**: The core API engine built with **NestJS**, handling business logic, authentication, real-time messaging, and database transactions.
2. **`frontend/`**: The customer-facing mobile application built with **React Native / Expo** for booking and management.
3. **`react/`**: The administration console built with **Vite & React** for owners to manage the fleet, track bookings, and view analytics.

```mermaid
graph TD
    User([Customer / Mobile]) -->|Axios + JWT| API[NestJS Backend API]
    Admin([Owner / Web Admin]) -->|Axios + JWT| API
    
    subgraph backend [NestJS Engine]
        API --> Controller[Controllers: Routing & Input Validation]
        Controller --> Service[Services: Business Logic]
        Service --> Prisma[Prisma ORM: Database Access]
    end

    Prisma --> DB[(Neon.tech PostgreSQL)]
    Service --> FCM[Firebase Cloud Messaging]
    Service --> Storage[Firebase Storage]
    
    classDef main fill:#e0234e,stroke:#fff,stroke-width:2px,color:#fff;
    classDef client fill:#3178c6,stroke:#fff,stroke-width:2px,color:#fff;
    classDef external fill:#2d3748,stroke:#fff,stroke-width:2px,color:#fff;
    class API,Controller,Service,Prisma main;
    class User,Admin client;
    class DB,FCM,Storage external;
```

---

## 🛠️ Technology Stack

| Component | Technology | Description / Role |
| :--- | :--- | :--- |
| **Framework** | [NestJS](https://nestjs.com/) | Modular, enterprise-ready TypeScript framework. |
| **Database** | [Neon.tech](https://neon.tech/) | Serverless PostgreSQL with auto-scaling and connection pooling. |
| **ORM** | [Prisma](https://www.prisma.io/) | Next-generation Node.js and TypeScript ORM. |
| **Security** | [Bcrypt](https://github.com/kelektiv/node.bcrypt.js) & JWT | Secure password hashing & dual-token (Access + Refresh) auth strategy. |
| **Real-time** | [Socket.io](https://socket.io/) | WebSockets wrapper for live chat and booking synchronization. |
| **Notifications** | [Firebase Admin SDK](https://firebase.google.com/docs/admin) | FCM integration for triggering instant push notifications. |
| **File Storage** | Firebase Storage | Cloud bucket for hosting vehicle and user upload media. |
| **API Docs** | [Swagger](https://swagger.io/) | Auto-generated interactive API specification. |
| **Containerization** | [Docker](https://www.docker.com/) | Container packaging for deterministic deployments. |
| **Hosting** | Render / Koyeb | Cloud application hosting. |

---

## 📆 4-Week Learning & Development Schedule

The project is structured as a 20-day training curriculum split into two main phases.

```mermaid
gantt
    title Car Rental Project Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Foundation
    Core API & Database Setup    :active, w1, 2026-06-01, 5d
    Auth & Advanced Features     : w2, after w1, 5d
    section Phase 2: Migration & DevOps
    Client Migration & Integration: w3, after w2, 5d
    DevOps, Documentation & Launch : w4, after w3, 5d
```

### 📅 Phase 1: Foundation — Core API & Database (Days 1–10)
*   **Week 1 (Days 1–5): Core API & Database Setup**
    *   **Day 1:** Manual NestJS project bootstrap (Modules, Controllers, Services).
    *   **Day 2:** Neon PostgreSQL connection and Prisma ORM setup.
    *   **Day 3:** Cars inventory database schema design and full CRUD endpoints.
    *   **Day 4:** Request validation using DTOs (`class-validator`), error handling (`ConflictException`), and overlap validation.
    *   **Day 5:** Database visibility setup (Prisma Studio) & secure password hashing with `bcrypt`.
*   **Week 2 (Days 6–10): Advanced Authentication & Infrastructure**
    *   **Day 6:** Enterprise JWT Authentication with Access and Refresh Token rotation.
    *   **Day 7:** Access controls (Route Guards) & WebSocket real-time chat utilizing `Socket.io`.
    *   **Day 8:** Firebase Admin SDK setup for Push Notification delivery.
    *   **Day 9:** NestJS scheduler integration for daily automated reports (late rentals, revenue tracking).
    *   **Day 10:** Dockerizing the API server using multi-stage builds.

### 📅 Phase 2: Migration & DevOps (Days 11–20)
*   **Week 3 (Days 11–16): Client Migration & Integration**
    *   **Day 11:** Refactoring codebase using Clean Architecture.
    *   **Day 12:** Setting up Axios HTTP client with JWT interceptors in React Native.
    *   **Day 13-14:** Replacing Supabase Auth & DB client with custom NestJS API clients.
    *   **Day 15:** Migrating file storage uploads directly to Firebase Storage.
    *   **Day 16:** Socket.io migration for live chat and notifications.
*   **Week 4 (Days 17–20): DevOps, Launch & Hardening**
    *   **Day 17:** Swagger OpenAPI documentation setup & CI/CD deployment preparation.
    *   **Day 18:** Production deployment to Render/Koyeb.
    *   **Day 19:** Database pooling configuration & Cron-job ping setup (24/7 uptime optimization).
    *   **Day 20:** Performance stress testing and documentation finalization.

---

## 🔒 Enterprise Token Authentication Flow

A critical feature of the backend is the dual-token architecture that maximizes API performance while preserving strict security.

```mermaid
sequenceDiagram
    autonumber
    participant App as Client (React Native / Web)
    participant API as NestJS Backend
    participant DB as Neon Database

    Note over App, API: Standard API Requests
    App->>API: GET /cars (Access Token in Header)
    API-->>App: 200 OK (Data returned without DB Auth checks)

    Note over App, API: Access Token Expiration (e.g. after 15 mins)
    App->>API: GET /cars (Expired Access Token)
    API-->>App: 401 Unauthorized (Expired)

    Note over App, API: Silent Token Refresh
    App->>API: POST /auth/refresh (Refresh Token in Header)
    API->>DB: Compare refresh token hash
    DB-->>API: Match valid
    API-->>App: Return new Access + Refresh Token pair

    App->>API: GET /cars (New Access Token)
    API-->>App: 200 OK
```

*   **Access Token:** Short lifespan (15 minutes), stateless verification via JWT cryptography for rapid response times.
*   **Refresh Token:** Long lifespan (7 days), stateful validation with hashes stored in PostgreSQL for session control and revocation on logout.

---

## 🛡️ Input Validation & Overlap Formulas

### Global Validation Bouncer
Requests are filtered via a global NestJS `ValidationPipe` equipped with `whitelist: true`. This strips out undeclared payload properties, mitigating malicious mass-assignment injection attacks.

### Smart Booking Overlap Formula
To prevent double-booking a single car, the `BookingsService` performs an overlap check on dates. The formula guarantees that any overlap (early, late, enveloping, or enclosed) is blocked before database write:

$$\text{Overlap Condition} = (\text{Start}_A \le \text{End}_B) \land (\text{End}_A \ge \text{Start}_B)$$

Implemented via Prisma:
```typescript
const existingBooking = await this.prisma.booking.findFirst({
  where: {
    carId: carId,
    AND: [
      { startDate: { lte: new Date(endDate) } },
      { endDate: { gte: new Date(startDate) } },
    ],
  },
});
```

---

## 🚀 Getting Started

### 📋 Prerequisites
*   Node.js (v20+ recommended)
*   npm or yarn
*   A running PostgreSQL database (e.g., [Neon.tech](https://neon.tech/))

### 🛠️ Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/ayechanaungdev/full-stack-development.git
    cd full-stack-development
    ```
2.  Install dependencies for the backend:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    Create a `.env` file in the root backend directory:
    ```env
    DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
    JWT_ACCESS_SECRET="your_jwt_access_secret_key"
    JWT_REFRESH_SECRET="your_jwt_refresh_secret_key"
    ```
4.  Sync Database Schema:
    ```bash
    npx prisma db push
    npx prisma generate
    ```
5.  Start the Development Server:
    ```bash
    npm run start:dev
    ```

---

## 📖 Deep-Dive Guides

For comprehensive daily development explanations and step-by-step guides, consult the [system-docs/](file:///f:/study_projects/full-stack-development/system-docs/) directory:

*   [Day 1: Manual NestJS Setup](file:///f:/study_projects/full-stack-development/system-docs/day-01-complete-guide.md)
*   [Day 2: Database Architecture & Prisma](file:///f:/study_projects/full-stack-development/system-docs/day-02-complete-guide.md)
*   [Day 3: Car Inventory CRUD & Modular Architecture](file:///f:/study_projects/full-stack-development/system-docs/day-03-complete-guide.md)
*   [Day 4: DTOs, Validation & Error Handling](file:///f:/study_projects/full-stack-development/system-docs/day-04-complete-guide.md)
*   [Day 5: Database Visibility & Secure Registration](file:///f:/study_projects/full-stack-development/system-docs/day-05-complete-guide.md)
*   [Day 6: Enterprise Authentication (JWT & Refresh Tokens)](file:///f:/study_projects/full-stack-development/system-docs/day-06-complete-guide.md)
*   [Overall Node.js Backend Learning Schedule](file:///f:/study_projects/full-stack-development/system-docs/node-js-backend-learning-schedule.md)
