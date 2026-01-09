import NextAuth, { type NextAuthConfig, type Session } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import type { Adapter } from 'next-auth/adapters'

/**
 * Auth configuration for NextAuth v5 (Auth.js)
 * Exports auth() function for use in API routes and server components
 */

// Extended session type with access token
interface ExtendedSession extends Session {
  user: Session['user'] & {
    id?: string
  }
  accessToken?: string
}

// Type-safe adapter initialization
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

// Build auth configuration
const authConfig: NextAuthConfig = {
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
    async session({ session, token }): Promise<ExtendedSession> {
      return {
        ...session,
        accessToken: token.accessToken as string | undefined,
        user: {
          ...session.user,
          id: token.sub,
        },
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

// Initialize NextAuth
const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

export { handlers, auth, signIn, signOut }
export type { ExtendedSession }
