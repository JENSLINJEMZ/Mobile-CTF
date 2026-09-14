# Sandbox & Terminal — How It Works

The "Terminal" feature gives a player an interactive shell aimed at a challenge. Behind the
scenes every session is a **fresh, hardened Docker container** created and streamed by the
API. This file explains the images involved and exactly what happens when a user starts a
terminal.

## 1. The images

### `ctf-sandbox:latest` — the sandbox base image

Defined in `infrastructure/sandbox/Dockerfile`:

- Base: `alpine:3.20`.
- Carries an offline CTF toolset as a single `apk add`: `python3`, `py3-pycryptodome`,
  `openssl`, `binutils` (`strings`, `objdump`), `xxd`, `file`, `jq`, `sqlite`, `bc`,
  `unzip/zip/gzip/xz/bzip2`, `procps`, `nano`, `bash`.
- Deliberately **no network tooling** — the runtime launches every container with
  `--network none`, so `curl`, `nc`, dns, etc. are DOA on purpose.
- Non-root user `ctf` (uid/group `10001`, overridable via `ARG`), login shell bash, `HOME`
  `/home/ctf`, `CMD ["/bin/bash"]`.

Built once on a machine with internet and shipped to the NAS via `docker save`/`load` (see
`docs/NAS-DEPLOYMENT.md`). The API never builds it at runtime — it only **references** it by
name.

### `ctf-api:latest` — the orchestrator

Defined in `infrastructure/docker/api.Dockerfile`. Talks to the Docker daemon through a
mounted socket (`/var/run/docker.sock` → `DOCKER_SOCKET_PATH`). All container creation,
input forwarding and lifecycle management for terminals happens here, in
`apps/api/src/services/sandbox/dockerRuntime.ts`.

### Other images are unrelated

`postgres:16-alpine`, `redis:7-alpine`, `caddy:2-alpine`, `ctf-admin:latest` do not
interact with the sandbox — they are separate compose services.

### How images are handled overall

| Concern                | Mechanism |
| ---------------------- | --------- |
| Build / tag            | workstation: `infrastructure/sandbox/Dockerfile` → `ctf-sandbox:latest`, `infrastructure/docker/*.Dockerfile` → `ctf-api`/`ctf-admin` |
| Transfer (air-gapped)  | `docker save <all> \| ` (to file) → `gzip` → `scp` → `docker load` on NAS |
| Pin at runtime         | `SANDBOX_IMAGE` env (default `ctf-sandbox:latest`); compose sets it explicitly |
| Lifecycle              | every terminal session = one *new* container from this immutable image |

## 2. The hardening envelope

Whatever a player types runs inside a container created with this `HostConfig`
(`dockerRuntime.ts:createContainer`) — this is the security boundary:

| Setting          | Value                                     | Why |
| ---------------- | ----------------------------------------- | --- |
| `Memory`/`MemorySwap` | `SANDBOX_MEMORY_MB` (default 64 MB) | RAM ceiling, no swap escape |
| `CpuQuota`/`CpuPeriod` | `SANDBOX_CPUS` (default 0.5 core)   | CPU share cap |
| `PidsLimit`      | `SANDBOX_PIDS_LIMIT` (default 64)         | kills fork bombs defensively |
| `CapDrop`        | `["ALL"]`                                 | no capabilities at all |
| `SecurityOpt`    | `["no-new-privileges"]`                   | blocks setuid escalation |
| `NetworkMode`    | `"none"`                                  | no network, period |
| `ReadonlyRootfs` | `true`                                    | image FS is read-only |
| `Tmpfs`          | `/tmp` and `/home/ctf`, `rw,noexec,nosuid,nodev,size=8m` | writable scratch without exec |
| `User`           | `ctf:ctf` (uid 10001)                     | non-root in-container |
| `Ulimits`        | `nofile` 64/64                            | fd ceiling |
| `AutoRemove`     | `true`                                    | container cleaned when it stops |
| `WorkingDir`     | `/home/ctf`                               | prompt/scratch dir |

Plus the environment is minimal: `TERM=dumb`, `HOME=/home/ctf`. Command is `/bin/bash`
with `OpenStdin`, `Tty: true`.

The full threat model and hardening table live in `infrastructure/sandbox/SECURITY.md`.

## 3. What happens when a user starts a terminal

### 3.1 Session created (HTTPS/REST layer)

1. App calls `POST /api/terminal/sessions` with a JWT (`routes/terminal.ts:23`).
2. `authenticate` resolves the user (`routes/terminal.ts:21`).
3. `createTerminalSession` (`services/terminalSessions.ts:69`):
   - `assertSandboxAvailable()` — if `SANDBOX_ENABLED` and `docker ping` fails 🡒 503.
   - Session-limit check: count `CREATING|RUNNING` for the user vs
     `TERMINAL_MAX_ACTIVE_PER_USER` 🡒 429 if over.
   - Insert row `status: CREATING`, `expiresAt = now + TERMINAL_TTL_SECONDS`, id like
     `tm_<32 hex>`.
4. The next step is the only Docker I/O on this path.

### 3.2 Container brought up (Docker layer)

`runtime.create(sessionId)` 🡒 serialized by a `WorkerPool`
(`SANDBOX_CREATE_CONCURRENCY`) 🡒 `createNow` (`dockerRuntime.ts:95`):

1. `createContainer(sessionId)`:
   - name `ctf-tm-<sessionId>`, image `ctf-sandbox:latest`, the hardened `HostConfig` above.
   - name-conflict (409) → force-remove the stale container + retry once
     (`dockerRuntime.ts:156`).
