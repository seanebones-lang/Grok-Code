# 🔗 Connect Railway to GitHub Repo (REQUIRED FOR AUTO-DEPLOY)

## ⚠️ CRITICAL: Railway service NOT connected to GitHub - deployments won't auto-trigger!

**Current Status:**
- ✅ Project: `f5e8ff6d-8551-4517-aa51-b0f0517ce110` (captivating-eagerness)
- ✅ Service: `ffb262a0-298a-4c68-ac53-01f4d20c5401` (Grok-Code)
- ❌ **NOT CONNECTED TO GITHUB** - Manual `railway up` only

## 🚀 FIX: Connect GitHub Repo (Railway Dashboard - 2min)

### Step 1: Open Railway Service Settings
**URL**: https://railway.com/project/f5e8ff6d-8551-4517-aa51-b0f0517ce110/service/ffb262a0-298a-4c68-ac53-01f4d20c5401/settings

### Step 2: Connect GitHub Repo
1. Scroll to **"Source"** or **"Repository"** section
2. Click **"Connect Repository"** or **"Change Source"**
3. Select **GitHub** → Authorize Railway
4. Choose repo: **`seanebones-lang/Grok-Code`**
5. Select branch: **`main`**
6. Click **"Connect"** or **"Save"**

### Step 3: Enable Auto-Deploy
- ✅ **Auto-Deploy**: Enabled (on push to `main`)
- ✅ **Root Directory**: `/` (or leave default)
- ✅ **Build Command**: `npm ci && npm run build` (from railway.toml)
- ✅ **Start Command**: `npm start` (from railway.toml)

### Step 4: Verify Connection
After connecting, Railway will:
1. ✅ Show GitHub repo link in service settings
2. ✅ Auto-deploy on next `git push main`
3. ✅ Show deployment status in Railway dashboard

## 🧪 Test Auto-Deploy

```bash
git commit --allow-empty -m "test railway auto-deploy"
git push origin main
# → Railway should auto-deploy within 1-2min
```

## 📋 Update GitHub Secrets (For Workflows)

If using GitHub Actions workflows, ensure these secrets are set:
- `RAILWAY_TOKEN` = Your Railway API token
- `RAILWAY_SERVICE_ID` = `ffb262a0-298a-4c68-ac53-01f4d20c5401`

**Set in**: GitHub Repo → Settings → Secrets → Actions

## ✅ Success Indicators

After connecting:
- ✅ Railway dashboard shows GitHub repo link
- ✅ Push to `main` triggers automatic deployment
- ✅ Railway logs show "Deploying from GitHub..."
- ✅ No more manual `railway up` needed!

## 🔧 Alternative: Recreate Service with GitHub

If connection fails:
1. Delete current service (or create new)
2. Railway Dashboard → "+ New" → "GitHub Repo"
3. Select `seanebones-lang/Grok-Code`
4. Railway auto-creates service with GitHub connected

---

**STATUS**: ⚠️ **ACTION REQUIRED** - Connect GitHub repo in Railway dashboard NOW!
