#!/bin/bash

# Vercel Token Utility Script
# Uses stored Vercel API token for deployments

set -e

# Get token from secure storage
TOKEN_FILE=".vercel-token"
if [ -f "$TOKEN_FILE" ]; then
    export VERCEL_TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n' | tr -d ' ')
    echo "✅ Vercel token loaded from $TOKEN_FILE"
else
    echo "⚠️  Token file not found: $TOKEN_FILE"
    echo "Using VERCEL_TOKEN environment variable if set..."
fi

# Use token for Vercel CLI commands
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Vercel token not found. Please set VERCEL_TOKEN or create .vercel-token file"
    exit 1
fi

# Execute Vercel command with token
echo "🚀 Using Vercel API token for deployment..."

# Deploy to Vercel
if [ "$1" == "deploy" ]; then
    echo "📦 Deploying to Vercel..."
    npx vercel --token "$VERCEL_TOKEN" --yes "${@:2}"
elif [ "$1" == "prod" ]; then
    echo "📦 Deploying to production..."
    npx vercel --token "$VERCEL_TOKEN" --prod --yes "${@:2}"
elif [ "$1" == "status" ]; then
    echo "📊 Checking deployment status..."
    npx vercel ls --token "$VERCEL_TOKEN" "${@:2}"
else
    echo "Usage: $0 [deploy|prod|status] [vercel-args...]"
    echo ""
    echo "Examples:"
    echo "  $0 deploy          # Deploy to preview"
    echo "  $0 prod            # Deploy to production"
    echo "  $0 status          # List deployments"
fi
