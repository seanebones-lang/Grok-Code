#!/bin/bash

# Setup GITHUB_TOKEN in Vercel
# Usage: ./setup-github-token.sh <your-github-token>

if [ -z "$1" ]; then
  echo "❌ Error: GitHub token required"
  echo ""
  echo "Usage: ./setup-github-token.sh <your-github-token>"
  echo ""
  echo "To get a token:"
  echo "1. Go to: https://github.com/settings/tokens"
  echo "2. Click 'Generate new token (classic)'"
  echo "3. Name: 'Grok-Code'"
  echo "4. Select scope: 'repo'"
  echo "5. Generate and copy the token"
  exit 1
fi

GITHUB_TOKEN="$1"

echo "========================================="
echo "Setting GITHUB_TOKEN in Vercel"
echo "========================================="
echo ""

echo "Setting for Production..."
echo "$GITHUB_TOKEN" | npx vercel env add GITHUB_TOKEN production --force

echo ""
echo "Setting for Preview..."
echo "$GITHUB_TOKEN" | npx vercel env add GITHUB_TOKEN preview --force

echo ""
echo "Setting for Development..."
echo "$GITHUB_TOKEN" | npx vercel env add GITHUB_TOKEN development --force

echo ""
echo "✅ GITHUB_TOKEN set in all environments!"
echo ""
echo "📋 Next: Redeploy to production"
echo "   Run: npx vercel --prod --yes"
