#!/bin/bash

# GitHub OAuth Callback URL Fix Script
# This script helps verify and guide the fix for OAuth 404 errors

echo "========================================="
echo "GitHub OAuth Callback URL Fix"
echo "========================================="
echo ""

# Get expected callback URL from the app
EXPECTED_CALLBACK=$(curl -s "https://grok-code2.vercel.app/api/auth/providers" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['github']['callbackUrl'])" 2>/dev/null)

if [ -z "$EXPECTED_CALLBACK" ]; then
  EXPECTED_CALLBACK="https://grok-code2.vercel.app/api/auth/callback/github"
fi

echo "✅ Your app expects this callback URL:"
echo "   $EXPECTED_CALLBACK"
echo ""

# Get GITHUB_ID from Vercel (if possible)
echo "📋 Checking Vercel environment variables..."
GITHUB_ID=$(npx vercel env ls 2>&1 | grep "GITHUB_ID" | head -1 | awk '{print $1}')

if [ -n "$GITHUB_ID" ]; then
  echo "   GITHUB_ID found in Vercel"
else
  echo "   ⚠️  Could not retrieve GITHUB_ID from Vercel"
  echo "   You'll need to check it manually in Vercel dashboard"
fi
echo ""

echo "========================================="
echo "ACTION REQUIRED: Update GitHub OAuth App"
echo "========================================="
echo ""
echo "1. Go to: https://github.com/settings/developers"
echo ""
echo "2. Find your OAuth App"
if [ -n "$GITHUB_ID" ]; then
  echo "   (Look for Client ID that matches your GITHUB_ID env var)"
else
  echo "   (Check your Vercel env vars for GITHUB_ID to find the right app)"
fi
echo ""
echo "3. Click 'Edit' on that OAuth App"
echo ""
echo "4. Find 'Authorization callback URL' field"
echo ""
echo "5. Set it to EXACTLY (copy/paste this):"
echo "   $EXPECTED_CALLBACK"
echo ""
echo "6. Click 'Update application' button"
echo ""
echo "========================================="
echo "After Updating:"
echo "========================================="
echo ""
echo "1. Clear your browser cookies:"
echo "   - For grok-code2.vercel.app"
echo "   - For github.com (OAuth state cookies)"
echo ""
echo "2. Try logging in again:"
echo "   https://grok-code2.vercel.app/login"
echo ""
echo "3. Should work without 404 errors!"
echo ""
