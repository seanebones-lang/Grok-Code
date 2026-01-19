# 🚀 Grok Swarm Mobile - Quick Start

**Status:** ✅ **Production Ready**

---

## ⚡ 3-Step Setup

### Step 1: Install

```bash
cd mobile
npm install
```

### Step 2: Configure

```bash
cp .env.example .env
```

Edit `.env`:
```env
EXPO_PUBLIC_API_URL=https://nexteleven-code.vercel.app
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
EXPO_PUBLIC_REDIRECT_URI=grokswarm://auth
```

### Step 3: Run

```bash
npm start
```

**Scan QR code** with Expo Go app (iOS/Android) or press `i` for iOS simulator, `a` for Android.

---

## ✅ What's Included

- ✅ **OAuth Authentication** - GitHub login
- ✅ **JWT Token Management** - Secure storage
- ✅ **Agent Selection** - Browse all 11+ agents
- ✅ **Full Chat Interface** - Real-time messaging
- ✅ **Haptic Feedback** - Enhanced UX
- ✅ **React Query** - Smart data fetching
- ✅ **TypeScript** - Full type safety
- ✅ **Tests** - Jest test suite

---

## 📱 Run Commands

```bash
npm start          # Start Expo dev server
npm run ios        # iOS Simulator
npm run android    # Android Emulator
npm run web        # Web browser
npm test           # Run tests
npm run type-check # TypeScript check
npm run lint       # ESLint check
```

---

## 🔧 Troubleshooting

### Dependencies Not Installing

```bash
rm -rf node_modules package-lock.json
npm install
```

### Expo Doctor Check

```bash
npx expo doctor
```

### Clear Cache

```bash
npx expo start --clear
```

---

## 🚀 Deploy to Stores

```bash
# Install EAS CLI
npm i -g eas-cli

# Login
eas login

# Build
eas build --platform all --profile production

# Submit
eas submit --platform all
```

---

**Ready to launch!** 🎉
