# 🔍 GitHub OAuth Callback URL Verification

Based on [GitHub's OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), here's what needs to match exactly.

## Critical Requirements from GitHub Docs

### 1. Callback URL Configuration

**In GitHub OAuth App Settings**, the **Authorization callback URL** must be:
```
https://grok-code2.vercel.app/api/auth/callback/github
```

**Important from GitHub docs:**
- The redirect URL's host must **exactly match** the callback URL
- The redirect URL's path must reference a subdirectory of the callback URL
- If `redirect_uri` is left out, GitHub redirects to the callback URL configured in OAuth app settings

### 2. What NextAuth Sends

NextAuth automatically generates the OAuth authorization URL with:
- `redirect_uri`: The callback URL (should be `/api/auth/callback/github`)
- `client_id`: Your GITHUB_ID
- `state`: A CSRF token
- `scope`: The requested scopes

## Verification Steps

### Step 1: Check Your GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click on your OAuth App
3. **Verify these settings:**

   **Application name**: (any name)
   **Homepage URL**: `https://grok-code2.vercel.app`
   **Authorization callback URL**: `https://grok-code2.vercel.app/api/auth/callback/github` ⚠️ MUST BE EXACT

### Step 2: Test the OAuth Flow

1. Visit: https://grok-code2.vercel.app/login
2. Open Browser DevTools → Network tab
3. Click "Sign in with GitHub"
4. **Check the redirect URL** - should be:
   ```
   https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https%3A%2F%2Fgrok-code2.vercel.app%2Fapi%2Fauth%2Fcallback%2Fgithub&scope=...
   ```
5. **After GitHub authorization**, you should be redirected to:
   ```
   https://grok-code2.vercel.app/api/auth/callback/github?code=...&state=...
   ```

### Step 3: Common Mismatch Issues

**❌ Wrong Callback URL in GitHub:**
```
https://grok-code2.vercel.app  (missing /api/auth/callback/github)
https://code.mothership-ai.com/api/auth/callback/github  (wrong domain)
http://grok-code2.vercel.app/api/auth/callback/github  (http instead of https)
```

**✅ Correct Callback URL:**
```
https://grok-code2.vercel.app/api/auth/callback/github
```

## Troubleshooting Based on GitHub Docs

### Issue: Redirect URI Mismatch

**From GitHub docs:** "The redirect URL's host (excluding sub-domains) and port must exactly match the callback URL."

**Check:**
- Callback URL in GitHub OAuth app = `https://grok-code2.vercel.app/api/auth/callback/github`
- NextAuth is generating `redirect_uri` = `https://grok-code2.vercel.app/api/auth/callback/github`

### Issue: Path Must Be Subdirectory

**From GitHub docs:** "The redirect URL's path must reference a subdirectory of the callback URL."

**Example:**
- Callback: `https://grok-code2.vercel.app/api/auth/callback/github`
- Redirect: `https://grok-code2.vercel.app/api/auth/callback/github` ✅
- Redirect: `https://grok-code2.vercel.app/api/auth/callback/github/extra` ✅
- Redirect: `https://grok-code2.vercel.app/api/auth/callback` ❌

## NextAuth Configuration

Our NextAuth config is correct:
```typescript
trustHost: true,  // Uses NEXTAUTH_URL automatically
// NextAuth will generate: {baseUrl}/api/auth/callback/github
```

Where `baseUrl` = `NEXTAUTH_URL` = `https://grok-code2.vercel.app`

So NextAuth generates: `https://grok-code2.vercel.app/api/auth/callback/github` ✅

## Final Verification Checklist

- [ ] GitHub OAuth App → Authorization callback URL = `https://grok-code2.vercel.app/api/auth/callback/github`
- [ ] Vercel → `NEXTAUTH_URL` = `https://grok-code2.vercel.app`
- [ ] Vercel → `GITHUB_ID` = (matches GitHub OAuth App Client ID)
- [ ] Vercel → `GITHUB_SECRET` = (matches GitHub OAuth App Client Secret)
- [ ] Test OAuth flow - check Network tab for exact redirect URLs
- [ ] Clear browser cookies before testing

## If Still Getting 404

1. **Check the exact URL** you're redirected to after GitHub authorization
2. **Share that URL** - it should be `https://grok-code2.vercel.app/api/auth/callback/github?...`
3. **If different**, that's the mismatch - update GitHub OAuth app callback URL to match
