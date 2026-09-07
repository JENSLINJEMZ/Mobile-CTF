# Deployment Runbook

Target topology for this monorepo:

```
            ┌───────────────┐   /api    ┌───────────────────────────────┐
  Browser ──▶  Nginx :443  ────────────▶  ctf-api :4000 (Node/Express) │
  (admin +  │   TLS/HTTP2  │            ├── PostgreSQL :5432 (ctf_dev) │
   mobile   └───────────────┘            ├── Redis :6379                │
   web)                                   └── Docker socket (sandbox)    │
                                                │
                                          ctf-tm-<id> sandbox containers
```

The whole thing runs under `docker compose` (`name: ctf-platform`). The API image is
self-contained (build-time `npm ci` + `tsup` bundle); static assets (admin Vite build,
mobile web export) are served by Nginx.

## Stack

| Service    | Image                 | Port | Data                                |
| ---------- | --------------------- | ---- | ----------------------------------- |
| ctf-postgres | postgres:16-alpine  | 5432 | `postgres_data` volume               |
| ctf-redis  | redis:7-alpine        | 6379 | `redis_data` volume                  |
| ctf-api    | `ctf-platform-api`    | 4000 | `file_storage` volume (uploads)      |
| ctf-sandbox| ctf-sandbox:latest     | —    | ephemeral, AutoRemove, net-none      |

## Deploying a new API version

1. **Run tests locally first** (`npm test --workspace=@ctf/api` needs postgres+redis up).
2. **Apply schema migrations to the staging/prod DB _before_ starting the new image**
   (see Migration runbook). Point `DATABASE_URL` at the target DB:
   ```bash
   DATABASE_URL='postgresql://ctf:ctf@dbhost:5432/ctf_prod' \
     npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
   ```
3. Rebuild and restart:
   ```bash
   docker compose build api
   docker compose up -d api
   ```
4. Verify health + a smoke request:
   ```bash
   curl -s https://ctf.example.com/api/ready        # all deps up
   curl -s -X POST .../api/auth/login -d '{"email":"admin@ctf.example","password":…}'
   ```
5. Watch logs for a clean boot (`docker compose logs api --tail 50`) — scheduler task
   `terminal-expiry` registers, `API listening` on :4000.

### Rollback

- Migrations are forward-only (no down files). To roll back a *code* release: rebuild from
  the previous git tag and restart. If a new migration was applied, roll back the DB
  manually (backup first) — never ship code newer than the applied migrations.

## Configuration

Env is injected via the compose `environment` block (production) or `.env` for local dev.
Required secrets in prod:

| Variable            | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Sign access + refresh tokens     |
| `DATABASE_URL`      | Postgres connection (service name in compose network)          |
| `REDIS_URL`         | Redis connection                                              |
| `CORS_ORIGINS`      | Comma-separated allowed browser origins                        |
| `EXPO_ACCESS_TOKEN` | Expo push API auth token (empty = unauthenticated push)       |
| `SANDBOX_*`         | Sandbox limits; `SANDBOX_ENABLED=true` requires the Docker socket mount |

Rate limits and file-service knobs (`RATE_LIMIT_*`, `FILE_*`) have sane defaults.

## Staging configuration

Use an env-file override per environment; do not fork `docker-compose.yml`:

```yaml
# docker-compose.staging.yml
services:
  api:
    environment:
      DATABASE_URL: postgresql://ctf:ctf@postgres:5432/ctf_staging
      FILE_STORAGE_DIR: /repo/apps/api/storage/files
      SANDBOX_ENABLED: "true"
volumes:
  file_storage:
```
Run with `docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d`.

## Nginx / TLS

Production server config lives in `infrastructure/nginx/nginx.conf` (TLS termination,
HTTP→HTTPS redirect with a certbot webroot hook, admin + mobile-web static hosting,
and a reverse proxy of `/api/` with Socket.IO websocket upgrades to the `api` compose
service). Mount it as `/etc/nginx/nginx.conf` on the host (or in an `nginx` service on
the compose network so `api` resolves). Edit the `server_name`, cert paths and static
roots for your domain:

