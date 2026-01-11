/**
 * Dashboard Data Hook
 * 
 * Fetches and manages dashboard data with loading and error states
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface DashboardKPI {
  title: string
  value: string
  unit?: string
  delta: number
  deltaType: 'positive' | 'negative' | 'neutral'
  sparklineData: number[]
}

export interface DashboardData {
  user: {
    name: string
    startDate: Date
  }
  overallProgress: number
  kpis: DashboardKPI[]
  nextAction: {
    title: string
    description: string
    timeRemaining: string
    priority: 'low' | 'medium' | 'high'
  } | null
  recentWins: string[]
  weeklyTrends: {
    sleep: number
    activity: number
    recovery: number
  }
  coachInsight: string | null
  promptChips: string[]
}

export function useDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/dashboard?userId=${user.id}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard: ${response.statusText}`)
        }

        const dashboardData = await response.json()
        
        // Transform dates
        dashboardData.user.startDate = new Date(dashboardData.user.startDate)
        
        setData(dashboardData)
      } catch (err) {
        console.error('Error fetching dashboard:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [user?.id])

  return { data, loading, error }
}
