/**
 * API Response Caching
 * Implements intelligent caching for API responses to improve performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class APICache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxSize = 100
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Clear cache entry
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Generate cache key from request parameters
   */
  static generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&')
    return `${prefix}:${sortedParams}`
  }
}

// Singleton instance
export const apiCache = new APICache()

/**
 * Cache decorator for API routes
 */
export function withCache<T>(
  key: string,
  ttl?: number
): (fn: () => Promise<T>) => Promise<T> {
  return async (fn: () => Promise<T>): Promise<T> => {
    // Check cache
    const cached = apiCache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute and cache
    const result = await fn()
    apiCache.set(key, result, ttl)
    return result
  }
}
