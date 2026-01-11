'use client'

import { useState, useEffect } from 'react'
import { CoachMessage } from '@/types'
import { supabase } from '@/lib/supabase/client'

export function useConversationHistory(userId: string | undefined) {
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load messages from localStorage as fallback
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(`conversation-${userId || 'demo'}`)
      if (stored) {
        const parsedMessages = JSON.parse(stored)
        // Convert timestamp strings back to Date objects
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }
    } catch (error) {
      console.error('Error loading conversation from localStorage:', error)
    }
    return []
  }

  // Save messages to localStorage
  const saveToLocalStorage = (messages: CoachMessage[]) => {
    try {
      localStorage.setItem(`conversation-${userId || 'demo'}`, JSON.stringify(messages))
    } catch (error) {
      console.error('Error saving conversation to localStorage:', error)
    }
  }

  useEffect(() => {
    const loadConversationHistory = async () => {
      try {
        setLoading(true)
        
        // First, try to load from localStorage for immediate display
        const localMessages = loadFromLocalStorage()
        if (localMessages.length > 0) {
          setMessages(localMessages)
          setLoading(false)
        }

        // Then try to load from Supabase if user is authenticated
        if (userId) {
          try {
            const { data, error } = await supabase
              .from('coach_messages')
              .select('*')
              .eq('user_id', userId)
              .order('timestamp', { ascending: true })
              .limit(50) // Load last 50 messages

            if (error) throw error

            const formattedMessages: CoachMessage[] = data?.map(msg => ({
              id: msg.id,
              type: msg.type as 'user' | 'coach',
              content: msg.content,
              timestamp: new Date(msg.timestamp || Date.now()),
              mode: msg.mode as 'explain' | 'plan' | 'motivate' | 'checkin' | undefined,
              actions: undefined, // Actions will be parsed from content
              citations: msg.citations || undefined,
              isSafetyCard: msg.is_safety_card || false
            })) || []

            // If we have Supabase data, use it; otherwise keep localStorage data
            if (formattedMessages.length > 0) {
              setMessages(formattedMessages)
              saveToLocalStorage(formattedMessages)
            }
            setError(null)
          } catch (dbError) {
            console.error('Error loading from Supabase, using localStorage:', dbError)
            // Keep localStorage data if Supabase fails
            if (localMessages.length === 0) {
              setError('Using offline conversation history')
            }
          }
        } else {
          // No user ID, just use localStorage
          if (localMessages.length === 0) {
            setError('No conversation history found')
          }
        }
      } catch (err) {
        console.error('Error loading conversation history:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setMessages([])
      } finally {
        setLoading(false)
      }
    }

    loadConversationHistory()

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('coach_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_messages',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newMessage: CoachMessage = {
            id: payload.new.id,
            type: payload.new.type as 'user' | 'coach',
            content: payload.new.content,
            timestamp: new Date(payload.new.timestamp || Date.now()),
            mode: payload.new.mode as 'explain' | 'plan' | 'motivate' | 'checkin' | undefined,
            actions: undefined, // Actions will be parsed from content
            citations: payload.new.citations || undefined,
            isSafetyCard: payload.new.is_safety_card || false
          }
          
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const addMessage = (message: CoachMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message]
      // Save to localStorage immediately
      saveToLocalStorage(newMessages)
      return newMessages
    })
  }

  const clearHistory = async () => {
    try {
      // Clear from Supabase if user is authenticated
      if (userId) {
        await supabase
          .from('coach_messages')
          .delete()
          .eq('user_id', userId)
      }
      
      // Clear from localStorage
      localStorage.removeItem(`conversation-${userId || 'demo'}`)
      
      setMessages([])
    } catch (err) {
      console.error('Error clearing conversation history:', err)
      // Still clear localStorage even if Supabase fails
      localStorage.removeItem(`conversation-${userId || 'demo'}`)
      setMessages([])
    }
  }

  return {
    messages,
    loading,
    error,
    addMessage,
    clearHistory
  }
}