#!/bin/bash
# Set Railway environment variables now that service exists
# Replace placeholder values with your actual credentials

cd "/Users/nexteleven/Desktop/Grok Code/Grok-Code"

export RAILWAY_TOKEN=your_railway_token

echo "🚀 Setting Railway Environment Variables for Grok-Code service..."
echo ""

# Link project
railway link --project your_railway_project_id 2>&1 | grep -v "Select\|Failed" || true

# Set service
railway service --service Grok-Code 2>&1 | grep -v "Select\|Failed" || true

echo "Setting variables..."
echo ""

railway variables --service Grok-Code --set "GROK_API_KEY=your_grok_api_key" && echo "✅ GROK_API_KEY"
railway variables --service Grok-Code --set "GITHUB_ID=your_github_oauth_client_id" && echo "✅ GITHUB_ID"
railway variables --service Grok-Code --set "GITHUB_SECRET=your_github_oauth_client_secret" && echo "✅ GITHUB_SECRET"
railway variables --service Grok-Code --set "NEXTAUTH_SECRET=your_nextauth_secret" && echo "✅ NEXTAUTH_SECRET"
railway variables --service Grok-Code --set "DATABASE_URL=your_database_url" && echo "✅ DATABASE_URL"

echo ""
echo "🎉 All environment variables set!"
echo "🔗 Verify in Railway dashboard"
