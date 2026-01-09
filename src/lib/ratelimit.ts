import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting configuration
 * Uses Upstash Redis for distributed rate limiting
 * Falls back to in-memory limiting if Redis is not configured
 */

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  requests: 100,      // Maximum requests
  window: '1 h',      // Time window
  prefix: 'grokcode', // Redis key prefix
} as const

// In-memory fallback store
const inMemoryStore = new Map<string, { count: number; resetAt: number }>()

// Initialize Redis client (optional - works without it)
let redis: Redis | null = null
let ratelimit: Ratelimit | null = null

function initializeRedis(): void {
  if (redis !== null) return // Already initialized
  
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  
  if (!url || !token) {
    console.info('[RateLimit] Redis not configured, using in-memory fallback')
    return
  }
  
  try {
    redis = new Redis({ url, token })
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_CONFIG.requests, RATE_LIMIT_CONFIG.window),
      analytics: true,
      prefix: RATE_LIMIT_CONFIG.prefix,
    })
    console.info('[RateLimit] Redis rate limiter initialized')
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Redis:', error)
    redis = null
    ratelimit = null
  }
}

// Initialize on module load
initializeRedis()

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * In-memory rate limiting fallback
 * Uses a simple sliding window algorithm
 */
function checkInMemoryRateLimit(identifier: string): RateLimitResult {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour in milliseconds
  const resetAt = now + windowMs
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [key, value] of inMemoryStore.entries()) {
      if (value.resetAt < now) {
        inMemoryStore.delete(key)
      }
    }
  }
  
  const record = inMemoryStore.get(identifier)
  
  if (!record || record.resetAt < now) {
    // New window
    inMemoryStore.set(identifier, { count: 1, resetAt })
    return {
      success: true,
      limit: RATE_LIMIT_CONFIG.requests,
      remaining: RATE_LIMIT_CONFIG.requests - 1,
      reset: resetAt,
    }
  }
  
  if (record.count >= RATE_LIMIT_CONFIG.requests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: RATE_LIMIT_CONFIG.requests,
      remaining: 0,
      reset: record.resetAt,
    }
  }
  
  // Increment counter
  record.count++
  return {
    success: true,
    limit: RATE_LIMIT_CONFIG.requests,
    remaining: RATE_LIMIT_CONFIG.requests - record.count,
    reset: record.resetAt,
  }
}

/**
 * Check rate limit for an identifier (usually IP address)
 * 
 * @param identifier - Unique identifier for the client (e.g., IP address)
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  // Sanitize identifier
  const sanitizedId = identifier.replace(/[^a-zA-Z0-9.:_-]/g, '_').substring(0, 100)
  
  if (!ratelimit) {
    // Use in-memory fallback
    return checkInMemoryRateLimit(sanitizedId)
  }

  try {
    const result = await ratelimit.limit(sanitizedId)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error('[RateLimit] Redis error, falling back to in-memory:', error)
    // Fall back to in-memory on Redis errors
    return checkInMemoryRateLimit(sanitizedId)
  }
}

/**
 * Get current rate limit status without incrementing counter
 * Useful for displaying remaining requests to users
 */
export async function getRateLimitStatus(identifier: string): Promise<RateLimitResult | null> {
  if (!ratelimit) {
    const record = inMemoryStore.get(identifier)
    if (!record || record.resetAt < Date.now()) {
      return {
        success: true,
        limit: RATE_LIMIT_CONFIG.requests,
        remaining: RATE_LIMIT_CONFIG.requests,
        reset: Date.now() + 60 * 60 * 1000,
      }
    }
    return {
      success: record.count < RATE_LIMIT_CONFIG.requests,
      limit: RATE_LIMIT_CONFIG.requests,
      remaining: Math.max(0, RATE_LIMIT_CONFIG.requests - record.count),
      reset: record.resetAt,
    }
  }

  try {
    // Upstash doesn't have a "peek" method, so we return null
    // to indicate status check is not available
    return null
  } catch {
    return null
  }
}
