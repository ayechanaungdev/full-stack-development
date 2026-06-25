# Day 17 — API Documentation & Hosting Setup: Swagger + CI/CD Pipeline

## Overview

**Goal:** Add auto-generated Swagger API documentation, set up a GitHub Actions CI pipeline, and prepare the backend for cloud deployment (Render/Koyeb).

By the end of Day 17, you will have:
- `http://localhost:3000/api` — Interactive Swagger UI
- A GitHub Actions workflow that lints, builds, and tests on every push
- The Docker image ready to deploy to Render/Koyeb (Day 18)

---

## Architecture: What We're Building

```mermaid
graph TD
    Dev["Developer pushes code"] --> GitHub["GitHub Repository"]
    GitHub --> GHA["GitHub Actions CI"]
    GHA --> Lint["Lint & TypeCheck"]
    GHA --> Build["Build & Test"]
    GHA --> DockerCheck["Verify Docker build"]

    subgraph Swagger["NestJS App"]
        API["SwaggerModule<br/>/api endpoint"]
        Controllers["Controllers<br/>@ApiTags"]
        DTOs["DTOs<br/>@ApiProperty"]
    end

    API -->|"OpenAPI JSON"| SwaggerUI["Swagger UI<br/>(interactive docs)"]
    Browser["Developer/QA"] --> SwaggerUI
```

---

## Step 1: Install Swagger Dependencies

```powershell
cd backend
npm install @nestjs/swagger
```

> **Notable:** `@nestjs/swagger` automatically includes `swagger-ui-express` as a dependency — no need to install it separately. For NestJS v11 (which we're using), version `^11.0.0` will be installed.

**Verify Installation:**
```powershell
npm list @nestjs/swagger
```

Expected output:
```
backend@0.0.1 F:\study_projects\full-stack-development\backend
└── @nestjs/swagger@11.0.6
```

---

## Step 2: Configure Swagger in `main.ts`

Open `backend/src/main.ts` and add Swagger setup after `enableCors()`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.enableCors();

  // ---- Swagger Configuration ----
  const config = new DocumentBuilder()
    .setTitle('Car Rental API')
    .setDescription('NestJS Backend for Car Rental Application')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Authentication endpoints (login, register, refresh)')
    .addTag('Users', 'User management')
    .addTag('Cars', 'Car inventory management')
    .addTag('Bookings', 'Booking operations')
    .addTag('Reviews', 'Car reviews and ratings')
    .addTag('Chat', 'Real-time chat')
    .addTag('Notifications', 'Push notifications')
    .addTag('Uploads', 'File uploads')
    .addTag('Reports', 'Admin reports')
    .addTag('Drivers', 'Driver management')
    .addTag('Inquiries', 'Customer inquiries')
    .addTag('Wishlist', 'User wishlist')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  // ---------------------------------

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api`);
}

bootstrap();
```

### Key Configuration Breakdown

| Option | Purpose |
|--------|---------|
| `.setTitle()` | API title shown in Swagger UI |
| `.setDescription()` | Detailed description |
| `.setVersion()` | API version (update when breaking changes occur) |
| `.addBearerAuth()` | Enables "Authorize" button in Swagger UI for JWT tokens |
| `.addTag()` | Groups endpoints by module |
| `SwaggerModule.createDocument()` | Generates OpenAPI JSON from your controllers/DTOs |
| `SwaggerModule.setup('api', ...)` | Serves Swagger UI at `/api` |

### Potential Error: `bodyParser` conflict with Swagger

> **If Swagger UI fails to load**, it may be because we disabled the default NestJS body parser. The Swagger UI serves static assets and needs the default parser for its own requests. If this causes issues, we may need to adjust. However, `@nestjs/swagger` v11 should handle this internally.

---

## Step 3: Test Swagger UI

Start your development server:

```powershell
cd backend
npm run start:dev
```

Open your browser to: **http://localhost:3000/api**

You should see:
- Swagger UI with the title "Car Rental API"
- A list of all endpoints grouped by tags
- An "Authorize" button at the top-right for JWT tokens

### Common Issues & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Blank Swagger page | Swagger static assets not loading | Check `@nestjs/swagger` version; try `npm update @nestjs/swagger` |
| `Cannot find module '@nestjs/swagger'` | Not installed | Run `npm install @nestjs/swagger` inside `backend/` |
| Endpoints show as "unnamed" or missing | No decorators on controllers/DTOs | Add `@ApiTags()`, `@ApiOperation()`, `@ApiProperty()` decorators (Step 4) |
| `Bearer` header not working | Wrong `addBearerAuth` config | Verify the name matches: `@ApiBearerAuth('access-token')` |

---

## Step 4: Add API Decorators to Controllers & DTOs

Swagger auto-detects most things from NestJS decorators, but you should add explicit decorators for better documentation.

### Controller Example: `auth.controller.ts`

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login', description: 'Authenticate with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBearerAuth('access-token')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiBearerAuth('access-token')
  async logout(@Body() body: { userId: number }) {
    return this.authService.logout(body.userId);
  }
}
```

### DTO Example: `login.dto.ts`

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  password: string;
}
```

