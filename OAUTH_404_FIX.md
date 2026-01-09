# Fixing OAuth 404 Error

## 🔍 Problem
You're getting a 404 error when trying to log in, even though you're logged into GitHub.

## 🎯 Root Cause
The GitHub OAuth callback URL doesn't match your current NEXTAUTH_URL.

## ✅ Solution

### Step 1: Verify NEXTAUTH_URL in Vercel
Your NEXTAUTH_URL should be: `https://code.mothership-ai.com`

### Step 2: Update GitHub OAuth Callback URL
1. Go to: https://github.com/settings/developers
2. Click on your OAuth App
3. Find **"Authorization callback URL"**
4. Update it to EXACTLY:
   ```
   https://code.mothership-ai.com/api/auth/callback/github
   ```
5. Click **"Update application"**

### Step 3: Redeploy (Important!)
After updating NEXTAUTH_URL, you need to redeploy:
```bash
export VERCEL_TOKEN=OsAZOPoqhyreAaZK7wsWpdxs
npx vercel --prod --token $VERCEL_TOKEN
```

## 🔍 Common Issues

### Issue 1: Callback URL Mismatch
- **Symptom**: 404 error after GitHub redirect
- **Fix**: Make sure GitHub callback URL matches: `https://code.mothership-ai.com/api/auth/callback/github`

### Issue 2: NEXTAUTH_URL Not Updated
- **Symptom**: App redirects to wrong domain
- **Fix**: Verify NEXTAUTH_URL in Vercel matches your domain

### Issue 3: Route Not Found
- **Symptom**: 404 on `/api/auth/callback/github`
- **Fix**: The route exists at `src/app/api/auth/[...nextauth]/route.ts` - redeploy if needed

## 📝 Quick Checklist

- [ ] NEXTAUTH_URL in Vercel = `https://code.mothership-ai.com`
- [ ] GitHub OAuth callback = `https://code.mothership-ai.com/api/auth/callback/github`
- [ ] Redeployed after NEXTAUTH_URL change
- [ ] Tested the callback URL directly

## 🚀 After Fixing

1. Clear browser cookies for the site
2. Try logging in again
3. Should redirect properly after GitHub authorization
