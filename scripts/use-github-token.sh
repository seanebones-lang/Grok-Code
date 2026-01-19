#!/bin/bash

# GitHub Token Utility Script
# Uses stored GitHub token for API operations

set -e

# Get token from secure storage
TOKEN_FILE=".github-token"
if [ -f "$TOKEN_FILE" ]; then
    export GITHUB_TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n' | tr -d ' ')
    echo "✅ GitHub token loaded from $TOKEN_FILE"
else
    echo "⚠️  Token file not found: $TOKEN_FILE"
    echo "Using GITHUB_TOKEN environment variable if set..."
fi

# Use token for GitHub CLI commands
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GitHub token not found. Please set GITHUB_TOKEN or create .github-token file"
    exit 1
fi

# Execute GitHub command with token
echo "🚀 Using GitHub API token..."

# GitHub CLI operations
if [ "$1" == "auth" ]; then
    echo "🔐 Authenticating with GitHub..."
    echo "$GITHUB_TOKEN" | gh auth login --with-token
    echo "✅ Authenticated successfully"
elif [ "$1" == "status" ]; then
    echo "📊 Checking GitHub authentication status..."
    gh auth status
elif [ "$1" == "repos" ]; then
    echo "📦 Listing repositories..."
    gh repo list "${@:2}"
elif [ "$1" == "clone" ]; then
    echo "📥 Cloning repository..."
    gh repo clone "$2" "${@:3}"
else
    echo "Usage: $0 [auth|status|repos|clone] [args...]"
    echo ""
    echo "Examples:"
    echo "  $0 auth              # Authenticate GitHub CLI with stored token"
    echo "  $0 status            # Check authentication status"
    echo "  $0 repos             # List repositories"
    echo "  $0 clone owner/repo  # Clone a repository"
fi
