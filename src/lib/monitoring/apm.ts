/**
 * Advanced Performance Monitoring (APM)
 * Enterprise-grade application performance monitoring
 */

export interface APMMetrics {
  id: string
  timestamp: string
  type: 'performance' | 'error' | 'user' | 'business'
  category: string
  name: string
  value: number
  unit: string
  tags: Record<string, string>
  metadata?: Record<string, any>
}

export interface PerformanceMetrics {
  pageLoadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  timeToInteractive: number
  totalBlockingTime: number
  speedIndex: number
}

export interface BusinessMetrics {
  activeUsers: number
  sessionDuration: number
  conversionRate: number
  retentionRate: number
  featureUsage: Record<string, number>
  userEngagement: number
}

export interface ErrorMetrics {
  errorRate: number
  errorCount: number
  errorTypes: Record<string, number>
  criticalErrors: number
  recoveryTime: number
}

class APMManager {
  private metrics: APMMetrics[] = []
  private performanceObserver: PerformanceObserver | null = null
  private isInitialized: boolean = false

  constructor() {
    this.initializeAPM()
  }

  /**
   * Initialize APM monitoring
   */
  private initializeAPM(): void {
    if (typeof window === 'undefined') return

    try {
      this.initializePerformanceObserver()
      this.initializeWebVitals()
      this.initializeUserTracking()
      this.initializeErrorTracking()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize APM:', error)
    }
  }

