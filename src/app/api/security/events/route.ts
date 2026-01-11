/**
 * Security Events API
 * Handles security event collection and threat detection
 */

import { NextRequest, NextResponse } from 'next/server'
import { securityManager } from '@/lib/security/security-manager'

export async function POST(request: NextRequest) {
  try {
    const securityEvent = await request.json()
    
    // Validate security event structure
    if (!securityEvent.id || !securityEvent.timestamp || !securityEvent.type) {
      return NextResponse.json(
        { error: 'Invalid security event structure' },
        { status: 400 }
      )
    }

    // Process security event
    await processSecurityEvent(securityEvent)

    // Store security event
    await storeSecurityEvent(securityEvent)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Security Events API error:', error)
    return NextResponse.json(
      { error: 'Failed to process security event' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const timeRange = searchParams.get('timeRange') || '24h'
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get security events with filters
    const events = await getSecurityEvents({ type, severity, timeRange, limit })

    return NextResponse.json({
      events,
      summary: await getSecuritySummary(events),
      threats: await getThreatAnalysis(events),
      recommendations: await getSecurityRecommendations(events)
    })
  } catch (error) {
    console.error('Security Events GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve security events' },
      { status: 500 }
    )
  }
}

/**
 * Process security event
 */
async function processSecurityEvent(event: any): Promise<void> {
  // Real-time threat detection
  const threatDetection = securityManager.detectThreat(event)
  
  if (threatDetection.isThreat) {
    await handleThreat(event, threatDetection)
  }

  // Update security statistics
  await updateSecurityStats(event)

  // Check for attack patterns
  await checkAttackPatterns(event)
}

/**
 * Handle detected threat
 */
async function handleThreat(event: any, threatDetection: any): Promise<void> {
  console.log('THREAT DETECTED:', {
    type: threatDetection.threatType,
    riskScore: threatDetection.riskScore,
    event: event.action,
    recommendations: threatDetection.recommendations
  })

  // Auto-block if configured
  if (threatDetection.autoBlock) {
    await blockThreat(event)
  }

  // Send security alert
  await sendSecurityAlert(event, threatDetection)

  // Log threat for analysis
  await logThreat(event, threatDetection)
}

/**
 * Block threat
 */
async function blockThreat(event: any): Promise<void> {
  console.log('BLOCKING THREAT:', {
    userId: event.userId,
    ipAddress: event.ipAddress,
    action: event.action,
    reason: 'High risk score detected'
  })

  // In production, implement actual blocking
  // - Block IP address
  // - Disable user account
  // - Add to blacklist
}

/**
 * Send security alert
 */
async function sendSecurityAlert(event: any, threatDetection: any): Promise<void> {
  const alert = {
    type: 'security-threat',
    severity: event.severity,
    threatType: threatDetection.threatType,
    riskScore: threatDetection.riskScore,
    message: `Security threat detected: ${event.action}`,
    event: {
      id: event.id,
      type: event.type,
      action: event.action,
      userId: event.userId,
      ipAddress: event.ipAddress,
      timestamp: event.timestamp
    },
    recommendations: threatDetection.recommendations
  }

  console.log('SECURITY ALERT:', alert)
  
  // In production, send to security team
  // await sendToSecurityTeam(alert)
}

/**
 * Log threat
 */
async function logThreat(event: any, threatDetection: any): Promise<void> {
  const threatLog = {
    eventId: event.id,
    threatType: threatDetection.threatType,
    riskScore: threatDetection.riskScore,
    timestamp: new Date().toISOString(),
    action: event.action,
    userId: event.userId,
    ipAddress: event.ipAddress,
    autoBlocked: threatDetection.autoBlock,
    recommendations: threatDetection.recommendations
  }

  console.log('THREAT LOGGED:', threatLog)
}

/**
 * Update security statistics
 */
async function updateSecurityStats(event: any): Promise<void> {
  // Update threat counts
  const stats = JSON.parse(localStorage.getItem('security_stats') || '{}')
  
  stats.totalEvents = (stats.totalEvents || 0) + 1
  
  if (event.severity === 'critical') {
    stats.criticalEvents = (stats.criticalEvents || 0) + 1
  }
  
  if (event.type === 'suspicious-activity') {
    stats.suspiciousActivities = (stats.suspiciousActivities || 0) + 1
  }
  
  localStorage.setItem('security_stats', JSON.stringify(stats))
}

/**
 * Check for attack patterns
 */
async function checkAttackPatterns(event: any): Promise<void> {
  // Check for brute force attacks
  if (event.action === 'login-attempt' && event.outcome === 'failure') {
    await checkBruteForcePattern(event)
  }

  // Check for DDoS patterns
  if (event.type === 'api-call') {
    await checkDDoSPattern(event)
  }

  // Check for data exfiltration
  if (event.type === 'data-access') {
    await checkDataExfiltrationPattern(event)
  }
}

/**
 * Check brute force pattern
 */
async function checkBruteForcePattern(event: any): Promise<void> {
  const key = `failed_logins_${event.userId || event.ipAddress}`
  const attempts = JSON.parse(localStorage.getItem(key) || '[]')
  attempts.push(Date.now())
  
  // Keep only last hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  const recentAttempts = attempts.filter((time: number) => time > oneHourAgo)
  
  localStorage.setItem(key, JSON.stringify(recentAttempts))
  
  if (recentAttempts.length > 10) {
    console.log('BRUTE FORCE ATTACK DETECTED:', {
      userId: event.userId,
      ipAddress: event.ipAddress,
      attempts: recentAttempts.length
    })
  }
}

/**
 * Check DDoS pattern
 */
async function checkDDoSPattern(event: any): Promise<void> {
  const key = `api_calls_${event.ipAddress}`
  const calls = JSON.parse(localStorage.getItem(key) || '[]')
  calls.push(Date.now())
  
  // Keep only last minute
  const oneMinuteAgo = Date.now() - 60 * 1000
  const recentCalls = calls.filter((time: number) => time > oneMinuteAgo)
  
  localStorage.setItem(key, JSON.stringify(recentCalls))
  
  if (recentCalls.length > 100) {
    console.log('DDoS ATTACK DETECTED:', {
      ipAddress: event.ipAddress,
      calls: recentCalls.length
    })
  }
}

/**
 * Check data exfiltration pattern
 */
async function checkDataExfiltrationPattern(event: any): Promise<void> {
  if (event.action?.includes('sensitive') || event.metadata?.sensitive) {
    console.log('DATA EXFILTRATION ATTEMPT:', {
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      metadata: event.metadata
    })
  }
}

/**
 * Store security event
 */
async function storeSecurityEvent(event: any): Promise<void> {
  // Mock implementation - in production, store in database
  console.log('Security event stored:', {
    id: event.id,
    type: event.type,
    severity: event.severity,
    action: event.action,
    timestamp: event.timestamp
  })
}

/**
 * Get security events with filters
 */
async function getSecurityEvents(filters: {
  type?: string | null
  severity?: string | null
  timeRange?: string
  limit?: number
}): Promise<any[]> {
  // Mock implementation - in production, query from database
  const mockEvents = [
    {
      id: 'security-1',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'authentication',
      severity: 'medium',
      action: 'login-attempt',
      outcome: 'failure',
      userId: 'user-123',
      ipAddress: '192.168.1.100',
      riskScore: 30
    },
    {
      id: 'security-2',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      type: 'suspicious-activity',
      severity: 'high',
      action: 'xss-attempt',
      outcome: 'blocked',
      ipAddress: '192.168.1.101',
      riskScore: 80
    },
    {
      id: 'security-3',
      timestamp: new Date(Date.now() - 15000).toISOString(),
      type: 'data-access',
      severity: 'medium',
      action: 'sensitive-data-access',
      outcome: 'success',
      userId: 'user-456',
      riskScore: 50
    }
  ]

  return mockEvents
    .filter(event => {
      if (filters.type && event.type !== filters.type) return false
      if (filters.severity && event.severity !== filters.severity) return false
      return true
    })
    .slice(0, filters.limit)
}

/**
 * Get security summary
 */
async function getSecuritySummary(events: any[]): Promise<any> {
  const severityCounts = events.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const typeCounts = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const highRiskEvents = events.filter(event => event.riskScore > 70)
  const blockedEvents = events.filter(event => event.outcome === 'blocked')

  return {
    totalEvents: events.length,
    severityCounts,
    typeCounts,
    highRiskEvents: highRiskEvents.length,
    blockedEvents: blockedEvents.length,
    averageRiskScore: events.reduce((sum, event) => sum + event.riskScore, 0) / events.length || 0
  }
}

/**
 * Get threat analysis
 */
async function getThreatAnalysis(events: any[]): Promise<any> {
  const threatTypes = events
    .filter(event => event.riskScore > 50)
    .reduce((acc, event) => {
      const threatType = event.type === 'suspicious-activity' ? 'malicious-activity' : event.type
      acc[threatType] = (acc[threatType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const topThreats = Object.entries(threatTypes)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)

  return {
    threatTypes,
    topThreats,
    totalThreats: Object.values(threatTypes).reduce((sum, count) => sum + count, 0)
  }
}

/**
 * Get security recommendations
 */
async function getSecurityRecommendations(events: any[]): Promise<string[]> {
  const recommendations: string[] = []
  
  const failedLogins = events.filter(e => e.action === 'login-attempt' && e.outcome === 'failure').length
  if (failedLogins > 5) {
    recommendations.push('Implement account lockout after multiple failed login attempts')
  }

  const xssAttempts = events.filter(e => e.action === 'xss-attempt').length
  if (xssAttempts > 0) {
    recommendations.push('Strengthen XSS protection and input validation')
  }

  const dataAccess = events.filter(e => e.type === 'data-access' && e.riskScore > 50).length
  if (dataAccess > 0) {
    recommendations.push('Implement additional data access controls and monitoring')
  }

  const highRiskEvents = events.filter(e => e.riskScore > 80).length
  if (highRiskEvents > 0) {
    recommendations.push('Review and investigate high-risk security events immediately')
  }

  return recommendations
}
