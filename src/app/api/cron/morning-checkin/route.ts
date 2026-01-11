import { NextRequest, NextResponse } from 'next/server'
import { sendProactiveMessage } from '@/lib/coach/proactive-messaging'
import { getActiveUsers } from '@/lib/notifications/push-notifications'

export async function GET(request: NextRequest) {
  try {
    console.log('Running morning check-in cron job...')
    
    // Get all active users
    const activeUsers = await getActiveUsers()
    
    if (activeUsers.length === 0) {
      console.log('No active users found for morning check-in')
      return NextResponse.json({ success: true, message: 'No active users' })
    }

    // Send morning check-in to all active users
    let successCount = 0
    let failureCount = 0

    for (const userId of activeUsers) {
      try {
        const sent = await sendProactiveMessage(userId, 'morning_checkin')
        if (sent) {
          successCount++
        } else {
          failureCount++
        }
      } catch (error) {
        console.error(`Error sending morning check-in to user ${userId}:`, error)
        failureCount++
      }
    }

    console.log(`Morning check-in completed: ${successCount} success, ${failureCount} failures`)

    return NextResponse.json({
      success: true,
      message: 'Morning check-in completed',
      stats: {
        total: activeUsers.length,
        success: successCount,
        failures: failureCount
      }
    })

  } catch (error) {
    console.error('Error in morning check-in cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








