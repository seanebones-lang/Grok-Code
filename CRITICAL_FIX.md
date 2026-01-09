# 🚨 CRITICAL FIX - OAuth Callback URL

## The Problem

Your GitHub OAuth **Authorization callback URL** is currently set to:
```
https://code.mothership-ai.com
```

## The Fix

It **MUST** be set to:
```
https://code.mothership-ai.com/api/auth/callback/github
```

## Steps to Fix

1. Go to: https://github.com/settings/applications/3328763
2. Find the **"Authorization callback URL"** field
3. Change it from: `https://code.mothership-ai.com`
4. Change it to: `https://code.mothership-ai.com/api/auth/callback/github`
5. Click **"Update application"** button

## Why This Matters

NextAuth requires the full callback path `/api/auth/callback/github` to handle the OAuth response from GitHub. Without this path, GitHub redirects to your homepage, which doesn't have the auth handler, causing a 404.

## After Fixing

1. Clear browser cookies
2. Try logging in again
3. It should work! ✅
