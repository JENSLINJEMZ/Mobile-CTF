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

Example server block (admin web build + API reverse proxy). Point `root` at the admin
`dist/` (or mobile web export) and proxy `/api` to the API container:

```nginx
server {
  listen 443 ssl http2;
  server_name ctf.example.com;

  ssl_certificate     /etc/letsencrypt/live/ctf.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ctf.example.com/privkey.pem;

  client_max_body_size 30m;                 # >= FILE_MAX_BYTES + upload overhead

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;   # Socket.IO /api/socket.io
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
  }

  location / {
    root /srv/ctf/admin/dist;
    try_files $uri /index.html;
  }
}
```

TLS via certbot: `certbot --nginx -d ctf.example.com`. Note: the mobile app talks to the
API over HTTPS too — point `EXPO_PUBLIC_API_URL=https://ctf.example.com/api` at build time.

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
- [ ] Demo flow regression: register → browse → submit correct flag → leaderboard → terminal open/close → notifications + push registration
- [ ] Security sign-off (BLOCKING): auth, flag verification/scoring, RBAC, sandbox/terminal gateway changes reviewed (see `infrastructure/sandbox/SECURITY.md`)
- [ ] Push: device on a dev/EAS build receives an announcement push (see PUSH_NOTIFICATIONS.md)

See also: `HOW_TO_RUN.md` (local dev), `BUILD_STAGES.md` (spec), `MEMORY.md` (build log).