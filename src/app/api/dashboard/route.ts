/**
 * Dashboard API
 * 
 * Aggregates all dashboard data in one endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, name, email, created_at')
      .eq('id', userId)
      .single()

    // Get latest metrics for KPIs
    const { data: latestMetricsData } = await supabaseAdmin
      .from('metrics')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100)

    // Group by type and get latest for each
    const latestMetricsMap = new Map<string, any>()
    latestMetricsData?.forEach(metric => {
      if (!latestMetricsMap.has(metric.type) || 
          new Date(metric.timestamp) > new Date(latestMetricsMap.get(metric.type)!.timestamp)) {
        latestMetricsMap.set(metric.type, metric)
      }
    })
    const latestMetrics = Array.from(latestMetricsMap.values())

    // Get goals
    const { data: goalsData } = await supabaseAdmin
      .from('goals')
      .select(`
        *,
        habits(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const activeGoals = goalsData || []

    // Calculate KPI data
    const kpis = await Promise.all([
      // Sleep
      (async () => {
        const sleepStats = await getMetricStatsForUser('sleep_duration', 7, userId)
        const latestSleep = latestMetrics.find(m => m.type === 'sleep_duration')
        const totalMinutes = latestSleep ? Number(latestSleep.value) : 0
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        
        return {
          title: 'Sleep',
          value: latestSleep ? `${hours}h ${minutes}m` : '--',
          unit: undefined,
          delta: Math.round(sleepStats.changePercent),
          deltaType: sleepStats.trend === 'up' ? 'positive' : sleepStats.trend === 'down' ? 'negative' : 'neutral',
          sparklineData: await getSparklineData('sleep_duration', 7, userId)
        }
      })(),
      // HRV
      (async () => {
        const hrvStats = await getMetricStatsForUser('hrv', 7, userId)
        const latestHRV = latestMetrics.find(m => m.type === 'hrv')
        
        return {
          title: 'HRV',
          value: latestHRV ? Math.round(Number(latestHRV.value)).toString() : '--',
          unit: 'ms',
          delta: Math.round(hrvStats.changePercent),
          deltaType: hrvStats.trend === 'up' ? 'positive' : hrvStats.trend === 'down' ? 'negative' : 'neutral',
          sparklineData: await getSparklineData('hrv', 7, userId)
        }
      })(),
      // Steps
      (async () => {
        const stepsStats = await getMetricStatsForUser('steps', 7, userId)
        const latestSteps = latestMetrics.find(m => m.type === 'steps')
        
        return {
          title: 'Steps',
          value: latestSteps ? Number(latestSteps.value).toLocaleString() : '--',
          unit: undefined,
          delta: Math.round(stepsStats.changePercent),
          deltaType: stepsStats.trend === 'up' ? 'positive' : stepsStats.trend === 'down' ? 'negative' : 'neutral',
          sparklineData: await getSparklineData('steps', 7, userId)
        }
      })(),
      // Zone 2
      (async () => {
        const zone2Stats = await getMetricStatsForUser('zone2_minutes', 7, userId)
        const latestZone2 = latestMetrics.find(m => m.type === 'zone2_minutes')
        
        return {
          title: 'Zone 2',
          value: latestZone2 ? Math.round(Number(latestZone2.value)).toString() : '--',
          unit: 'min',
          delta: Math.round(zone2Stats.changePercent),
          deltaType: zone2Stats.trend === 'up' ? 'positive' : zone2Stats.trend === 'down' ? 'negative' : 'neutral',
          sparklineData: await getSparklineData('zone2_minutes', 7, userId)
        }
      })(),
      // Protein
      (async () => {
        const proteinStats = await getMetricStatsForUser('protein', 7, userId)
        const latestProtein = latestMetrics.find(m => m.type === 'protein')
        
        return {
          title: 'Protein',
          value: latestProtein ? Math.round(Number(latestProtein.value)).toString() : '--',
          unit: 'g',
          delta: Math.round(proteinStats.changePercent),
          deltaType: proteinStats.trend === 'up' ? 'positive' : proteinStats.trend === 'down' ? 'negative' : 'neutral',
          sparklineData: await getSparklineData('protein', 7, userId)
        }
      })(),
      // Mood
      (async () => {
        const checkInStats = await getCheckInStatsForUser(7, userId)
        const todayCheckIn = await getTodaysCheckInForUser(userId)
        
        return {
          title: 'Mood',
          value: todayCheckIn?.mood ? todayCheckIn.mood.toFixed(1) : checkInStats.averageMood > 0 ? checkInStats.averageMood.toFixed(1) : '--',
          unit: '/5',
          delta: Math.round(checkInStats.moodTrend === 'up' ? 5 : checkInStats.moodTrend === 'down' ? -5 : 0),
          deltaType: checkInStats.moodTrend === 'up' ? 'positive' : checkInStats.moodTrend === 'down' ? 'negative' : 'neutral',
          sparklineData: await getMoodSparklineData(7, userId)
        }
      })()
    ])

    // Calculate overall progress (average of all goals' habit adherence)
    const overallProgress = activeGoals.length > 0
      ? Math.round(activeGoals.reduce((sum, goal) => {
          const avgAdherence = goal.habits && goal.habits.length > 0
            ? goal.habits.reduce((s: number, h: any) => s + (h.adherence || 0), 0) / goal.habits.length
            : 0
          return sum + avgAdherence
        }, 0) / activeGoals.length)
      : 0

    // Get next best action (from active goals)
    const nextAction = activeGoals.length > 0 && activeGoals[0].habits && activeGoals[0].habits.length > 0
      ? {
          title: activeGoals[0].habits[0].title || 'Complete your daily goal',
          description: activeGoals[0].habits[0].description || `Work towards: ${activeGoals[0].title}`,
          timeRemaining: 'Today',
          priority: 'medium' as const
        }
      : null

    // Get recent wins (completed habits with streaks)
    const recentWins = activeGoals
      .flatMap((goal: any) => (goal.habits || []).filter((h: any) => h.streak && h.streak >= 3))
      .slice(0, 3)
      .map((habit: any) => `• ${habit.streak}-day streak: ${habit.title}`)

    // Weekly trends
    const weeklyTrends = {
      sleep: Math.round((await getMetricStatsForUser('sleep_duration', 7, userId)).changePercent),
      activity: Math.round((await getMetricStatsForUser('steps', 7, userId)).changePercent),
      recovery: Math.round((await getMetricStatsForUser('hrv', 7, userId)).changePercent)
    }

    return NextResponse.json({
      user: {
        name: userProfile?.name || 'User',
        startDate: userProfile?.created_at ? new Date(userProfile.created_at) : new Date()
      },
      overallProgress,
      kpis,
      nextAction,
      recentWins,
      weeklyTrends,
      coachInsight: null, // Will be generated by AI coach
      promptChips: [
        "Why did my HRV drop?",
        "Plan a recovery day",
        "Optimize my sleep",
        "Adjust today's workout"
      ]
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to get metric stats for a user
async function getMetricStatsForUser(
  metricType: string,
  daysBack: number,
  userId: string
): Promise<{
  average: number
  min: number
  max: number
  count: number
  trend: 'up' | 'down' | 'stable'
  changePercent: number
}> {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))
  
  const { data: metrics } = await supabaseAdmin
    .from('metrics')
    .select('value, timestamp')
    .eq('user_id', userId)
    .eq('type', metricType)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: true })

  if (!metrics || metrics.length === 0) {
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

  // Calculate trend (first half vs second half)
  const midPoint = Math.floor(metrics.length / 2)
  const firstHalf = metrics.slice(0, midPoint)
  const secondHalf = metrics.slice(midPoint)

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

// Helper function to get check-in stats for a user
async function getCheckInStatsForUser(daysBack: number, userId: string): Promise<{
  averageMood: number
  averageEnergy: number
  averageSoreness: number
  checkInStreak: number
  totalCheckIns: number
  moodTrend: 'up' | 'down' | 'stable'
  energyTrend: 'up' | 'down' | 'stable'
}> {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))
  
  const { data: checkIns } = await supabaseAdmin
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (!checkIns || checkIns.length === 0) {
    return {
      averageMood: 0,
      averageEnergy: 0,
      averageSoreness: 0,
      checkInStreak: 0,
      totalCheckIns: 0,
      moodTrend: 'stable',
      energyTrend: 'stable'
    }
  }

  const validMoods = checkIns.filter(c => c.mood !== null).map(c => c.mood!)
  const validEnergies = checkIns.filter(c => c.energy !== null).map(c => c.energy!)
  const validSoreness = checkIns.filter(c => c.soreness !== null).map(c => c.soreness!)

  const averageMood = validMoods.length > 0 
    ? validMoods.reduce((sum, val) => sum + val, 0) / validMoods.length 
    : 0

  const averageEnergy = validEnergies.length > 0
    ? validEnergies.reduce((sum, val) => sum + val, 0) / validEnergies.length
    : 0

  const averageSoreness = validSoreness.length > 0
    ? validSoreness.reduce((sum, val) => sum + val, 0) / validSoreness.length
    : 0

  // Calculate streak
  let checkInStreak = 0
  const today = new Date()
  
  for (let i = 0; i < daysBack; i++) {
    const checkDate = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000))
    const dateString = checkDate.toISOString().split('T')[0]
    
    const hasCheckIn = checkIns.some(c => c.date === dateString)
    
    if (hasCheckIn) {
      checkInStreak++
    } else {
      break
    }
  }

  // Calculate trends
  const midPoint = Math.floor(checkIns.length / 2)
  const firstHalf = checkIns.slice(midPoint)
  const secondHalf = checkIns.slice(0, midPoint)

  const calculateTrend = (firstHalf: any[], secondHalf: any[], field: 'mood' | 'energy') => {
    const firstAvg = firstHalf.filter(c => c[field] !== null).length > 0
      ? firstHalf.filter(c => c[field] !== null).reduce((sum, c) => sum + c[field]!, 0) / firstHalf.filter(c => c[field] !== null).length
      : 0

    const secondAvg = secondHalf.filter(c => c[field] !== null).length > 0
      ? secondHalf.filter(c => c[field] !== null).reduce((sum, c) => sum + c[field]!, 0) / secondHalf.filter(c => c[field] !== null).length
      : 0

    if (firstAvg === 0) return 'stable'
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100
    
    if (Math.abs(changePercent) > 10) {
      return changePercent > 0 ? 'up' : 'down'
    }
    
    return 'stable'
  }

  const moodTrend = calculateTrend(firstHalf, secondHalf, 'mood')
  const energyTrend = calculateTrend(firstHalf, secondHalf, 'energy')

  return {
    averageMood,
    averageEnergy,
    averageSoreness,
    checkInStreak,
    totalCheckIns: checkIns.length,
    moodTrend,
    energyTrend
  }
}

// Helper function to get today's check-in for a user
async function getTodaysCheckInForUser(userId: string): Promise<any | null> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data } = await supabaseAdmin
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  return data || null
}

// Helper function to get sparkline data
async function getSparklineData(metricType: string, days: number, userId: string): Promise<number[]> {
  try {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    const { data } = await supabaseAdmin
      .from('metrics')
      .select('value, timestamp')
      .eq('user_id', userId)
      .eq('type', metricType)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true })

    if (!data || data.length === 0) {
      return Array(days).fill(0)
    }

    // Group by day and average
    const dailyAverages = new Map<string, number[]>()
    data.forEach(metric => {
      const date = new Date(metric.timestamp).toISOString().split('T')[0]
      if (!dailyAverages.has(date)) {
        dailyAverages.set(date, [])
      }
      dailyAverages.get(date)!.push(Number(metric.value))
    })

    // Calculate averages and fill missing days
    const result: number[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000))
      const dateStr = date.toISOString().split('T')[0]
      const values = dailyAverages.get(dateStr)
      result.unshift(values && values.length > 0 
        ? values.reduce((sum, v) => sum + v, 0) / values.length 
        : 0)
    }

    return result
  } catch (error) {
    console.error(`Error getting sparkline data for ${metricType}:`, error)
    return Array(days).fill(0)
  }
}

// Helper function to get mood sparkline data
async function getMoodSparklineData(days: number, userId: string): Promise<number[]> {
  try {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    const { data } = await supabaseAdmin
      .from('check_ins')
      .select('mood, date')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (!data || data.length === 0) {
      return Array(days).fill(0)
    }

    // Create map of date to mood
    const moodMap = new Map<string, number>()
    data.forEach(checkIn => {
      if (checkIn.mood !== null) {
        moodMap.set(checkIn.date, checkIn.mood)
      }
    })

    // Fill array with mood values
    const result: number[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000))
      const dateStr = date.toISOString().split('T')[0]
      result.unshift(moodMap.get(dateStr) || 0)
    }

    return result
  } catch (error) {
    console.error('Error getting mood sparkline data:', error)
    return Array(days).fill(0)
  }
}
