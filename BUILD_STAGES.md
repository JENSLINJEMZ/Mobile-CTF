# Mobile CTF Platform — Staged Build Plan

Breakdown of the platform (per `mobile_CTF.md`) into sequential, buildable stages.
Each stage is independently demonstrable and ends with a working milestone.

```
Stage 1  Foundations & Infrastructure
Stage 2  Authentication & Users
Stage 3  Core CTF (Challenges, Submissions, Scoring)
Stage 4  Leaderboard & Realtime
Stage 5  Offline Toolkit
Stage 6  Terminal & Sandbox
Stage 7  Events, Teams & Competition
Stage 8  Offline & Sync (notes, bookmarks, achievements)
Stage 9  Admin Dashboard & File Service
Stage 10 Notifications, Polish, Deployment
```

---

## Stage 1 — Foundations & Infrastructure

**Goal:** A buildable monorepo where everything boots against a local environment.

| Area        | Scope                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo    | Turborepo + npm workspaces (`turbo.json`), folders `apps/*`, `packages/*`, `infrastructure/*`, `docs/*`                                                       |
| Local infra | `docker-compose.yml` → Postgres + Redis (one-command dev env)                                                                                                 |
| Database    | `packages/database/prisma/schema.prisma` v1: `User`, `Session`, base models; first migration; seed script skeleton                                            |
| Shared      | `packages/shared`: TS types, constants, Zod validation exports; `packages/ui`: design tokens + component library v1                                           |
| Backend     | `apps/api`: Express + TypeScript scaffold, middleware stack (Helmet, CORS, Zod error handler, structured JSON logging), `/health`, `/ready`, `/metrics` stubs |
| Mobile      | `apps/mobile`: Expo + Expo Router scaffold, bottom-tab shell (Challenges, Terminal, Leaderboard, Toolkit, Profile), API client + env config                   |
| Admin       | `apps/admin`: responsive web scaffold wired to same API                                                                                                       |
| Config      | `.env.example` (variable names only, no real secrets)                                                                                                         |

**Exit criteria:**

- `docker compose up -d` starts the backend.
- `npm run build`/typecheck/lint pass across the monorepo.
- `GET /health` and `GET /ready` respond from the API.
- Expo app opens with working bottom-tab navigation.

**Dependencies:** none (team start point).

---

## Stage 2 — Authentication & Users

**Goal:** Users can register, log in, and hold an authenticated session on-device against the local backend.

| Area     | Scope                                                                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database | Extend schema: sessions/refresh tokens, RBAC role fields                                                                                                                                                         |
| Backend  | Auth Service: register, login, logout, JWT access + refresh rotation, Argon2/bcrypt hashing, password reset, session invalidation; Redis-backed rate limit (login 5/min); RBAC middleware (`middleware/rbac.ts`) |
| Shared   | Auth DTOs + Zod schemas in `packages/shared`                                                                                                                                                                     |
| Mobile   | Auth screens (register/login/logout), Expo SecureStore token handling (never AsyncStorage), Zustand auth store, profile/stats screen                                                                             |
| Admin    | Login with demo admin (seed data)                                                                                                                                                                                |
| QA       | Backend auth unit tests, rate-limit test, token rotation tests                                                                                                                                                   |

**Exit criteria:**

- Register → login → session persists across app restarts → logout all devices works.
- Protected routes reject unauthenticated/expired tokens; role-gated routes reject wrong roles.

**Dependencies:** Stage 1.

---

## Stage 3 — Core CTF (Challenges & Submissions)

**Goal:** The primary loop — browse, open, solve, and submit a challenge with authoritative server-side scoring.

| Area     | Scope                                                                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database | Models: `Challenge`, `ChallengeCategory`, `ChallengeTag`, `ChallengeVersion`, `Hint`, `Attachment`, `Submission`, `SubmissionAttempt`; seed 8 demo challenges incl. "Caesar's Secret"                                                                                                       |
| Backend  | Challenge Service: admin CRUD, paginated `GET /api/challenges`, `GET /api/challenges/:id`, hint unlock; Submission Service: flag verification against salted hash (constant-time), scoring, first-blood bonus, submission rate limit (5/min per user/challenge); flags never sent to client |
| Shared   | Challenge DTOs                                                                                                                                                                                                                                                                              |
| Mobile   | Challenge browser (filter/search), challenge detail (Markdown, hints, attachments), flag submission UI                                                                                                                                                                                      |
| QA       | Flag-hash/constant-time tests, scoring + first-blood math tests                                                                                                                                                                                                                             |

**Exit criteria:**

- User browses (filter Crypto) → opens "Caesar's Secret" → submits flag → correct/incorrect handled → score + first-blood computed server-side only.
- Client never sees raw flags or hashes.

**Dependencies:** Stage 2.

---

## Stage 4 — Leaderboard & Realtime

**Goal:** Live leaderboard movement with authenticated WebSockets and Redis-backed state.

| Area    | Scope                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend | Leaderboard Service (Redis cache, global/event/team/daily/weekly), `GET /api/leaderboard`, Socket.IO leaderboard channel (authenticated only), WS broadcast on submission |
| Mobile  | Leaderboard tab with live-updating rank via WebSocket client                                                                                                              |
| QA      | WS integration tests, Redis query tests                                                                                                                                   |

**Exit criteria:**

- Submit a correct flag → score changes → leaderboard updates live on connected clients.
- Anonymous sockets cannot subscribe.

**Dependencies:** Stage 3.

---

