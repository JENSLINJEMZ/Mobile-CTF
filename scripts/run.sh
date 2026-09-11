#!/usr/bin/env bash
#
# run.sh — one command to bring up the full Mobile CTF platform for local dev.
#
#   ./scripts/run.sh                    start everything (default)
#   ./scripts/run.sh stop               stop api / metro / admin (docker stays up)
#   ./scripts/run.sh status             show what is running
#   ./scripts/run.sh logs <service>     tail a service log (api|metro|admin|infra)
#
# Options (start):
#   --admin            also start the admin dashboard (vite, port 5173)
#   --device           set up adb reverse tunnels for a physical phone
#   --no-infra         skip postgres + redis containers
#   --no-sandbox       skip ensuring the ctf-sandbox terminal image
#   --no-db            skip prisma generate + deploy + seed
#   --no-seed          run migrations but skip seeding
#   --rebuild-sandbox  force a rebuild of the sandbox image
#   --reset-cache      start Metro with a cleared cache
#   --down             (stop) also stop the postgres/redis containers
#   -h|--help          this help
#
# Dev runs the API on the host (tsx watch). The compose `api` service exists
# for prod-style deployment only and is intentionally never started here.
# The terminal sandbox is an ephemeral container (ctf-sandbox:latest) spawned
# by the API through the host docker daemon.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
cd "$ROOT"

# This dev box restricts PATH; make standard tools discoverable in all cases.
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

RUNDIR="$ROOT/.run"
mkdir -p "$RUNDIR"

API_PORT=4000
WEB_PORT=8081
ADMIN_PORT=5173
SANDBOX_IMAGE="ctf-sandbox:latest"

CYAN='\033[1;36m'; GREEN='\033[1;32m'; YELLOW='\033[1;33m'; RED='\033[1;31m'; RESET='\033[0m'

say()  { printf "${CYAN}[ctf]${RESET} %s\n" "$*"; }
ok()   { printf "${GREEN}ok${RESET}   %s\n" "$*"; }
warn() { printf "${YELLOW}warn${RESET} %s\n" "$*" >&2; }
die()  { printf "${RED}error${RESET} %s\n" "$*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "required tool not found: $1 (see HOW_TO_RUN.md)"; }

# ---- flags ------------------------------------------------------------------

INFRA=1 SANDBOX=1 DB=1 SEED=1 ADMIN=0 DEVICE=0 REBUILD_SANDBOX=0 RESET_CACHE=0 DOWN=0

usage() { cat <<EOF
Usage: ./scripts/run.sh [command] [options]

Commands:
  start                 bring everything up (default)
  stop                  stop api / metro / admin (docker stays up unless --down)
  status                show what is running
  logs <api|metro|admin> tail a service log
  -h | --help           this help

Options (start):
  --admin               also start the admin dashboard (vite, port 5173)
  --device              set up adb reverse tunnels for a physical phone
  --no-infra            skip postgres + redis containers
  --no-sandbox          skip ensuring the ctf-sandbox terminal image
  --no-db               skip prisma generate + deploy + seed
  --no-seed             run migrations but skip seeding
  --rebuild-sandbox     force a rebuild of the sandbox image
  --reset-cache         start Metro with a cleared cache
  --down                (stop) also stop the postgres/redis containers

Dev runs the API on the host (tsx watch). The compose api service exists for
prod-style deployment only and is never started here. The terminal sandbox is
an ephemeral ctf-sandbox container spawned by the API via the host docker daemon.
EOF
}

parse() {
  CMD="${1:-start}"
  if [ "${1:-}" = "start" ] || [ "${1:-}" = "stop" ] || [ "${1:-}" = "status" ] || [ "${1:-}" = "logs" ]; then
    CMD="$1"; shift || true
  elif [ -n "${1:-}" ] && [ "${1#-}" != "$1" ]; then
    # bare flag (e.g. `run.sh --device`) implies the default start command
    CMD=start
  fi
  while [ $# -gt 0 ]; do
    case "$1" in
      --admin) ADMIN=1 ;;
      --device) DEVICE=1 ;;
      --no-infra) INFRA=0 ;;
      --no-sandbox) SANDBOX=0 ;;
      --no-db) DB=0 ;;
      --no-seed) SEED=0 ;;
      --rebuild-sandbox) REBUILD_SANDBOX=1 ;;
      --reset-cache) RESET_CACHE=1 ;;
      --down) DOWN=1 ;;
      -h|--help) usage; exit 0 ;;
      *) die "unknown flag '$1' (try ./scripts/run.sh --help)" ;;
    esac
    shift
  done
}

# ---- helpers ----------------------------------------------------------------

