# Day 10: Dockerization — Multi-Stage Builds 🐳📦

ယနေ့ သင်ခန်းစာတွင် ကျွန်ုပ်တို့သည် Days 1–9 တွင် တည်ဆောက်ခဲ့သော NestJS Car Rental API ကို **Docker Container** အဖြစ် ထုပ်ပိုးပြီး၊ မည်သည့် ကွန်ပျူတာတွင်မဆို တူညီသော ပတ်ဝန်းကျင်ဖြင့် အလုပ်လုပ်နိုင်စေရန် **Dockerization** လုပ်ဆောင်ပါမည်။

Phase 1 (Days 1–10) ၏ နောက်ဆုံးနေ့ဖြစ်ပြီး၊ Week 4 Day 18 တွင် Cloud သို့ Deploy လုပ်ရန် အခြေခံအဆောက်အအုံ ပြင်ဆင်ခြင်း ဖြစ်ပါသည်။

---

## 🧠 Core Architecture Concepts (အခြေခံ သဘောတရားများ)

### 1. Docker ဆိုသည်မှာ အဘယ်နည်း?

**Docker** သည် Application တစ်ခုလုံးကို (Node.js runtime, dependencies, compiled code) **Image** တစ်ခုအဖြစ် ထုပ်ပိုးပေးပြီး၊ ဘယ်နေရာမဆို တူညီသော **Container** အဖြစ် Run နိုင်စေသည်။

| အယူအဆ                    | ရှင်းလင်းချက်                                 | ဥပမာ                           |
| ------------------------ | --------------------------------------------- | ------------------------------ |
| **Dockerfile**           | Image ဖန်တီးရန် ညွှန်ကြားချက် ဖိုင်           | `FROM node:20-alpine`          |
| **Image**                | Read-only template (အလုပ်လုပ်ရန် ပုံစံ)       | `car-rental-api:latest`        |
| **Container**            | Image မှ Run နေသော Instance (လက်တွေ့ Process) | `docker run` ဖြင့် စတင်သော API |
| **Volume**               | Container ပြင်ပမှ ဖိုင်များ Mount လုပ်ခြင်း   | `serviceAccountKey.json`       |
| **Environment Variable** | Container အတွင်း Config တန်ဖိုးများ           | `DATABASE_URL`, `PORT`         |

### 2. ဘာကြောင့် Multi-Stage Build သုံးရသလဲ?

Single-stage Dockerfile တစ်ခုတည်းဖြင့် Build လုပ်ပါက `devDependencies` (Jest, ESLint, TypeScript compiler) အားလုံး Production Image ထဲသို့ ဝင်ရောက်သွားပြီး Image size ကြီးလွန်းမည်။

**Multi-stage build** သည် Stage ၂ ခု သုံးသည်-

```mermaid
flowchart LR
    subgraph Stage1 ["Stage 1: builder"]
        A[npm ci] --> B[prisma generate]
        B --> C[nest build]
        C --> D[npm prune --omit=dev]
    end

    subgraph Stage2 ["Stage 2: production"]
        E[Copy dist/] --> F[Copy node_modules/]
        F --> G[node dist/src/main.js]
    end

    Stage1 -->|Only compiled output| Stage2
```

| Stage          | ရည်ရွယ်ချက်                                 | Image ထဲ ပါဝင်သော အရာ                  |
| -------------- | ------------------------------------------- | -------------------------------------- |
| **builder**    | TypeScript compile + Prisma Client generate | devDependencies အားလုံး                |
| **production** | Run သာ လုပ်မည့် lean image                  | `dist/`, production `node_modules/` သာ |

> **ရလဒ်:** Image size ~800MB → ~200MB အနီးအနား လျော့ကျသည်။

### 3. Docker Container အလုပ်လုပ်ပုံ (Flow)

```mermaid
sequenceDiagram
    participant Dev as Developer 💻
    participant Docker as Docker Engine
    participant Container as API Container
    participant DB as Neon PostgreSQL
    participant FCM as Firebase (FCM)

    Dev->>Docker: docker build -t car-rental-api .
    Note over Docker: Stage 1: Build TypeScript<br/>Stage 2: Copy production files
    Docker-->>Dev: Image created ✅

    Dev->>Docker: docker run -p 3000:3000 -e DATABASE_URL=... -v firebase-key:/app/...
    Docker->>Container: Start container
    Container->>DB: Prisma $connect()
    DB-->>Container: Connected ✅
    Container-->>Dev: Server running on :3000

    Note over Dev, Container: Test API
    Dev->>Container: GET /health (or GET /)
    Container-->>Dev: 200 OK
```

