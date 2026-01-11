"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, AlertCircle, Eye } from "lucide-react"

interface CorrelationCardProps {
  metric1: string
  metric2: string
  correlation: number
  confidence: 'high' | 'medium' | 'low'
  insight: string
  onShowDetails: () => void
}

export function CorrelationCard({
  metric1,
  metric2,
  correlation,
  confidence,
  insight,
  onShowDetails
}: CorrelationCardProps) {
  const getCorrelationStrength = () => {
    const abs = Math.abs(correlation)
    if (abs >= 0.7) return 'Strong'
    if (abs >= 0.4) return 'Moderate'
    return 'Weak'
  }

  const getCorrelationColor = () => {
    const abs = Math.abs(correlation)
    if (abs >= 0.7) return correlation > 0 ? 'text-green-600' : 'text-red-600'
    if (abs >= 0.4) return correlation > 0 ? 'text-blue-600' : 'text-orange-600'
    return 'text-slate-500'
  }

  const getConfidenceColor = () => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20'
      case 'medium':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20'
      case 'low':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20'
    }
  }

  const getCorrelationIcon = () => {
    return correlation > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">
              {metric1} vs {metric2}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className={cn("flex items-center space-x-1", getCorrelationColor())}>
                {getCorrelationIcon()}
                <span className="text-sm font-semibold">
                  {getCorrelationStrength()} {correlation > 0 ? 'positive' : 'negative'}
                </span>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                getConfidenceColor()
              )}>
                {confidence} confidence
              </div>
            </div>
          </div>
          {confidence === 'low' && (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {insight}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Correlation: {correlation > 0 ? '+' : ''}{correlation.toFixed(2)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowDetails}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Show details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}