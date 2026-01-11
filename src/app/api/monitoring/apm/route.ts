/**
 * APM (Application Performance Monitoring) API
 * Handles performance metrics collection and analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { apmManager } from '@/lib/monitoring/apm'

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json()
    
    // Validate metric structure
    if (!metric.id || !metric.timestamp || !metric.type) {
      return NextResponse.json(
        { error: 'Invalid metric structure' },
        { status: 400 }
      )
    }

    // Store metric in database (mock implementation)
    console.log('APM Metric received:', {
      id: metric.id,
      type: metric.type,
      category: metric.category,
      name: metric.name,
      value: metric.value,
      timestamp: metric.timestamp
    })

    // Process metric for real-time analysis
    await processMetric(metric)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('APM API error:', error)
    return NextResponse.json(
      { error: 'Failed to process APM metric' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const timeRange = searchParams.get('timeRange') || '1h'

    // Get metrics based on filters
    const metrics = await getMetrics({ type, category, timeRange })

    return NextResponse.json({
      metrics,
      summary: await getMetricsSummary(metrics),
      recommendations: await getPerformanceRecommendations(metrics)
    })
  } catch (error) {
    console.error('APM GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve APM metrics' },
      { status: 500 }
    )
  }
}

/**
 * Process incoming metric
 */
async function processMetric(metric: any): Promise<void> {
  // Real-time alerting
  if (metric.type === 'performance' && metric.value > 5000) {
    await sendAlert({
      type: 'performance',
      severity: 'warning',
      message: `Slow performance detected: ${metric.name} = ${metric.value}ms`,
      metric
    })
  }

  // Error rate monitoring
  if (metric.type === 'error' && metric.category === 'javascript-error') {
    await sendAlert({
      type: 'error',
      severity: 'critical',
      message: `JavaScript error detected: ${metric.tags?.message}`,
      metric
    })
  }

  // Business metrics tracking
  if (metric.type === 'business') {
    await trackBusinessMetric(metric)
  }
}

/**
 * Get metrics with filters
 */
async function getMetrics(filters: {
  type?: string | null
  category?: string | null
  timeRange?: string
}): Promise<any[]> {
  // Mock implementation - in production, query from database
  const mockMetrics = [
    {
      id: 'metric-1',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'performance',
      category: 'web-vitals',
      name: 'largest-contentful-paint',
      value: 1200,
      unit: 'ms',
      tags: { url: 'https://example.com' }
    },
    {
      id: 'metric-2',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      type: 'performance',
      category: 'web-vitals',
      name: 'first-input-delay',
      value: 50,
      unit: 'ms',
      tags: { url: 'https://example.com' }
    },
    {
      id: 'metric-3',
      timestamp: new Date(Date.now() - 15000).toISOString(),
      type: 'error',
      category: 'javascript-error',
      name: 'error-count',
      value: 1,
      unit: 'count',
      tags: { message: 'TypeError: Cannot read property' }
    }
  ]

  return mockMetrics.filter(metric => {
    if (filters.type && metric.type !== filters.type) return false
    if (filters.category && metric.category !== filters.category) return false
    return true
  })
}

/**
 * Get metrics summary
 */
async function getMetricsSummary(metrics: any[]): Promise<any> {
  const performanceMetrics = metrics.filter(m => m.type === 'performance')
  const errorMetrics = metrics.filter(m => m.type === 'error')
  const businessMetrics = metrics.filter(m => m.type === 'business')

  return {
    totalMetrics: metrics.length,
    performance: {
      count: performanceMetrics.length,
      averageValue: performanceMetrics.reduce((sum, m) => sum + m.value, 0) / performanceMetrics.length || 0,
      maxValue: Math.max(...performanceMetrics.map(m => m.value), 0)
    },
    errors: {
      count: errorMetrics.length,
      types: errorMetrics.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    },
    business: {
      count: businessMetrics.length,
      features: businessMetrics.reduce((acc, m) => {
        acc[m.name] = (acc[m.name] || 0) + m.value
        return acc
      }, {} as Record<string, number>)
    }
  }
}

/**
 * Get performance recommendations
 */
async function getPerformanceRecommendations(metrics: any[]): Promise<string[]> {
  const recommendations: string[] = []
  
  const performanceMetrics = metrics.filter(m => m.type === 'performance')
  const lcp = performanceMetrics.find(m => m.name === 'largest-contentful-paint')
  const fid = performanceMetrics.find(m => m.name === 'first-input-delay')
  const cls = performanceMetrics.find(m => m.name === 'cumulative-layout-shift')

  if (lcp && lcp.value > 2500) {
    recommendations.push('Optimize images and reduce server response time to improve LCP')
  }

  if (fid && fid.value > 100) {
    recommendations.push('Reduce JavaScript execution time to improve FID')
  }

  if (cls && cls.value > 0.1) {
    recommendations.push('Avoid layout shifts by reserving space for dynamic content')
  }

  const errorCount = metrics.filter(m => m.type === 'error').length
  if (errorCount > 5) {
    recommendations.push('High error rate detected - investigate and fix JavaScript errors')
  }

  return recommendations
}

/**
 * Send alert
 */
async function sendAlert(alert: {
  type: string
  severity: string
  message: string
  metric: any
}): Promise<void> {
  console.log('ALERT:', alert)
  
  // In production, send to monitoring service (e.g., PagerDuty, Slack)
  // await sendToMonitoringService(alert)
}

/**
 * Track business metric
 */
async function trackBusinessMetric(metric: any): Promise<void> {
  console.log('Business metric tracked:', metric)
  
  // In production, store in analytics database
  // await storeBusinessMetric(metric)
}












