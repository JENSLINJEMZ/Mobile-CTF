# Mobile CTF Platform — Project Memory

> Living memory of build progress, decisions, and environment facts for the Mobile CTF Platform.
> Updated on every meaningful change. Companion docs: `mobile_CTF.md` (architecture spec), `BUILD_STAGES.md` (stage plan).

---

## 1. Project TL;DR

Mobile-first Capture The Flag (CTF) learning/competition product for iOS/Android (Expo/RN) + Express API + web Admin Dashboard.
Turborepo + npm workspaces monorepo. Staged build — **Stage 6 (Terminal & Sandbox) is DONE. Next: Stage 7 (Events, Teams & Competition).**

Product goals (priority): security > working end-to-end > mobile UX > clean architecture > performance > polish > extensibility > testing > docs.

Non-negotiable rules (from spec §4/§19):
- Client is NEVER authoritative for scores/ranks/flags/permissions.
- Flags are NEVER sent to the client; salted server-side hashes only, constant-time compare.
- Terminal sessions NEVER touch a host shell (isolated, non-root, auto-expiring containers).
- Offline actions are provisional until server validates.
- No malware / real exploitation content — benign fictional seed content only.

---

## 2. Repo Layout (built so far)

```
ctf/                        # monorepo root (working dir, git repo initialized, no commits)
├── mobile_CTF.md           # architecture spec (reference)
├── BUILD_STAGES.md         # stage-by-stage build plan
├── MEMORY.md               # this file
├── package.json            # workspaces: apps/*, packages/*  (private)
├── turbo.json              # turbo pipeline config
├── tsconfig.base.json      # shared strict TS base
├── eslint.config.js        # root flat config (applies to all workspaces)
├── .gitignore / .dockerignore / .env.example
├── docker-compose.yml      # postgres + redis + api (full stack verified)
├── apps/
│   ├── api/                # @ctf/api — Express + Socket.IO + TS (tsx dev, tsup build)
│   │   └── src/{server.ts (http + socket + scheduler),app.ts,config/env.ts,routes,middleware,services,utils,websocket}
│   │       ├── services/sandbox/  # SandboxRuntime iface + DockerSandboxRuntime (dockerode, hardened) + FakeSandboxRuntime (tests)
│   │       ├── services/terminalSessions.ts  # session lifecycle, quota, TTL, output/exit event bus
│   │       ├── services/scheduler.ts         # interval tasks w/ no-overlap + runNow for tests
│   │       ├── utils/workerPool.ts           # bounded-concurrency pool (sandbox creates)
│   │       ├── utils/ansi.ts                 # stripAnsi for relay
│   │       ├── routes/terminal.ts            # POST/GET/DELETE /api/terminal/sessions
│   │       └── websocket/{leaderboard.ts,terminal.ts,auth.ts}  # /leaderboard + /terminal namespaces
│   ├── mobile/             # @ctf/mobile — Expo SDK 57 + Expo Router, 5-tab shell
│   │   └── src/app/{index,terminal,leaderboard,toolkit,profile}.tsx (+ services/terminal.ts, services/terminalSocket.ts)
│   └── admin/              # @ctf/admin — Vite + React 18 + TS admin shell
├── packages/
│   ├── shared/             # @ctf/shared — types, enums, constants, Zod validation
│   ├── toolkit/            # @ctf/toolkit — pure offline tool primitives (encode/crypto/hash/JWT/file) + vitest
│   ├── database/           # @ctf/database — Prisma schema (User/Session), client, seed
│   └── ui/                 # @ctf/ui — design tokens + web components (Button/Text/Heading/Card/Badge)
└── infrastructure/
    ├── docker/api.Dockerfile
    ├── sandbox/                # ctf-sandbox image Dockerfile (alpine, non-root) + SECURITY.md sign-off
    ├── nginx/ ../monitoring/ ../deployment/   # placeholders (.gitkeep)
```

---

## 3. Key Decisions (and why)

