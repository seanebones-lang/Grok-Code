# ✅ Vercel API Token Stored

**Date:** January 14, 2026  
**Status:** ✅ Token Securely Stored

---

## 🔐 Token Storage

**Token Location:** `.vercel-token` (in `.gitignore`)  
**Token Type:** Vercel Master API Token  
**Status:** ✅ Stored securely, not in git

---

## 🚀 Usage

### Option 1: Automatic (Recommended)

The token is automatically loaded from `.vercel-token` file:

```bash
# Deploy to preview
./scripts/use-vercel-token.sh deploy

# Deploy to production
./scripts/use-vercel-token.sh prod

# Check status
./scripts/use-vercel-token.sh status
```

### Option 2: Environment Variable

```bash
export VERCEL_TOKEN=$(cat .vercel-token)
npx vercel --token $VERCEL_TOKEN --prod
```

### Option 3: Direct CLI

```bash
# Token is automatically used if .vercel-token exists
npx vercel --prod
```

---

## 📋 Available Commands

### Deploy to Preview
```bash
./scripts/use-vercel-token.sh deploy
```

### Deploy to Production
```bash
./scripts/use-vercel-token.sh prod
```

### Check Deployment Status
```bash
./scripts/use-vercel-token.sh status
```

### Using TypeScript API Client
```typescript
import { VercelAPIClient, deployToVercel } from '@/scripts/vercel-api'

// Use stored token
const client = new VercelAPIClient()

// Get project info
const project = await client.getProject('prj_PwrqmqyzcAbLuTN6vHnK3YfCyAxR')

// List deployments
const deployments = await client.listDeployments('prj_PwrqmqyzcAbLuTN6vHnK3YfCyAxR')

// Trigger deployment check
const result = await deployToVercel({ projectId: 'prj_PwrqmqyzcAbLuTN6vHnK3YfCyAxR' })
```

---

## 🔒 Security

- ✅ Token stored in `.vercel-token` (gitignored)
- ✅ Never committed to git
- ✅ Can be used via environment variable
- ✅ Scripts automatically load token

---

## 📝 Project Information

**Vercel Project:**
- **Name**: nexteleven-code
- **Project ID**: prj_PwrqmqyzcAbLuTN6vHnK3YfCyAxR
- **Production URL**: https://nexteleven-code.vercel.app
- **Custom Domain**: code.mothership-ai.com

---

## ✅ Token Verified

Token is stored and ready for use. All deployment scripts will automatically use this token.

---

**Status:** ✅ Token Stored and Ready  
**Next:** Use deployment scripts or Vercel CLI
