# Mobile CTF Platform

> A modern, mobile-first **Capture The Flag (CTF) learning, training, and competition platform** for iOS and Android, backed by an Express/TypeScript API, real-time WebSocket engine, isolated Docker container sandboxes, and a web Admin Dashboard.

[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-000000.svg?style=flat&logo=turborepo)](https://turbo.build/repo)
[![Node.js](https://img.shields.io/badge/Node.js-v22-339933.svg?style=flat&logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/API-Express%204-000000.svg?style=flat&logo=express)](https://expressjs.com)
[![Expo](https://img.shields.io/badge/Mobile-Expo%20SDK%2057-000020.svg?style=flat&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?style=flat&logo=react)](https://reactnative.dev)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%206-2D3748.svg?style=flat&logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Cache%20%26%20Realtime-Redis%207-DC382D.svg?style=flat&logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Sandbox-Dockerode-2496ED.svg?style=flat&logo=docker)](https://www.docker.com)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Monorepo Structure](#-monorepo-structure)
- [Technology Stack](#-technology-stack)
- [Security & Anti-Cheat Architecture](#-security--anti-cheat-architecture)
- [Quick Start & Setup](#-quick-start--setup)
- [Demo Seed Data & Credentials](#-demo-seed-data--credentials)
- [Postman API Collection](#-postman-api-collection)
- [Development & NPM Scripts](#-development--npm-scripts)
- [Build Stages Roadmap](#-build-stages-roadmap)

---

## 🎯 Overview

The **Mobile CTF Platform** bridges the gap between web-centric cybersecurity training platforms (such as Hack The Box, TryHackMe, and PicoCTF) and the native mobile experience. It is engineered from the ground up for high latency tolerance, intermittent network connectivity, and on-device offline problem solving while maintaining uncompromising server-side security.

### Core User Journeys

1. **Players (Mobile App)**: Register and log in, browse categorized challenges, solve problems using an offline cryptography toolkit or spawn isolated in-app Linux terminals, submit flags with instant validation, track live scoreboards, and earn gamified badges.
2. **Organizers & Authors (Admin Dashboard)**: Author challenges with versioning, configure hint penalties, schedule events with multi-condition dynamic unlock rules (time, prerequisites, scores), and broadcast platform announcements.

---

## 🚀 Key Features

### 🛡️ Authoritative Server-Side Scoring & Flag Verification

- **Zero Flag Leakage**: Flags and flag hashes are **never** delivered to clients.
- **Constant-Time Verification**: Server verifies flags against unique per-challenge salted hashes using `crypto.timingSafeEqual` to prevent timing attacks.
- **Scoring Engine**: Dynamically calculates base points minus hint unlock penalties, awards a **10% first-blood bonus** to the fastest solver, and prevents double-scoring via idempotent submission keys.

### 💻 In-App Ephemeral Container Sandbox

- **No Host Shell Access**: Terminal sessions run inside lightweight, hardened Alpine Linux containers (`ctf-sandbox`), never touching the host.
- **Strict Isolation Posture**:
  - Unprivileged non-root user (`ctf:ctf`, UID 10001).
  - Dropped Linux capabilities (`--cap-drop ALL`, `no-new-privileges`).
  - Completely isolated network (`--network none`).
  - Read-only root filesystem with `noexec` in-memory `tmpfs` mounts.
  - Hard resource limits: 64 MB RAM, 0.5 vCPU, max 64 PIDs, max 64 open file descriptors.
  - Auto-expiring sessions (30 min default TTL) with quota controls (max 2 active sessions per user).
- **Bidirectional WebSocket I/O**: Real-time terminal streams via Socket.IO `/terminal` namespace with server-side ANSI sanitization.

### 📊 Real-Time Multi-Scope Leaderboards

- **Redis ZSET State**: Ultra-fast rank calculations and point aggregation across three distinct scopes:
  - **Global**: Authoritative lifetime score derived from database solves.
  - **Daily**: Rolling point accumulation for the current UTC day.
  - **Weekly**: Rolling point accumulation starting Monday 00:00 UTC.
- **Live Push Updates**: Authenticated clients subscribed to the `/leaderboard` WebSocket namespace receive instant broadcast events whenever a competitor scores.

### 🏆 Scheduled Events & Dynamic Unlock Rules

- **Event Lifecycle**: Supports `DRAFT`, `SCHEDULED`, `RUNNING`, and `ENDED` states with countdown timers.
- **Dynamic Challenge Gating**: Challenges can be dynamically locked until specific criteria are satisfied:
  - `ALWAYS`: Unlocked from event start.
  - `TIME`: Opens at a future scheduled UTC timestamp.
  - `PREREQUISITE`: Unlocks only after completing specific preceding challenges.
  - `SCORE`: Unlocks once the participant reaches a minimum event point threshold.
- **Event Leaderboards**: Dedicated event-scoped leaderboards with dual toggle views for individual **Participants** and **Teams**.

### 👥 Teams & Competition

- **Team Management**: Form teams (max 5 members), generate 6-character alphanumeric join codes, invite players via 8-character codes, and transfer leadership roles.
- **Shared Solves & Standings**: Teammate solves contribute to team rankings in events.

### 📴 Offline-First Sync & Private Notes

- **Local Scratchpad**: Markdown notes autosaved on device.
- **Conflict-Free Synchronization**: Last-Write-Wins (LWW) conflict resolution algorithm synchronizes notes across devices when connectivity is restored.
- **Offline Submission Queue**: Submits queued flags automatically with idempotency keys when transitioning back online without premature UI solve claims.

### 🧰 Offline Security Toolkit (`@ctf/toolkit`)

Zero-network, pure TypeScript utilities built to execute locally on native devices:

- **Encodings**: Base64, Base64URL, Hex, URL percent-encoding, ROT13, and custom Caesar shift.
- **Ciphers**: Vigenère, repeating-key XOR, and letter/trigram frequency analysis.
- **Hash Identifier**: Heuristic detection across MD5, SHA-1, SHA-256, SHA-512, bcrypt, and Unix shadow hashes.
- **JWT Inspector**: Structural header and payload decoder with token expiration checking (client-side inspection without signature validation).
- **Binary & File Inspection**: Hex dumper (`xxd` style), magic byte file-type sniffer (16 signatures), and JPEG APP1/TIFF EXIF/GPS coordinate parser.

### 🎖️ Bookmarks & Achievements

- Pin challenges to a personal **Bookmarks** tab for rapid offline reference.
- Dynamic achievement engine awarding badges such as `FIRST_BLOOD`, `SPEED_DEMON`, `CURATOR`, `POLYGLOT`, and daily `STREAK` milestones.

---

## 🏛️ System Architecture

```text
               +-------------------------------------------+
               |        Mobile Client (Expo / RN)          |
               |  - TanStack Query     - Zustand Auth/UI   |
               |  - Offline SQLite/MMKV- Offline Toolkit   |
               +---------------------+---------------------+
                                     |
                       HTTPS REST    |    WebSocket (Socket.IO)
                                     v
               +-------------------------------------------+
               |            API Gateway / Express          |
               |  - Helmet / CORS      - Zod Validation    |
               |  - Pino Logger        - Fixed Rate Limit  |
               +---------------------+---------------------+
                                     |
    +--------------------------------+--------------------------------+
    |                                |                                |
    v                                v                                v
+----------------------+  +----------------------+  +----------------------+
|     PostgreSQL 16    |  |       Redis 7        |  | Docker Container Pool|
| (System of Record)   |  | (Cache, Rate Limits, |  | (Ephemeral Non-Root  |
| - Users & Auth       |  |  Leaderboard ZSETs,  |  |  Sandbox Terminal)   |
| - Challenges & Hints |  |  Pub/Sub Relays)     |  | - ctf-sandbox:latest |
| - Submissions & Solves| +----------------------+  | - Bounded WorkerPool |
| - Events & Teams     |                            +----------------------+
| - Notes & Badges     |
+----------------------+
```

---

## 📁 Monorepo Structure

```text
ctf/
├── apps/
│   ├── api/                     # Express 4 + Socket.IO REST/realtime backend
│   │   ├── src/
│   │   │   ├── config/          # Environment configuration & type validation
│   │   │   ├── middleware/      # Auth, RBAC, Redis rate-limiting, error handling
│   │   │   ├── routes/          # API route definitions (auth, challenges, terminal, etc.)
│   │   │   ├── services/        # Core business logic, scoring, and scheduler
│   │   │   │   └── sandbox/     # Dockerode runtime abstraction & WorkerPool
│   │   │   └── websocket/       # Socket.IO handlers for /leaderboard and /terminal
│   │   └── test/                # 135+ integration and unit tests (Vitest + Supertest)
│   ├── mobile/                  # React Native / Expo SDK 57 mobile application
│   │   ├── src/app/             # Expo Router file-based screens (tabs, challenge, auth)
│   │   ├── src/components/      # UI components, offline banner, layout wrappers
│   │   ├── src/services/        # HTTP client, token storage, offline queue, sockets
│   │   └── src/store/           # Zustand state stores (auth, notes)
│   └── admin/                   # React 18 + Vite responsive administration dashboard
│       └── src/                 # Challenge editor, event scheduler, announcements
│
├── packages/
│   ├── shared/                  # Central contract boundary: DTOs, enums, constants, Zod
│   ├── toolkit/                 # Pure offline cryptography & security primitives
│   ├── database/                # Prisma ORM schema, migrations, and seed scripts
│   └── ui/                      # Web UI primitives and shared design tokens
│
├── infrastructure/
│   ├── docker/                  # Production Dockerfile for the API
│   └── sandbox/                 # Alpine sandbox Dockerfile & SECURITY.md sign-off
│
├── api-call.json                # Complete Postman Collection v2.1.0 (ready to import)
├── BUILD_STAGES.md              # 10-Stage sequential implementation plan
├── MEMORY.md                    # Living log of architectural decisions & milestones
├── mobile_CTF.md                # Comprehensive system architecture specification
└── docker-compose.yml           # PostgreSQL + Redis + API local development stack
```

---

## 💻 Technology Stack

| Layer                | Technologies                           | Description                                                   |
| :------------------- | :------------------------------------- | :------------------------------------------------------------ |
| **Monorepo Engine**  | Turborepo, npm workspaces              | Fast task pipeline, incremental builds, shared TS configs     |
| **Mobile Client**    | React Native, Expo SDK 57, Expo Router | iOS/Android native application with file-based routing        |
| **Mobile State**     | Zustand, TanStack Query (React Query)  | Centralized UI state & efficient cached network queries       |
| **Secure Storage**   | `expo-secure-store`                    | Hardware-backed keychain/keystore token storage               |
| **Web Admin**        | React 18, Vite, TypeScript             | Fast admin portal proxying to the backend API                 |
| **Backend API**      | Node.js 22, Express.js 4               | RESTful service with async error handling                     |
| **Realtime**         | Socket.IO                              | Authenticated WebSockets for live leaderboards & terminal I/O |
| **Database**         | PostgreSQL 16, Prisma ORM              | Relational schema with strict cascading and migrations        |
| **In-Memory Store**  | Redis 7 (`ioredis`)                    | ZSET leaderboards, fixed-window rate limiting                 |
| **Terminal Sandbox** | Docker, Dockerode                      | Non-root Alpine containers with zero network access           |
| **Validation**       | Zod                                    | Type-safe runtime schemas across client, server, and shared   |
| **Authentication**   | JWT (HS256) + Opaque Refresh Tokens    | 15-minute access tokens with 7-day revolving refresh tokens   |
| **Testing**          | Vitest, Supertest                      | Fast unit, integration, and container isolation suites        |

---

## 🔒 Security & Anti-Cheat Architecture

1. **Client Never Authoritative**: All point calculations, hint deductions, flag checks, team permissions, and unlock rules are exclusively evaluated on the server.
2. **Flag Cryptography**:
   $$\text{flagHash} = \text{HMAC-SHA256}(\text{salt}, \text{flag})$$
   Flags are stored with unique cryptographically random salts. Guess comparisons use constant-time algorithms (`crypto.timingSafeEqual`) to prevent side-channel timing analysis.
3. **Submission Auditing**: `SubmissionAttempt` records an audit trail containing the SHA-256 hash of every guess without ever saving plaintext attempts.
4. **Rate Limiting**:
   - Authentication: 5 attempts / minute / IP
   - Flag Submissions: 5 attempts / minute / user / challenge
   - General API: 100 requests / minute / user
5. **Sandbox Hardening**: See [infrastructure/sandbox/SECURITY.md](file:///home/jenslin/Developement/ctf/infrastructure/sandbox/SECURITY.md) for the isolation threat model and formal sign-off.

---

## ⚡ Quick Start & Setup

### Prerequisites

- **Node.js**: `v22.x` or higher
- **npm**: `v11.x` or higher
- **Docker & Docker Compose**: Docker 24+ with compose support

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/JENSLINJEMZ/Mobile-CTF.git
cd Mobile-CTF
npm install
```

> **Note on npm 11**: If prompted about blocked build scripts for esbuild or Prisma, run:
>
> ```bash
> npm install-scripts approve
> ```

### 2. Launch Local Infrastructure

Start PostgreSQL, Redis, and the backend service:

```bash
docker compose up -d
```

Verify all services are up and healthy:

```bash
curl http://localhost:4000/api/ready
# {"status":"ready","dependencies":{"postgres":{"status":"up"},"redis":{"status":"up"},"sandbox":{"status":"up"}}}
```

### 3. Apply Database Migrations & Seed Data

```bash
npm run db:deploy
npm run db:seed
```

### 4. Build Sandbox Container Image

The terminal sandbox requires the `ctf-sandbox:latest` image:

```bash
docker build -t ctf-sandbox:latest infrastructure/sandbox
```

### 5. Launch Development Applications

Run all apps in parallel using Turborepo:

```bash
npm run dev
```

Or start individual services independently:

- **API Server**: `npm run dev --workspace=@ctf/api` (runs on `http://localhost:4000`)
- **Admin Dashboard**: `npm run dev --workspace=@ctf/admin` (runs on `http://localhost:5173`)
- **Mobile Web Preview**: `npm run web --workspace=@ctf/mobile` (runs on `http://localhost:8081`)

---

## 🔑 Demo Seed Data & Credentials

The seed script creates initial demonstration accounts, challenges, teams, and events:

### Pre-Configured Accounts

| Role       | Email            | Username  | Password     |
| :--------- | :--------------- | :-------- | :----------- |
| **Admin**  | `admin@ctf.test` | `admin`   | `ctfpass123` |
| **Player** | `user@ctf.test`  | `player1` | `ctfpass123` |

### Seeded Challenges

| Title                     | Category         | Difficulty | Base Pts | Flag                                     |
| :------------------------ | :--------------- | :--------- | :------- | :--------------------------------------- |
| **Caesar's Secret**       | Cryptography     | `EASY`     | 100      | `ctf{caesar_would_be_proud}`             |
| **XOR Marks the Spot**    | Cryptography     | `MEDIUM`   | 200      | `ctf{not_so_simple_xor}`                 |
| **Stolen SQL**            | Web Exploitation | `EASY`     | 150      | `ctf{union_select_from_users}`           |
| **Cookie Jar**            | Web Exploitation | `MEDIUM`   | 250      | `ctf{cookies_are_secrets_too}`           |
| **Hidden in the Noise**   | Forensics        | `EASY`     | 100      | `ctf{lsb_stego_rocks}`                   |
| **LogSweep**              | Forensics        | `MEDIUM`   | 200      | `ctf{credentials_in_the_logs}`           |
| **Crack the Binary Chef** | Reversing        | `HARD`     | 400      | `ctf{strings_are_the_low_hanging_fruit}` |
| **Photo Geek**            | OSINT            | `MEDIUM`   | 150      | `ctf{san_francisco}`                     |

### Seeded Competitions & Teams

- **Live Event**: `CTF Summer Sprint` (status: `RUNNING`)
- **Default Team**: `Demo Squad` (Join Code: `DEMO01`)

---

## 📬 Postman API Collection

A fully configured Postman collection is maintained at the root of the project:
[`api-call.json`](file:///home/jenslin/Developement/ctf/api-call.json)

### How to Import & Use:

1. Open Postman -> Click **Import** -> Select [`api-call.json`](file:///home/jenslin/Developement/ctf/api-call.json).
2. Run **2. Authentication -> Login (Player)**. The built-in test script automatically stores `accessToken` and `refreshToken` in collection variables.
3. Run **2. Authentication -> Login (Admin)** to populate `adminAccessToken`.
4. All 67 requests across all 12 modules (Challenges, Sandbox, Events, Teams, Leaderboard, Notes, etc.) will authenticate automatically.

---

## 🛠️ Development & NPM Scripts

| Command             | Action                                                          |
| :------------------ | :-------------------------------------------------------------- |
| `npm run dev`       | Start development servers concurrently across all workspaces    |
| `npm run build`     | Build all production bundles (API via `tsup`, Admin via `vite`) |
| `npm run typecheck` | Run `tsc --noEmit` across all 7 packages and apps               |
| `npm run lint`      | Run ESLint flat config checks                                   |
| `npm test`          | Run complete test suites (135+ API tests + 63 toolkit tests)    |
| `npm run db:deploy` | Apply pending Prisma migrations to PostgreSQL                   |
| `npm run db:seed`   | Populate database with demo users, challenges, and events       |
| `npm run format`    | Auto-format codebase using Prettier                             |

---

## 🗺️ Build Stages Roadmap

The platform follows a strict 10-stage milestone roadmap per [`BUILD_STAGES.md`](file:///home/jenslin/Developement/ctf/BUILD_STAGES.md):

- [x] **Stage 1: Foundations & Infrastructure** (Monorepo, Compose, Prisma v1, Express scaffold, Expo shell)
- [x] **Stage 2: Authentication & Users** (JWT rotation, bcrypt, Redis rate limiter, SecureStore)
- [x] **Stage 3: Core CTF Challenges** (Constant-time flag verification, hint penalties, first-blood bonus)
- [x] **Stage 4: Leaderboard & Realtime** (Redis ZSET global/daily/weekly, Socket.IO live updates)
- [x] **Stage 5: Offline Toolkit** (Pure cryptographic & encoding algorithms, EXIF parser)
- [x] **Stage 6: Terminal & Sandbox** (Ephemeral non-root Docker containers, WebSocket relay)
- [x] **Stage 7: Events, Teams & Competition** (Dynamic unlock rules: TIME/PREREQUISITE/SCORE, team codes)
- [x] **Stage 8: Offline & Sync** (Last-Write-Wins notes sync, bookmarks, achievement engine)
- [ ] **Stage 9: Admin Dashboard & File Service** (S3-compatible signed URLs, full admin audit log)
- [ ] **Stage 10: Notifications & Release Polish** (Push notifications, Expo EAS binary build pipeline)

---

## 📄 License

This repository is maintained as an engineering reference implementation. All seed challenge materials, payloads, and scenarios are benign and intended strictly for educational purposes.
