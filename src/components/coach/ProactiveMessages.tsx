"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Clock, Target, Heart, Moon, Sun, TrendingUp } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

interface ProactiveMessage {
  id: string
  title: string
  content: string
  trigger: string
  timestamp: string
  actions?: Array<{
    type: string
    title: string
    description?: string
  }>
  priority: 'low' | 'medium' | 'high'
}

const triggerIcons = {
  morning_checkin: Sun,
  lunch_reminder: Heart,
  evening_reflection: Moon,
  goal_nudge: Target,
  habit_reminder: TrendingUp,
  progress_celebration: TrendingUp,
  low_energy_alert: Bell,
  sleep_reminder: Moon
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

export default function ProactiveMessages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ProactiveMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchProactiveMessages()
    }
  }, [user?.id])

  const fetchProactiveMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/coach/proactive')
      
      if (!response.ok) {
        throw new Error('Failed to fetch proactive messages')
      }
      
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching proactive messages:', error)
      // Don't show error to user, just show empty state
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const handleActionClick = async (action: any) => {
    // Handle action completion
    console.log('Action clicked:', action)
    // You could implement action completion logic here
  }

  const simulateNewMessage = () => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      title: 'Demo Proactive Message',
      content: "This is a demo of how your AI coach proactively sends personalized tips based on your goals! In production, these would be sent automatically at scheduled times.",
      trigger: 'demo',
      timestamp: new Date().toISOString(),
      actions: [
        { type: 'checklist', title: 'Try this action' },
        { type: 'timer', title: 'Set a 5-minute timer' }
      ],
      priority: 'medium' as const
    }
    
    setMessages(prev => [newMessage, ...prev])
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Proactive Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-sm text-slate-500 mt-2">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Proactive Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No proactive messages yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Your AI coach will send personalized tips and reminders
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show a demo banner for the proactive messages
  const hasRecentMessages = messages.some(msg => {
    const messageTime = new Date(msg.timestamp)
    const now = new Date()
    const hoursDiff = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60)
    return hoursDiff < 24 // Messages from last 24 hours
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Proactive Messages
          <Badge variant="secondary" className="ml-auto">
            {messages.length}
          </Badge>
        </CardTitle>
        {hasRecentMessages && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                New proactive messages from your AI coach!
              </span>
            </div>
          </div>
        )}
        <div className="mb-4">
          <Button 
            onClick={simulateNewMessage}
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Simulate New Proactive Message
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map((message) => {
          const Icon = triggerIcons[message.trigger as keyof typeof triggerIcons] || Bell
          
          return (
            <div
              key={message.id}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-teal-100 dark:bg-teal-900/50">
                  <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">
                      {message.title}
                    </h4>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${priorityColors[message.priority]}`}
                    >
                      {message.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {message.content}
                  </p>
                  
                  {message.actions && message.actions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Actions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.actions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleActionClick(action)}
                            className="text-xs"
                          >
                            {action.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(message.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
