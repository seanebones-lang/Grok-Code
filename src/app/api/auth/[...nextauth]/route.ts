import NextAuth, { type NextAuthConfig, type Session, type User } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import type { NextRequest } from 'next/server'
import type { Adapter } from 'next-auth/adapters'

// Type-safe adapter initialization
let adapter: Adapter | undefined = undefined

async function initializeAdapter(): Promise<Adapter | undefined> {
  if (!process.env.DATABASE_URL) {
    console.warn('[Auth] DATABASE_URL not set, running without database adapter')
    return undefined
  }
  
  try {
    const { PrismaAdapter } = await import('@auth/prisma-adapter')
    const { prisma } = await import('@/lib/prisma')
    return PrismaAdapter(prisma) as Adapter
  } catch (error) {
    console.error('[Auth] Failed to initialize Prisma adapter:', error)
    return undefined
  }
}

// Validate required environment variables at startup
function validateEnvVars(): void {
  const requiredVars = ['NEXTAUTH_SECRET', 'GITHUB_ID', 'GITHUB_SECRET']
  const missingVars = requiredVars.filter(v => !process.env[v])
  
  if (missingVars.length > 0) {
    throw new Error(`[Auth] Missing required environment variables: ${missingVars.join(', ')}`)
  }
  
  // Validate secret strength (minimum 32 characters for security)
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error('[Auth] NEXTAUTH_SECRET must be at least 32 characters long')
  }
}

// Extended session type with user ID and access token
interface ExtendedSession extends Session {
  user: Session['user'] & {
    id?: string
  }
  accessToken?: string
}

// Build auth configuration
async function buildAuthConfig(): Promise<NextAuthConfig> {
  validateEnvVars()
  adapter = await initializeAdapter()
  
  return {
    trustHost: true, // Required for custom domains and Vercel
    adapter,
    providers: [
      GitHubProvider({
        clientId: process.env.GITHUB_ID!,
        clientSecret: process.env.GITHUB_SECRET!,
        authorization: {
          params: {
            scope: 'read:user user:email repo',
          },
        },
      }),
    ],
    callbacks: {
      async jwt({ token, account }) {
        // Persist the OAuth access_token to the token right after signin
        if (account) {
          token.accessToken = account.access_token
        }
        return token
      },
      async session({ session, token, user }): Promise<ExtendedSession> {
        return {
          ...session,
          user: {
            ...session.user,
            id: user?.id || (token?.sub as string),
          },
          accessToken: token?.accessToken as string,
        }
      },
      async signIn({ user, account }) {
        // Additional security: validate GitHub account
        if (account?.provider === 'github' && !user.email) {
          console.warn('[Auth] GitHub sign-in attempted without email')
          return false
        }
        return true
      },
      async redirect({ url, baseUrl }) {
        // Ensure redirects always use the correct base URL
        const base = process.env.NEXTAUTH_URL || baseUrl
        // If url is relative, make it absolute
        if (url.startsWith('/')) {
          return `${base}${url}`
        }
        // If url is on the same origin, allow it
        if (new URL(url).origin === new URL(base).origin) {
          return url
        }
        // Default to home page
        return base
      },
    },
    pages: {
      signIn: '/login',
      error: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET!,
    session: {
      strategy: adapter ? 'database' : 'jwt',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    debug: process.env.NODE_ENV === 'development',
  }
}

// Initialize handler lazily
let handlerPromise: Promise<ReturnType<typeof NextAuth>> | null = null

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = buildAuthConfig().then(config => NextAuth(config))
  }
  return handlerPromise
}

export async function GET(req: NextRequest) {
  const handler = await getHandler()
  return handler.handlers.GET(req)
}

export async function POST(req: NextRequest) {
  const handler = await getHandler()
  return handler.handlers.POST(req)
}