  /**
   * Initialize Performance Observer
   */
  private initializePerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return

    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.trackPerformanceEntry(entry)
      }
    })

    // Observe different types of performance entries
    const entryTypes = [
      'navigation',
      'paint',
      'largest-contentful-paint',
      'first-input',
      'layout-shift',
      'resource',
      'mark',
      'measure'
    ]

    entryTypes.forEach(type => {
      try {
        this.performanceObserver?.observe({ entryTypes: [type] })
      } catch (error) {
        // Some entry types might not be supported
        console.warn(`Performance observer for ${type} not supported`)
      }
    })
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    // Core Web Vitals
    this.measureLCP()
    this.measureFID()
    this.measureCLS()
    
    // Additional metrics
    this.measureFCP()
    this.measureTTI()
    this.measureTBT()
  }

  /**
   * Measure Largest Contentful Paint (LCP)
   */
  private measureLCP(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        this.trackMetric({
          type: 'performance',
          category: 'web-vitals',
          name: 'largest-contentful-paint',
          value: lastEntry.startTime,
          unit: 'ms',
          tags: { url: window.location.href }
        })
      })

      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (error) {
      console.warn('LCP measurement not supported')
    }
  }

  /**
   * Measure First Input Delay (FID)
   */
  private measureFID(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackMetric({
            type: 'performance',
            category: 'web-vitals',
            name: 'first-input-delay',
            value: entry.processingStart - entry.startTime,
            unit: 'ms',
            tags: { url: window.location.href }
          })
        }
      })

      observer.observe({ entryTypes: ['first-input'] })
    } catch (error) {
      console.warn('FID measurement not supported')
    }
  }

  /**
   * Measure Cumulative Layout Shift (CLS)
   */
  private measureCLS(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }

        this.trackMetric({
          type: 'performance',
          category: 'web-vitals',
          name: 'cumulative-layout-shift',
          value: clsValue,
          unit: 'score',
          tags: { url: window.location.href }
        })
      })

      observer.observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      console.warn('CLS measurement not supported')
    }
  }

  /**
   * Measure First Contentful Paint (FCP)
   */
  private measureFCP(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.trackMetric({
              type: 'performance',
              category: 'web-vitals',
              name: 'first-contentful-paint',
              value: entry.startTime,
              unit: 'ms',
              tags: { url: window.location.href }
            })
          }
        }
      })

      observer.observe({ entryTypes: ['paint'] })
    } catch (error) {
      console.warn('FCP measurement not supported')
    }
  }

  /**
   * Measure Time to Interactive (TTI)
   */
  private measureTTI(): void {
    // TTI is complex to measure accurately, using simplified version
    const tti = performance.now()
    
    this.trackMetric({
      type: 'performance',
      category: 'web-vitals',
      name: 'time-to-interactive',
      value: tti,
      unit: 'ms',
      tags: { url: window.location.href }
    })
  }

  /**
   * Measure Total Blocking Time (TBT)
   */
  private measureTBT(): void {
    // Simplified TBT calculation
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      const tbt = navigation.loadEventEnd - navigation.domContentLoadedEventStart
      
      this.trackMetric({
        type: 'performance',
        category: 'web-vitals',
        name: 'total-blocking-time',
        value: tbt,
        unit: 'ms',
        tags: { url: window.location.href }
      })
    }
  }

  /**
   * Initialize user tracking
   */
  private initializeUserTracking(): void {
    // Track user sessions
    this.trackUserSession()
    
    // Track user interactions
    this.trackUserInteractions()
    
    // Track feature usage
    this.trackFeatureUsage()
  }

  /**
   * Track user session
   */
  private trackUserSession(): void {
    const sessionId = this.generateSessionId()
    const startTime = Date.now()

    // Track session start
    this.trackMetric({
      type: 'user',
      category: 'session',
      name: 'session-start',
      value: 1,
      unit: 'count',
      tags: { sessionId, url: window.location.href }
    })

    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      const duration = Date.now() - startTime
      
      this.trackMetric({
        type: 'user',
        category: 'session',
        name: 'session-duration',
        value: duration,
        unit: 'ms',
        tags: { sessionId, url: window.location.href }
      })
    })
  }

  /**
   * Track user interactions
   */
  private trackUserInteractions(): void {
    const interactionTypes = ['click', 'scroll', 'keydown', 'touchstart']
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        this.trackMetric({
          type: 'user',
          category: 'interaction',
          name: `user-${type}`,
          value: 1,
          unit: 'count',
          tags: { 
            element: (event.target as Element)?.tagName || 'unknown',
            url: window.location.href 
          }
        })
      })
    })
  }

  /**
   * Track feature usage
   */
  private trackFeatureUsage(): void {
    // Track AI chat usage
    const trackAIChat = () => {
      this.trackMetric({
        type: 'business',
        category: 'feature-usage',
        name: 'ai-chat-usage',
        value: 1,
        unit: 'count',
        tags: { feature: 'ai-chat', url: window.location.href }
      })
    }

    // Track device integration usage
    const trackDeviceIntegration = (integration: string) => {
      this.trackMetric({
        type: 'business',
        category: 'feature-usage',
        name: 'device-integration-usage',
        value: 1,
        unit: 'count',
        tags: { feature: 'device-integration', integration, url: window.location.href }
      })
    }

    // Track analytics usage
    const trackAnalytics = () => {
      this.trackMetric({
        type: 'business',
        category: 'feature-usage',
        name: 'analytics-usage',
        value: 1,
        unit: 'count',
        tags: { feature: 'analytics', url: window.location.href }
      })
    }

    // Expose tracking functions globally
    (window as any).trackAIChat = trackAIChat
    ;(window as any).trackDeviceIntegration = trackDeviceIntegration
    ;(window as any).trackAnalytics = trackAnalytics
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackMetric({
        type: 'error',
        category: 'javascript-error',
        name: 'error-count',
        value: 1,
        unit: 'count',
        tags: { 
          message: event.message,
          filename: event.filename,
          lineno: event.lineno.toString(),
          colno: event.colno.toString(),
          url: window.location.href
        },
        metadata: {
          stack: event.error?.stack,
          userAgent: navigator.userAgent
        }
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackMetric({
        type: 'error',
        category: 'promise-rejection',
        name: 'error-count',
        value: 1,
        unit: 'count',
        tags: { 
          reason: event.reason?.toString() || 'unknown',
          url: window.location.href
        },
        metadata: {
          stack: event.reason?.stack,
          userAgent: navigator.userAgent
        }
      })
    })
  }

  /**
   * Track performance entry
   */
  private trackPerformanceEntry(entry: PerformanceEntry): void {
    const metric: APMMetrics = {
      id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'performance',
      category: entry.entryType,
      name: entry.name,
      value: entry.duration,
      unit: 'ms',
      tags: { url: window.location.href }
    }

    this.metrics.push(metric)
    this.sendMetricToAPM(metric)
  }

  /**
   * Track custom metric
   */
  trackMetric(metric: Omit<APMMetrics, 'id' | 'timestamp'>): void {
    const fullMetric: APMMetrics = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...metric
    }

    this.metrics.push(fullMetric)
    this.sendMetricToAPM(fullMetric)
  }

  /**
   * Track business metric
   */
  trackBusinessMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    this.trackMetric({
      type: 'business',
      category: 'business-metrics',
      name,
      value,
      unit: 'count',
      tags: { ...tags, url: window.location.href }
    })
  }

  /**
   * Track user metric
   */
  trackUserMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    this.trackMetric({
      type: 'user',
      category: 'user-behavior',
      name,
      value,
      unit: 'count',
      tags: { ...tags, url: window.location.href }
    })
  }

  /**
   * Send metric to APM service
   */
  private async sendMetricToAPM(metric: APMMetrics): Promise<void> {
    try {
      await fetch('/api/monitoring/apm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      })
    } catch (error) {
      console.error('Failed to send metric to APM:', error)
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paintEntries = performance.getEntriesByType('paint')
    
    return {
      pageLoadTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
      firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      largestContentfulPaint: 0, // Will be updated by LCP observer
      firstInputDelay: 0, // Will be updated by FID observer
      cumulativeLayoutShift: 0, // Will be updated by CLS observer
      timeToInteractive: performance.now(),
      totalBlockingTime: 0, // Calculated separately
      speedIndex: 0 // Would need specialized calculation
    }
  }

  /**
   * Get business metrics
   */
  getBusinessMetrics(): BusinessMetrics {
    const sessionMetrics = this.metrics.filter(m => m.type === 'user' && m.category === 'session')
    const featureMetrics = this.metrics.filter(m => m.type === 'business' && m.category === 'feature-usage')
    
    return {
      activeUsers: sessionMetrics.length,
      sessionDuration: sessionMetrics.reduce((sum, m) => sum + m.value, 0),
      conversionRate: 0, // Would need business logic
      retentionRate: 0, // Would need user tracking
      featureUsage: featureMetrics.reduce((acc, m) => {
        acc[m.name] = (acc[m.name] || 0) + m.value
        return acc
      }, {} as Record<string, number>),
      userEngagement: featureMetrics.length
    }
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    const errorMetrics = this.metrics.filter(m => m.type === 'error')
    
    return {
      errorRate: errorMetrics.length / Math.max(this.metrics.length, 1),
      errorCount: errorMetrics.length,
      errorTypes: errorMetrics.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      criticalErrors: errorMetrics.filter(m => m.tags.message?.includes('critical')).length,
      recoveryTime: 0 // Would need specialized tracking
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): APMMetrics[] {
    return this.metrics
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Check if APM is initialized
   */
  isAPMInitialized(): boolean {
    return this.isInitialized
  }
}

export const apmManager = new APMManager()












