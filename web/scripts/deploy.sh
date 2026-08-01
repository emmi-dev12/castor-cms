#!/bin/bash
# Deploy to Vercel production and re-point any custom aliases at the new
# deployment. `vercel --prod` does NOT automatically move aliases created via
# `vercel alias set` (only the project's own <name>.vercel.app domain
# auto-follows) — this script closes that gap so an alias never silently serves
# a stale build.
#
# Aliases come from CASTOR_ALIASES, which may be set in the environment or in
# web/.env.local (kept there so nobody's domains are hard-coded in the repo).
# Space or comma separated. With none set, this is just `vercel --prod`.
#
#   CASTOR_ALIASES="example.vercel.app www.example.com" npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."

# Environment wins; otherwise read it out of .env.local if present.
ALIASES="${CASTOR_ALIASES-}"
if [ -z "$ALIASES" ] && [ -f .env.local ]; then
  ALIASES=$(grep -E '^CASTOR_ALIASES=' .env.local | head -1 | sed 's/^CASTOR_ALIASES=//' | tr -d '"'"'"'"')
fi
ALIASES="${ALIASES//,/ }"

OUT=$(vercel --prod --yes 2>&1)
echo "$OUT"

if [ -z "${ALIASES// /}" ]; then
  echo "Done (no aliases configured)."
  exit 0
fi

# Match any Vercel deployment URL, not one particular project, so this works
# for whoever owns the deployment.
URL=$(echo "$OUT" | grep -oE "https://[a-z0-9-]+\.vercel\.app" | tail -1)
if [ -z "$URL" ]; then
  echo "Could not find the deployment URL in Vercel output — aliases NOT updated." >&2
  exit 1
fi

for alias in $ALIASES; do
  echo "Pointing $alias -> $URL"
  vercel alias set "$URL" "$alias"
done

echo "Done. Live at https://${ALIASES%% *}"
