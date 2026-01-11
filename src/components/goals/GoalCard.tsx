"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Goal } from "@/types"
import { cn } from "@/lib/utils"
import { 
  Moon, 
  Activity, 
  Apple, 
  Brain, 
  Heart, 
  Scale,
  Target,
  TrendingUp,
  Settings
} from "lucide-react"

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onViewDetails: (goal: Goal) => void
}

export function GoalCard({ goal, onEdit, onViewDetails }: GoalCardProps) {
  const getCategoryIcon = (category: Goal['category']) => {
    switch (category) {
      case 'sleep':
        return <Moon className="h-5 w-5" />
      case 'movement':
        return <Activity className="h-5 w-5" />
      case 'nutrition':
        return <Apple className="h-5 w-5" />
      case 'stress':
        return <Heart className="h-5 w-5" />
      case 'body':
        return <Scale className="h-5 w-5" />
      case 'cognitive':
        return <Brain className="h-5 w-5" />
      default:
        return <Target className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: Goal['category']) => {
    switch (category) {
      case 'sleep':
        return 'text-purple-600 dark:text-purple-400'
      case 'movement':
        return 'text-green-600 dark:text-green-400'
      case 'nutrition':
        return 'text-orange-600 dark:text-orange-400'
      case 'stress':
        return 'text-pink-600 dark:text-pink-400'
      case 'body':
        return 'text-blue-600 dark:text-blue-400'
      case 'cognitive':
        return 'text-indigo-600 dark:text-indigo-400'
      default:
        return 'text-teal-600 dark:text-teal-400'
    }
  }

  const progress = goal.baseline > 0 
    ? Math.min(100, ((goal.target - goal.baseline) / goal.baseline) * 100)
    : 0

  const activeHabits = goal.habits.filter(h => h.isActive)
  const avgAdherence = activeHabits.length > 0 
    ? activeHabits.reduce((sum, h) => sum + h.adherence, 0) / activeHabits.length
    : 0

  return (
    <Card className={cn(
      "transition-all hover:shadow-md hover:scale-[1.02]",
      !goal.isActive && "opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-lg bg-slate-100 dark:bg-slate-800", getCategoryColor(goal.category))}>
              {getCategoryIcon(goal.category)}
            </div>
            <div>
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {goal.description}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(goal)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Target Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Target Progress</span>
            <span className="font-medium">
              {goal.baseline} → {goal.target} {goal.unit}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Habit Adherence */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Habit Adherence</span>
            <span className="font-medium">{Math.round(avgAdherence)}%</span>
          </div>
          <Progress value={avgAdherence} className="h-2" />
        </div>

        {/* Active Habits */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Active Habits ({activeHabits.length})
          </h4>
          <div className="space-y-1">
            {activeHabits.slice(0, 2).map((habit) => (
              <div key={habit.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {habit.title}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">
                    {habit.streak} day streak
                  </span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    habit.adherence >= 80 ? "bg-green-500" :
                    habit.adherence >= 60 ? "bg-amber-500" : "bg-red-500"
                  )} />
                </div>
              </div>
            ))}
            {activeHabits.length > 2 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                +{activeHabits.length - 2} more habits
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(goal)}
            className="flex-1"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}