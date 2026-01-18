# Fix Configuration Mismatch - Production vs Project Settings

## Problem

You're seeing: "Configuration Settings in the current Production deployment differ from your current Project Settings"

This typically means environment variables or build settings in production don't match what the code expects.

---

## Solution: Add Missing Environment Variable

### Update: API Authentication is Now Optional

**Good News**: API authentication is now optional - if `NEXTELEVEN_API_KEY` is not set, routes work without authentication (with a warning).

**Important Distinction:**
- `GROK_API_KEY` = **xAI (Grok) API key** for AI chat features (from console.x.ai) - **REQUIRED**
- `NEXTELEVEN_API_KEY` = Optional API authentication key (protects your `/api` routes) - **OPTIONAL**

The configuration mismatch is likely unrelated to `NEXTELEVEN_API_KEY` since it's now optional. Check other required variables like `GROK_API_KEY`.

---

## Fix for Vercel

### Option 1: Via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your **Grok-Code** project

2. **Open Settings → Environment Variables**
   - Click on your project
   - Go to **Settings** tab
   - Click **Environment Variables** in the sidebar

3. **Add Missing Variable**
   - Click **"Add New"**
   - **Key**: `NEXTELEVEN_API_KEY`
   - **Value**: Generate one with:
     ```bash
     openssl rand -hex 32
     ```
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click **"Save"**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment
   - Click **"Redeploy"**

### Option 2: Via Vercel CLI

```bash
# Generate API key
openssl rand -hex 32

# Set environment variable (replace YOUR_KEY with generated key)
npx vercel env add NEXTELEVEN_API_KEY production
npx vercel env add NEXTELEVEN_API_KEY preview
npx vercel env add NEXTELEVEN_API_KEY development

# Redeploy
npx vercel --prod
```

---

## Fix for Railway

### Via Railway Dashboard

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Select your **Grok-Code** project
   - Click on your service

2. **Add Environment Variable**
   - Go to **Variables** tab
   - Click **"+ New Variable"**
   - **Name**: `NEXTELEVEN_API_KEY`
   - **Value**: Generate with:
     ```bash
     openssl rand -hex 32
     ```
   - Click **"Add"**

3. **Redeploy** (Railway will auto-redeploy on variable change)

### Via Railway CLI

```bash
# Generate API key
openssl rand -hex 32

# Set environment variable (replace YOUR_KEY with generated key)
railway variables set NEXTELEVEN_API_KEY=YOUR_KEY

# Railway will auto-redeploy
```

---

## Complete Environment Variables Checklist

Verify all these are set in your production deployment:

### ✅ Required

- [ ] `GROK_API_KEY` - **xAI (Grok) API key** - Get from https://console.x.ai (for AI chat features)
- [ ] `NEXTELEVEN_API_KEY` - **NEW** - Your own API authentication key (protects your `/api` routes - generate with `openssl rand -hex 32`)

### ✅ Recommended (for full functionality)

- [ ] `GITHUB_TOKEN` - GitHub Personal Access Token (for repo operations)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_URL` - Your deployment URL (e.g., `https://your-app.vercel.app`)
- [ ] `NEXTAUTH_SECRET` - Authentication secret (generate with `openssl rand -base64 32`)
- [ ] `UPSTASH_REDIS_REST_URL` - Upstash Redis URL (for rate limiting)
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token (for rate limiting)

### ⚠️ Optional (for deployments)

- [ ] `VERCEL_TOKEN` - Vercel API token (if auto-deploying to Vercel)
- [ ] `RAILWAY_TOKEN` - Railway API token (if auto-deploying to Railway)
- [ ] `AUTO_DEPLOY_ENABLED` - Set to `true` to enable auto-deployment

---

## Verify Configuration

### Check Environment Variables in Production

**Vercel:**
```bash
npx vercel env ls
```

**Railway:**
```bash
railway variables
```

### Test API Authentication

After adding `NEXTELEVEN_API_KEY`, test the API:

```bash
# Should work without auth (health check)
curl https://your-app.vercel.app/api/system/env-status

# Should require API key (other endpoints)
curl https://your-app.vercel.app/api/chat
# Should return: {"error":"Authentication required",...}

# Should work with API key
curl -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  https://your-app.vercel.app/api/chat
```

---

## Common Configuration Mismatches

### 1. Missing `NEXTELEVEN_API_KEY` (Most Common)

**Symptom**: "Configuration Settings differ" error  
**Fix**: Add `NEXTELEVEN_API_KEY` as shown above

### 2. `NEXTAUTH_URL` Mismatch

**Symptom**: Authentication not working  
**Fix**: Set `NEXTAUTH_URL` to your exact production URL

### 3. Missing `DATABASE_URL`

**Symptom**: Database errors  
**Fix**: Ensure `DATABASE_URL` is set and accessible

### 4. Build Command Mismatch

**Symptom**: Build fails  
**Fix**: Ensure build command includes Prisma generation:
```bash
prisma generate && next build
```

---

## Quick Fix Script

If you're using Vercel CLI, run this script:

```bash
#!/bin/bash
# Quick fix for configuration mismatch

echo "🔧 Fixing configuration mismatch..."

# Generate API key
API_KEY=$(openssl rand -hex 32)
echo "Generated API key: ${API_KEY:0:16}..."

# Add to all environments
echo "📝 Adding NEXTELEVEN_API_KEY to Vercel..."
echo "$API_KEY" | npx vercel env add NEXTELEVEN_API_KEY production
echo "$API_KEY" | npx vercel env add NEXTELEVEN_API_KEY preview
echo "$API_KEY" | npx vercel env add NEXTELEVEN_API_KEY development

echo "✅ Done! Save this API key securely:"
echo "$API_KEY"
echo ""
echo "🚀 Redeploying to production..."
npx vercel --prod
```

---

## After Fixing

1. ✅ Add `NEXTELEVEN_API_KEY` to production
2. ✅ Verify all required env vars are set
3. ✅ Redeploy to production
4. ✅ Test health check endpoint
5. ✅ Test authenticated endpoint with API key
6. ✅ Update API clients to include `X-API-Key` header

---

## Still Having Issues?

If the error persists after adding `NEXTELEVEN_API_KEY`:

1. **Check Vercel Build Logs**
   - Go to Deployments → Click on failed deployment → View logs

2. **Check Environment Variables**
   - Verify all variables are set for the correct environment (Production/Preview/Development)

3. **Compare with Local `.env.local`**
   - Ensure production has all variables from your local `.env.local`

4. **Check Next.js Config**
   - Verify `next.config.ts` doesn't have environment-specific settings

5. **Clear Build Cache**
   - In Vercel: Settings → Build & Development Settings → Clear Build Cache

---

**Most Common Fix**: Add `NEXTELEVEN_API_KEY` to your production environment variables. This is required after the recent security updates.
