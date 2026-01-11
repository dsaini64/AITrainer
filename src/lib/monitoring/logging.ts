/**
 * Enterprise Logging System
 * Structured logging with multiple levels and outputs
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  category: string
  service: string
  userId?: string
  sessionId?: string
  requestId?: string
  tags: Record<string, string>
  metadata?: Record<string, any>
  stack?: string
}

export interface LogConfig {
  level: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  enableFile: boolean
  enableMetrics: boolean
  remoteEndpoint?: string
  batchSize: number
  flushInterval: number
}

class Logger {
  private config: LogConfig
  private logs: LogEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private isInitialized: boolean = false

  constructor(config: Partial<LogConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: true,
      enableFile: false,
      enableMetrics: true,
      batchSize: 50,
      flushInterval: 5000,
      ...config
    }
    
    this.initialize()
  }

  /**
   * Initialize logger
   */
  private initialize(): void {
    if (typeof window === 'undefined') return

    // Set up automatic flushing
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush()
    })

    this.isInitialized = true
  }

  /**
   * Log debug message
   */
  debug(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, category, metadata)
  }

  /**
   * Log info message
   */
  info(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, category, metadata)
  }

  /**
   * Log warning message
   */
  warn(message: string, category: string = 'general', metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, category, metadata)
  }

  /**
   * Log error message
   */
  error(message: string, category: string = 'general', metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, category, metadata, error)
  }

  /**
   * Log critical message
   */
  critical(message: string, category: string = 'general', metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, category, metadata, error)
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    category: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    if (level < this.config.level) return

    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      service: 'longevity-coach',
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      requestId: this.getCurrentRequestId(),
      tags: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform
      },
      metadata,
      stack: error?.stack
    }

    // Add to logs array
    this.logs.push(logEntry)

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(logEntry)
    }

    // Remote logging
    if (this.config.enableRemote) {
      this.logToRemote(logEntry)
    }

    // File logging (browser storage)
    if (this.config.enableFile) {
      this.logToFile(logEntry)
    }

    // Metrics
    if (this.config.enableMetrics) {
      this.trackLogMetrics(logEntry)
    }

    // Auto-flush if batch size reached
    if (this.logs.length >= this.config.batchSize) {
      this.flush()
    }
  }

  /**
   * Log to console with appropriate styling
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString()
    const levelName = LogLevel[entry.level]
    const prefix = `[${timestamp}] [${levelName}] [${entry.category}]`

    const style = this.getConsoleStyle(entry.level)
    const args = [
      `%c${prefix}`,
      style,
      entry.message,
      entry.metadata ? entry.metadata : '',
      entry.stack ? entry.stack : ''
    ].filter(Boolean)

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(...args)
        break
      case LogLevel.INFO:
        console.info(...args)
        break
      case LogLevel.WARN:
        console.warn(...args)
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(...args)
        break
    }
  }

  /**
   * Get console style for log level
   */
  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #6B7280; font-weight: normal;'
      case LogLevel.INFO:
        return 'color: #3B82F6; font-weight: normal;'
      case LogLevel.WARN:
        return 'color: #F59E0B; font-weight: bold;'
      case LogLevel.ERROR:
        return 'color: #EF4444; font-weight: bold;'
      case LogLevel.CRITICAL:
        return 'color: #DC2626; font-weight: bold; background: #FEF2F2; padding: 2px 4px; border-radius: 3px;'
      default:
        return 'color: #000000; font-weight: normal;'
    }
  }

  /**
   * Log to remote service
   */
  private async logToRemote(entry: LogEntry): Promise<void> {
    try {
      await fetch('/api/monitoring/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      })
    } catch (error) {
      console.error('Failed to send log to remote service:', error)
    }
  }

  /**
   * Log to file (localStorage)
   */
  private logToFile(entry: LogEntry): void {
    try {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]')
      logs.push(entry)
      
      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000)
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to save log to file:', error)
    }
  }

  /**
   * Track log metrics
   */
  private trackLogMetrics(entry: LogEntry): void {
    // Track log levels
    const levelCounts = JSON.parse(localStorage.getItem('log_level_counts') || '{}')
    levelCounts[LogLevel[entry.level]] = (levelCounts[LogLevel[entry.level]] || 0) + 1
    localStorage.setItem('log_level_counts', JSON.stringify(levelCounts))

    // Track categories
    const categoryCounts = JSON.parse(localStorage.getItem('log_category_counts') || '{}')
    categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1
    localStorage.setItem('log_category_counts', JSON.stringify(categoryCounts))
  }

  /**
   * Flush logs to remote service
   */
  async flush(): Promise<void> {
    if (this.logs.length === 0) return

    const logsToFlush = [...this.logs]
    this.logs = []

    try {
      await fetch('/api/monitoring/logs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToFlush })
      })
    } catch (error) {
      console.error('Failed to flush logs:', error)
      // Re-add logs to queue for retry
      this.logs.unshift(...logsToFlush)
    }
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    return (window as any).currentUserId || undefined
  }

  /**
   * Get current session ID
   */
  private getCurrentSessionId(): string | undefined {
    return sessionStorage.getItem('sessionId') || undefined
  }

  /**
   * Get current request ID
   */
  private getCurrentRequestId(): string | undefined {
    return (window as any).currentRequestId || undefined
  }

  /**
   * Set user context
   */
  setUserContext(userId: string, sessionId?: string): void {
    ;(window as any).currentUserId = userId
    if (sessionId) {
      sessionStorage.setItem('sessionId', sessionId)
    }
  }

  /**
   * Set request context
   */
  setRequestContext(requestId: string): void {
    ;(window as any).currentRequestId = requestId
  }

  /**
   * Get logs from storage
   */
  getStoredLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]')
    } catch (error) {
      return []
    }
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    totalLogs: number
    levelCounts: Record<string, number>
    categoryCounts: Record<string, number>
    recentErrors: LogEntry[]
  } {
    const storedLogs = this.getStoredLogs()
    const levelCounts = JSON.parse(localStorage.getItem('log_level_counts') || '{}')
    const categoryCounts = JSON.parse(localStorage.getItem('log_category_counts') || '{}')
    
    const recentErrors = storedLogs
      .filter(log => log.level >= LogLevel.ERROR)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return {
      totalLogs: storedLogs.length,
      levelCounts,
      categoryCounts,
      recentErrors
    }
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs(): void {
    localStorage.removeItem('app_logs')
    localStorage.removeItem('log_level_counts')
    localStorage.removeItem('log_category_counts')
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get configuration
   */
  getConfig(): LogConfig {
    return this.config
  }

  /**
   * Check if logger is initialized
   */
  isInitialized(): boolean {
    return this.isInitialized
  }

  /**
   * Destroy logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush()
    this.isInitialized = false
  }
}

// Create default logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: true,
  enableFile: true,
  enableMetrics: true
})

// Create specialized loggers
export const apiLogger = new Logger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableRemote: true,
  enableFile: false,
  enableMetrics: true
})

export const securityLogger = new Logger({
  level: LogLevel.WARN,
  enableConsole: true,
  enableRemote: true,
  enableFile: true,
  enableMetrics: true
})

export const performanceLogger = new Logger({
  level: LogLevel.INFO,
  enableConsole: false,
  enableRemote: true,
  enableFile: false,
  enableMetrics: true
})












