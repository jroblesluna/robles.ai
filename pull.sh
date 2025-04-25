#!/bin/bash

# Pull the latest changes from the Git repository
git pull
# Check if there are any changes pulled from the repository
if [ "$(git diff --name-only HEAD@{1} HEAD)" != "" ]; then
    echo "Changes detected. Proceeding with npm install and build."
    # Stop all PM2 processes
    pm2 stop all
    # Install dependencies
    npm install

    # Compile the project
    npm run build

    # Start all PM2 processes
    pm2 start all
else
    echo "No changes detected. Skipping npm install and build."
    exit 0
fi
