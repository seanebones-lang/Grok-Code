#!/bin/bash
# Quick deploy script - run from project directory
# Replace placeholder values with your actual credentials

cd "/Users/nexteleven/Desktop/Grok Code/Grok-Code"

export RAILWAY_TOKEN=your_railway_token

echo "🚀 Setting Railway Environment Variables..."
echo ""

# Try to set variables
railway variables --set "GROK_API_KEY=your_grok_api_key" 2>&1 | grep -v "No service" && echo "✅ GROK_API_KEY"
railway variables --set "GITHUB_ID=your_github_oauth_client_id" 2>&1 | grep -v "No service" && echo "✅ GITHUB_ID"
railway variables --set "GITHUB_SECRET=your_github_oauth_client_secret" 2>&1 | grep -v "No service" && echo "✅ GITHUB_SECRET"
railway variables --set "NEXTAUTH_SECRET=your_nextauth_secret" 2>&1 | grep -v "No service" && echo "✅ NEXTAUTH_SECRET"
railway variables --set "DATABASE_URL=your_database_url" 2>&1 | grep -v "No service" && echo "✅ DATABASE_URL"

echo ""
echo "✅ Done! Check Railway dashboard to verify."
