#!/bin/bash

# Discard any local changes that might block the pull
git reset --hard HEAD

# Pull the latest changes and capture the output
pull_output=$(git pull 2>&1)
pull_exit_code=$?

# If git pull failed, abort
if [ $pull_exit_code -ne 0 ]; then
    echo "ERROR: git pull failed:"
    echo "$pull_output"
    exit 1
fi

# Check if "Already up to date." appears in the output
if echo "$pull_output" | grep -q "Already up to date."; then
    echo "No changes detected. Skipping npm install and build."
    exit 0
fi

echo "Changes detected. Proceeding with npm install and build."
pm2 stop all
npm install
npm run build
pm2 start all
