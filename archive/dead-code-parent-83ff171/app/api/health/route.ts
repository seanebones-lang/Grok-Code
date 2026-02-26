import { NextResponse } from 'next/server'
import { getEnvironmentStatus } from '@/lib/env-validator'

/**
 * Health Check Endpoint
 * Returns system health status for monitoring
 */
export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check environment variables
    const envStatus = getEnvironmentStatus()
    
    // Check database connection (if available)
    let dbStatus = 'unknown'
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      dbStatus = 'connected'
    } catch (error) {
      dbStatus = 'disconnected'
    }
    
    // Check rate limiting (if available)
    let rateLimitStatus = 'unknown'
    try {
      const { checkRateLimit } = await import('@/lib/ratelimit')
      await checkRateLimit('health-check')
      rateLimitStatus = 'available'
    } catch {
      rateLimitStatus = 'unavailable'
    }
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      environment: {
        node: process.version,
        nextjs: process.env.NEXT_RUNTIME || 'unknown',
      },
      services: {
        database: dbStatus,
        rateLimit: rateLimitStatus,
      },
      environmentVariables: {
        required: envStatus.required,
        optional: envStatus.optional,
      },
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - startTime}ms`,
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  }
}
