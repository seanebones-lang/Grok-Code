#!/bin/bash

echo "========================================="
echo "🔍 Persistent 404 OAuth Diagnostic"
echo "========================================="
echo ""

BASE_URL="https://grok-code2.vercel.app"

echo "1. Checking NextAuth configuration..."
CONFIG=$(curl -s "${BASE_URL}/api/auth/check-config")
echo "$CONFIG" | python3 -m json.tool 2>/dev/null | grep -E "(nextAuthUrl|callbackUrl|readyForOAuth|baseUrl)" | head -10
echo ""

echo "2. Testing callback endpoint directly..."
CALLBACK_RESPONSE=$(curl -sI "${BASE_URL}/api/auth/callback/github?code=test&state=test")
CALLBACK_CODE=$(echo "$CALLBACK_RESPONSE" | head -1 | grep -oE "[0-9]{3}")
echo "   Callback endpoint HTTP status: $CALLBACK_CODE"
if [ "$CALLBACK_CODE" = "404" ]; then
  echo "   ❌ CALLBACK ENDPOINT RETURNS 404 - THIS IS THE PROBLEM!"
else
  echo "   ✅ Callback endpoint exists (status $CALLBACK_CODE is expected for invalid code)"
fi
echo ""

echo "3. Checking GitHub OAuth provider configuration..."
PROVIDERS=$(curl -s "${BASE_URL}/api/auth/providers")
CALLBACK_URL=$(echo "$PROVIDERS" | python3 -c "import sys, json; print(json.load(sys.stdin)['github']['callbackUrl'])" 2>/dev/null)
echo "   NextAuth callback URL: $CALLBACK_URL"
echo ""

echo "4. What to check in GitHub OAuth App:"
echo "   📋 Go to: https://github.com/settings/applications/3340678"
echo "   📋 Verify 'Authorization callback URL' is EXACTLY:"
echo "      ${BASE_URL}/api/auth/callback/github"
echo ""

echo "5. Browser-side checks:"
echo "   🔍 Check browser console for errors (F12 → Console)"
echo "   🔍 Check Network tab → Look for failed requests to /api/auth/callback/github"
echo "   🔍 Clear ALL cookies for grok-code2.vercel.app"
echo "   🔍 Try in incognito/private window"
echo ""

echo "6. Testing actual signin redirect..."
echo "   Visit this URL to see where it redirects:"
echo "   ${BASE_URL}/api/auth/signin/github"
echo "   (Should redirect to GitHub with redirect_uri parameter)"
echo ""

echo "========================================="
echo "Most Common Causes:"
echo "========================================="
echo ""
echo "1. ❌ GitHub OAuth callback URL mismatch"
echo "   → GitHub callback URL must match exactly: ${BASE_URL}/api/auth/callback/github"
echo ""
echo "2. ❌ Browser cache/cookies causing issues"
echo "   → Clear all cookies, try incognito"
echo ""
echo "3. ❌ NEXTAUTH_URL environment variable mismatch"
echo "   → Must be exactly: ${BASE_URL} (no trailing slash, no newline)"
echo ""
echo "4. ❌ NextAuth route not deployed correctly"
echo "   → Check that src/app/api/auth/[...nextauth]/route.ts exists"
echo ""

echo "========================================="
echo "Quick Fix Steps:"
echo "========================================="
echo ""
echo "1. Update GitHub OAuth App callback URL:"
echo "   https://github.com/settings/applications/3340678"
echo "   → Authorization callback URL: ${BASE_URL}/api/auth/callback/github"
echo ""
echo "2. Clear browser data:"
echo "   → Chrome: Settings → Privacy → Clear browsing data → Cookies"
echo "   → Select 'grok-code2.vercel.app' → Clear"
echo ""
echo "3. Test in incognito:"
echo "   → Open incognito window"
echo "   → Visit: ${BASE_URL}/login"
echo "   → Click 'Sign in with GitHub'"
echo ""
