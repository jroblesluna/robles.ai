#!/bin/bash

# Stop all PM2 processes
pm2 stop all

# Pull the latest changes from the Git repository
git pull

# Install dependencies
npm install

# Compile the project
npm run build

# Start all PM2 processes
pm2 start all