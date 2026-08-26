#!/usr/bin/env bash
#
# Stop everything JobOS has running locally — dev server, production server,
# drizzle-kit studio — and free the ports they were holding.
#
#   ./scripts/stop.sh                 # this project only, ports 3000 3001 4983
#   ./scripts/stop.sh --port 3100     # also free another port
#   ./scripts/stop.sh --dry-run       # list what would die, kill nothing
#   ./scripts/stop.sh --force         # kill port owners from other projects too
#
# The safety rule: a process is only killed when its working directory is this
# repo. Another Next app on :3000 belongs to somebody else and is left running
# unless you pass --force. That is not hypothetical on this machine — a sibling
# project (and sometimes a second macOS user) holds 3000, which is why `pnpm
# dev` keeps landing on 3001.
#
# `lsof` only reports sockets owned by the user running it, so a port held by
# another account looks free to it. netstat is the fallback that sees those,
# and they are reported rather than killed: --force cannot cross accounts
# without sudo anyway.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"

PORTS=(3000 3001 4983)   # next dev, its fallback port, drizzle studio
DRY=""
FORCE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --port|-p) PORTS+=("$2"); shift 2 ;;
    --dry-run|-n) DRY="1"; shift ;;
    --force|-f) FORCE="1"; shift ;;
    --help|-h) sed -n '3,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//;$d'; exit 0 ;;
    *) echo "stop: unknown argument '$1' (try --help)" >&2; exit 1 ;;
  esac
done

# Pids listening on a port. lsof first (fast, gives us our own processes),
# netstat second so a cross-account listener is seen rather than mistaken for
# a free port.
listeners_on() {
  local port="$1" pids
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    pids="$(netstat -anv -p tcp 2>/dev/null \
      | awk -v suffix="\\.$port\$" '$1 ~ /^tcp/ && $6 == "LISTEN" && $4 ~ suffix' \
      | grep -oE '[A-Za-z][A-Za-z0-9._-]*:[0-9]+' \
      | sed 's/.*://' | sort -u || true)"
  fi
  printf '%s\n' $pids
}

# Working directory of a pid — empty if it exited or belongs to another user.
cwd_of() {
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1
}

owned_by_us() {
  [ "$(cwd_of "$1")" = "$ROOT" ]
}

describe() {
  local pid="$1" who cmd
  who="$(ps -o user= -p "$pid" 2>/dev/null | tr -d ' ')"
  cmd="$(ps -o command= -p "$pid" 2>/dev/null | cut -c1-64)"
  echo "${who:-?} ${cmd:-<not visible from this account>}"
}

VICTIMS=()
add() {
  [ -n "$1" ] || return 0
  [ "$1" != "$$" ] || return 0
  VICTIMS+=("$1")
}

# 1. Long-running node processes started from this repo. pgrep -f matches the
#    whole command line; the cwd check is what keeps it off other projects.
for pid in $(pgrep -f 'next dev|next-server|next start|drizzle-kit studio' 2>/dev/null || true); do
  owned_by_us "$pid" && add "$pid"
done

# 2. Whatever is holding the ports.
for port in "${PORTS[@]}"; do
  for pid in $(listeners_on "$port"); do
    if owned_by_us "$pid"; then
      add "$pid"
    elif [ -n "$FORCE" ]; then
      echo "  force :$port pid $pid — $(describe "$pid")"
      add "$pid"
    else
      echo "  keep  :$port pid $pid — not this project ($(describe "$pid")); --force to override"
    fi
  done
done

# 3. The supervising `pnpm dev` wrapper, so it cannot respawn what we just
#    killed. Only walk up through package-manager and node parents, never into
#    the shell that invoked us.
for pid in "${VICTIMS[@]+"${VICTIMS[@]}"}"; do
  ppid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
  [ -n "$ppid" ] && [ "$ppid" != "1" ] || continue
  case "$(ps -o command= -p "$ppid" 2>/dev/null || true)" in
    *pnpm*|*npm*|*yarn*|*node*|*next*) owned_by_us "$ppid" && add "$ppid" ;;
  esac
done

PIDS=($(printf '%s\n' "${VICTIMS[@]+"${VICTIMS[@]}"}" | awk 'NF && !seen[$0]++'))

if [ "${#PIDS[@]}" -eq 0 ]; then
  echo "Nothing of ours running in $ROOT."
  exit 0
fi

for pid in "${PIDS[@]}"; do
  echo "  stop  pid $pid — $(describe "$pid")"
done

if [ -n "$DRY" ]; then
  echo "(dry run — nothing was killed)"
  exit 0
fi

# Ask politely first so Next can flush its build cache, then insist.
kill "${PIDS[@]}" 2>/dev/null || true

alive=()
for _ in $(seq 1 10); do
  alive=()
  for pid in "${PIDS[@]}"; do
    kill -0 "$pid" 2>/dev/null && alive+=("$pid")
  done
  [ "${#alive[@]}" -gt 0 ] || break
  sleep 0.5
done

if [ "${#alive[@]}" -gt 0 ]; then
  echo "  kill  ${alive[*]} ignored TERM — sending KILL"
  kill -9 "${alive[@]}" 2>/dev/null || true
  sleep 0.5
fi

for port in "${PORTS[@]}"; do
  for pid in $(listeners_on "$port"); do
    echo "  busy  :$port still held by pid $pid — $(describe "$pid")"
  done
done

echo "Stopped."
