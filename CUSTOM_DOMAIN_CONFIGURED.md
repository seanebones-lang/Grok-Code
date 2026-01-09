# ✅ Custom Domain Configured: code.mothership-ai.com

## 🎯 Domain Setup Complete

**Custom Domain**: `code.mothership-ai.com`  
**Full URL**: `https://code.mothership-ai.com`

## ✅ What's Been Updated

### 1. NEXTAUTH_URL ✅
- **Production**: `https://code.mothership-ai.com`
- **Preview**: `https://code.mothership-ai.com`
- **Development**: `http://localhost:3000` (unchanged)

### 2. Domain Added to Vercel ✅
The domain has been added to your Vercel project. You may need to configure DNS records.

## 📝 Next Steps

### 1. Configure DNS (If Not Already Done)

If the domain isn't already pointing to Vercel, you'll need to add DNS records:

**Option A: CNAME Record (Recommended)**
```
Type: CNAME
Name: code
Value: cname.vercel-dns.com
```

**Option B: A Record**
```
Type: A
Name: code
Value: 76.76.21.21
```

**Check DNS Configuration:**
- Go to: https://vercel.com/sean-mcdonnells-projects-4fbf31ab/nexteleven-code/settings/domains
- Vercel will show you the exact DNS records needed

### 2. Update GitHub OAuth Callback URL ⚠️ IMPORTANT

1. Go to: https://github.com/settings/developers
2. Click on your OAuth App
3. Update **Authorization callback URL** to:
   ```
   https://code.mothership-ai.com/api/auth/callback/github
   ```
4. Click **Update application**

### 3. Wait for DNS Propagation

- DNS changes can take 5-60 minutes to propagate
- Check if domain is working: Visit `https://code.mothership-ai.com`
- You should see your app (or a Vercel placeholder if DNS isn't ready)

### 4. Redeploy (After DNS is Working)

Once the domain is live and working:
```bash
export VERCEL_TOKEN=OsAZOPoqhyreAaZK7wsWpdxs
npx vercel --prod --token $VERCEL_TOKEN
```

## 🔍 Verify Everything is Working

1. **Check Domain**: Visit `https://code.mothership-ai.com`
2. **Test Login**: Try logging in with GitHub
3. **Check OAuth**: Verify GitHub OAuth callback works

## 📋 Summary

| Item | Status | Value |
|------|--------|-------|
| Domain | ✅ Added | `code.mothership-ai.com` |
| NEXTAUTH_URL | ✅ Updated | `https://code.mothership-ai.com` |
| GitHub OAuth | ⚠️ Needs Update | `https://code.mothership-ai.com/api/auth/callback/github` |
| DNS | ⏳ Check | May need configuration |
| Deployment | ⏳ After DNS | Redeploy once domain works |

## 🚀 Your App URLs

- **Custom Domain**: https://code.mothership-ai.com
- **Vercel URL**: https://nexteleven-code.vercel.app (still works)

Both URLs will work once DNS is configured!
