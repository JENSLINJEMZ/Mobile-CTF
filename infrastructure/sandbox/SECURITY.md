# Container Sandbox — Security Sign-Off

## Scope

Stage 6 ships an in-app terminal whose shell executes inside an isolated,
auto-expiring container. This document records the exact isolation posture,
threat model, and sign-off for that subsystem. It is updated whenever the
sandbox runtime, image, or session lifecycle changes.

## Threat model

The terminal is available to any authenticated user of the mobile app. We
assume a hostile user may try to:

1. Escape the container to the host / docker daemon.
2. Exhaust host resources (CPU, memory, disk, processes, fds).
3. Reach the internal network (postgres, redis, other sandboxes, LAN).
4. Leave orphaned containers behind (quota / TTL evasion).
5. Abuse the terminal protocol (huge payloads, long-lived sessions).

The app itself runs several processes; see `docker-compose.yml` for the
full trust boundary. This sandbox is evaluated **in isolation** and **in
composition** with the rest of the stack.

## Hardening measures (enforced by `DockerSandboxRuntime`)

| UID GID       | Fix                                                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privileges    | Container runs as non-root `ctf(10001):ctf(10001)`, image `USER ctf`.                                                                                                                                          |
| Capabilities  | `--cap-drop ALL`, `--security-opt no-new-privileges` (no NET_RAW, no mount, no ptrace, …).                                                                                                                     |
| Network       | `--network none` — container has no network interface at all.                                                                                                                                                  |
| Root fs       | `--read-only` rootfs; only `/tmp` and `/home/ctf` are re-mounted as writable, noexec `tmpfs` (`size=8m`, `noexec`+`nosuid`+`nodev`).                                                                           |
| Memory        | `--memory=64m --memory-swap=64m` (no swap).                                                                                                                                                                    |
| CPU           | `--cpu-quota=50000 --cpu-period=100000` (~0.5 vCPU).                                                                                                                                                           |
| PIDs          | `--pids-limit=64`.                                                                                                                                                                                             |
| FDs           | `--ulimit nofile=64:64`.                                                                                                                                                                                       |
| Docker access | No `/var/run/docker.sock` mount inside the sandbox (the socket is mounted into `ctf-api` only).                                                                                                                |
| Auto-remove   | Containers are created with `AutoRemove: true` so a crash never leaves an orphan.                                                                                                                              |
| TTL           | Sessions expire after `TERMINAL_TTL_SECONDS` (default 1800 s); an in-process scheduler force-deletes expired containers.                                                                                       |
| Quota         | Max `TERMINAL_MAX_ACTIVE_PER_USER` (default 2) running sessions per user; creation is rejected with 429 beyond that.                                                                                           |
| Create burst  | Container creation runs through a bounded `WorkerPool` (`SANDBOX_CREATE_CONCURRENCY`, default 4).                                                                                                              |
| Template      | One image (`ctf-sandbox:latest`); no per-user images, so a polluted container is deleted, never reused.                                                                                                        |
| Input/output  | Shell I/O is confined to the api->container attach stream (`--network none` means it cannot do anything else with it). ANSI escapes are stripped server-side; output is capped (`TERMINAL_MAX_OUTPUT_LENGTH`). |

The container **never** receives a volume, any host mount, or the docker
socket; it cannot write to the host or the docker daemon through those.

## Residual risks & follow-ups (accepted for Stage 6)

| Risk                                                   | Accepted?                                            | Follow-up                                                                                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Kernel escape (host kernel CVE).                       | Yes, low probability, requires container-escape RCE. | Move to a kernel-isolated runtime: gVisor (`runsc`) or Firecracker microVM. New image `infrastructure/sandbox/` layout keeps the swap simple. |
| CPU/IO side channels across containers.                | Yes, low sensitivity for a single-learner app.       | Kernel isolation above.                                                                                                                       |
| Docker socket (UNIX) ACLs on the host.                 | Yes if host misconfigured.                           | GitHub issue + runbook: restrict `/var/run/docker.sock` to the api container / use the rootless daemon.                                       |
| Attach-stream DoS (slowloris of a session).            | Partially: max TTL + output cap.                     | Stream idle timeout; hard per-session byte budget per tick.                                                                                   |
| No per-command auditing of what runs inside the shell. | Yes.                                                 | Session transcript recording to postgres (size-capped) as a future stage.                                                                     |

## Sign-off

- [x] Quota + TTL enforced and unit-tested.
- [x] Isolation assertions docker-gated tested (`sandbox.isolation.test.ts`):
      no network namespace devices, rootfs read-only, non-root user, missing
      capabilities inside the container, `--cap-drop ALL` honoured.
- [x] `/api/ready` reports sandbox daemon availability.
- [x] Reviewed against the threat model above.

Approved for Stage 6.

Signed: Stage 6 (Terminal & Sandbox) author — 2026-09-05.
