# 🚀 NextEleven Code

> AI-powered development interface that helps you write, edit, and understand code with intelligent assistance.

[![Next.js](https://img.shields.io/badge/Next.js-15.0.7-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## ✨ Features

- 🤖 **20+ Specialized AI Agents** - Security, Performance, Testing, Documentation, and more
- 🎯 **Auto-Orchestrator** - Intelligent task routing to the right agent
- 💬 **GitHub OAuth Authentication** - Secure login with GitHub
- 📝 **Session Management** - Persistent chat history across sessions
- 🔍 **Code Search & Analysis** - Deep codebase understanding
- 🛠️ **Full Terminal Access** - Execute commands, run builds, manage git
- 📦 **GitHub Integration** - Push, commit, create repos directly
- ⌨️ **Keyboard Shortcuts** - Power user productivity
- 🎨 **Modern UI** - Dark theme with smooth animations
- 🔒 **Rate Limiting** - Built-in protection against abuse

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- GitHub account (for OAuth)
- Grok API key from [x.ai](https://x.ai)

### Installation

```bash
# Clone the repository
git clone https://github.com/seanebones-lang/Grok-Code.git
cd Grok-Code

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys
```

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Required: Grok API Key (from x.ai)
GROK_API_KEY=your_grok_api_key_here

# Required: GitHub OAuth (create at https://github.com/settings/developers)
GITHUB_ID=your_github_oauth_client_id
GITHUB_SECRET=your_github_oauth_client_secret

# Required: NextAuth Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your_generated_secret
# OR (for compatibility)
NEXTAUTH_SECRET=your_generated_secret

# Required: App URL
AUTH_URL=https://your-app.vercel.app
# OR (for compatibility)
NEXTAUTH_URL=https://your-app.vercel.app

# Optional: Database (PostgreSQL via Prisma)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Optional: GitHub Token (for enhanced GitHub operations)
GITHUB_TOKEN=your_github_personal_access_token
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📚 Documentation

### Available Agents

- 🔒 **Security Agent** - Vulnerability scanning, OWASP compliance
- ⚡ **Performance Agent** - Optimization, profiling, bottlenecks
- 🧪 **Testing Agent** - Test generation, coverage analysis
- 📚 **Documentation Agent** - README, API docs, code comments
- 🔄 **Migration Agent** - Framework/library upgrades
- 📦 **Dependency Agent** - Package management, updates
- 🔍 **Code Review Agent** - Quality checks, best practices
- 🐛 **Bug Hunter Agent** - Debugging, root cause analysis
- 🎯 **Optimization Agent** - Refactoring, efficiency
- ♿ **Accessibility Agent** - WCAG compliance, a11y
- 🎼 **Orchestrator Agent** - Multi-agent coordination
- 🐝 **Agent Swarm** - Parallel agent execution

### Keyboard Shortcuts

- `⌘K` / `Ctrl+K` - Open Command Palette
- `⌘Enter` / `Ctrl+Enter` - Send message
- `⌘L` / `Ctrl+Shift+L` - Clear chat
- `?` - Show keyboard shortcuts
- `Escape` - Cancel request / Close modals

### API Routes

#### `/api/chat`
Main chat endpoint for AI interactions with streaming support.

**Method:** `POST`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "message": "Your message here",
  "mode": "default" | "refactor" | "orchestrate" | "debug" | "review" | "agent",
  "conversationId": "uuid-string (optional)",
  "history": [
    {
      "role": "user" | "assistant" | "system",
      "content": "Message content"
    }
  ],
  "memoryContext": "string (optional) - Agent memory from past sessions",
  "repository": {
    "owner": "username",
    "repo": "repo-name",
    "branch": "main"
  }
}
```

**Response:** Server-Sent Events (SSE) stream with chunks:
- `content`: Text content chunks
- `detectedMode`: Auto-detected mode (if applicable)
- `error`: Error message (if error occurred)
- `tool_calls`: Tool execution results (if any)

**Example:**
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Refactor this component',
    mode: 'refactor',
    repository: { owner: 'user', repo: 'my-repo' }
  })
})

const reader = response.body?.getReader()
// Process SSE stream...
```

#### `/api/github/push`
Push files to a GitHub repository.

**Method:** `POST`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "owner": "username",
  "repo": "repo-name",
  "branch": "main",
  "files": [
    {
      "path": "src/file.ts",
      "content": "file content",
      "mode": "100644"
    }
  ],
  "message": "Commit message"
}
```

**Response:**
```json
{
  "success": true,
  "commit": {
    "sha": "commit-sha",
    "message": "Commit message",
    "url": "https://github.com/..."
  },
  "requestId": "uuid"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "requestId": "uuid",
  "details": []
}
```

#### `/api/github/repos`
List user's GitHub repositories.

**Method:** `GET`  
**Query Parameters:**
- `per_page`: Number of repos (default: 30, max: 100)
- `page`: Page number (default: 1)
- `sort`: Sort by `created`, `updated`, `pushed`, `full_name` (default: `updated`)

**Response:**
```json
{
  "repos": [
    {
      "id": 123,
      "name": "repo-name",
      "full_name": "owner/repo-name",
      "description": "Repo description",
      "private": false,
      "default_branch": "main",
      "updated_at": "2026-01-23T00:00:00Z"
    }
  ],
  "total": 50
}
```

#### `/api/agent/files`
File operations for agentic workflows.

**Method:** `GET` | `POST` | `DELETE`

**GET - Read File:**
```
GET /api/agent/files?action=read&owner=user&repo=repo&path=src/file.ts&branch=main
```

**GET - List Directory:**
```
GET /api/agent/files?action=list&owner=user&repo=repo&path=src&branch=main
```

**POST - Write File:**
```json
{
  "action": "write",
  "owner": "user",
  "repo": "repo",
  "path": "src/file.ts",
  "content": "file content",
  "message": "Update file",
  "branch": "main",
  "sha": "optional-sha-for-updates"
}
```

**POST - Batch Write:**
```json
{
  "action": "batch",
  "owner": "user",
  "repo": "repo",
  "files": [
    { "path": "file1.ts", "content": "..." },
    { "path": "file2.ts", "content": "..." }
  ],
  "message": "Update multiple files",
  "branch": "main"
}
```

#### `/api/agent/search`
Code search across repository.

**Method:** `GET`  
**Query Parameters:**
- `owner`: Repository owner
- `repo`: Repository name
- `query`: Search query
- `path`: Limit search to path (optional)
- `branch`: Branch to search (optional)

**Response:**
```json
{
  "results": [
    {
      "path": "src/file.ts",
      "matches": [
        {
          "line": 42,
          "content": "matching line content",
          "preview": "context before and after"
        }
      ]
    }
  ],
  "total": 10
}
```

#### `/api/agent/git`
Git operations (branches, commits, history).

**Method:** `GET` | `POST`

**GET - List Branches:**
```
GET /api/agent/git?action=branches&owner=user&repo=repo
```

**GET - Get Commit History:**
```
GET /api/agent/git?action=history&owner=user&repo=repo&branch=main&limit=10
```

**GET - Get Diff:**
```
GET /api/agent/git?action=diff&owner=user&repo=repo&base=main&head=feature
```

**POST - Create Branch:**
```json
{
  "action": "create-branch",
  "owner": "user",
  "repo": "repo",
  "branch": "feature/new-feature",
  "from": "main"
}
```

#### `/api/agent/local`
Local file system operations (development only).

**Method:** `GET` | `POST` | `DELETE`

**GET - Read Local File:**
```
GET /api/agent/local?action=read&path=/absolute/path/to/file
```

**POST - Write Local File:**
```json
{
  "action": "write",
  "path": "/absolute/path/to/file",
  "content": "file content"
}
```

**Note:** Local file operations require proper permissions and are only available in development mode.

## 🛠️ Development

### Project Structure

```
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/          # API routes
│   │   └── page.tsx      # Main page
│   ├── components/       # React components
│   │   ├── Layout/       # Header, Sidebar
│   │   └── ui/           # shadcn/ui components
│   ├── lib/              # Utilities
│   │   ├── grok.ts       # Grok API client
│   │   ├── specialized-agents.ts  # Agent definitions
│   │   └── session-manager.ts     # Session management
│   └── hooks/            # React hooks
├── prisma/               # Database schema
├── public/               # Static assets
└── tests/                # Test files
```

### Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:ci          # CI mode

# Database
npm run db:push          # Push schema changes
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Railway

1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically on push

### Manual Deployment

```bash
# Build
npm run build

# Start
npm start
```

## 🔒 Security

- ✅ OWASP Top 10 protection
- ✅ Rate limiting (100 req/hour)
- ✅ Input validation (Zod schemas)
- ✅ GitHub OAuth authentication
- ✅ Secure headers (middleware)
- ✅ No hardcoded secrets

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Current Coverage:** 45% (target: 80%+)

## 📊 Performance

- **Lighthouse Score:** 85/100 (target: 95+)
- **Bundle Size:** 1.2MB (target: <800KB)
- **TTFB:** ~300ms

### Optimization Opportunities

- [ ] Code splitting for heavy components
- [ ] Lazy load Monaco Editor
- [ ] Image optimization
- [ ] Service worker for offline support

## ♿ Accessibility

- ✅ WCAG AA compliant
- ✅ ARIA labels
- ✅ Keyboard navigation
- ⚠️ Focus trap needed for modals
- ⚠️ Color contrast improvements (4.2:1 → 4.5:1)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [Grok](https://x.ai)
- Icons from [Lucide](https://lucide.dev/)

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/seanebones-lang/Grok-Code/issues)
- **Discussions:** [GitHub Discussions](https://github.com/seanebones-lang/Grok-Code/discussions)

---

**Made with ❤️ by NextEleven**
