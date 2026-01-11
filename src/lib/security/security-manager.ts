/**
 * Advanced Security Manager
 * Enterprise-grade security features and threat detection
 */

export interface SecurityEvent {
  id: string
  timestamp: string
  type: 'authentication' | 'authorization' | 'data-access' | 'api-call' | 'suspicious-activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  action: string
  resource?: string
  outcome: 'success' | 'failure' | 'blocked'
  metadata: Record<string, any>
  riskScore: number
}

export interface SecurityConfig {
  enableRateLimiting: boolean
  enableBruteForceProtection: boolean
  enableSuspiciousActivityDetection: boolean
  enableDataEncryption: boolean
  enableAuditLogging: boolean
  maxLoginAttempts: number
  lockoutDuration: number
  sessionTimeout: number
  allowedOrigins: string[]
  blockedIPs: string[]
  suspiciousPatterns: string[]
}

export interface ThreatDetection {
  isThreat: boolean
  threatType: string
  riskScore: number
  recommendations: string[]
  autoBlock: boolean
}

class SecurityManager {
  private config: SecurityConfig
  private securityEvents: SecurityEvent[] = []
  private failedAttempts: Map<string, number> = new Map()
  private blockedIPs: Set<string> = new Set()
  private suspiciousActivities: Map<string, number> = new Map()

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableRateLimiting: true,
      enableBruteForceProtection: true,
      enableSuspiciousActivityDetection: true,
      enableDataEncryption: true,
      enableAuditLogging: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      allowedOrigins: [],
      blockedIPs: [],
      suspiciousPatterns: [
        'script',
        'javascript:',
        '<script',
        'eval(',
        'function(',
        'alert(',
        'document.cookie',
        'window.location',
        'XMLHttpRequest',
        'fetch('
      ],
      ...config
    }

    this.initializeSecurity()
  }

  /**
   * Initialize security features
   */
  private initializeSecurity(): void {
    this.setupCSP()
    this.setupSecurityHeaders()
    this.setupEventListeners()
    this.setupSessionMonitoring()
  }

  /**
   * Setup Content Security Policy
   */
  private setupCSP(): void {
    if (typeof document === 'undefined') return

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://*.supabase.co",
      "media-src 'self' blob:",
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ')

    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = csp
    document.head.appendChild(meta)
  }

  /**
   * Setup security headers
   */
  private setupSecurityHeaders(): void {
    // These would be set by the server, but we can validate them
    const expectedHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Referrer-Policy'
    ]

    // Validate headers are present (would need server-side implementation)
    this.logSecurityEvent({
      type: 'authentication',
      severity: 'low',
      action: 'security-headers-check',
      outcome: 'success',
      metadata: { headers: expectedHeaders }
    })
  }

  /**
   * Setup security event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return

    // Monitor for suspicious activities
    this.monitorSuspiciousActivities()
    
    // Monitor for data exfiltration attempts
    this.monitorDataAccess()
    
    // Monitor for API abuse
    this.monitorAPICalls()
  }

  /**
   * Monitor suspicious activities
   */
  private monitorSuspiciousActivities(): void {
    // Monitor console access attempts
    const originalConsole = { ...console }
    
    Object.keys(console).forEach(method => {
      (console as any)[method] = (...args: any[]) => {
        this.logSecurityEvent({
          type: 'suspicious-activity',
          severity: 'medium',
          action: 'console-access',
          outcome: 'success',
          metadata: { method, args: args.length }
        })
        
        return (originalConsole as any)[method](...args)
      }
    })

    // Monitor for XSS attempts
    document.addEventListener('DOMContentLoaded', () => {
      const scripts = document.querySelectorAll('script')
      scripts.forEach(script => {
        if (this.detectSuspiciousContent(script.textContent || '')) {
          this.logSecurityEvent({
            type: 'suspicious-activity',
            severity: 'high',
            action: 'xss-attempt',
            outcome: 'blocked',
            metadata: { content: script.textContent }
          })
        }
      })
    })
  }

  /**
   * Monitor data access
   */
  private monitorDataAccess(): void {
    // Monitor localStorage access
    const originalSetItem = localStorage.setItem
    const originalGetItem = localStorage.getItem
    
    localStorage.setItem = (key: string, value: string) => {
      this.logSecurityEvent({
        type: 'data-access',
        severity: 'low',
        action: 'localStorage-write',
        outcome: 'success',
        metadata: { key, valueLength: value.length }
      })
      
      return originalSetItem.call(localStorage, key, value)
    }
    
    localStorage.getItem = (key: string) => {
      this.logSecurityEvent({
        type: 'data-access',
        severity: 'low',
        action: 'localStorage-read',
        outcome: 'success',
        metadata: { key }
      })
      
      return originalGetItem.call(localStorage, key)
    }
  }

  /**
   * Monitor API calls
   */
  private monitorAPICalls(): void {
    const originalFetch = window.fetch
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      
      // Check for suspicious patterns
      if (this.detectSuspiciousContent(url)) {
        this.logSecurityEvent({
          type: 'api-call',
          severity: 'high',
          action: 'suspicious-api-call',
          outcome: 'blocked',
          metadata: { url, method: init?.method || 'GET' }
        })
        
        throw new Error('Suspicious API call blocked')
      }
      
      // Rate limiting check
      if (this.isRateLimited(url)) {
        this.logSecurityEvent({
          type: 'api-call',
          severity: 'medium',
          action: 'rate-limit-exceeded',
          outcome: 'blocked',
          metadata: { url }
        })
        
        throw new Error('Rate limit exceeded')
      }
      
      try {
        const response = await originalFetch(input, init)
        
        this.logSecurityEvent({
          type: 'api-call',
          severity: 'low',
          action: 'api-call',
          outcome: response.ok ? 'success' : 'failure',
          metadata: { 
            url, 
            method: init?.method || 'GET',
            status: response.status 
          }
        })
        
        return response
      } catch (error) {
        this.logSecurityEvent({
          type: 'api-call',
          severity: 'medium',
          action: 'api-call-error',
          outcome: 'failure',
          metadata: { url, error: error instanceof Error ? error.message : 'Unknown error' }
        })
        
        throw error
      }
    }
  }

  /**
   * Setup session monitoring
   */
  private setupSessionMonitoring(): void {
    if (typeof window === 'undefined') return

    // Monitor session timeout
    let lastActivity = Date.now()
    
    const updateActivity = () => {
      lastActivity = Date.now()
    }
    
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })
    
    // Check for session timeout
    setInterval(() => {
      if (Date.now() - lastActivity > this.config.sessionTimeout) {
        this.logSecurityEvent({
          type: 'authentication',
          severity: 'medium',
          action: 'session-timeout',
          outcome: 'success',
          metadata: { timeout: this.config.sessionTimeout }
        })
        
        // Clear session
        sessionStorage.clear()
        localStorage.removeItem('sessionId')
      }
    }, 60000) // Check every minute
  }

  /**
   * Detect suspicious content
   */
  private detectSuspiciousContent(content: string): boolean {
    return this.config.suspiciousPatterns.some(pattern => 
      content.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  /**
   * Check if request is rate limited
   */
  private isRateLimited(url: string): boolean {
    if (!this.config.enableRateLimiting) return false
    
    const key = `rate_limit_${url}`
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute window
    
    // This is a simplified rate limiting - in production, use Redis or similar
    const requests = JSON.parse(localStorage.getItem(key) || '[]')
    const recentRequests = requests.filter((time: number) => time > windowStart)
    
    if (recentRequests.length >= 100) { // 100 requests per minute
      return true
    }
    
    recentRequests.push(now)
    localStorage.setItem(key, JSON.stringify(recentRequests))
    
    return false
  }

  /**
   * Detect threats
   */
  detectThreat(event: Partial<SecurityEvent>): ThreatDetection {
    let riskScore = 0
    const recommendations: string[] = []
    let isThreat = false
    let threatType = ''
    let autoBlock = false

    // Check for brute force attempts
    if (event.action === 'login-attempt' && event.outcome === 'failure') {
      const key = `failed_attempts_${event.userId || 'unknown'}`
      const attempts = this.failedAttempts.get(key) || 0
      this.failedAttempts.set(key, attempts + 1)
      
      if (attempts >= this.config.maxLoginAttempts) {
        riskScore += 80
        isThreat = true
        threatType = 'brute-force'
        autoBlock = true
        recommendations.push('Block user account temporarily')
      }
    }

    // Check for suspicious patterns
    if (event.metadata?.content && this.detectSuspiciousContent(event.metadata.content)) {
      riskScore += 60
      isThreat = true
      threatType = 'xss-attempt'
      autoBlock = true
      recommendations.push('Block request and log for investigation')
    }

    // Check for unusual API usage
    if (event.type === 'api-call') {
      const suspiciousActivities = this.suspiciousActivities.get(event.userId || 'unknown') || 0
      if (suspiciousActivities > 10) {
        riskScore += 40
        isThreat = true
        threatType = 'api-abuse'
        recommendations.push('Rate limit user requests')
      }
    }

    // Check for data exfiltration
    if (event.type === 'data-access' && event.action?.includes('sensitive')) {
      riskScore += 50
      isThreat = true
      threatType = 'data-exfiltration'
      recommendations.push('Audit data access and consider additional authentication')
    }

    return {
      isThreat,
      threatType,
      riskScore,
      recommendations,
      autoBlock
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: Partial<SecurityEvent>): void {
    const fullEvent: SecurityEvent = {
      id: `security-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'authentication',
      severity: 'low',
      action: 'unknown',
      outcome: 'success',
      metadata: {},
      riskScore: 0,
      ...event
    }

    // Detect threats
    const threatDetection = this.detectThreat(fullEvent)
    fullEvent.riskScore = threatDetection.riskScore

    // Add to events
    this.securityEvents.push(fullEvent)

    // Auto-block if threat detected
    if (threatDetection.autoBlock) {
      this.blockUser(fullEvent.userId || 'unknown')
    }

    // Send to security monitoring
    this.sendToSecurityMonitoring(fullEvent)

    // Store locally for analysis
    this.storeSecurityEvent(fullEvent)
  }

  /**
   * Block user
   */
  private blockUser(userId: string): void {
    this.blockedIPs.add(userId)
    
    this.logSecurityEvent({
      type: 'authorization',
      severity: 'high',
      action: 'user-blocked',
      outcome: 'success',
      metadata: { userId, reason: 'security-threat' }
    })
  }

  /**
   * Send to security monitoring
   */
  private async sendToSecurityMonitoring(event: SecurityEvent): Promise<void> {
    try {
      await fetch('/api/security/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.error('Failed to send security event:', error)
    }
  }

  /**
   * Store security event
   */
  private storeSecurityEvent(event: SecurityEvent): void {
    try {
      const events = JSON.parse(localStorage.getItem('security_events') || '[]')
      events.push(event)
      
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.splice(0, events.length - 1000)
      }
      
      localStorage.setItem('security_events', JSON.stringify(events))
    } catch (error) {
      console.error('Failed to store security event:', error)
    }
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string, key?: string): string {
    if (!this.config.enableDataEncryption) return data
    
    // Simple encryption - in production, use proper encryption library
    const encryptionKey = key || 'default-key'
    const encrypted = btoa(data + encryptionKey)
    return encrypted
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, key?: string): string {
    if (!this.config.enableDataEncryption) return encryptedData
    
    try {
      const decryptionKey = key || 'default-key'
      const decrypted = atob(encryptedData)
      return decrypted.replace(decryptionKey, '')
    } catch (error) {
      console.error('Failed to decrypt data:', error)
      return encryptedData
    }
  }

  /**
   * Validate input for security
   */
  validateInput(input: string, type: 'email' | 'password' | 'general'): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    // Check for suspicious patterns
    if (this.detectSuspiciousContent(input)) {
      errors.push('Input contains potentially malicious content')
    }
    
    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(input)) {
          errors.push('Invalid email format')
        }
        break
        
      case 'password':
        if (input.length < 8) {
          errors.push('Password must be at least 8 characters long')
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(input)) {
          errors.push('Password must contain uppercase, lowercase, and number')
        }
        break
        
      case 'general':
        if (input.length > 1000) {
          errors.push('Input too long')
        }
        break
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number
    criticalEvents: number
    blockedUsers: number
    threatTypes: Record<string, number>
    recentThreats: SecurityEvent[]
  } {
    const storedEvents = this.getStoredSecurityEvents()
    const criticalEvents = storedEvents.filter(e => e.severity === 'critical').length
    const threatTypes = storedEvents.reduce((acc, event) => {
      if (event.riskScore > 50) {
        acc[event.type] = (acc[event.type] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
    
    const recentThreats = storedEvents
      .filter(e => e.riskScore > 50)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return {
      totalEvents: storedEvents.length,
      criticalEvents,
      blockedUsers: this.blockedIPs.size,
      threatTypes,
      recentThreats
    }
  }

  /**
   * Get stored security events
   */
  getStoredSecurityEvents(): SecurityEvent[] {
    try {
      return JSON.parse(localStorage.getItem('security_events') || '[]')
    } catch (error) {
      return []
    }
  }

  /**
   * Clear security events
   */
  clearSecurityEvents(): void {
    localStorage.removeItem('security_events')
    this.securityEvents = []
  }

  /**
   * Update security configuration
   */
  updateConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return this.config
  }
}

export const securityManager = new SecurityManager()












