import { NextRequest, NextResponse } from 'next/server'
import { handleProactiveResponse } from '@/lib/coach/proactive-messaging'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, messageId, userResponse, actionCompleted } = await request.json()

    if (!userId || !messageId || !userResponse) {
      return NextResponse.json(
        { error: 'userId, messageId, and userResponse are required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Handle the proactive response and get adaptive response
    const adaptiveResponse = await handleProactiveResponse(
      userId,
      messageId,
      userResponse,
      actionCompleted
    )

    return NextResponse.json({
      success: true,
      adaptiveResponse,
      message: 'Proactive response handled successfully'
    })

  } catch (error) {
    console.error('Error in proactive response endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








