# Deployment Instructions After Changes

## ✅ What Was Pushed

All improvements have been committed and pushed to GitHub `main` branch:
- 8 critical gaps resolved (100% autonomy achieved)
- Circuit breaker, health checks, environment validation
- New Deployment model for rollback capability
- Full E2E workflow orchestrator

## 🚀 Auto-Deployment Status

### Railway
- ✅ **Auto-deploys on push to main** (via GitHub Actions)
- ⚠️ **Migration required** - New `Deployment` table needs to be created

### Vercel
- ✅ **Auto-deploys on push** (if connected to GitHub repo)
- ⚠️ **Migration required** - New `Deployment` table needs to be created

## 📋 Required Actions

### 1. Run Database Migrations

Both Railway and Vercel need the new `Deployment` table created.

#### For Railway:
```bash
# Option 1: Via Railway CLI
railway run npx prisma migrate deploy

# Option 2: Via Railway Dashboard
# Go to your service → Deployments → Run Command
# Command: npx prisma migrate deploy
```

#### For Vercel:
```bash
# Option 1: Via Vercel CLI (if you have database access)
vercel env pull .env.local
npx prisma migrate deploy

# Option 2: Via Vercel Dashboard
# Go to your project → Settings → Environment Variables
# Ensure DATABASE_URL is set, then run migrations via one-off command
# Or use Vercel Postgres and run migrations in the dashboard
```

### 2. Verify Environment Variables

#### New Optional Variables (not required, but recommended):
```bash
DEPLOYMENT_HEALTH_CHECK_ENABLED=true  # Enable auto-rollback on health check failure
AUTO_DEPLOY_ENABLED=true              # Enable auto-deployment after push
```

#### Existing Required Variables (should already be set):
- `GROK_API_KEY` ✅
- `GITHUB_TOKEN` ✅ (for repository operations)
- `DATABASE_URL` ✅
- `VERCEL_TOKEN` (optional, for Vercel deployments)
- `RAILWAY_TOKEN` (optional, for Railway deployments)

### 3. Check Deployment Status

#### Railway:
1. Go to: https://railway.app/project/080b0df0-f6c7-44c6-861f-c85c8256905b
2. Check if deployment is in progress or completed
3. View logs for any errors

#### Vercel:
1. Go to: https://vercel.com/dashboard
2. Check your project's latest deployment
3. View build logs

### 4. Test New Features

After deployment, test:
- ✅ Repository creation: `POST /api/github/create-repo`
- ✅ Full workflow: `POST /api/workflow/full-stack`
- ✅ Environment status: `GET /api/system/env-status`
- ✅ Deployment rollback: `POST /api/deployment/rollback`

## 🔍 Troubleshooting

### Migration Fails
- **Error:** "Table already exists"
  - Solution: Migration may have run automatically. Check database schema.
- **Error:** "Connection refused"
  - Solution: Verify `DATABASE_URL` is correct and accessible from deployment platform

### Build Fails
- **Error:** Missing environment variables
  - Solution: Check `src/lib/env-validator.ts` for required vars
  - Set missing variables in Railway/Vercel dashboard

### Deployment Health Checks Not Working
- **Issue:** Health checks not running
  - Solution: Set `DEPLOYMENT_HEALTH_CHECK_ENABLED=true` in environment variables

## 📊 Migration File

The migration file has been created at:
`prisma/migrations/20260115000000_add_deployment_history/migration.sql`

This creates the `deployments` table with all necessary indexes.

## ✅ Verification Checklist

- [ ] Railway deployment completed successfully
- [ ] Vercel deployment completed successfully (if applicable)
- [ ] Database migrations run on Railway
- [ ] Database migrations run on Vercel (if applicable)
- [ ] Environment variables verified
- [ ] New API endpoints tested
- [ ] Health checks working (if enabled)

## 🎯 Next Steps

Once deployments are complete and migrations are run:
1. Test the full workflow: Create a repo → Generate code → Deploy
2. Test rollback functionality
3. Monitor circuit breaker logs for GitHub API issues
4. Check environment status API for diagnostics

All code is ready - just need to run migrations on the databases!
