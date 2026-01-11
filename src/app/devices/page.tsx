"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DeviceCard } from "@/components/devices/DeviceCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Device } from "@/types"
import { Plus, Shield, Download, Upload, AlertCircle, RefreshCw, CheckCircle, XCircle } from "lucide-react"

// Integration types
interface DeviceIntegration {
  id: string
  name: string
  type: 'apple-health' | 'google-fit' | 'fitbit'
  enabled: boolean
  lastSync?: string
  permissions: Record<string, boolean>
  isAvailable: boolean
}

// Mock data for traditional devices
const mockDevices: Device[] = [
  {
    id: 'oura-ring',
    name: 'Oura Ring Gen 3',
    type: 'wearable',
    status: 'connected',
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    dataQuality: 'high'
  },
  {
    id: 'withings-scale',
    name: 'Withings Scale',
    type: 'scale',
    status: 'attention',
    lastSync: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    dataQuality: 'medium'
  },
  {
    id: 'garmin',
    name: 'Garmin Forerunner',
    type: 'wearable',
    status: 'disconnected',
    lastSync: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    dataQuality: 'low'
  }
]

const availableDevices = [
  { name: 'Whoop 4.0', type: 'wearable', description: 'Advanced recovery and strain metrics' },
  { name: 'MyFitnessPal', type: 'app', description: 'Nutrition and calorie tracking' },
  { name: 'Cronometer', type: 'app', description: 'Detailed micronutrient tracking' },
]

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [integrations, setIntegrations] = useState<DeviceIntegration[]>([])
  const [showAvailable, setShowAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  // Load devices and integrations on component mount
  useEffect(() => {
    loadDevices()
    loadIntegrations()
  }, [])
  
  const loadDevices = async () => {
    try {
      // In a real app, fetch devices from API
      // For now, devices would come from integrations
      setDevices([])
    } catch (error) {
      console.error('Error loading devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations')
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.integrations || [])
      } else {
        // If API fails, show empty state
        setIntegrations([])
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
      // Fallback to mock data
      setIntegrations([
        {
          id: 'apple-health',
          name: 'Apple Health',
          type: 'apple-health',
          enabled: true,
          lastSync: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          permissions: { steps: true, heartRate: true, sleep: true },
          isAvailable: true
        },
        {
          id: 'google-fit',
          name: 'Google Fit',
          type: 'google-fit',
          enabled: false,
          permissions: { steps: true, heartRate: true, sleep: false },
          isAvailable: true
        },
        {
          id: 'fitbit',
          name: 'Fitbit',
          type: 'fitbit',
          enabled: false,
          permissions: { steps: true, heartRate: true, sleep: true },
          isAvailable: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleIntegrationConnect = async (integration: DeviceIntegration) => {
    try {
      setLoading(true)
      
      // Initialize integration
      const initResponse = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize', integrationId: integration.id })
      })
      
      if (!initResponse.ok) throw new Error('Failed to initialize')
      
      // Request permissions
      const permResponse = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'requestPermissions', integrationId: integration.id })
      })
      
      if (!permResponse.ok) throw new Error('Failed to get permissions')
      
      // Reload integrations
      await loadIntegrations()
    } catch (error) {
      console.error('Failed to connect integration:', error)
    }
  }

  const handleIntegrationSync = async (integration: DeviceIntegration) => {
    try {
      setSyncing(integration.id)
      
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', integrationId: integration.id })
      })
      
      if (!response.ok) throw new Error('Failed to sync')
      
      // Reload integrations
      await loadIntegrations()
    } catch (error) {
      console.error('Failed to sync integration:', error)
    } finally {
      setSyncing(null)
    }
  }

  const handleIntegrationDisconnect = async (integration: DeviceIntegration) => {
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', integrationId: integration.id })
      })
      
      if (!response.ok) throw new Error('Failed to disconnect')
      
      // Reload integrations
      await loadIntegrations()
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
    }
  }

  const handleConnect = (device: Device) => {
    console.log('Connect device:', device.name)
    // In real app, initiate OAuth flow or device pairing
    setDevices(prev => 
      prev.map(d => 
        d.id === device.id 
          ? { ...d, status: 'connected', lastSync: new Date() }
          : d
      )
    )
  }

  const handleDisconnect = (device: Device) => {
    console.log('Disconnect device:', device.name)
    setDevices(prev => 
      prev.map(d => 
        d.id === device.id 
          ? { ...d, status: 'disconnected' }
          : d
      )
    )
  }

  const handleSync = (device: Device) => {
    console.log('Sync device:', device.name)
    setDevices(prev => 
      prev.map(d => 
        d.id === device.id 
          ? { ...d, status: 'syncing' }
          : d
      )
    )
    
    // Simulate sync completion
    setTimeout(() => {
      setDevices(prev => 
        prev.map(d => 
          d.id === device.id 
            ? { ...d, status: 'connected', lastSync: new Date(), dataQuality: 'high' }
            : d
        )
      )
    }, 3000)
  }

  const handleSettings = (device: Device) => {
    console.log('Device settings:', device.name)
    // In real app, open device settings modal
  }

  const handleAddDevice = (deviceName: string) => {
    console.log('Add device:', deviceName)
    // In real app, start device connection flow
  }

  const connectedDevices = devices.filter(d => d.status !== 'disconnected')
  const disconnectedDevices = devices.filter(d => d.status === 'disconnected')
  const devicesNeedingAttention = devices.filter(d => d.status === 'attention')
  
  const enabledIntegrations = integrations?.filter(i => i.enabled) || []
  const availableIntegrations = integrations?.filter(i => !i.enabled && i.isAvailable) || []

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Devices & Data
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {connectedDevices.length + enabledIntegrations.length} connected • {devicesNeedingAttention.length} need attention
            </p>
          </div>
          <Button 
            onClick={() => setShowAvailable(!showAvailable)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Attention Banner */}
        {devicesNeedingAttention.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">
                    {devicesNeedingAttention.length} device{devicesNeedingAttention.length > 1 ? 's' : ''} need attention
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Some devices haven't synced recently. Check connections to ensure accurate tracking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Quality Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <span>Data Quality Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {devices.filter(d => d.dataQuality === 'high').length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  High Quality
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {devices.filter(d => d.dataQuality === 'medium').length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Medium Quality
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {devices.filter(d => d.dataQuality === 'low').length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Low Quality
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Integrations */}
        {enabledIntegrations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Health Integrations
            </h2>
            <div className="grid gap-4">
              {enabledIntegrations.map((integration) => (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {integration.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            {integration.name}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {integration.lastSync 
                              ? `Last sync: ${new Date(integration.lastSync).toLocaleString()}`
                              : 'Never synced'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleIntegrationSync(integration)}
                          disabled={syncing === integration.id}
                          size="sm"
                          variant="outline"
                        >
                          {syncing === integration.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleIntegrationDisconnect(integration)}
                          size="sm"
                          variant="outline"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Integrations */}
        {availableIntegrations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Available Health Integrations
            </h2>
            <div className="grid gap-4">
              {availableIntegrations.map((integration) => (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {integration.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            {integration.name}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Connect to sync your health data
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleIntegrationConnect(integration)}
                        disabled={loading}
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Connected Devices */}
        {connectedDevices.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Connected Devices
            </h2>
            <div className="grid gap-4">
              {connectedDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onSync={handleSync}
                  onSettings={handleSettings}
                />
              ))}
            </div>
          </div>
        )}

        {/* Disconnected Devices */}
        {disconnectedDevices.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Disconnected Devices
            </h2>
            <div className="grid gap-4">
              {disconnectedDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onSync={handleSync}
                  onSettings={handleSettings}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Devices */}
        {showAvailable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Available Devices
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAvailable(false)}
              >
                Hide
              </Button>
            </div>
            <div className="grid gap-4">
              {availableDevices.map((device, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                          {device.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {device.description}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleAddDevice(device.name)}
                        size="sm"
                      >
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Data Export/Import */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export your data in JSON or CSV format. Import lab results or data from other platforms.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}