### Available Swagger Decorators

| Decorator | Applies To | Purpose |
|-----------|-----------|---------|
| `@ApiTags()` | Controller | Groups endpoints under a named section |
| `@ApiOperation()` | Method | Adds summary & description to an endpoint |
| `@ApiBearerAuth()` | Method/Controller | Marks endpoint as requiring JWT |
| `@ApiProperty()` | DTO property | Describes a request/response field |
| `@ApiPropertyOptional()` | DTO property | Marks field as optional |
| `@ApiResponse()` | Method | Documents possible responses |
| `@ApiQuery()` | Method | Documents query parameters |
| `@ApiParam()` | Method | Documents route parameters |
| `@ApiBody()` | Method | Documents request body |
| `@ApiExcludeEndpoint()` | Method | Hides endpoint from Swagger |

### Generate Complete API Doc File (Optional)

For sharing with frontend team without running the server:

```typescript
// In main.ts, after SwaggerModule.createDocument
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const document = SwaggerModule.createDocument(app, config);
writeFileSync(resolve(__dirname, '../swagger-spec.json'), JSON.stringify(document, null, 2));
SwaggerModule.setup('api', app, document);
```

This saves `swagger-spec.json` that can be imported into tools like Postman or Stoplight.

---

## Step 5: Setup GitHub Actions CI Pipeline

Create a CI workflow file:

**`.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    name: Lint & TypeCheck
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Lint
        run: npm run lint

      - name: TypeCheck
        run: npx tsc --noEmit

  test:
    name: Test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run unit tests
        run: npm test

  docker-build:
    name: Docker Build Verification
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: false
          tags: car-rental-api:ci-test
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### What This CI Does

| Job | Purpose | When It Runs |
|-----|---------|-------------|
| `lint-and-typecheck` | ESLint + TypeScript type checking | Every push/PR |
| `test` | Run Jest unit tests | Every push/PR |
| `docker-build` | Verify Docker image builds successfully | Every push/PR (uses GitHub cache for speed) |

### Notable: Secrets in CI

Never put secrets (`.env`, `serviceAccountKey.json`, `DATABASE_URL`) into the CI pipeline for linting/typechecking. The `prisma generate` step only needs the Prisma schema file, not the actual database connection.

> **Potential Error:** If you get `PrismaClientInitializationError` in CI because `DATABASE_URL` is not set, add `DATABASE_URL="dummy"` to CI environment or use `prisma generate --no-engine` for schema validation only.

---

## Step 6: Prepare for Cloud Deployment (Render/Koyeb)

### 6a. Ensure `main.ts` reads PORT from env (already done ✅)

Your `main.ts` already uses:
```typescript
const port = process.env.PORT || 3000;
```

Cloud platforms set `PORT` environment variable automatically — your app must respect it.

### 6b. Dockerfile is ready (already exists ✅)

Your multi-stage Dockerfile at `backend/Dockerfile` is already configured:
- Uses `node:20-alpine`
- Multi-stage build for small image size (~200MB)
- Exposes port 3000
- Runs `node dist/src/main.js`

### 6c. Create Render Blueprint (Optional)

**`render.yaml`** (in project root):

```yaml
services:
  - type: web
    name: car-rental-api
    env: docker
    repo: https://github.com/ayechanaungdev/full-stack-development
    branch: main
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: PORT
        value: 3000
