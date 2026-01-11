import { NextRequest, NextResponse } from 'next/server'
import { sendProactiveMessage, ProactiveTrigger } from '@/lib/coach/proactive-messaging'
import { analyzeUserPatterns } from '@/lib/analytics/pattern-analysis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, trigger, force = false } = await request.json()

    if (!userId || !trigger) {
      return NextResponse.json(
        { error: 'userId and trigger are required' },
        { status: 400 }
      )
    }

    // Check if user exists and is active
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.is_active && !force) {
      return NextResponse.json(
        { error: 'User is not active' },
        { status: 403 }
      )
    }

    // Send proactive message
    const success = await sendProactiveMessage(userId, trigger as ProactiveTrigger)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send proactive message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Proactive message sent successfully'
    })

  } catch (error) {
    console.error('Error in proactive message endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const trigger = searchParams.get('trigger')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user's recent proactive messages
    const { data: messages, error } = await supabase
      .from('coach_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'coach')
      .eq('mode', 'proactive')
      .order('timestamp', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      messages: messages || []
    })

  } catch (error) {
    console.error('Error fetching proactive messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








