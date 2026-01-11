import { supabase } from '@/lib/supabase/client'
import { CoachMessage, CoachAction } from '@/types'

export interface CreateMessageData {
  userId: string
  type: 'user' | 'coach'
  content: string
  mode?: string
  actions?: CoachAction[]
  citations?: string[]
  isSafetyCard?: boolean
}

export async function createCoachMessage(data: CreateMessageData): Promise<CoachMessage | null> {
  try {
    const { data: message, error } = await supabase
      .from('coach_messages')
      .insert({
        user_id: data.userId,
        type: data.type,
        content: data.content,
        mode: data.mode,
        actions: data.actions ? JSON.stringify(data.actions) : null,
        citations: data.citations ? JSON.stringify(data.citations) : null,
        is_safety_card: data.isSafetyCard || false,
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: message.id,
      type: message.type as 'user' | 'coach',
      content: message.content,
      timestamp: new Date(message.timestamp),
      mode: message.mode,
      actions: message.actions ? JSON.parse(message.actions) : undefined,
      citations: message.citations ? JSON.parse(message.citations) : undefined,
      isSafetyCard: message.is_safety_card
    }
  } catch (error) {
    console.error('Error creating coach message:', error)
    return null
  }
}

export async function getCoachMessages(userId: string, limit: number = 50): Promise<CoachMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('coach_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })
      .limit(limit)

    if (error) throw error

    return messages?.map(msg => ({
      id: msg.id,
      type: msg.type as 'user' | 'coach',
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      mode: msg.mode,
      actions: msg.actions ? JSON.parse(msg.actions) : undefined,
      citations: msg.citations ? JSON.parse(msg.citations) : undefined,
      isSafetyCard: msg.is_safety_card
    })) || []
  } catch (error) {
    console.error('Error fetching coach messages:', error)
    return []
  }
}

export async function deleteCoachMessage(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('coach_messages')
      .delete()
      .eq('id', messageId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting coach message:', error)
    return false
  }
}

export async function clearCoachHistory(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('coach_messages')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error clearing coach history:', error)
    return false
  }
}

export async function updateMessageActions(
  messageId: string, 
  actions: CoachAction[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('coach_messages')
      .update({ actions: JSON.stringify(actions) })
      .eq('id', messageId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating message actions:', error)
    return false
  }
}

export async function markActionCompleted(
  messageId: string, 
  actionId: string
): Promise<boolean> {
  try {
    // First try to get the current message with actions (JSON approach)
    const { data: message, error: fetchError } = await supabase
      .from('coach_messages')
      .select('actions')
      .eq('id', messageId)
      .single()

    if (fetchError) {
      console.log('Message not found in database (likely a proactive message):', messageId)
      console.log('Action ID:', actionId)
      
      // For proactive messages or messages not in database, just return true
      // since they're handled locally
      return true
    }

    if (!message) {
      console.error('Message not found:', messageId)
      return false
    }

    if (!message.actions) {
      console.log('No actions found for message:', messageId)
      return false
    }

    // Parse the actions JSON
    let actions: CoachAction[]
    try {
      actions = typeof message.actions === 'string' 
        ? JSON.parse(message.actions) 
        : message.actions
    } catch (parseError) {
      console.error('Error parsing actions JSON:', parseError)
      console.error('Raw actions data:', message.actions)
      return false
    }

    // Find the action to update
    const actionIndex = actions.findIndex(action => action.id === actionId)
    if (actionIndex === -1) {
      console.error('Action not found:', actionId)
      console.error('Available actions:', actions.map(a => a.id))
      return false
    }

    // Update the specific action
    const updatedActions = actions.map(action => 
      action.id === actionId 
        ? { ...action, completed: true }
        : action
    )

    // Update the message with the modified actions
    const { error: updateError } = await supabase
      .from('coach_messages')
      .update({ actions: JSON.stringify(updatedActions) })
      .eq('id', messageId)

    if (updateError) {
      console.error('Error updating actions:', updateError)
      return false
    }

    console.log('Successfully marked action as completed:', actionId)
    return true
  } catch (error) {
    console.error('Error marking action completed:', error)
    return false
  }
}

// Fallback function for when actions are stored in separate table
async function markActionCompletedFallback(
  messageId: string, 
  actionId: string
): Promise<boolean> {
  try {
    // Update the action in the coach_actions table
    const { error } = await supabase
      .from('coach_actions')
      .update({ 
        completed: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', actionId)
      .eq('message_id', messageId)

    if (error) {
      console.error('Error updating action in coach_actions table:', error)
      return false
    }

    console.log('Successfully marked action as completed (fallback):', actionId)
    return true
  } catch (error) {
    console.error('Error in fallback action completion:', error)
    return false
  }
}

export async function getConversationSummary(userId: string): Promise<string | null> {
  try {
    const { data: messages, error } = await supabase
      .from('coach_messages')
      .select('content, type, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10)

    if (error) throw error

    if (!messages || messages.length === 0) return null

    const recentMessages = messages.reverse()
    const summary = recentMessages
      .map(msg => `${msg.type === 'user' ? 'User' : 'Coach'}: ${msg.content.substring(0, 100)}...`)
      .join('\n')

    return summary
  } catch (error) {
    console.error('Error getting conversation summary:', error)
    return null
  }
}