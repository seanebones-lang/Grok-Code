#!/bin/bash

# Script to update Vercel configuration for custom domain
# Usage: ./scripts/update-custom-domain.sh yourdomain.com

set -e

DOMAIN=$1
VERCEL_TOKEN=${VERCEL_TOKEN:-OsAZOPoqhyreAaZK7wsWpdxs}
PROJECT_NAME="nexteleven-code"

if [ -z "$DOMAIN" ]; then
  echo "❌ Error: Please provide your custom domain"
  echo "Usage: ./scripts/update-custom-domain.sh yourdomain.com"
  exit 1
fi

# Ensure domain doesn't have protocol
DOMAIN=$(echo $DOMAIN | sed 's|https\?://||' | sed 's|/$||')
FULL_URL="https://${DOMAIN}"

echo "🔧 Updating Vercel configuration for custom domain..."
echo "   Domain: ${DOMAIN}"
echo "   Full URL: ${FULL_URL}"
echo ""

# Update NEXTAUTH_URL for all environments
echo "📝 Updating NEXTAUTH_URL..."
echo "${FULL_URL}" | npx vercel env add NEXTAUTH_URL production --force --token $VERCEL_TOKEN
echo "${FULL_URL}" | npx vercel env add NEXTAUTH_URL preview --force --token $VERCEL_TOKEN
echo "http://localhost:3000" | npx vercel env add NEXTAUTH_URL development --force --token $VERCEL_TOKEN

echo ""
echo "✅ NEXTAUTH_URL updated!"
echo ""
echo "📝 Next steps:"
echo "1. Add your domain in Vercel Dashboard:"
echo "   https://vercel.com/sean-mcdonnells-projects-4fbf31ab/nexteleven-code/settings/domains"
echo ""
echo "2. Update GitHub OAuth callback URL to:"
echo "   ${FULL_URL}/api/auth/callback/github"
echo ""
echo "3. After domain is added, redeploy:"
echo "   npx vercel --prod --token $VERCEL_TOKEN"
echo ""
