import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, any>
  icon?: string
  badge?: string
  tag?: string
}

export interface UserNotificationPreferences {
  morning: boolean
  evening: boolean
  lunch: boolean
  nudges: boolean
  quietHours: {
    start: string
    end: string
  }
}

export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    // Get user's notification preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('notifications')
      .eq('user_id', userId)
      .single()

    if (!preferences?.notifications) {
      console.log('No notification preferences found for user:', userId)
      return false
    }

    // Check if user is in quiet hours
    if (isInQuietHours(preferences.notifications.quietHours)) {
      console.log('User is in quiet hours, skipping notification')
      return false
    }

    // In a real implementation, you would:
    // 1. Get user's device tokens from a devices table
    // 2. Send to Firebase Cloud Messaging (FCM)
    // 3. Send to Apple Push Notification Service (APNs)
    // 4. Send to web push endpoints

    // For now, we'll store the notification in the database
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sent_at: new Date().toISOString(),
        status: 'sent'
      })

    if (error) {
      console.error('Error storing notification:', error)
      return false
    }

    console.log('Notification sent to user:', userId, payload.title)
    return true
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

export async function sendBulkNotifications(
  userIds: string[],
  payload: NotificationPayload
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, payload)
    if (result) {
      success++
    } else {
      failed++
    }
  }

  return { success, failed }
}

function isInQuietHours(quietHours: { start: string; end: string }): boolean {
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()
  
  const [startHour, startMin] = quietHours.start.split(':').map(Number)
  const [endHour, endMin] = quietHours.end.split(':').map(Number)
  
  const startTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin
  
  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime
  }
  
  return currentTime >= startTime && currentTime <= endTime
}

export async function getActiveUsers(): Promise<string[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true)
      .not('last_seen', 'is', null)

    if (error) {
      console.error('Error fetching active users:', error)
      return []
    }

    return users?.map(user => user.id) || []
  } catch (error) {
    console.error('Error getting active users:', error)
    return []
  }
}








