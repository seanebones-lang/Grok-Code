# Custom Domain Setup Guide

## 🎯 If You're Using a Custom Domain

If you're forwarding your custom domain to Vercel, you need to update a few things:

### 1. Add Domain in Vercel

1. Go to: https://vercel.com/sean-mcdonnells-projects-4fbf31ab/nexteleven-code/settings/domains
2. Click **"Add Domain"**
3. Enter your domain (e.g., `code.nexteleven.com`)
4. Follow DNS configuration instructions
5. Wait for DNS to propagate (usually 5-60 minutes)

### 2. Update NEXTAUTH_URL

Once your domain is added and working, update the environment variable:

**Option A: Using the script**
```bash
export VERCEL_TOKEN=OsAZOPoqhyreAaZK7wsWpdxs
./scripts/update-custom-domain.sh yourdomain.com
```

**Option B: Manual update**
```bash
export VERCEL_TOKEN=OsAZOPoqhyreAaZK7wsWpdxs
echo "https://yourdomain.com" | npx vercel env add NEXTAUTH_URL production --force --token $VERCEL_TOKEN
echo "https://yourdomain.com" | npx vercel env add NEXTAUTH_URL preview --force --token $VERCEL_TOKEN
```

### 3. Update GitHub OAuth Callback URL

1. Go to: https://github.com/settings/developers
2. Click on your OAuth App
3. Update **Authorization callback URL** to:
   ```
   https://yourdomain.com/api/auth/callback/github
   ```

### 4. Redeploy

After updating NEXTAUTH_URL, trigger a new deployment:
```bash
npx vercel --prod --token $VERCEL_TOKEN
```

## 📋 What Gets Updated

When using a custom domain, update:

- ✅ **NEXTAUTH_URL** → `https://yourdomain.com`
- ✅ **GitHub OAuth Callback** → `https://yourdomain.com/api/auth/callback/github`
- ✅ **Vercel Domain Settings** → Add your domain

## ⚠️ Important Notes

1. **Wait for DNS**: After adding domain in Vercel, wait for DNS to propagate before updating NEXTAUTH_URL
2. **HTTPS Required**: Always use `https://` for NEXTAUTH_URL (Vercel provides SSL automatically)
3. **Both URLs Work**: After setup, both your custom domain AND the Vercel URL will work
4. **Development**: Keep `http://localhost:3000` for development environment

## 🔍 Verify Domain is Working

1. Visit your custom domain in browser
2. Check that it loads your app
3. Verify SSL certificate is active (green lock icon)
4. Then update NEXTAUTH_URL

## 🚀 Quick Setup

If your domain is already added and working:

```bash
# Replace with your actual domain
export VERCEL_TOKEN=OsAZOPoqhyreAaZK7wsWpdxs
./scripts/update-custom-domain.sh yourdomain.com
```

Then update GitHub OAuth callback URL and you're done!
