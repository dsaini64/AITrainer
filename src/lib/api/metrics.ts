import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

type Metric = Database['public']['Tables']['metrics']['Row']
type MetricInsert = Database['public']['Tables']['metrics']['Insert']
type MetricType = Database['public']['Enums']['metric_type']

export interface MetricWithTrend extends Metric {
  trend?: 'up' | 'down' | 'stable'
  changePercent?: number
}

// Get metrics for the current user
export const getMetrics = async (
  type?: MetricType,
  startDate?: Date,
  endDate?: Date,
  limit = 100
): Promise<Metric[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  let query = supabase
    .from('metrics')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (type) {
    query = query.eq('type', type)
  }

  if (startDate) {
    query = query.gte('timestamp', startDate.toISOString())
  }

  if (endDate) {
    query = query.lte('timestamp', endDate.toISOString())
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get latest metric value for each type
export const getLatestMetrics = async (): Promise<Metric[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  // Get the latest metric for each type
  const { data, error } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false })

  if (error) throw error

  // Group by type and get the latest for each
  const latestByType = new Map<string, Metric>()
  
  data?.forEach(metric => {
    if (!latestByType.has(metric.type) || 
        new Date(metric.timestamp) > new Date(latestByType.get(metric.type)!.timestamp)) {
      latestByType.set(metric.type, metric)
    }
  })

  return Array.from(latestByType.values())
}

// Add a new metric
export const addMetric = async (metricData: Omit<MetricInsert, 'user_id'>): Promise<Metric> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('metrics')
    .insert({
      ...metricData,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Add multiple metrics (bulk insert)
export const addMetrics = async (metricsData: Omit<MetricInsert, 'user_id'>[]): Promise<Metric[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('metrics')
    .insert(
      metricsData.map(metric => ({
        ...metric,
        user_id: user.id
      }))
    )
    .select()

  if (error) throw error
  return data || []
}

// Get metric trends (compare current period with previous)
export const getMetricTrends = async (
  type: MetricType,
  daysBack = 7
): Promise<MetricWithTrend[]> => {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))
  const previousStartDate = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))

  // Get current period metrics
  const currentMetrics = await getMetrics(type, startDate, endDate)
  
  // Get previous period metrics
  const previousMetrics = await getMetrics(type, previousStartDate, startDate)

  // Calculate trends
  const currentAvg = currentMetrics.length > 0 
    ? currentMetrics.reduce((sum, m) => sum + Number(m.value), 0) / currentMetrics.length
    : 0

  const previousAvg = previousMetrics.length > 0
    ? previousMetrics.reduce((sum, m) => sum + Number(m.value), 0) / previousMetrics.length
    : 0

  let trend: 'up' | 'down' | 'stable' = 'stable'
  let changePercent = 0

  if (previousAvg > 0) {
    changePercent = ((currentAvg - previousAvg) / previousAvg) * 100
    
    if (Math.abs(changePercent) > 5) { // 5% threshold for significant change
      trend = changePercent > 0 ? 'up' : 'down'
    }
  }

  return currentMetrics.map(metric => ({
    ...metric,
    trend,
    changePercent
  }))
}

// Get metric statistics for a time period
export const getMetricStats = async (
  type: MetricType,
  daysBack = 30
): Promise<{
  average: number
  min: number
  max: number
  count: number
  trend: 'up' | 'down' | 'stable'
  changePercent: number
}> => {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))
  
  const metrics = await getMetrics(type, startDate, endDate)
  
  if (metrics.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      count: 0,
      trend: 'stable',
      changePercent: 0
    }
  }

  const values = metrics.map(m => Number(m.value))
  const average = values.reduce((sum, val) => sum + val, 0) / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)

  // Calculate trend (first half vs second half of period)
  const midPoint = Math.floor(metrics.length / 2)
  const firstHalf = metrics.slice(midPoint)
  const secondHalf = metrics.slice(0, midPoint)

  const firstHalfAvg = firstHalf.length > 0 
    ? firstHalf.reduce((sum, m) => sum + Number(m.value), 0) / firstHalf.length
    : 0

  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, m) => sum + Number(m.value), 0) / secondHalf.length
    : 0

  let trend: 'up' | 'down' | 'stable' = 'stable'
  let changePercent = 0

  if (firstHalfAvg > 0) {
    changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
    
    if (Math.abs(changePercent) > 5) {
      trend = changePercent > 0 ? 'up' : 'down'
    }
  }

  return {
    average,
    min,
    max,
    count: metrics.length,
    trend,
    changePercent
  }
}

// Delete a metric
export const deleteMetric = async (metricId: string): Promise<void> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { error } = await supabase
    .from('metrics')
    .delete()
    .eq('id', metricId)
    .eq('user_id', user.id)

  if (error) throw error
}