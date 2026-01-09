#!/bin/bash
# Set Railway environment variables
# Replace placeholder values with your actual credentials

cd "/Users/nexteleven/Desktop/Grok Code/Grok-Code"

export RAILWAY_TOKEN=your_railway_token

echo "🚀 Setting Railway Environment Variables..."
echo ""

railway link --project your_railway_project_id 2>&1 | head -3

railway variables --set "GROK_API_KEY=your_grok_api_key" 2>&1
railway variables --set "GITHUB_ID=your_github_oauth_client_id" 2>&1  
railway variables --set "GITHUB_SECRET=your_github_oauth_client_secret" 2>&1
railway variables --set "NEXTAUTH_SECRET=your_nextauth_secret" 2>&1
railway variables --set "DATABASE_URL=your_database_url" 2>&1

echo ""
echo "✅ Done!"
