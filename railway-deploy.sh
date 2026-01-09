#!/bin/bash
# Railway Deployment Script

export RAILWAY_TOKEN=a5a4fc54-13b0-4467-b90e-c1512ab9c7fc

echo "🚀 Deploying GrokCode to Railway..."

# Set environment variables (replace with your actual values)
# railway variables set GROK_API_KEY=your_grok_api_key
# railway variables set GITHUB_ID=your_github_id
# railway variables set GITHUB_SECRET=your_github_secret
# railway variables set NEXTAUTH_SECRET=your_nextauth_secret
echo "⚠️  Update this script with your actual environment variables"

echo "✅ Environment variables set"
echo "📦 Deploying..."
railway up

echo "✅ Deployment initiated!"