2. `container.attach({ stream, stdin, stdout, stderr, hijack })` → one **Duplex** stream:
   `write()` = stdin, `data` events = stdout/stderr merged.
3. `container.start()`.
4. `trackExit` registers `container.wait({ condition: "not-running" })` — resolves with the
   exit code when the container stops; deregisters the instance from the in-memory map.
5. The instance `{containerId, stream, exited}` is stored under the session id.

### 3.3 Session marked running

Back in `terminalSessions.ts:102` the row flips to `RUNNING` with the `containerId` stored.
`wireOutputStream` (`terminalSessions.ts:128`) starts forwarding container output:

- attach-stream `data` → `stripAnsi(chunk, TERMINAL_MAX_OUTPUT_LENGTH)` → emit
  `terminalEvents` `output` event. Output is broadcast to the socket room for the session.

### 3.4 Live streaming (Socket.IO layer)

The app connects to the `/terminal` namespace (`websocket/terminal.ts`), authenticated by
handshake token (`websocket/auth.ts`):

- `terminal:join {sessionId}` → server checks the user owns the session and it is `RUNNING`,
  then joins the socket to room `tm:<sessionId>` (`websocket/terminal.ts:76`).
- The namespace forwards `terminalEvents` to that room: `terminal:output`, `terminal:exit`,
  `terminal:crash` (`websocket/terminal.ts:61-73`).

### 3.5 Input — with a destructive-command guard

Player keystrokes → `terminal:input {sessionId, data}` (`websocket/terminal.ts:99`):
- must be in room, ≤ 16 KiB, `data` a string.
- `sendTerminalInput` (`terminalSessions.ts:223`): load row, require `RUNNING`.
- **`scanDestructiveInput(data)`** (`sandbox/destructiveGuard.ts`) tokenizes/regexes for
  hostile lines — `rm -rf` on root/system paths, `dd of=/dev/sd*`, `mkfs`, fork bombs,
  recursive `chmod/chown /`, device redirects, `shutdown/reboot`, `shred` of system paths.
  - on a hit → `crashTerminalSession` (**status `CRASHED`** with the reason **before**
    killing, so the exit-handler can't race it into `CLOSED`) → broadcast
    `terminal:crash`/`terminal:output` → `runtime.kill` → 409 `SANDBOX_CRASHED`
    ("press Reassemble").
  - clean input → `runtime.write(containerId, data)` → straight into the container's stdin.
- Container output comes back on the attach stream (3.3) and reaches the screen.

### 3.6 End-of-life paths

| Path | Trigger | Result |
| ---- | ------- | ------ |
| User closes | `DELETE /api/terminal/sessions/:id` (`closeTerminalSession`) | `runtime.kill(containerId)` → row `CLOSED` |
| Container exits | `observeExit` → `handleContainerExit` (`terminalSessions.ts:157`) | row `CLOSED`, emit `terminal:exit` (unless already `CRASHED`) |
| Guard fired | input scan (3.5) | row `CRASHED` + reason, emit `terminal:crash`, container killed |
| TTL expired | `expireTerminalSessions` sweep, every 60 s via `Scheduler` (`server.ts:17`) | row `EXPIRED` then container killed |
| Container failed to start | exception in `createTerminalSession` | row `FAILED`, 502 |

`AutoRemove: true` guarantees the container is gone once stopped — no cleanup caller needed.

### 3.7 Reassemble

A `CRASHED`/`FAILED` session can be rebuilt in place:
`POST /api/terminal/sessions/:id/reassemble` (`terminalSessions.ts:304`) creates a **new**
container under the **same** session id (same socket room, same stream wiring), flips the row
back to `RUNNING`, clears `crashReason`, resets `expiresAt` (fresh TTL), and prints a
"reassembled" banner to the room.

## 4. Runtime knobs (env)

From `apps/api/src/config/env.ts`:

| Env                     | Default      | Purpose |
| ----------------------- | ------------ | ------- |
| `SANDBOX_ENABLED`       | `true`       | `"false"` disables; `/api/ready` reports sandbox down |
| `SANDBOX_IMAGE`         | `ctf-sandbox:latest` | image to launch containers from |
| `DOCKER_SOCKET_PATH`    | `/var/run/docker.sock` | daemon socket for dockerode |
| `SANDBOX_CREATE_CONCURRENCY` | 4      | WorkerPool width for container creates |
| `SANDBOX_MEMORY_MB`     | 64           | per-container RAM cap |
| `SANDBOX_CPUS`          | 0.5          | per-container CPU cap (quota/period) |
| `SANDBOX_PIDS_LIMIT`    | 64           | per-container pid limit |
| `TERMINAL_TTL_SECONDS`  | 1 h          | session lifetime, refreshed on reassemble |
| `TERMINAL_MAX_ACTIVE_PER_USER` | 3    | concurrent sessions per user |
| `TERMINAL_MAX_OUTPUT_LENGTH`   | 4096 | per-chunk output cap before ANSI strip |

## 5. Health/observability

- `GET /api/ready` (`routes/ready.ts`) runs postgres/redis checks plus `sandbox.isAvailable()`
  (docker ping) and reports `up`/`down` for each — the sandbox row is the "can we spawn
  containers" probe.
- Log lines: `sandbox container started`, `sandbox container exited`, `sandbox container
  reassembled`, `expired terminal sessions` (`services/terminalSessions.ts` /
  `services/sandbox/dockerRuntime.ts`).

See also: `infrastructure/sandbox/SECURITY.md` (threat model), `docs/NAS-DEPLOYMENT.md`
(deploy/ship workflow), `apps/api/src/services/sandbox/dockerRuntime.ts` and
`apps/api/src/services/terminalSessions.ts` for the authoritative code.