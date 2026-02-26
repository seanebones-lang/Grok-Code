/**
 * Circuit Breaker Pattern
 * Prevents cascade failures by opening circuit after repeated failures
 * Auto-closes after timeout when service recovers
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number // Number of failures before opening
  timeout?: number // Time to wait before attempting to close (ms)
  resetTimeout?: number // Time before resetting failure count (ms)
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failures: number
  lastFailureTime: number | null
  successCount: number // For half-open state
}

export class CircuitBreaker {
  private state: CircuitBreakerState
  private failureThreshold: number
  private timeout: number
  private resetTimeout: number

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.timeout = options.timeout || 60000 // 1 minute
    this.resetTimeout = options.resetTimeout || 300000 // 5 minutes

    this.state = {
      state: 'closed',
      failures: 0,
      lastFailureTime: null,
      successCount: 0,
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (this.state.state === 'open') {
      const timeSinceLastFailure = Date.now() - (this.state.lastFailureTime || 0)
      if (timeSinceLastFailure >= this.timeout) {
        this.state.state = 'half-open'
        this.state.successCount = 0
        console.log('[CircuitBreaker] Transitioning to half-open state')
      } else {
        throw new Error(`Circuit breaker is open (fails after ${this.timeout - timeSinceLastFailure}ms)`)
      }
    }

    try {
      const result = await fn()

      // On success, reset failures
      if (this.state.state === 'half-open') {
        this.state.successCount++
        if (this.state.successCount >= 2) {
          // Two successes in half-open, close the circuit
          this.state.state = 'closed'
          this.state.failures = 0
          this.state.lastFailureTime = null
          console.log('[CircuitBreaker] Circuit closed after recovery')
        }
      } else {
        // Closed state - reset failure count on success
        if (this.state.failures > 0) {
          const timeSinceLastFailure = Date.now() - (this.state.lastFailureTime || 0)
          if (timeSinceLastFailure >= this.resetTimeout) {
            this.state.failures = 0
            this.state.lastFailureTime = null
          }
        }
      }

      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  /**
   * Record a failure
   */
  private recordFailure(): void {
    this.state.failures++
    this.state.lastFailureTime = Date.now()

    if (this.state.state === 'half-open') {
      // Single failure in half-open, open immediately
      this.state.state = 'open'
      console.warn(`[CircuitBreaker] Opened circuit (failure in half-open state)`)
    } else if (this.state.failures >= this.failureThreshold) {
      // Too many failures, open the circuit
      this.state.state = 'open'
      console.warn(`[CircuitBreaker] Opened circuit after ${this.state.failures} failures`)
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state }
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failures: 0,
      lastFailureTime: null,
      successCount: 0,
    }
    console.log('[CircuitBreaker] Circuit manually reset')
  }
}

// Singleton circuit breakers for different services
const circuitBreakers = new Map<string, CircuitBreaker>()

/**
 * Get or create circuit breaker for a service
 */
export function getCircuitBreaker(serviceName: string, options?: CircuitBreakerOptions): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(options))
  }
  return circuitBreakers.get(serviceName)!
}
