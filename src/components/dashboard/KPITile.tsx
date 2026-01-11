"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface KPITileProps {
  title: string
  value: string | number
  unit?: string
  delta?: number
  deltaType?: 'positive' | 'negative' | 'neutral'
  sparklineData?: number[]
  onClick?: () => void
  className?: string
}

export function KPITile({
  title,
  value,
  unit,
  delta,
  deltaType = 'neutral',
  sparklineData,
  onClick,
  className
}: KPITileProps) {
  const getTrendIcon = () => {
    if (!delta) return null
    
    if (deltaType === 'positive') {
      return <TrendingUp className="h-3 w-3 text-green-600" />
    } else if (deltaType === 'negative') {
      return <TrendingDown className="h-3 w-3 text-red-600" />
    } else {
      return <Minus className="h-3 w-3 text-slate-400" />
    }
  }

  const getDeltaColor = () => {
    if (deltaType === 'positive') return 'text-green-600'
    if (deltaType === 'negative') return 'text-red-600'
    return 'text-slate-400'
  }

  return (
    <Card 
      className={cn(
        onClick && "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {title}
            </p>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {value}
              </span>
              {unit && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {unit}
                </span>
              )}
            </div>
            {delta !== undefined && (
              <div className={cn("flex items-center space-x-1 text-xs", getDeltaColor())}>
                {getTrendIcon()}
                <span>{Math.abs(delta)}%</span>
              </div>
            )}
          </div>
          
          {sparklineData && (
            <div className="h-8 w-16">
              <svg viewBox="0 0 64 32" className="h-full w-full">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-teal-600 dark:text-teal-400"
                  points={sparklineData
                    .map((value, index) => {
                      const x = (index / (sparklineData.length - 1)) * 64
                      const y = 32 - (value / Math.max(...sparklineData)) * 32
                      return `${x},${y}`
                    })
                    .join(' ')}
                />
              </svg>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}