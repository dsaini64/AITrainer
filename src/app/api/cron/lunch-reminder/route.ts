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
    console.log('Running lunch reminder cron job...')
    
    // Get all active users
    const activeUsers = await getActiveUsers()
    
    if (activeUsers.length === 0) {
      console.log('No active users found for lunch reminder')
      return NextResponse.json({ success: true, message: 'No active users' })
    }

    // Send lunch reminder to all active users
    let successCount = 0
    let failureCount = 0

    for (const userId of activeUsers) {
      try {
        // Check if user has nutrition goals
        const { data: nutritionGoals } = await supabase
          .from('goals')
          .select('id')
          .eq('user_id', userId)
          .eq('category', 'nutrition')
          .eq('is_active', true)
          .limit(1)

        // Only send lunch reminders to users with nutrition goals
        if (nutritionGoals && nutritionGoals.length > 0) {
          const sent = await sendProactiveMessage(userId, 'lunch_reminder')
          if (sent) {
            successCount++
          } else {
            failureCount++
          }
        } else {
          console.log(`User ${userId} has no nutrition goals, skipping lunch reminder`)
        }
      } catch (error) {
        console.error(`Error sending lunch reminder to user ${userId}:`, error)
        failureCount++
      }
    }

    console.log(`Lunch reminder completed: ${successCount} success, ${failureCount} failures`)

    return NextResponse.json({
      success: true,
      message: 'Lunch reminder completed',
      stats: {
        total: activeUsers.length,
        success: successCount,
        failures: failureCount
      }
    })

  } catch (error) {
    console.error('Error in lunch reminder cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
