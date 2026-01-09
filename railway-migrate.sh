#!/bin/bash
# Script to run Prisma migrations on Railway database
# This uses Railway's internal URL which works when run via Railway CLI

export RAILWAY_TOKEN=a5a4fc54-13b0-4467-b90e-c1512ab9c7fc
export DATABASE_URL="postgresql://postgres:CanjRuYicmTsBJobrKvDiLsJNwbXGNrK@postgres.railway.internal:5432/railway"

echo "🚂 Running Prisma migrations on Railway database..."
npx prisma migrate deploy --url "$DATABASE_URL"

echo "✅ Migrations complete!"
