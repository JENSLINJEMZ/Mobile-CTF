# Domain Context — Mobile CTF Platform

Living glossary for the deepened modules and the seams they sit behind. Terms here
name the modules this architecture review agreed to deepen; use them exactly when
suggesting changes so future reviews don't re-litigate the shape.

## Domain concepts

- **Challenge** — a problem set to break; has a flag, difficulty tiers, points.
- **Submission** — a player's flag attempt for a challenge; carry an idempotency key
  so retries and offline replays don't double-score.
- **Solve pipeline** — one module behind the submit-flag seam. It owns scoring,
  first-blood ordering, event/achievement state, and the leaderboard emit. The HTTP
  route is a dispatcher: it invokes the pipeline and nothing else.
- **Leaderboard stream** — the socket invalidations that push updated standings to
  connected clients. Only the solve pipeline emits into it.
- **OfflineSubmissionGateway** — the mobile module a screen calls to submit a flag,
  whether online or offline. It enqueues to persistent storage via `submitFlagViaGateway`,
  builds the idempotency key, and auto-drains the queue on reconnect (started once at
  app root via `startSubmissionGateway`).
- **Auth gate** — the decision a screen makes about anonymous state. Lives in one
  hook (`useAuthGate`), not per screen.
- **Loadable** — the mobile {loading, data, error, retry} surface a screen binds to a
  single load function against (`useLoadable`).

## Toolkit modules

- **base64 module** — one implementation of byte ↔ base64 ↔ base64url; JWT delegates.
- **rotation module** — one shift-based alphabet rotation; `caesar` delegates.

## Store seam

- **store hydration guard** — one idempotent hydration entry point per store
  (`withHydrationGuard`), shared by the auth and notes stores; concurrent triggers
  collapse onto a single run instead of double-hydrating.

## Socket seam

- **connectAuthenticatedSocket** — the single factory for token-authenticated Socket.IO
  clients (terminal, leaderboard, notifications).

## Event read model

- **EventQueries** / **EventLeaderboard** — read-side modules carved from `events.ts`;
  mutations stay behind a single write call. `recordEventSolve` (the only leaderboard
  write) lives with its reads in EventLeaderboard.