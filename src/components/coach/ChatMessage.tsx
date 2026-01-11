"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Bot, User, ExternalLink, AlertTriangle, CheckSquare, Timer, Calendar, CheckCircle } from "lucide-react"
import { CoachMessage, CoachAction } from "@/types"

interface ChatMessageProps {
  message: CoachMessage
  onActionClick: (action: CoachAction, messageId?: string) => void
  completedActions?: Set<string>
}

export function ChatMessage({ message, onActionClick, completedActions = new Set() }: ChatMessageProps) {
  const isUser = message.type === 'user'
  const isCoach = message.type === 'coach'

  const getModeColor = () => {
    switch (message.mode) {
      case 'explain':
        return 'text-blue-600 dark:text-blue-400'
      case 'plan':
        return 'text-green-600 dark:text-green-400'
      case 'motivate':
        return 'text-purple-600 dark:text-purple-400'
      case 'checkin':
        return 'text-amber-600 dark:text-amber-400'
      default:
        return 'text-teal-600 dark:text-teal-400'
    }
  }

  const getActionIcon = (type: CoachAction['type'], completed: boolean = false) => {
    if (completed) {
      return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
    }
    
    switch (type) {
      case 'checklist':
        return <CheckSquare className="h-4 w-4" />
      case 'timer':
        return <Timer className="h-4 w-4" />
      case 'reminder':
        return <Calendar className="h-4 w-4" />
      case 'schedule':
        return <Calendar className="h-4 w-4" />
      default:
        return <CheckSquare className="h-4 w-4" />
    }
  }

  return (
    <div className={cn(
      "flex gap-3 mb-6",
      isUser ? "justify-end" : "justify-start"
    )}>
      {isCoach && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
            <Bot className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
        </div>
      )}
      
      <div className={cn(
        "max-w-[80%] space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        <Card className={cn(
          isUser 
            ? "bg-teal-600 text-white border-teal-600" 
            : message.isSafetyCard 
              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              : "bg-white dark:bg-slate-950"
        )}>
          <CardContent className="p-3">
            {isCoach && message.mode && (
              <div className={cn("text-xs font-medium mb-2", getModeColor())}>
                {message.mode.toUpperCase()} MODE
              </div>
            )}
            
            {message.isSafetyCard && (
              <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">SAFETY NOTICE</span>
              </div>
            )}
            
            <div className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap",
              isUser ? "text-white" : "text-slate-700 dark:text-slate-300"
            )}>
              {message.content}
            </div>
            
            {message.citations && message.citations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap gap-1">
                  {message.citations.map((citation, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Source {index + 1}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {message.actions && message.actions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              💡 Quick Actions
            </div>
            {message.actions.map((action, index) => {
              const actionKey = `${message.id}-${action.id}`
              const isCompleted = completedActions.has(actionKey) || action.completed
              
              return (
                <Button
                  key={action.id || `action-${index}-${message.id}`}
                  variant={isCompleted ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    console.log('Button clicked:', action.title, 'Completed:', isCompleted)
                    onActionClick(action, message.id)
                  }}
                  className={cn(
                    "justify-start text-left h-auto p-3 transition-all duration-200",
                    isCompleted 
                      ? "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                  disabled={isCompleted}
                >
                  <div className="flex items-start gap-2">
                    {getActionIcon(action.type, isCompleted)}
                    <div>
                      <div className={cn(
                        "font-medium",
                        isCompleted && "line-through"
                      )}>
                        {isCompleted ? "✓ " : ""}{action.title}
                      </div>
                      {action.description && (
                        <div className={cn(
                          "text-xs mt-1",
                          isCompleted 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-slate-500 dark:text-slate-400"
                        )}>
                          {isCompleted ? "Completed!" : action.description}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        )}
        
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
        </div>
      )}
    </div>
  )
}