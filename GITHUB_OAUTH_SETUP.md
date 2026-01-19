# GitHub OAuth Authentication Setup

## Overview

We're implementing GitHub OAuth login to replace API key authentication. Users will sign in with GitHub, and their session will protect API routes.

---

## Installation

### 1. Install NextAuth.js v5 (Auth.js)

```bash
npm install next-auth@beta
```

### 2. Files Created

- ✅ `auth.ts` - NextAuth configuration (root of project)
- ✅ `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API routes
- ✅ `src/lib/session-auth.ts` - Session-based authentication utility

---

## Configuration

### Environment Variables

**Required:**
```bash
# GitHub OAuth App credentials
GITHUB_ID=your_github_oauth_client_id
GITHUB_SECRET=your_github_oauth_app_client_secret

# NextAuth secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your_generated_secret
# OR (for compatibility)
NEXTAUTH_SECRET=your_generated_secret

# Your app URL (after deployment)
AUTH_URL=https://your-app.vercel.app
# OR (for compatibility)
NEXTAUTH_URL=https://your-app.vercel.app
```

**Optional (for compatibility):**
- `NEXTAUTH_SECRET` - Falls back to `AUTH_SECRET`
- `NEXTAUTH_URL` - Falls back to `AUTH_URL`

### GitHub OAuth App Setup

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/developers
   - Click **"New OAuth App"**

2. **Configure OAuth App**
   - **Application name**: `NextEleven Code` (or your app name)
   - **Homepage URL**: `https://your-app.vercel.app`
   - **Authorization callback URL**: `https://your-app.vercel.app/api/auth/callback/github`
   - Click **"Register application"**

3. **Copy Credentials**
   - Copy **Client ID** → Set as `GITHUB_ID`
   - Generate **Client secret** → Set as `GITHUB_SECRET`

---

## How It Works

### Authentication Flow

1. **User clicks "Sign in with GitHub"**
   - Redirects to: `/api/auth/signin/github`
   - NextAuth redirects to GitHub OAuth

2. **GitHub OAuth**
   - User authorizes app on GitHub
   - GitHub redirects to: `/api/auth/callback/github`
   - NextAuth creates JWT session

3. **Session Protection**
   - Middleware checks session on all `/api/**` routes
   - If no session → Returns `401` with sign-in URL
   - If session exists → Allows access

### Session Details

- **Type**: JWT (no database required)
- **Duration**: 30 days
- **Storage**: Secure HTTP-only cookie
- **Contains**: User info, GitHub access token, username

---

## API Routes Protected

All `/api/**` routes now require GitHub OAuth login:

**Protected Routes:**
- `/api/chat` - Chat API
- `/api/github/push` - GitHub push operations
- `/api/github/create-repo` - Repository creation
- `/api/deployment/trigger` - Deployment triggers
- `/api/deployment/rollback` - Rollback operations
- All other `/api/**` routes

**Public Routes (No Auth Required):**
- `/api/system/env-status` - Health check
- `/api/auth/*` - NextAuth routes (signin, callback, etc.)

---

## Implementation Status

### ✅ Completed

- [x] NextAuth configuration (`auth.ts`)
- [x] API route handler (`src/app/api/auth/[...nextauth]/route.ts`)
- [x] Session authentication utility (`src/lib/session-auth.ts`)
- [x] Middleware updated to use GitHub OAuth sessions

### ⚠️ Pending

- [ ] Install `next-auth@beta` package
- [ ] Add login/logout UI components
- [ ] Update API routes to use session GitHub token
- [ ] Test GitHub OAuth flow
- [ ] Update documentation

---

## Usage in Code

### Check Session in API Routes

```typescript
import { auth } from '@/../../../../auth'
import { getSessionUser, getGitHubToken } from '@/lib/session-auth'

export async function GET(request: NextRequest) {
  // Get session
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  
  // Get GitHub token from session
  const githubToken = await getGitHubToken()
  
  // Use GitHub token for API calls
  // ...
}
```

### Client-Side Session

```typescript
// In client components
import { useSession } from 'next-auth/react'

function MyComponent() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <div>Loading...</div>
  if (status === 'unauthenticated') return <div>Please sign in</div>
  
  return <div>Signed in as {session?.user?.name}</div>
}
```

---

## Migration from API Key Auth

### Before (API Key)
```bash
curl -H "X-API-Key: your_key" https://api.example.com/api/chat
```

### After (GitHub OAuth)
1. Sign in via browser: `https://api.example.com/api/auth/signin/github`
2. Session cookie automatically included in requests
3. No need for API key headers

---

## Benefits

✅ **User Authentication** - Real user accounts via GitHub  
✅ **No API Keys** - No need to generate/manage API keys  
✅ **GitHub Integration** - Automatic GitHub token in session  
✅ **Better Security** - OAuth is more secure than API keys  
✅ **User-Friendly** - Simple "Sign in with GitHub" button  

---

## Testing

### 1. Local Testing

```bash
# Start dev server
npm run dev

# Visit
http://localhost:3000/api/auth/signin/github
```

### 2. Verify Session

```bash
# Check if session exists
curl http://localhost:3000/api/auth/session
```

### 3. Test Protected Route

```bash
# Should return 401 without session
curl http://localhost:3000/api/chat

# After signing in, session cookie is sent automatically
# (Browser handles cookies automatically)
```

---

## Next Steps

1. **Install NextAuth**
   ```bash
   npm install next-auth@beta
   ```

2. **Set Environment Variables**
   - `GITHUB_ID` - From GitHub OAuth App
   - `GITHUB_SECRET` - From GitHub OAuth App
   - `AUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `AUTH_URL` - Your deployment URL

3. **Test GitHub OAuth Flow**
   - Sign in at `/api/auth/signin/github`
   - Verify callback works
   - Test protected API routes

4. **Add Login/Logout UI**
   - Add "Sign in with GitHub" button
   - Add logout functionality
   - Show user info when logged in

---

**Status**: Configuration files created, awaiting `next-auth@beta` installation and testing.
