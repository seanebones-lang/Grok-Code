#!/bin/bash

echo "========================================="
echo "OAuth Redirect URI Debug"
echo "========================================="
echo ""

BASE_URL="https://grok-code2.vercel.app"

echo "1. Getting NextAuth redirect location..."
REDIRECT_LOCATION=$(curl -sI "${BASE_URL}/api/auth/signin/github" | grep -i "location:" | cut -d' ' -f2- | tr -d '\r')

if [ -z "$REDIRECT_LOCATION" ]; then
  echo "   ❌ Could not get redirect location"
  exit 1
fi

echo "   Location: $REDIRECT_LOCATION"
echo ""

echo "2. Extracting redirect_uri from GitHub OAuth URL..."
REDIRECT_URI=$(echo "$REDIRECT_LOCATION" | grep -oE "redirect_uri=[^&]*" | cut -d'=' -f2- | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)

if [ -z "$REDIRECT_URI" ]; then
  echo "   ⚠️  Could not extract redirect_uri"
  echo "   Full URL: $REDIRECT_LOCATION"
else
  echo "   redirect_uri being sent to GitHub:"
  echo "   $REDIRECT_URI"
fi
echo ""

echo "3. Expected callback URL (from app config)..."
EXPECTED=$(curl -s "${BASE_URL}/api/auth/providers" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['github']['callbackUrl'])" 2>/dev/null)
echo "   $EXPECTED"
echo ""

if [ -n "$REDIRECT_URI" ] && [ -n "$EXPECTED" ]; then
  if [ "$REDIRECT_URI" = "$EXPECTED" ]; then
    echo "✅ redirect_uri matches expected callback URL"
  else
    echo "❌ MISMATCH DETECTED!"
    echo "   Sent:      $REDIRECT_URI"
    echo "   Expected:  $EXPECTED"
    echo ""
    echo "🔧 FIX: Update GitHub OAuth App callback URL to match:"
    echo "   $EXPECTED"
  fi
fi

echo ""
echo "========================================="
echo "What to check in GitHub:"
echo "========================================="
echo "1. Go to: https://github.com/settings/developers"
echo "2. Find your OAuth App"
echo "3. Check 'Authorization callback URL'"
echo "4. It MUST be exactly: $EXPECTED"
echo ""
