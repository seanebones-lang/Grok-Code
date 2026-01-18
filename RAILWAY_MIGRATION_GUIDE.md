# Railway Migration Guide

## 🚂 Running Prisma Migrations on Railway

Since Railway CLI requires interactive mode, here are the **3 easiest methods**:

---

## Method 1: Via Railway Dashboard (Easiest - Recommended) ⭐

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app/dashboard
   - Select your **Grok-Code** project

2. **Open Your Service:**
   - Click on your Next.js service (the one running the app)

3. **Run Migration Command:**
   - Go to the **"Deployments"** tab
   - Click **"Run Command"** or **"Shell"** button
   - In the command prompt, run:
     ```bash
     npx prisma migrate deploy
     ```
   - Press Enter

4. **Verify:**
   - You should see migration output showing the `deployments` table being created
   - Check for "✅ Migration completed successfully"

---

## Method 2: Via Railway CLI (If You Have Access)

**Step 1: Navigate to Project Directory**
```bash
cd ~/Desktop/The\ Forge/Grok-Code
```

**Step 2: Link Railway Project**
```bash
railway link
```
- Select your workspace
- Select the **Grok-Code** project from the list

**Step 3: Run Migration**
```bash
railway run npx prisma migrate deploy
```

---

## Method 3: Direct Database Connection (Advanced)

If you have the `DATABASE_URL` from Railway dashboard:

1. **Get DATABASE_URL:**
   - Go to Railway Dashboard → Your Project → PostgreSQL Service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value

2. **Run Migration Locally:**
   ```bash
   cd ~/Desktop/The\ Forge/Grok-Code
   export DATABASE_URL="your_railway_database_url_here"
   npx prisma migrate deploy
   ```

---

## ✅ What the Migration Does

The migration creates the `deployments` table with:
- Deployment history tracking
- Rollback capability
- Status tracking (pending/success/failed/rolled_back)
- Indexes for efficient queries

**Migration File:** `prisma/migrations/20260115000000_add_deployment_history/migration.sql`

---

## 🔍 Verification

After running the migration, verify it worked:

1. **Check Railway Logs:**
   - Should see "Migration completed successfully"

2. **Test the API:**
   - Visit: `https://your-app.railway.app/api/system/env-status`
   - Should return environment status (no database errors)

3. **Check Database (if you have access):**
   ```bash
   railway run npx prisma studio
   ```
   - Should see `deployments` table in the list

---

## ⚠️ Troubleshooting

**Error: "Migration already applied"**
- ✅ Good! Migration already ran (maybe auto-deployed)
- Check if `deployments` table exists

**Error: "Connection refused"**
- Verify `DATABASE_URL` is set in Railway
- Check PostgreSQL service is running

**Error: "Table already exists"**
- Migration may have run automatically
- Check database schema to confirm

---

## 📋 Quick Reference

**Recommended Command (via Dashboard):**
```bash
npx prisma migrate deploy
```

**What Gets Created:**
- Table: `deployments`
- Indexes: 3 indexes for efficient queries
- Columns: 13 columns for deployment tracking

**Time Required:** ~10-30 seconds

---

## 🎯 Next Steps After Migration

1. ✅ Migration complete
2. Test new endpoints:
   - `GET /api/system/env-status`
   - `POST /api/github/create-repo`
   - `POST /api/workflow/full-stack`
3. Enable optional features:
   - Set `DEPLOYMENT_HEALTH_CHECK_ENABLED=true` in Railway variables
   - Set `AUTO_DEPLOY_ENABLED=true` in Railway variables

---

**Need Help?** Check Railway logs in the dashboard for detailed error messages.
