# ✅ OAuth 404 Fix - Complete Solution

## 🔍 Root Cause Analysis

The persistent 404 error when trying to OAuth with GitHub was caused by:

1. **Missing `trustHost` configuration** - NextAuth v4 with Next.js 13+ App Router requires `trustHost: true` to properly handle OAuth callbacks
2. **Middleware interference** - The middleware wasn't explicitly allowing `/api/auth/*` routes to pass through
3. **Missing base URL configuration** - NextAuth needs explicit base URL configuration for proper callback URL generation

## ✅ Fixes Applied

### 1. NextAuth Route Handler (`src/app/api/auth/[...nextauth]/route.ts`)

**Changes:**
- Added `trustHost: true` - Required for Next.js 13+ App Router
- Added explicit `baseUrl` configuration when `NEXTAUTH_URL` is set
- Added debug mode for development environment
- Improved error handling

**Key Code:**
```typescript
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // ✅ Critical for Next.js 13+ App Router
  ...(process.env.NEXTAUTH_URL && { baseUrl: process.env.NEXTAUTH_URL }),
  // ... rest of config
}
```

### 2. Middleware (`src/middleware.ts`)

**Changes:**
- Added explicit check to allow `/api/auth/*` routes to pass through without interference
- Improved matcher configuration to exclude static assets properly
- Ensured security headers are still applied to auth routes

**Key Code:**
```typescript
// CRITICAL: Always allow NextAuth routes to pass through
if (pathname.startsWith('/api/auth/')) {
  const response = NextResponse.next()
  // Add security headers but don't block the route
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}
```

### 3. Signout Page (`src/app/signout/page.tsx`)

**Changes:**
- Improved error handling with try-catch blocks
- Added proper redirect handling
- Better user feedback during signout process

## 🔧 Required Environment Variables

Ensure these are set in your deployment environment (Vercel/Railway/etc.):

```bash
NEXTAUTH_URL=https://code.mothership-ai.com
NEXTAUTH_SECRET=<your-secret-key>
GITHUB_ID=<your-github-oauth-app-client-id>
GITHUB_SECRET=<your-github-oauth-app-client-secret>
```

## 📋 GitHub OAuth App Configuration Checklist

1. **Authorization callback URL** must be EXACTLY:
   ```
   https://code.mothership-ai.com/api/auth/callback/github
   ```

2. **Homepage URL** should be:
   ```
   https://code.mothership-ai.com
   ```

3. **Verify in GitHub:**
   - Go to: https://github.com/settings/developers
   - Click on your OAuth App
   - Verify the callback URL matches exactly (including `/api/auth/callback/github`)

## 🧪 Testing Steps

1. **Clear browser cookies** for `code.mothership-ai.com`
2. **Deploy the changes** to your production environment
3. **Test the flow:**
   - Visit: `https://code.mothership-ai.com/login`
   - Click "Sign in with GitHub"
   - Should redirect to GitHub authorization
   - After authorizing, should redirect back to `/api/auth/callback/github` (not 404)
   - Should then redirect to home page (`/`)

4. **Test signout:**
   - Click sign out
   - Should redirect to `/login`
   - Try signing in again - should work without 404

## 🚨 Common Issues & Solutions

### Issue 1: Still getting 404 after fix
**Solution:**
- Verify `NEXTAUTH_URL` environment variable is set correctly
- Verify GitHub OAuth callback URL matches exactly
- Clear browser cookies and try in incognito mode
- Check deployment logs for any errors

### Issue 2: Signout not working
**Solution:**
- The signout page now has improved error handling
- If signout fails, it will manually redirect to login
- Check browser console for any errors

### Issue 3: Callback URL mismatch
**Solution:**
- GitHub callback URL must be: `https://code.mothership-ai.com/api/auth/callback/github`
- `NEXTAUTH_URL` must be: `https://code.mothership-ai.com`
- Both must match your actual domain

## 📝 Technical Details

### Why `trustHost: true` is Required

In Next.js 13+ App Router, NextAuth needs to trust the host header to generate correct callback URLs. Without this, NextAuth may generate incorrect URLs, causing 404 errors.

### Why Middleware Changes Matter

The middleware was potentially interfering with NextAuth routes. By explicitly allowing `/api/auth/*` routes to pass through first, we ensure OAuth callbacks are never blocked.

### NextAuth Route Structure

The route handler is correctly located at:
```
src/app/api/auth/[...nextauth]/route.ts
```

This catch-all route (`[...nextauth]`) handles all NextAuth endpoints:
- `/api/auth/signin`
- `/api/auth/callback/github`
- `/api/auth/signout`
- `/api/auth/session`
- etc.

## ✅ Verification

After deploying, verify:
- [ ] `NEXTAUTH_URL` is set in environment variables
- [ ] GitHub OAuth callback URL is correct
- [ ] Login flow works without 404
- [ ] Signout works properly
- [ ] Re-authentication after signout works

## 🎯 Next Steps

1. Deploy these changes to production
2. Verify environment variables are set
3. Test the complete OAuth flow
4. Monitor for any errors in deployment logs

If issues persist, check:
- Deployment logs for NextAuth errors
- Browser console for client-side errors
- Network tab for failed requests
