import NextAuth, { type NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // Required for Next.js 13+ App Router - allows NextAuth to trust the host
  trustHost: true,
  // Explicitly set the base URL if NEXTAUTH_URL is provided
  ...(process.env.NEXTAUTH_URL && { baseUrl: process.env.NEXTAUTH_URL }),
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
}

const handler = NextAuth(authOptions)

// Export all HTTP methods that NextAuth might need
export { handler as GET, handler as POST }
