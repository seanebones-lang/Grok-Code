#!/bin/bash
# Run Prisma migrations on Railway
# This script provides multiple methods to run migrations

set -e

echo "🚂 Railway Migration Runner"
echo "============================"
echo ""

# Method 1: Via Railway CLI (if linked)
if railway status &>/dev/null; then
    echo "✅ Railway project is linked"
    echo "Running migration via Railway CLI..."
    railway run npx prisma migrate deploy
    echo "✅ Migration complete!"
    exit 0
fi

# Method 2: Via Railway Dashboard (instructions)
echo "⚠️  Railway project not linked via CLI"
echo ""
echo "To run migrations, use one of these methods:"
echo ""
echo "METHOD 1: Via Railway Dashboard (Recommended)"
echo "-----------------------------------------------"
echo "1. Go to: https://railway.app/dashboard"
echo "2. Select your Grok-Code project"
echo "3. Click on your service"
echo "4. Go to 'Deployments' tab"
echo "5. Click 'Run Command' or 'Shell'"
echo "6. Run: npx prisma migrate deploy"
echo ""
echo "METHOD 2: Link Railway CLI"
echo "---------------------------"
echo "1. Run: railway login"
echo "2. Run: railway link"
echo "3. Select your project from the list"
echo "4. Then run: railway run npx prisma migrate deploy"
echo ""
echo "METHOD 3: Direct Database Connection (if you have DATABASE_URL)"
echo "----------------------------------------------------------------"
echo "If you have the DATABASE_URL from Railway dashboard:"
echo "export DATABASE_URL='your_railway_database_url'"
echo "npx prisma migrate deploy"
echo ""

exit 1
