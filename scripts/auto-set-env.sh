#!/bin/bash
# Auto-set Railway environment variables
# This script will work once you have a Railway service created
# Replace placeholder values with your actual credentials

export RAILWAY_TOKEN=your_railway_token

echo "🚀 Setting Railway Environment Variables..."
echo ""

# Check if service is linked
railway status 2>&1 | grep -q "Service:" && SERVICE_LINKED=true || SERVICE_LINKED=false

if [ "$SERVICE_LINKED" = false ]; then
  echo "⚠️  No service linked. Please:"
  echo "1. Go to your Railway project dashboard"
  echo "2. Create a service (GitHub Repo or Empty)"
  echo "3. Link it: railway service"
  echo "4. Run this script again"
  exit 1
fi

echo "✅ Service linked, setting variables..."
echo ""

railway variables --set "GROK_API_KEY=your_grok_api_key" && echo "✅ GROK_API_KEY set"
railway variables --set "GITHUB_ID=your_github_oauth_client_id" && echo "✅ GITHUB_ID set"
railway variables --set "GITHUB_SECRET=your_github_oauth_client_secret" && echo "✅ GITHUB_SECRET set"
railway variables --set "NEXTAUTH_SECRET=your_nextauth_secret" && echo "✅ NEXTAUTH_SECRET set"
railway variables --set "DATABASE_URL=your_database_url" && echo "✅ DATABASE_URL set"

echo ""
echo "🎉 All environment variables set!"
echo "🔗 Verify in Railway dashboard"
