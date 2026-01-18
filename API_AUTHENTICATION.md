# API Authentication Guide

## Overview

All `/api/**` routes (except public health checks) now require API key authentication and are protected by rate limiting.

## Setup

### 1. Generate API Key

Generate a secure random API key:

```bash
# Option 1: Using OpenSSL
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Set Environment Variable

Add to your `.env.local` or deployment environment:

```bash
NEXTELEVEN_API_KEY=your_generated_api_key_here
```

**Important:** 
- In production, `NEXTELEVEN_API_KEY` is **required**
- In development, if not set, API access is allowed (with a warning)

## Usage

### Option 1: X-API-Key Header (Recommended)

```bash
curl -H "X-API-Key: your_api_key_here" \
  https://your-domain.com/api/chat
```

### Option 2: Authorization Bearer Token

```bash
curl -H "Authorization: Bearer your_api_key_here" \
  https://your-domain.com/api/chat
```

### JavaScript/TypeScript Example

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.NEXTELEVEN_API_KEY, // or Authorization: Bearer
  },
  body: JSON.stringify({ message: 'Hello' }),
})
```

## Public Endpoints (No Auth Required)

These endpoints don't require authentication:

- `GET /api/system/env-status` - Health check and environment status

## Rate Limiting

- **Limit**: 100 requests per hour per client
- **Headers**: Rate limit status is included in response headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: ISO timestamp when limit resets
- **Response**: `429 Too Many Requests` when limit exceeded

### Example Rate Limit Response

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-01-14T18:00:00.000Z
Retry-After: 3600

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 100 requests per hour...",
  "retryAfter": 3600
}
```

## Error Responses

### 401 Unauthorized (Missing API Key)

```json
{
  "error": "Authentication required",
  "message": "Provide API key via X-API-Key header or Authorization: Bearer token",
  "requestId": "..."
}
```

### 401 Unauthorized (Invalid API Key)

```json
{
  "error": "Invalid API key",
  "message": "The provided API key is invalid",
  "requestId": "..."
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 100 requests per hour...",
  "requestId": "...",
  "retryAfter": 3600
}
```

## Security Features

1. **Constant-Time Comparison**: API key validation uses constant-time comparison to prevent timing attacks
2. **Secure Token Storage**: Never log or expose API keys in responses
3. **Rate Limiting**: Prevents abuse and DoS attacks
4. **Public Endpoint Whitelist**: Health checks accessible without auth

## Migration from No-Auth

If you're upgrading from a version without authentication:

1. Set `NEXTELEVEN_API_KEY` environment variable
2. Update all API clients to include the `X-API-Key` header
3. Test health check endpoint: `GET /api/system/env-status` (should work without auth)
4. Test authenticated endpoint: `POST /api/chat` (should work with auth, fail without)

## Production Checklist

- [ ] `NEXTELEVEN_API_KEY` is set in production environment
- [ ] API key is strong (32+ characters, random)
- [ ] API key is rotated periodically
- [ ] All API clients include authentication headers
- [ ] Rate limiting is tested under load
- [ ] Monitoring is set up for 401/429 responses

## Troubleshooting

**Issue**: `401 Authentication required`  
**Solution**: Ensure `X-API-Key` header is included in requests

**Issue**: `401 Invalid API key`  
**Solution**: Verify `NEXTELEVEN_API_KEY` environment variable matches the header value

**Issue**: `429 Rate limit exceeded`  
**Solution**: Wait for rate limit window to reset, or increase limit in `src/lib/ratelimit.ts`

**Issue**: Development mode allowing access without API key  
**Solution**: This is expected behavior in development. In production, API key is required.
