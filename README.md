# NextEleven Code - AI-Powered Development Interface

<div align="center">

![GrokCode Logo](https://img.shields.io/badge/GrokCode-AI%20Powered-6841e7?style=for-the-badge&logo=code&logoColor=white)

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A production-ready AI-powered code editor and assistant powered by Grok 4.1**

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## ✨ Features

### Core Capabilities

- 🤖 **Grok 4.1 Integration** - Powered by xAI's latest Grok API with automatic model fallback
- 💻 **Monaco Editor** - Full-featured code editor with syntax highlighting for 30+ languages
- 💬 **Real-time Streaming** - Server-Sent Events for instant AI responses
- 📁 **File Explorer** - VSCode-like file tree with GitHub repository integration
- 🔄 **GitHub Push** - Push AI-generated code directly to your repositories
- 🎨 **Beautiful UI** - Deep space theme with smooth Framer Motion animations

### Technical Excellence

- 🔐 **Enterprise Security** - OWASP-compliant with comprehensive security headers
- ⚡ **Optimized Performance** - Lazy loading, memoization, and efficient re-renders
- ♿ **Accessible** - WCAG 2.2 AA compliant with full keyboard navigation
- 📱 **Responsive** - Works seamlessly on mobile, tablet, and desktop
- 🧪 **Tested** - Jest + Testing Library with 70%+ coverage
- 📝 **Type-Safe** - 100% TypeScript with strict mode enabled

### Developer Experience

- ⌨️ **Keyboard Shortcuts** - Cmd+K, Cmd+Enter, Escape, and more
- 🔔 **Toast Notifications** - Real-time feedback for all actions
- 🌙 **Dark Mode** - Beautiful dark theme optimized for long coding sessions
- 📊 **Diff Viewer** - Side-by-side code comparison with syntax highlighting

## 🚀 Quick Start

### Prerequisites

- Node.js 22.x or later
- npm, yarn, or pnpm
- GitHub OAuth App
- xAI Grok API Key
- PostgreSQL database
- Upstash Redis (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/grokcode.git
cd grokcode

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Set up the database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Documentation

### Environment Variables

| Variable | Description | Required |
|----------|-------------|:--------:|
| `GROK_API_KEY` | xAI Grok API key | ✅ |
| `GITHUB_ID` | GitHub OAuth App ID | ✅ |
| `GITHUB_SECRET` | GitHub OAuth App Secret | ✅ |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js (min 32 chars) | ✅ |
| `NEXTAUTH_URL` | Your app URL | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | ❌ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | ❌ |
| `GITHUB_TOKEN` | GitHub personal access token | ✅ |

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # NextAuth.js authentication
│   │   ├── chat/          # Grok chat streaming API
│   │   └── github/        # GitHub integration API
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page
├── components/            # React Components
│   ├── Layout/            # Header, Sidebar
│   ├── ui/                # shadcn/ui components
│   ├── ChatPane.tsx       # Chat interface
│   ├── ChatMessage.tsx    # Message rendering
│   ├── Editor.tsx         # Monaco editor wrapper
│   ├── FileTree.tsx       # File explorer
│   ├── DiffModal.tsx      # Code diff viewer
│   ├── ErrorBoundary.tsx  # Error handling
│   ├── Loading.tsx        # Loading states
│   └── Toast.tsx          # Notifications
├── hooks/                 # Custom React Hooks
│   ├── useChat.ts         # Chat state management
│   ├── useGit.ts          # GitHub operations
│   └── useKeyboardShortcuts.ts
├── lib/                   # Utilities & API Clients
│   ├── grok.ts            # Grok API client
│   ├── grok-models.ts     # Model configuration
│   ├── github.ts          # GitHub API client
│   ├── ratelimit.ts       # Rate limiting
│   ├── storage.ts         # LocalStorage utilities
│   └── utils.ts           # General utilities
├── types/                 # TypeScript Definitions
│   └── index.ts           # All type exports
└── styles/
    └── globals.css        # Global styles & CSS variables
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run type-check   # Run TypeScript check
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run db:push      # Push Prisma schema
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ + Enter` | Send message |
| `⌘ + K` | Focus input |
| `⌘ + ⇧ + L` | Clear chat |
| `Escape` | Cancel request / Blur input |

## 🏗️ Architecture

### Security Features

- ✅ Environment variable validation at startup
- ✅ CSRF protection via middleware
- ✅ Rate limiting (100 req/hour per IP)
- ✅ Security headers (HSTS, X-Frame-Options, CSP-ready)
- ✅ Input validation with Zod schemas
- ✅ Secure session management

### Performance Optimizations

- ✅ Lazy loading for Monaco Editor
- ✅ React.memo for expensive components
- ✅ useCallback/useMemo for stable references
- ✅ Optimized package imports
- ✅ Image optimization with next/image
- ✅ Automatic code splitting

### Accessibility

- ✅ ARIA labels and roles
- ✅ Keyboard navigation
- ✅ Skip-to-content link
- ✅ Screen reader announcements
- ✅ Focus management
- ✅ Reduced motion support

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add all environment variables
4. Deploy!

### Railway

```bash
# Using Railway CLI
railway login
railway init
railway up
```

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [xAI](https://x.ai/) for the Grok API
- [Vercel](https://vercel.com/) for Next.js
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor

---

<div align="center">

**Built with 🩸 and ⚡️ using NextEleven Proprietary Tech, Next.js, Eleven, and modern web technologies by CTO Sean F McDonnell**

[⬆ Back to Top](#nexteleven-code---ai-powered-development-interface)

</div>
