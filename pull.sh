#!/bin/bash

# Load NVM so npm and pm2 are available regardless of how this script is invoked
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Fetch latest from remote
git fetch origin

# Check if there are new commits
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "No changes detected. Skipping npm install and build."
    exit 0
fi

# Force local to match remote (discards any local changes)
git reset --hard origin/main

# Restore execute permission (git may not preserve it)
chmod +x pull.sh

echo "Changes detected. Proceeding with npm install and build."
pm2 stop all
npm install
npm run build
pm2 start all
