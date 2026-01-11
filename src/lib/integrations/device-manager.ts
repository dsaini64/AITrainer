/**
 * Device Integration Manager
 * Manages all device integrations and data synchronization
 */

import { appleHealthIntegration, HealthKitData } from './apple-health'
import { googleFitIntegration, GoogleFitData } from './google-fit'
import { fitbitIntegration, FitbitData } from './fitbit'

export interface UnifiedHealthData {
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
  bloodPressure?: {
    systolic: number
    diastolic: number
  }
  bodyTemperature?: number
  date: string
  source: 'apple-health' | 'google-fit' | 'fitbit' | 'manual'
}

export interface DeviceIntegration {
  id: string
  name: string
  type: 'apple-health' | 'google-fit' | 'fitbit'
  enabled: boolean
  lastSync?: string
  permissions: Record<string, boolean>
  isAvailable: boolean
}

class DeviceManager {
  private integrations = {
    'apple-health': appleHealthIntegration,
    'google-fit': googleFitIntegration,
    'fitbit': fitbitIntegration
  }

  /**
   * Get all available device integrations
   */
  async getAvailableIntegrations(): Promise<DeviceIntegration[]> {
    const integrations: DeviceIntegration[] = []

    // Apple Health
    integrations.push({
      id: 'apple-health',
      name: 'Apple Health',
      type: 'apple-health',
      enabled: appleHealthIntegration.getConfig().enabled,
      lastSync: appleHealthIntegration.getConfig().lastSync,
      permissions: appleHealthIntegration.getConfig().permissions,
      isAvailable: appleHealthIntegration.isAvailable()
    })

    // Google Fit
    integrations.push({
      id: 'google-fit',
      name: 'Google Fit',
      type: 'google-fit',
      enabled: googleFitIntegration.getConfig().enabled,
      lastSync: googleFitIntegration.getConfig().lastSync,
      permissions: googleFitIntegration.getConfig().permissions,
      isAvailable: googleFitIntegration.isAvailable()
    })

    // Fitbit
    integrations.push({
      id: 'fitbit',
      name: 'Fitbit',
      type: 'fitbit',
      enabled: fitbitIntegration.getConfig().enabled,
      lastSync: fitbitIntegration.getConfig().lastSync,
      permissions: fitbitIntegration.getConfig().permissions,
      isAvailable: fitbitIntegration.isAvailable()
    })

    return integrations
  }

  /**
   * Initialize a specific integration
   */
  async initializeIntegration(integrationId: string): Promise<boolean> {
    switch (integrationId) {
      case 'apple-health':
        return appleHealthIntegration.isAvailable()
      case 'google-fit':
        return await googleFitIntegration.initialize()
      case 'fitbit':
        return await fitbitIntegration.initialize()
      default:
        throw new Error(`Unknown integration: ${integrationId}`)
    }
  }

  /**
   * Request permissions for a specific integration
   */
  async requestPermissions(integrationId: string): Promise<boolean> {
    switch (integrationId) {
      case 'apple-health':
        return await appleHealthIntegration.requestPermissions()
      case 'google-fit':
        return await googleFitIntegration.requestPermissions()
      case 'fitbit':
        return await fitbitIntegration.requestPermissions()
      default:
        throw new Error(`Unknown integration: ${integrationId}`)
    }
  }

  /**
   * Sync data from a specific integration
   */
  async syncData(integrationId: string): Promise<UnifiedHealthData | null> {
    let rawData: HealthKitData | GoogleFitData | FitbitData | null = null

    switch (integrationId) {
      case 'apple-health':
        rawData = await appleHealthIntegration.syncData()
        break
      case 'google-fit':
        rawData = await googleFitIntegration.syncData()
        break
      case 'fitbit':
        rawData = await fitbitIntegration.syncData()
        break
      default:
        throw new Error(`Unknown integration: ${integrationId}`)
    }

    if (!rawData) return null

    return this.unifyHealthData(rawData, integrationId as any)
  }

  /**
   * Sync data from all enabled integrations
   */
  async syncAllData(): Promise<UnifiedHealthData[]> {
    const results: UnifiedHealthData[] = []
    const integrations = await this.getAvailableIntegrations()

    for (const integration of integrations) {
      if (integration.enabled) {
        try {
          const data = await this.syncData(integration.id)
          if (data) {
            results.push(data)
          }
        } catch (error) {
          console.error(`Failed to sync ${integration.name}:`, error)
        }
      }
    }

    return results
  }

  /**
   * Disable an integration
   */
  async disableIntegration(integrationId: string): Promise<void> {
    switch (integrationId) {
      case 'apple-health':
        appleHealthIntegration.updateConfig({ enabled: false })
        break
      case 'google-fit':
        await googleFitIntegration.signOut()
        break
      case 'fitbit':
        await fitbitIntegration.signOut()
        break
      default:
        throw new Error(`Unknown integration: ${integrationId}`)
    }
  }

  /**
   * Convert raw data to unified format
   */
  private unifyHealthData(
    rawData: HealthKitData | GoogleFitData | FitbitData,
    source: 'apple-health' | 'google-fit' | 'fitbit'
  ): UnifiedHealthData {
    const baseData = {
      steps: rawData.steps,
      heartRate: rawData.heartRate,
      heartRateVariability: rawData.heartRateVariability,
      sleepHours: rawData.sleepHours,
      activeMinutes: 'activeMinutes' in rawData ? rawData.activeMinutes : 0,
      caloriesBurned: 'caloriesBurned' in rawData ? rawData.caloriesBurned : 'activeEnergyBurned' in rawData ? rawData.activeEnergyBurned : 0,
      distance: 'distance' in rawData ? rawData.distance : 0,
      floors: 'floors' in rawData ? rawData.floors : 0,
      restingHeartRate: rawData.restingHeartRate,
      bloodOxygen: rawData.bloodOxygen,
      weight: rawData.weight,
      height: rawData.height,
      bmi: rawData.bmi,
      date: rawData.date,
      source
    }

    // Add Apple Health specific fields
    if ('bloodPressure' in rawData && rawData.bloodPressure) {
      return {
        ...baseData,
        bloodPressure: rawData.bloodPressure
      }
    }

    if ('bodyTemperature' in rawData && rawData.bodyTemperature) {
      return {
        ...baseData,
        bodyTemperature: rawData.bodyTemperature
      }
    }

    return baseData
  }

  /**
   * Get integration status
   */
  async getIntegrationStatus(integrationId: string): Promise<{
    enabled: boolean
    lastSync?: string
    permissions: Record<string, boolean>
    isAvailable: boolean
  }> {
    const integration = this.integrations[integrationId as keyof typeof this.integrations]
    if (!integration) {
      throw new Error(`Unknown integration: ${integrationId}`)
    }

    const config = integration.getConfig()
    return {
      enabled: config.enabled,
      lastSync: config.lastSync,
      permissions: config.permissions,
      isAvailable: integration.isAvailable()
    }
  }
}

export const deviceManager = new DeviceManager()












