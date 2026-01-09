#!/bin/bash
# Quick deploy script - run from project directory

cd "/Users/nexteleven/Desktop/Grok Code/Grok-Code"

export RAILWAY_TOKEN=a5a4fc54-13b0-4467-b90e-c1512ab9c7fc

echo "🚀 Setting Railway Environment Variables..."
echo ""

# Try to set variables
railway variables --set "GROK_API_KEY=${GROK_API_KEY:-your-grok-api-key-here}" 2>&1 | grep -v "No service" && echo "✅ GROK_API_KEY"
railway variables --set "GITHUB_ID=${GITHUB_ID:-your-github-id-here}" 2>&1 | grep -v "No service" && echo "✅ GITHUB_ID"
railway variables --set "GITHUB_SECRET=${GITHUB_SECRET:-your-github-secret-here}" 2>&1 | grep -v "No service" && echo "✅ GITHUB_SECRET"
railway variables --set "NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-your-nextauth-secret-here}" 2>&1 | grep -v "No service" && echo "✅ NEXTAUTH_SECRET"
railway variables --set "DATABASE_URL=${DATABASE_URL:-your-database-url-here}" 2>&1 | grep -v "No service" && echo "✅ DATABASE_URL"

echo ""
echo "✅ Done! Check Railway dashboard to verify."
