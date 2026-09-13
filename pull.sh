#!/bin/bash
# Deploy script run on the VPS. Invoked automatically by GitHub Actions on push
# to main (see .github/workflows/deploy.yml), or manually as a fallback.
#
# It inspects WHICH files changed between the current and incoming commit and
# only does the work that those changes justify:
#   - package*.json changed        → npm install + build + restart
#   - src/ server/ shared/ configs → build + restart
#   - only server/data/ (blog)     → sync data + restart (no compile)
#   - only docs/other              → nothing
set -euo pipefail

# Load NVM so npm and pm2 are available regardless of how this script is invoked
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

echo "▶ Fetching latest from origin/main…"
git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✓ No new commits. Nothing to deploy."
    exit 0
fi

# Determine which files changed between the deployed commit and the new one.
CHANGED=$(git diff --name-only "$LOCAL" "$REMOTE")
echo "▶ Changed files:"
echo "$CHANGED" | sed 's/^/    /'

# Apply the incoming commit (discard any local drift on the server).
git reset --hard origin/main
chmod +x pull.sh push.sh 2>/dev/null || true

# ── Classify the changes ─────────────────────────────────────────────────────
need_install=false   # package manifests changed
need_build=false     # app/source/config changed
need_data=false      # blog data changed
need_restart=false   # anything that affects the running server

while IFS= read -r file; do
    [ -z "$file" ] && continue
    case "$file" in
        package.json|package-lock.json)
            need_install=true; need_build=true; need_restart=true ;;
        src/*|server/*|shared/*|index.html|vite.config.*|tailwind.config.*|postcss.config.*|tsconfig*|declarations.d.ts)
            need_build=true; need_restart=true ;;
    esac
    # server/data/ (blog posts) is copied into dist by postbuild; if ONLY data
    # changed we can sync it without a full recompile.
    case "$file" in
        server/data/*) need_data=true ;;
    esac
done <<< "$CHANGED"

# server/* matched need_build above (which is correct for code under server/),
# but a change limited to server/data/ shouldn't force a compile. Re-evaluate:
# if every changed path is under server/data/ or is docs, skip the build.
if $need_build; then
    only_data_or_docs=true
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        case "$file" in
            server/data/*) ;;                         # data — ok to skip build
            *.md|*.MD|LICENSE|.gitignore|*.sh) ;;     # docs/meta — ok to skip build
            *) only_data_or_docs=false; break ;;
        esac
    done <<< "$CHANGED"
    if $only_data_or_docs; then
        need_build=false
        echo "ℹ Only data/docs changed — skipping compile."
    fi
fi

# ── Execute the minimal set of steps ─────────────────────────────────────────
if $need_install; then
    echo "▶ Dependencies changed → npm install"
    npm install
fi

if $need_build; then
    echo "▶ Building app (vite + esbuild)…"
    pm2 stop all || true
    npm run build
    need_restart=true
elif $need_data; then
    echo "▶ Only blog data changed → syncing data into dist/"
    mkdir -p dist/data
    rsync -a --update server/data/ dist/data/
    need_restart=true
fi

if $need_restart; then
    echo "▶ Restarting pm2…"
    pm2 restart all || pm2 start all
    pm2 save || true
    echo "✓ Deploy complete."
else
    echo "✓ No runtime-affecting changes. Server left running as-is."
fi
