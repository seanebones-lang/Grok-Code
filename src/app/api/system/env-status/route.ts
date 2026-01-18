import { NextResponse } from 'next/server'
import { validateEnvironment, getEnvironmentStatus } from '@/lib/env-validator'

/**
 * Environment Status API
 * Returns current environment variable status for diagnostics
 */

export async function GET() {
  const validation = validateEnvironment()
  const status = getEnvironmentStatus()

  return NextResponse.json({
    validation,
    status,
    timestamp: new Date().toISOString(),
  })
}
