# ✅ New GitHub OAuth App - Setup Checklist

Since you created a NEW OAuth App, here's what needs to match:

## Required: 3 Things Must Match

### 1. GitHub OAuth App "Authorization callback URL"
**Must be EXACTLY:**
```
https://grok-code2.vercel.app/api/auth/callback/github
```

### 2. GitHub OAuth App "Client ID"
**Must match GITHUB_ID in Vercel**

To check:
- Get Client ID from your new GitHub OAuth App
- Get GITHUB_ID from Vercel: `npx vercel env ls | grep GITHUB_ID`
- They must be THE SAME

### 3. GitHub OAuth App "Client Secret"
**Must match GITHUB_SECRET in Vercel**

To check:
- Get Client Secret from your new GitHub OAuth App  
- Get GITHUB_SECRET from Vercel: `npx vercel env ls | grep GITHUB_SECRET`
- They must be THE SAME

## Step-by-Step Verification

### Step 1: Check Your New OAuth App

1. Go to: https://github.com/settings/developers
2. Find your NEW OAuth App
3. Verify:
   - ✅ Authorization callback URL = `https://grok-code2.vercel.app/api/auth/callback/github`
   - ✅ Copy the "Client ID" (you'll need it for Step 2)
   - ✅ Copy the "Client Secret" (you'll need it for Step 3)

### Step 2: Verify GITHUB_ID in Vercel

```bash
npx vercel env ls | grep GITHUB_ID
```

**The Client ID from your new app MUST match the GITHUB_ID in Vercel.**

If they don't match:
- Update GITHUB_ID in Vercel to match your new app's Client ID

### Step 3: Verify GITHUB_SECRET in Vercel

```bash
npx vercel env ls | grep GITHUB_SECRET
```

**The Client Secret from your new app MUST match the GITHUB_SECRET in Vercel.**

If they don't match:
- Update GITHUB_SECRET in Vercel to match your new app's Client Secret

### Step 4: Redeploy (If You Updated Env Vars)

If you changed GITHUB_ID or GITHUB_SECRET in Vercel:
```bash
npx vercel --prod --yes
```

## Common Issues with New Apps

### Issue 1: Wrong Client ID
❌ **Symptom**: 404 or authorization fails
✅ **Fix**: Make sure GITHUB_ID in Vercel matches the Client ID from your new app

### Issue 2: Wrong Client Secret  
❌ **Symptom**: OAuth fails with "invalid client" error
✅ **Fix**: Make sure GITHUB_SECRET in Vercel matches the Client Secret from your new app

### Issue 3: Callback URL Mismatch
❌ **Symptom**: GitHub 404 error
✅ **Fix**: Set callback URL in GitHub to exactly: `https://grok-code2.vercel.app/api/auth/callback/github`

## Quick Test

After verifying all 3 match:

1. Clear browser cookies
2. Visit: https://grok-code2.vercel.app/login
3. Click "Sign in with GitHub"
4. Should work! ✅

## Summary

**The 3 things that MUST match:**
1. GitHub App Callback URL = `https://grok-code2.vercel.app/api/auth/callback/github`
2. GitHub App Client ID = Vercel GITHUB_ID
3. GitHub App Client Secret = Vercel GITHUB_SECRET

If all 3 match, OAuth will work!
