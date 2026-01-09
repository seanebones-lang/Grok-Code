# Vercel Environment Variables Checklist

## ✅ Required Variables (Set these in Vercel Dashboard)

### 1. Core API Keys
- [ ] `GROK_API_KEY` - Your xAI Grok API key
  - Get it from: https://console.x.ai
  - Format: `xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. NextAuth Configuration
- [ ] `NEXTAUTH_URL` - Your Vercel deployment URL
  - Set after first deployment: `https://your-project.vercel.app`
  - Will be: `https://your-project-name.vercel.app`

- [ ] `NEXTAUTH_SECRET` - Random secret (min 32 chars)
  - Generate with: `openssl rand -base64 32`
  - Or use: `openssl rand -hex 32`

### 3. GitHub OAuth
- [ ] `GITHUB_ID` - GitHub OAuth App Client ID
- [ ] `GITHUB_SECRET` - GitHub OAuth App Client Secret

**To create GitHub OAuth App:**
1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: `NextEleven Code`
   - Homepage URL: `https://your-project.vercel.app`
   - Authorization callback URL: `https://your-project.vercel.app/api/auth/callback/github`
4. Copy Client ID and Client Secret

### 4. Database
- [ ] `DATABASE_URL` - PostgreSQL connection string

**Vercel Postgres Setup:**
1. In Vercel Dashboard → Storage → Create Database → Postgres
2. Copy the connection string (auto-generated)
3. Set as `DATABASE_URL`

### 5. Rate Limiting (Optional but Recommended)
- [ ] `UPSTASH_REDIS_REST_URL` - Upstash Redis URL
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token

**Upstash Setup:**
1. Go to: https://upstash.com
2. Create Redis database
3. Copy REST URL and Token

## 📝 Quick Reference

After deployment, your URLs will be:
- Production: `https://your-project.vercel.app`
- Preview: `https://your-project-git-branch.vercel.app`

Update GitHub OAuth callback URL to match your production URL!
