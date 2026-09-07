#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
cd "$ROOT"

command -v node >/dev/null 2>&1 || { echo "error: node >=20 is required" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "error: npm is required" >&2; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "error: npx is required" >&2; exit 1; }

if [ ! -d node_modules ]; then
  echo "node_modules missing — running npm ci..."
  npm ci
fi

echo ""
echo "== prisma generate =="
npm run db:generate

echo ""
echo "== typecheck =="
npm run typecheck

echo ""
echo "== lint =="
npm run lint

echo ""
echo "== build =="
npm run build

if [ "${1:-}" = "--with-tests" ]; then
  echo ""
  echo "== test =="
  echo "note: @ctf/api tests need postgres + redis up (docker compose up -d postgres redis)"
  npm run test
fi

echo ""
echo "All verification checks passed."