import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { RealtimeChannel } from '@supabase/supabase-js'

type Tables = Database['public']['Tables']

// Real-time subscription for goals and habits
export const subscribeToGoals = (
  userId: string,
  onGoalChange: (payload: any) => void,
  onHabitChange: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('goals-habits-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${userId}`
      },
      onGoalChange
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'habits'
      },
      onHabitChange
    )
    .subscribe()

  return channel
}

// Real-time subscription for metrics
export const subscribeToMetrics = (
  userId: string,
  onMetricChange: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('metrics-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'metrics',
        filter: `user_id=eq.${userId}`
      },
      onMetricChange
    )
    .subscribe()

  return channel
}

// Real-time subscription for check-ins
export const subscribeToCheckIns = (
  userId: string,
  onCheckInChange: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('checkins-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'check_ins',
        filter: `user_id=eq.${userId}`
      },
      onCheckInChange
    )
    .subscribe()

  return channel
}

// Real-time subscription for coach messages
export const subscribeToCoachMessages = (
  userId: string,
  onMessageChange: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('coach-messages-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'coach_messages',
        filter: `user_id=eq.${userId}`
      },
      onMessageChange
    )
    .subscribe()

  return channel
}

// Real-time subscription for devices
export const subscribeToDevices = (
  userId: string,
  onDeviceChange: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('devices-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'devices',
        filter: `user_id=eq.${userId}`
      },
      onDeviceChange
    )
    .subscribe()

  return channel
}

// Comprehensive subscription for dashboard data
export const subscribeToDashboard = (
  userId: string,
  callbacks: {
    onGoalChange?: (payload: any) => void
    onMetricChange?: (payload: any) => void
    onCheckInChange?: (payload: any) => void
    onDeviceChange?: (payload: any) => void
  }
): RealtimeChannel => {
  let channel = supabase.channel('dashboard-changes')

  if (callbacks.onGoalChange) {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `user_id=eq.${userId}`
      },
      callbacks.onGoalChange
    )
  }

  if (callbacks.onMetricChange) {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'metrics',
        filter: `user_id=eq.${userId}`
      },
      callbacks.onMetricChange
    )
  }

  if (callbacks.onCheckInChange) {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'check_ins',
        filter: `user_id=eq.${userId}`
      },
      callbacks.onCheckInChange
    )
  }

  if (callbacks.onDeviceChange) {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'devices',
        filter: `user_id=eq.${userId}`
      },
      callbacks.onDeviceChange
    )
  }

  return channel.subscribe()
}

// Utility function to unsubscribe from a channel
export const unsubscribeChannel = (channel: RealtimeChannel): void => {
  supabase.removeChannel(channel)
}

// Utility function to unsubscribe from all channels
export const unsubscribeAll = (): void => {
  supabase.removeAllChannels()
}