import NextAuth, { type NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'

// Normalize base URL - remove trailing slashes, trim whitespace, remove newlines
function normalizeBaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return url.trim().replace(/\/+$/, '').replace(/\n/g, '').replace(/\r/g, '')
}

// Get normalized base URL from environment
const normalizedBaseUrl = normalizeBaseUrl(process.env.NEXTAUTH_URL)

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // Required for Next.js 13+ App Router - allows NextAuth to trust the host
  trustHost: true,
  // CRITICAL: Explicit baseUrl ensures NextAuth generates correct callback URLs
  // This prevents 404 errors by ensuring NextAuth knows the exact base URL
  // Normalize the URL to remove trailing slashes and whitespace issues
  ...(normalizedBaseUrl && { baseUrl: normalizedBaseUrl }),
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
      // CRITICAL FIX: Use baseUrl parameter (provided by NextAuth from baseUrl config)
      // This ensures we use the correct domain for redirects
      // Normalize the base URL to prevent issues with trailing slashes/whitespace
      const base = normalizeBaseUrl(baseUrl || process.env.NEXTAUTH_URL)
      
      // If no base URL is available, log error and redirect to login
      if (!base) {
        console.error('NextAuth redirect: No baseUrl or NEXTAUTH_URL found!')
        return '/login?error=configuration'
      }
      
      // Use normalized base (already normalized above)
      const normalizedBase = base
      
      // If url is relative, make it absolute using the normalized base
      if (url.startsWith('/')) {
        return `${normalizedBase}${url}`
      }
      
      // If url is absolute and same origin, allow it
      try {
        const urlObj = new URL(url)
        const baseObj = new URL(normalizedBase)
        if (urlObj.origin === baseObj.origin) {
          return url
        }
        // Different origin - redirect to base (security: prevent open redirects)
        return normalizedBase
      } catch (e) {
        // Invalid URL, use normalized base
        console.warn('NextAuth redirect: Invalid URL format, using base:', url)
        return normalizedBase
      }
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
