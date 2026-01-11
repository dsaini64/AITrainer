import { NextRequest, NextResponse } from 'next/server'
import { sendProactiveMessage, ProactiveTrigger } from '@/lib/coach/proactive-messaging'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, trigger = 'lunch_reminder' } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log(`🧪 Testing proactive message for user ${userId} with trigger: ${trigger}`)

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`)

    // Get user's goals to show context
    const { data: goals } = await supabase
      .from('goals')
      .select('category, title, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)

    console.log(`🎯 User's active goals:`, goals)

    // Send test proactive message
    const success = await sendProactiveMessage(userId, trigger as ProactiveTrigger)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send test proactive message' },
        { status: 500 }
      )
    }

    console.log(`✅ Test proactive message sent successfully!`)

    return NextResponse.json({
      success: true,
      message: 'Test proactive message sent successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      goals: goals || [],
      trigger,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in test proactive message:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user info and goals
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .single()

    const { data: goals } = await supabase
      .from('goals')
      .select('category, title, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)

    // Get recent proactive messages
    const { data: messages } = await supabase
      .from('coach_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'coach')
      .eq('mode', 'proactive')
      .order('timestamp', { ascending: false })
      .limit(5)

    return NextResponse.json({
      user: user || null,
      goals: goals || [],
      recentMessages: messages || [],
      availableTriggers: [
        'morning_checkin',
        'lunch_reminder', 
        'evening_reflection',
        'sleep_reminder',
        'goal_nudge',
        'habit_reminder',
        'progress_celebration',
        'low_energy_alert'
      ]
    })

  } catch (error) {
    console.error('Error in test proactive info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








