# How to Run All Services — Mobile CTF Platform

This document provides a step-by-step guide to setting up, configuring, launching, and testing all services in the Mobile CTF Platform monorepo.

---

## 📋 Table of Contents

- [System Prerequisites](#-system-prerequisites)
- [Architecture & Port Mapping](#-architecture--port-mapping)
- [Step 1: Environment Setup](#-step-1-environment-setup)
- [Step 2: Start Infrastructure (PostgreSQL & Redis)](#-step-2-start-infrastructure-postgresql--redis)
- [Step 3: Build Sandbox Container](#-step-3-build-sandbox-container)
- [Step 4: Database Migrations & Seed Data](#-step-4-database-migrations--seed-data)
- [Step 5: Run All Services](#-step-5-run-all-services)
  - [Option A: Start All Services Concurrently (Recommended)](#option-a-start-all-services-concurrently-recommended)
  - [Option B: Start Services Individually](#option-b-start-services-individually)
- [Step 6: Verify Service Health](#-step-6-verify-service-health)
- [🔑 Demo Credentials & Test Data](#-demo-credentials--test-data)
- [📬 Postman API Testing](#-postman-api-testing)
- [🧪 Testing & Quality Checks](#-testing--quality-checks)
- [🛠️ Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 💻 System Prerequisites

Ensure you have the following installed on your host system:

| Tool | Minimum Version | Check Command |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.x` (v22 recommended) | `node -v` |
| **npm** | `>= 10.x` (v11 recommended) | `npm -v` |
| **Docker Engine** | `>= 24.x` | `docker --version` |
| **Docker Compose** | `>= v2.x` | `docker compose version` |

---

## 🗺️ Architecture & Port Mapping

When all services are running, the platform uses the following ports:

| Service | Host Port | Protocol | Purpose | URL / Access |
| :--- | :--- | :--- | :--- | :--- |
| **API Server** | `4000` | HTTP / WebSocket | Express REST API & Socket.IO (`/leaderboard`, `/terminal`) | [http://localhost:4000](http://localhost:4000) |
| **Admin Dashboard** | `5173` | HTTP | React 18 + Vite web dashboard | [http://localhost:5173](http://localhost:5173) |
| **Mobile App (Web Preview)** | `8081` | HTTP | Expo SDK 57 / React Native Web | [http://localhost:8081](http://localhost:8081) |
| **PostgreSQL 16** | `5432` | TCP | System of record database (`ctf_dev`) | `localhost:5432` |
| **Redis 7** | `6379` | TCP | Cache, rate limiter, leaderboard ZSETs | `localhost:6379` |
| **Terminal Sandbox** | Isolated | Container internal | Ephemeral Alpine containers (`ctf-sandbox:latest`) | Managed by Docker daemon |

---

## ⚙️ Step 1: Environment Setup

1. Verify or create your `.env` file in the root directory:

```bash
# If .env does not exist yet:
cp .env.example .env
```

2. Confirm key configuration variables in `.env`:

```ini
# Server
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
LOG_LEVEL=info

# Database & Cache
DATABASE_URL=postgresql://ctf:ctf@localhost:5432/ctf_dev
REDIS_URL=redis://localhost:6379

# Allowed CORS Origins (Vite Admin + Expo Web)
CORS_ORIGINS=http://localhost:5173,http://localhost:8081

# Auth
JWT_SECRET=dev-access-secret-change-before-prod
JWT_REFRESH_SECRET=dev-refresh-secret-change-before-prod
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=604800

# Sandbox
SANDBOX_IMAGE=ctf-sandbox:latest
DOCKER_SOCKET_PATH=/var/run/docker.sock

# Mobile client API URL
EXPO_PUBLIC_API_URL=http://localhost:4000
```

3. Ensure dependencies are installed:

```bash
npm install
```

> **Note**: If npm 11 prompts about blocked lifecycle scripts for esbuild or Prisma, run:
> ```bash
> npm install-scripts approve
> ```

---

## 🐳 Step 2: Start Infrastructure (PostgreSQL & Redis)

Start the PostgreSQL and Redis containers using Docker Compose:

```bash
docker compose up -d
```

Verify the containers are running and healthy:

```bash
docker ps --filter "name=ctf-"
```

Expected output:
* `ctf-postgres` (healthy on port `0.0.0.0:5432`)
* `ctf-redis` (healthy on port `0.0.0.0:6379`)

---

## 📦 Step 3: Build Sandbox Container

The in-app terminal sandbox executes commands inside hardened, non-root Alpine Linux containers. Build the local image:

```bash
docker build -t ctf-sandbox:latest infrastructure/sandbox
```

Verify the image was created:

```bash
docker images ctf-sandbox:latest
```

---

## 🗄️ Step 4: Database Migrations & Seed Data

1. Apply database migrations to PostgreSQL:

```bash
npm run db:deploy
```

2. Populate the database with initial users, challenges, categories, tags, events, and teams:

```bash
npm run db:seed
```

---

## 🚀 Step 5: Run All Services

### Option A: Start All Services Concurrently (Recommended)

Run all three applications (API Server, Web Admin, and Mobile Web) in parallel via Turborepo:

```bash
npm run dev
```

Or run with direct log streaming:

```bash
npx turbo run dev --ui=stream
```

This launches:
- `@ctf/api` on `http://localhost:4000`
- `@ctf/admin` on `http://localhost:5173`
- `@ctf/mobile` on `http://localhost:8081`

---

### Option B: Start Services Individually

If you prefer dedicated terminal windows for each service:

#### Terminal 1 — Backend API Server
```bash
npm run dev --workspace=@ctf/api
```
* Runs Express on `http://localhost:4000`.
* Attaches Socket.IO handlers for `/leaderboard` and `/terminal`.
* Hot-reloads on TypeScript file edits via `tsx watch`.

#### Terminal 2 — Admin Dashboard
```bash
npm run dev --workspace=@ctf/admin
```
* Runs Vite dev server on `http://localhost:5173`.
* Automatically proxies `/api` calls to `http://localhost:4000`.

#### Terminal 3 — Mobile Application (Expo)

* **Web Browser Preview**:
  ```bash
  npm run web --workspace=@ctf/mobile
  ```
  Opens the React Native web preview on `http://localhost:8081`.

* **Interactive Expo CLI (Android / iOS / Expo Go QR Code)**:
  ```bash
  npm run start --workspace=@ctf/mobile
  ```
  Scan the terminal QR code with Expo Go on your mobile device (ensure your mobile phone is on the same local Wi-Fi and set `EXPO_PUBLIC_API_URL` to your LAN IP, e.g. `http://192.168.1.50:4000`).

---

## 🔍 Step 6: Verify Service Health

Once all services are launched, verify they are responding:

### 1. Check API Readiness
```bash
curl -s http://localhost:4000/api/ready
```
Expected response:
```json
{
  "status": "ready",
  "dependencies": {
    "postgres": { "status": "up" },
    "redis": { "status": "up" },
    "sandbox": { "status": "up" }
  }
}
```

### 2. Check API Health
```bash
curl -s http://localhost:4000/api/health
```
Expected response:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 15.2,
  "timestamp": "2026-09-05T13:20:00.000Z"
}
```

### 3. Access UIs in your Web Browser
- **Admin Dashboard**: Open `http://localhost:5173`
- **Mobile Web App**: Open `http://localhost:8081`

---

## 🔑 Demo Credentials & Test Data

The seed script creates the following pre-configured demonstration accounts:

### Demonstration Accounts

| Role | Username | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin@ctf.test` | `ctfpass123` | Admin Dashboard (`:5173`) + Mobile App (`:8081`) |
| **Player** | `player1` | `user@ctf.test` | `ctfpass123` | Mobile App (`:8081`) |

### Seeded Challenges & Flags

| Challenge | Category | Difficulty | Points | Demo Flag |
| :--- | :--- | :--- | :--- | :--- |
| **Caesar's Secret** | Cryptography | `EASY` | 100 | `ctf{caesar_would_be_proud}` |
| **XOR Marks the Spot** | Cryptography | `MEDIUM` | 200 | `ctf{not_so_simple_xor}` |
| **Stolen SQL** | Web Exploitation | `EASY` | 150 | `ctf{union_select_from_users}` |
| **Cookie Jar** | Web Exploitation | `MEDIUM` | 250 | `ctf{cookies_are_secrets_too}` |
| **Hidden in the Noise** | Forensics | `EASY` | 100 | `ctf{lsb_stego_rocks}` |
| **LogSweep** | Forensics | `MEDIUM` | 200 | `ctf{credentials_in_the_logs}` |
| **Crack the Binary Chef** | Reversing | `HARD` | 400 | `ctf{strings_are_the_low_hanging_fruit}` |
| **Photo Geek** | OSINT | `MEDIUM` | 150 | `ctf{san_francisco}` |

### Seeded Competitions & Teams
- **Live Event**: `CTF Summer Sprint` (Status: `RUNNING`)
- **Default Team**: `Demo Squad` (Join Code: `DEMO01`)

---

## 📬 Postman API Testing

A complete Postman Collection is located at the root of the workspace: [`api-call.json`](./api-call.json).

### Steps to import:
1. Open **Postman** -> Click **Import** -> Select `api-call.json`.
2. Open the **2. Authentication** folder -> Run **Login (Player)**. The embedded test script automatically extracts `accessToken` and `refreshToken` into collection variables.
3. Run **Login (Admin)** to populate the `adminAccessToken` variable.
4. Execute any of the 67 pre-configured requests across all 12 modules.

---

## 🧪 Testing & Quality Checks

Run the automated test suites and linters at any time:

```bash
# Type check all 7 workspaces
npm run typecheck

# Run complete test suites (API + Toolkit unit & integration tests)
npm test

# Build production bundles
npm run build

# Run linter
npm run lint

# Format code with Prettier
npm run format
```

---

## 🛠️ Troubleshooting & FAQs

### 1. `error: Environment variable not found: DATABASE_URL`
Prisma CLI requires access to `.env`. Ensure a symlink or `.env` exists in `packages/database/`:
```bash
ln -sf ../../.env packages/database/.env
```

### 2. `sandbox: { status: "down" }` in `/api/ready`
The API cannot connect to the local Docker daemon:
- Confirm Docker is running: `docker info`.
- Verify user permissions for `/var/run/docker.sock`:
  ```bash
  sudo chmod 666 /var/run/docker.sock
  ```
- Make sure `ctf-sandbox:latest` was built:
  ```bash
  docker build -t ctf-sandbox:latest infrastructure/sandbox
  ```

### 3. Mobile web cannot connect to backend (CORS error)
Verify that `.env` includes `http://localhost:8081`:
```ini
CORS_ORIGINS=http://localhost:5173,http://localhost:8081
```

### 4. Ports already in use
Check if another process is occupying ports `4000`, `5173`, `8081`, `5432`, or `6379`:
```bash
lsof -i :4000 -i :5173 -i :8081 -i :5432 -i :6379
```
Kill or stop conflicting processes before restarting.

---

## 🛑 How to Stop All Services

1. Stop running dev processes in your terminal by pressing `Ctrl + C`.
2. Stop the Docker infrastructure containers:
```bash
docker compose down
```
To also remove database and redis data volumes:
```bash
docker compose down -v
```
