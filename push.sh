#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Variables
REPO_URL="https://github.com/jroblesluna/robles.ai.git" # Replace with your repository URL
BRANCH="main" # Replace with your branch name if different

# Check if there are any changes to commit
if [ -n "$(git status --porcelain)" ]; then
    echo "Changes detected. Committing and pushing..."

    # Add all changes
    git add .

    # Commit changes with a timestamp message
    COMMIT_MESSAGE=$(date +"%Y%m%d%H%M")
    git commit -m "$COMMIT_MESSAGE"

    # Push changes
    git push "$REPO_URL" "$BRANCH"

else
    echo "No changes detected. Nothing to commit."
fi