---

## 📋 Day 10 Plan Overview

| Step | Task                                         | Commit Message                                                 |
| ---- | -------------------------------------------- | -------------------------------------------------------------- |
| 0    | Docker Desktop စစ်ဆေးခြင်း                   | —                                                              |
| 1    | `main.ts` — PORT env variable ထည့်သွင်းခြင်း | `Day 10: read PORT from environment for container deployment`  |
| 2    | `.dockerignore` ဖန်တီးခြင်း                  | `Day 10: add .dockerignore to slim Docker build context`       |
| 3    | Multi-stage `Dockerfile` ရေးသားခြင်း         | `Day 10: add multi-stage Dockerfile for NestJS API`            |
| 4    | Image Build & Run                            | — (runtime only)                                               |
| 5    | API စမ်းသပ်ခြင်း                             | —                                                              |
| 6    | `docker-compose.yml` (Optional)              | `Day 10: add docker-compose for one-command local API startup` |

---

## 🛠️ Step-by-Step Implementation Guide

### Step 0: Docker Desktop စစ်ဆေးခြင်း

Docker မတပ်ဆင်ရသေးပါက [Docker Desktop](https://www.docker.com/products/docker-desktop/) ကို Install လုပ်ပါ။

```powershell
docker --version
docker compose version
```

အောက်ပါအတိုင်း Version ပြပါက အဆင်သင့်ဖြစ်ပါပြီ-

```
Docker version 27.x.x
Docker Compose version v2.x.x
```

---

### Step 1: PORT Environment Variable ထည့်သွင်းခြင်း

Cloud hosting (Render/Koyeb — Day 18) တွင် `PORT` ကို Platform က သတ်မှတ်ပေးသည်။ Hardcode `3000` ထားပါက Container မှာ အလုပ်မလုပ်နိုင်ပါ။

**`backend/src/main.ts`**

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  const port = process.env.PORT || 3000; // 👈 Container/Cloud PORT ကို ဖတ်ပါ
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}

bootstrap();
```

> **Commit:** `Day 10: read PORT from environment for container deployment`

---

### Step 2: `.dockerignore` ဖန်တီးခြင်း

Build context ထဲသို့ မလိုအပ်သော ဖိုင်များ ဝင်မသွားစေရန် `backend/.dockerignore` ဖန်တီးပါ-

**`backend/.dockerignore`**

```
node_modules
dist
coverage
.git
.env
.env.*
*.log
serviceAccountKey.json
test
*.md
```

**ဘာကြောင့် အရေးကြီးလဲ?**

| Exclude လုပ်သော ဖိုင်    | အကြောင်းရင်း                                                   |
| ------------------------ | -------------------------------------------------------------- |
| `node_modules`           | Container အတွင်း `npm ci` ဖြင့် ပြန် install လုပ်မည်           |
| `.env`                   | Secrets များ Image ထဲ မပါဝင်ရ                                  |
| `serviceAccountKey.json` | Firebase Private Key — Volume ဖြင့် Runtime တွင် Mount လုပ်မည် |
| `dist`                   | Builder stage တွင် ပြန် build လုပ်မည်                          |

> **Commit:** `Day 10: add .dockerignore to slim Docker build context`

---

### Step 3: Multi-Stage Dockerfile ရေးသားခြင်း

**`backend/Dockerfile`**

```dockerfile
# ============================================
# Stage 1: BUILD — Compile TypeScript + Prisma
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencies install (layer cache အတွက် package files ကို အရင် copy)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Prisma Client generate
RUN npx prisma generate

# Source code copy & NestJS build
COPY . .
RUN npm run build

# devDependencies ဖယ်ရှားခြင်း
RUN npm prune --omit=dev