- Static mobile web export → `/srv/ctf/web` (`npx expo export --platform web` output)
- Admin Vite build → `/srv/ctf/admin`
- `client_max_body_size 30m` ≥ `FILE_MAX_BYTES` + upload overhead
- `/api/` proxies to the API container with `Upgrade`/`Connection` headers so
  Socket.IO (`/api/socket.io`) upgrade requests flow through

TLS via certbot: `certbot certonly --webroot -w /var/www/certbot -d ctf.example.com`
(renew via a nightly `certbot renew` + `nginx -s reload`). Note: the mobile app talks to
the API over HTTPS too — point `EXPO_PUBLIC_API_URL=https://ctf.example.com/api` at build time.

## Mobile release (EAS)

The app ships as a native build through EAS (`apps/mobile/eas.json`). Three profiles:

| Profile       | Distribution | Notes                                      |
| ------------- | ------------ | ------------------------------------------ |
| development   | internal     | dev client; `developmentClient: true`      |
| preview       | internal     | ad-hoc/TestFlight-style test build         |
| production    | store        | `autoIncrement: true` store versioning     |

Workflow:

1. One-time: `cd apps/mobile && npx eas init` to create the project and record its
   `projectId`. Run `npx eas set-project-id` (or add
   `"extra": { "eas": { "projectId": "<id>" } }` to `app.json`) so the client can tag
   push tokens with the project; KEEP `EXPO_PUBLIC_EAS_PROJECT_ID` empty otherwise.
2. Set the store URL: replace every `ctf.example.com/api` in `eas.json` `env` (and the
   equivalent `EXPO_PUBLIC_API_URL` value wherever the app is built).
3. Fill the `submit.production` credentials (Apple `appleId`/`ascAppId`/`appleTeamId`,
   Android service-account JSON path) before first store submission.
4. Build + submit: `npx eas build --profile production` then
   `npx eas submit --profile production`.
5. Push notifications: enable `FCM_V2`/production push in `eas credentials`, store the
   Expo access token as `EXPO_ACCESS_TOKEN` for the API, and verify on a device
   (see `PUSH_NOTIFICATIONS.md`).

## Migration runbook

- Migrations live in `packages/database/prisma/migrations/`, generated by
  `prisma migrate dev --create-only` then applied to dev + test. Never hand-edit an
  applied migration.
- `Prisma` table/column names are deliberately non-mapped (PascalCase), and several
  services use raw SQL — any migration touching `Submission/Challenge/User` must be
  paired with an analytics-service test.
- Applying to an existing DB: `npx prisma migrate deploy` (idempotent, records in
  `_prisma_migrations`).
- The API does **not** auto-migrate on boot — migrations are a deploy-time step, run
  before image swap, so old containers pinning the old schema never see new tables.
- In the dev compose stack you can migrate from inside the running container:
  `docker compose exec api npx prisma migrate deploy` (image ships prisma + schema).

## Release sign-off checklist

- [ ] `turbo typecheck lint build` green (16/16 tasks, only pre-existing API test warnings)
- [ ] API suite green: `npm test --workspace=@ctf/api` (167 tests incl. stage10)
- [ ] toolkit + mobile suites green (`@ctf/toolkit`, `@ctf/mobile`)
- [ ] Migrations applied to the target DB, `_prisma_migrations` recorded
- [ ] `docker compose build api` clean; `docker compose config` validates
- [ ] `/api/ready` shows postgres/redis/sandbox up
- [ ] Nginx serving admin + mobile web over TLS; `/api/socket.io` upgrade verified via ws client
- [ ] `expo export --platform web` export tested under `/srv/ctf/web`
- [ ] EAS `development`/`preview`/`production` profiles build; `eas.json` env points at the prod API
- [ ] Demo flow regression: register → browse → submit correct flag → leaderboard → terminal open/close → notifications + push registration
- [ ] Security sign-off (BLOCKING): auth, flag verification/scoring, RBAC, sandbox/terminal gateway changes reviewed (see `infrastructure/sandbox/SECURITY.md`)
- [ ] Push: device on a dev/EAS build receives an announcement push (see PUSH_NOTIFICATIONS.md)

See also: `HOW_TO_RUN.md` (local dev), `BUILD_STAGES.md` (spec), `MEMORY.md` (build log).