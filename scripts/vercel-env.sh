#!/usr/bin/env bash
#
# Push the runtime environment from .env.local into a linked Vercel project.
#
#   ./scripts/vercel-env.sh              # add missing, leave existing alone
#   ./scripts/vercel-env.sh --replace    # overwrite values that already exist
#
# Run `vercel link` first. Values are read from .env.local and piped to the CLI
# on stdin, so they never appear in argv (and never in your shell history).
#
# Only the variables JobOS actually reads are pushed. Phase 3/4 keys are
# included when present and skipped when blank.
set -euo pipefail

cd "$(dirname "$0")/.."

[ -f .env.local ] || { echo "No .env.local — copy .env.example and fill it in."; exit 1; }

REPLACE=""
[ "${1:-}" = "--replace" ] && REPLACE="1"

# Runtime-critical first, then optional. Order matters only for the log.
VARS=(
  DATABASE_URL
  DATABASE_URL_UNPOOLED
  NEON_AUTH_BASE_URL
  NEON_AUTH_COOKIE_SECRET
  DEMO_EMAIL
  DEMO_PASSWORD
  DEMO_NAME
  GEMINI_API_KEY
  GROQ_API_KEY
  ADZUNA_APP_ID
  ADZUNA_APP_KEY
)

# Read a value from .env.local, stripping surrounding quotes.
value_of() {
  sed -n "s/^$1=//p" .env.local | head -1 | sed -e 's/^"//' -e 's/"$//'
}

for target in production preview development; do
  echo "── $target ─────────────────────────────────────────────"
  for name in "${VARS[@]}"; do
    val="$(value_of "$name")"
    if [ -z "$val" ]; then
      echo "  skip  $name (not set locally)"
      continue
    fi
    if [ -n "$REPLACE" ]; then
      vercel env rm "$name" "$target" --yes >/dev/null 2>&1 || true
    fi
    if printf '%s' "$val" | vercel env add "$name" "$target" >/dev/null 2>&1; then
      echo "  ok    $name"
    else
      echo "  exists $name (use --replace to overwrite)"
    fi
  done
done

echo
echo "Done. Redeploy for the new values to take effect:  vercel --prod"
