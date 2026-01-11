import { NextRequest, NextResponse } from 'next/server'
import { sendProactiveMessage } from '@/lib/coach/proactive-messaging'
import { getActiveUsers } from '@/lib/notifications/push-notifications'

export async function GET(request: NextRequest) {
  try {
    console.log('Running goal nudge cron job...')
    
    // Get all active users
    const activeUsers = await getActiveUsers()
    
    if (activeUsers.length === 0) {
      console.log('No active users found for goal nudge')
      return NextResponse.json({ success: true, message: 'No active users' })
    }

    // Send goal nudge to all active users
    let successCount = 0
    let failureCount = 0

    for (const userId of activeUsers) {
      try {
        const sent = await sendProactiveMessage(userId, 'goal_nudge')
        if (sent) {
          successCount++
        } else {
          failureCount++
        }
      } catch (error) {
        console.error(`Error sending goal nudge to user ${userId}:`, error)
        failureCount++
      }
    }

    console.log(`Goal nudge completed: ${successCount} success, ${failureCount} failures`)

    return NextResponse.json({
      success: true,
      message: 'Goal nudge completed',
      stats: {
        total: activeUsers.length,
        success: successCount,
        failures: failureCount
      }
    })

  } catch (error) {
    console.error('Error in goal nudge cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








