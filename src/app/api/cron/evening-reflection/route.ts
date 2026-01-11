import { NextRequest, NextResponse } from 'next/server'
import { sendProactiveMessage } from '@/lib/coach/proactive-messaging'
import { getActiveUsers } from '@/lib/notifications/push-notifications'

export async function GET(request: NextRequest) {
  try {
    console.log('Running evening reflection cron job...')
    
    // Get all active users
    const activeUsers = await getActiveUsers()
    
    if (activeUsers.length === 0) {
      console.log('No active users found for evening reflection')
      return NextResponse.json({ success: true, message: 'No active users' })
    }

    // Send evening reflection to all active users
    let successCount = 0
    let failureCount = 0

    for (const userId of activeUsers) {
      try {
        const sent = await sendProactiveMessage(userId, 'evening_reflection')
        if (sent) {
          successCount++
        } else {
          failureCount++
        }
      } catch (error) {
        console.error(`Error sending evening reflection to user ${userId}:`, error)
        failureCount++
      }
    }

    console.log(`Evening reflection completed: ${successCount} success, ${failureCount} failures`)

    return NextResponse.json({
      success: true,
      message: 'Evening reflection completed',
      stats: {
        total: activeUsers.length,
        success: successCount,
        failures: failureCount
      }
    })

  } catch (error) {
    console.error('Error in evening reflection cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








