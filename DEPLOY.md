# Railway Deployment Guide

## Quick Deploy

Since Railway CLI requires interactive mode, here's the easiest way to deploy:

### Option 1: Via Railway Dashboard (Recommended)

1. **Go to Railway Dashboard:**
   https://railway.app/project/080b0df0-f6c7-44c6-861f-c85c8256905b

2. **Create New Service:**
   - Click "+ New" → "GitHub Repo"
   - Connect your GitHub account
   - Select the Grok-Code repository
   - Railway will auto-detect Next.js

3. **Add Environment Variables:**
   Click on your service → "Variables" tab → Add:
   ```
   GROK_API_KEY=your_grok_api_key_here
   GITHUB_ID=your_github_oauth_id
   GITHUB_SECRET=your_github_oauth_secret
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=https://your-app.railway.app (update after getting domain)
   DATABASE_URL=postgresql://postgres:password@postgres.railway.internal:5432/railway
   ```

4. **Link PostgreSQL Database:**
   - In your service, go to "Settings" → "Service"
   - Under "Connect", select your PostgreSQL service
   - Railway will automatically set DATABASE_URL

5. **Generate Domain:**
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - Copy the domain and update NEXTAUTH_URL

6. **Deploy:**
   Railway will automatically deploy when you push to GitHub, or click "Deploy" manually

### Option 2: Via Railway CLI (If you have GitHub repo)

```bash
export RAILWAY_TOKEN=a5a4fc54-13b0-4467-b90e-c1512ab9c7fc
railway link --project 080b0df0-f6c7-44c6-861f-c85c8256905b
railway up
```

## Post-Deployment

1. **Run Migrations:**
   ```bash
   railway run npx prisma migrate deploy
   ```

2. **Update GitHub OAuth Callback:**
   - Go to GitHub → Settings → Developer Settings → OAuth Apps
   - Update Authorization callback URL to: `https://your-app.railway.app/api/auth/callback/github`

3. **Test the deployment:**
   - Visit your Railway domain
   - Test login with GitHub
   - Test Grok chat functionality

## Environment Variables Summary

All these need to be set in Railway:
- `GROK_API_KEY` ✅
- `GITHUB_ID` ✅
- `GITHUB_SECRET` ✅
- `NEXTAUTH_SECRET` ✅
- `NEXTAUTH_URL` (set after getting domain)
- `DATABASE_URL` (auto-set when linking PostgreSQL)
