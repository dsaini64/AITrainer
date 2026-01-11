/**
 * Fitbit Integration
 * Handles data sync from Fitbit API
 */

export interface FitbitData {
  steps: number
  heartRate: number
  heartRateVariability: number
  sleepHours: number
  activeMinutes: number
  caloriesBurned: number
  distance: number
  floors: number
  restingHeartRate: number
  bloodOxygen: number
  weight: number
  height: number
  bmi: number
  date: string
}

export interface FitbitConfig {
  enabled: boolean
  permissions: {
    steps: boolean
    heartRate: boolean
    sleep: boolean
    activity: boolean
    weight: boolean
    bloodOxygen: boolean
  }
  syncFrequency: 'hourly' | 'daily' | 'weekly'
  lastSync?: string
  accessToken?: string
  refreshToken?: string
}

class FitbitIntegration {
  private config: FitbitConfig
  private readonly CLIENT_ID = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID
  private readonly CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET
  private readonly API_BASE = 'https://api.fitbit.com/1'

  constructor() {
    this.config = {
      enabled: false,
      permissions: {
        steps: false,
        heartRate: false,
        sleep: false,
        activity: false,
        weight: false,
        bloodOxygen: false
      },
      syncFrequency: 'daily'
    }
  }

  /**
   * Initialize Fitbit integration
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if we have stored tokens
      const storedTokens = this.getStoredTokens()
      if (storedTokens) {
        this.config.accessToken = storedTokens.accessToken
        this.config.refreshToken = storedTokens.refreshToken
        this.config.enabled = true
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to initialize Fitbit:', error)
      return false
    }
  }

  /**
   * Get stored tokens from localStorage
   */
  private getStoredTokens(): { accessToken: string; refreshToken: string } | null {
    if (typeof window === 'undefined') return null
    
    try {
      const tokens = localStorage.getItem('fitbit_tokens')
      return tokens ? JSON.parse(tokens) : null
    } catch (error) {
      console.error('Failed to get stored Fitbit tokens:', error)
      return null
    }
  }

  /**
   * Store tokens in localStorage
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('fitbit_tokens', JSON.stringify({ accessToken, refreshToken }))
    } catch (error) {
      console.error('Failed to store Fitbit tokens:', error)
    }
  }

  /**
   * Request Fitbit permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const authUrl = this.buildAuthUrl()
      
      // Open authorization window
      const authWindow = window.open(
        authUrl,
        'fitbit_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed)
            resolve(false)
          }
        }, 1000)

        // Listen for authorization callback
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'FITBIT_AUTH_SUCCESS') {
            this.config.accessToken = event.data.accessToken
            this.config.refreshToken = event.data.refreshToken
            this.config.enabled = true
            this.config.permissions = {
              steps: true,
              heartRate: true,
              sleep: true,
              activity: true,
              weight: true,
              bloodOxygen: true
            }
            
            this.storeTokens(event.data.accessToken, event.data.refreshToken)
            clearInterval(checkClosed)
            authWindow?.close()
            window.removeEventListener('message', messageHandler)
            resolve(true)
          }
        }

        window.addEventListener('message', messageHandler)
      })
    } catch (error) {
      console.error('Failed to request Fitbit permissions:', error)
      return false
    }
  }

  /**
   * Build authorization URL
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID || '',
      redirect_uri: `${window.location.origin}/api/fitbit/callback`,
      scope: 'activity heartrate sleep profile weight',
      expires_in: '604800'
    })

    return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`
  }

  /**
   * Sync data from Fitbit
   */
  async syncData(): Promise<FitbitData | null> {
    if (!this.config.enabled || !this.config.accessToken) {
      throw new Error('Fitbit integration not enabled or not authenticated')
    }

    try {
      // Check if token needs refresh
      await this.refreshTokenIfNeeded()

      // In a real implementation, this would fetch actual data from Fitbit API
      // For now, we'll simulate the data
      const mockData: FitbitData = {
        steps: Math.floor(Math.random() * 6000) + 8000,
        heartRate: Math.floor(Math.random() * 30) + 70,
        heartRateVariability: Math.floor(Math.random() * 25) + 25,
        sleepHours: Math.floor(Math.random() * 2) + 7,
        activeMinutes: Math.floor(Math.random() * 90) + 45,
        caloriesBurned: Math.floor(Math.random() * 400) + 500,
        distance: Math.floor(Math.random() * 6) + 4,
        floors: Math.floor(Math.random() * 15) + 8,
        restingHeartRate: Math.floor(Math.random() * 10) + 60,
        bloodOxygen: Math.floor(Math.random() * 4) + 95,
        weight: 75 + (Math.random() - 0.5) * 6,
        height: 180 + (Math.random() - 0.5) * 6,
        bmi: 23 + (Math.random() - 0.5) * 2,
        date: new Date().toISOString()
      }

      this.config.lastSync = new Date().toISOString()
      return mockData
    } catch (error) {
      console.error('Failed to sync Fitbit data:', error)
      return null
    }
  }

  /**
   * Refresh access token if needed
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.config.refreshToken) return

    try {
      const response = await fetch('/api/fitbit/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.config.refreshToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        this.config.accessToken = data.accessToken
        this.storeTokens(data.accessToken, this.config.refreshToken)
      }
    } catch (error) {
      console.error('Failed to refresh Fitbit token:', error)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): FitbitConfig {
    return this.config
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FitbitConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Check if integration is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!this.CLIENT_ID
  }

  /**
   * Sign out from Fitbit
   */
  async signOut(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fitbit_tokens')
      }
      
      this.config.enabled = false
      this.config.accessToken = undefined
      this.config.refreshToken = undefined
    } catch (error) {
      console.error('Failed to sign out from Fitbit:', error)
    }
  }
}

export const fitbitIntegration = new FitbitIntegration()












