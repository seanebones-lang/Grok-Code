# 🔄 Restore Working OAuth Configuration

## What Happened

You had it working yesterday with `code.mothership-ai.com`. The domain changed to `grok-code2.vercel.app`, but the GitHub OAuth App callback URL wasn't updated.

## Quick Fix (Choose One)

### Option 1: Update GitHub OAuth App to New Domain (Recommended)

1. Go to: https://github.com/settings/developers
2. Find your OAuth App (matching your `GITHUB_ID`)
3. Update "Authorization callback URL" to:
   ```
   https://grok-code2.vercel.app/api/auth/callback/github
   ```
4. Click "Update application"

### Option 2: Revert Back to Old Working Domain

If you want to use `code.mothership-ai.com` again:

1. Update `NEXTAUTH_URL` in Vercel to: `https://code.mothership-ai.com`
2. Make sure GitHub OAuth App callback URL is: `https://code.mothership-ai.com/api/auth/callback/github`
3. Redeploy

## Current vs Previous

| Item | Previous (Working) | Current (Not Working) |
|------|-------------------|----------------------|
| Domain | `code.mothership-ai.com` | `grok-code2.vercel.app` |
| Callback URL | `https://code.mothership-ai.com/api/auth/callback/github` | `https://grok-code2.vercel.app/api/auth/callback/github` |
| GitHub OAuth App | ✅ Set correctly | ❌ Probably still set to old domain |

## The Fix

**Just update the GitHub OAuth App callback URL** to match your current domain (`grok-code2.vercel.app`). That's it. Everything else is already correct.
