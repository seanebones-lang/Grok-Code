#!/bin/bash

# Railway Token Utility Script
# Uses stored Railway API token for deployments

set -e

# Get token from secure storage
TOKEN_FILE=".railway-token"
if [ -f "$TOKEN_FILE" ]; then
    export RAILWAY_TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n' | tr -d ' ')
    echo "✅ Railway token loaded from $TOKEN_FILE"
else
    echo "⚠️  Token file not found: $TOKEN_FILE"
    echo "Using RAILWAY_TOKEN environment variable if set..."
fi

# Use token for Railway CLI commands
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ Railway token not found. Please set RAILWAY_TOKEN or create .railway-token file"
    exit 1
fi

# Execute Railway command with token
echo "🚀 Using Railway API token for deployment..."

# Deploy to Railway
if [ "$1" == "deploy" ]; then
    echo "📦 Deploying to Railway..."
    railway up --token "$RAILWAY_TOKEN" "${@:2}"
elif [ "$1" == "status" ]; then
    echo "📊 Checking deployment status..."
    railway status --token "$RAILWAY_TOKEN" "${@:2}"
elif [ "$1" == "logs" ]; then
    echo "📋 Fetching logs..."
    railway logs --token "$RAILWAY_TOKEN" "${@:2}"
else
    echo "Usage: $0 [deploy|status|logs] [railway-args...]"
    echo ""
    echo "Examples:"
    echo "  $0 deploy          # Deploy to Railway"
    echo "  $0 status          # Check deployment status"
    echo "  $0 logs            # View deployment logs"
fi