# ============================================
# Stage 2: PRODUCTION — Lean runtime image
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Builder stage မှ production files သာ ယူခြင်း
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
```

**Dockerfile အပိုင်းအစ ရှင်းလင်းချက်**

| မျဉ်း                              | အဓိပ္ပာယ်                                          |
| ---------------------------------- | -------------------------------------------------- |
| `FROM node:20-alpine AS builder`   | Build stage — Alpine Linux (ပေါ့ပါးသည်)            |
| `npm ci`                           | `package-lock.json` အတိုင်း exact versions install |
| `npx prisma generate`              | `@prisma/client` ကို schema အလိုက် generate        |
| `npm run build`                    | TypeScript → JavaScript (`dist/` folder)           |
| `npm prune --omit=dev`             | Jest, ESLint စသော dev packages ဖယ်ရှား             |
| `COPY --from=builder`              | Build stage မှ လိုအပ်သော files သာ ယူ               |
| `CMD ["node", "dist/src/main.js"]` | Production server စတင်ခြင်း                        |

> **Commit:** `Day 10: add multi-stage Dockerfile for NestJS API`

---

### Step 4: Image Build & Container Run

`backend/` folder ထဲသို့ ဝင်ပြီး အောက်ပါ commands များ Run ပါ-

#### 4a. Image Build

```powershell
cd backend
docker build -t car-rental-api:latest .
```

အောင်မြင်ပါက နောက်ဆုံးတွင် အောက်ပါအတိုင်း ပြပါမည်-

```
=> exporting to image
=> => naming to docker.io/library/car-rental-api:latest
```

Image စာရင်း စစ်ဆေးရန်-

```powershell
docker images car-rental-api
```

#### 4b. Container Run (Manual)

```powershell
docker run -d `
  --name car-rental-api `
  -p 3000:3000 `
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require" `
  -v "${PWD}/serviceAccountKey.json:/app/serviceAccountKey.json:ro" `
  car-rental-api:latest
```

| Flag                    | ရှင်းလင်းချက်                         |
| ----------------------- | ------------------------------------- |
| `-d`                    | Background (detached) mode            |
| `--name car-rental-api` | Container အမည်                        |
| `-p 3000:3000`          | Host port 3000 → Container port 3000  |
| `-e DATABASE_URL=...`   | Neon database connection string       |
| `-v ... :ro`            | Firebase key ဖိုင်ကို read-only mount |

> ⚠️ `DATABASE_URL` ကို သင့် `.env` ဖိုင်မှ တန်ဖိုး ကူးယူပါ။ Image ထဲ `.env` မပါဝင်ပါ။

#### 4c. Logs စစ်ဆေးခြင်း

```powershell
docker logs car-rental-api
```

အောင်မြင်ပါက-

```
Firebase Admin SDK initialized successfully. 🚀
Server is running on http://localhost:3000
```

#### 4d. Container ရပ်ခြင်း / ဖျက်ခြင်း

```powershell
docker stop car-rental-api
docker rm car-rental-api
```

---

### Step 5: API စမ်းသပ်ခြင်း

Container Run နေစဉ် Host machine မှ API ကို ခေါ်ပါ-

```powershell
# Health check (app.controller.ts ရှိ endpoint)
curl http://localhost:3000

# Cars list (JWT လိုအပ်နိုင်သည်)
curl http://localhost:3000/cars
```

Browser တွင် `http://localhost:3000` ဖွင့်ပြီး Response ရရှိကြောင်း စစ်ဆေးပါ။

**Local `npm run start:dev` နှင့် Container ကွာခြားချက်**

|              | Local Dev                        | Docker Container               |
| ------------ | -------------------------------- | ------------------------------ |
| Code changes | Hot reload (`--watch`)           | Image rebuild လိုအပ်           |
| Node version | Host machine                     | Image ထဲ `node:20-alpine`      |
| Env vars     | `.env` file                      | `-e` flags or `docker-compose` |
| Firebase key | `backend/serviceAccountKey.json` | Volume mount                   |

---

### Step 6 (Optional): docker-compose.yml

တစ်ကြိမ် command ဖြင့် Build + Run လုပ်နိုင်ရန် `backend/docker-compose.yml` ဖန်တီးပါ-

**`backend/docker-compose.yml`**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: car-rental-api
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./serviceAccountKey.json:/app/serviceAccountKey.json:ro
    restart: unless-stopped
