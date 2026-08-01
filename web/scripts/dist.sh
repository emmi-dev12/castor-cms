#!/bin/bash
# Publish a snapshot of this repo to the buyer-facing distribution repo.
#
# Owner tooling, not part of the product. Buyers receive the distribution repo,
# which carries a clean history — no personal email, no commit-by-commit record
# of how the thing was built or priced. This copies the current committed tree
# across, commits it there, and pushes.
#
# The destination is never hard-coded: set CASTOR_DIST_PATH in the environment
# or in web/.env.local. The commit identity comes from the destination repo's
# own git config — set it once there, or every published commit inherits
# whatever name and email this machine happens to use.
#
#   npm run dist -- "Add gallery section"
#   CASTOR_DIST_PATH=~/somewhere npm run dist -- "message"
set -euo pipefail
cd "$(dirname "$0")/.."          # web/
REPO_ROOT="$(cd .. && pwd)"

MESSAGE="${1:-Update Castor}"

DEST="${CASTOR_DIST_PATH-}"
if [ -z "$DEST" ] && [ -f .env.local ]; then
  DEST=$(grep -E '^CASTOR_DIST_PATH=' .env.local | head -1 | sed 's/^CASTOR_DIST_PATH=//' | tr -d '"'"'"'"')
fi
DEST="${DEST/#\~/$HOME}"

if [ -z "$DEST" ]; then
  echo "Set CASTOR_DIST_PATH (environment or web/.env.local) to the distribution repo." >&2
  exit 1
fi
if [ ! -d "$DEST/.git" ]; then
  echo "Not a git repository: $DEST" >&2
  exit 1
fi

# Publish what is committed, not what happens to be lying around — otherwise a
# half-finished edit could ship to buyers without ever being reviewed here.
if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
  echo "Working tree has uncommitted changes. Commit them first — dist publishes HEAD." >&2
  exit 1
fi

echo "Publishing $(git -C "$REPO_ROOT" rev-parse --short HEAD) -> $DEST"

# Clear the destination's tracked files so deletions propagate, keeping .git.
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

# git archive emits exactly the tracked tree: no .env.local, no .data, no
# node_modules, whatever .gitignore says today.
git -C "$REPO_ROOT" archive HEAD | tar -x -C "$DEST"

cd "$DEST"
if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing changed since the last publish."
  exit 0
fi

# Refuse rather than publish under the machine's default identity: the point of
# the distribution repo is that buyers never see a personal address.
NAME=$(git config --local user.name || true)
EMAIL=$(git config --local user.email || true)
if [ -z "$NAME" ] || [ -z "$EMAIL" ]; then
  echo "Set the publishing identity once, in $DEST:" >&2
  echo "  git config --local user.name 'Your Name'" >&2
  echo "  git config --local user.email 'you@users.noreply.github.com'" >&2
  exit 1
fi

git add -A
git commit -q --author="$NAME <$EMAIL>" -m "$MESSAGE"
git push -q origin HEAD
echo "Published: $(git log -1 --format='%h %s')"
