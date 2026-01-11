"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Calendar
} from "lucide-react"

interface WeeklyReportProps {
  weekNumber: number
  dateRange: string
  keyChanges: Array<{
    metric: string
    change: number
    type: 'improvement' | 'decline' | 'stable'
    description: string
  }>
  wins: string[]
  risks: Array<{
    title: string
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
  overallScore: number
}

export function WeeklyReport({
  weekNumber,
  dateRange,
  keyChanges,
  wins,
  risks,
  overallScore
}: WeeklyReportProps) {
  const getChangeIcon = (type: 'improvement' | 'decline' | 'stable') => {
    switch (type) {
      case 'improvement':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'decline':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'stable':
        return <Target className="h-4 w-4 text-slate-500" />
    }
  }

  const getChangeColor = (type: 'improvement' | 'decline' | 'stable') => {
    switch (type) {
      case 'improvement':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20'
      case 'decline':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20'
      case 'stable':
        return 'text-slate-600 bg-slate-50 dark:bg-slate-950/20'
    }
  }

  const getRiskColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
      case 'medium':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
      case 'low':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <div>
              <CardTitle>Week {weekNumber} Report</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {dateRange}
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className={cn("text-2xl font-bold", getScoreColor(overallScore))}>
              {overallScore}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Overall Score
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Changes */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Key Changes
          </h3>
          <div className="space-y-2">
            {keyChanges.map((change, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg",
                  getChangeColor(change.type)
                )}
              >
                {getChangeIcon(change.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{change.metric}</span>
                    <Badge variant="outline" className="text-xs">
                      {change.change > 0 ? '+' : ''}{change.change}%
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {change.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wins */}
        {wins.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              🎉 This Week's Wins
            </h3>
            <div className="space-y-2">
              {wins.map((win, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-2 text-sm text-green-700 dark:text-green-300"
                >
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{win}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Areas to Watch
            </h3>
            <div className="space-y-2">
              {risks.map((risk, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border",
                    getRiskColor(risk.severity)
                  )}
                >
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{risk.title}</div>
                      <p className="text-xs mt-1 opacity-80">
                        {risk.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}