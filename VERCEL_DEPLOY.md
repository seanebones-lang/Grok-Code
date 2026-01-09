# Vercel Deployment Guide

## Quick Deploy

### Option 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### Option 2: GitHub Integration (Easiest)
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy!

## Required Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

### Core API Keys
```
GROK_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Your xAI Grok API key from [console.x.ai](https://console.x.ai)

### NextAuth Configuration
```
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=your-random-secret-here-generate-with-openssl-rand-base64-32
```
Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### GitHub OAuth (for repository access)
```
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
```

To create GitHub OAuth app:
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Authorization callback URL: `https://your-project.vercel.app/api/auth/callback/github`
4. Copy Client ID and Client Secret

### Database (PostgreSQL)
```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

**Vercel Postgres Setup:**
1. In Vercel Dashboard → Storage → Create Database → Postgres
2. Copy the connection string
3. Set as `DATABASE_URL`

### Rate Limiting (Upstash Redis)
```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Upstash Setup:**
1. Go to [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy REST URL and Token

### Optional (for enhanced features)
```
# For GitHub API (if using GitHub token)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Build Configuration

Vercel will automatically detect Next.js and use these settings:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

## Post-Deployment Steps

### 1. Run Database Migrations
After first deployment, run:
```bash
# Via Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy
```

Or use Vercel's built-in Postgres and run migrations in a one-off command.

### 2. Verify Environment Variables
Check that all required variables are set in Vercel Dashboard.

### 3. Test Authentication
- Visit your deployed site
- Try logging in with GitHub
- Verify repository connection works

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify `DATABASE_URL` is correct
- Ensure `NEXTAUTH_SECRET` is set
- Check build logs in Vercel Dashboard

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check if database is accessible from Vercel
- Run migrations: `npx prisma migrate deploy`

### Authentication Not Working
- Verify `NEXTAUTH_URL` matches your deployment URL
- Check `NEXTAUTH_SECRET` is set
- Verify GitHub OAuth callback URL matches

### API Errors
- Check `GROK_API_KEY` is valid
- Verify rate limiting Redis is configured
- Check API logs in Vercel Dashboard

## Environment-Specific Variables

You can set different values for:
- **Production** (Production branch)
- **Preview** (All other branches)
- **Development** (Local development)

Set variables for each environment in Vercel Dashboard.

## Monitoring

After deployment:
- Check Vercel Dashboard → Analytics
- Monitor API usage
- Check error logs
- Set up alerts for build failures

## Custom Domain

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update `NEXTAUTH_URL` to match your domain
4. DNS will be configured automatically
