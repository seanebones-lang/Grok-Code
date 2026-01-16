import NextAuth, { type NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // Required for Next.js 13+ App Router - allows NextAuth to trust the host
  // When trustHost is true, NextAuth automatically uses NEXTAUTH_URL from environment
  trustHost: true,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string | undefined,
        user: {
          ...session.user,
          id: token.sub,
        },
      }
    },
    async redirect({ url, baseUrl }) {
      // Ensure redirects work properly - always use baseUrl from NEXTAUTH_URL
      const base = baseUrl || process.env.NEXTAUTH_URL || 'https://grok-code2.vercel.app'
      
      // If url is relative, make it absolute
      if (url.startsWith('/')) {
        return `${base}${url}`
      }
      
      // If url is absolute and same origin, allow it
      try {
        const urlObj = new URL(url)
        const baseObj = new URL(base)
        if (urlObj.origin === baseObj.origin) {
          return url
        }
      } catch (e) {
        // Invalid URL, use base
      }
      
      // Default to base URL
      return base
    },
  },
  pages: {
    signIn: '/login',
    error: '/login?error=oauth_error',
    signOut: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  // Ensure proper error handling - enable debug in production to see errors
  debug: true, // Enable debug to see OAuth errors
  // Handle errors explicitly
  events: {
    async signIn({ user, account, profile }) {
      // Log successful sign in for debugging
      console.log('Sign in successful:', { user: user.email, provider: account?.provider })
      return true
    },
    async signInError({ error }) {
      // Log sign in errors with full details
      console.error('Sign in error:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
      })
    },
  },
  // Add error page redirect to handle OAuth errors
  logger: {
    error(code, metadata) {
      console.error('NextAuth error:', { code, metadata })
    },
    warn(code) {
      console.warn('NextAuth warning:', code)
    },
    debug(code, metadata) {
      console.log('NextAuth debug:', { code, metadata })
    },
  },
}

const handler = NextAuth(authOptions)

// Export all HTTP methods that NextAuth might need
// CRITICAL: Must export both GET and POST for NextAuth to work
export { handler as GET, handler as POST }

// Also handle OPTIONS for CORS if needed
export { handler as OPTIONS }
