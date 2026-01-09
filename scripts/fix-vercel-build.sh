#!/bin/bash

# Fix Vercel build by ensuring clean npm config
set -e

echo "🔧 Fixing Vercel build configuration..."

# Remove any npm auth from .npmrc
echo "📝 Updating .npmrc..."
cat > .npmrc << EOF
legacy-peer-deps=true
registry=https://registry.npmjs.org/
EOF

# Update vercel.json to use clean install
echo "📝 Updating vercel.json..."
cat > vercel.json << EOF
{
  "buildCommand": "prisma generate && next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install --legacy-peer-deps",
  "regions": ["iad1"],
  "env": {
    "PRISMA_GENERATE_DATAPROXY": "true"
  }
}
EOF

echo "✅ Configuration updated!"
echo ""
echo "🚀 Committing and pushing..."
git add .npmrc vercel.json
git commit -m "Fix Vercel build - clean npm config" || echo "No changes to commit"
git push

echo ""
echo "✅ Done! Vercel will auto-deploy from GitHub."
echo "   The npm auth error should be resolved."
