"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "@/components/coach/ChatMessage"
import { ContextChips } from "@/components/coach/ContextChips"
import { CoachMessage, CoachAction } from "@/types"
import { Send, Mic, MoreHorizontal, Bell, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStreamingChat } from "@/hooks/useStreamingChat"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { useAuth } from "@/contexts/AuthContext"
import { markActionCompleted } from "@/lib/api/coach"
import { useSearchParams, useRouter } from "next/navigation"
import { IntelligentCoach } from "@/lib/ai/intelligent-coach"
import { AgenticCoach } from "@/lib/ai/agentic-coach"
import { SmartTimingEngine } from "@/lib/ai/smart-timing"
import { DynamicGoalTracker } from "@/lib/ai/dynamic-goals"
import { PersonalMemory, CompletedAction } from "@/lib/ai/personal-memory"

// Context chips will be generated dynamically from user data

const quickPrompts = [
  "Why did my HRV drop?",
  "Plan a recovery day",
  "Optimize my sleep",
  "Adjust today's workout"
]

// Removed mode buttons - simplified interface

export default function CoachPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [contextChips, setContextChips] = useState<any[]>([])
  
  // Generate context chips from user data
  useEffect(() => {
    const generateContextChips = async () => {
      try {
        const chips: any[] = []
        
        // Fetch goals
        const goalsResponse = await fetch('/api/goals')
        if (goalsResponse.ok) {
          const goalsData = await goalsResponse.json()
          const activeGoals = goalsData.goals?.filter((g: any) => g.isActive) || []
          if (activeGoals.length > 0) {
            chips.push({ id: 'goals', label: `${activeGoals.length} Active Goals`, type: 'goals' as const, isActive: true })
          }
        }
        
        // Fetch latest metrics
        const metricsResponse = await fetch('/api/metrics?limit=1')
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          const sleepMetric = metricsData.metrics?.find((m: any) => m.type === 'sleep_duration')
          if (sleepMetric) {
            const hours = Math.floor(Number(sleepMetric.value) / 60)
            const minutes = Number(sleepMetric.value) % 60
            chips.push({ id: 'sleep', label: `Last Night: ${hours}h ${minutes}m`, type: 'sleep' as const, isActive: true })
          }
        }
        
        // Fetch today's check-in
        const checkInResponse = await fetch('/api/checkins/today')
        if (checkInResponse.ok) {
          const checkInData = await checkInResponse.json()
          if (checkInData.checkIn?.mood) {
            chips.push({ id: 'mood', label: `Mood: ${checkInData.checkIn.mood.toFixed(1)}/5`, type: 'mood' as const, isActive: false })
          }
        }
        
        setContextChips(chips)
      } catch (error) {
        console.error('Error generating context chips:', error)
        // Set empty array on error
        setContextChips([])
      }
    }
    
    if (user?.id) {
      generateContextChips()
    }
  }, [user?.id])
  // Simplified - no mode selection needed
  const [mounted, setMounted] = useState(false)
  // Proactive messages state removed - no longer needed
  const [intelligentInsights, setIntelligentInsights] = useState<any[]>([])
  const [lastIntelligentCheck, setLastIntelligentCheck] = useState<Date | null>(null)
  const [personalMemory] = useState(() => new PersonalMemory(user?.id || 'demo-user-123'))
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())
  const [agenticCoach] = useState(() => new AgenticCoach({
    userId: user?.id || 'demo-user-123',
    context: {
      currentTime: {
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6,
        season: 'spring',
        timezone: 'UTC'
      },
      location: {
        timezone: 'UTC',
        isIndoors: true
      },
      recentActivity: {},
      mood: 'neutral',
      energy: 'medium',
      stress: 'low'
    }
  }))
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMounted(true)
    
    // Check if onboarding is completed
    const onboardingCompleted = localStorage.getItem('onboardingCompleted')
    if (!onboardingCompleted) {
      router.push('/onboarding')
    }
    
    // Start the agentic coach loop
    if (onboardingCompleted) {
      agenticCoach.startAgenticLoop()
    }
    
    // Cleanup on unmount
    return () => {
      agenticCoach.stopAgenticLoop()
    }
  }, [router, agenticCoach])

  // Proactive messages localStorage persistence removed - no longer needed

  // Load completed actions from localStorage
  useEffect(() => {
    try {
      const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}')
      const actions = userPreferences.completedActions || []
      const actionSet = new Set(actions.map((action: any) => `${action.messageId || 'unknown'}-${action.actionId || action.action}`))
      setCompletedActions(actionSet)
    } catch (error) {
      console.error('Error loading completed actions from localStorage:', error)
    }
  }, [])

  const { messages, loading: historyLoading, addMessage, clearHistory } = useConversationHistory(user?.id)

  // Intelligent coaching system - DISABLED to prevent automatic API calls
  // useEffect(() => {
  //   const checkIntelligentInsights = async () => {
  //     const now = new Date()
  //     const timeSinceLastCheck = lastIntelligentCheck 
  //       ? now.getTime() - lastIntelligentCheck.getTime()
  //       : Infinity

  //     // Check for insights every 5 minutes
  //     if (timeSinceLastCheck > 5 * 60 * 1000) {
  //       try {
  //         // Create intelligent coach instance
  //         const userContext = {
  //           userId: user?.id || 'demo-user-123',
  //           recentMetrics: {},
  //           activeGoals: [],
  //           recentHabits: [],
  //           lastCheckin: undefined,
  //           preferences: {
  //             units: 'metric' as const,
  //             timeFormat: '24h' as const
  //           },
  //           completedActions: [],
  //           currentTime: {
  //             hour: new Date().getHours(),
  //             dayOfWeek: new Date().getDay(),
  //             isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6,
  //             season: 'spring',
  //             timezone: 'UTC'
  //           },
  //           schedule: {},
  //           location: {
  //             timezone: 'UTC',
  //             isIndoors: true
  //           },
  //           recentActivity: {}
  //         }

  //         const intelligentCoach = new IntelligentCoach(userContext)
  //         const insights = await intelligentCoach.generateProactiveInsights()

  //         if (insights.length > 0) {
  //           // Convert insights to coach messages
  //           const coachMessages = insights.map(insight => ({
  //             id: `intelligent-${Date.now()}-${Math.random()}`,
  //             type: 'coach' as const,
  //             content: intelligentCoach.generatePersonalizedMessage(insight),
  //             timestamp: new Date(),
  //             mode: 'explain' as const,
  //             actions: insight.actions.map(action => ({
  //               id: action.id,
  //               type: action.type as 'checklist' | 'timer' | 'reminder' | 'schedule',
  //               title: action.title,
  //               description: action.description,
  //               completed: false
  //             }))
  //           }))

  //           // Add to messages
  //           coachMessages.forEach(message => addMessage(message))
  //           setIntelligentInsights(insights)
  //         }

  //         setLastIntelligentCheck(now)
  //       } catch (error) {
  //         console.error('Error generating intelligent insights:', error)
  //       }
  //     }
  //   }

  //   // Check immediately on mount
  //   checkIntelligentInsights()

  //   // Set up interval for regular checks
  //   const interval = setInterval(checkIntelligentInsights, 5 * 60 * 1000) // Every 5 minutes

  //   return () => clearInterval(interval)
  // }, [lastIntelligentCheck, user, addMessage])

  // Handle URL prompt parameter
  useEffect(() => {
    const prompt = searchParams.get('prompt')
    if (prompt) {
      setInputValue(prompt)
      inputRef.current?.focus()
    }
  }, [searchParams])

  // Proactive messages functionality removed - no longer needed

  // Proactive response handler removed - no longer needed

  const { sendMessage, isStreaming, currentResponse } = useStreamingChat({
    onMessage: (message) => {
      addMessage(message)
    },
    onError: (error) => {
      console.error('Chat error:', error)
      // You could show a toast notification here
    }
  })

  // Handle follow-up responses to maintain conversation context
  const handleFollowUpResponse = async (userMessage: string) => {
    try {
      const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}')
      
      // Check if this is a follow-up to a proactive message
      const isFollowUp = userMessage.includes('at work') || 
                         userMessage.includes('takeout') || 
                         userMessage.includes('work') ||
                         userMessage.includes('office') ||
                         userMessage.includes("don't like") ||
                         userMessage.includes('allergic')
      
      if (isFollowUp) {
        // Learn from user statement using personal memory
        personalMemory.learnFromStatement(userMessage, {
          timeOfDay: new Date().getHours() >= 12 ? 'afternoon' : 'morning',
          dayOfWeek: new Date().getDay(),
          context: 'follow_up'
        })
        
        // Update preferences based on user response
        if (userMessage.includes("don't like") || userMessage.includes('allergic')) {
          userPreferences.foodPreferences = {
            dislikes: [...(userPreferences.foodPreferences?.dislikes || []), 'quinoa'],
            allergies: [...(userPreferences.foodPreferences?.allergies || []), 'chickpeas']
          }
        }
        
        if (userMessage.includes('at work') || userMessage.includes('takeout')) {
          userPreferences.workSchedule = {
            needsTakeout: true,
            workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            lastUpdated: new Date().toISOString()
          }
        }
        
        localStorage.setItem('userPreferences', JSON.stringify(userPreferences))
        
        // Send to OpenAI backend for intelligent response
        const userId = user?.id || 'demo-user-123'
        await sendMessage(userMessage, 'proactive_response', userId)
        return true
      }
      
      // Simplified - no special check-in handling needed
      
      return false
    } catch (error) {
      console.error('Error handling follow-up response:', error)
      return false
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return

    const userMessage: CoachMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    addMessage(userMessage)
    const messageContent = inputValue
    setInputValue("")

    // Record interaction with agentic coach
    agenticCoach.recordInteraction({
      type: 'message',
      success: true,
      timestamp: new Date()
    })

    // Check if this is a follow-up response that should be handled contextually
    const handledFollowUp = await handleFollowUpResponse(messageContent)
    
    if (!handledFollowUp) {
      // Get onboarding data from localStorage
      const onboardingData = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('onboardingData') || '{}')
        : {}
      
      // Send message to AI - use a fallback user ID if no user is authenticated
      const userId = user?.id || 'demo-user-123'
      await sendMessage(messageContent, 'explain', userId, onboardingData)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleContextToggle = (chipId: string) => {
    setContextChips(prev => 
      prev.map(chip => 
        chip.id === chipId 
          ? { ...chip, isActive: !chip.isActive }
          : chip
      )
    )
  }

  const handleActionClick = async (action: CoachAction, messageId?: string) => {
    console.log('Action clicked:', action.title, 'Message ID:', messageId)
    console.log('Action details:', action)
    
    if (!messageId) {
      console.log('No message ID provided')
      return
    }

    // Check if action is already completed
    const actionKey = `${messageId}-${action.id}`
    if (action.completed || completedActions.has(actionKey)) {
      console.log('Action already completed:', action.title)
      return
    }

    // Handle all message actions (proactive, intelligent, and regular chat messages)
    console.log('Action completed for message:', action.title)
    
    // Mark action as completed in local state
    setCompletedActions(prev => new Set([...prev, actionKey]))
    
    // Learn from this action using personal memory
    const completedAction: CompletedAction = {
      id: `action-${Date.now()}`,
      action: action.title,
      type: action.type,
      completedAt: new Date(),
      success: true,
      context: {
        timeOfDay: new Date().getHours() >= 12 ? 'afternoon' : 'morning',
        dayOfWeek: new Date().getDay().toString(),
        location: 'home'
      }
    }
    
    personalMemory.learnFromAction(completedAction)
    
    // Record action completion with agentic coach
    agenticCoach.recordInteraction({
      type: 'action_completed',
      success: true,
      timestamp: new Date()
    })
    
    // Store user preferences for future context
    const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}')
    if (!userPreferences.completedActions) {
      userPreferences.completedActions = []
    }
    userPreferences.completedActions.push({
      action: action.title,
      type: action.type,
      completedAt: new Date().toISOString(),
      messageId: messageId
    })
    localStorage.setItem('userPreferences', JSON.stringify(userPreferences))
    
    // Also store in database for server-side context (optional)
    try {
      const response = await fetch('/api/coach/action-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'demo-user-123',
          action: action.title,
          type: action.type,
          messageId: messageId
        })
      })
      if (response.ok) {
        console.log('Action stored in database:', response.ok)
      } else {
        console.log('Action storage not available yet, using localStorage only')
      }
    } catch (error) {
      console.log('Action storage not available yet, using localStorage only:', error)
    }
    
    // Encouraging feedback with benefits
    let feedbackMessage = ""
    
    if (action.title.toLowerCase().includes('quinoa') || action.title.toLowerCase().includes('bowl') || action.title.toLowerCase().includes('protein')) {
      const messages = [
        "Nice! That protein will keep you energized all day! 💪",
        "Great choice! Protein helps build muscle and keeps you full longer.",
        "Perfect! That'll give you steady energy without crashes.",
        "Awesome! Protein supports your muscle health and recovery."
      ]
      feedbackMessage = messages[Math.floor(Math.random() * messages.length)]
    } else if (action.title.toLowerCase().includes('walk') || action.title.toLowerCase().includes('exercise') || action.title.toLowerCase().includes('stretch')) {
      const messages = [
        "Nice! Movement boosts your mood and energy right now! 🚶‍♂️",
        "Great choice! Exercise releases endorphins that make you feel great.",
        "Perfect! Physical activity improves your sleep and reduces stress.",
        "Awesome! Regular movement keeps your heart strong and mind sharp."
      ]
      feedbackMessage = messages[Math.floor(Math.random() * messages.length)]
    } else if (action.title.toLowerCase().includes('meditation') || action.title.toLowerCase().includes('mindfulness') || action.title.toLowerCase().includes('breath')) {
      const messages = [
        "Nice! Mindfulness reduces stress and improves focus! 🧘‍♀️",
        "Great choice! Meditation helps you stay calm and centered.",
        "Perfect! Deep breathing activates your relaxation response.",
        "Awesome! Mindfulness practice builds mental resilience."
      ]
      feedbackMessage = messages[Math.floor(Math.random() * messages.length)]
    } else if (action.title.toLowerCase().includes('sleep') || action.title.toLowerCase().includes('bedtime')) {
      const messages = [
        "Nice! Good sleep is your body's best recovery tool! 😴",
        "Great choice! Quality sleep boosts your immune system and mood.",
        "Perfect! Consistent sleep helps your brain process and heal.",
        "Awesome! Sleep is when your body repairs and grows stronger."
      ]
      feedbackMessage = messages[Math.floor(Math.random() * messages.length)]
    } else {
      const messages = [
        "Nice! Small steps add up to big health gains! 💪",
        "Great choice! Every healthy choice builds your longevity foundation.",
        "Perfect! Consistency is the key to feeling your best.",
        "Awesome! You're investing in your future self! 🌟"
      ]
      feedbackMessage = messages[Math.floor(Math.random() * messages.length)]
    }
    
    // Add coach feedback to chat
    const coachFeedback: CoachMessage = {
      id: `feedback-${Date.now()}`,
      type: 'coach',
      content: feedbackMessage,
      timestamp: new Date(),
      mode: 'explain'
    }
    addMessage(coachFeedback)
    
    return
  }

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              HelloFam Coach
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your personal longevity guide
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async (event) => {
                console.log('Intelligent Coach Message button clicked!')
                
                // Prevent multiple clicks
                const button = event.currentTarget as HTMLButtonElement
                if (button.disabled) {
                  console.log('Button already disabled, ignoring click')
                  return
                }
                button.disabled = true
                console.log('Button disabled, processing...')
                
                try {
                  // Get onboarding data from localStorage
                  const onboardingData = typeof window !== 'undefined' 
                    ? JSON.parse(localStorage.getItem('onboardingData') || '{}')
                    : {}
                  
                  // Generate dynamic intelligent message using GPT
                  const userContext = {
                    userId: user?.id || 'demo-user-123',
                    onboarding: onboardingData,
                    recentMetrics: {},
                    activeGoals: [],
                    recentHabits: [],
                    lastCheckin: undefined,
                    preferences: {
                      units: 'metric' as const,
                      timeFormat: '24h' as const
                    },
                    completedActions: [],
                    currentTime: {
                      hour: new Date().getHours(),
                      dayOfWeek: new Date().getDay(),
                      isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6,
                      season: 'spring',
                      timezone: 'UTC'
                    },
                    schedule: {},
                    location: {
                      timezone: 'UTC',
                      isIndoors: true
                    },
                    recentActivity: {}
                  }

                  console.log('Creating intelligent coach...')
                  const intelligentCoach = new IntelligentCoach(userContext)
                  console.log('Generating dynamic insights...')
                  const insights = await intelligentCoach.generateProactiveInsights()
                  console.log('Dynamic insights generated:', insights.length)
                
                  // Only create ONE message - use the first insight
                  if (insights.length > 0) {
                    const insight = insights[0] // Use only the first insight
                    
                    const newMessage = {
                      id: `intelligent-${Date.now()}`,
                      type: 'coach' as const,
                      content: insight.message,
                      timestamp: new Date(),
                      mode: 'explain' as const,
                      actions: insight.actions?.map(action => ({
                        id: action.id,
                        type: action.type as 'checklist' | 'timer' | 'reminder' | 'schedule',
                        title: action.title,
                        description: action.description,
                        completed: false
                      })) || []
                    }
                    console.log('Adding intelligent message to chat:', newMessage)
                    addMessage(newMessage)
                  } else {
                    // No fallback proactive message - just log that no insights were generated
                    console.log('No intelligent insights generated')
                  }
                } catch (error) {
                  console.error('Error generating intelligent message:', error)
                  // No fallback message - just log the error
                } finally {
                  // Re-enable button after a short delay
                  setTimeout(() => {
                    button.disabled = false
                  }, 1000)
                }
              }}
            className="relative"
            >
              <Bell className="h-4 w-4 mr-2" />
              Intelligent Coach Message
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('🤖 Triggering Enhanced Agentic Coach Action...')
                
                // Get agentic insights
                const insights = agenticCoach.getAgenticInsights()
                console.log('Agentic Insights:', insights)
                
                // Get recent predictions
                const predictions = await agenticCoach.getRecentPredictions()
                console.log('Recent Predictions:', predictions)
                
                // Get intervention history
                const interventions = agenticCoach.getInterventionHistory()
                console.log('Intervention History:', interventions)
                
                // Create autonomous goals
                const autonomousGoals = await agenticCoach.createAutonomousGoals()
                console.log('Created autonomous goals:', autonomousGoals)
                
                // Generate enhanced autonomous message
                const autonomousMessage = {
                  id: `agentic-${Date.now()}`,
                  type: 'coach' as const,
                  content: `🤖 **TRULY AUTONOMOUS AI ANALYSIS**\n\nI've been making intelligent decisions on my own:\n\n📊 **Autonomous Insights:**\n- Total Interventions: ${insights.totalInterventions}\n- Effectiveness: ${(insights.averageEffectiveness * 100).toFixed(1)}%\n- Active Goals: ${insights.activeGoals}\n- Learning Strategies: ${insights.learningStrategies}\n- New Goals Created: ${autonomousGoals.length}\n\n🔮 **Predictions:**\n${predictions.length > 0 ? predictions.map(p => `- ${p.description}`).join('\n') : '- No immediate risks detected'}\n\n🎯 **Autonomous Actions Taken:**\n${autonomousGoals.length > 0 ? autonomousGoals.map(g => `- Created goal: "${g.title}"`).join('\n') : '- No new goals needed'}\n\n💡 **Intelligent Recommendations:**\nI've autonomously analyzed your patterns and created personalized goals. I'm continuously learning and adapting my approach based on your behavior.`,
                  timestamp: new Date(),
                  mode: 'explain' as const,
                  actions: [
                    {
                      id: `agentic-action-${Date.now()}-1`,
                      type: 'checklist' as const,
                      title: 'Review autonomous decisions',
                      description: 'Understand how I made these intelligent choices',
                      completed: false
                    },
                    {
                      id: `agentic-action-${Date.now()}-2`,
                      type: 'reminder' as const,
                      title: 'Track autonomous goals',
                      description: 'Monitor the goals I created for you',
                      completed: false
                    },
                    {
                      id: `agentic-action-${Date.now()}-3`,
                      type: 'schedule' as const,
                      title: 'Schedule autonomous check-in',
                      description: 'Let me continue making intelligent decisions for you',
                      completed: false
                    }
                  ]
                }
                
                console.log('Generated enhanced autonomous message:', autonomousMessage)
                
                // Add to chat
                addMessage(autonomousMessage)
              }}
              className="relative"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Enhanced Agentic Coach
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={async () => {
                if (confirm('Are you sure you want to clear the chat history? This action cannot be undone.')) {
                  await clearHistory()
                  // Also clear completed actions
                  setCompletedActions(new Set())
                  // Clear completed actions from userPreferences
                  const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}')
                  userPreferences.completedActions = []
                  localStorage.setItem('userPreferences', JSON.stringify(userPreferences))
                }
              }}
              title="Clear Chat History"
            >
              <XCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>


      {/* Context Chips */}
      <ContextChips 
        chips={contextChips}
        onToggle={handleContextToggle}
      />

      {/* Simplified interface - no mode selection needed */}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-40">
        {!mounted || historyLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-teal-600 dark:bg-teal-400 rounded-full" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Welcome to your AI Coach
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              I&apos;m here to help you optimize your health and longevity. Ask me anything about your wellness journey!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.slice(0, 2).map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPrompt(prompt)}
                  className="text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onActionClick={handleActionClick}
              completedActions={completedActions}
            />
          ))
        )}
        
        {(isStreaming || currentResponse) && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
              <div className="w-2 h-2 bg-teal-600 dark:bg-teal-400 rounded-full animate-pulse" />
            </div>
            <div className="bg-white dark:bg-slate-950 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-800 max-w-[80%]">
              {currentResponse ? (
                <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {currentResponse}
                  <span className="inline-block w-2 h-4 bg-teal-500 animate-pulse ml-1" />
                </div>
              ) : (
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-8" />
      </div>

      {/* Quick Prompts */}
      {mounted && (
        <div className="absolute bottom-20 left-0 right-0 p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickPrompt(prompt)}
                className="whitespace-nowrap bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {mounted && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask your coach anything..."
                className="w-full px-4 py-3 pr-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isStreaming}
              className="h-12 w-12 rounded-2xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}