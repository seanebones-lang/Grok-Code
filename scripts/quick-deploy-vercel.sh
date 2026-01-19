#!/bin/bash

# Quick Vercel Deployment using Stored Token
# Uses the stored Vercel API token for automated deployments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN_FILE="$PROJECT_ROOT/.vercel-token"

# Load token
if [ -f "$TOKEN_FILE" ]; then
    export VERCEL_TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n' | tr -d ' ')
    echo "✅ Vercel token loaded"
else
    echo "⚠️  Token file not found. Using VERCEL_TOKEN env var if set."
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Vercel token not found. Please set VERCEL_TOKEN or ensure .vercel-token exists"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Deploy based on argument
case "${1:-prod}" in
    prod|production)
        echo "🚀 Deploying to Vercel Production..."
        npx vercel --token "$VERCEL_TOKEN" --prod --yes
        ;;
    preview)
        echo "🚀 Deploying to Vercel Preview..."
        npx vercel --token "$VERCEL_TOKEN" --yes
        ;;
    *)
        echo "Usage: $0 [prod|preview]"
        echo ""
        echo "Examples:"
        echo "  $0 prod     # Deploy to production"
        echo "  $0 preview  # Deploy to preview"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment initiated!"
echo "📊 Check status: https://vercel.com/sean-mcdonnells-projects-4fbf31ab/nexteleven-code"
