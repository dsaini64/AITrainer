"use client"

import { useState, useEffect } from "react"
import { ProgressRing } from "@/components/dashboard/ProgressRing"
import { KPITile } from "@/components/dashboard/KPITile"
import { NextBestAction } from "@/components/dashboard/NextBestAction"
import { CoachSnapshot } from "@/components/dashboard/CoachSnapshot"
import ProactiveMessages from "@/components/coach/ProactiveMessages"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { useAuth } from "@/contexts/AuthContext"
import { formatDate, getWeekCount, getDayCount } from "@/lib/utils"
import { Plus, Search, Bell, LogOut, LogIn, MessageSquare, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useDashboard } from "@/hooks/useDashboard"

export default function TodayPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { data: dashboardData, loading, error } = useDashboard()
  const [proactiveMessageCount, setProactiveMessageCount] = useState(0)
  const [showProactiveMessages, setShowProactiveMessages] = useState(false)
  
  // Calculate week/day counts
  const startDate = dashboardData?.user.startDate || (user?.start_date ? new Date(user.start_date) : new Date())
  const weekCount = getWeekCount(startDate)
  const dayCount = getDayCount(startDate) % 7 || 7


  const handleNextAction = () => {
    // Navigate to coach page to start the action
    router.push('/coach')
  }

  const handlePromptClick = (prompt: string) => {
    // Navigate to coach with pre-filled prompt
    router.push(`/coach?prompt=${encodeURIComponent(prompt)}`)
  }

  const handleChatClick = () => {
    // Navigate to coach chat
    router.push('/coach')
  }

  const handleBellClick = () => {
    setShowProactiveMessages(!showProactiveMessages)
    // Mark messages as read when opening
    if (!showProactiveMessages) {
      setProactiveMessageCount(0)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProactiveMessages) {
        const target = event.target as HTMLElement
        if (!target.closest('[data-proactive-dropdown]')) {
          setShowProactiveMessages(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProactiveMessages])

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
        {/* Header */}
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                HelloFam Longevity Coach
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {getGreeting()}, {user?.name || dashboardData?.user.name || 'User'} • Week {weekCount} • Day {dayCount}
              </p>
            </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={handleBellClick}
              title="Proactive Messages"
            >
              <Bell className="h-5 w-5" />
              {proactiveMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {proactiveMessageCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <Plus className="h-5 w-5" />
            </Button>
            {user ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={signOut}
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Link href="/auth/signin">
                <Button 
                  variant="ghost" 
                  size="icon"
                  title="Sign in"
                >
                  <LogIn className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Proactive Messages Dropdown */}
      {showProactiveMessages && (
        <div className="absolute top-16 right-4 z-50 w-96 max-w-sm" data-proactive-dropdown>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Proactive Messages
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProactiveMessages(false)}
              >
                ×
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    New messages from your AI coach!
                  </span>
                </div>
              </div>
              
              {/* Sample proactive messages */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-teal-100 dark:bg-teal-900/50">
                    <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      Healthy Lunch for Your Goals
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Time for lunch! Since you're working on increasing protein intake, try a quinoa bowl with chickpeas and grilled chicken.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        Try quinoa bowl
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        Drink water
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
                    <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      Morning Energy Boost
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Good morning! Ready to get your heart pumping? A 20-minute morning walk would be perfect for your cardio goals.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        Morning walk
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        Push-ups
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                    <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      Evening Wind-Down
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Time to prepare for quality sleep! Turn off screens, try some deep breathing, and aim for 7-8 hours tonight.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        Turn off screens
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        Deep breathing
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400 mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading your dashboard...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load dashboard</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        ) : dashboardData ? (
          <>
            {/* Progress Ring */}
            <div className="flex justify-center">
              <ProgressRing progress={dashboardData.overallProgress} size={140}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {dashboardData.overallProgress}%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    On Track
                  </div>
                </div>
              </ProgressRing>
            </div>

            {/* KPI Tiles */}
            {dashboardData.kpis && dashboardData.kpis.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {dashboardData.kpis.map((kpi) => (
                  <KPITile
                    key={kpi.title}
                    title={kpi.title}
                    value={kpi.value}
                    unit={kpi.unit}
                    delta={kpi.delta}
                    deltaType={kpi.deltaType}
                    sparklineData={kpi.sparklineData}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">No metrics yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Start tracking your health to see your progress here</p>
              </div>
            )}

            {/* Next Best Action */}
            {dashboardData.nextAction ? (
              <NextBestAction
                title={dashboardData.nextAction.title}
                description={dashboardData.nextAction.description}
                timeRemaining={dashboardData.nextAction.timeRemaining}
                priority={dashboardData.nextAction.priority}
                onAction={handleNextAction}
              />
            ) : (
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">No active goals</p>
                <Button onClick={() => router.push('/goals')} variant="outline" size="sm">
                  Create a goal
                </Button>
              </div>
            )}

            {/* Coach Snapshot */}
            <CoachSnapshot
              insight={dashboardData.coachInsight || "Welcome! Start tracking your health metrics and goals to get personalized insights."}
              promptChips={dashboardData.promptChips}
              onPromptClick={handlePromptClick}
              onChatClick={handleChatClick}
            />

            {/* Proactive Messages */}
            <div className="relative">
              <ProactiveMessages />
              {proactiveMessageCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                  {proactiveMessageCount}
                </div>
              )}
            </div>

            {/* Weekly Trends */}
            {dashboardData.weeklyTrends && (
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Weekly Trends
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Sleep</div>
                    <div className={`text-lg font-semibold ${dashboardData.weeklyTrends.sleep > 0 ? 'text-green-600' : dashboardData.weeklyTrends.sleep < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {dashboardData.weeklyTrends.sleep > 0 ? '+' : ''}{dashboardData.weeklyTrends.sleep}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Activity</div>
                    <div className={`text-lg font-semibold ${dashboardData.weeklyTrends.activity > 0 ? 'text-green-600' : dashboardData.weeklyTrends.activity < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {dashboardData.weeklyTrends.activity > 0 ? '+' : ''}{dashboardData.weeklyTrends.activity}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Recovery</div>
                    <div className={`text-lg font-semibold ${dashboardData.weeklyTrends.recovery > 0 ? 'text-green-600' : dashboardData.weeklyTrends.recovery < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {dashboardData.weeklyTrends.recovery > 0 ? '+' : ''}{dashboardData.weeklyTrends.recovery}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Wins */}
            {dashboardData.recentWins && dashboardData.recentWins.length > 0 ? (
              <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  🎉 Recent Wins
                </h3>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  {dashboardData.recentWins.map((win, index) => (
                    <li key={index}>{win}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20 rounded-2xl p-4 border border-green-200 dark:border-green-800 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">Keep going! Your wins will appear here as you build streaks.</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-slate-500 dark:text-slate-400">No data available</p>
          </div>
        )}
      </div>
    </div>
  )
}