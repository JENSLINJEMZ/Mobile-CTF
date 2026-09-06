# Mobile CTF Platform — Software Architecture & Engineering Documentation

**Document type:** Internal Engineering Reference
**Version:** 1.0 (Baseline)
**Status:** Approved specification, phased implementation in progress
**Owner:** Engineering — Architecture Function
**Audience:** All engineering, QA, security, and DevOps staff; new-hire onboarding

> **How to read this document:** Every technical claim in this document is tagged so readers know whether it reflects work that is already specified/underway, or a suggestion for the architecture review board.
>
> - 🔵 **CURRENT** — part of the approved product/engineering specification that the team is building against.
> - 🟢 **RECOMMENDED** — a proposed improvement or supporting practice that is **not** yet part of the committed scope, offered for review.
>
> Nothing in this document invents new product features. Where the source specification already names a future direction (e.g., moving the sandbox runtime to Kubernetes), that is called out as a **planned evolution**, not a new invention.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [System Architecture](#4-system-architecture)
5. [Architecture Diagrams](#5-architecture-diagrams)
6. [Mobile Engineering Team](#6-mobile-engineering-team)
7. [Frontend (Admin Web) Team](#7-frontend-admin-web-team)
8. [Backend Engineering Team](#8-backend-engineering-team)
9. [Database & DevOps Team](#9-database--devops-team)
10. [QA & Security Team](#10-qa--security-team)
11. [Employee Work Allocation](#11-employee-work-allocation)
12. [Feature Ownership Matrix](#12-feature-ownership-matrix)
13. [Team Dependency Matrix](#13-team-dependency-matrix)
14. [Development Workflow](#14-development-workflow)
15. [Git & Branching Strategy](#15-git--branching-strategy)
16. [Sprint Planning](#16-sprint-planning)
17. [Testing Strategy](#17-testing-strategy)
18. [Deployment Strategy](#18-deployment-strategy)
19. [Security Architecture](#19-security-architecture)
20. [New Employee Onboarding Guide](#20-new-employee-onboarding-guide)

- [Appendix A — Environment Configuration Reference](#appendix-a--environment-configuration-reference)
- [Appendix B — Glossary](#appendix-b--glossary)

---

## 1. Project Overview

The Mobile CTF Platform is a mobile-first **Capture The Flag (CTF) learning and competition product** for iOS and Android, positioned as a native-mobile equivalent of the established web CTF platforms (Hack The Box, TryHackMe, PicoCTF), combined with a companion web **Admin Dashboard** for challenge authors and organizers.

**Core user journey (🔵 CURRENT):** a user registers, browses categorized security challenges, reads a challenge brief, uses either an offline toolkit or a sandboxed in-app terminal to work the problem, submits a flag, and receives server-validated scoring, achievements, and live leaderboard movement — with the same experience continuing offline and syncing once connectivity returns.

**Administrator journey (🔵 CURRENT):** challenge authors and organizers create/version challenges, configure flags/hints/scoring, schedule events with dynamic unlock rules, and monitor submissions, anti-cheat signals, and system health from a web dashboard.

**Product goals, in priority order (per source specification §84):**

1. Security (flag integrity, sandbox isolation, authoritative server state)
2. Working end-to-end functionality over superficial screens
3. Mobile UX quality
4. Clean, extensible architecture
5. Performance on mobile networks
6. Visual polish
7. Extensibility (feature flags, sandbox runtime swap-out)
8. Testing
9. Documentation

**Explicit safety boundary (🔵 CURRENT, non-negotiable):** all seed content is benign and fictional. The platform must never ship malware, credential-theft mechanics, destructive payloads, or real-world exploitation content, and terminal sessions must never expose a real host shell. This boundary is treated as a hard product constraint, not a "nice to have," and is referenced throughout the Security section below.

---

## 2. Technology Stack

### 2.1 Mobile Application

| Layer              | Technology                                      | Purpose                                            | Status                            |
| ------------------ | ----------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| Framework          | React Native + Expo (Expo Router)               | Cross-platform iOS/Android app, file-based routing | 🔵 CURRENT                        |
| Language           | TypeScript (strict)                             | Type safety across the app                         | 🔵 CURRENT                        |
| Server state       | TanStack Query (React Query)                    | Data fetching, caching, retries                    | 🔵 CURRENT                        |
| Client state       | Zustand                                         | Local/UI application state                         | 🔵 CURRENT                        |
| UI kit             | React Native Paper or lightweight custom system | Base component primitives                          | 🔵 CURRENT                        |
| Motion             | React Native Reanimated + Gesture Handler       | Micro-interactions, transitions                    | 🔵 CURRENT                        |
| Local storage      | AsyncStorage / MMKV                             | Non-sensitive cache (challenges, toolkit history)  | 🔵 CURRENT                        |
| Secure storage     | Expo SecureStore                                | Access/refresh tokens only                         | 🔵 CURRENT                        |
| Notifications      | Expo Notifications                              | Push notifications                                 | 🔵 CURRENT                        |
| Filesystem         | Expo FileSystem                                 | Attachment download/cache                          | 🔵 CURRENT                        |
| Connectivity       | Expo Network                                    | Online/offline detection                           | 🔵 CURRENT                        |
| Embedded web       | WebView                                         | Terminal (if xterm.js route is chosen)             | 🔵 CURRENT                        |
| Content rendering  | Markdown renderer                               | Challenge descriptions, write-ups                  | 🔵 CURRENT                        |
| Charts             | SVG/chart library                               | Profile analytics, radar/points charts             | 🔵 CURRENT                        |
| Mobile E2E testing | —                                               | Automated on-device regression                     | 🟢 RECOMMENDED (Detox or Maestro) |

### 2.2 Backend

| Layer                 | Technology                     | Purpose                                                | Status                                      |
| --------------------- | ------------------------------ | ------------------------------------------------------ | ------------------------------------------- |
| Runtime               | Node.js + TypeScript           | API runtime                                            | 🔵 CURRENT                                  |
| Web framework         | Express.js                     | HTTP API layer                                         | 🔵 CURRENT                                  |
| ORM                   | Prisma                         | Type-safe PostgreSQL access                            | 🔵 CURRENT                                  |
| Primary database      | PostgreSQL                     | System of record                                       | 🔵 CURRENT                                  |
| Cache / rate limiting | Redis                          | Leaderboard cache, rate limits, ephemeral session data | 🔵 CURRENT                                  |
| Realtime              | Socket.IO (WebSockets)         | Leaderboard updates, terminal I/O, notifications       | 🔵 CURRENT                                  |
| AuthN                 | JWT (access + refresh)         | Stateless authentication                               | 🔵 CURRENT                                  |
| Password hashing      | Argon2 or bcrypt               | Credential storage                                     | 🔵 CURRENT                                  |
| Validation            | Zod                            | Request/DTO validation                                 | 🔵 CURRENT                                  |
| Hardening             | Helmet, CORS                   | HTTP security headers, origin control                  | 🔵 CURRENT                                  |
| Logging               | Structured logging (JSON)      | Observability, audit trail                             | 🔵 CURRENT                                  |
| Error tracking        | —                              | Centralized exception capture                          | 🟢 RECOMMENDED (e.g., Sentry)               |
| Metrics/monitoring    | —                              | Dashboards & alerting on `/metrics`                    | 🟢 RECOMMENDED (e.g., Prometheus + Grafana) |
| API documentation     | OpenAPI, served at `/api/docs` | Contract-first API docs                                | 🔵 CURRENT                                  |

### 2.3 Admin Web Dashboard

| Layer      | Technology                                              | Purpose                                    | Status     |
| ---------- | ------------------------------------------------------- | ------------------------------------------ | ---------- |
| Framework  | Responsive web app (shares `packages/ui` design tokens) | Challenge authoring, analytics, moderation | 🔵 CURRENT |
| Data layer | Same REST/WebSocket API as mobile                       | Single source of truth                     | 🔵 CURRENT |
| Charts     | Submission/solve analytics                              | Admin insight                              | 🔵 CURRENT |

### 2.4 Sandbox / Container Infrastructure

| Layer                    | Technology                                                | Purpose                                    | Status                                                                                                 |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Local/dev runtime        | Docker                                                    | Ephemeral per-session containers           | 🔵 CURRENT                                                                                             |
| Scheduler abstraction    | Sandbox API → Scheduler → Worker Pool → Container Runtime | Decouples app from runtime specifics       | 🔵 CURRENT                                                                                             |
| Production-scale runtime | —                                                         | Higher-density, better-isolated scheduling | 🟢 PLANNED EVOLUTION (per source spec §74: Kubernetes, with Firecracker/gVisor for stronger isolation) |

### 2.5 Repository, Tooling & Infrastructure

| Layer                             | Technology                                             | Purpose                                        | Status                                                       |
| --------------------------------- | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| Monorepo tooling                  | Turborepo (`turbo.json`) + npm workspaces              | Shared builds across `apps/*` and `packages/*` | 🔵 CURRENT                                                   |
| Local infra                       | Docker Compose (Postgres, Redis, API, sandbox mock)    | One-command dev environment                    | 🔵 CURRENT                                                   |
| Reverse proxy                     | Nginx                                                  | TLS termination, routing                       | 🔵 CURRENT                                                   |
| Object storage                    | S3-compatible object storage                           | Attachments, avatars                           | 🔵 CURRENT                                                   |
| Mobile release                    | Expo EAS (development / preview / production channels) | Build & distribute mobile binaries             | 🔵 CURRENT                                                   |
| Linting/formatting                | ESLint, Prettier                                       | Code consistency                               | 🔵 CURRENT                                                   |
| CI/CD pipeline                    | —                                                      | Automated lint/test/build/deploy gates         | 🟢 RECOMMENDED (e.g., GitHub Actions)                        |
| Secrets management                | `.env` files (local only, never committed)             | Configuration                                  | 🔵 CURRENT (dev)                                             |
| Secrets management (staging/prod) | —                                                      | Centralized secret storage & rotation          | 🟢 RECOMMENDED (e.g., Doppler / AWS Secrets Manager / Vault) |
| Dependency & secret scanning      | —                                                      | Supply-chain and leaked-credential detection   | 🟢 RECOMMENDED (e.g., Dependabot/Snyk + gitleaks in CI)      |

---

## 3. Project Structure

The project is a **monorepo** (🔵 CURRENT). Below is the folder structure as specified, annotated with the primary owning team for each area.

```text
ctf-platform/
├── apps/
│   ├── mobile/                # Owned by: Mobile Team
│   │   ├── app/                #   Expo Router screens
│   │   │   ├── (tabs)/         #     Challenges, Terminal, Leaderboard, Toolkit, Profile
│   │   │   ├── challenge/[id].tsx
│   │   │   ├── event/[id].tsx
│   │   │   ├── auth/
│   │   │   └── settings/
│   │   ├── components/         #   Reusable UI components
│   │   ├── features/            #   Feature-scoped logic (challenges, terminal, toolkit…)
│   │   ├── hooks/                #   Shared React hooks
│   │   ├── services/             #   API clients, WebSocket clients
│   │   ├── store/                #   Zustand stores
│   │   ├── utils/, constants/, assets/
│   │
│   ├── api/                    # Owned by: Backend Team
│   │   └── src/
│   │       ├── controllers/      #   Route handlers (thin — delegate to services)
│   │       ├── routes/           #   Express route definitions
│   │       ├── services/         #   Business logic (auth, scoring, terminal, etc.)
│   │       ├── middleware/       #   Auth, rate limiting, error handling
│   │       ├── validators/       #   Zod schemas
│   │       ├── websocket/        #   Socket.IO namespaces/handlers
│   │       ├── jobs/             #   Background/scheduled jobs
│   │       ├── utils/
│   │       └── server.ts
│   │
│   └── admin/                  # Owned by: Frontend (Admin) Team
│       └── ...                   #   Challenge editor, analytics, user/team/event mgmt
│
├── packages/
│   ├── database/                # Owned by: Database/DevOps Team
│   │   ├── prisma/                #   schema.prisma, migrations/
│   │   └── seed/                  #   Seed scripts (demo users, 8 challenges, events)
│   │
│   ├── shared/                  # Owned by: Backend Team (contract owner), consumed by all
│   │   ├── types/                 #   Shared TS types (DTOs, enums)
│   │   ├── constants/
│   │   └── validation/            #   Shared Zod schemas
│   │
│   └── ui/                      # Owned by: Frontend (Admin) Team, consumed by Mobile for parity
│
├── infrastructure/              # Owned by: Database/DevOps Team
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   └── deployment/
│
├── docs/                        # Owned by: all teams (each owns their doc)
│   ├── architecture.md, api.md, security.md, sandbox.md, deployment.md
│
├── docker-compose.yml
├── package.json / turbo.json
└── .env.example
```

**Why this structure matters:**

- `apps/*` are independently deployable/runnable products; `packages/*` are shared libraries with no product-specific logic.
- `packages/shared` is the **contract boundary** — mobile, admin, and API all import types/validation from here, so a DTO change is a single-source edit, not three.
- Business logic lives in `apps/api/src/services`, **not** in controllers or React components (see [§21 Coding Standards](#14-development-workflow)), which keeps logic testable and UI-agnostic.

---

## 4. System Architecture

**High-level flow (🔵 CURRENT):**

```text
Mobile App / Admin Dashboard
        |
        | HTTPS (REST) + WebSocket
        |
API Gateway / Express
        |
        +---- Auth Service
        +---- Challenge Service
        +---- Submission Service
        +---- Leaderboard Service
        +---- Event Service
        +---- User/Team Service
        +---- Notification Service
        +---- File Service
        +---- Terminal Session Service
        |
        +---- PostgreSQL   (system of record)
        +---- Redis        (cache, rate limits, pub/sub for live updates)
        +---- Object Storage (attachments, avatars)
        |
        +---- Container Sandbox Infrastructure (terminal sessions only)
```

**Key architectural rules (🔵 CURRENT, non-negotiable per source spec §72):**

- The **client is never authoritative** for scores, ranks, challenge completion, flag correctness, hint eligibility, or permissions. All of this is computed and validated server-side.
- **Flags are never sent to the client.** Only salted hashes exist server-side; verification is constant-time.
- **Terminal sessions never touch a host shell.** Every session is an isolated, resource-limited, non-root, auto-expiring container reachable only through the authenticated Terminal Gateway.
- **WebSocket connections are authenticated** — no anonymous socket can subscribe to leaderboard or terminal channels.
- **Offline actions are provisional.** A flag submitted offline is queued and only counts once the server validates it; the UI must never claim a solve happened before that validation.

**Service responsibilities:**

| Service                  | Responsibility                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| Auth Service             | Registration, login, JWT issuance/rotation, password reset, session invalidation                         |
| Challenge Service        | Challenge CRUD (admin), listing/detail (client), category/difficulty metadata, dynamic unlock evaluation |
| Submission Service       | Flag verification, scoring, first-blood bonuses, rate limiting, anti-cheat hooks, audit logging          |
| Leaderboard Service      | Global/event/team/daily/weekly rankings, Redis-backed live updates, WS broadcast                         |
| Event Service            | Event lifecycle, registration, schedules, event-scoped leaderboards                                      |
| User/Team Service        | Profiles, stats, teams, team membership, RBAC roles                                                      |
| Notification Service     | Push notification dispatch, preferences                                                                  |
| File Service             | Attachment upload/validation, signed download URLs                                                       |
| Terminal Session Service | Session creation/teardown, Sandbox Scheduler integration, WS I/O relay                                   |

---

## 5. Architecture Diagrams

### 5.1 System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        MOB["Mobile App<br/>Expo / React Native"]
        ADM["Admin Dashboard<br/>Web"]
    end

    subgraph "Edge"
        GW["API Gateway / Express"]
        WS["WebSocket Gateway<br/>Socket.IO"]
    end

    subgraph "Application Services"
        AUTH["Auth Service"]
        CHAL["Challenge Service"]
        SUB["Submission Service"]
        LEAD["Leaderboard Service"]
        EVT["Event Service"]
        TEAM["User / Team Service"]
        NOTIF["Notification Service"]
        FILE["File Service"]
        TERM["Terminal Session Service"]
    end

    subgraph "Data Layer"
        PG[("PostgreSQL")]
        REDIS[("Redis")]
        OBJ[("Object Storage")]
    end

    subgraph "Sandbox Infrastructure"
        SCHED["Sandbox Scheduler"]
        CONT["Ephemeral Containers"]
    end

    MOB -- HTTPS --> GW
    MOB -- WebSocket --> WS
    ADM -- HTTPS --> GW

    GW --> AUTH
    GW --> CHAL
    GW --> SUB
    GW --> LEAD
    GW --> EVT
    GW --> TEAM
    GW --> NOTIF
    GW --> FILE
    WS --> TERM
    WS --> LEAD

    AUTH --> PG
    AUTH --> REDIS
    CHAL --> PG
    SUB --> PG
    SUB --> REDIS
    LEAD --> REDIS
    LEAD --> PG
    EVT --> PG
    TEAM --> PG
    NOTIF --> PG
    NOTIF --> REDIS
    FILE --> OBJ
    TERM --> SCHED
    SCHED --> CONT
```

### 5.2 Flag Submission — Sequence Diagram

```mermaid
sequenceDiagram
    participant U as Mobile App
    participant GW as API Gateway
    participant RL as Redis (Rate Limit)
    participant SUB as Submission Service
    participant DB as PostgreSQL
    participant LB as Leaderboard Service
    participant WS as WebSocket Gateway

    U->>GW: POST /api/challenges/:id/submissions {flag}
    GW->>RL: Check submission rate limit
    RL-->>GW: Allowed
    GW->>SUB: Validate flag (server-side only)
    SUB->>DB: Compare against salted hash (constant-time)
    DB-->>SUB: Match result
    SUB->>DB: Record submission + audit log entry
    alt Correct flag
        SUB->>DB: Award points, evaluate first-blood bonus
        SUB->>LB: Update leaderboard cache
        LB->>WS: Broadcast leaderboard:update
        WS-->>U: Live rank change
        SUB-->>GW: 200 { correct: true, pointsAwarded, newTotal, rank }
    else Incorrect flag
        SUB-->>GW: 200 { correct: false, message }
    end
    GW-->>U: Response
```

### 5.3 Terminal / Sandbox Session Flow

```mermaid
graph LR
    A["User taps Open Terminal"] --> B["Mobile app requests session"]
    B --> C["POST /api/terminal/sessions"]
    C --> D["Terminal Gateway<br/>authenticated WebSocket"]
    D --> E["Sandbox Scheduler"]
    E --> F["Ephemeral Container<br/>non-root, resource-limited,<br/>no host mounts, no privileged mode"]
    F -- stdout / stderr --> D
    D -- terminal:output --> B
    G["Session timeout OR<br/>user closes session"] --> H["Container destroyed"]
    F --> G
```

### 5.4 Offline-First Sync Flow

```mermaid
graph LR
    A["User submits flag while offline"] --> B["Stored in local Sync Queue<br/>AsyncStorage / MMKV"]
    B --> C{"Connectivity restored?"}
    C -- No --> B
    C -- Yes --> D["Queued items sent to API"]
    D --> E["Server-side validation<br/>authoritative source of truth"]
    E --> F["Score / achievement state updated"]
    F --> G["Mobile app syncs local cache<br/>and clears queue item"]
```

### 5.5 Simplified Data Model (Entity Relationships)

```mermaid
erDiagram
    USER ||--o{ SUBMISSION : makes
    USER ||--o{ USERNOTE : writes
    USER ||--o{ USERACHIEVEMENT : earns
    USER ||--o{ BOOKMARK : saves
    USER ||--o{ TERMINALSESSION : opens
    USER }o--o{ TEAM : "member of (via TeamMember)"
    CHALLENGE ||--o{ HINT : has
    CHALLENGE ||--o{ ATTACHMENT : has
    CHALLENGE ||--o{ SUBMISSION : receives
    CHALLENGE ||--o{ CHALLENGEVERSION : has
    CHALLENGE }o--o{ CHALLENGETAG : tagged_with
    EVENT ||--o{ EVENTPARTICIPANT : has
    EVENT ||--o{ EVENTTEAM : has
    EVENT }o--o{ CHALLENGE : includes
    ACHIEVEMENT ||--o{ USERACHIEVEMENT : unlocked_by
    TEAM ||--o{ COLLECTION : "may own"
```

_(Full field-level schema lives in `packages/database/prisma/schema.prisma` — see §39–40 of the source specification for the complete model list: `User, Session, Team, TeamMember, Challenge, ChallengeCategory, ChallengeTag, ChallengeVersion, Hint, Attachment, Submission, SubmissionAttempt, Event, EventParticipant, EventTeam, Achievement, UserAchievement, Bookmark, Collection, CollectionItem, UserNote, TerminalSession, Notification, NotificationPreference, LeaderboardSnapshot, AuditLog`.)_

---

## 6. Mobile Engineering Team

**Mission:** deliver the primary user-facing product — a fast, offline-capable, thumb-friendly Expo app implementing the full challenge → toolkit/terminal → submission → progress loop.

| Team   | Employee / Role                            | Responsibility                                                                             | Files / Folders                                                                 | Deliverables                                  |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------- |
| Mobile | Mobile Tech Lead                           | App shell, navigation architecture, design-system integration, PR review                   | `apps/mobile/app`, `apps/mobile/store`                                          | Approved app architecture; reviewed PRs       |
| Mobile | Mobile Engineer — Auth & Profile           | Register/login/logout, SecureStore token handling, profile/stats/badges screen             | `apps/mobile/app/auth`, `app/(tabs)/profile.tsx`, `services/auth.ts`            | Working auth flow; profile screen with stats  |
| Mobile | Mobile Engineer — Challenges & Leaderboard | Challenge browser (filters/search), challenge detail, flag submission UI, live leaderboard | `app/(tabs)/challenges.tsx`, `challenge/[id].tsx`, `app/(tabs)/leaderboard.tsx` | Functional browse → detail → submit flow      |
| Mobile | Mobile Engineer — Toolkit & Terminal       | Offline toolkit (encoding/crypto/hash/JWT/file tools), terminal UI, WebSocket client       | `app/(tabs)/toolkit.tsx`, `app/(tabs)/terminal.tsx`                             | Working toolkit + terminal session UI         |
| Mobile | Mobile Engineer — Offline & Notifications  | AsyncStorage/MMKV caching, sync queue, connectivity status UI, push notifications          | `hooks/`, `services/sync.ts`, `services/notifications.ts`                       | Offline-first behavior; notification handling |

**Boundaries:** the Mobile team never implements flag verification, scoring, or permission logic client-side — it only renders server-provided state and queues actions for server validation.

---

## 7. Frontend (Admin Web) Team

**Mission:** give challenge authors, organizers, and moderators a reliable web dashboard for content creation, event operations, and analytics.

| Team             | Employee / Role                            | Responsibility                                                                                        | Files / Folders                                      | Deliverables                                    |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Frontend (Admin) | Frontend Lead                              | Admin app architecture, shared component library, RBAC-aware routing                                  | `apps/admin`, `packages/ui`                          | Admin app shell; shared UI package              |
| Frontend (Admin) | Frontend Engineer — Challenge Editor       | Challenge authoring (Markdown editor, flag/hint config, attachment upload, versioning, publish/draft) | `apps/admin/.../challenges`                          | Working challenge CRUD + version history UI     |
| Frontend (Admin) | Frontend Engineer — Analytics & Users      | Submission analytics dashboards, user/team management screens                                         | `apps/admin/.../analytics`, `.../users`, `.../teams` | Analytics charts; RBAC-gated user/team admin UI |
| Frontend (Admin) | Frontend Engineer — Events & Announcements | Event creation/scheduling, dynamic unlock rule configuration, announcements                           | `apps/admin/.../events`                              | Event authoring UI with unlock rules            |

**Boundaries:** the Admin team shares the exact same API contracts as Mobile (via `packages/shared`) — no parallel/duplicate endpoints are created for admin-only needs without Backend Team sign-off.

---

## 8. Backend Engineering Team

**Mission:** own the authoritative business logic, data integrity, and real-time infrastructure that both client apps depend on.

| Team    | Employee / Role                               | Responsibility                                                                                  | Files / Folders                                                       | Deliverables                                         |
| ------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| Backend | Backend Tech Lead / Architect                 | API gateway design, service boundaries, WebSocket architecture, API contract ownership          | `apps/api/src`, `packages/shared`                                     | Architecture & API contract docs; PR review          |
| Backend | Backend Engineer — Auth & RBAC                | Registration/login, JWT + refresh rotation, password reset, RBAC roles/permissions              | `controllers/auth`, `services/auth`, `middleware/rbac.ts`             | Auth endpoints; role/permission enforcement          |
| Backend | Backend Engineer — Challenges & Submissions   | Challenge CRUD, hint unlocking, flag verification, scoring, first-blood logic, anti-cheat hooks | `controllers/challenges`, `services/scoring`, `services/anticheat`    | Submission API + scoring engine                      |
| Backend | Backend Engineer — Leaderboard & Events       | Leaderboard computation (Redis), event lifecycle, dynamic unlock evaluation, WS broadcast       | `services/leaderboard`, `services/events`, `websocket/leaderboard.ts` | Live leaderboard; event engine                       |
| Backend | Backend Engineer — Terminal & Sandbox Gateway | Terminal session lifecycle, Sandbox API client, WS I/O relay                                    | `services/terminal`, `websocket/terminal.ts`                          | Terminal gateway integrated with sandbox abstraction |
| Backend | Backend Engineer — Notifications & Files      | Push dispatch, notification preferences, attachment upload/signed URLs                          | `services/notifications`, `services/files`                            | Notification pipeline; secure file service           |

**Boundaries:** controllers stay thin (routing + validation only); all business logic lives in `services/`, per the coding standard in §21 of the source specification (no DB queries in route handlers, no business logic in React components).

---

## 9. Database & DevOps Team

**Mission:** own the data model, local/staging/production environments, sandbox infrastructure, and system observability.

| Team            | Employee / Role                 | Responsibility                                                  | Files / Folders                                      | Deliverables                                    |
| --------------- | ------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Database/DevOps | Platform Lead                   | CI/CD, environment strategy, infra-as-code, release process     | `infrastructure/`, `docker-compose.yml`              | CI/CD pipelines; environment runbooks           |
| Database/DevOps | Database Engineer               | Prisma schema design, migrations, indexing, seed scripts        | `packages/database/prisma`, `packages/database/seed` | Reviewed schema + migrations; working `db:seed` |
| Database/DevOps | DevOps Engineer — Sandbox Infra | Sandbox Scheduler, container runtime hardening, resource quotas | `infrastructure/docker`, sandbox service             | Isolated, auto-expiring container runtime       |
| Database/DevOps | SRE / Observability Engineer    | Structured logging, `/health` `/ready` `/metrics`, alerting     | `infrastructure/monitoring`                          | Observability stack; on-call runbook            |

**Boundaries:** this team is the only team permitted to modify production infrastructure and database migration tooling directly; all other teams request schema changes via PR against `packages/database/prisma`.

---

## 10. QA & Security Team

**Mission:** independently verify correctness and safety across mobile, backend, and admin — with particular focus on the areas the source spec flags as security-critical (flag integrity, sandbox isolation, anti-cheat, RBAC).

| Team        | Employee / Role              | Responsibility                                                                        | Files / Folders                          | Deliverables                                |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| QA/Security | QA Lead                      | Test strategy, end-to-end coverage plan, release sign-off                             | `apps/**/tests`, `docs/`                 | Test plans; go/no-go release recommendation |
| QA/Security | QA Engineer — Backend/API    | API and integration test suites                                                       | `apps/api/**/*.test.ts`                  | Passing API/integration test suite          |
| QA/Security | QA Engineer — Mobile         | Mobile component and flow tests                                                       | `apps/mobile/**/*.test.tsx`              | Passing mobile test suite                   |
| QA/Security | Security Engineer — Platform | Threat modeling, sandbox escape testing, anti-cheat rule validation, audit log review | `docs/security.md`, `services/anticheat` | Security review sign-off per release        |
| QA/Security | Security Engineer — AppSec   | Dependency/secret scanning, upload validation review, rate-limit verification         | CI security gates                        | Vulnerability & scan reports                |

**Boundaries:** QA/Security has veto authority on release for anything touching authentication, flag verification, sandbox isolation, or RBAC — these changes require an explicit security sign-off in addition to normal code review.

---

## 11. Employee Work Allocation

### 11.1 Team Structure (Org View)

```mermaid
graph TB
    EM["Engineering Manager"]
    EM --> MTL["Mobile Tech Lead"]
    EM --> FTL["Frontend (Admin) Lead"]
    EM --> BTL["Backend Tech Lead"]
    EM --> PTL["Platform Lead (DB/DevOps)"]
    EM --> QTL["QA Lead"]
    EM --> SEC["Security Engineer (dotted-line to all teams)"]

    MTL --> M1["Mobile Eng — Auth/Profile"]
    MTL --> M2["Mobile Eng — Challenges/Leaderboard"]
    MTL --> M3["Mobile Eng — Toolkit/Terminal"]
    MTL --> M4["Mobile Eng — Offline/Notifications"]

    FTL --> F1["Frontend Eng — Challenge Editor"]
    FTL --> F2["Frontend Eng — Analytics/Users"]
    FTL --> F3["Frontend Eng — Events/Announcements"]

    BTL --> B1["Backend Eng — Auth/RBAC"]
    BTL --> B2["Backend Eng — Challenges/Submissions"]
    BTL --> B3["Backend Eng — Leaderboard/Events"]
    BTL --> B4["Backend Eng — Terminal/Sandbox"]
    BTL --> B5["Backend Eng — Notifications/Files"]

    PTL --> D1["Database Engineer"]
    PTL --> D2["DevOps Eng — Sandbox Infra"]
    PTL --> D3["SRE / Observability"]

    QTL --> Q1["QA Eng — Backend/API"]
    QTL --> Q2["QA Eng — Mobile"]
```

_Team of ~20 engineers total: 4 Mobile, 3 Frontend/Admin, 6 Backend, 3 Database/DevOps, 3 QA/Security, plus leads. Scale up or down proportionally for your actual headcount._

### 11.2 Task Allocation by Phase

#### Phase 1 — Foundation (see Sprint Plan §16)

| Task                                                    | Owner Team       | Assigned Role             | Deliverable                             |
| ------------------------------------------------------- | ---------------- | ------------------------- | --------------------------------------- |
| Scaffold monorepo (Turborepo, workspaces, `turbo.json`) | Database/DevOps  | Platform Lead             | Buildable monorepo                      |
| `docker-compose.yml` for Postgres/Redis/API             | Database/DevOps  | Platform Lead             | `docker compose up` starts full backend |
| Prisma schema v1 (User, Session, base models)           | Database/DevOps  | Database Engineer         | Initial migration                       |
| Expo app scaffold + navigation shell                    | Mobile           | Mobile Tech Lead          | Bottom-tab nav working                  |
| Express server scaffold, middleware stack               | Backend          | Backend Tech Lead         | Helmet/CORS/error handler wired         |
| Auth service (register/login/JWT/refresh)               | Backend          | Backend Eng — Auth/RBAC   | Working auth endpoints                  |
| Mobile auth screens + SecureStore integration           | Mobile           | Mobile Eng — Auth/Profile | Register→login→session flow             |
| Design tokens & component library v1                    | Frontend (Admin) | Frontend Lead             | `packages/ui` published                 |

#### Phase 2 — Core CTF

| Task                                           | Owner Team      | Assigned Role                        | Deliverable                   |
| ---------------------------------------------- | --------------- | ------------------------------------ | ----------------------------- |
| Challenge, Hint, Attachment, Submission models | Database/DevOps | Database Engineer                    | Migration + seed update       |
| Challenge listing/detail API (paginated)       | Backend         | Backend Eng — Challenges/Submissions | `GET /api/challenges`, `/:id` |
| Flag submission + scoring + first-blood        | Backend         | Backend Eng — Challenges/Submissions | `POST /:id/submissions`       |
| Challenge browser (filter/search)              | Mobile          | Mobile Eng — Challenges/Leaderboard  | Working browse screen         |
| Challenge detail + flag submit UI              | Mobile          | Mobile Eng — Challenges/Leaderboard  | Working detail/submit screen  |
| Leaderboard service + Redis cache              | Backend         | Backend Eng — Leaderboard/Events     | `GET /api/leaderboard`        |
| Leaderboard screen + WS live updates           | Mobile          | Mobile Eng — Challenges/Leaderboard  | Live-updating leaderboard     |

#### Phase 3 — Toolkit

| Task                                                  | Owner Team | Assigned Role                 | Deliverable          |
| ----------------------------------------------------- | ---------- | ----------------------------- | -------------------- |
| Encoding tools (Base64/Hex/URL/ROT13)                 | Mobile     | Mobile Eng — Toolkit/Terminal | Toolkit tab v1       |
| Crypto tools (Caesar/Vigenère/XOR/frequency analysis) | Mobile     | Mobile Eng — Toolkit/Terminal | Crypto module        |
| Hash identifier, JWT decoder                          | Mobile     | Mobile Eng — Toolkit/Terminal | Hash/JWT modules     |
| File/hex/EXIF viewer                                  | Mobile     | Mobile Eng — Toolkit/Terminal | File analysis module |

#### Phase 4 — Terminal

| Task                                                    | Owner Team      | Assigned Role                  | Deliverable                              |
| ------------------------------------------------------- | --------------- | ------------------------------ | ---------------------------------------- |
| Sandbox abstraction (Scheduler → Worker Pool → Runtime) | Database/DevOps | DevOps Eng — Sandbox Infra     | Sandbox API interface + Docker impl      |
| Terminal Session Service + WS gateway                   | Backend         | Backend Eng — Terminal/Sandbox | `POST/GET/DELETE /api/terminal/sessions` |
| Terminal UI (xterm.js in WebView or custom RN terminal) | Mobile          | Mobile Eng — Toolkit/Terminal  | Working terminal tab                     |
| Sandbox isolation hardening + escape testing            | QA/Security     | Security Engineer — Platform   | Sign-off report                          |

#### Phase 5 — Competition

| Task                                       | Owner Team                | Assigned Role                                       | Deliverable                     |
| ------------------------------------------ | ------------------------- | --------------------------------------------------- | ------------------------------- |
| Event models + dynamic unlock rule engine  | Database/DevOps + Backend | Database Engineer, Backend Eng — Leaderboard/Events | Event/unlock schema + evaluator |
| Event API + countdown/registration         | Backend                   | Backend Eng — Leaderboard/Events                    | Event endpoints                 |
| Team system (create/join/invite/roles)     | Backend                   | Backend Eng — Auth/RBAC                             | Team endpoints                  |
| Event screen (countdown, live leaderboard) | Mobile                    | Mobile Eng — Challenges/Leaderboard                 | Event tab                       |
| Admin event scheduling + announcements UI  | Frontend (Admin)          | Frontend Eng — Events/Announcements                 | Event authoring screens         |

#### Phase 6 — Offline

| Task                                                          | Owner Team       | Assigned Role                                                    | Deliverable                 |
| ------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------- | --------------------------- |
| Local cache layer (challenges, profile, leaderboard snapshot) | Mobile           | Mobile Eng — Offline/Notifications                               | Cache-first data layer      |
| Sync queue + connectivity status UI                           | Mobile           | Mobile Eng — Offline/Notifications                               | Working offline queue       |
| Server-side idempotent submission handling for queued items   | Backend          | Backend Eng — Challenges/Submissions                             | Safe re-submission handling |
| Private notes (Markdown, autosave, offline edit + sync)       | Mobile + Backend | Mobile Eng — Toolkit/Terminal, Backend Eng — Notifications/Files | Notes feature end-to-end    |

#### Phase 7 — Admin

| Task                                                                | Owner Team                 | Assigned Role                                                    | Deliverable                          |
| ------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| Challenge editor (Markdown, attachments, publish/draft, versioning) | Frontend (Admin)           | Frontend Eng — Challenge Editor                                  | Full authoring workflow              |
| Attachment upload service (MIME/size validation, signed URLs)       | Backend                    | Backend Eng — Notifications/Files                                | Secure upload pipeline               |
| User/team management + RBAC-aware UI                                | Frontend (Admin)           | Frontend Eng — Analytics/Users                                   | Admin user/team screens              |
| Submission analytics dashboards                                     | Frontend (Admin) + Backend | Frontend Eng — Analytics/Users, Backend Eng — Leaderboard/Events | Analytics charts backed by real data |
| Audit log viewer                                                    | Frontend (Admin)           | Frontend Eng — Analytics/Users                                   | Audit log screen                     |

#### Phase 8 — Polish

| Task                                                        | Owner Team       | Assigned Role                                                         | Deliverable                       |
| ----------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- | --------------------------------- |
| Animations, empty/error/loading states                      | Mobile           | All Mobile Engineers                                                  | Polished UX across app            |
| Accessibility pass (screen reader, contrast, touch targets) | Mobile + QA      | Mobile Tech Lead, QA Eng — Mobile                                     | Accessibility audit passed        |
| Performance pass (pagination, payload size, caching)        | Backend + Mobile | Backend Tech Lead, Mobile Tech Lead                                   | Perf budget met                   |
| Push notification preferences UI + delivery                 | Mobile + Backend | Mobile Eng — Offline/Notifications, Backend Eng — Notifications/Files | Notification system complete      |
| Full regression test pass                                   | QA/Security      | QA Lead                                                               | Green test suite, release notes   |
| Deployment documentation & runbooks                         | Database/DevOps  | Platform Lead                                                         | `deployment.md`, `development.md` |

---

## 12. Feature Ownership Matrix

| Feature                                                          | Primary Owner                        | Supporting Team(s)                            | Key Files                                             |
| ---------------------------------------------------------------- | ------------------------------------ | --------------------------------------------- | ----------------------------------------------------- |
| Authentication (register/login/JWT/refresh)                      | Backend                              | Mobile (client integration)                   | `services/auth`, `apps/mobile/app/auth`               |
| Challenge browser & filtering                                    | Mobile                               | Backend (API)                                 | `app/(tabs)/challenges.tsx`, `controllers/challenges` |
| Challenge detail (Markdown, attachments, hints, connection info) | Mobile                               | Backend, Frontend (Admin, for authoring)      | `challenge/[id].tsx`                                  |
| Flag submission & scoring                                        | Backend                              | QA/Security (verification review)             | `services/scoring`                                    |
| First-blood bonuses                                              | Backend                              | —                                             | `services/scoring`                                    |
| Anti-cheat system                                                | Backend                              | QA/Security (rules validation)                | `services/anticheat`                                  |
| In-app terminal                                                  | Mobile (UI) + Backend (gateway)      | Database/DevOps (sandbox runtime)             | `app/(tabs)/terminal.tsx`, `websocket/terminal.ts`    |
| Sandbox infrastructure                                           | Database/DevOps                      | QA/Security (isolation testing)               | `infrastructure/docker`, sandbox service              |
| Offline toolkit (encoding/crypto/hash/JWT/file tools)            | Mobile                               | —                                             | `app/(tabs)/toolkit.tsx`                              |
| Leaderboard (global/event/team)                                  | Backend                              | Mobile (rendering)                            | `services/leaderboard`, `leaderboard.tsx`             |
| Profile & scoreboard analytics                                   | Mobile (UI) + Backend (data)         | —                                             | `profile.tsx`, `controllers/users`                    |
| Team system                                                      | Backend                              | Mobile, Frontend (Admin)                      | `controllers/teams`                                   |
| CTF events & countdown                                           | Backend                              | Mobile, Frontend (Admin)                      | `services/events`, `event/[id].tsx`                   |
| Dynamic challenge unlocking                                      | Backend                              | Frontend (Admin, rule config UI)              | `services/events` (unlock evaluator)                  |
| Hint system                                                      | Backend                              | Mobile (UI), Frontend (Admin, authoring)      | `controllers/challenges/hints`                        |
| Private notes / write-ups                                        | Mobile                               | Backend (sync)                                | `services/notes`                                      |
| Bookmarks & collections                                          | Mobile                               | Backend                                       | `controllers/bookmarks`                               |
| Achievements & streaks                                           | Backend                              | Mobile (UI)                                   | `services/achievements`                               |
| Push notifications                                               | Mobile (client) + Backend (dispatch) | —                                             | `services/notifications`                              |
| Offline-first sync                                               | Mobile                               | Backend (idempotent endpoints)                | `services/sync.ts`                                    |
| Admin dashboard shell + RBAC-aware routing                       | Frontend (Admin)                     | Backend (RBAC)                                | `apps/admin`                                          |
| Challenge editor & versioning                                    | Frontend (Admin)                     | Backend                                       | `apps/admin/.../challenges`                           |
| Submission analytics (admin)                                     | Frontend (Admin)                     | Backend                                       | `apps/admin/.../analytics`                            |
| RBAC (roles/permissions)                                         | Backend                              | QA/Security                                   | `middleware/rbac.ts`                                  |
| Audit log                                                        | Backend                              | Frontend (Admin, viewer UI)                   | `services/audit`                                      |
| Rate limiting                                                    | Backend                              | Database/DevOps (Redis)                       | `middleware/rateLimit.ts`                             |
| Observability (`/health` `/ready` `/metrics`)                    | Database/DevOps                      | Backend                                       | `infrastructure/monitoring`                           |
| Search                                                           | Backend                              | Mobile (UI)                                   | `controllers/search`                                  |
| Recommendation engine (deterministic)                            | Backend                              | Mobile (UI)                                   | `services/recommendations`                            |
| Daily challenge / Practice / Training mode                       | Backend                              | Mobile (UI)                                   | `services/challenges` (mode flags)                    |
| Social features (follow, activity feed, comments)                | Backend                              | Mobile (UI)                                   | Feature-flagged; privacy-configurable                 |
| Announcements                                                    | Backend                              | Frontend (Admin, authoring), Mobile (display) | `services/announcements`                              |
| File download & offline caching                                  | Mobile                               | Backend (File Service)                        | `services/files.ts`                                   |

---

## 13. Team Dependency Matrix

| Team             | Depends On      | Why                                                                       | Depended On By                    |
| ---------------- | --------------- | ------------------------------------------------------------------------- | --------------------------------- |
| Mobile           | Backend         | API contracts, WebSocket events, auth tokens                              | —                                 |
| Mobile           | Database/DevOps | Local dev environment, seeded data                                        | —                                 |
| Frontend (Admin) | Backend         | Same API contracts + RBAC enforcement                                     | —                                 |
| Backend          | Database/DevOps | Schema, migrations, Redis, infra availability                             | Mobile, Frontend (Admin)          |
| Backend          | QA/Security     | Sign-off on auth, flag verification, RBAC, sandbox gateway before release | —                                 |
| Database/DevOps  | Backend         | Container images, `/health` `/ready` endpoints to wire into infra         | Mobile, Frontend (Admin), Backend |
| Database/DevOps  | QA/Security     | Sandbox hardening requirements before promoting to staging/prod           | —                                 |
| QA/Security      | All teams       | Needs feature-complete builds from each team to test against              | —                                 |

**Practical implication:** Backend is the critical path for almost everything — schema and API contract changes should be proposed early each sprint (ideally at sprint planning) so Mobile and Admin work isn't blocked mid-sprint.

---

## 14. Development Workflow

**🔵 CURRENT / recommended standard practice for this stack:**

1. **Ticket intake** — work is pulled from the sprint backlog; ticket includes acceptance criteria and which service/screen it touches.
2. **Branch** — create a feature branch off `develop` (see §15).
3. **Local development** — run `docker compose up -d` for backend dependencies (Postgres, Redis, API); run the Expo dev client for mobile.
4. **Implement** — controllers/route handlers stay thin; business logic goes in `services/`; DTOs validated with Zod; no `any` without justification (per source spec §81 coding standards).
5. **Test locally** — run relevant unit/integration tests before opening a PR (see §17).
6. **Open Pull Request** — PR description links the ticket, summarizes the change, and calls out any schema, API contract, or security-relevant changes.
7. **Automated checks** — type checking, linting, and test suite must pass (🟢 RECOMMENDED: enforced via CI, not just locally).
8. **Code review** — minimum one approval for standard changes; **minimum two approvals**, including one from QA/Security, for changes touching authentication, flag verification/scoring, RBAC, or the sandbox/terminal gateway.
9. **Merge to `develop`** — squash-merge with a conventional commit message.
10. **Staging deploy** — `develop` auto-deploys to staging (Expo preview channel + Docker staging stack).
11. **QA/Security sign-off** — QA runs the relevant suite (see §17); Security reviews anything flagged in step 6.
12. **Release** — `develop` is merged into a `release/*` branch, tagged, and promoted to `main` for production deploy.

---

## 15. Git & Branching Strategy

**Branch model:**

| Branch                                 | Purpose                                                  | Protection                                                                 |
| -------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `main`                                 | Production-released code only                            | Protected; no direct pushes; requires green CI + approvals                 |
| `develop`                              | Integration branch for the next release                  | Protected; requires green CI + 1 approval (2 for security-sensitive areas) |
| `release/x.y`                          | Stabilization branch cut from `develop` before a release | Only bugfixes merge here                                                   |
| `feature/<team>-<ticket>-<short-desc>` | Individual feature work                                  | Branched from `develop`                                                    |
| `bugfix/<ticket>-<short-desc>`         | Non-urgent bug fixes                                     | Branched from `develop`                                                    |
| `hotfix/<ticket>-<short-desc>`         | Urgent production fixes                                  | Branched from `main`, merged to **both** `main` and `develop`              |

Example feature branch names: `feature/mobile-terminal-ui`, `feature/api-first-blood-scoring`, `feature/db-event-unlock-schema`.

**Commit convention (🟢 RECOMMENDED):** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`) to enable automated changelogs.

```mermaid
graph LR
    main["main (production)"] -.hotfix branch.-> hotfix["hotfix/*"]
    hotfix -->|merge| main
    hotfix -->|backport| develop["develop (integration)"]
    develop --> release["release/x.y"]
    release -->|tag & deploy| main
    develop --> f1["feature/mobile-*"]
    develop --> f2["feature/api-*"]
    develop --> f3["feature/db-*"]
    f1 -->|PR + review| develop
    f2 -->|PR + review| develop
    f3 -->|PR + review| develop
```

---

## 16. Sprint Planning

Assuming **2-week sprints** and phases as defined in the source specification (§80):

| Sprint | Phase Focus                  | Sprint Goal                                                                                           | Primary Teams                                      | Demo / Definition of Done                                                                         |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1–2    | Phase 1 — Foundation         | Monorepo, Expo app shell, Express API, Postgres/Prisma/Redis, working auth, design system v1          | Database/DevOps, Backend, Mobile, Frontend (Admin) | User can register and log in on-device against local backend                                      |
| 3–4    | Phase 2 — Core CTF           | Challenge browse/detail, flag submission, scoring, first blood, leaderboard                           | Backend, Mobile                                    | User can browse a challenge and submit a flag with real scoring                                   |
| 5      | Phase 3 — Toolkit            | Encoding, crypto, hash, JWT, file/EXIF tools, all local                                               | Mobile                                             | Offline toolkit fully functional with no network calls                                            |
| 6–7    | Phase 4 — Terminal           | Terminal UI, WS gateway, sandbox abstraction, safe dev container, session lifecycle                   | Backend, Database/DevOps, Mobile, QA/Security      | User opens a terminal, runs a command in an isolated container, session is destroyed on close     |
| 8–9    | Phase 5 — Competition        | Events, countdown, unlock rules, live leaderboard, teams, announcements                               | Backend, Mobile, Frontend (Admin)                  | An event can be scheduled, joined, and shows a live leaderboard                                   |
| 10     | Phase 6 — Offline            | Challenge cache, notes, offline toolkit confirmation, sync queue, connectivity handling               | Mobile, Backend                                    | User can solve/queue a submission offline and see it sync correctly                               |
| 11–12  | Phase 7 — Admin              | Challenge editor, attachments, hints, user/team management, analytics, audit log                      | Frontend (Admin), Backend                          | Admin can author a challenge end-to-end and see submission analytics                              |
| 13–14  | Phase 8 — Polish             | Animations, accessibility, performance, error states, notifications, full test pass, deployment docs  | All teams                                          | Full demo flow (§61/§62 of source spec) runs cleanly with no placeholder routes or fake API calls |
| 15     | Hardening & Launch Readiness | 🟢 RECOMMENDED: security review, load test on submission/terminal endpoints, staged rollout rehearsal | QA/Security, Database/DevOps                       | Go/no-go release decision documented                                                              |

Each sprint ends with the standard verification loop from source spec §83: type check → lint → tests → verify migrations → verify API endpoints → verify mobile screens → fix before proceeding. No sprint is considered complete with broken imports, placeholder routes, fake API calls, or non-functional buttons.

---

## 17. Testing Strategy

| Layer                            | Scope                                                                                                                                                                                                                             | Status                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Unit — Backend**               | Auth logic, flag validation/hashing, scoring math, first-blood calculation, rate-limit logic, hint cost/unlock logic, permission checks, team-membership rules                                                                    | 🔵 CURRENT                                                                                                               |
| **Unit — Mobile**                | Toolkit pure functions (Base64/Hex/ROT13/Caesar/Vigenère/XOR/hash identification), store reducers, offline queue logic                                                                                                            | 🔵 CURRENT                                                                                                               |
| **Integration**                  | API route + database round-trips; WebSocket integration for leaderboard and terminal channels                                                                                                                                     | 🔵 CURRENT                                                                                                               |
| **API / Contract**               | Requests/responses validated against the OpenAPI spec served at `/api/docs`                                                                                                                                                       | 🔵 CURRENT (spec-defined) / 🟢 RECOMMENDED tooling (e.g., Dredd or Newman against the OpenAPI doc in CI)                 |
| **Mobile screen tests**          | Challenge rendering, filtering, submission UI states, profile stats rendering                                                                                                                                                     | 🔵 CURRENT                                                                                                               |
| **Mobile E2E**                   | Full on-device flows                                                                                                                                                                                                              | 🟢 RECOMMENDED (Detox or Maestro)                                                                                        |
| **End-to-End (critical path)**   | `login → fetch challenge → submit correct flag → score changes → leaderboard updates` (source spec §65); terminal flow: `open terminal → sandbox session → WebSocket → command execution → session termination` (source spec §62) | 🔵 CURRENT scope / 🟢 RECOMMENDED automation via Supertest (API chain) + Detox/Maestro (mobile) + Playwright (admin web) |
| **Security testing**             | Anti-cheat rule tests, rate-limit enforcement tests, RBAC permission matrix tests, sandbox isolation/escape testing                                                                                                               | 🔵 CURRENT scope / 🟢 RECOMMENDED: scheduled penetration test of the sandbox before each major release                   |
| **Load / performance**           | Submission endpoint under burst load, terminal session concurrency                                                                                                                                                                | 🟢 RECOMMENDED (e.g., k6)                                                                                                |
| **Dependency & secret scanning** | Third-party vulnerability and leaked-credential detection in CI                                                                                                                                                                   | 🟢 RECOMMENDED (e.g., Dependabot/Snyk + gitleaks)                                                                        |

**Ownership:** QA/Security owns test strategy and the end-to-end suite; each engineering team owns unit tests for the code it writes and is expected to add/update tests in the same PR as the feature, not as a follow-up ticket.

---

## 18. Deployment Strategy

**Environments (🔵 CURRENT):**

| Environment | Mobile                                                 | Backend                                                                                                   | Purpose                                   |
| ----------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Development | Expo dev client / Expo Go, local Metro bundler         | `docker compose up -d` (Postgres, Redis, API, sandbox mock)                                               | Local iteration                           |
| Staging     | Expo EAS **preview** channel                           | Docker images behind Nginx reverse proxy with TLS, staging domain, migrations via `prisma migrate deploy` | Integration testing, QA/Security sign-off |
| Production  | Expo EAS **production** channel + app store submission | Docker images behind Nginx/TLS, horizontally scaled API, production Postgres/Redis/object storage         | Live users                                |

```mermaid
graph LR
    DEV["Local Dev<br/>docker compose up"] --> CI["CI Pipeline<br/>lint / typecheck / test / build"]
    CI --> STAGE["Staging<br/>Expo Preview + Docker"]
    STAGE --> SIGN["QA & Security Sign-off"]
    SIGN --> PROD["Production<br/>Expo Production + Docker (scaled)"]
```

**Notes:**

- CI/CD automation itself is 🟢 RECOMMENDED (source spec defines the environments and build channels but not a specific pipeline tool) — GitHub Actions is a natural fit given the GitHub-hosted monorepo.
- The API is designed to scale **horizontally** (stateless, JWT-based auth, Redis for shared cache/rate-limit state), so production deployment should run multiple API instances behind the reverse proxy.
- The sandbox layer's production scaling path is **explicitly anticipated by the source specification** (§74): move from the Docker-based dev scheduler to a Kubernetes-based worker pool, optionally with Firecracker or gVisor for stronger isolation. This is a **planned evolution**, not a new invention.
- Database migrations are applied as a distinct deploy step (`prisma migrate deploy`), never generated ad hoc against staging/production.

---

## 19. Security Architecture

This section consolidates the security requirements defined throughout the source specification (§8, §12, §14, §16, §43–§46, §68–§69, §72).

### 19.1 Authentication & Session Security

- Passwords hashed with Argon2 or bcrypt — **never** stored in plaintext.
- Access tokens are short-lived; refresh tokens rotate on use.
- Mobile stores tokens in **Expo SecureStore only** — never in AsyncStorage.
- Server supports session invalidation (logout everywhere, forced re-auth on role change).

### 19.2 API Security

- Helmet for HTTP security headers; strict CORS configuration.
- All input validated with Zod before reaching business logic.
- Rate limiting is Redis-backed and tiered: login (5/min), flag submissions (5/min per user/challenge), general API (100 req/min/user), terminal (connection/session quotas), uploads (strict size + rate limits).
- All database access goes through Prisma (parameterized queries) — no raw string-interpolated SQL.

### 19.3 Flag & Scoring Integrity

- Raw flags and flag hashes are **never** sent to the client.
- Verification is constant-time to prevent timing attacks.
- All scoring, rank, and completion state is computed server-side; the client only displays it.

### 19.4 Sandbox / Terminal Isolation

- Every terminal session runs in a non-root, resource-limited (CPU/RAM/process/filesystem), network-restricted, auto-expiring ephemeral container.
- Explicitly disallowed in any environment: `-v /:/host`, `--privileged`, Docker socket access, host network mode.
- Users must never obtain a shell on the production host.

### 19.5 Upload Security

- MIME + extension validation, file-size limits, randomized storage filenames.
- Uploads live in private object storage; downloads use signed, time-limited URLs.
- Integration point reserved for malware scanning (🟢 RECOMMENDED: wire this to a scanning service, e.g., ClamAV or a cloud AV API, before general availability).

### 19.6 RBAC (Roles)

| Role        | Representative Permissions                                           |
| ----------- | -------------------------------------------------------------------- |
| USER        | Solve challenges, submit flags, manage own notes/bookmarks/teams     |
| AUTHOR      | Create challenges, edit own challenges, view own challenge analytics |
| MODERATOR   | Moderate users, review submissions                                   |
| ADMIN       | Manage events, challenges, users                                     |
| SUPER_ADMIN | System configuration                                                 |

### 19.7 Audit Logging

- Logged: login/logout, challenge create/edit/delete, flag submissions, hint unlocks, score adjustments, role changes, team membership changes, admin actions.
- **Never logged:** passwords, tokens, raw flags, or other sensitive secrets.

### 19.8 Anti-Cheat

- Non-invasive by design: rate limiting, suspicious solve-time detection, repeated flag-pattern detection, account/device correlation, impossible solve-sequence detection, IP reputation hooks, admin review queue, score rollback.
- Only the **minimum required telemetry** is stored — this is a stated product constraint, not just a suggestion.

### 19.9 Secrets Management

| Environment          | Current Approach                                          | Recommendation                                                                                                                                                      |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local development    | `.env` file from `.env.example`, never committed          | —                                                                                                                                                                   |
| Staging / Production | 🔵 CURRENT: environment variables injected at deploy time | 🟢 RECOMMENDED: centralized secrets manager (e.g., Doppler, AWS Secrets Manager, or HashiCorp Vault) with scheduled rotation of `JWT_SECRET` / `JWT_REFRESH_SECRET` |
| CI                   | —                                                         | 🟢 RECOMMENDED: secret-scanning (e.g., gitleaks) as a required CI check to prevent accidental commits                                                               |

---

## 20. New Employee Onboarding Guide

**Day 1 — Orient**

1. Read this document in full, then skim `docs/architecture.md`, `docs/security.md`, and `docs/api.md` in the repo.
2. Identify which team you're joining (§6–§10) and read that section's responsibility table closely.
3. Get repo access, clone the monorepo, and review the top-level folder structure (§3) before opening any code.

**Day 1–2 — Get the environment running** 4. Copy `.env.example` to `.env` and fill in **non-production** values only — never reuse real secrets. 5. Run `docker compose up -d` to start Postgres, Redis, and the API. 6. Run database migrations and `npm run db:seed` to load demo users, 8 sample challenges, an event, and achievements. 7. For mobile engineers: start the Expo dev client and confirm you can load the app against your local API (`EXPO_PUBLIC_API_URL` pointed at your local backend). 8. For backend engineers: hit `GET /health` and `GET /ready` to confirm the API is up and connected to Postgres/Redis. 9. For admin/frontend engineers: start the admin app and log in with a demo admin account (from seed data, development only).

**Week 1 — Understand the critical path** 10. Walk the demo user flow end-to-end yourself (source spec §61): register → login → browse → filter Crypto → open "Caesar's Secret" → use the toolkit → submit the flag → watch your score/leaderboard/profile update. 11. Walk the terminal flow (§62): open a challenge with a terminal → start a session → run a safe command → close the session → confirm the container was destroyed. 12. Read §72 (Security Rule) closely: the client is never authoritative for scores, ranks, or permissions. Internalize this before writing any feature code.

**Week 1 — Start contributing** 13. Pick up a small, well-scoped starter ticket from your team's current sprint (§16). 14. Follow the branch naming convention (§15) and development workflow (§14): branch → implement → test locally → PR → CI → review → merge to `develop`. 15. If your change touches authentication, flag verification, RBAC, or the sandbox/terminal gateway, flag this explicitly in your PR description — it requires a QA/Security reviewer in addition to your team lead. 16. Ask your team lead which Slack/chat channel is used for cross-team API contract questions — Backend owns `packages/shared`, so contract changes should be proposed there before other teams build against them.

---

## Appendix A — Environment Configuration Reference

Values below are **variable names only**, as defined in `.env.example` (source spec §63). No real credentials are stored in this document or in version control.

| Variable                  | Purpose                                        | Example (non-secret placeholder)                      |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`            | PostgreSQL connection string                   | `postgresql://user:[REDACTED]@localhost:5432/ctf_dev` |
| `REDIS_URL`               | Redis connection string                        | `redis://localhost:6379`                              |
| `JWT_SECRET`              | Access token signing secret                    | `[REDACTED]`                                          |
| `JWT_REFRESH_SECRET`      | Refresh token signing secret                   | `[REDACTED]`                                          |
| `OBJECT_STORAGE_BUCKET`   | Attachment/avatar storage bucket name          | `ctf-platform-dev`                                    |
| `OBJECT_STORAGE_ENDPOINT` | Object storage endpoint                        | `https://storage.example.com`                         |
| `WEBSOCKET_URL`           | WebSocket gateway address                      | `wss://api.example.com/ws`                            |
| `SANDBOX_SERVICE_URL`     | Sandbox scheduler API address                  | `http://sandbox.internal.example.com`                 |
| `EXPO_PUBLIC_API_URL`     | Public API base URL consumed by the mobile app | `https://api.example.com`                             |

**Rule:** never commit a populated `.env` file. Demo/development credentials referenced in `README.md` are for local development only and must never match staging or production values.

---

## Appendix B — Glossary

| Term          | Meaning                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| CTF           | Capture The Flag — a security exercise where users find a hidden "flag" string proving they solved a challenge         |
| Flag          | The secret string a user must find and submit to prove a challenge is solved; stored server-side only as a salted hash |
| First Blood   | Bonus points for the first (and next few) users to solve a given challenge                                             |
| Sandbox       | An isolated, ephemeral, resource-limited container used to run a user's terminal session safely                        |
| RBAC          | Role-Based Access Control — permission system based on named roles (USER, AUTHOR, MODERATOR, ADMIN, SUPER_ADMIN)       |
| Anti-cheat    | Non-invasive detection of suspicious submission patterns (timing, repetition, correlation)                             |
| Offline-first | Design approach where the app remains usable without connectivity and reconciles state once reconnected                |
| Feature flag  | A toggle (e.g., `EVENT_MODE`, `TEAMS`, `TERMINAL`) allowing features to be enabled gradually                           |

---

_End of document. This is a living reference — update the CURRENT/RECOMMENDED tags as recommended items are formally adopted into the committed backlog._
