# Database Setup Guide

## Quick Setup Options

### Option 1: Supabase (Recommended - Free Tier)
1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Choose organization and set project name
4. Set database password (save it!)
5. Wait for project to be created (~2 minutes)
6. Go to Settings → Database
7. Copy the "Connection string" (URI format)
8. It looks like: `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

### Option 2: Neon (Free Serverless Postgres)
1. Go to https://neon.tech and sign up
2. Click "Create a project"
3. Choose project name and region
4. Copy the connection string from the dashboard
5. Format: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`

### Option 3: Vercel Postgres (If deploying to Vercel)
1. In Vercel dashboard, go to your project
2. Click "Storage" → "Create Database" → "Postgres"
3. Connection string is automatically added to environment variables
4. Copy the `POSTGRES_URL` value

## After Getting Connection String

Once you have your database connection string, update `.env.local`:

```bash
DATABASE_URL="your_connection_string_here"
```

Then run migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Testing the Connection

```bash
npx prisma studio
```

This opens a visual database browser at http://localhost:5555

## Production Deployment

When deploying to Vercel:
1. Add the `DATABASE_URL` environment variable in Vercel dashboard
2. Run migrations in production:
   ```bash
   npx prisma migrate deploy
   ```
