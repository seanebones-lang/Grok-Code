# 🔧 Backend Environment Variables Fix

## Issue
The backend NextAuth configuration needs specific environment variables that may be missing or incorrectly named.

## Required Environment Variables for NextAuth

The NextAuth route handler at `src/app/api/auth/[...nextauth]/route.ts` requires:

1. **GITHUB_ID** - GitHub OAuth App Client ID
2. **GITHUB_SECRET** - GitHub OAuth App Client Secret  
3. **NEXTAUTH_SECRET** - Random secret for NextAuth session encryption
4. **NEXTAUTH_URL** - Base URL of your application (already set: `https://grok-code2.vercel.app`)

## Check Your Vercel Environment Variables

Go to: https://vercel.com/sean-mcdonnells-projects-4fbf31ab/grok-code2/settings/environment-variables

Make sure you have these **exact** variable names:
- ✅ `GITHUB_ID` (not `AUTH_GITHUB_ID`)
- ✅ `GITHUB_SECRET` (not `AUTH_GITHUB_SECRET`)
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL` = `https://grok-code2.vercel.app`

## If Variables Are Missing

If `GITHUB_ID` or `GITHUB_SECRET` are missing, add them:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click "Add New"
3. Add:
   - **Name**: `GITHUB_ID`
   - **Value**: Your GitHub OAuth App Client ID
   - **Environments**: Production, Preview, Development
4. Add:
   - **Name**: `GITHUB_SECRET`
   - **Value**: Your GitHub OAuth App Client Secret
   - **Environments**: Production, Preview, Development

## Verify GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click on your OAuth App
3. Verify **Authorization callback URL** is:
   ```
   https://grok-code2.vercel.app/api/auth/callback/github
   ```
4. Update if needed and click "Update application"

## After Adding Variables

1. **Redeploy** your application (Vercel will auto-deploy after env var changes)
2. Or trigger a manual deployment:
   ```bash
   npx vercel --prod
   ```
3. Test the OAuth flow at: https://grok-code2.vercel.app/login

## Quick Verification

To check if variables are set correctly:
```bash
npx vercel env ls | grep -i "GITHUB\|NEXTAUTH"
```

You should see:
- `GITHUB_ID`
- `GITHUB_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
