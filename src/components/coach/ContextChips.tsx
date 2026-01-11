"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Target, 
  Moon, 
  Activity, 
  Heart, 
  Plane,
  X
} from "lucide-react"

interface ContextChip {
  id: string
  label: string
  type: 'goals' | 'sleep' | 'training' | 'mood' | 'travel' | 'custom'
  isActive: boolean
  data?: Record<string, unknown>
}

interface ContextChipsProps {
  chips: ContextChip[]
  onToggle: (chipId: string) => void
}

export function ContextChips({ chips, onToggle }: ContextChipsProps) {
  const getChipIcon = (type: ContextChip['type']) => {
    switch (type) {
      case 'goals':
        return <Target className="h-3 w-3" />
      case 'sleep':
        return <Moon className="h-3 w-3" />
      case 'training':
        return <Activity className="h-3 w-3" />
      case 'mood':
        return <Heart className="h-3 w-3" />
      case 'travel':
        return <Plane className="h-3 w-3" />
      default:
        return null
    }
  }

  const getChipColor = (type: ContextChip['type'], isActive: boolean) => {
    if (!isActive) {
      return "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
    }
    
    switch (type) {
      case 'goals':
        return "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70"
      case 'sleep':
        return "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900/70"
      case 'training':
        return "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70"
      case 'mood':
        return "bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/50 dark:text-pink-300 dark:hover:bg-pink-900/70"
      case 'travel':
        return "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/70"
      default:
        return "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-900/70"
    }
  }

  if (chips.length === 0) return null

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          CONTEXT
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Button
            key={chip.id}
            variant="ghost"
            size="sm"
            onClick={() => onToggle(chip.id)}
            className={cn(
              "h-7 px-2 text-xs rounded-full transition-all",
              getChipColor(chip.type, chip.isActive)
            )}
          >
            <div className="flex items-center gap-1">
              {getChipIcon(chip.type)}
              <span>{chip.label}</span>
              {chip.isActive && (
                <X className="h-3 w-3 ml-1" />
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}