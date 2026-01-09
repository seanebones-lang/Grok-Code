#!/bin/bash
# Set Railway environment variables now that service exists

cd "/Users/nexteleven/Desktop/Grok Code/Grok-Code"

export RAILWAY_TOKEN=a5a4fc54-13b0-4467-b90e-c1512ab9c7fc

echo "🚀 Setting Railway Environment Variables for Grok-Code service..."
echo ""

# Link project
railway link --project 080b0df0-f6c7-44c6-861f-c85c8256905b 2>&1 | grep -v "Select\|Failed" || true

# Set service
railway service --service Grok-Code 2>&1 | grep -v "Select\|Failed" || true

echo "Setting variables..."
echo ""

railway variables --service Grok-Code --set "GROK_API_KEY=${GROK_API_KEY:-your-grok-api-key-here}" && echo "✅ GROK_API_KEY"
railway variables --service Grok-Code --set "GITHUB_ID=${GITHUB_ID:-your-github-id-here}" && echo "✅ GITHUB_ID"
railway variables --service Grok-Code --set "GITHUB_SECRET=${GITHUB_SECRET:-your-github-secret-here}" && echo "✅ GITHUB_SECRET"
railway variables --service Grok-Code --set "NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-your-nextauth-secret-here}" && echo "✅ NEXTAUTH_SECRET"
railway variables --service Grok-Code --set "DATABASE_URL=${DATABASE_URL:-your-database-url-here}" && echo "✅ DATABASE_URL"

echo ""
echo "🎉 All environment variables set!"
echo "🔗 Verify: https://railway.app/project/080b0df0-f6c7-44c6-861f-c85c8256905b"
