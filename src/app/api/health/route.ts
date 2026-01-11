import { NextRequest, NextResponse } from 'next/server'
import { healthChecker } from '@/lib/monitoring/health-check'

export async function GET(request: NextRequest) {
  try {
    const healthStatus = await healthChecker.getHealthStatus()
    
    // Return appropriate status code based on health
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503

    return NextResponse.json(healthStatus, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 503 }
    )
  }
}