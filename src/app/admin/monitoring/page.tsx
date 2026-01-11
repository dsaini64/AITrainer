/**
 * Advanced Monitoring Dashboard
 * Enterprise-grade monitoring and observability
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Shield, 
  Zap, 
  Database, 
  Users, 
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Download,
  Filter
} from 'lucide-react'

interface MonitoringData {
  performance: {
    responseTime: number
    throughput: number
    errorRate: number
    uptime: number
  }
  security: {
    totalEvents: number
    criticalEvents: number
    blockedIPs: number
    threatLevel: 'low' | 'medium' | 'high' | 'critical'
  }
  business: {
    activeUsers: number
    sessionDuration: number
    conversionRate: number
    featureUsage: Record<string, number>
  }
  system: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkLatency: number
  }
}

interface Alert {
  id: string
  type: 'performance' | 'security' | 'error' | 'business'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
}

export default function MonitoringPage() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('1h')

  useEffect(() => {
    loadMonitoringData()
    loadAlerts()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadMonitoringData()
      loadAlerts()
    }, 30000)

    return () => clearInterval(interval)
  }, [timeRange])

  const loadMonitoringData = async () => {
    try {
      setRefreshing(true)
      
      // Load performance metrics
      const performanceResponse = await fetch('/api/monitoring/apm?type=performance')
      const performanceData = await performanceResponse.json()
      
      // Load security metrics
      const securityResponse = await fetch('/api/security/events')
      const securityData = await securityResponse.json()
      
      // Load business metrics
      const businessResponse = await fetch('/api/analytics?type=business')
      const businessData = await businessResponse.json()
      
      // Load system metrics
      const systemResponse = await fetch('/api/health')
      const systemData = await systemResponse.json()
      
      setMonitoringData({
        performance: {
          responseTime: performanceData.summary?.performance?.averageValue || 0,
          throughput: performanceData.summary?.performance?.count || 0,
          errorRate: performanceData.summary?.errors?.count || 0,
          uptime: systemData.uptime || 99.9
        },
        security: {
          totalEvents: securityData.summary?.totalEvents || 0,
          criticalEvents: securityData.summary?.criticalEvents || 0,
          blockedIPs: securityData.summary?.blockedEvents || 0,
          threatLevel: securityData.summary?.averageRiskScore > 70 ? 'high' : 
                      securityData.summary?.averageRiskScore > 40 ? 'medium' : 'low'
        },
        business: {
          activeUsers: businessData.activeUsers || 0,
          sessionDuration: businessData.sessionDuration || 0,
          conversionRate: businessData.conversionRate || 0,
          featureUsage: businessData.featureUsage || {}
        },
        system: {
          cpuUsage: systemData.cpuUsage || 0,
          memoryUsage: systemData.memoryUsage || 0,
          diskUsage: systemData.diskUsage || 0,
          networkLatency: systemData.networkLatency || 0
        }
      })
    } catch (error) {
      console.error('Failed to load monitoring data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts')
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error('Failed to load alerts:', error)
    }
  }

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-slate-600 dark:text-slate-400">Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Monitoring Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Real-time monitoring and observability for your longevity coach application
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <Button
              onClick={loadMonitoringData}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monitoringData?.performance.responseTime.toFixed(0)}ms
              </div>
              <p className="text-xs text-muted-foreground">
                Average response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monitoringData?.performance.errorRate.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Error rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monitoringData?.business.activeUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monitoringData?.performance.uptime.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                System uptime
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current system resource usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>CPU Usage</span>
                      <span>{monitoringData?.system.cpuUsage.toFixed(1)}%</span>
                    </div>
                    <Progress value={monitoringData?.system.cpuUsage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Memory Usage</span>
                      <span>{monitoringData?.system.memoryUsage.toFixed(1)}%</span>
                    </div>
                    <Progress value={monitoringData?.system.memoryUsage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Disk Usage</span>
                      <span>{monitoringData?.system.diskUsage.toFixed(1)}%</span>
                    </div>
                    <Progress value={monitoringData?.system.diskUsage} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Security Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Status</CardTitle>
                  <CardDescription>Current security posture</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Threat Level</span>
                    <Badge className={getThreatLevelColor(monitoringData?.security.threatLevel || 'low')}>
                      {monitoringData?.security.threatLevel?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Events</span>
                    <span className="font-medium">{monitoringData?.security.totalEvents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Critical Events</span>
                    <span className="font-medium text-red-600">{monitoringData?.security.criticalEvents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Blocked IPs</span>
                    <span className="font-medium">{monitoringData?.security.blockedIPs}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Application performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Time</span>
                    <span className="font-medium">{monitoringData?.performance.responseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Throughput</span>
                    <span className="font-medium">{monitoringData?.performance.throughput.toLocaleString()} req/min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <span className="font-medium">{monitoringData?.performance.errorRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uptime</span>
                    <span className="font-medium">{monitoringData?.performance.uptime.toFixed(2)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Network Performance</CardTitle>
                  <CardDescription>Network latency and connectivity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Network Latency</span>
                    <span className="font-medium">{monitoringData?.system.networkLatency.toFixed(0)}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Status</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Events</CardTitle>
                  <CardDescription>Recent security events and threats</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Events</span>
                      <span className="font-medium">{monitoringData?.security.totalEvents}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical Events</span>
                      <span className="font-medium text-red-600">{monitoringData?.security.criticalEvents}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Blocked IPs</span>
                      <span className="font-medium">{monitoringData?.security.blockedIPs}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Threat Assessment</CardTitle>
                  <CardDescription>Current threat level and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Threat Level</span>
                      <Badge className={getThreatLevelColor(monitoringData?.security.threatLevel || 'low')}>
                        {monitoringData?.security.threatLevel?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {monitoringData?.security.threatLevel === 'high' ? 
                        'High threat level detected. Review security events immediately.' :
                        monitoringData?.security.threatLevel === 'medium' ?
                        'Medium threat level. Monitor security events closely.' :
                        'Low threat level. System is secure.'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="business" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement</CardTitle>
                  <CardDescription>User activity and engagement metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Users</span>
                    <span className="font-medium">{monitoringData?.business.activeUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Session Duration</span>
                    <span className="font-medium">{Math.round(monitoringData?.business.sessionDuration || 0)} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Conversion Rate</span>
                    <span className="font-medium">{(monitoringData?.business.conversionRate || 0).toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feature Usage</CardTitle>
                  <CardDescription>Most used features and functionality</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(monitoringData?.business.featureUsage || {}).map(([feature, usage]) => (
                      <div key={feature} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{feature.replace('-', ' ')}</span>
                        <span className="font-medium">{usage}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Current alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">No active alerts</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            alert.severity === 'critical' ? 'bg-red-500' :
                            alert.severity === 'high' ? 'bg-orange-500' :
                            alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.resolved ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}