port_open() {
  if (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; then
    exec 3>&- 3<&- || true
    return 0
  fi
  return 1
}

is_running() { [ -f "$RUNDIR/$1.pid" ] && kill -0 "$(cat "$RUNDIR/$1.pid")" 2>/dev/null; }

start_process() {
  local name="$1" workdir="$2"; shift 2
  if is_running "$name"; then
    warn "$name already running (pid $(cat "$RUNDIR/$name.pid"))"
    return 0
  fi
  local log="$RUNDIR/$name.log"
  : > "$log"
  # Detach fully: new session (setsid), stdin from /dev/null, output to the
  # log file, and exec-chain so the stored pid is the long-running process.
  nohup setsid bash -c 'cd "$1" && shift && exec "$@"' _ "$workdir" "$@" \
    >> "$log" 2>&1 < /dev/null &
  echo $! > "$RUNDIR/$name.pid"
  ok "$name started (pid $(cat "$RUNDIR/$name.pid")) — logs: .run/$name.log"
}

stop_process() {
  local name="$1" pattern="$2"
  local pid=""
  [ -f "$RUNDIR/$name.pid" ] && pid="$(cat "$RUNDIR/$name.pid")"
  local killed=0
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    # services launch detached (setsid) so -PID signals the whole group,
    # including the npm/tsx/expo watcher children.
    kill -TERM -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    local i
    for i in $(seq 1 10); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.2
    done
    kill -0 "$pid" 2>/dev/null && kill -KILL -- "-$pid" 2>/dev/null || true
    killed=1
  fi
  local found
  found="$(pgrep -f "$pattern" 2>/dev/null || true)"
  if [ -n "$found" ]; then
    kill $found 2>/dev/null || true
    killed=1
  fi
  rm -f "$RUNDIR/$name.pid"
  if [ "$killed" = 1 ]; then ok "$name stopped"; else warn "$name was not running"; fi
}

wait_for() {
  local name="$1" timeout_s="$2"; shift 2
  local i=0
  while [ "$i" -lt "$timeout_s" ]; do
    if "$@" 2>/dev/null; then ok "$name ready"; return 0; fi
    sleep 1
    i=$((i + 1))
  done
  warn "$name not ready within ${timeout_s}s — check .run/ logs"
  return 1
}

wait_port() { wait_for "$1 (:${2})" "$3" port_open "$2"; }
wait_http() { wait_for "HTTP $1" "$2" bash -c "command -v curl >/dev/null 2>&1 && curl -fsS '$3' >/dev/null"; }

# ---- steps ------------------------------------------------------------------

step_infra() {
  say "-> infra (postgres / redis)"
  need docker
  if docker compose version >/dev/null 2>&1; then
    docker compose up -d --wait postgres redis
  else
    # No compose plugin: reuse or (re)create the two named containers directly.
    ensure_container ctf-postgres postgres:16-alpine \
      -e POSTGRES_USER=ctf -e POSTGRES_PASSWORD=ctf -e POSTGRES_DB=ctf_dev \
      -p 5432:5432 -v ctf_postgres_data:/var/lib/postgresql/data
    ensure_container ctf-redis redis:7-alpine \
      -p 6379:6379 -v ctf_redis_data:/data
  fi
  docker exec ctf-postgres pg_isready -U ctf -d ctf_dev >/dev/null 2>&1 \
    && ok "postgres healthy (:5432)" || warn "postgres not healthy yet"
  docker exec ctf-redis redis-cli ping >/dev/null 2>&1 \
    && ok "redis healthy (:6379)" || warn "redis not healthy yet"
}

ensure_container() {
  local name="$1" image="$2"; shift 2
  if docker inspect "$name" >/dev/null 2>&1; then
    local state
    state="$(docker inspect -f '{{.State.Running}}' "$name")"
    [ "$state" = "true" ] || docker start "$name" >/dev/null 2>&1 || true
  else
    docker run -d --name "$name" --restart unless-stopped "$@" "$image" >/dev/null
  fi
}

step_sandbox() {
  say "-> terminal sandbox image"
  need docker
  if [ "$REBUILD_SANDBOX" = 1 ] || ! docker image inspect "$SANDBOX_IMAGE" >/dev/null 2>&1; then
    docker build -t "$SANDBOX_IMAGE" infrastructure/sandbox
    ok "$SANDBOX_IMAGE built"
  else
    ok "$SANDBOX_IMAGE present (--rebuild-sandbox to force)"
  fi
}

step_db() {
  say "-> database (prisma)"
  need npm
  if [ ! -e packages/database/.env ]; then
    ln -sf ../../.env packages/database/.env
    ok "linked packages/database/.env"
  fi
  npm run db:generate
  npm run db:deploy
  if [ "$SEED" = 1 ]; then
    npm run db:seed
  else
    ok "skipped seed"
  fi
}

step_services() {
  local extra=""
  [ "$ADMIN" = 1 ] && extra=" + admin"
  say "-> services (api / metro${extra})"
  if port_open "$API_PORT"; then
    warn "API already listening on :$API_PORT — skipping"
  else
    start_process api apps/api bash -c 'exec npm run dev --workspace=@ctf/api'
  fi

  if port_open "$WEB_PORT"; then
    warn "Metro already listening on :$WEB_PORT — skipping"
  else
    if [ "$RESET_CACHE" = 1 ]; then
      start_process metro apps/mobile bash -c 'exec npx expo start --port 8081 --clear'
    else
      start_process metro apps/mobile bash -c 'exec npx expo start --port 8081'
    fi
  fi

  if [ "$ADMIN" = 1 ]; then
    if port_open "$ADMIN_PORT"; then
      warn "admin already listening on :$ADMIN_PORT — skipping"
    else
      start_process admin . bash -c 'exec npm run dev --workspace=@ctf/admin'
    fi
  fi
}

step_device() {
  say "-> adb reverse tunnels"
  need adb
  if adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 && adb reverse tcp:4000 tcp:4000 >/dev/null 2>&1; then
    ok "adb tunnels: 8081 (metro) and 4000 (api) forwarded to phone"
  else
    warn "adb reverse failed — is the phone connected? re-run with '--device' once it is"
  fi
}

step_wait() {
  say "-> waiting for services"
  wait_http "API" 60 "http://127.0.0.1:$API_PORT/api/health" || true
  wait_for "Metro" 60 bash -c "curl -fsS 'http://127.0.0.1:$WEB_PORT/status' 2>/dev/null | grep -q 'packager-status:running'" || true
}

print_urls() {
  printf "\n"
  printf "${CYAN}  Mobile (Expo Go) ${RESET} exp://127.0.0.1:%s   (or http://localhost:%s on web)\n" "$WEB_PORT" "$WEB_PORT"
  printf "${CYAN}  API              ${RESET} http://localhost:%s   (health: /api/health)\n" "$API_PORT"
  [ "$ADMIN" = 1 ] && printf "${CYAN}  Admin            ${RESET} http://localhost:%s\n" "$ADMIN_PORT"
  printf "${CYAN}  Postgres / Redis ${RESET} :5432 / :6379 (docker)\n"
  [ "$DEVICE" = 1 ] && printf "${CYAN}  Phone            ${RESET} scan the Metro QR in Expo Go, or deep-link exp://127.0.0.1:%s\n" "$WEB_PORT"
  printf "\n${CYAN}  logs:  ./scripts/run.sh logs api | metro | admin\n"
  printf "${CYAN}  stop:  ./scripts/run.sh stop\n\n"
}

# ---- commands ---------------------------------------------------------------

cmd_start() {
  [ -f .env ] || die "missing .env — copy .env.example to .env first (see Step 1 of HOW_TO_RUN.md)"
  say "Mobile CTF platform — starting"
  [ "$INFRA" = 1 ] && step_infra
  [ "$SANDBOX" = 1 ] && step_sandbox
  [ "$DB" = 1 ] && step_db
  step_services
  [ "$DEVICE" = 1 ] && step_device || true
  step_wait
  print_urls
}

cmd_stop() {
  say "stopping managed services"
  stop_process api   "tsx watch src/server.ts"
  stop_process metro "expo start --port 8081"
  stop_process admin "apps/admin.*vite"
  if [ "$DOWN" = 1 ]; then
    say "stopping docker containers"
    docker stop ctf-postgres ctf-redis >/dev/null 2>&1 || true
    ok "containers stopped"
  else
    say "postgres/redis left running (use 'stop --down' to stop them)"
  fi
}

cmd_status() {
  say "status"
  local name
  for name in api metro admin; do
    if is_running "$name"; then
      ok "$name running (pid $(cat "$RUNDIR/$name.pid"))"
    else
      warn "$name not running"
    fi
  done
  local c
  for c in ctf-postgres ctf-redis; do
    if docker inspect "$c" >/dev/null 2>&1; then
      ok "$c $(docker inspect -f '{{.State.Status}}' "$c")"
    else
      warn "$c absent"
    fi
  done
  if command -v ss >/dev/null 2>&1 && ss -tln 2>/dev/null | grep -qE ':(4000|8081|5173|5432|6379) '; then
    say "ports 4000(api) 8081(metro) 5173(admin) 5432(pg) 6379(redis)"
  else
    warn "no service ports listening"
  fi
}

cmd_logs() {
  local name="${1:-}"
  case "$name" in
    api|metro|admin) wait_port "log file" "$name" 5 test -f "$RUNDIR/$name.log" || true;
                     tail -n 200 -f "$RUNDIR/$name.log" ;;
    "") die "usage: ./scripts/run.sh logs <api|metro|admin>" ;;
    *) warn "unknown service '$name' (api|metro|admin)" ;;
  esac
}

# CMD=logs has no flags
if [ "${1:-}" = "logs" ]; then
  cmd_logs "${2:-}"
  exit 0
fi

parse "${@:-}"

case "$CMD" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  help|-h|--help) usage ;;
esac