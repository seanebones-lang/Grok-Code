#!/bin/bash
# Railway Environment Variables Setup Script
# Run this after creating a service in Railway

# Set your Railway token here (get from railway.app/account/tokens)
export RAILWAY_TOKEN=your_railway_token_here

echo "🚀 Setting Railway Environment Variables..."
echo ""
echo "⚠️  Make sure you have:"
echo "1. Created a service in Railway dashboard"
echo "2. Linked the service: railway service"
echo ""

# Set variables - Replace with your actual values
railway variables --set "GROK_API_KEY=your_grok_api_key_here"
railway variables --set "GITHUB_ID=your_github_oauth_client_id"
railway variables --set "GITHUB_SECRET=your_github_oauth_client_secret"
railway variables --set "NEXTAUTH_SECRET=your_nextauth_secret_here"
railway variables --set "DATABASE_URL=your_database_url_here"

echo ""
echo "✅ Environment variables set!"
echo "📋 Verify in Railway dashboard"
