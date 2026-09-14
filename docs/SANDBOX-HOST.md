# Where Sandboxes Spawn & Why a Dedicated Docker Host

One physical machine runs **everything**: `192.168.4.111` (Debian 13 / OMV 8, Docker 26).
It hosts both the app containers **and** the per-session sandboxes. This file maps what runs
there, where exactly a sandbox container ends up, and why the sandbox work is delegated to a
dedicated daemon host instead of happening inside the API process or on the workstation.

## 1. Where the Docker sandboxes spawn

```
Player's phone
   │  POST /api/terminal/sessions  (Bearer JWT)
   ▼
ctf-api  (container, 192.168.4.111, port 4000)      ← Express + dockerode
   │
   │  mounts /var/run/docker.sock  (DOCKER_SOCKET_PATH, compose env)
   ▼
Docker daemon of 192.168.4.111 (HOST process)
   │  createContainer("ctf-tm_<sessionId>", Image: ctf-sandbox:latest)
   ▼
ctf-tm_<id>  (ephemeral container, sibling of ctf-api on the SAME host)
   ├─ network: NONE        (cannot talk to any other container)
   ├─ read-only rootfs, non-root ctf user, caps dropped
   ├─ 64 MB RAM / 0.5 CPU / 64 PIDs ceiling
   └─ AutoRemove: true
```

Key point: the API **requests** the spawn but does **not** run a Docker daemon itself.
`DockerSandboxRuntime` (`apps/api/src/services/sandbox/dockerRuntime.ts:52`) is a plain
`dockerode` client; the actual container materializes as a sibling of `ctf-api` on the host
daemon of `192.168.4.111`. Being network-isolated (`NetworkMode: "none"`),
`ctf-tm_*` can't reach `ctf-postgres`, `ctf-redis`, `ctf-admin`, or the API — it is
deliberately cut off from everything else running on the machine.

Every terminal session = one new container: `ctf-tm_<tm_hex-id>`. When it exits/crashes/
expires it is auto-removed (`AutoRemove`), so this list is **always changing** — the steady
set below is the app tier you'll find on the box at any time.

## 2. Everything running on 192.168.4.111

### 2.1 The Mobile-CTF app stack (Docker, project `ctf`, network `ctf-net`)

| Container  | Image             | Published | Purpose |
| ---------- | ----------------- | --------- | ------- |
| ctf-postgres | postgres:16-alpine | — (internal :5432) | main database, data on the data disk `appdata/ctf/postgres` |
| ctf-redis  | redis:7-alpine     | — (internal :6379) | rate limits, sessions/socket state, `requirepass` |
| ctf-api    | ctf-api:latest     | **4000**  | Express + Socket.IO (login, challenges, submit, leaderboard, terminal REST) |
| ctf-admin  | ctf-admin:latest   | **5173**  | admin SPA (nginx; proxies /api + /files → ctf-api) |
| ctf-proxy  | caddy:2-alpine     | **8443**  | HTTP gateway: /api, /files, /leaderboard, /terminal → ctf-api |
| *(ephemeral)* ctf-tm_* | ctf-sandbox:latest | —        | interactive terminal per active session (spawned on demand, net none) |

Host URLs to test:
- API: `http://192.168.4.111:4000/api/...`
- Admin: `http://192.168.4.111:5173`
- Gateway: `http://192.168.4.111:8443/...`

### 2.2 Preexisting host services (NOT part of the CTF stack)

OMV web GUI (nginx :80), Samba (:139/445), Nextcloud (Apache :8080, own data disk),
MariaDB (listening on 127.0.0.1:3306), sshd, plus the nightly backup cron
(`15 2 * * * /opt/ctf/scripts/backup.sh`) → dumps Postgres + rsyncs uploads.

### 2.3 Deployment files

- `/opt/ctf/docker-compose.yml`, `Caddyfile`, `.env` (secrets), `scripts/backup.sh`
- Data disk: `appdata/ctf/{postgres,redis,files,caddy,caddy-config}`, `backups/ctf/*`

Full setup + redeploy steps: `docs/NAS-DEPLOYMENT.md`.

## 3. Why a separate / dedicated server handles the sandbox

The word "separate" means *not on the developer workstation / not inside the API process* —
a dedicated, always-on Docker host. Reasons, in priority order:

1. **Player input is untrusted and hostile.**
   Terminals run arbitrary commands from CTF players, including deliberate break-out
   attempts (the destructive-command guard in `sandbox/destructiveGuard.ts` only catches the
   known patterns). Spawning them next to the app on a real daemon — isolated per container
   with `NetworkMode: none`, read-only rootfs, `CapDrop: ["ALL"]`,
   `SecurityOpt: ["no-new-privileges"]` — means a compromised sandbox cannot touch the
   database, the admin panel, or the network at all.

2. **Only the API may spawn containers.**
   The Docker socket is mounted into *exactly one* container (`ctf-api`). Sandbox creation
   is therefore funneled through one code path (`terminalSessions` → `DockerSandboxRuntime`)
   that applies limits and the input guard; no other service (or the sandboxes themselves)
   can reach the daemon.

3. **Resource containment protects the host.**
   Every sandbox is capped at 64 MB RAM / 0.5 CPU / 64 PIDs, and creation is serialized by a
   WorkerPool (`SANDBOX_CREATE_CONCURRENCY`, default 4). Even if every player spams
   terminals, the API/DB on the same 3.7 GB box stay responsive.

4. **The NAS is the always-on production boundary.**
   The workstation is a dev machine (sleep, reboot, local daemon with limited resources); the
   NAS is a 24/7 appliance on the LAN with the data disk and backups. Sandboxes live beside
   the database and uploads they serve, keeping terminal latency and traffic local to
   192.168.4.111.

5. **No Docker-in-Docker.**
   Running a nested daemon inside `ctf-api` would be fragile, heavier, and a larger attack
   surface. The socket-forward pattern gives the same "API orchestrates containers" result
   with a single daemon and zero extra moving parts.

6. **Sandbox image stays decoupled from app code.**
   `ctf-sandbox:latest` is built/shipped independently (`SANDBOX_IMAGE` env) and only
   *referenced* by the API — you can update the sandbox image and redeploy without rebuilding
   the API, and the API can be pointed at any Docker host by changing
   `DOCKER_SOCKET_PATH`.

### Honest caveat: it is one physical host, not two

There is no second server in the current topology. "Separate server" = dedicated host
distinct from the workstation/phones, with a strict **two-tier container split on the same
daemon**: the `ctf-net` app tier, and the ephemeral network-less sandbox tier. The follow-up
hardening (gVisor/Firecracker kernel-level isolation, or moving sandboxes onto a physically
separate Docker node) is documented as future work in `infrastructure/sandbox/SECURITY.md`.

See also: `docs/SANDBOX.md` (session lifecycle), `docs/NAS-DEPLOYMENT.md` (deploy runbook).