import { NextRequest, NextResponse } from 'next/server'
import { sendProactiveMessage } from '@/lib/coach/proactive-messaging'
import { getActiveUsers } from '@/lib/notifications/push-notifications'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('Running sleep reminder cron job...')
    
    // Get all active users
    const activeUsers = await getActiveUsers()
    
    if (activeUsers.length === 0) {
      console.log('No active users found for sleep reminder')
      return NextResponse.json({ success: true, message: 'No active users' })
    }

    // Send sleep reminder to all active users
    let successCount = 0
    let failureCount = 0

    for (const userId of activeUsers) {
      try {
        // Check if user has sleep goals
        const { data: sleepGoals } = await supabase
          .from('goals')
          .select('id')
          .eq('user_id', userId)
          .eq('category', 'sleep')
          .eq('is_active', true)
          .limit(1)

        // Only send sleep reminders to users with sleep goals
        if (sleepGoals && sleepGoals.length > 0) {
          const sent = await sendProactiveMessage(userId, 'sleep_reminder')
          if (sent) {
            successCount++
          } else {
            failureCount++
          }
        } else {
          console.log(`User ${userId} has no sleep goals, skipping sleep reminder`)
        }
      } catch (error) {
        console.error(`Error sending sleep reminder to user ${userId}:`, error)
        failureCount++
      }
    }

    console.log(`Sleep reminder completed: ${successCount} success, ${failureCount} failures`)

    return NextResponse.json({
      success: true,
      message: 'Sleep reminder completed',
      stats: {
        total: activeUsers.length,
        success: successCount,
        failures: failureCount
      }
    })

  } catch (error) {
    console.error('Error in sleep reminder cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
