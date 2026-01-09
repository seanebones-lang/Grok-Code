#!/bin/bash

# Automated Vercel Deployment Script
set -e

echo "🚀 Starting automated Vercel deployment..."

# Check if .env.local exists and read variables
if [ -f .env.local ]; then
    echo "📋 Reading environment variables from .env.local..."
    source .env.local
fi

# Login to Vercel (non-interactive)
echo "🔐 Logging into Vercel..."
npx vercel login --yes 2>/dev/null || npx vercel login

# Deploy to Vercel (will create project if doesn't exist)
echo "📦 Deploying to Vercel..."
DEPLOY_OUTPUT=$(npx vercel --yes --prod 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract deployment URL
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*\.vercel\.app' | head -1)

if [ -z "$DEPLOY_URL" ]; then
    # Try to get URL from vercel project
    DEPLOY_URL=$(npx vercel ls | grep -o 'https://[^ ]*\.vercel\.app' | head -1)
fi

if [ -n "$DEPLOY_URL" ]; then
    echo "✅ Deployment URL: $DEPLOY_URL"
    
    # Set environment variables if they exist locally
    echo "🔧 Setting environment variables..."
    
    if [ -n "$GROK_API_KEY" ]; then
        echo "  Setting GROK_API_KEY..."
        echo "$GROK_API_KEY" | npx vercel env add GROK_API_KEY production
        echo "$GROK_API_KEY" | npx vercel env add GROK_API_KEY preview
        echo "$GROK_API_KEY" | npx vercel env add GROK_API_KEY development
    fi
    
    if [ -n "$GITHUB_ID" ]; then
        echo "  Setting GITHUB_ID..."
        echo "$GITHUB_ID" | npx vercel env add GITHUB_ID production
        echo "$GITHUB_ID" | npx vercel env add GITHUB_ID preview
        echo "$GITHUB_ID" | npx vercel env add GITHUB_ID development
    fi
    
    if [ -n "$GITHUB_SECRET" ]; then
        echo "  Setting GITHUB_SECRET..."
        echo "$GITHUB_SECRET" | npx vercel env add GITHUB_SECRET production
        echo "$GITHUB_SECRET" | npx vercel env add GITHUB_SECRET preview
        echo "$GITHUB_SECRET" | npx vercel env add GITHUB_SECRET development
    fi
    
    if [ -n "$NEXTAUTH_SECRET" ]; then
        echo "  Setting NEXTAUTH_SECRET..."
        echo "$NEXTAUTH_SECRET" | npx vercel env add NEXTAUTH_SECRET production
        echo "$NEXTAUTH_SECRET" | npx vercel env add NEXTAUTH_SECRET preview
        echo "$NEXTAUTH_SECRET" | npx vercel env add NEXTAUTH_SECRET development
    fi
    
    # Set NEXTAUTH_URL to deployment URL
    echo "  Setting NEXTAUTH_URL to $DEPLOY_URL..."
    echo "$DEPLOY_URL" | npx vercel env add NEXTAUTH_URL production
    echo "$DEPLOY_URL" | npx vercel env add NEXTAUTH_URL preview
    echo "http://localhost:3000" | npx vercel env add NEXTAUTH_URL development
    
    if [ -n "$DATABASE_URL" ]; then
        echo "  Setting DATABASE_URL..."
        echo "$DATABASE_URL" | npx vercel env add DATABASE_URL production
        echo "$DATABASE_URL" | npx vercel env add DATABASE_URL preview
        echo "$DATABASE_URL" | npx vercel env add DATABASE_URL development
    fi
    
    if [ -n "$UPSTASH_REDIS_REST_URL" ]; then
        echo "  Setting UPSTASH_REDIS_REST_URL..."
        echo "$UPSTASH_REDIS_REST_URL" | npx vercel env add UPSTASH_REDIS_REST_URL production
        echo "$UPSTASH_REDIS_REST_URL" | npx vercel env add UPSTASH_REDIS_REST_URL preview
        echo "$UPSTASH_REDIS_REST_URL" | npx vercel env add UPSTASH_REDIS_REST_URL development
    fi
    
    if [ -n "$UPSTASH_REDIS_REST_TOKEN" ]; then
        echo "  Setting UPSTASH_REDIS_REST_TOKEN..."
        echo "$UPSTASH_REDIS_REST_TOKEN" | npx vercel env add UPSTASH_REDIS_REST_TOKEN production
        echo "$UPSTASH_REDIS_REST_TOKEN" | npx vercel env add UPSTASH_REDIS_REST_TOKEN preview
        echo "$UPSTASH_REDIS_REST_TOKEN" | npx vercel env add UPSTASH_REDIS_REST_TOKEN development
    fi
    
    echo ""
    echo "✅ Deployment complete!"
    echo "🌐 Your app is live at: $DEPLOY_URL"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update GitHub OAuth callback URL to: $DEPLOY_URL/api/auth/callback/github"
    echo "2. Visit: https://github.com/settings/developers"
    echo "3. Edit your OAuth App"
    echo "4. Update Authorization callback URL"
    echo ""
else
    echo "⚠️  Could not extract deployment URL. Check Vercel dashboard."
fi
