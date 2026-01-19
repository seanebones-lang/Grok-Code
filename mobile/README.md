# Grok Swarm Mobile

React Native mobile application for Grok Swarm AI development assistant.

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (for Mac) or Android Emulator

### Installation

```bash
cd mobile
npm install
```

### Environment Variables

Create `.env` file:

```
EXPO_PUBLIC_API_URL=https://your-api-url.com
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
EXPO_PUBLIC_REDIRECT_URI=exp://localhost:8081
```

### Running

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## Features

- ✅ OAuth authentication with GitHub
- ✅ JWT token management
- ✅ Secure token storage
- ✅ API client with retry logic
- ✅ Agent listing
- ✅ Chat interface (coming soon)

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   └── client.ts          # API client
│   ├── auth/
│   │   └── AuthService.ts     # Authentication service
│   └── screens/
│       ├── LoginScreen.tsx    # Login screen
│       └── HomeScreen.tsx      # Home screen
├── App.tsx                     # Main app component
├── app.json                    # Expo configuration
└── package.json                # Dependencies
```

## API Integration

The mobile app connects to the backend API at `/api/mobile/*`:

- `/api/mobile/auth/login` - OAuth login
- `/api/mobile/auth/refresh` - Token refresh
- `/api/mobile/user/profile` - User profile
- `/api/mobile/chat/send` - Send chat message
- `/api/mobile/agents/list` - List available agents

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Deployment

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```
