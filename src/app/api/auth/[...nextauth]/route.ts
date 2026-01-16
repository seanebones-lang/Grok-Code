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
      // Ensure redirects work properly
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      if (new URL(url).origin === baseUrl) {
        return url
      }
      return baseUrl
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  // Ensure proper error handling
  debug: process.env.NODE_ENV === 'development',
  // Handle errors explicitly
  events: {
    async signIn({ user, account, profile }) {
      // Log successful sign in for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Sign in successful:', { user: user.email, provider: account?.provider })
      }
      return true
    },
    async signInError({ error }) {
      // Log sign in errors
      console.error('Sign in error:', error)
    },
  },
}

const handler = NextAuth(authOptions)

// Export all HTTP methods that NextAuth might need
export { handler as GET, handler as POST }
