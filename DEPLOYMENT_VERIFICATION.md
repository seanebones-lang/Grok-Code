# Deployment Integration Verification

## Overview

This document verifies the end-to-end deployment flow: **Push → Deploy → Rollback**

---

## Current Status: ✅ PARTIALLY VERIFIED

### Flow Components

1. ✅ **GitHub Push API** (`/api/github/push`) - Implemented with retry logic
2. ✅ **Deployment Trigger API** (`/api/deployment/trigger`) - Implemented for Vercel/Railway/AWS
3. ✅ **Rollback API** (`/api/deployment/rollback`) - Implemented with Git revert
4. ⚠️ **Auto-Deploy Integration** - Implemented but needs verification

---

## Auto-Deploy Flow

### Configuration

Set environment variable to enable auto-deployment after GitHub push:

```bash
AUTO_DEPLOY_ENABLED=true
```

### Current Implementation

**Location**: `src/app/api/github/push/route.ts` (lines 248-275)

```typescript
// After successful push
if (process.env.AUTO_DEPLOY_ENABLED === 'true') {
  setImmediate(async () => {
    const deployResponse = await fetch(`${baseUrl}/api/deployment/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner,
        repo,
        branch,
        commitSha: commit.sha,
      }),
    })
  })
}
```

### ⚠️ Potential Issue: Internal API Authentication

**Problem**: The internal `fetch` call to `/api/deployment/trigger` doesn't include authentication headers.

**Impact**: If API authentication is enabled, the internal deployment trigger call will fail with `401 Unauthorized`.

**Solution Options**:

1. **Option A: Internal Service Token** (Recommended)
   - Create a separate `INTERNAL_API_KEY` for service-to-service calls
   - Use this key for internal API calls (deployment trigger, etc.)
   - Add to deployment trigger fetch call

2. **Option B: Skip Auth for Internal Calls**
   - Add `X-Internal-Request: true` header
   - Update middleware to allow internal requests from same service

3. **Option C: Direct Function Call**
   - Instead of HTTP fetch, directly import and call deployment trigger function
   - Bypasses authentication layer for internal operations

---

## Deployment Verification Checklist

### 1. GitHub Push → Auto-Deploy

- [ ] Set `AUTO_DEPLOY_ENABLED=true` environment variable
- [ ] Push files via `/api/github/push` endpoint
- [ ] Verify deployment trigger is called (check logs)
- [ ] Verify deployment appears in deployment platform (Vercel/Railway dashboard)
- [ ] Verify deployment URL is returned

### 2. Deployment Trigger

**Endpoint**: `POST /api/deployment/trigger`

**Request**:
```json
{
  "owner": "username",
  "repo": "repo-name",
  "branch": "main",
  "commitSha": "abc123...",
  "target": "vercel" // or "railway" or "aws"
}
```

**Verification**:
- [ ] Creates deployment record in database
- [ ] Triggers deployment on target platform
- [ ] Returns deployment URL
- [ ] Performs health check (if enabled)
- [ ] Handles errors gracefully

### 3. Rollback Mechanism

**Endpoint**: `POST /api/deployment/rollback`

**Request**:
```json
{
  "repoOwner": "username",
  "repoName": "repo-name",
  "branch": "main"
}
```

**Verification**:
- [ ] Finds previous successful deployment
- [ ] Creates Git revert commit
- [ ] Updates branch reference
- [ ] Triggers new deployment with previous commit
- [ ] Marks current deployment as rolled back

### 4. Health Check & Auto-Rollback

**Configuration**: `DEPLOYMENT_HEALTH_CHECK_ENABLED=true`

**Verification**:
- [ ] Health check runs after deployment
- [ ] Failed health check triggers automatic rollback
- [ ] Rollback status is tracked in database
- [ ] Alerts/logs are generated for failures

---

## Testing End-to-End Flow

### Manual Test Script

```bash
# 1. Push files to GitHub
curl -X POST http://localhost:3000/api/github/push \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "your-username",
    "repo": "test-repo",
    "branch": "main",
    "files": [
      {
        "path": "test.txt",
        "content": "Hello, World!"
      }
    ],
    "message": "Test deployment"
  }'

# 2. Check deployment trigger (if AUTO_DEPLOY_ENABLED=true)
# Should see deployment in logs and platform dashboard

# 3. Verify deployment status
curl http://localhost:3000/api/deployment/trigger \
  -H "X-API-Key: your_api_key"

# 4. Test rollback (if deployment failed)
curl -X POST http://localhost:3000/api/deployment/rollback \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "repoOwner": "your-username",
    "repoName": "test-repo",
    "branch": "main"
  }'
```

---

## Recommended Fixes

### Priority 1: Fix Internal API Call Authentication

**File**: `src/app/api/github/push/route.ts`

**Change**: Add internal API key to deployment trigger call

```typescript
// Option A: Use internal service token
const internalApiKey = process.env.INTERNAL_API_KEY || process.env.NEXTELEVEN_API_KEY

const deployResponse = await fetch(`${baseUrl}/api/deployment/trigger`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': internalApiKey, // Add this
  },
  body: JSON.stringify({...}),
})
```

### Priority 2: Add Deployment Status Endpoint

**New Endpoint**: `GET /api/deployment/status/:deploymentId`

Returns current deployment status, URL, and health check results.

### Priority 3: Add Deployment Webhooks

**Configuration**: `DEPLOYMENT_WEBHOOK_URL`

Send webhook notifications when:
- Deployment starts
- Deployment succeeds
- Deployment fails
- Rollback occurs

---

## Production Deployment Checklist

- [ ] `AUTO_DEPLOY_ENABLED=true` is set
- [ ] `DEPLOYMENT_HEALTH_CHECK_ENABLED=true` is set (optional)
- [ ] Internal API authentication is fixed (see Priority 1 above)
- [ ] `VERCEL_TOKEN` or `RAILWAY_TOKEN` is configured
- [ ] `VERCEL_PROJECT_ID` is set (for Vercel)
- [ ] Database migrations are run
- [ ] Test deployment flow end-to-end in staging
- [ ] Monitor deployment logs for errors
- [ ] Set up alerts for deployment failures

---

## Known Limitations

1. **Railway Deployment**: Currently relies on auto-deploy on push (no explicit API trigger)
2. **AWS Deployment**: Placeholder - not fully implemented
3. **Deployment Queuing**: No queue for concurrent deployments (may cause conflicts)
4. **Deployment History**: Stored in database but no UI to view history

---

## Next Steps

1. **Fix internal API authentication** (Priority 1) - Blocking for production
2. **Test end-to-end flow** in staging environment
3. **Add deployment status endpoint** for monitoring
4. **Implement deployment webhooks** for notifications
5. **Add deployment history UI** for visibility

---

**Status**: Deployment integration is functional but needs authentication fix for internal calls before production deployment.
