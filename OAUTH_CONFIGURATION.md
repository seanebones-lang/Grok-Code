# ✅ GitHub OAuth Configuration

## Current Settings

### ✅ Correctly Configured
- **Authorization callback URL**: `https://code.mothership-ai.com/api/auth/callback/github` ✅

### ⚠️ Should Update
- **Homepage URL**: Currently `http://localhost:3000`
  - **Should be**: `https://code.mothership-ai.com`

## 📝 To Complete Setup

1. **Update Homepage URL** in GitHub OAuth App:
   - Change from: `http://localhost:3000`
   - Change to: `https://code.mothership-ai.com`
   - Click **"Update application"**

2. **Test Login**:
   - Visit: https://code.mothership-ai.com
   - Try logging in with GitHub
   - Should work now! ✅

## ✅ What's Already Correct

- ✅ Callback URL matches NEXTAUTH_URL
- ✅ NEXTAUTH_URL set to: `https://code.mothership-ai.com`
- ✅ Deployment complete and aliased to custom domain
- ✅ Route exists: `/api/auth/callback/github`

## 🎯 After Updating Homepage URL

The 404 error should be resolved! The callback URL is correct, so login should work now.

If you still get errors:
1. Clear browser cookies for `code.mothership-ai.com`
2. Try in an incognito/private window
3. Check browser console for any errors
