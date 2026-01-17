# 🔧 GitHub App Setup (Not OAuth App!)

Since you're just linking repos and not doing user sign-in, use a **GitHub App** or **Personal Access Token (PAT)** instead of OAuth.

## Option 1: GitHub Personal Access Token (Simplest)

### Setup:

1. **Create a PAT:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: `Grok-Code Repo Access`
   - Select scopes: `repo` (full control of private repositories)
   - Generate token and **copy it immediately** (you won't see it again!)

2. **Add to Vercel env vars:**
   ```bash
   GITHUB_TOKEN=<your-personal-access-token>
   ```

3. **That's it!** No OAuth flow, no sign-in, just use the token directly.

### Usage in code:
```typescript
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
```

## Option 2: GitHub App (More Secure, Better for Production)

### Setup:

1. **Create GitHub App:**
   - Go to: https://github.com/settings/apps
   - Click "New GitHub App"
   - Name: `Grok-Code`
   - Homepage: Your app URL
   - **Webhook: Disable** (unless you need webhooks)
   - **Where can this GitHub App be installed?** → "Only on this account"
   - Permissions needed:
     - **Repository contents**: Read & Write
     - **Repository metadata**: Read-only
     - **Pull requests**: Read & Write (if needed)
   - Click "Create GitHub App"

2. **Generate Private Key:**
   - After creating, scroll down and click "Generate a private key"
   - Save the `.pem` file securely

3. **Install the App:**
   - Go to app settings → "Install App"
   - Install on your account (or select specific repos)

4. **Get App ID and Installation ID:**
   - App ID is shown on the app settings page
   - Installation ID: After installing, it's in the URL or you can find it via API

5. **Add to Vercel env vars:**
   ```bash
   GITHUB_APP_ID=<your-app-id>
   GITHUB_APP_PRIVATE_KEY=<contents-of-pem-file>
   GITHUB_APP_INSTALLATION_ID=<installation-id>
   ```

### Usage in code:
```typescript
import { App } from '@octokit/app'
import { createAppAuth } from '@octokit/auth-app'

const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
})

// Get installation token
const { token } = await app.getInstallationAuthentication(
  parseInt(process.env.GITHUB_APP_INSTALLATION_ID!)
)

const octokit = new Octokit({ auth: token })
```

## Recommendation

For your use case (just linking your own repos), **Option 1 (PAT)** is simpler:
- ✅ No OAuth flow needed
- ✅ No user sign-in required  
- ✅ Works immediately
- ✅ Simple env var setup
- ⚠️  Less secure (one token for everything)

**Option 2 (GitHub App)** is better if:
- You want better security (per-repo permissions)
- You might expand to multiple repos/users
- You want better rate limits
- You need webhook support later

## Migration from OAuth

After choosing an option, update:
1. `Sidebar.tsx` - Replace `session.accessToken` with env var token
2. `/api/github/push/route.ts` - Replace auth check with env var token
3. `/api/agent/*/route.ts` - Replace session auth with env var token
4. Remove all OAuth/session code