```

### 6d. Push to GitHub

```powershell
git add .
git commit -m "Day 17: add Swagger, CI pipeline, and hosting config"
git push origin main
```

> **Notable:** After pushing, GitHub Actions will auto-run the CI pipeline. Check the "Actions" tab on GitHub to see results.

---

## Step 7: Verify Everything

### 7a. Local Verification

1. Start the server: `npm run start:dev`
2. Visit `http://localhost:3000/api` — Swagger UI should load
3. Try an endpoint: Click `GET /cars` → "Try it out" → "Execute"
4. Verify JWT auth: Login via `/auth/login` → copy token → click "Authorize" → paste token

### 7b. CI Verification

1. Push to GitHub
2. Go to your repo → "Actions" tab
3. Three jobs should run: lint-and-typecheck, test, docker-build
4. All should pass with green checkmarks

### 7c. Docker Build Verification

```powershell
cd backend
docker build -t car-rental-api:day17 .
docker run -d --name test-api -p 3000:3000 -e DATABASE_URL="your_neon_url" car-rental-api:day17
# Visit http://localhost:3000/api
docker stop test-api && docker rm test-api
```

---

## Key Takeaways

| Concept | Why It Matters |
|---------|---------------|
| **Swagger/OpenAPI** | Auto-generated, interactive API docs; frontend devs can explore endpoints without asking backend team |
| **@ApiBearerAuth** | Lets Swagger UI send JWT tokens with requests — essential for testing protected routes |
| **GitHub Actions CI** | Catches errors before they reach production; runs lint, typecheck, tests, and Docker build |
| **Multi-stage Docker** | Production image stays lean (~200MB) by excluding dev dependencies and source maps |
| **render.yaml** | Infrastructure-as-code — declare your hosting config in the repo so it's version-controlled |

---

## Git Commits Reference

```text
Day 17: install @nestjs/swagger and configure Swagger in main.ts
Day 17: add API decorators to controllers and DTOs
Day 17: add GitHub Actions CI workflow
Day 17: add Render hosting blueprint
```

---

## 🧪 Notable Facts & Issues Encountered

### Issue 1: Prisma requires DATABASE_URL at startup
When testing the server with a dummy `DATABASE_URL`, Prisma throws `PrismaClientInitializationError` (P1001) because it attempts to connect on module init. To test Swagger locally, use your real Neon.tech database URL:
```powershell
$env:DATABASE_URL="postgresql://actual-user:actual-pass@host/db?sslmode=require"
npx nest start
```

### Issue 2: `SwaggerModule` works with custom body-parser
The NestJS app uses a custom `body-parser` (disabled NestJS default) for large base64 uploads. Swagger UI serves static assets and works correctly alongside this configuration — no conflicts observed with `@nestjs/swagger` v11.4.4.

### Issue 3: GitHub Actions caching
The CI workflow uses `actions/setup-node` with `cache: "npm"` for faster dependency installs, and Docker BuildKit caching (`type=gha`) to speed up Docker builds. When `DATABASE_URL` is not available in CI, the `prisma generate` step only needs the schema file — it does NOT require a live database.

### Tech Fact: `@nestjs/swagger` v11 auto-includes swagger-ui-express
No need to install `swagger-ui-express` separately — `@nestjs/swagger` pulls it in as a transitive dependency. Version installed: `11.4.4`.

### Tech Fact: Swagger JWT auth configuration
The `addBearerAuth()` config must match the `@ApiBearerAuth()` decorator name. In this project:
- Config: `.addBearerAuth({...}, 'access-token')`
- Usage: `@ApiBearerAuth('access-token')`
If names don't match, the "Authorize" button won't send tokens to those endpoints.

---

## Next: Day 18 — Cloud Deployment 🚀

The Docker image + CI pipeline are ready. Day 18 will:
1. Push Docker image to a container registry (Docker Hub / GitHub Container Registry)
2. Deploy to Render or Koyeb
3. Set up environment variables in cloud dashboard
4. Get a live public URL!

---

_End of Day 17 Guide_
