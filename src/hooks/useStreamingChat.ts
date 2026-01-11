'use client'

import { useState, useCallback } from 'react'
import { CoachMessage, CoachAction } from '@/types'

interface StreamingChatOptions {
  onMessage?: (message: CoachMessage) => void
  onError?: (error: string) => void
}

interface StreamingResponse {
  content?: string
  actions?: CoachAction[]
  citations?: string[]
  complete?: boolean
}

export function useStreamingChat(options: StreamingChatOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')

  const sendMessage = useCallback(async (
    message: string,
    mode: string,
    userId: string,
    onboardingData?: any
  ): Promise<CoachMessage | null> => {
    if (isStreaming) return null

    setIsStreaming(true)
    setCurrentResponse('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, mode, userId, onboardingData }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let actions: CoachAction[] = []
      let citations: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamingResponse = JSON.parse(line.slice(6))
              
              if (data.content) {
                fullContent += data.content
                setCurrentResponse(fullContent)
              }
              
              if (data.actions) {
                actions = data.actions
              }
              
              if (data.citations) {
                citations = data.citations
              }
              
              if (data.complete) {
                const coachMessage: CoachMessage = {
                  id: Date.now().toString(),
                  type: 'coach',
                  content: fullContent,
                  timestamp: new Date(),
                  mode: mode as 'explain' | 'plan' | 'motivate' | 'checkin',
                  actions: actions.length > 0 ? actions : undefined,
                  citations: citations.length > 0 ? citations : undefined,
                }
                
                options.onMessage?.(coachMessage)
                setIsStreaming(false)
                setCurrentResponse('')
                return coachMessage
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e)
            }
          }
        }
      }

      return null
    } catch (error) {
      console.error('Streaming chat error:', error)
      options.onError?.(error instanceof Error ? error.message : 'Unknown error')
      setIsStreaming(false)
      setCurrentResponse('')
      return null
    }
  }, [isStreaming, options])

  return {
    sendMessage,
    isStreaming,
    currentResponse,
  }
}