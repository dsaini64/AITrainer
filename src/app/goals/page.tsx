"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { GoalCard } from "@/components/goals/GoalCard"
import { Goal } from "@/types"
import { Plus, Filter, Search, CheckCircle, TrendingUp, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { getGoals } from "@/lib/api/goals"
import { useAuth } from "@/contexts/AuthContext"

export default function GoalsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [completedActions, setCompletedActions] = useState<any[]>([])

  // Fetch goals from API
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const fetchGoals = async () => {
      try {
        setLoading(true)
        setError(null)
        const fetchedGoals = await getGoals(showInactive)
        setGoals(fetchedGoals)
      } catch (err) {
        console.error('Error fetching goals:', err)
        setError(err instanceof Error ? err.message : 'Failed to load goals')
      } finally {
        setLoading(false)
      }
    }

    fetchGoals()
  }, [user?.id, showInactive])

  // Calculate category counts
  const goalCategories = [
    { id: 'all', label: 'All Goals', count: goals.length },
    { id: 'sleep', label: 'Sleep', count: goals.filter(g => g.category === 'sleep').length },
    { id: 'movement', label: 'Movement', count: goals.filter(g => g.category === 'movement').length },
    { id: 'nutrition', label: 'Nutrition', count: goals.filter(g => g.category === 'nutrition').length },
    { id: 'stress', label: 'Stress', count: goals.filter(g => g.category === 'stress').length },
    { id: 'body', label: 'Body Composition', count: goals.filter(g => g.category === 'body').length },
    { id: 'cognitive', label: 'Cognitive', count: goals.filter(g => g.category === 'cognitive').length },
  ]

  // Load completed actions from localStorage
  useEffect(() => {
    const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}')
    const actions = userPreferences.completedActions || []
    setCompletedActions(actions)
  }, [])

  // Listen for storage changes to update completed actions
  useEffect(() => {
    const handleStorageChange = () => {
      const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}')
      const actions = userPreferences.completedActions || []
      setCompletedActions(actions)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const filteredGoals = goals.filter(goal => {
    const categoryMatch = selectedCategory === 'all' || goal.category === selectedCategory
    const activeMatch = showInactive || goal.isActive
    return categoryMatch && activeMatch
  })

  const handleEditGoal = (goal: Goal) => {
    console.log('Edit goal:', goal.id)
    // In real app, open edit modal or navigate to edit page
  }

  const handleViewDetails = (goal: Goal) => {
    // Navigate to insights page with goal filter
    router.push(`/insights?goal=${goal.id}`)
  }

  const handleAddGoal = () => {
    console.log('Add new goal')
    // In real app, open goal creation flow
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Goals
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filteredGoals.filter(g => g.isActive).length} active goals
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Filter className="h-5 w-5" />
            </Button>
            <Button onClick={handleAddGoal} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400 mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading goals...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load goals</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Recent Progress */}
            {completedActions.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Recent Progress
              </h3>
            </div>
            <div className="space-y-2">
              {completedActions.slice(-3).map((action, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-green-700 dark:text-green-300">
                    Completed: {action.action}
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-400 ml-auto">
                    {new Date(action.completedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
            {completedActions.length > 3 && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                +{completedActions.length - 3} more actions completed
              </div>
            )}
          </div>
        )}

        {/* Category Filters */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Categories
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {goalCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
              >
                {category.label}
                {category.count > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-slate-700">
                    {category.count}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Show Inactive Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Show inactive goals
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className={showInactive ? "text-teal-600 dark:text-teal-400" : ""}
          >
            {showInactive ? "Hide" : "Show"}
          </Button>
        </div>

        {/* Goals Grid */}
        {filteredGoals.length > 0 ? (
          <div className="grid gap-4">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEditGoal}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Plus className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No goals found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {selectedCategory === 'all' 
                ? "Get started by creating your first goal"
                : `No goals in the ${goalCategories.find(c => c.id === selectedCategory)?.label} category`
              }
            </p>
            <Button onClick={handleAddGoal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Goal
            </Button>
          </div>
        )}

        {/* Quick Stats */}
        {filteredGoals.length > 0 && (
          <div className="bg-white dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Quick Stats
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {Math.round(filteredGoals.reduce((sum, g) => {
                    const activeHabits = g.habits.filter(h => h.isActive)
                    return sum + (activeHabits.length > 0 
                      ? activeHabits.reduce((hSum, h) => hSum + h.adherence, 0) / activeHabits.length
                      : 0)
                  }, 0) / filteredGoals.length)}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Avg Adherence
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {filteredGoals.reduce((sum, g) => sum + g.habits.filter(h => h.isActive).length, 0)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Active Habits
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(filteredGoals.reduce((sum, g) => {
                    const activeHabits = g.habits.filter(h => h.isActive)
                    return sum + (activeHabits.length > 0 
                      ? activeHabits.reduce((hSum, h) => hSum + h.streak, 0) / activeHabits.length
                      : 0)
                  }, 0) / filteredGoals.length)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Avg Streak
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}