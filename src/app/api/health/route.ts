import { NextResponse } from 'next/server'
import { mlSystemIntegration } from '@/lib/ml-integration'
import { SPECIALIZED_AGENTS } from '@/lib/specialized-agents'

/**
 * Health Check Endpoint
 * Returns system health status
 */
export async function GET() {
  try {
    // Initialize ML system if not already
    if (!mlSystemIntegration['initialized']) {
      mlSystemIntegration.initialize(SPECIALIZED_AGENTS)
    }

    const mlHealth = mlSystemIntegration.getSystemHealth()

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      systems: {
        ml: mlHealth,
        agents: {
          total: Object.keys(SPECIALIZED_AGENTS).length,
          active: Object.keys(SPECIALIZED_AGENTS).length,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
