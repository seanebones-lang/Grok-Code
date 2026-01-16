# 🔧 OAuth State Cookie Missing - Root Cause

## The Error

```
[next-auth][error][OAUTH_CALLBACK_ERROR] State cookie was missing.
```

## What's Happening

1. You click "Sign in with GitHub"
2. NextAuth generates a state cookie and redirects to GitHub
3. You authorize on GitHub
4. GitHub redirects back to `/api/auth/callback/github?code=...&state=...`
5. **NextAuth can't find the state cookie** → 404/error

## Why State Cookie is Missing

The state cookie is used for CSRF protection in OAuth flows. It's set when you initiate the OAuth flow and must be present when GitHub redirects back.

**Possible causes:**
1. **Cookies being cleared too early** - If you sign out during the OAuth flow, cookies get cleared
2. **Cookie domain mismatch** - Cookies set for wrong domain/path
3. **Cookie SameSite restrictions** - Browser blocking cookies due to SameSite policy
4. **Secure cookie requirements** - HTTPS cookies not being set properly

## Critical Fix: Don't Clear Cookies During OAuth Flow

The signout page is clearing cookies, but if you:
1. Click "Sign in" (creates state cookie)
2. Click "Sign out" (clears state cookie)
3. GitHub redirects back (no state cookie → error)

**Solution**: The signout flow shouldn't clear cookies if there's an active OAuth flow.

## Immediate Workaround

**If you're getting 404 after GitHub auth:**

1. **Clear ALL cookies for grok-code2.vercel.app**:
   - DevTools → Application → Cookies
   - Delete all cookies
   - Clear localStorage and sessionStorage

2. **Start fresh**:
   - Visit: `https://grok-code2.vercel.app/login`
   - Click "Sign in with GitHub" **immediately** (don't sign out first)
   - Complete the GitHub authorization
   - Should work now

3. **Use incognito window**:
   - Open incognito/private window
   - Visit: `https://grok-code2.vercel.app/login`
   - Click "Sign in with GitHub"
   - Fresh session = no cookie conflicts

## Long-term Fix Needed

We need to:
1. Check if OAuth flow is active before clearing cookies
2. Preserve OAuth state cookie during signout
3. Add better error handling for missing state cookie
4. Ensure cookies are set with correct domain/path for Vercel

## Verification

After the fix is deployed, test:
1. Go to `/login` page
2. Click "Sign in with GitHub" 
3. Complete GitHub authorization
4. Should redirect to `/` (home page) without 404

If you still get 404:
- Check browser console for cookie errors
- Verify cookies are being set (DevTools → Application → Cookies)
- Check the state cookie specifically (`next-auth.csrf-token` or `__Host-next-auth.csrf-token`)
