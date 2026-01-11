/**
 * Error Tracking and Monitoring
 * Production-ready error handling and monitoring
 */

export interface ErrorEvent {
  id: string
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'api' | 'ui' | 'auth' | 'integration' | 'ai' | 'database'
  metadata?: Record<string, any>
}

export interface PerformanceEvent {
  id: string
  name: string
  duration: number
  timestamp: string
  userId?: string
  metadata?: Record<string, any>
}

class ErrorTracker {
  private errors: ErrorEvent[] = []
  private performanceEvents: PerformanceEvent[] = []
  private isProduction: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.initializeErrorHandling()
  }

  /**
   * Initialize global error handling
   */
  private initializeErrorHandling(): void {
    if (typeof window === 'undefined') return

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        severity: 'high',
        category: 'ui'
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        severity: 'high',
        category: 'ui'
      })
    })

    // Performance observer
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.trackPerformance({
              name: 'page_load',
              duration: entry.duration
            })
          } else if (entry.entryType === 'measure') {
            this.trackPerformance({
              name: entry.name,
              duration: entry.duration
            })
          }
        }
      })

      observer.observe({ entryTypes: ['navigation', 'measure'] })
    }
  }

  /**
   * Track an error
   */
  trackError(error: Partial<ErrorEvent>): void {
    const errorEvent: ErrorEvent = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: error.url || (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: error.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      userId: error.userId,
      timestamp: new Date().toISOString(),
      severity: error.severity || 'medium',
      category: error.category || 'ui',
      metadata: error.metadata
    }

    this.errors.push(errorEvent)

    // Log to console in development
    if (!this.isProduction) {
      console.error('Error tracked:', errorEvent)
    }

    // Send to monitoring service in production
    if (this.isProduction) {
      this.sendToMonitoringService(errorEvent)
    }

    // Store in localStorage for debugging
    this.storeErrorLocally(errorEvent)
  }

  /**
   * Track performance metrics
   */
  trackPerformance(performance: Partial<PerformanceEvent>): void {
    const performanceEvent: PerformanceEvent = {
      id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: performance.name || 'unknown',
      duration: performance.duration || 0,
      timestamp: new Date().toISOString(),
      userId: performance.userId,
      metadata: performance.metadata
    }

    this.performanceEvents.push(performanceEvent)

    // Log to console in development
    if (!this.isProduction) {
      console.log('Performance tracked:', performanceEvent)
    }

    // Send to monitoring service in production
    if (this.isProduction) {
      this.sendPerformanceToMonitoringService(performanceEvent)
    }
  }

  /**
   * Track API errors
   */
  trackApiError(endpoint: string, status: number, message: string, userId?: string): void {
    this.trackError({
      message: `API Error: ${endpoint} - ${status}`,
      stack: message,
      url: endpoint,
      severity: status >= 500 ? 'high' : status >= 400 ? 'medium' : 'low',
      category: 'api',
      userId,
      metadata: { endpoint, status }
    })
  }

  /**
   * Track authentication errors
   */
  trackAuthError(message: string, userId?: string): void {
    this.trackError({
      message: `Auth Error: ${message}`,
      severity: 'high',
      category: 'auth',
      userId
    })
  }

  /**
   * Track integration errors
   */
  trackIntegrationError(integration: string, message: string, userId?: string): void {
    this.trackError({
      message: `Integration Error: ${integration} - ${message}`,
      severity: 'medium',
      category: 'integration',
      userId,
      metadata: { integration }
    })
  }

  /**
   * Track AI errors
   */
  trackAiError(message: string, userId?: string): void {
    this.trackError({
      message: `AI Error: ${message}`,
      severity: 'medium',
      category: 'ai',
      userId
    })
  }

  /**
   * Track database errors
   */
  trackDatabaseError(message: string, userId?: string): void {
    this.trackError({
      message: `Database Error: ${message}`,
      severity: 'high',
      category: 'database',
      userId
    })
  }

  /**
   * Send error to monitoring service
   */
  private async sendToMonitoringService(error: ErrorEvent): Promise<void> {
    try {
      // In production, send to your monitoring service (e.g., Sentry, LogRocket, etc.)
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(error)
      })
    } catch (err) {
      console.error('Failed to send error to monitoring service:', err)
    }
  }

  /**
   * Send performance data to monitoring service
   */
  private async sendPerformanceToMonitoringService(performance: PerformanceEvent): Promise<void> {
    try {
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(performance)
      })
    } catch (err) {
      console.error('Failed to send performance data to monitoring service:', err)
    }
  }

  /**
   * Store error locally for debugging
   */
  private storeErrorLocally(error: ErrorEvent): void {
    if (typeof window === 'undefined') return

    try {
      const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]')
      storedErrors.push(error)
      
      // Keep only last 50 errors
      if (storedErrors.length > 50) {
        storedErrors.splice(0, storedErrors.length - 50)
      }
      
      localStorage.setItem('app_errors', JSON.stringify(storedErrors))
    } catch (err) {
      console.error('Failed to store error locally:', err)
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorEvent[] {
    return this.errors
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceEvent[] {
    return this.performanceEvents
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    bySeverity: Record<string, number>
    byCategory: Record<string, number>
    recent: ErrorEvent[]
  } {
    const recent = this.errors.slice(-10)
    const bySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const byCategory = this.errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: this.errors.length,
      bySeverity,
      byCategory,
      recent
    }
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errors = []
    this.performanceEvents = []
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_errors')
    }
  }
}

export const errorTracker = new ErrorTracker()

/**
 * React Error Boundary Component
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorTracker.trackError({
      message: error.message,
      stack: error.stack,
      severity: 'critical',
      category: 'ui',
      metadata: {
        componentStack: errorInfo.componentStack
      }
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}












