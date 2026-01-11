/**
 * Google Fit Integration
 * Handles Google Fit API integration for health data
 */

export interface GoogleFitData {
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
  timestamp: string
  source: 'google_fit'
}

export interface GoogleFitConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export class GoogleFitIntegration {
  private config: GoogleFitConfig
  private accessToken: string | null = null
  private refreshToken: string | null = null

  constructor(config: GoogleFitConfig) {
    this.config = config
  }

  /**
   * Initialize Google Fit connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if we have stored tokens
      const storedTokens = this.getStoredTokens()
      if (storedTokens) {
        this.accessToken = storedTokens.accessToken
        this.refreshToken = storedTokens.refreshToken
        
        // Verify token is still valid
        if (await this.verifyToken()) {
          return true
        }
      }

      // Need to authenticate
      return false
    } catch (error) {
      console.error('Google Fit initialization failed:', error)
      return false
    }
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<boolean> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri
        })
      })

      if (!response.ok) {
        throw new Error('Token exchange failed')
      }

      const tokens = await response.json()
      this.accessToken = tokens.access_token
      this.refreshToken = tokens.refresh_token

      // Store tokens securely
      this.storeTokens(tokens.access_token, tokens.refresh_token)
      
      return true
    } catch (error) {
      console.error('Token exchange failed:', error)
      return false
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const tokens = await response.json()
      this.accessToken = tokens.access_token
      
      // Update stored access token
      this.storeTokens(tokens.access_token, this.refreshToken)
      
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  /**
   * Get health data from Google Fit
   */
  async getHealthData(startDate: Date, endDate: Date): Promise<GoogleFitData | null> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    try {
      // Get steps data
      const steps = await this.getStepsData(startDate, endDate)
      
      // Get heart rate data
      const heartRate = await this.getHeartRateData(startDate, endDate)
      
      // Get sleep data
      const sleepHours = await this.getSleepData(startDate, endDate)
      
      // Get activity data
      const activeMinutes = await this.getActiveMinutesData(startDate, endDate)
      
      // Get calories data
      const caloriesBurned = await this.getCaloriesData(startDate, endDate)

      return {
        steps,
        heartRate,
        heartRateVariability: 0, // Google Fit doesn't provide HRV directly
        sleepHours,
        activeMinutes,
        caloriesBurned,
        distance: steps * 0.0008, // Approximate distance from steps
        floors: 0, // Google Fit doesn't track floors
        restingHeartRate: heartRate * 0.8, // Approximate resting HR
        bloodOxygen: 0, // Google Fit doesn't provide blood oxygen
        timestamp: new Date().toISOString(),
        source: 'google_fit'
      }
    } catch (error) {
      console.error('Failed to get Google Fit data:', error)
      return null
    }
  }

  /**
   * Get steps data from Google Fit
   */
  private async getStepsData(startDate: Date, endDate: Date): Promise<number> {
    const response = await this.makeGoogleFitRequest(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
        }],
        bucketByTime: { durationMillis: 86400000 }, // 1 day
        startTimeMillis: startDate.getTime(),
        endTimeMillis: endDate.getTime()
      }
    )

    return response.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0
  }

  /**
   * Get heart rate data from Google Fit
   */
  private async getHeartRateData(startDate: Date, endDate: Date): Promise<number> {
    const response = await this.makeGoogleFitRequest(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{
          dataTypeName: 'com.google.heart_rate.bpm',
          dataSourceId: 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startDate.getTime(),
        endTimeMillis: endDate.getTime()
      }
    )

    return response.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0
  }

  /**
   * Get sleep data from Google Fit
   */
  private async getSleepData(startDate: Date, endDate: Date): Promise<number> {
    const response = await this.makeGoogleFitRequest(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{
          dataTypeName: 'com.google.sleep.segment',
          dataSourceId: 'derived:com.google.sleep.segment:com.google.android.gms:merge_sleep_segments'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startDate.getTime(),
        endTimeMillis: endDate.getTime()
      }
    )

    // Calculate total sleep hours
    const segments = response.bucket?.[0]?.dataset?.[0]?.point || []
    let totalSleepMinutes = 0
    
    segments.forEach(segment => {
      if (segment.value?.[0]?.intVal === 2) { // Sleep segment
        const startTime = segment.startTimeNanos
        const endTime = segment.endTimeNanos
        totalSleepMinutes += (endTime - startTime) / (1000 * 1000 * 1000 * 60) // Convert to minutes
      }
    })

    return totalSleepMinutes / 60 // Convert to hours
  }

  /**
   * Get active minutes data from Google Fit
   */
  private async getActiveMinutesData(startDate: Date, endDate: Date): Promise<number> {
    const response = await this.makeGoogleFitRequest(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{
          dataTypeName: 'com.google.active_minutes',
          dataSourceId: 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startDate.getTime(),
        endTimeMillis: endDate.getTime()
      }
    )

    return response.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0
  }

  /**
   * Get calories data from Google Fit
   */
  private async getCaloriesData(startDate: Date, endDate: Date): Promise<number> {
    const response = await this.makeGoogleFitRequest(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{
          dataTypeName: 'com.google.calories.expended',
          dataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startDate.getTime(),
        endTimeMillis: endDate.getTime()
      }
    )

    return response.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0
  }

  /**
   * Make authenticated request to Google Fit API
   */
  private async makeGoogleFitRequest(url: string, body: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        if (await this.refreshAccessToken()) {
          // Retry with new token
          return this.makeGoogleFitRequest(url, body)
        }
      }
      throw new Error(`Google Fit API request failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Verify if current token is valid
   */
  private async verifyToken(): Promise<boolean> {
    if (!this.accessToken) {
      return false
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Store tokens securely
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    // In a real app, store these securely (encrypted, secure storage)
    localStorage.setItem('google_fit_access_token', accessToken)
    localStorage.setItem('google_fit_refresh_token', refreshToken)
  }

  /**
   * Get stored tokens
   */
  private getStoredTokens(): { accessToken: string; refreshToken: string } | null {
    const accessToken = localStorage.getItem('google_fit_access_token')
    const refreshToken = localStorage.getItem('google_fit_refresh_token')
    
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken }
    }
    
    return null
  }

  /**
   * Disconnect from Google Fit
   */
  disconnect(): void {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem('google_fit_access_token')
    localStorage.removeItem('google_fit_refresh_token')
  }
}

// Export the integration instance
export const googleFitIntegration = new GoogleFitIntegration({
  clientId: process.env.GOOGLE_FIT_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_FIT_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_FIT_REDIRECT_URI || '',
  scopes: [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read'
  ]
})