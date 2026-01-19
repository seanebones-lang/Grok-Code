/**
 * Authentication Utilities
 * JWT signing/verification and GitHub OAuth integration
 */

import jwt from 'jsonwebtoken'
import { Octokit } from '@octokit/rest'

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
const JWT_EXPIRY = '7d' // 7 days for mobile tokens

// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID || ''
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET || ''

/**
 * Sign JWT token for mobile authentication
 */
export function signJWT(payload: { userId: string; email?: string; name?: string }): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  )
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string): { userId: string; email?: string; name?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.type !== 'access') {
      return null
    }
    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    }
  } catch {
    return null
  }
}

/**
 * GitHub OAuth utilities
 */
export const githubOAuth = {
  /**
   * Exchange GitHub OAuth code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    if (!response.ok) {
      throw new Error(`GitHub OAuth error: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
    }

    return { access_token: data.access_token }
  },

  /**
   * Get user information from GitHub using access token
   */
  async getUserFromToken(accessToken: string): Promise<{ id: string; email: string; name: string; login: string }> {
    const octokit = new Octokit({ auth: accessToken })
    
    const { data: user } = await octokit.rest.users.getAuthenticated()
    
    // Get user email (may require additional scope)
    let email = user.email || ''
    if (!email) {
      try {
        const { data: emails } = await octokit.rest.users.listEmailsForAuthenticated()
        email = emails.find(e => e.primary)?.email || emails[0]?.email || ''
      } catch {
        // Email may not be available
      }
    }

    return {
      id: String(user.id),
      email: email || `${user.login}@users.noreply.github.com`,
      name: user.name || user.login,
      login: user.login,
    }
  },
}

/**
 * Complete OAuth flow: exchange code → get user → sign JWT
 */
export async function completeOAuthFlow(code: string): Promise<{
  token: string
  user: { id: string; email: string; name: string }
}> {
  // Step 1: Exchange code for GitHub access token
  const { access_token } = await githubOAuth.exchangeCodeForToken(code)
  
  // Step 2: Get user info from GitHub
  const githubUser = await githubOAuth.getUserFromToken(access_token)
  
  // Step 3: Sign JWT for mobile app
  const token = signJWT({
    userId: githubUser.id,
    email: githubUser.email,
    name: githubUser.name,
  })

  return {
    token,
    user: {
      id: githubUser.id,
      email: githubUser.email,
      name: githubUser.name,
    },
  }
}
