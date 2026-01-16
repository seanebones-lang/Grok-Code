# 🔍 OAuth 404 Troubleshooting Guide

## What We've Fixed

1. ✅ Added `trustHost: true` to NextAuth config
2. ✅ Fixed middleware to allow `/api/auth/*` routes
3. ✅ Removed conflicting `baseUrl` configuration
4. ✅ Added error logging for sign-in events
5. ✅ Updated `NEXTAUTH_URL` to `https://grok-code2.vercel.app`

## Critical Checklist

### 1. GitHub OAuth App Configuration ⚠️ MOST COMMON ISSUE

**The callback URL MUST match exactly:**
```
https://grok-code2.vercel.app/api/auth/callback/github
```

**Steps:**
1. Go to: https://github.com/settings/developers
2. Click on your OAuth App
3. Verify **Authorization callback URL** is EXACTLY:
   ```
   https://grok-code2.vercel.app/api/auth/callback/github
   ```
4. **NOT** `https://grok-code2.vercel.app` (missing `/api/auth/callback/github`)
5. **NOT** `https://code.mothership-ai.com/api/auth/callback/github` (wrong domain)

### 2. Vercel Environment Variables

Verify in Vercel Dashboard → Project → Settings → Environment Variables:

- ✅ `NEXTAUTH_URL` = `https://grok-code2.vercel.app` (no trailing slash)
- ✅ `GITHUB_ID` = (your actual GitHub OAuth Client ID - not empty)
- ✅ `GITHUB_SECRET` = (your actual GitHub OAuth Client Secret - not empty)
- ✅ `NEXTAUTH_SECRET` = (your NextAuth secret - not empty)

### 3. Browser Cache & Cookies

**Clear everything:**
1. Open browser DevTools (F12)
2. Go to Application tab → Storage
3. Click "Clear site data"
4. Or use incognito/private window to test

### 4. Test the OAuth Flow Manually

1. **Visit**: https://grok-code2.vercel.app/login
2. **Click "Sign in with GitHub"**
3. **Check browser Network tab** (DevTools → Network):
   - Should see redirect to `https://github.com/login/oauth/authorize...`
   - After GitHub auth, should redirect to `https://grok-code2.vercel.app/api/auth/callback/github?...`
   - If you see a different URL or 404, that's the issue

## Common Error Patterns

### Error: "404 Not Found" after GitHub redirect
- **Cause**: GitHub callback URL doesn't match exactly
- **Fix**: Update GitHub OAuth callback URL to match `https://grok-code2.vercel.app/api/auth/callback/github`

### Error: "400 Bad Request" on callback
- **Cause**: Missing `code` or `state` parameter, or expired OAuth state
- **Fix**: Clear cookies and try again, verify GitHub OAuth app is configured correctly

### Error: Redirects to wrong domain
- **Cause**: `NEXTAUTH_URL` environment variable is wrong
- **Fix**: Update `NEXTAUTH_URL` in Vercel to `https://grok-code2.vercel.app`

### Error: "Cannot GET /api/auth/callback/github"
- **Cause**: Route handler not deployed or middleware blocking
- **Fix**: We've already fixed this, but verify the route exists in deployment

## Debug Steps

1. **Check Vercel Logs**:
   ```bash
   npx vercel logs grok-code2.vercel.app
   ```
   Look for errors related to NextAuth or OAuth

2. **Test the Route Directly**:
   Visit: `https://grok-code2.vercel.app/api/auth/signin`
   Should show NextAuth sign-in page, not 404

3. **Check Environment Variables Are Set**:
   ```bash
   npx vercel env ls | grep -i "GITHUB\|NEXTAUTH"
   ```
   All should show as "Encrypted" (meaning they have values)

4. **Verify Deployment Has Latest Code**:
   Check that your latest commit with `trustHost: true` is deployed

## Still Not Working?

If you've checked everything above and it still doesn't work:

1. **Share the exact error message** from browser console/network tab
2. **Share the URL** you're redirected to after GitHub authorization
3. **Check Vercel deployment logs** for any errors
4. **Verify GitHub OAuth App Client ID and Secret** are correct (not expired/invalid)

## Quick Fix Script

If you want to reset everything:

```bash
# 1. Verify NEXTAUTH_URL
echo "https://grok-code2.vercel.app" | npx vercel env add NEXTAUTH_URL production --force

# 2. Redeploy
npx vercel --prod

# 3. Update GitHub OAuth callback URL manually:
# Go to: https://github.com/settings/developers
# Set callback to: https://grok-code2.vercel.app/api/auth/callback/github
```
