#!/bin/bash
# Set Railway environment variables via API
# Replace placeholder values with your actual credentials

PROJECT_ID="your_railway_project_id"
TOKEN="your_railway_token"

echo "🚀 Setting Railway environment variables..."

# Try to get services and set variables
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "query { project(id: \"'$PROJECT_ID'\") { services { edges { node { id name } } } } }"
  }' | python3 -m json.tool 2>/dev/null | head -30

echo ""
echo "📝 To set environment variables:"
echo "1. Go to: https://railway.app/project/$PROJECT_ID"
echo "2. Create a service (GitHub Repo or Empty Service)"
echo "3. Go to Variables tab"
echo "4. Add these variables:"
echo ""
echo "GROK_API_KEY=your_grok_api_key"
echo "GITHUB_ID=your_github_oauth_client_id"
echo "GITHUB_SECRET=your_github_oauth_client_secret"
echo "NEXTAUTH_SECRET=your_nextauth_secret"
echo "DATABASE_URL=your_database_url"
