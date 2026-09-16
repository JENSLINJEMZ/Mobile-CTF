#!/usr/bin/env bash
set -euo pipefail

SCRIPT_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
cd "$SCRIPT_HOME"
DEV=""
PASS=0
FAIL=0
TAP_RETRY=12

fail()  { echo "FAIL $*" >&2; exit 1; }
report() { echo "  PASS $PASS  FAIL $FAIL"; [ "$FAIL" -eq 0 ] || exit 1; }

has() { # has <regex>  - true if any node text/content-desc matches (fresh dump)
  local d
  d="$(ui_dump 2>/dev/null || true)"
  [ -n "$d" ] || return 1
  python3 -c "import sys,re; sys.exit(0 if re.search(sys.argv[1],sys.stdin.read(),re.I) else 1)" "$1" <<< "$d"
}

node_xy() { # node_xy <regex> -> "x y" center of first matching node, or exit 1
  local xml
  xml="$(ui_dump 2>/dev/null || true)"
  [ -n "$xml" ] || return 1
  python3 -c "
import sys,re
d=sys.stdin.read()
pat=sys.argv[1]
for m in re.finditer(r'(?:content-desc|text)=\"([^\"]{1,90})\"[^>]*bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"',d):
    if re.search(pat,m.group(1),re.I):
        print((int(m.group(2))+int(m.group(4)))//2,(int(m.group(3))+int(m.group(5)))//2)
        sys.exit(0)
sys.exit(1)
" "$1" <<< "$xml"
}

ui_dump() { # re-arm tunnels, relaunch app, dump UI with retry
  local i f xml d
  for i in $(seq 1 6); do
    d="$(timeout 8 adb devices 2>/dev/null | awk '$2=="device"{print $1; exit}')"
    if [ -n "$d" ]; then DEV="$d"; break; fi
    sleep 4
  done
  [ -n "$DEV" ] || return 1
  timeout 8 adb -s "$DEV" reverse tcp:4000 tcp:4000 >/dev/null 2>&1 || true
  timeout 8 adb -s "$DEV" reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
  f="/sdcard/_vr_$RANDOM.xml"
  for i in $(seq 1 6); do
    timeout 12 adb -s "$DEV" shell uiautomator dump "$f" >/dev/null 2>&1 || true
    xml="$(timeout 8 adb -s "$DEV" shell cat "$f" 2>/dev/null || true)"
    if [ -n "$xml" ] && [ "${#xml}" -gt 2000 ]; then echo "$xml"; return 0; fi
    sleep 3
  done
  return 1
}

launch() { # launch <route>  - restart app into route via exp deep link
  local d="$1"
  [ -n "$DEV" ] || { ui_dump >/dev/null 2>&1 || true; }
  timeout 15 adb -s "$DEV" shell am force-stop host.exp.exponent >/dev/null 2>&1 || true
  sleep 2
  timeout 15 adb -s "$DEV" shell am start -a android.intent.action.VIEW \
    -d "exp://localhost:8081/--/$d" host.exp.exponent >/dev/null 2>&1 || true
  sleep 20
}

tap_node() { # tap_node <regex>  - tap center of first node matching; retries
  local pat="$1" xy x y
  for i in $(seq 1 "$TAP_RETRY"); do
    xy="$(node_xy "$pat" || true)"
    if [ -n "$xy" ]; then
      set -- $xy
      x="$1" y="$2"
      echo "  [tap '$pat' @ $x,$y]"
      timeout 10 adb -s "$DEV" shell input tap "$x" "$y" >/dev/null 2>&1
      return 0
    fi
    sleep 5
  done
  echo "!! node not found: $pat"
  return 1
}

snap() { # snap <file> - screenshot to artifacts
  local f="$1"
  timeout 10 adb -s "$DEV" shell screencap -p /sdcard/_vr.png >/dev/null 2>&1 || true
  timeout 10 adb -s "$DEV" pull /sdcard/_vr.png "artifacts/verify-mobile/$f" >/dev/null 2>&1 || true
  echo "  [shot $f]"
}

wait_ui() { # wait_ui <regex> <maxwait>
  local pat="$2" t="${3:-40}" i
  for ((i=0;i<t;i++)); do
    has "$1" && return 0
    sleep 2
  done
  return 1
}

# ------------------------------------------------------------- main
[ -d artifacts ] || mkdir -p artifacts
ART="artifacts/verify-mobile"
mkdir -p "$ART"

echo "== 1. Leaderboard: Global -> Daily -> Weekly =="
launch leaderboard
wait_ui "Daily|Global|podium" 30 || fail "leaderboard did not render"
snap "01-global.png"
echo "  [global scope active]"

tap_node "[Dd]aily"
sleep 12
{
  echo "  [daily tapped]"
  grep -qE 'scope=daily' <(grep -aoE 'scope=[a-z]+' ${API_LOG:-"/home/jemzi/Mobile-CTF/artifacts/api.log"} | sort -u) \
    && echo "  [API scope=daily seen]" || echo "  [check Daily scope manually]"
}
snap "02-daily.png"

tap_node "[Ww]eekly"
sleep 12
{
  echo "  [weekly tapped]"
  grep -qE 'scope=weekly' <(grep -aoE 'scope=[a-z]+' ${API_LOG:-"/home/jemzi/Mobile-CTF/artifacts/api.log"} | sort -u) \
    && echo "  [API scope=weekly seen]" || echo "  [check Weekly scope manually]"
}
snap "03-weekly.png"

echo ""
echo "== 2. Keep Hacking rewards card =="
launch leaderboard
sleep 12
wait_ui "Keep [Hh]acking|Rewards" 20 || fail "keep-hacking card not found"
snap "04-keep-hacking.png"
echo "  [keep-hacking card]"

echo "  -- tap Keep Hacking --"
tap_node "[Kk]eep [Hh]acking"
sleep 10
snap "05-keep-hacking.png"

echo ""
echo "== 3. Events -> detail =="
launch events
sleep 20
wait_ui "Join|Starts In|Upcoming|Event" 30 || fail "events list did not render"
snap "06-events-list.png"
echo "  [events list]"

echo "  -- open an event --"
tap_node "Join [Ee]vent|[Ss]tarts In|^[...]"
sleep 15
wait_ui "Starts|Ends|Rules|Priz[e]s" 20 || fail "event detail did not render"
snap "07-events-detail.png"
echo "  [event detail]"

echo ""
echo "== done =="
report
