"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatMessage } from "@/components/coach/ChatMessage"
import { ContextChips } from "@/components/coach/ContextChips"
import dynamic from 'next/dynamic'

const VoiceChat = dynamic(() => import("@/components/ai/VoiceChat"), { ssr: false })
const ImageAnalysis = dynamic(() => import("@/components/ai/ImageAnalysis"), { ssr: false })
import { CoachMessage, CoachAction } from "@/types"
import { Send, Mic, Camera, Brain, MessageSquare, Volume2, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStreamingChat } from "@/hooks/useStreamingChat"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { useAuth } from "@/contexts/AuthContext"
import { markActionCompleted } from "@/lib/api/coach"

// Mock data for context chips
const mockContextChips = [
  { id: '1', label: 'Sleep Goals', type: 'goals' as const, isActive: true },
  { id: '2', label: 'Last Night: 7h 23m', type: 'sleep' as const, isActive: true },
  { id: '3', label: 'Training Load: Medium', type: 'training' as const, isActive: false },
  { id: '4', label: 'Mood: 4.2/5', type: 'mood' as const, isActive: false },
  { id: '5', label: 'Traveling', type: 'travel' as const, isActive: false },
]

const quickPrompts = [
  "Why did my HRV drop?",
  "Plan a recovery day",
  "Optimize my sleep",
  "Adjust today's workout"
]

const modeButtons = [
  { mode: 'explain', label: 'Explain', color: 'text-blue-600 dark:text-blue-400' },
  { mode: 'plan', label: 'Plan', color: 'text-green-600 dark:text-green-400' },
  { mode: 'motivate', label: 'Motivate', color: 'text-purple-600 dark:text-purple-400' },
  { mode: 'checkin', label: 'Check-in', color: 'text-amber-600 dark:text-amber-400' },
]

export default function EnhancedCoachPage() {
  const { user } = useAuth()
  const [inputValue, setInputValue] = useState("")
  const [contextChips, setContextChips] = useState(mockContextChips)
  const [selectedMode, setSelectedMode] = useState<string>('explain')
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'image'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, loading: historyLoading, addMessage } = useConversationHistory(user?.id)

  const { sendMessage, isStreaming, currentResponse } = useStreamingChat({
    onMessage: (message) => {
      addMessage(message)
    },
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })

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

    // Send message to AI - use a fallback user ID if no user
    await sendMessage(messageContent, selectedMode, user?.id || 'demo-user-123')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt)
    inputRef.current?.focus()
  }

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode)
  }

  const handleActionComplete = async (actionId: string) => {
    try {
      await markActionCompleted(actionId)
      // You could show a success message here
    } catch (error) {
      console.error('Failed to mark action as completed:', error)
    }
  }

  const handleVoiceMessage = (message: string) => {
    setInputValue(message)
    setActiveTab('chat')
  }

  const handleVoiceResponse = (response: string) => {
    // Handle voice response from AI
    console.log('Voice response:', response)
  }

  const handleImageAnalysis = (analysis: any) => {
    // Handle image analysis results
    console.log('Image analysis:', analysis)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentResponse])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              AI Coach
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your personal longevity and health coach
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('chat')}
              className={cn(
                "flex items-center space-x-2",
                activeTab === 'chat' && "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('voice')}
              className={cn(
                "flex items-center space-x-2",
                activeTab === 'voice' && "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
              )}
            >
              <Volume2 className="h-4 w-4" />
              <span>Voice</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('image')}
              className={cn(
                "flex items-center space-x-2",
                activeTab === 'image' && "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
              )}
            >
              <ImageIcon className="h-4 w-4" />
              <span>Vision</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            {/* Context Chips */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Current Context
              </h2>
              <ContextChips 
                chips={contextChips} 
                onChipToggle={(chipId) => {
                  setContextChips(prev => 
                    prev.map(chip => 
                      chip.id === chipId 
                        ? { ...chip, isActive: !chip.isActive }
                        : chip
                    )
                  )
                }}
              />
            </div>

            {/* Mode Selection */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Coach Mode
              </h2>
              <div className="flex flex-wrap gap-2">
                {modeButtons.map((button) => (
                  <Button
                    key={button.mode}
                    variant={selectedMode === button.mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleModeChange(button.mode)}
                    className={cn(
                      selectedMode === button.mode && button.color
                    )}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <span>Conversation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          onActionComplete={handleActionComplete}
                        />
                      ))}
                      {currentResponse && (
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Brain className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                              <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                                {currentResponse}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>

            {/* Quick Prompts */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Quick Prompts
              </h2>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="text-left"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask your coach anything..."
                      className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isStreaming}
                    className="h-12 w-12 rounded-2xl"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voice Tab */}
          <TabsContent value="voice" className="space-y-6">
            <VoiceChat
              onMessage={handleVoiceMessage}
              onResponse={handleVoiceResponse}
            />
          </TabsContent>

          {/* Image Analysis Tab */}
          <TabsContent value="image" className="space-y-6">
            <ImageAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
