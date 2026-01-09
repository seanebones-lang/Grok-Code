# Step-by-Step Vercel Deployment Guide

## 🚀 Quick Deploy via Web Interface (Easiest)

### Step 1: Go to Vercel
1. Open https://vercel.com
2. Sign in with GitHub (recommended)

### Step 2: Import Your Project
1. Click **"Add New Project"** (or **"Import Project"**)
2. Select **"Import Git Repository"**
3. Choose your repository: `seanebones-lang/Grok-Code`
4. If not connected, click **"Connect GitHub"** and authorize

### Step 3: Configure Project
Vercel will auto-detect Next.js. Keep these settings:
- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `./` (default)
- **Build Command:** `prisma generate && next build` (already set in vercel.json)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

### Step 4: Add Environment Variables
**BEFORE clicking Deploy**, click **"Environment Variables"** and add:

#### Required Variables:

1. **GROK_API_KEY**
   - Value: Your xAI API key (from https://console.x.ai)
   - Format: `xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

2. **GITHUB_ID**
   - Value: GitHub OAuth App Client ID
   - Get it from: https://github.com/settings/developers
   - Environments: ✅ Production, ✅ Preview, ✅ Development

3. **GITHUB_SECRET**
   - Value: GitHub OAuth App Client Secret
   - Get it from: https://github.com/settings/developers
   - Environments: ✅ Production, ✅ Preview, ✅ Development

4. **NEXTAUTH_SECRET**
   - Value: Generate with: `openssl rand -base64 32`
   - Or use this command in terminal:
     ```bash
     openssl rand -base64 32
     ```
   - Copy the output and paste as value
   - Environments: ✅ Production, ✅ Preview, ✅ Development

5. **NEXTAUTH_URL**
   - Value: `https://your-project-name.vercel.app` (you'll get this after first deploy)
   - For now, use: `http://localhost:3000` (we'll update after deployment)
   - Environments: ✅ Production, ✅ Preview, ✅ Development

6. **DATABASE_URL**
   - Value: We'll set this up with Vercel Postgres (see Step 5)
   - Environments: ✅ Production, ✅ Preview, ✅ Development

#### Optional (but recommended):

7. **UPSTASH_REDIS_REST_URL**
   - Value: From Upstash dashboard
   - Environments: ✅ Production, ✅ Preview, ✅ Development

8. **UPSTASH_REDIS_REST_TOKEN**
   - Value: From Upstash dashboard
   - Environments: ✅ Production, ✅ Preview, ✅ Development

### Step 5: Set Up Vercel Postgres Database
1. In Vercel Dashboard, go to **Storage** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose a name (e.g., "nexteleven-db")
5. Select region closest to you
6. Click **"Create"**
7. Once created, go to **".env.local"** tab
8. Copy the `POSTGRES_PRISMA_URL` value
9. Go back to Environment Variables
10. Add `DATABASE_URL` with the `POSTGRES_PRISMA_URL` value you copied

### Step 6: Deploy!
1. Click **"Deploy"** button
2. Wait for build to complete (2-5 minutes)
3. Once deployed, you'll get a URL like: `https://grok-code-xxxxx.vercel.app`

### Step 7: Update URLs After Deployment
1. Copy your deployment URL
2. Go to **Settings → Environment Variables**
3. Update `NEXTAUTH_URL` to: `https://your-actual-url.vercel.app`
4. Go to GitHub → Settings → Developer settings → OAuth Apps
5. Update your OAuth App's **Authorization callback URL** to:
   `https://your-actual-url.vercel.app/api/auth/callback/github`

### Step 8: Run Database Migrations
1. In Vercel Dashboard → Your Project → **Deployments**
2. Click on your latest deployment
3. Go to **Functions** tab
4. Or use Vercel CLI (if you have it):
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

### Step 9: Test Your Deployment
1. Visit your Vercel URL
2. Try logging in with GitHub
3. Test the chat functionality
4. Connect a repository

## 🔧 Alternative: Using Vercel CLI

If you prefer CLI:

```bash
# Make sure vercel is in PATH
export PATH="$PATH:$(npm config get prefix)/bin"

# Or use npx
npx vercel login
npx vercel

# Set environment variables
npx vercel env add GROK_API_KEY
npx vercel env add GITHUB_ID
npx vercel env add GITHUB_SECRET
npx vercel env add NEXTAUTH_SECRET
npx vercel env add NEXTAUTH_URL
npx vercel env add DATABASE_URL

# Deploy to production
npx vercel --prod
```

## 📋 Environment Variables Summary

| Variable | Where to Get | Required |
|----------|-------------|:--------:|
| `GROK_API_KEY` | https://console.x.ai | ✅ |
| `GITHUB_ID` | GitHub OAuth App | ✅ |
| `GITHUB_SECRET` | GitHub OAuth App | ✅ |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | ✅ |
| `NEXTAUTH_URL` | Your Vercel URL (after deploy) | ✅ |
| `DATABASE_URL` | Vercel Postgres | ✅ |
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard | ❌ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard | ❌ |

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Verify all environment variables are set
- Make sure `DATABASE_URL` is correct

### Can't Login
- Verify `NEXTAUTH_URL` matches your deployment URL exactly
- Check GitHub OAuth callback URL matches
- Ensure `NEXTAUTH_SECRET` is set

### Database Errors
- Run migrations: `npx prisma migrate deploy`
- Verify `DATABASE_URL` is correct
- Check Prisma is generating: `prisma generate`

### API Errors
- Verify `GROK_API_KEY` is valid
- Check API logs in Vercel Dashboard
- Ensure rate limiting is configured (if using)

## ✅ Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] `NEXTAUTH_URL` updated to production URL
- [ ] GitHub OAuth callback URL updated
- [ ] Tested login functionality
- [ ] Tested chat functionality
- [ ] Tested repository connection