## Stage 5 — Offline Toolkit

**Goal:** Fully local, offline security toolkit.

| Area   | Scope                                                                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile | Toolkit tab: encoding (Base64/Hex/URL/ROT13), crypto (Caesar/Vigenère/XOR/frequency analysis), hash identifier, JWT decoder, file/hex/EXIF viewer — all local, zero network |
| QA     | Unit tests for all pure toolkit functions                                                                                                                                   |

**Exit criteria:**

- Toolkit operates with no network calls and no backend dependency (pure functions + tests green).

**Dependencies:** Stage 1 only (can run parallel to Stages 2–4).

---

## Stage 6 — Terminal & Sandbox

**Goal:** In-app terminal running inside an isolated, auto-expiring container — never a host shell.

| Area    | Scope                                                                                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infra   | Sandbox abstraction (Scheduler → Worker Pool → Container Runtime) + Docker dev implementation; resource limits, non-root, no `--privileged`, no host mounts/docker socket, network restriction, auto-expiry |
| Backend | Terminal Session Service: `POST/GET/DELETE /api/terminal/sessions`, authenticated WS I/O relay channel, session quotas                                                                                      |
| Mobile  | Terminal UI (xterm.js in WebView or custom RN terminal)                                                                                                                                                     |
| QA      | Sandbox isolation/escape testing, session lifecycle tests, security sign-off                                                                                                                                |

**Exit criteria:**

- Open terminal → session created → run safe command → close → container destroyed.
- Escape/isolation test pass; security sign-off documented.

**Dependencies:** Stage 2 (auth) + Stage 1 (infra). Parallel with Stages 3–5.

---

## Stage 7 — Events, Teams & Competition

**Goal:** Scheduled competitions with dynamic unlock rules, teams, and live event leaderboards.

| Area     | Scope                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database | `Event`, `EventParticipant`, `EventTeam` models; unlock rule schema                                                                                                 |
| Backend  | Event Service (lifecycle, countdown, registration, event-scoped leaderboard), dynamic unlock rule evaluator, Team Service (create/join/invite/roles), Announcements |
| Mobile   | Event screen (countdown, live leaderboard), team flow                                                                                                               |
| Admin    | Event scheduling + unlock-rule configuration UI                                                                                                                     |
| QA       | Unlock-evaluator logic tests, team-membership rule tests                                                                                                            |

**Exit criteria:**

- An event can be scheduled, joined, and shows a live event leaderboard; unlock rules gate challenge availability; teams function end-to-end.

**Dependencies:** Stage 4.

---

## Stage 8 — Offline & Sync (notes, bookmarks, achievements)

**Goal:** Offline-first behavior — the app stays usable without connectivity and reconciles server-side.

| Area    | Scope                                                                                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend | Idempotent submission handling for queued items, notes sync API, achievements/streaks engine, bookmarks/collections                                                              |
| Mobile  | Local cache layer (challenges, profile, leaderboard snapshot via AsyncStorage/MMKV), sync queue, connectivity status UI, private notes (Markdown, autosave, offline edit + sync) |
| QA      | Sync-queue idempotency tests, offline queue logic unit tests                                                                                                                     |

**Exit criteria:**

- Submit flag offline → queued → syncs once connectivity returns → server validates → local cache reconciled, queue cleared.
- UI never claims a solve before server validation.

**Dependencies:** Stage 3 (submissions) + Stage 4.

---

## Stage 9 — Admin Dashboard & File Service

**Goal:** Authors and moderators manage content, users, and analytics from the web dashboard.

| Area    | Scope                                                                                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin   | Challenge editor (Markdown, attachments, publish/draft, versioning), hint config, user/team management (RBAC-aware), submission analytics dashboards, audit log viewer, announcements authoring |
| Backend | File Service (MIME/size validation, randomized names, signed time-limited download URLs), Audit Log Service, Notification Service backend                                                       |
| QA      | RBAC permission matrix tests, upload validation + rate-limit tests                                                                                                                              |

**Exit criteria:**

- Admin authors a challenge end-to-end (create → publish → analytics show real submission data); audit log records admin actions; attachments upload/download securely.

**Dependencies:** Stages 2, 3, 7.

---

## Stage 10 — Notifications, Polish & Deployment

**Goal:** Production-quality UX, notifications, and release readiness.

| Area    | Scope                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Mobile  | Expo push notifications + preferences UI, animations, empty/error/loading states, accessibility pass, performance pass |
| Backend | Push dispatch, payload/pagination optimization                                                                         |
| QA      | Full regression pass (login → browse → submit → leaderboard; terminal lifecycle)                                       |
| Infra   | Deployment docs & runbooks, staging config, Expo EAS channels, Nginx/TLS config, migration runbook                     |

**Exit criteria:**

- Full demo flow runs cleanly with no placeholder routes or fake API calls.
- Green test suite; release sign-off; deployment/runbook docs committed.

**Dependencies:** all preceding stages.

---

## Notes

- **Critical path:** Backend API contracts + `packages/shared` DTOs should be defined at each stage start so Mobile/Admin are not blocked mid-stage (§13).
- **Security-review-required changes** (any stage): authentication, flag verification/scoring, RBAC, sandbox/terminal gateway — need QA/Security sign-off (§14).
- **Non-negotiable constraints** (all stages): client never authoritative for scores/ranks; flags never sent to client; terminal sessions never touch a host shell; offline actions are provisional until server validation (§4, §19).
- **Stage 5 is independent** and can ship while Stages 2–4 are in flight.
