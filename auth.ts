/**
 * NextAuth.js v5 (Auth.js) Configuration
 * GitHub OAuth Authentication
 */

import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      accessToken?: string
      githubUsername?: string
    } & DefaultSession["user"]
  }

  interface JWT {
    accessToken?: string
    githubUsername?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID || process.env.AUTH_GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || process.env.AUTH_GITHUB_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt", // Use JWT sessions (no database required)
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and user info to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      
      if (profile) {
        token.name = (profile as any).name || (profile as any).login
        token.email = (profile as any).email
        token.image = (profile as any).avatar_url
        token.githubUsername = (profile as any).login
      }
      
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.accessToken = token.accessToken as string
        session.user.githubUsername = token.githubUsername as string
      }
      return session
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true, // Required for production deployments
})