| Decision | Choice | Reason |
|---|---|---|
| Package manager | npm workspaces | No extra tooling; npm 11 ships with node 22 |
| Build orchestrator | Turborepo (turbo.json) | Cache + task pipeline per spec §2.5 |
| Package names | `@ctf/*` scope | Short, consistent |
| Cross-package import | packages export **TS source** (`"exports": "./src/index.ts"`) | Metro/Vite/tsup/tsx consume directly; no dist step |
| API dev | `tsx watch src/server.ts` | Zero-config TS dev server |
| API build | `tsup` with `tsup.config.ts`; `noExternal: [/@ctf\/.*/]` bundles workspace source; `external: [/^[a-zA-Z@]/, /^\.prisma\//]` keeps ALL third-party deps loaded from node_modules | Bundling CJS deps (jsonwebtoken→safe-buffer) into one ESM file crashed on `Dynamic require of "buffer"`; CJS interop works natively only via node_modules |
| API start | `node dist/server.js` (tsup names output after entry `server.ts`) | — |
| `.env` loading | Search **upward** for nearest `.env` (`findEnvPath()`), NOT a fixed relative path | Bundle output flattens `src/config/env.ts` into `dist/server.js` → fixed `../../../../.env` overshot to `/` |
| Express version | Express 4 (`@types/express@4`) | Most stable; async handled via local `asyncHandler` wrapper |
| Logging | pino (JSON) + pino-http, pino-pretty in dev | Spec §2.2 |
| API port/routes | 4000; mounted under `/api` (`/api/health`, `/api/ready`, `/api/metrics`) | Matches spec; admin Vite proxies `/api` → 4000 |
| Docker base | `node:22-bookworm-slim` (**NOT alpine**) | Alpine (musl) crashed `npm ci` ("Exit handler never called"); Prisma also favors glibc |
| Docker npm ci needs | **All workspace package.json files must be copied BEFORE `npm ci`** | Otherwise missing apps (vite etc.) never get installed |
| Docker NODE_ENV | set only in runtime stage, NOT during `npm ci` | `NODE_ENV=production` makes npm skip devDeps (turbo/prisma CLI missing) |
| Docker build cmd | `npm run build -- --filter=@ctf/api` — `--` required | Without `--`, npm 11 drops `--filter` → builds admin too |
| Prisma version | 6.19.3, classic `prisma-client-js` generator | Stable; generated client in node_modules |
| ioredis health check | **NO `lazyConnect`** + keep default `enableOfflineQueue` | `lazyConnect` + `enableOfflineQueue:false` races the first ping ("Stream isn't writeable") |
| Mobile scaffold | `create-expo-app` default template (SDK 57), then replaced with classic expo-router `Tabs` (Ionicons) | Classic Tabs is stable vs `NativeTabs` unstable API; template cruft removed |
| Mobile/Metro monorepo | custom `metro.config.js`: `watchFolders=[workspaceRoot]` + `resolver.nodeModulesPaths` | Lets Metro resolve hoisted `@ctf/*` |
| Mobile/UI parity | Mobile imports **tokens only** from `@ctf/ui` | Web components use DOM — not RN-safe |
| Seed data | Stage 1 seeds 1 Admin user (placeholder passwordHash, replaced Stage 2) | Real challenge seed lands Stage 3 |
| git | initialized (`git init -b main`), **no commits yet** | Aligns with spec §15 |
| Password hashing | `bcryptjs` (pure JS, bcrypt algorithm) | Spec allows bcrypt; zero native deps = reproducible npm ci in Docker (argon2 node-gyp/prebuild was the risk) |
| Tokens | JWT **access** token (HS256, 15m, role in claims) + **opaque random refresh** token stored as sha256 hash with unique index, 7d TTL | Refresh lookup by hash (no secret needed for verify); rotation revokes old session row; access uses JWT |
| Rate limiting | Custom Redis fixed-window limiter (`middleware/rateLimit.ts`): `ratelimit:<prefix>:<identity>` via INCR+EXPIRE, RateLimit-* headers, 429 ApiError | Login 5/min/IP (`RATE_LIMIT_LOGIN`); general per-user (authenticated → user id key, else IP), applied only to non-health routes |
| Mobile auth persistence | Tokens in **expo-secure-store** (native) + `localStorage` web fallback; zustand store hydrates via `GET /api/auth/me` on launch | Spec §19.1: never AsyncStorage for tokens |
| Mobile HTTP | `services/http.ts` attaches access token, does ONE refresh-retry on 401 then clears tokens on failure | Transparent auth to screens, refresh rotation handled centrally |
| Password reset | Opaque 48-byte token, sha256-hashed, 1h TTL; `devResetLink` returned only when `NODE_ENV !== production` | No account enumeration (`ok:true` always); tokens never stored raw |
| Admin auth | web localStorage session, login screen (demo admin prefilled), dashboard gated; session re-validated via `/me` on load | Web-only admin; SecureStore rule applies to mobile only |
| Seed data (Stage 2) | Real bcrypt hashes; demo admin `admin@ctf.test` + user `user@ctf.test`, password `ctfpass123` (env-overridable) | Demo creds for admin/mobile login |
| Challenge content | Seed 8 demo challenges across 6 categories incl. "Caesar's Secret" (crypto, EASY, 100) | Browse→solve loop works out of the box |
| Flag storage | `Challenge.flagHash = sha256(salt:flag)` + per-challenge `flagSalt`; verify via HMAC-style recompute + `crypto.timingSafeEqual`; **flags/hashes/salts NEVER in any DTO** | Spec §5.2/§72: client never sees flags or hashes |
| Submission audit | One `SubmissionAttempt` row per attempt (stores sha256 of the submitted text, never raw); success also creates `Submission` (unique per user+challenge) | Audit trail w/o storing plaintext guesses |
| Scoring | `max(0, basePoints − sum(unlockedHintPenalties))`; +10% of base first-blood bonus (rounded); idempotent re-submit (0 pts, "already solved") | Authoritative server-side scoring; hint cost is real |
| Hint unlocks | Additive `HintUnlock` model (spec model list lacks a hint-unlock table — documented deviation); locked hints expose title+penalty only, body revealed on unlock | Per-user unlock state with scoring impact |
| Admin CRUD | `/api/admin/*` guarded by `authenticate` + `requireRole(MODERATOR, ADMIN)`; edits snapshot a new `ChallengeVersion` | Author roles + version history |
| Mobile markdown | `react-native-markdown-display` (pure JS, web-compatible) for challenge descriptions/hints | Spec lists Markdown renderer as current capability |
| Leaderboard state | Redis ZSETs: `lb:global` (rebuilt from DB totals via `ZADD` on every rank read — self-heals pre-Stage-4 solves), `lb:daily:<UTC-date>` + `lb:weekly:<UTC-monday>` (`ZINCRBY` pointsAwarded on each scored solve) | Global is authoritative from DB; daily/weekly are pure point aggregates |
| Realtime | Socket.IO namespace `/leaderboard`; handshake-auth via `socket.handshake.auth.token` (access JWT); anonymous connection → `connect_error: unauthorized`; every scored solve broadcasts `leaderboard:update {type:'solved', userId, username, pointsAwarded, scope:'global', at}` to the room | Exit criteria: live movement only for subscribed authenticated clients |
| Decoupled WS emit | Route calls `emitLeaderboardSolved()` (in-memory `services/events.ts` bus); `websocket/leaderboard.ts` registers the handler — no circular import service↔socket | Services stay testable w/o sockets |
| Submit rank field | `SubmitFlagResponse.rank` computed server-side (`applySolve` → rebuild global → `ZREVRANK`) | Client never computes rank |
| Mobile live updates | `services/socket.ts` (socket.io-client, connect on leaderboard screen focus, disconnect on blur, token read fresh from SecureStore) + `services/leaderboard.ts`; on WS event → refetch from API (client math never authoritative) | Scope chips global/daily/weekly + "you" row highlight |
| Toolkit package | `@ctf/toolkit` (private, deps: none runtime, vitest+typescript dev) exporting **TS source** like sibling packages; pure functions only — no `node:*`, `fetch`, sockets, or global btoa/atob (own UTF-8/base64/base64url/hex to work on Hermes) | Offline-first: works identically on device, web, and Node tests |
| Toolkit file viewer | File section takes **hex text** (from `xxd`/`od`) → `hexToBytes` → size/magic (`sniffFileType`)/EXIF (`parseExif` JPEG APP1 + TIFF IFD0/GPS)/`hexDump` | Zero new native deps; no expo-document-picker/file-system needed to meet exit criteria |
| Toolkit verification | Test runner lives in `@ctf/toolkit` (`vitest`, 63 tests); mobile devDeps deliberately left without vitest; verified via turbo `test` + `expo export` | Pure functions tested at the package; app shell verified by bundling/route export |
| Sandbox image | `infrastructure/sandbox/Dockerfile` — alpine:3.20 + bash/coreutils/procps/util-linux, non-root `ctf(10001):ctf(10001)`, motd banner, `/bin/bash` CMD | Minimal attack surface; no network tooling baked in (container runs `--network none` anyway) |
| Sandbox runtime | `DockerSandboxRuntime` (dockerode) — single pinned `ctf-sandbox:latest` image, per-session container named `ctf-tm-<sessionId>`, create burst capped by `WorkerPool`; `HostConfig`: `--memory/--memory-swap 64m`, `--cpu-quota 50k/period 100k`, `--pids-limit 64` `--ulimit nofile 64`, `--cap-drop ALL`, `--security-opt no-new-privileges`, `--network none`, `--read-only` + `noexec` tmpfs on `/tmp` + `/home/ctf`, `AutoRemove: true`; NO docker socket / volumes mounted | Full hardening table in `infrastructure/sandbox/SECURITY.md`; kernel isolation (gVisor/Firecracker) documented as follow-up |
| Sandbox exit wait | `container.wait({condition:'not-running'})` registered **AFTER** `container.start()` | Registering before start resolves immediately (container is `Created`, not `Running`) → fake exit code 0 → instance deleted from map before return |
| Stale container names | On `createContainer` 409-conflict, force-remove the name and retry once | A crashed create/sweep must not permanently block that session-id's name |
| Runtime injection | `configureSandboxRuntime()` swaps the singleton `SandboxRuntime` (`services/terminalSessions.ts`); prod → docker, tests → `FakeSandboxRuntime` (PassThrough echo + inputs log + killCalls) | WS/route tests exercise the full lifecycle/relay without a daemon; docker-gated isolation tests use the real one |
| Terminal sessions | `TerminalSession` table (PK `id` = `tm_`+32 hex, status enum CREATING/RUNNING/CLOSED/EXPIRED/FAILED, containerId internal-only — never in DTO); TTL default 1800s; quota `TERMINAL_MAX_ACTIVE_PER_USER` default 2 → 429 `SESSION_LIMIT`; expiry sweep marks **EXPIRED before kill** so the exit handler can't overwrite with CLOSED (race fix) | Owner-scoped rows (userId FK cascade); `/terminal/sessions/:id` ownership checks on GET/DELETE/join |
| WS terminal relay | Namespace `/terminal` (handshake JWT like `/leaderboard`); `terminal:join {sessionId}` (ownership + RUNNING + room `tm:<id>`) → `terminal:input {data}` → `runtime.write`; container stdout→`stripAnsi`→`terminal:output {sessionId,data}` broadcast to room; `terminal:exit {sessionId,code}` on container stop/TTL. Shared `authByHandshake` extracted to `websocket/auth.ts`; `websocket/leaderboard.ts` owns `attachSocket` + wires both namespaces (compat for leaderboard tests) | Exit criteria: relay through isolated container, closed on exit |
| Ready check | `/api/ready` now includes `sandbox` dependency (`DockerSandboxRuntime.isAvailable()` → `docker ping`) | Compose/gates use ready status incl. sandbox daemon |
| API Dockerfile | Added `COPY packages/toolkit/package.json` to the workspace-manifest block before `npm ci`; compose mounts `/var/run/docker.sock:ro` into `ctf-api` + `SANDBOX_*`/`TERMINAL_*` env | New toolkit workspace (Stage 5) breaks `npm ci` if manifest missing; socket RO is sufficient for dockerode (connect needs no fs write) |

