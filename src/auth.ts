import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Auth configuration for NextAuth v4
 */

// Extended session type with access token
export interface ExtendedSession extends Session {
  user: Session['user'] & {
    id?: string
  }
  accessToken?: string
}

// Helper function to get server session
export async function auth() {
  return getServerSession(authOptions) as Promise<ExtendedSession | null>
}
