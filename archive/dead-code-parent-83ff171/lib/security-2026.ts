/**
 * Security Enhancements for 2026
 * Implements API key encryption, audit logging, and modern security practices
 * Last Updated: January 14, 2026
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

/**
 * Encrypt API key at rest using AES-256-GCM
 * 2026 Best Practice: Use AES-256-GCM for authenticated encryption
 */
export async function encryptApiKey(apiKey: string, password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = (await scryptAsync(password, salt, 32)) as Buffer
  const iv = randomBytes(16)
  
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Return: salt:iv:authTag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt API key from storage
 */
export async function decryptApiKey(encryptedData: string, password: string): Promise<string> {
  const [saltHex, ivHex, authTagHex, encrypted] = encryptedData.split(':')
  
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const key = (await scryptAsync(password, salt, 32)) as Buffer
  
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Generate nonce for CSP (Content Security Policy)
 * 2026 Best Practice: Use nonces instead of unsafe-inline
 */
export function generateCSPNonce(): string {
  return randomBytes(16).toString('base64')
}

/**
 * Audit Log Entry
 * 2026 Best Practice: Comprehensive audit logging for security events
 */
export interface AuditLogEntry {
  id: string
  timestamp: Date
  eventType: 'auth_success' | 'auth_failure' | 'rate_limit' | 'api_access' | 'security_event' | 'error'
  userId?: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, unknown>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Audit Logger
 * Logs all security-relevant events
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = []
  
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    
    this.logs.push(fullEntry)
    
    // In production, send to logging service (e.g., Sentry, CloudWatch)
    if (process.env.NODE_ENV === 'production') {
      // Send to external logging service
      console.log('[AUDIT]', JSON.stringify(fullEntry))
    } else {
      console.log('[AUDIT]', fullEntry)
    }
  }
  
  getLogs(filter?: Partial<AuditLogEntry>): AuditLogEntry[] {
    if (!filter) return this.logs
    
    return this.logs.filter(log => {
      return Object.entries(filter).every(([key, value]) => {
        return log[key as keyof AuditLogEntry] === value
      })
    })
  }
}

export const auditLogger = new AuditLogger()

/**
 * Enhanced CSP Headers
 * 2026 Best Practice: Strict CSP with nonces, no unsafe-inline/unsafe-eval
 */
export function generateCSPHeaders(nonce: string): Record<string, string> {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://cdn.babylonjs.com`,
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.x.ai https://api.github.com https://api.vercel.com https://api.railway.app https://backboard.railway.app",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  }
}

/**
 * Session Token Rotation
 * 2026 Best Practice: Automatic token rotation for security
 */
export interface TokenRotationConfig {
  rotationInterval: number // milliseconds
  maxAge: number // milliseconds
}

export class TokenRotator {
  private tokens: Map<string, { token: string; expiresAt: Date; rotatedAt: Date }> = new Map()
  
  constructor(private config: TokenRotationConfig) {}
  
  generateToken(userId: string): string {
    const token = crypto.randomUUID()
    const now = new Date()
    
    this.tokens.set(userId, {
      token,
      expiresAt: new Date(now.getTime() + this.config.maxAge),
      rotatedAt: now,
    })
    
    return token
  }
  
  shouldRotate(userId: string): boolean {
    const tokenData = this.tokens.get(userId)
    if (!tokenData) return true
    
    const now = new Date()
    const timeSinceRotation = now.getTime() - tokenData.rotatedAt.getTime()
    
    return timeSinceRotation >= this.config.rotationInterval
  }
  
  rotateToken(userId: string): string {
    return this.generateToken(userId)
  }
  
  validateToken(userId: string, token: string): boolean {
    const tokenData = this.tokens.get(userId)
    if (!tokenData) return false
    
    if (tokenData.token !== token) return false
    
    const now = new Date()
    if (now > tokenData.expiresAt) return false
    
    return true
  }
}

/**
 * Rate Limiter per Endpoint
 * 2026 Best Practice: Granular rate limiting
 */
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export class EndpointRateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(private config: RateLimitConfig) {}
  
  checkLimit(identifier: string, endpoint: string): { allowed: boolean; remaining: number; resetAt: Date } {
    const key = `${identifier}:${endpoint}`
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    let requestTimes = this.requests.get(key) || []
    requestTimes = requestTimes.filter(time => time > windowStart)
    
    if (requestTimes.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...requestTimes)
      const resetAt = new Date(oldestRequest + this.config.windowMs)
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    }
    
    requestTimes.push(now)
    this.requests.set(key, requestTimes)
    
    const resetAt = new Date(now + this.config.windowMs)
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - requestTimes.length,
      resetAt,
    }
  }
}
