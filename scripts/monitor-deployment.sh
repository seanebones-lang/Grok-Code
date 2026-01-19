#!/bin/bash

# Monitor Vercel Deployment until successful
# Uses stored Vercel token to check deployment status

set -e

TOKEN_FILE=".vercel-token"
if [ -f "$TOKEN_FILE" ]; then
    export VERCEL_TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n' | tr -d ' ')
else
    echo "❌ Token file not found: $TOKEN_FILE"
    exit 1
fi

echo "🔍 Monitoring Vercel deployment..."
echo "   Project: nexteleven-code"
echo "   Dashboard: https://vercel.com/sean-mcdonnells-projects-4fbf31ab/nexteleven-code"
echo ""

# Check deployment status using Vercel CLI
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    echo "[Attempt $ATTEMPT/$MAX_ATTEMPTS] Checking deployment status..."
    
    # Use Vercel CLI to check latest deployment
    DEPLOYMENT_INFO=$(npx vercel ls --token "$VERCEL_TOKEN" --scope sean-mcdonnells-projects-4fbf31ab 2>/dev/null | head -5 || echo "")
    
    if [ -n "$DEPLOYMENT_INFO" ]; then
        echo "$DEPLOYMENT_INFO"
        
        # Check if we see a successful deployment
        if echo "$DEPLOYMENT_INFO" | grep -q "Ready\|Production"; then
            echo ""
            echo "✅ Deployment successful!"
            echo "   Check dashboard: https://vercel.com/sean-mcdonnells-projects-4fbf31ab/nexteleven-code"
            exit 0
        fi
    fi
    
    # Also check via API
    API_RESPONSE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v6/deployments?limit=1" 2>/dev/null || echo "")
    
    if echo "$API_RESPONSE" | grep -q "readyState.*READY\|state.*READY"; then
        echo ""
        echo "✅ Deployment successful (via API)!"
        exit 0
    fi
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "   ⏳ Waiting 10 seconds before next check..."
        sleep 10
    fi
done

echo ""
echo "⚠️  Max attempts reached. Please check deployment manually:"
echo "   https://vercel.com/sean-mcdonnells-projects-4fbf31ab/nexteleven-code"
echo ""
echo "💡 Deployment may still be in progress. Vercel typically takes 2-5 minutes."