```

**Run:**

```powershell
cd backend
docker compose up --build -d
```

**ရပ်ခြင်း:**

```powershell
docker compose down
```

> **Commit:** `Day 10: add docker-compose for one-command local API startup`

---

## 🔒 Security Best Practices (Day 10)

```mermaid
flowchart TD
    A[Secrets Management] --> B[.env → NEVER in Image]
    A --> C[serviceAccountKey.json → Volume mount]
    A --> D[DATABASE_URL → Runtime env only]

    E[Image Hardening] --> F[Multi-stage → No devDeps]
    E --> G[Alpine Linux → Smaller attack surface]
    E --> H[.dockerignore → Exclude test/coverage]
```

| Rule         | လုပ်ရမည်                               | မလုပ်ရ                                    |
| ------------ | -------------------------------------- | ----------------------------------------- |
| Secrets      | `-e` flag, `env_file`, Cloud dashboard | Dockerfile ထဲ `COPY .env`                 |
| Firebase Key | Volume mount (`:ro`)                   | Image ထဲ embed                            |
| Dependencies | `npm prune --omit=dev`                 | Full `node_modules` copy from dev machine |

---

## 🧪 Troubleshooting Guide

| Error                                        | အကြောင်းရင်း                                        | ဖြေရှင်းနည်း                                                    |
| -------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `Can't reach database server`                | `DATABASE_URL` မှား သို့မဟုတ် Neon IP whitelist     | Connection string စစ်ပါ; Neon မှာ `sslmode=require` ထည့်ပါ      |
| `Failed to initialize Firebase`              | `serviceAccountKey.json` mount မလုပ်ရသေး            | `-v` volume path မှန်ကန်မှု စစ်ပါ                               |
| `Error: Cannot find module '@prisma/client'` | `prisma generate` မလုပ်ရသေး                         | Dockerfile builder stage တွင် `npx prisma generate` ပါမှု စစ်ပါ |
| `Port 3000 already in use`                   | Local dev server သို့မဟုတ် container အဟောင်း Run နေ | `docker stop` သို့မဟုတ် `npm run start:dev` ရပ်ပါ               |
| `EACCES permission denied`                   | Windows path issue                                  | PowerShell `${PWD}` သုံးပါ                                      |

---

## ✅ Day 10 Completion Checklist

- [ ] Docker Desktop installed & `docker --version` works
- [ ] `main.ts` reads `process.env.PORT`
- [ ] `.dockerignore` excludes secrets & `node_modules`
- [ ] Multi-stage `Dockerfile` created in `backend/`
- [ ] `docker build -t car-rental-api .` succeeds
- [ ] `docker run` starts container with `DATABASE_URL` + Firebase volume
- [ ] `docker logs` shows "Server is running on http://localhost:3000"
- [ ] `curl http://localhost:3000` returns response
- [ ] (Optional) `docker compose up --build` works

---

## 🔗 Phase 1 → Phase 2 Bridge

Day 10 ဖြင့် Phase 1 (Foundation) ပြီးဆုံးပါပြီ။ Docker Image သည် Week 4 Day 18 တွင် Render/Koyeb သို့ Deploy လုပ်ရန် အသင့်ဖြစ်နေပါပြီ။

```mermaid
graph LR
    D10[Day 10: Docker Image 🐳] --> D17[Day 17: Swagger + CI]
    D17 --> D18[Day 18: Cloud Deploy 🚀]
    D18 --> D19[Day 19: Keep-alive Cron]
    D19 --> D20[Day 20: Load Test + Docs]
```

| Phase 1 Deliverable (Days 1–10) | Status    |
| ------------------------------- | --------- |
| NestJS API with CRUD            | ✅        |
| JWT Auth + Guards               | ✅        |
| Socket.io Chat                  | ✅        |
| Firebase Push Notifications     | ✅        |
| Cron Jobs                       | ✅        |
| **Docker Container**            | ✅ Day 10 |

---

## 📦 Git Commit Summary (Day 10)

```text
Day 10: read PORT from environment for container deployment
Day 10: add .dockerignore to slim Docker build context
Day 10: add multi-stage Dockerfile for NestJS API
Day 10: add docker-compose for one-command local API startup
```

---

_Day 10 Guide — Phase 1 Complete. Next: Day 11 — Clean Architecture Refactor._
