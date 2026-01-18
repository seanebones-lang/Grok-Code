#!/bin/bash
# Script to run Prisma migrations on Railway database
# This uses Railway's internal URL which works when run via Railway CLI

if [ -z "$RAILWAY_TOKEN" ]; then
  echo "❌ Error: RAILWAY_TOKEN environment variable is required"
  echo "   Set it with: export RAILWAY_TOKEN=your_token"
  exit 1
fi
export DATABASE_URL="postgresql://postgres:CanjRuYicmTsBJobrKvDiLsJNwbXGNrK@postgres.railway.internal:5432/railway"

echo "🚂 Running Prisma migrations on Railway database..."
npx prisma migrate deploy --url "$DATABASE_URL"

echo "✅ Migrations complete!"
