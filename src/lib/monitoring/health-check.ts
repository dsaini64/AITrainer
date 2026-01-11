/**
 * Health Check System
 * Monitors application health and dependencies
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: ServiceHealth
    ai: ServiceHealth
    integrations: ServiceHealth
    storage: ServiceHealth
  }
  metrics: {
    responseTime: number
    memoryUsage: number
    cpuUsage: number
    uptime: number
  }
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  lastCheck: string
  error?: string
}

class HealthChecker {
  private checks: Map<string, () => Promise<ServiceHealth>> = new Map()

  constructor() {
    this.initializeChecks()
  }

  /**
   * Initialize health checks
   */
  private initializeChecks(): void {
    this.checks.set('database', this.checkDatabase.bind(this))
    this.checks.set('ai', this.checkAiService.bind(this))
    this.checks.set('integrations', this.checkIntegrations.bind(this))
    this.checks.set('storage', this.checkStorage.bind(this))
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<ServiceHealth> {
    try {
      const start = Date.now()
      
      // Check Supabase connection
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const responseTime = Date.now() - start
      
      if (response.ok) {
        return {
          status: 'healthy',
          responseTime,
          lastCheck: new Date().toISOString()
        }
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: `Database check failed with status ${response.status}`
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }
  }

  /**
   * Check AI service health
   */
  private async checkAiService(): Promise<ServiceHealth> {
    try {
      const start = Date.now()
      
      // Check OpenAI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'health check',
          mode: 'explain',
          userId: 'health-check'
        })
      })
      
      const responseTime = Date.now() - start
      
      if (response.ok) {
        return {
          status: 'healthy',
          responseTime,
          lastCheck: new Date().toISOString()
        }
      } else {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: `AI service check failed with status ${response.status}`
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown AI service error'
      }
    }
  }

  /**
   * Check integrations health
   */
  private async checkIntegrations(): Promise<ServiceHealth> {
    try {
      const start = Date.now()
      
      // Check integrations API
      const response = await fetch('/api/integrations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const responseTime = Date.now() - start
      
      if (response.ok) {
        return {
          status: 'healthy',
          responseTime,
          lastCheck: new Date().toISOString()
        }
      } else {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: `Integrations check failed with status ${response.status}`
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown integrations error'
      }
    }
  }

  /**
   * Check storage health
   */
  private async checkStorage(): Promise<ServiceHealth> {
    try {
      const start = Date.now()
      
      // Check if we can access localStorage/sessionStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('health-check', 'test')
          localStorage.removeItem('health-check')
        } catch (error) {
          throw new Error('Local storage not available')
        }
      }
      
      const responseTime = Date.now() - start
      
      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown storage error'
      }
    }
  }

  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const services: HealthStatus['services'] = {
      database: { status: 'unhealthy', lastCheck: new Date().toISOString() },
      ai: { status: 'unhealthy', lastCheck: new Date().toISOString() },
      integrations: { status: 'unhealthy', lastCheck: new Date().toISOString() },
      storage: { status: 'unhealthy', lastCheck: new Date().toISOString() }
    }

    // Run all health checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      try {
        const result = await check()
        services[name as keyof typeof services] = result
      } catch (error) {
        services[name as keyof typeof services] = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    await Promise.all(checkPromises)

    // Determine overall status
    const serviceStatuses = Object.values(services).map(s => s.status)
    const hasUnhealthy = serviceStatuses.includes('unhealthy')
    const hasDegraded = serviceStatuses.includes('degraded')
    
    let overallStatus: HealthStatus['status'] = 'healthy'
    if (hasUnhealthy) {
      overallStatus = 'unhealthy'
    } else if (hasDegraded) {
      overallStatus = 'degraded'
    }

    // Get system metrics
    const metrics = await this.getSystemMetrics()

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      metrics
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<HealthStatus['metrics']> {
    const start = Date.now()
    
    // Simulate response time measurement
    await new Promise(resolve => setTimeout(resolve, 1))
    const responseTime = Date.now() - start

    // Get memory usage (if available)
    let memoryUsage = 0
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0
    }

    // Get uptime
    const uptime = typeof window !== 'undefined' ? performance.now() : 0

    return {
      responseTime,
      memoryUsage,
      cpuUsage: 0, // Would need server-side monitoring
      uptime
    }
  }

  /**
   * Get health status for a specific service
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealth | null> {
    const check = this.checks.get(serviceName)
    if (!check) {
      return null
    }

    try {
      return await check()
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Add custom health check
   */
  addHealthCheck(name: string, check: () => Promise<ServiceHealth>): void {
    this.checks.set(name, check)
  }

  /**
   * Remove health check
   */
  removeHealthCheck(name: string): void {
    this.checks.delete(name)
  }
}

export const healthChecker = new HealthChecker()












