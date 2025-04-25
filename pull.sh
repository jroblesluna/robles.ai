#!/bin/bash

# Pull the latest changes and capture the output
pull_output=$(git pull)

# Check if "Already up to date." appears in the output
if echo "$pull_output" | grep -q "Already up to date."; then
    echo "No changes detected. Skipping npm install and build."
    exit 0
else
    echo "Changes detected. Proceeding with npm install and build."
    pm2 stop all
    npm install
    npm run build
    pm2 start all
fi