---

## 4. Environment Facts

- Node **v22.23.1**, npm **11.19.0**
- Docker **29.7.2**, daemon RUNNING; system compose plugin missing → installed user-local **compose v2.33.1** at `~/.docker/cli-plugins/docker-compose`
- git 2.55.0; npm registry reachable
- Expo SDK **57** (React Native 0.86, React 19.2.3, expo-router ~57) — AGENTS.md warns SDK 57 changed; consult https://docs.expo.dev/versions/v57.0.0/
- npm 11 blocks install scripts by default → `npm install-scripts approve` needed for esbuild/prisma/@prisma/*

---

## 5. Stage Progress

**🔵 Stage 1 — Foundations & Infrastructure — DONE ✅**

| Task | Status |
|---|---|
| Verify environment | ✅ |
| MEMORY.md maintained | ✅ |
| Root monorepo files (package.json/turbo/tsconfig/eslint/.gitignore/.env.example/.dockerignore) | ✅ |
| docker-compose.yml (postgres + redis + api) | ✅ full stack running |
| packages/shared (types/enums/constants/Zod) | ✅ |
| packages/database (Prisma User/Session, migration `20260905000000_init`, seed) | ✅ |
| packages/ui (tokens + Button/Text/Heading/Card/Badge) | ✅ |
| apps/api (Express, /health /ready /metrics, pino, errors) | ✅ |
| apps/admin (Vite shell wired to /api via proxy) | ✅ |
| apps/mobile (Expo 5-tab shell + metro monorepo config + api client) | ✅ |
| npm install (workspaces) + approved scripts | ✅ |
| Prisma migration applied + seeded demo admin | ✅ |
| Docker image build (`ctf-platform-api`) | ✅ |
| Verification (typecheck 6/6, lint 6/6, build 2/2, mobile web export, live endpoints) | ✅ |

**Verification log:**
- Stage 1: typecheck 6/6, lint 6/6, build (api+admin), expo web export (5 tab routes), compose stack healthy, /health /ready /metrics + structured 404 live.
- Stage 2: typecheck 6/6, lint 6/6, build 2/2, `vitest` 25/25 in `apps/api` (auth register/login/me/refresh-rotation/logout/logout-all/password-reset + rate limiter + RBAC), expo web export includes `/auth/login` + `/auth/register`, live containerized smoke test (register → dup CONFLICT → login → me → refresh rotation → stale-token 401 → 5/min login 429 → forgot/reset).
- Stage 3: typecheck 6/6, lint 6/6, build 2/2, `vitest` **59/59** (new: flag hash/constant-time suite, scoring/first-blood math, browse/detail/submit/hint-unlock/idempotency/penalty/RBAC/rate-limit-header/version-snapshot suites), expo web export includes `/challenge/[id]`, live containerized smoke test (search → detail w/ locked hints → wrong→correct flag → first blood 100→110 → dup "already solved" → submission 429 → hint unlock → admin create/update/delete + version snapshot → delete → 404).
- Notable fixes: prisma `Difficulty` enum (like `Role`) must be cast to `@ctf/shared` at boundaries; `requireRole` alone 401s (admin router must run `authenticate` first to populate `req.user`); `migrate diff --from-migrations` needs `migration_lock.toml` (added).
- Notable fixes: tsup over-bundling CJS (safe-buffer `Dynamic require of "buffer"`) → externalize all bare deps; vitest `execSync` fatal `/bin/sh` ENOENT in globalSetup → use `execFileSync(process.execPath, [prismaCli, ...])` (no shell); prisma `Role` enum ↔ @ctf/shared `Role` must be cast at boundary (differing nominal types).

**🔵 Stage 4 — Leaderboard & Realtime — DONE ✅**

| Task | Status |
|---|---|
| Shared: `types/leaderboard.ts` (entries/me/response + `LeaderboardSocketEvent`), `validation/leaderboard.ts`, `LEADERBOARD` constants (SCOPES, MAX_LIMIT 100); `SubmitFlagResponse.rank` | ✅ |
| API: `services/leaderboard.ts` — Redis ZSET global/daily/weekly, `rebuildGlobalScore` (DB backfill), `recordSolve` (ZINCRBY buckets), `getLeaderboard` (top-N + `me` + solves), `getGlobalRank`, `applySolve`; `getUserTotalScore` moved here (avoids submissions↔leaderboard cycle) | ✅ |
| API: `GET /api/leaderboard` (auth-optional, `?scope=global/daily/weekly&limit<=100`), `GET /api/leaderboard/me` (auth); `rank` in every submit response | ✅ |
| API: Socket.IO — namespace `/leaderboard` (handshake JWT auth; anonymous → `unauthorized`), room broadcast `leaderboard:update` on every scored solve via `services/events.ts` bus; `server.ts` now `http.createServer(app)` + `attachSocket` | ✅ |
| Tests: 9 vitest — board ordering + me-rank + daily/weekly buckets + submit `rank` + `/me` 401 + WS: anonymous rejected / auth connects / broadcast on solve (**68/68 total**) | ✅ |
| Mobile: `services/socket.ts` (connect on leaderboard focus, disconnect on blur, fresh token, subscriber registry) + `services/leaderboard.ts`; leaderboard tab rebuilt (scope chips, top-50 rows, you-row highlight, me card, sign-in prompt, refetch on `leaderboard:update`); rank shown in challenge submit result | ✅ |
| Verification: typecheck 6/6, lint 6/6, build 2/2, 68/68 tests (4 consecutive runs stable), expo export incl. `/leaderboard`, live container smoke test | ✅ |

**Verification log (Stage 4):**
- Live smoke (container): register throwaway → anonymous board empty after `lb:*` flush → solve Caesar's Secret → `{pointsAwarded:110, firstBlood:true, totalScore:110, rank:1}` → global board shows solver #1 + `me {rank:1,score:110,solves:1}` → daily scope records 110 → WS: anonymous socket `connect_error: unauthorized`, authenticated socket connects, solve broadcasts `leaderboard:update {type:'solved', userId, username, pointsAwarded:100, scope:'global', at}`. Smoke users/submissions/`lb:*` cleaned afterward (demo board starts empty).
- Notable fixes: `prisma.challenge.create` needs `category:{connect}`/`createdBy:{connect}` and String `flagHash`; stale `lb:*` from pre-Stage-4 runs flushed (rebuilt from DB on next access); DB accumulates published challenges across test runs → list assertions switched to `?limit=100`; top-N assertions became page-agnostic (me via `zscore`/`zrevrank`, not page membership); test lint: `const` for never-reassigned, unused-loop-var renamed `_flag`.

**🔵 Stage 5 — Offline Toolkit — DONE ✅**

| Task | Status |
|---|---|
| `packages/toolkit` — pure TS, no runtime deps (deps install via `npm install`; turbo picks up new workspace automatically), exports `./src/index.ts` like siblings | ✅ |
| Encoding: `utf8ToBytes`/`bytesToUtf8` (TextEncoder/Decoder), base64 (own charset impl, tolerant of whitespace/padding), hex (separator-tolerant), URL percent-encoding manual, ROT13/rot-with-shift | ✅ |
| Ciphers: `caesar`, `vigenere` (letter case-aware, non-letter pass-through), `xorBytes`/`xorWithKey` (repeating-key), `analyzeFrequency` (letter counts+%, top-5 trigrams) | ✅ |
| Hash ID: pattern table MD5/MD4/NTLM (32), SHA-1 (40), SHA-224 (56), SHA-256/SHA3-256 (64), SHA-384 (96), SHA-512/SHA3-512 (128), bcrypt `$2a/b/y$`, Unix `$5$`/`$6$`; returns candidates + charset guess | ✅ |
| JWT: base64url helpers + `decodeJwt` (header/payload JSON, exp/iat, expiry status, structural errors — NO signature verification by design) | ✅ |
| File: `hexDump` (offset+hex+ascii), `sniffFileType` (16 signatures: JPEG/PNG/GIF/WebP/BMP/PDF/ZIP/GZIP/7z/ELF/PE/WAV/MP4/Ogg/FLAC/SQLite/JSON), `parseExif` (JPEG APP1 + TIFF IFD0 incl. GPS IFD → make/model/date/orientation/dims/exposure/ISO/f-ratio + GPS) | ✅ |
| Tests: 63 vitest in `packages/toolkit` (round-trips, edge cases, malformed input, synthetic TIFF/JPEG+EXIF/GPS fixtures) | ✅ |
| Mobile: Toolkit tab rebuilt — section chips (Encoding/Ciphers/Hash ID/JWT/Files), per-tool UI, zero-network (grep shows no fetch/socket/http refs in toolkit path); `@ctf/toolkit` added as dep | ✅ |
| Verification: typecheck/lint/build/test 18/18 turbo (68 API + 63 toolkit), expo export incl. `/toolkit` | ✅ |

**Verification log (Stage 5):**
- 63/63 toolkit tests (incl. real-world vectors: `encodeBase64('Hello, World!')='SGVsbG8sIFdvcmxkIQ=='`, Vigenère `ATTACKATDAWN`+`LEMON`=`LXFOPVEFRNHR`, JWT `{"alg":"HS256"}`→`eyJhbGciOiJIUzI1NiJ9`).
- Live bundle check: `expo export --platform web` shows `/toolkit` (33KB) among 10 static routes; `rg "fetch|axios|WebSocket|socket.io|XMLHttpRequest|http://"` over `packages/toolkit/src` + `toolkit.tsx` = **no network references** (exit criteria met).
- Notable fixes: `xorBytes` must cycle the key (`b[i % b.length]`, not `b[i]`) for inputs longer than the key; `TextDecoder.decode` needs an `ArrayBuffer` view, not `number[]`; JPEG segment walk must skip length bytes; TIFF ASCII values only written when `valueCount*byteSize <= 4` (inline) — test builder had value bytes at the wrong slot.

**🔵 Stage 6 — Terminal & Sandbox — DONE ✅**

| Task | Status |
|---|---|
| Shared: `types/terminal.ts` DTOs/events + `TERMINAL` constants (TTL 1800s, max active 2, max output 64KB) + `terminalSessionIdSchema` (`tm_[a-zA-Z0-9]{16,64}`) — `ReadyResponse` gains `sandbox` dependency | ✅ |
| Database: `TerminalSession` model + `TerminalSessionStatus` enum (CREATING/RUNNING/CLOSED/EXPIRED/FAILED) + `ctf-tm` prefix unused (container name = `ctf-tm-<sessionId>`); migration `20260905082045_add_terminal_sessions` on dev+test | ✅ |
| Sandbox infra: `infrastructure/sandbox/Dockerfile` (alpine:3.20, non-root ctf user, bash) + **SECURITY.md** sign-off (hardening table, threat model, residual risks → gVisor/Firecracker follow-up) | ✅ |
| API sandbox: `utils/workerPool.ts` (bounded concurrency), `services/scheduler.ts` (interval tasks, no-overlap, `runNow`), `services/sandbox/{types,dockerRuntime,fakeRuntime}.ts` — hardened HostConfig (memory/swap 64m, cpu 0.5, pids 64, nofile 64, cap-drop ALL, no-new-privileges, network none, read-only rootfs + noexec tmpfs, AutoRemove, no socket/volumes) | ✅ |
| API terminal: `services/terminalSessions.ts` (create w/ quota 429 + TTL, list, close w/ kill, sendInput, expiry sweep kills + marks EXPIRED-first (race fix), output→`stripAnsi`→`terminalEvents` bus, injectable runtime) + `routes/terminal.ts` (POST/GET/GET:id/DELETE, owner-scoped) + `config/env.ts` `SANDBOX_*`/`TERMINAL_*` + `dockerode` dep | ✅ |
| API ready: `/api/ready` now pings the sandbox daemon (`sandbox` dependency up/down) | ✅ |
| API WS: namespace `/terminal` — handshake JWT auth (shared `websocket/auth.ts`), `terminal:join` (ownership + RUNNING → room `tm:<id>`), `terminal:input`, broadcasts `terminal:output` / `terminal:exit`; `websocket/leaderboard.ts` retains `attachSocket` + wires both namespaces; `server.ts` runs a `Scheduler` `terminal-expiry` sweep (60s) | ✅ |
| Tests: `terminal.test.ts` (lifecycle, quota 429, ownership 404, malformed 400, WS reject anon / join-gate / input→output relay / exit broadcast, TTL expiry sweep), `scheduler.test.ts` + `workerPool.test.ts` (8), docker-gated `sandbox.isolation.test.ts` (hardened config via inspect; in-container non-root + CapEff=0 + zero routes + read-only rootfs + tmpfs + nofile 64; attach round-trip; full service lifecycle w/ real runtime + container-gone) — **93/93 API tests** | ✅ |
| Mobile: `services/terminal.ts` (create/list/get/close via api client; added `api.del`) + `services/terminalSocket.ts` (WS connect/join-ack/input-ack, output/exit/error subscriber registry, fresh token) + Terminal tab rebuilt: session list w/ status, Open session, single bounded monospace output pane (`Fonts.mono`, auto-scroll, 64KB cap) + input row + Close/exit banner | ✅ |
| Docker wiring: `infrastructure/docker/api.Dockerfile` copies `packages/toolkit/package.json` before `npm ci`; `docker-compose.yml` mounts `/var/run/docker.sock:ro` into ctf-api + `SANDBOX_*`/`TERMINAL_*` env | ✅ |
| Verification: turbo typecheck 7/7, lint 7/7, build 2/2, test 93 API + 63 toolkit, expo export incl. `/terminal` (29KB), compose rebuild, live smoke (register → POST session RUNNING → host `ctf-tm-*` container Up → DELETE → CLOSED → container gone) | ✅ |

**Verification log (Stage 6):**
- Live smoke (containerized): POST `/api/terminal/sessions` → `tm_<32hex>` RUNNING → `docker ps` shows `ctf-tm-tm_<id>` Up → DELETE → `status: CLOSED` → `docker ps -a` shows 0 `ctf-tm-*` (AutoRemove). `/api/ready` → `{postgres: up, redis: up, sandbox: up}`.
- Isolation suite: `docker inspect` confirms `User: ctf:ctf`, `CapDrop: ALL`, `no-new-privileges`, `NetworkMode: none`, `ReadonlyRootfs: true`, `Memory 64MiB`, `PidsLimit 64`, `AutoRemove`; in-container exec outputs `UID=10001`, `CAP=0000000000000000`, `ROUTES=0`, `FS=READONLY`, `TMP=TMPOK`, `NOFILE=64`.
- Notable fixes: dockerode `wait()` pre-start resolves instantly on a `Created` container (register wait after `start()`); ANSCII test probe fragile → labeled `key=value` output + `toContain`; TTL sweep vs exit-handler race → expire marks DB **EXPIRED before** killing; `/proc/net/route` has a header line → count `awk 'NR>1'`.

**Currently running:** `docker compose up -d` stack (ctf-postgres :5432, ctf-redis :6379, ctf-api :4000) with **Stage 6** — Socket.IO `/leaderboard` + `/terminal` live, ctf-sandbox image built, demo terminal session smoke cleaned up.

**🟢 Stage 3 — Challenges, Hints & Submissions — DONE ✅**

| Task | Status |
|---|---|
| Database: `Challenge/Category/Tag/ChallengeTag/ChallengeVersion/Hint/HintUnlock/Attachment/Submission/SubmissionAttempt` + `Difficulty` enum (migration `20260905020000_add_challenges` on dev+test) | ✅ |
| Shared: challenge/category/tag/hint/attachment/submission DTOs + Zod schemas + `Difficulty`/`CHALLENGE` constants | ✅ |
| API: salted flag hash + constant-time verify (`@ctf/database` `flag.ts`), scoring (hint penalty, 10% first-blood bonus, idempotent re-submit) | ✅ |
| API: browse (auth-optional, category/difficulty/search/solved filters, pagination), detail (locked hints hide body), hint unlock, per-user+challenge submit rate limit (5/min) | ✅ |
| API: admin CRUD (challenges + hints) via `authenticate`+role-gated `/api/admin/*`; edits snapshot `ChallengeVersion` | ✅ |
| Seed: 8 challenges in 6 categories with hashed flags, hints+penalties, attachments, v1 versions | ✅ |
| Tests: 59 vitest (flag verify, scoring math, browse/detail, submit, first-blood, penalties, idempotency, unlock, RBAC, no-flag-leak) | ✅ |
| Mobile: browser (search + category chips + infinite scroll + solved badge), detail (`react-native-markdown-display`, attachments, hint unlock, flag submit + live score) | ✅ |
| Verification: typecheck 6/6, lint 6/6, build 2/2, 59/59 tests, expo export incl. `/challenge/[id]`, live container smoke test | ✅ |

**🟢 Stage 2 — Authentication & Users — DONE ✅**

| Task | Status |
|---|---|
| Database: `lastLoginAt`/`passwordChangedAt`/`PasswordResetToken` + unique `refreshTokenHash` (migration `20260905010000_add_auth` on dev+test) | ✅ |
| Shared: auth DTOs + Zod schemas + `AUTH` token constants | ✅ |
| API: bcryptjs hashing (+dummy-hash timing equalizer), JWT access + opaque refresh rotation, logout/logoutAll/me/forgot/reset | ✅ |
| API: middleware `authenticate`/`requireRole`/Redis `createRateLimiter`/`validateBody` | ✅ |
| API: `/api/auth/*` routes; limiter on non-health routes | ✅ |
| Seed: real hashed passwords, demo admin + demo user (`ctfpass123`) | ✅ |
| Tests: 25 vitest integration tests | ✅ |
| Mobile: SecureStore + zustand + http client + login/register + auth-aware Profile | ✅ |
| Admin: login screen, localStorage session, gated dashboard | ✅ |
| Live container smoke test (register/conflict/login/me/rotate/429/reset) | ✅ |

---

## 6. Commands

```bash
npm install                                   # install all workspaces
npm run build / typecheck / lint              # turbo-driven (build skips workspaces w/o build script)
npm test --workspace=@ctf/api                  # vitest suite (needs postgres+redis up: docker compose up -d)
npm test --workspace=@ctf/toolkit               # vitest suite for offline toolkit pure functions (no services needed)
npm run dev                                   # turbo parallel dev (api watch + vite + expo)
npm run db:generate                           # prisma generate (DATABASE_URL needed)
npm run db:deploy                             # apply migrations (prod-safe)
npm run db:seed                               # tsx seed (demo admin + demo user, ctfpass123)
docker compose up -d                          # postgres + redis + api
docker compose build api                      # rebuild API image
docker build -t ctf-sandbox:latest infrastructure/sandbox   # sandbox image (auto-built by isolation tests if missing)
cd apps/api && npm run dev                    # API in watch mode on :4000
cd apps/mobile && npm run web                 # Expo web dev
cd apps/admin && npm run dev                  # Vite dev on :5173 (proxies /api → :4000)
npm install-scripts approve <pkg>             # allow blocked postinstall (npm 11)
```

---

## 7. Next Steps

- **Stage 7 — Events, Teams & Competition** (see BUILD_STAGES.md 145–…): event/team leaderboard scopes deferred from Stage 4, team membership, live event competition mode. Per-session transcript recording and kernel-isolated sandbox runtime (gVisor/Firecracker) are documented follow-ups in `infrastructure/sandbox/SECURITY.md`.
- Future-auth hardening backlog (nice-to-have): refresh-token reuse detection (revoke family on reuse); per-user session list in Profile; email worker for production password-reset links (currently dev-link only, gated by `NODE_ENV`).
- Security-sign-off-required changes: auth, flag verification/scoring, RBAC, sandbox/terminal gateway (§14). `SubmissionAttempt.flagAttemptHash` stores only sha256 of guesses by design.