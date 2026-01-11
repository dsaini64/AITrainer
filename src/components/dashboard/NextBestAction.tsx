"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Target } from "lucide-react"

interface NextBestActionProps {
  title: string
  description: string
  timeRemaining?: string
  priority: 'high' | 'medium' | 'low'
  onAction: () => void
  actionLabel?: string
}

export function NextBestAction({
  title,
  description,
  timeRemaining,
  priority,
  onAction,
  actionLabel = "Do it now"
}: NextBestActionProps) {
  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
      case 'medium':
        return 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20'
      case 'low':
        return 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
      default:
        return 'border-l-slate-500 bg-slate-50 dark:bg-slate-950/20'
    }
  }

  return (
    <Card className={`border-l-4 ${getPriorityColor()}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
            {timeRemaining && (
              <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{timeRemaining}</span>
              </div>
            )}
          </div>
          <Button 
            onClick={onAction}
            className="ml-4 shrink-0"
            size="sm"
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}