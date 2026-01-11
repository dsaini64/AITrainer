"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Device } from "@/types"
import { cn } from "@/lib/utils"
import { 
  Smartphone, 
  Watch, 
  Scale, 
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings
} from "lucide-react"

interface DeviceCardProps {
  device: Device
  onConnect: (device: Device) => void
  onDisconnect: (device: Device) => void
  onSync: (device: Device) => void
  onSettings: (device: Device) => void
}

export function DeviceCard({ 
  device, 
  onConnect, 
  onDisconnect, 
  onSync, 
  onSettings 
}: DeviceCardProps) {
  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'wearable':
        return <Watch className="h-6 w-6" />
      case 'scale':
        return <Scale className="h-6 w-6" />
      case 'app':
        return <Smartphone className="h-6 w-6" />
      default:
        return <Activity className="h-6 w-6" />
    }
  }

  const getStatusColor = (status: Device['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20'
      case 'syncing':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20'
      case 'attention':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20'
      case 'disconnected':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20'
    }
  }

  const getStatusIcon = (status: Device['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4" />
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'attention':
        return <AlertTriangle className="h-4 w-4" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4" />
    }
  }

  const getQualityColor = (quality: Device['dataQuality']) => {
    switch (quality) {
      case 'high':
        return 'text-green-600'
      case 'medium':
        return 'text-amber-600'
      case 'low':
        return 'text-red-600'
    }
  }

  const getLastSyncText = () => {
    const now = new Date()
    const lastSync = new Date(device.lastSync)
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {getDeviceIcon(device.type)}
            </div>
            <div>
              <CardTitle className="text-lg">{device.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={cn("text-xs", getStatusColor(device.status))}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(device.status)}
                    <span className="capitalize">{device.status}</span>
                  </div>
                </Badge>
                <Badge variant="outline" className={cn("text-xs", getQualityColor(device.dataQuality))}>
                  {device.dataQuality} quality
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSettings(device)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Last sync:</span>
          <span className="font-medium">{getLastSyncText()}</span>
        </div>

        {device.status === 'attention' && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">Sync Issue</p>
                <p className="text-xs mt-1">
                  Data hasn't synced in over 24 hours. Check your device connection.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {device.status === 'disconnected' ? (
            <Button
              onClick={() => onConnect(device)}
              className="flex-1"
              size="sm"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Connect
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onSync(device)}
                size="sm"
                disabled={device.status === 'syncing'}
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  device.status === 'syncing' && "animate-spin"
                )} />
                Sync
              </Button>
              <Button
                variant="outline"
                onClick={() => onDisconnect(device)}
                size="sm"
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}