/**
 * Application Startup Validation
 * Validates environment variables and system configuration on startup
 * This file is imported in next.config.ts or app layout to ensure validation
 */

// Use relative import to avoid TypeScript path alias issues in next.config.ts
import { validateEnvironmentOrThrow } from '../lib/env-validator'

// Validate environment on module load (if not in test mode)
if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
  try {
    validateEnvironmentOrThrow()
  } catch (error) {
    // In development, log error but continue
    if (process.env.NODE_ENV === 'development') {
      console.error('⚠️  Environment validation failed in development mode. Continuing anyway...')
      console.error(error)
    } else {
      // In production, re-throw to prevent startup
      throw error
    }
  }
}

// Export validation function for manual checks
export { validateEnvironmentOrThrow, validateEnvironment, getEnvironmentStatus } from '../lib/env-validator'
