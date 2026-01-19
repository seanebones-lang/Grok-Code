/**
 * Mobile Authentication Utilities
 * JWT token verification and user context extraction
 */

import { verify } from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production'

export interface MobileUser {
  userId: string
  email: string
  name?: string
}

export interface TokenPayload {
  userId: string
  email: string
  name?: string
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}

/**
 * Extract JWT token from Authorization header
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Verify JWT token and return payload
 */
export function verifyMobileToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Authenticate mobile request and return user context
 */
export function authenticateMobileRequest(request: NextRequest): {
  user: MobileUser | null
  error: { code: string; message: string } | null
} {
  const token = getTokenFromRequest(request)
  
  if (!token) {
    return {
      user: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization token required',
      },
    }
  }

  const decoded = verifyMobileToken(token)
  
  if (!decoded) {
    return {
      user: null,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    }
  }

  if (decoded.type !== 'access') {
    return {
      user: null,
      error: {
        code: 'INVALID_TOKEN_TYPE',
        message: 'Token is not an access token',
      },
    }
  }

  return {
    user: {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    },
    error: null,
  }
}
