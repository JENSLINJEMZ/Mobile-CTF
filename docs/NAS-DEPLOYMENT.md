# NAS Deployment — Workflow Runbook

How the Mobile-CTF stack was stood up on the home NAS and how to repeat/update it.

## The environment it runs on

- **Host:** OpenMediaVault 8 (Debian 13 `trixie`), hostname `jemzi`, `192.168.4.111`.
- **Hardware:** AMD PRO A4-4350B (2 cores), 3.7 GB RAM + 3.8 GB swap, single 465 GB SSD.
- **Existing workloads (left untouched):** OMV web GUI (nginx `:80`), Samba `:139/445`,
  Nextcloud (Apache `:8080`, data on the secondary disk), MariaDB (local `127.0.0.1:3306`).
- **Constraint that shapes everything:** the NAS has **no outbound internet**. Nothing can
  be pulled, `apt`-installed, or `npm ci`-ed there. Every image must be built on a machine
  that has internet and shipped over the LAN.

> Note: the workstation used for the original deploy also had a broken docker build path —
> the daemon wedged committing big `RUN` layers. Installing the BuildKit frontend
> (`docker-buildx`) into `~/.docker/cli-plugins` fixed it. If `docker build` stalls after a
> `npm ci` step, install/modernize the buildx plugin.

## Final topology on the NAS

```
  phone / laptop / browser
        │  http://192.168.4.111
        ├─  :4000  ──▶  ctf-api       (Express + Socket.IO)
        │                   ├── postgres  :5432   ctf-net (internal)
        │                   ├── redis     :6379   ctf-net (internal)
        │                   └── docker.sock ──▶  ctf-sandbox containers
        │                                         (ctf-tm-<id>, network none)
        ├─  :5173  ──▶  ctf-admin      (nginx: Vite SPA; proxies /api,/files → api)
        └─  :8443  ──▶  ctf-proxy      (Caddy: /api,/files,/leaderboard,/terminal → api;
                                         root → admin)
```

| Service    | Image             | Host port | Data (on data disk)              |
| ---------- | ----------------- | --------- | -------------------------------- |
| ctf-postgres | postgres:16-alpine | —        | `appdata/ctf/postgres`          |
| ctf-redis  | redis:7-alpine     | —        | `appdata/ctf/redis`             |
| ctf-api    | ctf-api:latest     | 4000      | `appdata/ctf/files` (uploads)   |
| ctf-admin  | ctf-admin:latest   | 5173      | —                               |
| ctf-proxy  | caddy:2-alpine     | 8443      | `appdata/ctf/caddy{,config}`    |
| (runtime)  | ctf-sandbox:latest | —         | ephemeral, AutoRemove, net-none |

## On-NAS file layout

```
/opt/ctf/                          # compose project dir
  docker-compose.yml
  Caddyfile                        # HTTP gateway routes
  .env                             # secrets, mode 600 (never commit)
  scripts/backup.sh                # nightly pg_dump + files rsync, 7-day retention
/srv/dev-disk-by-uuid-…790da3/     # OMV data disk
  appdata/ctf/{postgres,redis,files,caddy,caddy-config}
  backups/ctf/{db,files}
```

Containers stay on an internal `ctf-net` bridge; only the API (4000), admin (5173) and
proxy (8443) expose host ports. Postgres and Redis are never published.

## Building images (workstation, with internet)

```bash
# Build the two app images from the repo root
docker build --progress=plain -f infrastructure/docker/api.Dockerfile   -t ctf-api:latest   .
docker build --progress=plain -f infrastructure/docker/admin.Dockerfile -t ctf-admin:latest .
```

The API image is self-contained: build-time `npm ci` + `tsup` bundle, runtime image carries
`node_modules`, Prisma schema/migrations, and the seed sources so `migrate deploy` + `db:seed`
can run as one-shot containers against the remote DB. The admin image bakes the Vite build
into nginx with an SPA config that proxies `/api` and `/files` to `ctf-api:4000`.

`ctf-sandbox:latest` is built separately (see `docs/SANDBOX.md`). `postgres:16-alpine`,
`redis:7-alpine`, `caddy:2-alpine` are pulled once on the workstation.

## Shipping images (air-gap transfer)

The NAS cannot pull, so everything moves as a Docker save archive:

```bash
# 1. Export ALL runtime images (save to a file, then gzip as SEPARATE step —
#    do not pipe; a broken pipe produced a silently truncated bundle here)
docker save ctf-api:latest ctf-admin:latest ctf-sandbox:latest \
            postgres:16-alpine redis:7-alpine caddy:2-alpine \
            -o ctf-images.tar
gzip -1 -f ctf-images.tar

# 2. Verify BEFORE shipping (the truncation trap)
gzip -t ctf-images.tar.gz && md5sum ctf-images.tar.gz

# 3. Ship
scp ctf-images.tar.gz root@192.168.4.111:/srv/dev-disk-by-uuid-…790da3/appdata/ctf/images/

# 4. Load on the NAS (compare md5 first; keep output to a log)
ssh root@192.168.4.111 'ssh -V; setsid bash -c "docker load -i <path>/ctf-images.tar.gz > /tmp/ctf-load.log 2>&1" …'
```

