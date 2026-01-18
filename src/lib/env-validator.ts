/**
 * Environment Variable Validation
 * Validates all required environment variables on startup
 * Fails fast with clear error messages if missing
 */

interface EnvConfig {
  required: string[]
  optional: Array<{ name: string; description: string }>
}

const ENV_CONFIG: EnvConfig = {
  required: [
    'GROK_API_KEY', // Required for AI features
  ],
  optional: [
    { name: 'GITHUB_TOKEN', description: 'GitHub Personal Access Token for repository operations' },
    { name: 'VERCEL_TOKEN', description: 'Vercel API token for deployments' },
    { name: 'RAILWAY_TOKEN', description: 'Railway API token for deployments' },
    { name: 'AWS_ACCESS_KEY_ID', description: 'AWS access key for AWS deployments' },
    { name: 'AWS_SECRET_ACCESS_KEY', description: 'AWS secret key for AWS deployments' },
    { name: 'DATABASE_URL', description: 'PostgreSQL connection string for database' },
    { name: 'NEXTAUTH_URL', description: 'Base URL for authentication callbacks' },
    { name: 'UPSTASH_REDIS_REST_URL', description: 'Upstash Redis URL for rate limiting' },
    { name: 'UPSTASH_REDIS_REST_TOKEN', description: 'Upstash Redis token for rate limiting' },
  ],
}

interface ValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
  errors: string[]
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const missing: string[] = []
  const warnings: string[] = []
  const errors: string[] = []

  // Check required variables
  for (const varName of ENV_CONFIG.required) {
    if (!process.env[varName]) {
      missing.push(varName)
      errors.push(`Required environment variable ${varName} is not set`)
    }
  }

  // Check optional but recommended variables
  for (const { name, description } of ENV_CONFIG.optional) {
    if (!process.env[name]) {
      warnings.push(`${name} is not set (${description})`)
    }
  }

  // Validate format for specific variables
  if (process.env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN.startsWith('ghp_') && !process.env.GITHUB_TOKEN.startsWith('github_pat_')) {
    warnings.push('GITHUB_TOKEN format may be incorrect (should start with ghp_ or github_pat_)')
  }

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    warnings.push('DATABASE_URL format may be incorrect (should start with postgresql://)')
  }

  if (process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY) {
    warnings.push('AWS_ACCESS_KEY_ID is set but AWS_SECRET_ACCESS_KEY is missing')
  }

  if (process.env.AWS_SECRET_ACCESS_KEY && !process.env.AWS_ACCESS_KEY_ID) {
    warnings.push('AWS_SECRET_ACCESS_KEY is set but AWS_ACCESS_KEY_ID is missing')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    errors,
  }
}

/**
 * Validate environment and throw if invalid
 * Use this on application startup
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment()

  if (!result.valid) {
    const errorMessage = [
      'Environment validation failed:',
      '',
      'Missing required variables:',
      ...result.missing.map(v => `  - ${v}`),
      '',
      'Set these in .env.local or your deployment platform.',
    ].join('\n')

    console.error(errorMessage)
    throw new Error(`Environment validation failed: Missing ${result.missing.join(', ')}`)
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:')
    result.warnings.forEach(warning => console.warn(`  - ${warning}`))
    console.warn('')
  }

  console.log('✅ Environment validation passed')
}

/**
 * Get environment status for diagnostics
 */
export function getEnvironmentStatus(): {
  required: Record<string, boolean>
  optional: Record<string, boolean>
} {
  return {
    required: Object.fromEntries(
      ENV_CONFIG.required.map(name => [name, !!process.env[name]])
    ),
    optional: Object.fromEntries(
      ENV_CONFIG.optional.map(({ name }) => [name, !!process.env[name]])
    ),
  }
}
