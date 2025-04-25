#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Variables
REPO_URL="https://github.com/jroblesluna/robles.ai.git" # Replace with your repository URL
BRANCH="main" # Replace with your branch name if different

# Add all changes to git
git add .
# Commit changes with a message
COMMIT_MESSAGE=$(date +"%Y%m%d%H%M")
git commit -m "$COMMIT_MESSAGE"
# Push changes to the repository
git push "$REPO_URL" "$BRANCH"