Notes learned the hard way:
- Verify `gzip -t` on the receiver before `docker load` — a truncated archive fails inside
  the loader with a bare `unexpected EOF`.
- Run long `scp`/`docker load` detached (`setsid ... &`) and poll, or tool/session timeouts
  kill them mid-transfer and leave stale partial files.
- The load log can stay empty for a while — decompression happens before the first
  `Loaded image:` line prints.

## First boot

```bash
ssh root@192.168.4.111
cd /srv/dev-disk-by-uuid-…790da3/appdata/ctf
mkdir -p postgres redis files caddy caddy-config
chown 70:70    postgres     # postgres:16-alpine runs as uid 70
chown 999:999  redis        # redis:7-alpine runs as uid 999
chown 1000:1000 caddy caddy-config   # caddy runs as uid 1000
cd /opt/ctf
docker compose up -d
```

`docker-compose.yml` sets `pull_policy: never` and `restart: unless-stopped` so nothing tries
to phone home and everything survives reboots. `.env` is generated with
`openssl rand -hex 24|32` (hex so the URL-constructed `DATABASE_URL`/`REDIS_URL` need no
escaping).

### Migrations + seed (one-shot containers, same image)

Migrations are a deploy-time step; the API never auto-migrates.

```bash
set -a; . /opt/ctf/.env; set +a
DB="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@ctf-postgres:5432/${POSTGRES_DB}"

docker run --rm --network ctf-net -e DATABASE_URL="$DB" -w /repo \
  ctf-api:latest npx prisma migrate deploy --schema /repo/packages/database/prisma/schema.prisma

docker run --rm --network ctf-net -e DATABASE_URL="$DB" -w /repo \
  ctf-api:latest npx tsx /repo/packages/database/seed/index.ts
```

### Verification (as run)

```bash
curl -s  http://192.168.4.111:4000/api/health   # {"status":"ok",…}
curl -s  http://192.168.4.111:4000/api/ready    # postgres/redis/sandbox all "up"
curl -s  http://192.168.4.111:5173/             # admin UI → 200
curl -s  http://192.168.4.111:8443/api/ready    # through Caddy gateway → ready
curl -s -X POST http://192.168.4.111:8443/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ctf.test","password":"ctfpass123"}'   # JWT pair
```

Sandbox "up" in `/api/ready` means the API reached the Docker daemon through the mounted
socket and can spawn containers.

## Backups

`scripts/backup.sh` dumps Postgres (`pg_dump -Fc` → gzip, 7 dumps kept) and rsyncs the
uploads dir. Installed via cron:

```
crontab -l | grep -v ctf-backup; printf '%s\n' \
 '15 2 * * * /opt/ctf/scripts/backup.sh >> <data-disk>/backups/ctf/backup.log 2>&1' | crontab -
```

Restore, from a dump:

```bash
gunzip -c backups/ctf/db/ctf_<stamp>.dump.gz | \
  docker exec -i ctf-postgres pg_restore -U ctf -d ctf_dev --clean --if-exists
```

## Redeploying a new app version

1. Run migrations against the NAS DB (`docker run … prisma migrate deploy`, idempotent).
2. On the workstation: rebuild `ctf-api:latest`/`ctf-admin:latest`, re-save, `scp`, `docker load`.
3. `ssh root@192.168.4.111 'cd /opt/ctf && docker compose up -d'` (recreates changed services).
4. Re-run seed only if new baseline data is needed; otherwise skip.
5. Re-check `/api/ready` and the login smoke test.

Old images accumulate only as dangling layers until an occasional `docker image prune -f`
on the NAS (safe — loaded images are referenced by compose).

## Things deliberately changed vs. the "typical" runbook

- **Caddy gateway is plain HTTP on `:8443`.** `tls internal` on a nameless `:443` site block
  made Caddy refuse the TLS handshake (alert `internal error`) — no resolvable name exists on
  the LAN. HTTPS can be added later per-service with the real web TLS path
  (`infrastructure/nginx`, docs/DEPLOYMENT.md).
- **Expo push notifications will not send** from the offline NAS (expo-server-sdk needs
  internet). `EXPO_ACCESS_TOKEN` stays empty; the app degrades gracefully.
- **Only terminal/sandbox traffic touches the Docker socket** — the API container mounts
  `/var/run/docker.sock` and nothing else on the host does.

See also: `docs/DEPLOYMENT.md` (generic runbook), `docs/SANDBOX.md` (terminal internals),
`docs/IMPROVEMENT_PLAN.md`.